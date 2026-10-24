import "server-only";
import { deliveryPayment, shipFrom } from "@/lib/site";
import type { Order } from "@/lib/orders/types";
import { daysRange, fetchJson, memo } from "./http";
import { toParcels } from "./parcels";
import type { DeliveryMode, DeliveryOption, DeliveryPoint, DeliveryProvider, Parcel } from "./types";

/**
 * СДЭК, API v2. Ключи — в личном кабинете СДЭК после договора: Интеграция → Ключи API.
 * CDEK_CLIENT_ID, CDEK_CLIENT_SECRET; тестовая среда — CDEK_API_URL=https://api.edu.cdek.ru/v2.
 * Отправитель сам привозит груз в пункт СДЭК, поэтому считаем тарифы «склад–склад» и «склад–дверь».
 */
const BASE = (process.env.CDEK_API_URL || "https://api.cdek.ru/v2").replace(/\/$/, "");

/** delivery_mode в ответе калькулятора: 4 — склад–склад, 3 — склад–дверь */
const MODE: Record<DeliveryMode, number> = { pvz: 4, door: 3 };

let token: { value: string; exp: number } | null = null;

async function auth() {
  if (token && Date.now() < token.exp) return token.value;
  const qs = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.CDEK_CLIENT_ID ?? "",
    client_secret: process.env.CDEK_CLIENT_SECRET ?? "",
  });
  const r = await fetchJson<{ access_token: string; expires_in: number }>(`${BASE}/oauth/token?${qs}`, { method: "POST" });
  token = { value: r.access_token, exp: Date.now() + (r.expires_in - 60) * 1000 };
  return token.value;
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const headers = { Authorization: `Bearer ${await auth()}`, "Content-Type": "application/json" };
  return fetchJson<T>(`${BASE}/${path}`, body === undefined ? { headers } : { method: "POST", headers, body: JSON.stringify(body) });
}

const packages = (parcels: Parcel[]) =>
  parcels.map((p) => ({ weight: Math.round(p.weight * 1000), length: Math.ceil(p.dims[0]), width: Math.ceil(p.dims[1]), height: Math.ceil(p.dims[2]) }));

type City = { code: number; city: string; region?: string };
const cityCache = memo<City | null>(24 * 60 * 60_000);

/** Код города СДЭК по названию. */
function findCity(name: string) {
  const q = name.replace(/^(г\.?|город)\s+/i, "").trim();
  return cityCache(q.toLowerCase(), async () => {
    const list = await api<City[]>(`location/cities?${new URLSearchParams({ country_codes: "RU", city: q, size: "10" })}`);
    return list.find((c) => c.city.toLowerCase() === q.toLowerCase()) ?? list[0] ?? null;
  });
}

type Tariff = { tariff_code: number; tariff_name: string; delivery_mode: number; delivery_sum: number; period_min: number; period_max: number };
const calcCache = memo<Tariff[]>(30 * 60_000);

type Office = {
  code: string;
  name: string;
  work_time?: string;
  weight_max?: number;
  dimensions?: { width: number; height: number; depth: number }[] | null;
  location: { address: string; address_full?: string; latitude: number; longitude: number };
};
const officeCache = memo<Office[]>(6 * 60 * 60_000);

/** Пройдёт ли груз в пункт: вес и габариты самого большого места. */
function officeFits(o: Office, parcels: Parcel[]) {
  const heaviest = Math.max(...parcels.map((p) => p.weight));
  if (o.weight_max && heaviest > o.weight_max) return false;
  if (o.dimensions?.length) {
    return parcels.every((p) =>
      o.dimensions!.some((d) => {
        const max = [d.width, d.height, d.depth].sort((a, b) => b - a);
        return p.dims[0] <= max[0] && p.dims[1] <= max[1] && p.dims[2] <= max[2];
      }),
    );
  }
  return true;
}

