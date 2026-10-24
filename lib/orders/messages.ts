import "server-only";
import { formatPrice, formatSize, formatWeight } from "@/lib/format";
import { esc } from "@/lib/notify/telegram";
import { deliveryPayment, deliveryServices, paymentsEnabled, site } from "@/lib/site";
import { STATUS_LABEL, type Order } from "./types";

const CONTACT = { phone: "звонок", telegram: "Telegram", whatsapp: "WhatsApp" } as const;

export const serviceTitle = (id: string) => deliveryServices.find((d) => d.id === id)?.title ?? id;

/** Строка о получении: «Самовывоз…» или «СДЭК до пункта выдачи, Казань, ул. … — 1 250 ₽, 3–5 дн.». */
export function deliveryLine(o: Order) {
  if (o.delivery.method === "pickup") return `Самовывоз: ${site.addressShort}`;
  const d = o.delivery;
  const service = deliveryServices.find((s) => s.id === d.service);
  const how = d.mode === "door" ? "курьером до двери" : (service?.pvzLabel ?? "до пункта выдачи");
  const where = d.point ? `${d.point.address} (${d.point.name}, код ${d.point.id})` : [d.postalCode, d.address].filter(Boolean).join(", ");
  const cost = d.cost ? `${d.note ? "≈ " : ""}${formatPrice(d.cost)}${d.days ? `, ${d.days} дн.` : ""}` : "стоимость рассчитает менеджер";
  return `${serviceTitle(d.service)} ${how}, ${d.city}, ${where} — ${cost}${d.note ? ` (${d.note})` : ""}`;
}

/** Сообщение менеджеру о новом заказе или заявке. */
export function newOrderText(o: Order, opts: { saved: boolean; paymentUrl?: string; paymentError?: boolean }) {
  const lines = o.items.map(
    (i, n) =>
      `${n + 1}. <b>${esc(i.title)}</b>\n   ${esc(formatSize(i.size))}${i.custom ? " (свой размер)" : ""}, ${esc(i.color)}${i.option !== "Стандарт" ? `, ${esc(i.option)}` : ""}\n   ${i.qty} шт × ${formatPrice(i.price)} = <b>${formatPrice(i.price * i.qty)}</b>${i.weight ? `\n   ${formatWeight(i.weight)}/шт${i.box ? `, упаковка ${i.box} см` : ""}` : ""}`,
  );
  const c = o.customer;
  return [
    o.kind === "order" ? `🛒 <b>Заказ №${o.id}</b> с сайта` : `🧵 <b>Заявка №${o.id}</b> на расчёт`,
    "",
    `👤 ${esc(c.name)}`,
    `📞 ${esc(c.phone)} — предпочитает ${CONTACT[c.contact]}`,
    c.email ? `✉️ ${esc(c.email)}` : null,
    c.telegram ? `✈️ Telegram: ${esc(c.telegram)}` : null,
    `${o.delivery.method === "pickup" ? "🏭" : "🚚"} ${esc(deliveryLine(o))}`,
    o.comment ? `💬 ${esc(o.comment)}` : null,
    "",
    ...lines,
    "",
    `Товары: <b>${formatPrice(o.itemsTotal)}</b>`,
    o.total !== o.itemsTotal ? `К оплате с доставкой: <b>${formatPrice(o.total)}</b>` : null,
    o.weight ? `⚖️ Вес заказа ≈ ${formatWeight(o.weight)}` : null,
    o.kind === "order"
      ? opts.paymentUrl
        ? "💳 Покупатель ушёл на оплату Ozon Pay — придёт уведомление об оплате."
        : paymentsEnabled && opts.paymentError
          ? "⚠️ Платёж не создался — отправьте покупателю ссылку на оплату."
          : "💳 Онлайн-оплата выключена — отправьте покупателю ссылку на оплату."
      : null,
    o.delivery.method === "carrier"
      ? deliveryPayment === "on_receipt"
        ? "Доставку покупатель оплачивает при получении в ТК."
        : !o.delivery.cost || o.delivery.note
          ? "Посчитайте доставку и добавьте к оплате."
          : null
      : null,
    opts.saved ? null : "⚠️ Заказ не сохранился на сервере — внесите вручную.",
  ]
    // null — строки, которых в этом заказе нет; "" — намеренные пустые строки между блоками
    .filter((l): l is string => l !== null)
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

export const paidText = (o: Order) =>
  `✅ <b>Заказ №${o.id} оплачен</b>: ${formatPrice(o.total)}\n${esc(o.customer.name)}, ${esc(o.customer.phone)}\n${esc(deliveryLine(o))}`;

export const statusText = (o: Order, note?: string) =>
  `🔄 Заказ №${o.id}: <b>${STATUS_LABEL[o.status]}</b>${note ? `\n${esc(note)}` : ""}`;

/** Письмо покупателю при смене статуса; null — для статуса письма нет. */
export function customerNotice(o: Order): { subject: string; text: string } | null {
  const sign = `\n\n${site.name}\n${site.phone}\n${site.domain}`;
  if (o.status === "ready_for_pickup") {
    return {
      subject: `Заказ №${o.id} готов к самовывозу`,
      text: `Здравствуйте, ${o.customer.name}!\n\nВаш заказ №${o.id} готов. Забрать можно по адресу: ${site.address}.\n${site.hours}. Предупредите о приезде по телефону ${site.phone}.${sign}`,
    };
  }
  if (o.status === "handed_to_carrier" && o.delivery.method === "carrier") {
    const track = o.delivery.track ? `\nТрек-номер: ${o.delivery.track}` : "";
    return {
      subject: `Заказ №${o.id} передан в ${serviceTitle(o.delivery.service)}`,
      text: `Здравствуйте, ${o.customer.name}!\n\nЗаказ №${o.id} передан в службу доставки «${serviceTitle(o.delivery.service)}».${track}\nОтследить отправление можно на сайте службы.${sign}`,
    };
  }
  return null;
}
