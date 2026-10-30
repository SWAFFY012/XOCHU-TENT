import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { site } from "@/lib/site";
import { cityCenter } from "./cdek";
import { daysRange, fetchJson, memo } from "./http";
import type { DeliveryOption, DeliveryPoint, DeliveryProvider, DeliveryQuery } from "./types";

/**
 * Ozon Доставка для собственного магазина, Seller API: docs.ozon.ru/api/seller/#tag/OzonLogistics.
 * Эти методы принимают только OAuth-токен частного приложения, выданный продавцом: токен client_credentials
 * («от имени приложения») Seller API отклоняет. Поэтому продавец один раз авторизует приложение
 * по ссылке /api/delivery/ozon/oauth/start, а дальше сайт сам обновляет токен по refresh_token
 * (docs.ozon.ru/api/applications/#tag/Auth). refresh_token хранится в .data/ozon-oauth.json.
 *   OZON_APP_CLIENT_ID, OZON_APP_CLIENT_SECRET — из настроек приложения
 *   OZON_SELLER_ID — кабинет, который вправе авторизовать сайт (по умолчанию «Хочу Тент»)
 *   OZON_DELIVERY_SCHEMA — MIX (на выбор Ozon, по умолчанию), FBS или FBO
 *   OZON_OAUTH_URL, OZON_SELLER_API_URL — адреса, если Ozon их сменит
 * Обратный URL в настройках приложения: https://xn----jtbybvccot.xn--p1ai/api/delivery/ozon/oauth/callback
 * Ozon считает доставку только для своих товаров: позиция корзины → SKU на Ozon (matchProduct).
 */
const API = (process.env.OZON_SELLER_API_URL || "https://api-seller.ozon.ru").replace(/\/$/, "");
const OAUTH = process.env.OZON_OAUTH_URL || "https://xapi.ozon.ru/oauth/token";
const SCHEMA = process.env.OZON_DELIVERY_SCHEMA || "MIX";
const SELLER_ID = process.env.OZON_SELLER_ID || "2492755";
/** права, которые сайт просит у продавца: доставка, чтение товаров, отправлений и складов */
const SCOPES = ["seller-api.ozon-logistics", "seller-api.product-read-only", "seller-api.posting-fbs-read-only", "seller-api.posting-fbo-read-only", "seller-api.warehouse"];
const TOKEN_FILE = path.join(process.cwd(), ".data", "ozon-oauth.json");
/** пункты Ozon ищем в этом радиусе от центра города, км */
const RADIUS_KM = 25;

/** Обратный URL — в punycode, как его хранит Ozon. */
export const ozonRedirectUri = () => `${new URL(site.url).origin}/api/delivery/ozon/oauth/callback`;

/** Ссылка, по которой продавец разрешает сайту работать с его кабинетом. */
export function ozonAuthorizeUrl(state: string) {
  const q = new URLSearchParams({
    response_type: "code",
    access_type: "offline",
    client_id: process.env.OZON_APP_CLIENT_ID ?? "",
    redirect_uri: ozonRedirectUri(),
    scope: SCOPES.join(" "),
    state,
  });
  return `https://seller.ozon.ru/app/appstore/oauth/authorize?${q}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; scope?: string[] };
type Saved = { refreshToken: string; seller: string; scope: string[]; at: string };

let token: { value: string; exp: number; scope: string[] } | null = null;
/** одно обновление на всех: старый refresh_token после обмена может перестать действовать */
let refreshing: Promise<unknown> | null = null;

async function requestToken(body: Record<string, string>) {
  return fetchJson<TokenResponse>(OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.OZON_APP_CLIENT_ID ?? "", client_secret: process.env.OZON_APP_CLIENT_SECRET ?? "", ...body }),
  });
}

/** sub из JWT — Seller ID продавца, выдавшего токен. */
const sellerOf = (jwt: string) => {
  try {
    return String(JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).sub ?? "");
  } catch {
    return "";
  }
};

async function remember(r: TokenResponse, prev?: Saved) {
  const saved: Saved = {
    refreshToken: r.refresh_token || prev?.refreshToken || "",
    seller: sellerOf(r.access_token) || prev?.seller || "",
    scope: r.scope ?? prev?.scope ?? [],
    at: new Date().toISOString(),
  };
  await mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await writeFile(TOKEN_FILE, JSON.stringify(saved, null, 1), { mode: 0o600 });
  token = { value: r.access_token, exp: Date.now() + (r.expires_in - 60) * 1000, scope: saved.scope };
  return saved;
}

/** Обмен кода из обратного URL на токены. Принимаем только кабинет SELLER_ID. */
export async function ozonAuthorize(code: string) {
  const r = await requestToken({ grant_type: "authorization_code", code, redirect_uri: ozonRedirectUri() });
  const seller = sellerOf(r.access_token);
  if (seller !== SELLER_ID) throw new Error(`Авторизован кабинет ${seller || "?"}, а нужен ${SELLER_ID}. Войдите в кабинет «Хочу Тент» на seller.ozon.ru.`);
  if (!r.refresh_token) throw new Error("Ozon не выдал refresh_token");
  return remember(r);
}

/** Токен продавца; живёт час, обновляем по refresh_token заранее. */
export async function ozonToken() {
  if (token && Date.now() < token.exp) return token;
  let saved: Saved;
  try {
    saved = JSON.parse(await readFile(TOKEN_FILE, "utf8"));
  } catch {
    throw new Error("Ozon не авторизован: продавцу нужно открыть /api/delivery/ozon/oauth/start");
  }
  refreshing ??= requestToken({ grant_type: "refresh_token", refresh_token: saved.refreshToken })
    .then((r) => remember(r, saved))
    .finally(() => (refreshing = null));
  await refreshing;
  return token!;
}

/** Запрос к Seller API с токеном продавца. */
export async function sellerApi<T>(method: string, body: unknown): Promise<T> {
  const { value } = await ozonToken();
  return fetchJson<T>(`${API}${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${value}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 20_000,
  });
}

