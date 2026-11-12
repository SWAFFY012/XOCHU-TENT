import "server-only";
import { after } from "next/server";
import { paidText } from "@/lib/orders/messages";
import { autoShip } from "@/lib/orders/shipment";
import type { Order } from "@/lib/orders/types";
import { bitrixReady, commentBitrixDeal } from "@/lib/notify/bitrix";
import { notifyManager, telegramReady } from "@/lib/notify/telegram";

/**
 * Заказ только что стал оплаченным (любой платёжный сервис): сообщение менеджеру и комментарий в сделку Битрикс24,
 * затем, уже после ответа платёжному сервису, автоматическое отправление в службу доставки (lib/orders/shipment.ts).
 */
export async function afterPaid(order: Order) {
  const text = paidText(order);
  await Promise.all([
    order.crm?.bitrixDealId ? commentBitrixDeal(order.crm.bitrixDealId, text) : null,
    telegramReady() || !bitrixReady() ? notifyManager(text) : null,
  ]);
  after(() => autoShip(order).catch((e) => console.error(`[shipment] заказ ${order.id}:`, e)));
}