export const cdek: DeliveryProvider = {
  id: "cdek",
  ready: () => Boolean(process.env.CDEK_CLIENT_ID && process.env.CDEK_CLIENT_SECRET),

  async calculate(q) {
    const city = await findCity(q.city);
    if (!city) return (["pvz", "door"] as const).map((mode) => ({ service: "cdek", mode, cost: null, note: "город не найден в СДЭК" }));
    const body = { from_location: { address: shipFrom.city }, to_location: { code: city.code }, packages: packages(q.parcels) };
    const tariffs = await calcCache(JSON.stringify(body), async () => (await api<{ tariff_codes?: Tariff[] }>("calculator/tarifflist", body)).tariff_codes ?? []);

    return (["pvz", "door"] as const).map((mode): DeliveryOption => {
      const best = tariffs.filter((t) => t.delivery_mode === MODE[mode]).sort((a, b) => a.delivery_sum - b.delivery_sum)[0];
      if (!best) return { service: "cdek", mode, cost: null, unavailable: true, note: "нет тарифа для такого груза" };
      return { service: "cdek", mode, cost: Math.ceil(best.delivery_sum), days: daysRange(best.period_min, best.period_max), tariff: String(best.tariff_code) };
    });
  },

  async points({ city: name, parcels }) {
    const city = await findCity(name);
    if (!city) return [];
    const offices = await officeCache(String(city.code), () =>
      api<Office[]>(`deliverypoints?${new URLSearchParams({ city_code: String(city.code), type: "PVZ", country_code: "RU" })}`),
    );
    return offices
      .filter((o) => officeFits(o, parcels))
      .map((o): DeliveryPoint => ({ id: o.code, name: o.name, address: o.location.address, lat: o.location.latitude, lon: o.location.longitude, workTime: o.work_time }));
  },

  /**
   * Заказ в кабинете СДЭК. Нужен CDEK_SHIPMENT_POINT — код пункта, куда курьер «Хочу Тент» сдаёт груз.
   * Тип заказа: 1 — договор «интернет-магазин», 2 — «доставка» (CDEK_ORDER_TYPE).
   * Проверить на тестовом аккаунте СДЭК перед первым боевым заказом.
   */
  async createOrder(order: Order) {
    const d = order.delivery;
    if (d.method !== "carrier" || d.service !== "cdek") throw new Error("Заказ не для СДЭК");
    if (!d.tariff) throw new Error("доставку не посчитали по API, тарифа нет — оформите отправление в кабинете СДЭК");
    const shipmentPoint = process.env.CDEK_SHIPMENT_POINT;
    if (!shipmentPoint) throw new Error("Не задан CDEK_SHIPMENT_POINT — код пункта СДЭК, куда сдаёте груз");

    let n = 0;
    const pkgs = order.items.flatMap((i) =>
      toParcels([{ weight: i.weight, box: i.box, qty: i.qty }]).map((p) => {
        n += 1;
        return {
          number: String(n),
          ...packages([p])[0],
          comment: i.title,
          // товар оплачен на сайте — наложенного платежа нет
          items: [{ name: i.title, ware_key: `${i.slug}-${i.size}`.slice(0, 50), payment: { value: 0 }, cost: i.price, weight: Math.round(p.weight * 1000), amount: 1 }],
        };
      }),
    );
    const city = d.mode === "door" ? await findCity(d.city) : null;
    const body = {
      type: Number(process.env.CDEK_ORDER_TYPE || 1),
      number: `HT-${order.id}`,
      tariff_code: Number(d.tariff),
      comment: order.comment.slice(0, 255) || undefined,
      shipment_point: shipmentPoint,
      ...(d.mode === "pvz" ? { delivery_point: d.point?.id } : { to_location: { code: city?.code, address: d.address } }),
      // доставку получатель оплачивает при получении
      ...(deliveryPayment === "on_receipt" && d.cost ? { delivery_recipient_cost: { value: d.cost } } : {}),
      recipient: {
        name: order.customer.name,
        email: order.customer.email || undefined,
        phones: [{ number: "+" + order.customer.phone.replace(/\D/g, "") }],
      },
      packages: pkgs,
    };
    const r = await api<{ entity?: { uuid: string }; requests?: { state: string; errors?: { message: string }[] }[] }>("orders", body);
    const failed = r.requests?.find((x) => x.state === "INVALID");
    if (failed || !r.entity) throw new Error(failed?.errors?.map((e) => e.message).join("; ") || "СДЭК не принял заказ");
    return { carrierOrderId: r.entity.uuid };
  },

  async getTrack(uuid) {
    const r = await api<{ entity?: { cdek_number?: string }; requests?: { state: string; errors?: { message: string }[] }[] }>(`orders/${uuid}`);
    const failed = r.requests?.find((x) => x.state === "INVALID");
    if (failed) throw new Error(failed.errors?.map((e) => e.message).join("; ") || "СДЭК отклонил заказ");
    return r.entity?.cdek_number ?? null;
  },
};
