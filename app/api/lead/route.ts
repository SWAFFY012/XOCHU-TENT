import { NextResponse } from "next/server";
import { findVariant, getSummary } from "@/lib/catalog";
import { estimateCustom, estimateWeight, formatPrice, formatSize, formatWeight } from "@/lib/format";
import { deliveryServices, site } from "@/lib/site";

type InItem = { slug: string; option: string; color: string; size: string; qty: number; custom: boolean };
type Body = {
  name: string;
  phone: string;
  city?: string;
  comment?: string;
  contact?: string;
  telegram?: string;
  delivery?: string;
  service?: string;
  intent?: string;
  website?: string;
  consent: boolean;
  items: InItem[];
};

const CONTACT: Record<string, string> = { phone: "звонок", telegram: "Telegram", whatsapp: "WhatsApp" };

// Простой лимит: не больше 5 заявок с одного IP за 10 минут (в памяти инстанса)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
const num = (s: string) => Number(s.replace(",", "."));

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Слишком много заявок подряд. Попробуйте через 10 минут." }, { status: 429 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать заявку." }, { status: 400 });
  }

  // Ловушка для ботов: делаем вид, что всё хорошо
  if (body.website) return NextResponse.json({ ok: true, id: "0" });

  const name = clip(body.name, 80);
  const phone = clip(body.phone, 24);
  if (name.length < 2 || !/^\+?[\d\s\-()]{10,18}$/.test(phone)) {
    return NextResponse.json({ error: "Проверьте имя и телефон." }, { status: 400 });
  }
  if (!body.consent) return NextResponse.json({ error: "Нужно согласие на обработку данных." }, { status: 400 });
  // Ник Telegram обязателен, если клиент выбрал связь в Telegram
  const tgMatch = clip(body.telegram, 64).match(/^(?:@|(?:https?:\/\/)?t\.me\/)?([a-zA-Z][a-zA-Z0-9_]{4,31})$/);
  if (body.contact === "telegram" && !tgMatch) {
    return NextResponse.json({ error: "Проверьте ник в Telegram." }, { status: 400 });
  }
  const telegram = body.contact === "telegram" && tgMatch ? "@" + tgMatch[1] : "";
  // Получение: самовывоз или доставка одной из служб (только из списка)
  const delivery = body.delivery === "delivery" ? "delivery" : "pickup";
  const service = deliveryServices.find((d) => d.id === body.service);
  const city = clip(body.city, 80);
  if (delivery === "delivery" && (!service || city.length < 2)) {
    return NextResponse.json({ error: "Выберите службу доставки и город." }, { status: 400 });
  }
  const wantsPay = body.intent === "pay";
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) {
    return NextResponse.json({ error: "Заявка пустая." }, { status: 400 });
  }

  // Цены пересчитываем на сервере по прайсу, а не берём из браузера
  const lines: string[] = [];
  let total = 0;
  let weight = 0;
  let approx = false;
  for (const [n, it] of body.items.entries()) {
    const p = getSummary(clip(it.slug, 60));
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
    if (!p || !p.options.includes(it.option) || !p.colors.includes(it.color)) {
      return NextResponse.json({ error: "В заявке есть товар, которого нет в каталоге. Обновите страницу." }, { status: 400 });
    }
    const size = clip(it.size, 20);
    let price: number | undefined;
    let unitWeight = 0;
    let box = "";
    if (it.custom) {
      const [w, l] = size.split("х").map(num);
      if (!(w >= 0.5 && l >= 0.5 && w <= 30 && l <= 50)) {
        return NextResponse.json({ error: "Проверьте нестандартный размер." }, { status: 400 });
      }
      const area = Math.round(w * l * 100) / 100;
      price = estimateCustom(area, p.pricePerM2ByOption[it.option] ?? p.pricePerM2Median);
      unitWeight = estimateWeight(area, p.kgPerM2);
      approx = true;
    } else {
      const v = findVariant(p.slug, it.option, it.color, size);
      price = v?.price;
      unitWeight = v?.weight ?? 0;
      box = v ? v.box.join("×") : "";
    }
    if (!price) return NextResponse.json({ error: "Цена одного из размеров изменилась. Обновите страницу." }, { status: 400 });
    total += price * qty;
    weight += unitWeight * qty;
    const opt = it.option !== "Стандарт" ? `, ${esc(it.option)}` : "";
    lines.push(
      `${n + 1}. <b>${esc(p.title)}</b>\n   ${esc(formatSize(size))}${it.custom ? " (свой размер, ≈)" : ""}, ${esc(it.color)}${opt}\n   ${qty} шт × ${formatPrice(price)} = <b>${formatPrice(price * qty)}</b>${unitWeight ? `\n   ${it.custom ? "≈ " : ""}${formatWeight(unitWeight)}/шт${box ? `, упаковка ${box} см` : ""}` : ""}`,
    );
  }

  const id = Date.now().toString(36).slice(-6).toUpperCase();
  const text = [
    wantsPay ? `💳 <b>Заказ №${id}</b> с сайта — хочет оплатить онлайн` : `🧵 <b>Заявка №${id}</b> с сайта`,
    "",
    `👤 ${esc(name)}`,
    `📞 ${esc(phone)} — предпочитает ${CONTACT[body.contact ?? "phone"] ?? "звонок"}`,
    telegram ? `✈️ Telegram: ${esc(telegram)}` : "",
    delivery === "pickup"
      ? `🏭 Самовывоз: ${esc(site.addressShort)}`
      : `🚚 Доставка: ${esc(service!.title)}, ${esc(city)}`,
    body.comment ? `💬 ${esc(clip(body.comment, 1000))}` : "",
    "",
    ...lines,
    "",
    `Итого: <b>${formatPrice(total)}</b>${approx ? " (есть ориентировочные позиции)" : ""}`,
    weight ? `⚖️ Вес заказа ≈ ${formatWeight(Math.round(weight * 10) / 10)}` : "",
    wantsPay ? "Онлайн-оплата пока не подключена — отправьте клиенту ссылку на оплату." : "",
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[lead] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID не заданы. Заявка:\n" + text);
      return NextResponse.json({ ok: true, id });
    }
    console.error("[lead] Telegram не настроен");
    return NextResponse.json({ error: "Приём заявок временно не работает." }, { status: 503 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[lead] Telegram", res.status, await res.text());
      return NextResponse.json({ error: "Заявка не отправилась." }, { status: 502 });
    }
  } catch (e) {
    console.error("[lead] Telegram", e);
    return NextResponse.json({ error: "Заявка не отправилась." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id });
}
