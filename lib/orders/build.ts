import "server-only";
import { findVariant, getSummary } from "@/lib/catalog";
import { deliveryProviders } from "@/lib/delivery";
import { estimateWeight, priceCustom } from "@/lib/format";
import { customQuoteOnly, deliveryPayment, deliveryServices } from "@/lib/site";
import type { ContactMethod, Order, OrderDelivery, OrderItem } from "./types";

/** Что присылает корзина. Цены и веса не принимаем — считаем по прайсу. */
export type CheckoutBody = {
  intent?: string;
  name?: string;
  phone?: string;
  email?: string;
  contact?: string;
  telegram?: string;
  comment?: string;
  delivery?: string;
  service?: string;
  city?: string;
  address?: string;
  consent?: boolean;
  offer?: boolean;
  website?: string;
  items?: { slug: string; option: string; color: string; size: string; qty: number; custom: boolean }[];
};

export class CheckoutError extends Error {}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
const num = (s: string) => Number(s.replace(",", "."));
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TG_RE = /^(?:@|(?:https?:\/\/)?t\.me\/)?([a-zA-Z][a-zA-Z0-9_]{4,31})$/;

/** «8 (900) 123-45-67», «+7 900 1234567» → «+7 (900) 123-45-67»; иначе пустая строка. */
export function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "8") d = "7" + d.slice(1);
  if (d.length === 10) d = "7" + d;
  if (d.length !== 11 || d[0] !== "7") return "";
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
}

/** Проверяет форму, пересчитывает позиции и собирает черновик заказа (без номера). */
export async function buildOrder(body: CheckoutBody, ip: string): Promise<Omit<Order, "id">> {
  const kind = body.intent === "lead" ? "lead" : "order";
  const name = clip(body.name, 100);
  const phone = normalizePhone(clip(body.phone, 30));
  const email = clip(body.email, 120).toLowerCase();

  if (kind === "order" ? !/\S{2,}\s+\S{2,}/.test(name) : name.length < 2) {
    throw new CheckoutError(kind === "order" ? "Укажите фамилию и имя получателя." : "Укажите имя.");
  }
  if (!phone) throw new CheckoutError("Проверьте телефон: нужен российский номер +7.");
  if (email ? !EMAIL_RE.test(email) : kind === "order") throw new CheckoutError("Укажите email — на него придёт электронный чек.");
  if (!body.consent) throw new CheckoutError("Нужно согласие на обработку персональных данных.");
  if (kind === "order" && !body.offer) throw new CheckoutError("Примите условия публичной оферты.");

  const contact: ContactMethod = body.contact === "telegram" || body.contact === "whatsapp" ? body.contact : "phone";
  const tg = clip(body.telegram, 64).match(TG_RE);
  if (contact === "telegram" && !tg) throw new CheckoutError("Проверьте ник в Telegram.");

  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) {
    throw new CheckoutError("Корзина пустая.");
  }

  // Цены и веса — по прайсу на сервере, а не из браузера
  const items: OrderItem[] = [];
  for (const it of body.items) {
    const p = getSummary(clip(it.slug, 60));
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
    if (!p || !p.options.includes(it.option) || !p.colors.includes(it.color)) {
      throw new CheckoutError("В корзине есть товар, которого нет в каталоге. Обновите страницу.");
    }
    const size = clip(it.size, 20);
    let price: number | undefined;
    let weight = 0;
    let box = "";
    if (it.custom) {
      const [w, l] = size.split("х").map(num);
      if (!(w >= 0.5 && l >= 0.5 && w <= 30 && l <= 50)) throw new CheckoutError("Проверьте нестандартный размер.");
      const area = Math.round(w * l * 100) / 100;
      price = priceCustom(area, p.pricePerM2ByOption[it.option] ?? p.pricePerM2Median);
      weight = estimateWeight(area, p.kgPerM2);
    } else {
      const v = findVariant(p.slug, it.option, it.color, size);
      price = v?.price;
      weight = v?.weight ?? 0;
      box = v ? v.box.join("×") : "";
    }
    if (!price) throw new CheckoutError("Цена одного из размеров изменилась. Обновите страницу.");
    items.push({
      slug: p.slug,
      title: p.title,
      option: it.option,
      color: it.color,
      size,
      custom: Boolean(it.custom),
      quote: Boolean(it.custom) && customQuoteOnly.includes(p.slug),
      qty,
      price,
      weight,
      box,
    });
  }
  if (kind === "order" && items.some((i) => i.quote)) {
    throw new CheckoutError("Цену одного из своих размеров подтверждает менеджер — оставьте заявку на расчёт.");
  }

  const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const weight = Math.round(items.reduce((s, i) => s + i.weight * i.qty, 0) * 10) / 10;

  let delivery: OrderDelivery = { method: "pickup" };
  if (body.delivery === "carrier") {
    const service = deliveryServices.find((d) => d.id === body.service);
    const city = clip(body.city, 80);
    const address = clip(body.address, 200);
    if (!service) throw new CheckoutError("Выберите службу доставки.");
    if (city.length < 2) throw new CheckoutError("Укажите город доставки.");
    if (address.length < 3) throw new CheckoutError("Укажите адрес или пункт выдачи.");
    // Пока API служб не подключены, calculate() вернёт null — стоимость посчитает менеджер
    const quote = await deliveryProviders[service.id]
      .calculate({ city, address, weight, boxes: items.flatMap((i) => Array(i.qty).fill(i.box)), value: itemsTotal })
      .catch(() => null);
    delivery = { method: "carrier", service: service.id, city, address, cost: quote?.cost ?? null };
  }
  const deliveryInTotal = deliveryPayment === "with_order" && delivery.method === "carrier" && delivery.cost ? delivery.cost : 0;

  const now = new Date().toISOString();
  return {
    kind,
    createdAt: now,
    updatedAt: now,
    status: "new",
    customer: { name, phone, email, contact, telegram: contact === "telegram" && tg ? "@" + tg[1] : "" },
    comment: clip(body.comment, 1000),
    items,
    itemsTotal,
    weight,
    delivery,
    total: itemsTotal + deliveryInTotal,
    payment: { provider: "ozonpay", status: "none", events: [] },
    consent: { offer: Boolean(body.offer), personalData: true, at: now, ip },
    history: [{ at: now, status: "new" }],
  };
}
