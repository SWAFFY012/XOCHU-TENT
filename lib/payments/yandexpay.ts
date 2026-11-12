import "server-only";
import { createPublicKey, verify } from "node:crypto";
import { site } from "@/lib/site";
import type { Order } from "@/lib/orders/types";

/**
 * Яндекс Пэй и Яндекс Сплит по Merchant API без SDK: заказ создаётся запросом /v1/orders, покупатель уходит на paymentUrl,
 * статус приходит уведомлением /v1/webhook (JWT, подпись ES256). Документация: https://pay.yandex.ru/docs/ru/custom/
 *
 * Ключи только из env (в репозиторий не коммитить):
 *   YANDEXPAY_API_KEY   — «Ключ Merchant API» из кабинета (console.pay.yandex.ru → Настройки). В тестовой среде равен Merchant ID.
 *   YANDEXPAY_SANDBOX   — true: тестовая среда sandbox.pay.yandex.ru (платежи не настоящие)
 *   YANDEXPAY_TAX       — ставка НДС в чеке: 6 — без НДС (ИП на упрощёнке), по умолчанию 6
 *   YANDEXPAY_MERCHANT_ID — необязательно: если задан, уведомления чужого магазина отклоняются
 *   YANDEXPAY_SPLIT     — false отключает кнопку «Сплит» (по умолчанию включена)
 * Callback URL в кабинете: https://<домен>/api/payments/yandexpay — «/v1/webhook» Яндекс добавляет сам.
 */
const env = {
  apiKey: process.env.YANDEXPAY_API_KEY ?? "",
  sandbox: process.env.YANDEXPAY_SANDBOX === "true",
  tax: Number(process.env.YANDEXPAY_TAX || 6),
  merchantId: process.env.YANDEXPAY_MERCHANT_ID ?? "",
  split: process.env.YANDEXPAY_SPLIT !== "false",
};

const base = () => (env.sandbox ? "https://sandbox.pay.yandex.ru" : "https://pay.yandex.ru");

export const yandexPayConfigured = () => Boolean(env.apiKey);
export const yandexSplitEnabled = () => yandexPayConfigured() && env.split;

export type YandexMethod = "yandex" | "split";

/** Наименование позиции в чеке: без «×» и длинного тире (как у Ozon Pay), до 128 символов. */
const itemTitle = (i: Order["items"][number]) =>
  `${i.title}, ${i.size} м, ${i.color}${i.option !== "Стандарт" ? `, ${i.option}` : ""}`
    .replace(/[—–]/g, "-")
    .replace(/[^\p{L}\p{N} ,.\-()/%]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, 128);

/** Рубли в строку с копейками: Яндекс принимает суммы строкой «1234.00». */
const rub = (n: number) => n.toFixed(2);

/** Номер заказа в Яндексе одноразовый: номер на сайте + метка времени, чтобы повторная попытка не упиралась в «уже создан». */
const toExternalId = (orderId: string) => `${orderId}-${Date.now().toString(36)}`;
const fromExternalId = (id: string) => id.replace(/-[0-9a-z]+$/, "");