export type OzonProduct = { productId: number; offerId: string; sku: number; name: string; fbs: boolean; fbo: boolean };

const productCache = memo<OzonProduct[]>(60 * 60_000);

/** Все товары продавца на Ozon (кроме архива): артикул, SKU, название, есть ли остатки. */
export function ozonProducts() {
  return productCache("all", async () => {
    type Item = { product_id: number; offer_id: string; sku?: number; has_fbo_stocks?: boolean; has_fbs_stocks?: boolean };
    const list: Item[] = [];
    let last = "";
    for (;;) {
      const r = await sellerApi<{ result: { items: Item[]; last_id: string } }>("/v3/product/list", { filter: { visibility: "ALL" }, last_id: last, limit: 1000 });
      list.push(...r.result.items);
      if (r.result.items.length < 1000 || !r.result.last_id) break;
      last = r.result.last_id;
    }
    const info = new Map<number, { name: string; sku?: number }>();
    for (let i = 0; i < list.length; i += 1000) {
      const r = await sellerApi<{ items: { id: number; name: string; sku?: number }[] }>("/v3/product/info/list", {
        product_id: list.slice(i, i + 1000).map((p) => String(p.product_id)),
      });
      for (const it of r.items) info.set(it.id, it);
    }
    return list.map((p) => ({
      productId: p.product_id,
      offerId: p.offer_id,
      sku: p.sku || info.get(p.product_id)?.sku || 0,
      name: info.get(p.product_id)?.name ?? "",
      fbs: Boolean(p.has_fbs_stocks),
      fbo: Boolean(p.has_fbo_stocks),
    }));
  });
}

/**
 * Позиция корзины → товар на Ozon.
 * TODO: сопоставить по выгрузке .data/ozon-products.json (POST /api/delivery/ozon/sync), когда увидим артикулы заказчика.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function matchProduct(_item: NonNullable<DeliveryQuery["items"]>[number], _products: OzonProduct[]): OzonProduct | null {
  return null;
}

/** Выгрузка для сопоставления: права токена и товары Ozon в .data/ozon-products.json. */
export async function ozonSnapshot() {
  const t = await ozonToken();
  const products = await ozonProducts();
  const file = path.join(process.cwd(), ".data", "ozon-products.json");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ at: new Date().toISOString(), scope: t.scope, products }, null, 1));
  return { scope: t.scope, total: products.length, withSku: products.filter((p) => p.sku).length, withStock: products.filter((p) => p.fbs || p.fbo).length };
}

type MapPoint = { map_point_id: number; coordinate: { lat: number; long: number } };
const mapCache = memo<MapPoint[]>(12 * 60 * 60_000);
const cityPointsCache = memo<DeliveryPoint[]>(6 * 60 * 60_000);

/** Расстояние между точками, км. */
function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6371;
}

type PointInfo = {
  enabled: boolean;
  delivery_method: {
    map_point_id: number;
    name: string;
    address: string;
    coordinates: { lat: number; long: number };
    working_hours?: { periods?: { min: { hours: number; minutes: number }; max: { hours: number; minutes: number } }[] }[];
  };
};

const hhmm = (t: { hours: number; minutes: number }) => `${String(t.hours).padStart(2, "0")}:${String(t.minutes).padStart(2, "0")}`;

