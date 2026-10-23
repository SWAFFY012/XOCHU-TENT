import "server-only";
import { site } from "@/lib/site";
import type { Order } from "@/lib/orders/types";

/**
 * Интернет-эквайринг Ozon Pay (оплата картой и СБП, чек 54-ФЗ формирует Ozon Pay).
 *
 * Формат запросов и подписи здесь НЕ реализован: открытой документации Ozon Pay нет,
 * её выдают после подключения. Всё, что зависит от неё, помечено TODO — заполните
 * по документации из кабинета Ozon Pay, ничего не придумывая.
 *
 * Ключи только из env (в репозиторий не коммитить):
 *   OZONPAY_API_URL      — адрес API из документации
 *   OZONPAY_ACCESS_KEY   — идентификатор/ключ доступа магазина
 *   OZONPAY_SECRET_KEY   — секрет для подписи запросов
 *   OZONPAY_WEBHOOK_SECRET — секрет для проверки уведомлений (если отличается от SECRET_KEY)
 */
const env = {
  apiUrl: process.env.OZONPAY_API_URL ?? "",
  accessKey: process.env.OZONPAY_ACCESS_KEY ?? "",
  secretKey: process.env.OZONPAY_SECRET_KEY ?? "",
  webhookSecret: process.env.OZONPAY_WEBHOOK_SECRET || process.env.OZONPAY_SECRET_KEY || "",
};

export const ozonPayConfigured = () => Boolean(env.apiUrl && env.accessKey && env.secretKey);

export class PaymentNotConfigured extends Error {
  constructor(what: string) {
    super(`Ozon Pay: ${what} не реализовано — см. TODO в lib/payments/ozonpay.ts`);
  }
}

/** Позиция чека 54-ФЗ в нейтральном виде; в формат Ozon Pay переводится в toProviderReceipt(). */
export type ReceiptItem = {
  name: string;
  /** цена за единицу, копейки */
  price: number;
  quantity: number;
  /** ИП на упрощёнке: «без НДС» */
  vat: "none";
  /** признак предмета расчёта: товар */
  paymentObject: "commodity";
  /** способ расчёта: полная предоплата */
  paymentMethod: "full_prepayment";
};

export type PaymentRequest = {
  orderId: string;
  /** сумма, копейки */
  amount: number;
  description: string;
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
    vat: "none",
    paymentObject: "commodity",
    paymentMethod: "full_prepayment",
  }));
  // доставка в чек — только если оплачивается вместе с заказом (deliveryPayment = "with_order")
  if (order.delivery.method === "carrier" && order.delivery.cost && order.total > order.itemsTotal) {
    receipt.push({
      name: "Доставка",
      price: Math.round(order.delivery.cost * 100),
      quantity: 1,
      vat: "none",
      // TODO: для доставки признак предмета — «услуга»; уточнить код в документации Ozon Pay
      paymentObject: "commodity",
      paymentMethod: "full_prepayment",
    });
  }
  return {
    orderId: order.id,
    amount: Math.round(order.total * 100),
    description: `Заказ №${order.id} в «${site.name}»`,
    customer: { email: order.customer.email, phone: order.customer.phone },
    receipt,
    successUrl: `${site.url}/order/success?order=${order.id}`,
    failUrl: `${site.url}/order/fail?order=${order.id}`,
    notificationUrl: `${site.url}/api/payments/ozonpay/webhook`,
  };
}

/**
 * Создаёт платёж и возвращает ссылку на платёжную форму Ozon Pay.
 * TODO: реализовать по документации Ozon Pay:
 *   1. эндпоинт создания заказа/платежа (env.apiUrl + путь из документации);
 *   2. перевод PaymentRequest в формат API (поля суммы, валюты, чека, покупателя);
 *   3. подпись запроса по алгоритму из документации (env.accessKey, env.secretKey);
 *   4. из ответа взять id платежа и URL платёжной формы.
 */
export async function createPayment(req: PaymentRequest): Promise<{ paymentId: string; url: string }> {
  if (!ozonPayConfigured()) throw new PaymentNotConfigured("ключи OZONPAY_* не заданы, создание платежа");
  void req;
  throw new PaymentNotConfigured("создание платежа");
}

export type PaymentEvent = {
  /** уникальный id уведомления или платежа — по нему отсекаем повторы */
  eventId: string;
  paymentId: string;
  orderId: string;
  status: "paid" | "failed" | "refunded" | "pending";
  /** сумма, копейки — сверяем с заказом */
  amount: number;
};

/**
 * Проверяет подпись уведомления и разбирает его.
 * TODO: реализовать по документации Ozon Pay: где лежит подпись (заголовок или поле),
 * как она считается (алгоритм, порядок полей, env.webhookSecret), какие статусы приходят.
 * Сравнение подписи — только через crypto.timingSafeEqual.
 * Пока не реализовано, возвращает null — уведомление отклоняется.
 */
export function parseWebhook(rawBody: string, headers: Headers): PaymentEvent | null {
  void rawBody;
  void headers;
  if (!env.webhookSecret) return null;
  return null;
}