/** Создаёт заказ в Яндекс Пэй и возвращает ссылку на платёжную форму. method: yandex — карта, split — только Сплит. */
export async function createYandexPayment(order: Order, method: YandexMethod): Promise<{ paymentId: string; url: string }> {
  if (!yandexPayConfigured()) throw new Error("Яндекс Пэй: не задан YANDEXPAY_API_KEY");
  const items = order.items.map((i, n) => ({
    productId: `${i.slug}-${n + 1}`,
    title: itemTitle(i),
    quantity: { count: String(i.qty) },
    unitPrice: rub(i.price),
    total: rub(i.price * i.qty),
    receipt: { tax: env.tax },
  }));
  // доставка в заказ — только если оплачивается вместе с товаром (deliveryPayment = "with_order")
  if (order.delivery.method === "carrier" && order.delivery.cost && order.total > order.itemsTotal) {
    items.push({ productId: "delivery", title: "Доставка", quantity: { count: "1" }, unitPrice: rub(order.delivery.cost), total: rub(order.delivery.cost), receipt: { tax: env.tax } });
  }
  const orderId = toExternalId(order.id);
  const body = {
    orderId,
    currencyCode: "RUB",
    availablePaymentMethods: method === "split" ? ["SPLIT"] : ["CARD"],
    cart: { items, total: { amount: rub(items.reduce((s, i) => s + Number(i.total), 0)) } },
    ...(order.customer.email && { fiscalContact: order.customer.email }),
    redirectUrls: {
      onSuccess: `${site.url}/order/success?order=${order.id}`,
      onError: `${site.url}/order/fail?order=${order.id}`,
      onAbort: `${site.url}/cart`,
    },
    ttl: 86_400,
  };
  const res = await fetch(`${base()}/api/merchant/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Api-Key ${env.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: string; data?: { paymentUrl?: string }; reason?: string; reasonCode?: string };
  if (!res.ok || !data.data?.paymentUrl) {
    throw new Error(`Яндекс Пэй /v1/orders: ${res.status} ${JSON.stringify(data)}`.slice(0, 280));
  }
  return { paymentId: orderId, url: data.data.paymentUrl };
}

export type YandexEvent = {
  /** уникальный id события — по нему отсекаем повторы */
  eventId: string;
  /** номер заказа на сайте */
  orderId: string;
  /** id заказа, который мы передали Яндексу */
  paymentId: string;
  status: "paid" | "failed" | "pending";
};

type Jwk = { kid?: string; kty?: string; crv?: string; x?: string; y?: string };
let jwks: { keys: Jwk[]; at: number } | null = null;

/** Публичные ключи Яндекса: кэш на 10 минут; неизвестный kid — повторная загрузка (ротация ключей). */
async function keyFor(kid: string | undefined) {
  const load = async () => {
    const res = await fetch(`${base()}/api/jwks`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`jwks ${res.status}`);
    jwks = { keys: ((await res.json()) as { keys: Jwk[] }).keys, at: Date.now() };
  };
  if (!jwks || Date.now() - jwks.at > 10 * 60_000) await load();
  let jwk = jwks!.keys.find((k) => k.kid === kid);
  if (!jwk) {
    await load();
    jwk = jwks!.keys.find((k) => k.kid === kid);
  }
  return jwk ? createPublicKey({ key: jwk as import("node:crypto").JsonWebKey, format: "jwk" }) : null;
}

const STATUS: Record<string, YandexEvent["status"]> = { CAPTURED: "paid", CONFIRMED: "paid", FAILED: "failed", VOIDED: "failed" };

/**
 * Проверяет JWT уведомления (ES256, ключи с /api/jwks, срок exp) и разбирает событие об оплате.
 * Неверная подпись или просрочка — null; события не об оплате (возвраты и др.) — { ignore: true }.
 */
export async function parseYandexWebhook(token: string): Promise<YandexEvent | { ignore: true } | null> {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string; kid?: string; exp?: number };
    if (header.alg !== "ES256") return null;
    if (header.exp && header.exp * 1000 < Date.now()) return null;
    const key = await keyFor(header.kid);
    if (!key) return null;
    const ok = verify("sha256", Buffer.from(`${parts[0]}.${parts[1]}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(parts[2], "base64url"));
    if (!ok) return null;

    const p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      merchantId?: string;
      event?: string;
      eventTime?: string;
      order?: { orderId?: string; paymentStatus?: string };
    };
    if (env.merchantId && p.merchantId !== env.merchantId) return null;
    if (p.event !== "ORDER_STATUS_UPDATED" || !p.order?.orderId) return { ignore: true };
    const status = STATUS[p.order.paymentStatus ?? ""] ?? "pending";
    return {
      eventId: `${p.order.orderId}:${p.order.paymentStatus}:${p.eventTime ?? ""}`,
      orderId: fromExternalId(p.order.orderId),
      paymentId: p.order.orderId,
      status,
    };
  } catch {
    return null;
  }
}
