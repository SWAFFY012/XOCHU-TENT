import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { site } from "@/lib/site";
import type { Order } from "@/lib/orders/types";

/**
 * Интернет-эквайринг Ozon Pay Checkout (карта, СБП, Ozon Карта; чек 54-ФЗ формирует Ozon).
 * Документация: https://docs.ozon.ru/api/acquiring/ — /v1/createOrder и POST-уведомления.
 *
 * Ключи только из env (в репозиторий не коммитить):
 *   OZONPAY_ACCESS_KEY     — идентификатор токена из кабинета эквайринга
 *   OZONPAY_SECRET_KEY     — секретный ключ токена: подпись запросов
 *   OZONPAY_WEBHOOK_SECRET — секретный ключ для уведомлений: проверка их подписи
 *   OZONPAY_API_URL        — по умолчанию https://payapi.ozon.ru
 *   OZONPAY_VAT            — ставка НДС в чеке, по умолчанию VAT_NONE (ИП на упрощёнке)
 *   OZONPAY_TEST_MODE=true — принимать уведомления тестового токена как оплату
 */
const env = {
  apiUrl: (process.env.OZONPAY_API_URL || "https://payapi.ozon.ru").replace(/\/+$/, ""),
  accessKey: process.env.OZONPAY_ACCESS_KEY ?? "",
  secretKey: process.env.OZONPAY_SECRET_KEY ?? "",
  webhookSecret: process.env.OZONPAY_WEBHOOK_SECRET ?? "",
  vat: process.env.OZONPAY_VAT || "VAT_NONE",
  testMode: process.env.OZONPAY_TEST_MODE === "true",
};

const RUB = "643";
const FISCAL = "FISCAL_TYPE_SINGLE";
const ALGO = "PAY_ALGO_SMS";

export const ozonPayConfigured = () => Boolean(env.accessKey && env.secretKey);

