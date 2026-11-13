import { esc } from "@/lib/notify/telegram";
import type { Order, OrderSource } from "./types";

/** Кампании и объявления Яндекс Директа: по номерам из меток показываем названия. */
const CAMPAIGNS: Record<string, string> = {
  "715933821": "Поиск тест",
  "716052424": "РСЯ тест",
};
const ADS: Record<string, { title: string; group: string }> = {
  // поиск
  "1926367104054313143": { title: "Тент ПВХ на заказ любого размера", group: "Тенты ПВХ" },
  "1926418301136287910": { title: "Утеплённая штора из Оксфорда", group: "Оксфорд утеплённый" },
  "1926418490115853832": { title: "Утеплённые шторы в гараж", group: "Утеплённые шторы" },
  "1926440031525745703": { title: "Утеплённая штора из брезента", group: "Брезент утеплённый" },
  // РСЯ
  "1926617031421002685": { title: "Тент ПВХ на заказ любого размера", group: "Тенты ПВХ" },
  "1926617031421002686": { title: "Утеплённая штора из Оксфорда", group: "Оксфорд утеплённый" },
  "1926617031421002687": { title: "Утеплённые шторы в гараж", group: "Утеплённые шторы" },
  "1926617031421002688": { title: "Утеплённая штора из брезента", group: "Брезент утеплённый" },
};

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) || undefined : undefined);
const int = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 0), max) : undefined);

/** Берёт из браузера только известные поля нужной длины: это данные посетителя, им нельзя доверять. */
export function cleanVisit(raw: unknown): OrderSource | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const src: OrderSource = {
    utmSource: str(v.utm_source, 60),
    utmMedium: str(v.utm_medium, 60),
    campaign: str(v.utm_campaign, 40),
    ad: str(v.utm_content, 40),
    term: str(v.utm_term, 150),
    yclid: v.yclid === true ? true : undefined,
    referrer: str(v.referrer, 100),
    landing: str(v.landing, 200),
    seconds: int(v.seconds, 86_400),
    pages: int(v.pages, 999),
  };
  return Object.values(src).some((x) => x !== undefined) ? src : undefined;
}

const isDirect = (s: OrderSource) => s.yclid === true || (s.utmSource === "yandex" && s.utmMedium === "cpc");

function channel(s: OrderSource | undefined) {
  if (!s) return null;
  if (isDirect(s)) return "Яндекс Директ";
  if (s.utmSource) return `метка ${s.utmSource}${s.utmMedium ? ` / ${s.utmMedium}` : ""}`;
  if (s.referrer) return /(^|\.)(yandex|ya|google|bing|mail|duckduckgo)\./.test(s.referrer) ? `поиск (${s.referrer})` : `переход с ${s.referrer}`;
  return "прямой заход";
}

function duration(sec: number) {
  if (sec < 60) return `${sec} с`;
  const m = Math.floor(sec / 60);
  const rest = sec % 60;
  return rest ? `${m} мин ${rest} с` : `${m} мин`;
}

/** Блок «Откуда пришёл» для Telegram и Битрикс24: канал, кампания, группа, объявление, фраза и длина визита. */
export function sourceText(o: Order): string | null {
  const s = o.source;
  const ch = channel(s);
  if (!s || !ch) return "📊 Источник: нет данных (визит не записался)";
  const lines = [`📊 <b>Источник:</b> ${esc(ch)}`];
  if (s.campaign) {
    const name = CAMPAIGNS[s.campaign];
    lines.push(`Кампания: ${name ? `«${esc(name)}» (№${esc(s.campaign)})` : `№${esc(s.campaign)}`}`);
  }
  if (s.ad) {
    const ad = ADS[s.ad];
    lines.push(ad ? `Группа: «${esc(ad.group)}»\nОбъявление: ${esc(ad.title)} (№${esc(s.ad)})` : `Объявление: №${esc(s.ad)}`);
  }
  if (s.term) lines.push(`Фраза: ${s.term.startsWith("---") ? "автотаргетинг" : esc(s.term)}`);
  if (s.landing) lines.push(`Зашёл на: ${esc(s.landing)}`);
  if (s.seconds !== undefined || s.pages) {
    lines.push(`Визит: ${s.seconds !== undefined ? `≈ ${duration(s.seconds)}` : ""}${s.seconds !== undefined && s.pages ? ", " : ""}${s.pages ? `${s.pages} стр.` : ""}`);
  }
  return lines.join("\n");
}

/** Короткая строка об источнике для сообщения об оплате. */
export function sourceShort(o: Order): string | null {
  const s = o.source;
  const ch = channel(s);
  if (!s || !ch) return null;
  const parts = [ch];
  if (s.campaign) parts.push(CAMPAIGNS[s.campaign] ?? `кампания №${s.campaign}`);
  if (s.ad) parts.push(ADS[s.ad]?.group ?? `объявление №${s.ad}`);
  return `📊 Источник: ${esc(parts.join(" · "))}`;
}

/** Одна строка об источнике для админки (без HTML). */
export function sourcePlain(o: Order): string {
  const s = o.source;
  const ch = channel(s);
  if (!s || !ch) return "нет данных";
  const parts = [ch];
  if (s.campaign) parts.push(CAMPAIGNS[s.campaign] ?? `кампания №${s.campaign}`);
  if (s.ad) parts.push(ADS[s.ad] ? `${ADS[s.ad].group}: ${ADS[s.ad].title}` : `объявление №${s.ad}`);
  if (s.term) parts.push(s.term.startsWith("---") ? "автотаргетинг" : s.term);
  if (s.seconds !== undefined) parts.push(`визит ≈ ${duration(s.seconds)}${s.pages ? `, ${s.pages} стр.` : ""}`);
  return parts.join(" · ");
}
