import "server-only";
import { shipFrom } from "@/lib/site";
import { fetchJson, memo, toM } from "./http";
import type { DeliveryMode, DeliveryOption, DeliveryPoint, DeliveryProvider, DeliveryQuery, Parcel } from "./types";

/**
 * Деловые Линии, API dev.dellin.ru. Договор для расчёта не нужен: ключ приложения DELLIN_APP_KEY
 * выдают после регистрации на dev.dellin.ru. Груз сдаём на терминал сами:
 * DELLIN_DERIVAL_TERMINAL_ID или первый терминал приёма в городе отгрузки.
 * Форматы ответов справочников проверить на живом ключе — разбор сделан с запасом.
 */
const BASE = "https://api.dellin.ru";

function api<T>(method: string, body: Record<string, unknown>) {
  return fetchJson<T>(`${BASE}/${method}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ appkey: process.env.DELLIN_APP_KEY, ...body }),
  });
}

type City = { cityID?: number; code?: string; aString?: string; searchString?: string };
const cityCache = memo<City | null>(24 * 60 * 60_000);

function findCity(name: string) {
  const q = name.replace(/^(г\.?|город)\s+/i, "").trim();
  return cityCache(q.toLowerCase(), async () => {
    const r = await api<{ cities?: City[] }>("v2/public/kladr", { q, limit: 5 });
    return r.cities?.[0] ?? null;
  });
}

type RawTerminal = { id: string | number; name?: string; address?: string; fullAddress?: string; latitude?: string | number; longitude?: string | number };
const terminalCache = memo<DeliveryPoint[]>(6 * 60 * 60_000);

/** Терминалы города: arrival — выдача, derival — приём. */
async function terminals(cityName: string, direction: "arrival" | "derival") {
  const city = await findCity(cityName);
  if (!city?.cityID) return [];
  return terminalCache(`${city.cityID}|${direction}`, async () => {
    const r = await api<{ terminals?: RawTerminal[] }>("v1/public/request_terminals", { cityID: city.cityID, direction });
    return (r.terminals ?? [])
      .map((t) => ({ id: String(t.id), name: t.name || "Терминал", address: t.fullAddress || t.address || "", lat: Number(t.latitude), lon: Number(t.longitude) }))
      .filter((t) => t.lat && t.lon);
  });
}

async function derivalTerminal() {
  if (process.env.DELLIN_DERIVAL_TERMINAL_ID) return process.env.DELLIN_DERIVAL_TERMINAL_ID;
  const list = await terminals(shipFrom.city, "derival");
  if (!list[0]) throw new Error("Деловые Линии: нет терминала приёма в городе отгрузки");
  return list[0].id;
}

function cargo(parcels: Parcel[], value: number) {
  const m = parcels.map((p) => p.dims.map(toM));
  return {
    quantity: parcels.length,
    // габариты и вес самого большого места
    length: Math.max(...m.map((d) => d[0])),
    width: Math.max(...m.map((d) => d[1])),
    height: Math.max(...m.map((d) => d[2])),
    weight: Math.max(...parcels.map((p) => p.weight)),
    totalVolume: Math.max(0.01, Math.round(m.reduce((s, d) => s + d[0] * d[1] * d[2], 0) * 1000) / 1000),
    totalWeight: Math.round(parcels.reduce((s, p) => s + p.weight, 0) * 100) / 100,
    hazardClass: 0,
    insurance: { statedValue: value, term: false },
  };
}

type Calc = { data?: { price?: number; orderDates?: { derivalFromOspSender?: string; arrivalToOspReceiver?: string } }; errors?: unknown };

/** Дней между отправкой с терминала и прибытием на терминал получателя. */
function transit(d?: { derivalFromOspSender?: string; arrivalToOspReceiver?: string }) {
  if (!d?.derivalFromOspSender || !d.arrivalToOspReceiver) return undefined;
  const n = Math.round((Date.parse(d.arrivalToOspReceiver) - Date.parse(d.derivalFromOspSender)) / 86_400_000);
  return n > 0 ? String(n) : undefined;
}

async function price(q: DeliveryQuery, mode: DeliveryMode): Promise<DeliveryOption> {
  let arrival: Record<string, unknown>;
  if (mode === "pvz") {
    const terminalID = q.pointId ?? (await terminals(q.city, "arrival"))[0]?.id;
    if (!terminalID) return { service: "dellin", mode, cost: null, unavailable: true, note: "нет терминала в этом городе" };
    arrival = { variant: "terminal", terminalID };
  } else {
    arrival = { variant: "address", address: { search: [q.city, q.address].filter(Boolean).join(", ") }, time: { worktimeStart: "10:00", worktimeEnd: "18:00" } };
  }
  const tomorrow = new Date(Date.now() + 24 * 60 * 60_000).toISOString().slice(0, 10);
  const r = await api<Calc>("v2/calculator", {
    delivery: {
      deliveryType: { type: "auto" },
      derival: { produceDate: tomorrow, variant: "terminal", terminalID: await derivalTerminal() },
      arrival,
    },
    members: { requester: { role: "sender" } },
    cargo: cargo(q.parcels, q.value),
    payment: { type: "cash", paymentCity: shipFrom.kladr },
  });
  if (!r.data?.price) return { service: "dellin", mode, cost: null, note: "стоимость уточнит менеджер" };
  return { service: "dellin", mode, cost: Math.ceil(r.data.price), days: transit(r.data.orderDates), tariff: "auto" };
}

export const dellin: DeliveryProvider = {
  id: "dellin",
  ready: () => Boolean(process.env.DELLIN_APP_KEY),
  calculate: (q) => Promise.all([price(q, "pvz"), price(q, "door")]),
  points: ({ city }) => terminals(city, "arrival"),
};
