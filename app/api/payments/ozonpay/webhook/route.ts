import { NextResponse } from "next/server";
import { paidText } from "@/lib/orders/messages";
import { updateOrder } from "@/lib/orders/store";
import { notifyManager, telegramReady } from "@/lib/notify/telegram";
import { bitrixReady, commentBitrixDeal } from "@/lib/notify/bitrix";
import { parseWebhook } from "@/lib/payments/ozonpay";

/**
 * Уведомления Ozon Pay о статусе платежа.
 * Подпись проверяет parseWebhook (lib/payments/ozonpay.ts); без верной подписи — 401.
 * Идемпотентность: id уведомления запоминается в заказе, повтор не меняет статус и не шлёт сообщение.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const event = parseWebhook(raw);
  if (!event) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let becamePaid = false;
  const order = await updateOrder(event.orderId, (o) => {
    if (o.payment.events.includes(event.eventId)) return false;
    o.payment.events.push(event.eventId);
    if (o.payment.id && o.payment.id !== event.paymentId) return;
    o.payment.id = event.paymentId;

    if (event.status === "paid") {
      if (o.payment.status === "paid") return;
      // сумма должна совпасть с заказом до копейки
      if (event.amount !== Math.round(o.total * 100)) {
        console.error(`[ozonpay] заказ ${o.id}: сумма ${event.amount} не совпадает с ${o.total * 100}`);
        return;
      }
      const now = new Date().toISOString();
      o.payment.status = "paid";
      o.payment.paidAt = now;
      if (o.status === "new") {
        o.status = "paid";
        o.history.push({ at: now, status: "paid", note: `Ozon Pay, платёж ${event.paymentId}` });
      }
      becamePaid = true;
    } else if (o.payment.status !== "paid") {
      // неудачная попытка не отменяет уже прошедшую оплату (возвраты делаются в кабинете Ozon)
      o.payment.status = event.status;
    }
  });

  if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });
  if (becamePaid) {
    const text = paidText(order);
    await Promise.all([
      order.crm?.bitrixDealId ? commentBitrixDeal(order.crm.bitrixDealId, text) : null,
      telegramReady() || !bitrixReady() ? notifyManager(text) : null,
    ]);
  }
  // Формат ответа в документации не задан: Ozon достаточно кода 200
  return NextResponse.json({ ok: true });
}
