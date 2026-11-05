import "server-only";
import { deliveryProviders } from "@/lib/delivery";
import { commentBitrixDeal, bitrixReady } from "@/lib/notify/bitrix";
import { esc, notifyManager, telegramReady } from "@/lib/notify/telegram";
import { autoShipment } from "@/lib/site";
import { serviceTitle } from "./messages";
import { getOrder, updateOrder } from "./store";
import type { Order } from "./types";

export type ShipmentResult = { ok: true; carrierOrderId: string; track?: string } | { ok: false; error: string };

// Кнопка в /admin и автосоздание после оплаты могут сработать одновременно: заказ в службе должен появиться один раз
const busy = new Set<string>();

/**
 * Отправление в кабинете службы по данным заказа: пункт выдачи, тариф, места. Общий код кнопки «Создать отправление»
 * в /admin и автосоздания после оплаты. Результат записывается в заказ (номер в службе, трек, строка в истории).
 */
export async function createShipment(orderId: string, how: "вручную" | "автоматически" = "вручную"): Promise<ShipmentResult> {
  if (busy.has(orderId)) return { ok: false, error: "Отправление уже создаётся." };
  busy.add(orderId);
  try {
    const order = await getOrder(orderId);
    if (!order || order.delivery.method !== "carrier") return { ok: false, error: "Заказ не найден." };
    const d = order.delivery;
    const provider = deliveryProviders[d.service];
    if (!provider.createOrder || !provider.ready()) return { ok: false, error: `Для ${serviceTitle(d.service)} автоматическое оформление не подключено.` };
    if (d.carrierOrderId) return { ok: false, error: "Отправление уже создано." };

    let created: { carrierOrderId: string; track?: string };
    try {
      created = await provider.createOrder(order);
    } catch (e) {
      return { ok: false, error: `${serviceTitle(d.service)} не принял заказ: ${e instanceof Error ? e.message : e}` };
    }
    // номер отправления служба присваивает не сразу — пробуем получить, иначе кнопка «Обновить трек»
    const track = created.track ?? (await provider.getTrack?.(created.carrierOrderId).catch(() => null)) ?? undefined;
    await updateOrder(order.id, (o) => {
      if (o.delivery.method !== "carrier") return false;
      o.delivery.carrierOrderId = created.carrierOrderId;
      if (track) o.delivery.track = track;
      o.history.push({ at: new Date().toISOString(), status: o.status, note: `отправление ${serviceTitle(d.service)} создано ${how}` });
    });
    return { ok: true, carrierOrderId: created.carrierOrderId, track };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    busy.delete(orderId);
  }
}

/**
 * После оплаты создаёт отправление для служб из autoShipment (lib/site.ts) и пишет менеджеру, что получилось.
 * Если служба не приняла заказ, менеджер получает причину и создаёт отправление вручную в /admin.
 */
export async function autoShip(order: Order): Promise<void> {
  const d = order.delivery;
  if (d.method !== "carrier" || !autoShipment.includes(d.service)) return;
  const title = serviceTitle(d.service);
  const r = await createShipment(order.id, "автоматически");
  const ref = d.service === "cdek" ? ` Номер заказа в СДЭК: HT-${order.id}.` : "";
  const text = r.ok
    ? `📦 <b>Заказ №${order.id}</b>: отправление ${title} создано автоматически${r.track ? `, трек ${esc(r.track)}` : ", трек появится позже («Обновить трек» в /admin)"}.${ref} Передайте посылку в пункт приёма службы.`
    : `⚠️ <b>Заказ №${order.id}</b> оплачен, но отправление ${title} не создалось: ${esc(r.error)}\nСоздайте его вручную в /admin.`;
  await Promise.all([
    order.crm?.bitrixDealId ? commentBitrixDeal(order.crm.bitrixDealId, text) : null,
    telegramReady() || !bitrixReady() ? notifyManager(text) : null,
  ]);
}