export class PaymentNotConfigured extends Error {
  constructor(what: string) {
    super(`Ozon Pay: ${what}`);
  }
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Позиция чека: цена за единицу в копейках. */
export type ReceiptItem = {
  name: string;
  price: number;
  quantity: number;
  type: "TYPE_PRODUCT" | "TYPE_SERVICE";
  extId: string;
  attributes?: { color?: string; size?: string };
};

export type PaymentRequest = {
  orderId: string;
  /** сумма, копейки; равна сумме позиций */
  amount: number;
  customer: { email: string; phone: string };
  receipt: ReceiptItem[];
  successUrl: string;
  failUrl: string;
  notificationUrl: string;
};

/** Наименование позиции в чеке: до 128 символов, как требует ФФД. */
const receiptName = (i: Order["items"][number]) =>
  `${i.title}, ${i.size.replace("х", "×")} м, ${i.color}${i.option !== "Стандарт" ? `, ${i.option}` : ""}`.slice(0, 128);

/** Собирает запрос на оплату заказа: сумма, позиции чека, адреса возврата и уведомлений. */
export function buildPaymentRequest(order: Order): PaymentRequest {
  const receipt: ReceiptItem[] = order.items.map((i) => ({
    name: receiptName(i),
    price: Math.round(i.price * 100),
    quantity: i.qty,
    type: "TYPE_PRODUCT",
    extId: i.slug,
    attributes: { color: i.color, size: i.size },
  }));
  // доставка в чек — только если оплачивается вместе с заказом (deliveryPayment = "with_order")
  if (order.delivery.method === "carrier" && order.delivery.cost && order.total > order.itemsTotal) {
    receipt.push({ name: "Доставка", price: Math.round(order.delivery.cost * 100), quantity: 1, type: "TYPE_SERVICE", extId: "delivery" });
  }
  return {
    orderId: order.id,
    amount: receipt.reduce((s, r) => s + r.price * r.quantity, 0),
    customer: { email: order.customer.email, phone: order.customer.phone },
    receipt,
    successUrl: `${site.url}/order/success?order=${order.id}`,
    failUrl: `${site.url}/order/fail?order=${order.id}`,
    notificationUrl: `${site.url}/api/payments/ozonpay/webhook`,
  };
}

/**
 * extId в Ozon одноразовый: номер заказа + метка времени, чтобы повторная попытка
 * или номер, начатый заново после потери .data, не упирались в «уже создан».
 */
const toExtId = (orderId: string) => `${orderId}-${Date.now().toString(36)}`;
const fromExtId = (extId: string) => extId.replace(/-[0-9a-z]+$/, "");

/** Создаёт заказ в Ozon Pay и возвращает его id и ссылку на платёжную форму. */
export async function createPayment(req: PaymentRequest): Promise<{ paymentId: string; url: string }> {
  if (!ozonPayConfigured()) throw new PaymentNotConfigured("не заданы OZONPAY_ACCESS_KEY и OZONPAY_SECRET_KEY");
  const extId = toExtId(req.orderId);
  const value = String(req.amount);
  const body = {
    accessKey: env.accessKey,
    extId,
    amount: { currencyCode: RUB, value },
    paymentAlgorithm: ALGO,
    mode: "MODE_FULL",
    enableFiscalization: true,
    fiscalizationType: FISCAL,
    ...(req.customer.email && { receiptEmail: req.customer.email }),
    fiscalizationPhone: req.customer.phone.replace(/\D/g, ""),
    items: req.receipt.map((r) => ({
      name: r.name,
      extId: r.extId,
      quantity: r.quantity,
      price: { currencyCode: RUB, value: String(r.price) },
      type: r.type,
      vat: env.vat,
      needMark: false,
      ...(r.attributes && { attributes: r.attributes }),
    })),
    successUrl: req.successUrl,
    failUrl: req.failUrl,
    notificationUrl: req.notificationUrl,
    // порядок полей подписи createOrder: accessKey, expiresAt (пусто), extId, fiscalizationType, paymentAlgorithm, валюта, сумма, secretKey
    requestSign: sha256(`${env.accessKey}${extId}${FISCAL}${ALGO}${RUB}${value}${env.secretKey}`),
  };

  const res = await fetch(`${env.apiUrl}/v1/createOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { order?: { id?: string; payLink?: string }; code?: number; message?: string };
  if (!res.ok || !data.order?.id || !data.order.payLink) {
    throw new Error(`Ozon Pay createOrder: ${res.status} ${data.message ?? ""}`.trim());
  }
  return { paymentId: data.order.id, url: data.order.payLink };
}

export type PaymentEvent = {
  /** уникальный id попытки оплаты — по нему отсекаем повторы */
  eventId: string;
  /** id заказа на стороне Ozon */
  paymentId: string;
  /** номер заказа на сайте */
  orderId: string;
  status: "paid" | "failed" | "pending";
  /** сумма, копейки — сверяем с заказом */
  amount: number;
};

type Notification = {
  orderID?: string;
  extOrderID?: string;
  transactionID?: number | null;
  transactionUID?: string;
  transactionUid?: string;
  amount?: number;
  currencyCode?: string;
  testMode?: number;
  status?: string;
  requestSign?: string;
};

const STATUS: Record<string, PaymentEvent["status"]> = { Completed: "paid", Rejected: "failed", Authorized: "pending" };

/**
 * Проверяет подпись уведомления о попытке оплаты заказа и разбирает его. Неверная подпись — null.
 * Подпись: SHA256("{accessKey}|{orderID}|{transactionID или transactionUID}|{extOrderID}|{amount}|{currencyCode}|{секрет уведомлений}").
 */
export function parseWebhook(rawBody: string): PaymentEvent | null {
  if (!env.accessKey || !env.webhookSecret) return null;
  let n: Notification;
  try {
    n = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const uid = n.transactionUID ?? n.transactionUid ?? "";
  const tx = n.transactionID ?? uid;
  const expected = sha256([env.accessKey, n.orderID ?? "", tx, n.extOrderID ?? "", n.amount ?? "", n.currencyCode ?? "", env.webhookSecret].join("|"));
  const got = Buffer.from(String(n.requestSign ?? "").toLowerCase());
  if (got.length !== expected.length || !timingSafeEqual(got, Buffer.from(expected))) return null;

  const status = STATUS[n.status ?? ""];
  if (!status || !n.orderID || !n.extOrderID) return null;
  // Тестовый токен не должен отмечать настоящие заказы оплаченными
  if (n.testMode === 1 && !env.testMode && status === "paid") {
    console.warn(`[ozonpay] тестовое уведомление по заказу ${n.extOrderID} пропущено (OZONPAY_TEST_MODE не включён)`);
    return { eventId: `${uid || tx}:${n.status}`, paymentId: n.orderID, orderId: fromExtId(n.extOrderID), status: "pending", amount: Number(n.amount) };
  }
  return { eventId: `${uid || tx}:${n.status}`, paymentId: n.orderID, orderId: fromExtId(n.extOrderID), status, amount: Number(n.amount) };
}
