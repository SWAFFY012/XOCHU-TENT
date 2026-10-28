import "server-only";
import { formatSize } from "@/lib/format";
import { site } from "@/lib/site";
import type { Order } from "@/lib/orders/types";

/**
 * Заказы и заявки с сайта → сделки в Битрикс24 через входящий вебхук (права: CRM).
 * Портал в режиме «простой CRM»: лидов нет, поэтому создаём контакт и сделку.
 * Адрес вебхука — секрет, только в env: BITRIX_WEBHOOK_URL=https://<портал>.bitrix24.ru/rest/<id>/<код>/
 */
const hook = () => {
  const url = process.env.BITRIX_WEBHOOK_URL?.trim();
  return url ? url.replace(/\/?$/, "/") : "";
};

export const bitrixReady = () => Boolean(hook());

async function call<T>(method: string, params: unknown): Promise<T> {
  const res = await fetch(`${hook()}${method}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as { result?: T; error?: string; error_description?: string };
  if (!res.ok || data.error) throw new Error(`${method}: ${data.error ?? res.status} ${data.error_description ?? ""}`.trim());
  return data.result as T;
}

/** Текст для Telegram (HTML) → BB-коды комментария Битрикс24. */
const toBb = (html: string) =>
  html
    .replace(/<b>/g, "[B]")
    .replace(/<\/b>/g, "[/B]")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Контакт покупателя: существующий с тем же телефоном или новый. */
async function contactId(o: Order): Promise<number> {
  const c = o.customer;
  const found = await call<{ CONTACT?: number[] }>("crm.duplicate.findbycomm", {
    type: "PHONE",
    values: [c.phone],
    entity_type: "CONTACT",
  }).catch(() => ({}) as { CONTACT?: number[] });
  if (found.CONTACT?.length) return found.CONTACT[0];

  return call<number>("crm.contact.add", {
    fields: {
      NAME: c.name,
      PHONE: [{ VALUE: c.phone, VALUE_TYPE: "WORK" }],
      ...(c.email && { EMAIL: [{ VALUE: c.email, VALUE_TYPE: "WORK" }] }),
      ...(c.telegram && { IM: [{ VALUE: c.telegram, VALUE_TYPE: "TELEGRAM" }] }),
      SOURCE_ID: "WEB",
      SOURCE_DESCRIPTION: site.domain,
    },
  });
}

/**
 * Создаёт сделку по заказу. text — то же сообщение, что уходит менеджеру в Telegram.
 * Возвращает id сделки или null, если Битрикс не настроен или не ответил.
 */
export async function createBitrixDeal(o: Order, text: string): Promise<number | null> {
  if (!bitrixReady()) return null;
  try {
    const contact = await contactId(o);
    const deal = await call<number>("crm.deal.add", {
      fields: {
        TITLE: `${o.kind === "order" ? "Заказ" : "Заявка"} №${o.id} с сайта`,
        CATEGORY_ID: 0,
        STAGE_ID: "NEW",
        CONTACT_ID: contact,
        OPPORTUNITY: o.total,
        CURRENCY_ID: "RUB",
        SOURCE_ID: "WEB",
        SOURCE_DESCRIPTION: site.domain,
        COMMENTS: toBb(text),
      },
      params: { REGISTER_SONET_EVENT: "Y" },
    });
    // Товары в карточке сделки; не вышло — состав всё равно есть в комментарии
    await call("crm.deal.productrows.set", {
      id: deal,
      rows: o.items.map((i) => ({
        PRODUCT_NAME: `${i.title}, ${formatSize(i.size)}${i.custom ? " (свой размер)" : ""}, ${i.color}${i.option !== "Стандарт" ? `, ${i.option}` : ""}`,
        PRICE: i.price,
        QUANTITY: i.qty,
      })),
    }).catch((e) => console.error("[bitrix] товары не добавились", e));
    return deal;
  } catch (e) {
    console.error("[bitrix]", e);
    return null;
  }
}

/** Комментарий в ленту сделки, например «Заказ оплачен». */
export async function commentBitrixDeal(dealId: number, text: string): Promise<boolean> {
  if (!bitrixReady()) return false;
  try {
    await call("crm.timeline.comment.add", { fields: { ENTITY_ID: dealId, ENTITY_TYPE: "deal", COMMENT: toBb(text) } });
    return true;
  } catch (e) {
    console.error("[bitrix]", e);
    return false;
  }
}
