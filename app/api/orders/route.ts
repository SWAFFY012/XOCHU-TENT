import { NextResponse } from "next/server";
import { buildOrder, CheckoutError, type CheckoutBody } from "@/lib/orders/build";
import { newOrderText } from "@/lib/orders/messages";
import { createOrder, updateOrder } from "@/lib/orders/store";
import type { Order } from "@/lib/orders/types";
import { notifyManager, telegramReady } from "@/lib/notify/telegram";
import { adminEnabled } from "@/lib/admin-auth";
import { buildPaymentRequest, createPayment } from "@/lib/payments/ozonpay";
import { paymentsEnabled } from "@/lib/site";

// Простой лимит: не больше 5 заказов с одного IP за 10 минут (в памяти инстанса)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

/**
 * Оформление заказа (intent "pay") или заявки на расчёт (intent "lead").
 * Заказ сохраняется, менеджер получает его в Telegram; при включённой оплате
 * в ответе приходит ссылка на платёжную форму Ozon Pay.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Слишком много заказов подряд. Попробуйте через 10 минут." }, { status: 429 });
  }

  // Менеджер не узнает о заказе ни из Telegram, ни из /admin — не принимаем, чтобы заказ не потерялся
  if (process.env.NODE_ENV === "production" && !telegramReady() && !adminEnabled()) {
    console.error("[orders] не настроены ни TELEGRAM_*, ни ADMIN_PASSWORD");
    return NextResponse.json({ error: "Приём заказов временно не работает." }, { status: 503 });
  }

  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать заказ." }, { status: 400 });
  }
  // Ловушка для ботов: делаем вид, что всё хорошо
  if (body.website) return NextResponse.json({ ok: true, id: "0", kind: "order" });

  let draft: Omit<Order, "id">;
  try {
    draft = await buildOrder(body, ip);
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  // Не сохранили (диск недоступен) — всё равно передаём менеджеру, номер берём из времени
  let order: Order;
  let saved = true;
  try {
    order = await createOrder(draft);
  } catch (e) {
    console.error("[orders] не удалось сохранить заказ", e);
    saved = false;
    order = { ...draft, id: "T" + Date.now().toString(36).slice(-5).toUpperCase() };
  }

  let paymentUrl: string | undefined;
  let paymentError = false;
  if (order.kind === "order" && paymentsEnabled && saved) {
    try {
      const { paymentId, url } = await createPayment(buildPaymentRequest(order));
      paymentUrl = url;
      await updateOrder(order.id, (o) => {
        o.payment = { ...o.payment, id: paymentId, url, status: "pending" };
      });
    } catch (e) {
      console.error("[orders] платёж не создался", e);
      paymentError = true;
    }
  }

  const notified = await notifyManager(newOrderText(order, { saved, paymentUrl, paymentError }));
  if (!saved && !notified) {
    return NextResponse.json({ error: "Заказ не отправился." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: order.id, kind: order.kind, paymentUrl });
}
