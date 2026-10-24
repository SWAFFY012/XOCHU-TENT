import "server-only";
import { shipFrom } from "@/lib/site";
import { fetchJson, memo, toM } from "./http";
import type { DeliveryMode, DeliveryOption, DeliveryPoint, DeliveryProvider, DeliveryQuery, Parcel } from "./types";

/**
 * ПЭК, API личного кабинета (kabinet.pecom.ru/api/v1). Договор не нужен: зарегистрируйтесь в кабинете
 * и создайте ключ API. Basic-авторизация: PEK_LOGIN — логин кабинета, PEK_API_KEY — ключ.
 * Груз сдаём на склад ПЭК сами (самопривоз): PEK_SENDER_WAREHOUSE_ID или ближайший к адресу отгрузки.
 */
const BASE = "https://kabinet.pecom.ru/api/v1";
/** продукт «Автоперевозка» */
const AUTO = 3;

function api<T>(method: string, body: unknown) {
  const basic = Buffer.from(`${process.env.PEK_LOGIN}:${process.env.PEK_API_KEY}`).toString("base64");
  return fetchJson<T>(`${BASE}/${method}/`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json;charset=utf-8" },
    body: JSON.stringify(body),
  });
}

type Department = {
  warehouseId: string;
  divisionName: string;
  address: string;
  coordinates: { latitude: number; longitude: number };
};
type Departments = { freeDepartments?: Department[]; paidDepartments?: Department[] };
const depCache = memo<Department[]>(6 * 60 * 60_000);

/** Отделения у адреса: 2 — приём груза, 3 — выдача. */
function departments(address: string, operation: 2 | 3, parcels: Parcel[], limit: number) {
  const body = {
    address,
    departmentOperation: operation,
    type: AUTO,
    searchRadius: 50,
    limit,
    weight: parcels.reduce((s, p) => s + p.weight, 0),
    volume: parcels.reduce((s, p) => s + toM(p.dims[0]) * toM(p.dims[1]) * toM(p.dims[2]), 0),
    maxDimension: Math.max(...parcels.map((p) => toM(p.dims[0]))),
    maxWeightPerPlace: Math.max(...parcels.map((p) => p.weight)),
  };
  return depCache(JSON.stringify(body), async () => {
    const r = await api<Departments>("branches/nearestdepartments", body);
    return [...(r.freeDepartments ?? []), ...(r.paidDepartments ?? [])];
  });
}

async function senderWarehouse(parcels: Parcel[]) {
  if (process.env.PEK_SENDER_WAREHOUSE_ID) return process.env.PEK_SENDER_WAREHOUSE_ID;
  const list = await departments(shipFrom.address, 2, parcels, 1);
  if (!list[0]) throw new Error("ПЭК: не нашли склад приёма рядом с адресом отгрузки");
  return list[0].warehouseId;
}

/** Склад выдачи: выбранный покупателем или основной склад филиала по городу. */
async function receiverWarehouse(q: DeliveryQuery) {
  if (q.pointId) return q.pointId;
  const zone = await api<{ mainWarehouseId?: string }>("branches/findzonebyaddress", { address: `Россия, ${q.city}` });
  return zone.mainWarehouseId;
}

/** Ближайший рабочий день, 12:00 по времени филиала — когда сдадим груз на склад. */
function plannedDate() {
  const d = new Date(Date.now() + 24 * 60 * 60_000);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.toISOString().slice(0, 10)}T12:00:00`;
}

type Calc = { hasError?: boolean; errorMessage?: string; transfers?: { type: number; hasError: boolean; errorMessage?: string; costTotal: number; estDeliveryTime?: number }[] };

async function price(q: DeliveryQuery, mode: DeliveryMode): Promise<DeliveryOption> {
  const receiver = mode === "pvz" ? await receiverWarehouse(q) : undefined;
  if (mode === "pvz" && !receiver) return { service: "pek", mode, cost: null, unavailable: true, note: "ПЭК не обслуживает этот город" };
  const r = await api<Calc>("calculator/calculateprice", {
    types: [AUTO],
    senderWarehouseId: await senderWarehouse(q.parcels),
    ...(receiver ? { receiverWarehouseId: receiver } : {}),
    plannedDateTime: plannedDate(),
    isInsurance: true,
    isInsurancePrice: q.value,
    isPickUp: false,
    isDelivery: mode === "door",
    ...(mode === "door" ? { delivery: { address: ["Россия", q.city, q.address].filter(Boolean).join(", ") } } : {}),
    cargos: q.parcels.map((p) => ({ length: toM(p.dims[0]), width: toM(p.dims[1]), height: toM(p.dims[2]), weight: p.weight })),
  });
  const t = r.transfers?.find((x) => x.type === AUTO);
  if (!t || t.hasError || !t.costTotal) return { service: "pek", mode, cost: null, note: t?.errorMessage ? "стоимость уточнит менеджер" : undefined };
  return { service: "pek", mode, cost: Math.ceil(t.costTotal), days: t.estDeliveryTime ? String(t.estDeliveryTime) : undefined, tariff: String(AUTO) };
}

export const pek: DeliveryProvider = {
  id: "pek",
  ready: () => Boolean(process.env.PEK_LOGIN && process.env.PEK_API_KEY),
  calculate: (q) => Promise.all([price(q, "pvz"), price(q, "door")]),
  async points({ city, parcels }) {
    const list = await departments(`Россия, ${city}`, 3, parcels, 30);
    return list.map((d): DeliveryPoint => ({ id: d.warehouseId, name: `ПЭК ${d.divisionName}`, address: d.address, lat: d.coordinates.latitude, lon: d.coordinates.longitude }));
  },
};
