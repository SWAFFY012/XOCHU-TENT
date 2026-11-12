import { NextResponse } from "next/server";
import { afterPaid } from "@/lib/orders/paid";
import { updateOrder } from "@/lib/orders/store";
import { parseYandexWebhook } from "@/lib/payments/yandexpay";

/**
 * Уведомления Яндекс Пэй о статусе заказа. Callback URL в кабинете: https://<домен>/api/payments/yandexpay (путь /v1/webhook добавляет Яндекс).
 * Тело — JWT (ES256), подпись и срок проверяет parseYandexWebhook; без верной подписи — 401.
 * Идемпотентность: id события запоминается в заказе, повтор не меняет статус и не шлёт сообщение.
 */
export async function POST(req: Request) {
  const event = await parseYandexWebhook(await req.text());
  if (!event) return NextResponse.json({ status: "fail", reasonCode: "UNAUTHORIZED", reason: "bad token" }, { status: 401 });
  if ("ignore" in event) return NextResponse.json({ status: "success" });

  let becamePaid = false;
  const order = await updateOrder(event.orderId, (o) => {
    if (o.payment.provider !== "yandexpay" || o.payment.events.includes(event.eventId)) return false;
    o.payment.events.push(event.eventId);
    // уведомление о другой попытке оплаты этого заказа (например, начатой заново) не меняет статус
    if (o.payment.id && o.payment.id !== event.paymentId) return;

    if (event.status === "paid") {
      if (o.payment.status === "paid") return;
      const now = new Date().toISOString();
      o.payment.status = "paid";
      o.payment.paidAt = now;
      if (o.status === "new") {
        o.status = "paid";
        o.history.push({ at: now, status: "paid", note: `Яндекс ${o.payment.method === "split" ? "Сплит" : "Пэй"}, заказ ${event.paymentId}` });
      }
      becamePaid = true;
    } else if (o.payment.status !== "paid") {
      // неудачная попытка не отменяет уже прошедшую оплату (возвраты делаются в кабинете Яндекса)
      o.payment.status = event.status;
    }
  });

  if (!order) return NextResponse.json({ status: "fail", reasonCode: "ORDER_NOT_FOUND", reason: "order not found" }, { status: 404 });
  if (becamePaid) await afterPaid(order);
  return NextResponse.json({ status: "success" });
}