/** Пункты Ozon рядом с центром города, ближние первыми. */
function cityPoints(city: string) {
  return cityPointsCache(city.toLowerCase(), async () => {
    const center = await cityCenter(city);
    if (!center) return [];
    const all = await mapCache("all", async () => (await sellerApi<{ points?: MapPoint[] }>("/v1/delivery/point/list", {})).points ?? []);
    const ids = all
      .map((p) => ({ id: p.map_point_id, d: km(center, { lat: p.coordinate.lat, lon: p.coordinate.long }) }))
      .filter((p) => p.d <= RADIUS_KM)
      .sort((a, b) => a.d - b.d)
      .slice(0, 300)
      .map((p) => String(p.id));
    const points: DeliveryPoint[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const r = await sellerApi<{ points?: PointInfo[] }>("/v1/delivery/point/info", { map_point_ids: ids.slice(i, i + 100) });
      for (const p of r.points ?? []) {
        if (!p.enabled) continue;
        const m = p.delivery_method;
        const period = m.working_hours?.[0]?.periods?.[0];
        points.push({
          id: String(m.map_point_id),
          name: m.name,
          address: m.address,
          lat: m.coordinates.lat,
          lon: m.coordinates.long,
          workTime: period ? `сегодня ${hhmm(period.min)}–${hhmm(period.max)}` : undefined,
        });
      }
    }
    // point/info не держит порядок — возвращаем ближние первыми
    const order = new Map(ids.map((id, n) => [id, n]));
    return points.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  });
}

type Split = {
  commissions?: { total?: { amount: string; currency: string } } | null;
  unavailable_reason?: string;
  delivery_method?: { unavailable_reason?: string; timeslots?: { client_date_range?: { from: string; to: string } }[] };
};

const REASON: Record<string, string> = {
  OUT_OF_STOCK: "товара нет на складе Ozon",
  BANNED_FOR_AREA: "Ozon не возит этот товар в ваш город",
  NO_ROUTE: "Ozon не доставляет в этот пункт",
  PICKUP_POINT_DISABLED: "пункт выдачи закрыт, выберите другой",
  INVALID_PVZ_FOR_KGT: "крупный груз — выберите другой пункт",
  MAX_DIMENSIONS_RESTRICTION: "груз больше допустимых габаритов",
  PACKAGE_MAX_WEIGHT_RESTRICTION: "груз тяжелее допустимого",
  PACKAGE_MAX_VOLUME_WEIGHT_RESTRICTION: "груз больше допустимого объёма",
};
const reasonOf = (s: Split) => [s.unavailable_reason, s.delivery_method?.unavailable_reason].find((r) => r && r !== "UNSPECIFIED");
const daysUntil = (iso?: string) => (iso ? Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000)) : undefined);

export const ozon: DeliveryProvider = {
  id: "ozon",
  ready: () => Boolean(process.env.OZON_APP_CLIENT_ID && process.env.OZON_APP_CLIENT_SECRET),

  async calculate(q) {
    const base = { service: "ozon", mode: "pvz" } as const;
    if (q.items?.some((i) => i.custom)) return [{ ...base, cost: null, unavailable: true, note: "свой размер Ozon не возит — выберите СДЭК" }];
    const products = await ozonProducts();
    const items = (q.items ?? []).map((i) => ({ i, p: matchProduct(i, products) }));
    if (!items.length || items.some((x) => !x.p?.sku)) return [{ ...base, cost: null }];

    const pointId = q.pointId || (await cityPoints(q.city))[0]?.id;
    if (!pointId) return [{ ...base, cost: null, unavailable: true, note: "нет пунктов Ozon в этом городе" }];
    const r = await sellerApi<{ splits?: Split[] }>("/v2/delivery/checkout", {
      delivery_schema: SCHEMA,
      delivery_type: { pick_up: { map_point_id: Number(pointId) } },
      items: items.map(({ i, p }) => ({ sku: p!.sku, offer_id: p!.offerId, quantity: i.qty })),
    });
    const splits = r.splits ?? [];
    const bad = splits.find((s) => !s.commissions?.total || reasonOf(s));
    if (!splits.length || bad) {
      const reason = bad && reasonOf(bad);
      return [{ ...base, cost: null, unavailable: true, note: (reason && REASON[reason]) || "Ozon не доставит этот заказ" }];
    }
    const cost = splits.reduce((s, x) => s + Number(x.commissions!.total!.amount), 0);
    const range = splits.map((s) => s.delivery_method?.timeslots?.[0]?.client_date_range).filter(Boolean);
    const days = daysRange(Math.max(...range.map((d) => daysUntil(d!.from) ?? 0)) || undefined, Math.max(...range.map((d) => daysUntil(d!.to) ?? 0)) || undefined);
    const option: DeliveryOption = { ...base, cost: Math.ceil(cost), days, note: q.pointId ? undefined : "до ближайшего пункта" };
    return [option];
  },

  points: ({ city }) => cityPoints(city),
};
