import "server-only";
import { shipFrom } from "@/lib/site";
import { daysRange, fetchJson, memo } from "./http";
import type { DeliveryOption, DeliveryPoint, DeliveryProvider, Parcel } from "./types";

/**
 * Почта России: открытый тарификатор tariff.pochta.ru, ключ не нужен.
 * Посылка обыкновенная (объект 4030) по розничному тарифу, до отделения по индексу получателя.
 * Каждое место — отдельная посылка; посылка тяжелее 20 кг тарификатором не считается.
 */
const API = "https://tariff.pochta.ru/v2/calculate/tariff/delivery";
const OBJECT = 4030;

type TariffResponse = {
  paynds?: number;
  delivery?: { min?: number; max?: number };
  postoffice?: { index: number; tp: number; name: string; address: string; "geo.lat"?: number; "geo.long"?: number }[];
  errors?: { msg: string }[];
};

const cache = memo<TariffResponse>(60 * 60_000);

function tariff(to: string, p: Parcel) {
  const qs = new URLSearchParams({
    json: "",
    object: String(OBJECT),
    from: shipFrom.postalCode,
    to,
    weight: String(Math.max(1, Math.round(p.weight * 1000))),
    size: p.dims.map(Math.ceil).join("x"),
  });
  return cache(qs.toString(), () => fetchJson<TariffResponse>(`${API}?${qs}`));
}

export const post: DeliveryProvider = {
  id: "post",
  ready: () => true,
  async calculate(q) {
    const base: DeliveryOption = { service: "post", mode: "pvz", cost: null };
    if (!/^\d{6}$/.test(q.postalCode)) return [{ ...base, note: "укажите индекс — посчитаем стоимость" }];

    // одинаковые места считаем один раз
    const groups = new Map<string, { p: Parcel; n: number }>();
    for (const p of q.parcels) {
      const k = `${p.weight}|${p.dims}`;
      groups.set(k, { p, n: (groups.get(k)?.n ?? 0) + 1 });
    }
    const results = await Promise.all([...groups.values()].map(async ({ p, n }) => ({ r: await tariff(q.postalCode, p), n })));

    const first = results[0].r;
    const office = first.postoffice?.find((o) => o.tp === 2);
    const point: DeliveryPoint | undefined =
      office && office["geo.lat"] && office["geo.long"]
        ? { id: String(office.index), name: `Отделение ${office.index}`, address: office.address, lat: office["geo.lat"], lon: office["geo.long"] }
        : undefined;
    const days = daysRange(first.delivery?.min, first.delivery?.max);

    if (results.some(({ r }) => !r.paynds)) {
      const err = results.find(({ r }) => !r.paynds)?.r.errors?.[0]?.msg ?? "";
      if (/индекс/i.test(err) && !office) return [{ ...base, note: "проверьте индекс" }];
      return [{ ...base, days, office: point, note: "стоимость уточнит менеджер" }];
    }
    // paynds — в копейках с НДС
    const cost = Math.ceil(results.reduce((s, { r, n }) => s + (r.paynds! / 100) * n, 0));
    return [{ ...base, cost, days, tariff: String(OBJECT), office: point }];
  },
};
