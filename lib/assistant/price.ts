import "server-only";
import { getAllSummaries, getProduct } from "@/lib/catalog";
import { formatPrice, priceCustom } from "@/lib/format";
import { isQuoteOnly, sizePricePerM2 } from "@/lib/site";

/**
 * Цена изделия нужного размера — тем же расчётом, что у калькулятора на сайте и проверки заказа
 * (lib/orders/build.ts). Модель плохо считает и путает цены соседних товаров, поэтому цены ей отдаёт код.
 */
const num = (v: unknown) => Number(String(v ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
const fmt = (n: number) => String(n).replace(".", ",");

export function calcPrice(a: Record<string, unknown>) {
  const p = getProduct(String(a.product ?? "").trim());
  if (!p) return { error: "нет такого товара: слаг бери из справки", slugs: getAllSummaries().map((x) => x.slug) };

  const want = String(a.option ?? "").trim().toLowerCase();
  const option = p.options.length === 1 ? p.options[0] : p.options.find((o) => o.toLowerCase() === want) ?? p.options.find((o) => want && o.toLowerCase().includes(want));
  if (!option) return { error: "уточни пропитку или вариант", options: p.options };

  const w = num(a.width);
  const l = num(a.length);
  if (!(w >= 0.5 && l >= 0.5 && w <= 30 && l <= 50)) return { error: "размер вне допустимого: стороны от 0,5 м, ширина до 30 м, длина до 50 м" };

  // готовый размер из каталога (стороны в любом порядке); цена может отличаться по цветам
  const sizes = new Set([`${fmt(w)}х${fmt(l)}`, `${fmt(l)}х${fmt(w)}`]);
  const ready = p.variants.filter((v) => v.option === option && sizes.has(v.size)).map((v) => v.price);
  const note = isQuoteOnly(p.slug, !ready.length)
    ? "заказывается заявкой: менеджер подтверждает цену"
    : p.slug.startsWith("tkan-") && !ready.length
      ? "ткань продаётся метражом: цену отреза смотри в карточке товара"
      : undefined;

  if (ready.length) {
    const lo = Math.min(...ready);
    const hi = Math.max(...ready);
    return { product: p.title, option, size: `${fmt(w)} × ${fmt(l)} м`, kind: "готовый размер из каталога", price: lo === hi ? formatPrice(lo) : `от ${formatPrice(lo)} до ${formatPrice(hi)} в зависимости от цвета`, note };
  }
  if (p.slug.startsWith("tkan-")) return { product: p.title, option, size: `${fmt(w)} × ${fmt(l)} м`, note };

  const area = Math.round(w * l * 100) / 100;
  const price = priceCustom(area, sizePricePerM2(p.slug, p.pricePerM2ByOption[option] ?? p.pricePerM2Median, area, true));
  return { product: p.title, option, size: `${fmt(w)} × ${fmt(l)} м`, area: `${fmt(area)} м²`, kind: "свой размер, шьём 1–3 рабочих дня", price: formatPrice(price), note };
}

/** Описание функции для GigaChat (массив `functions`). */
export const calcPriceFunction = {
  name: "calc_price",
  description:
    "Считает точную цену изделия заданного размера так же, как калькулятор на сайте. Вызывай каждый раз, когда спрашивают цену конкретного размера. Сам цену не считай и из справки не бери.",
  parameters: {
    type: "object",
    properties: {
      product: { type: "string", description: "Слаг товара из справки, например tent-brezent" },
      option: { type: "string", description: "Пропитка или вариант, например «ВО» или «Оцинкованные». Для товаров без вариантов не указывать" },
      width: { type: "number", description: "Ширина в метрах" },
      length: { type: "number", description: "Длина в метрах" },
    },
    required: ["product", "width", "length"],
  },
  few_shot_examples: [
    { request: "Сколько стоит брезентовый тент 2 на 4 с пропиткой ВО?", params: { product: "tent-brezent", option: "ВО", width: 2, length: 4 } },
    { request: "Цена тента из Оксфорда 3 на 5 метров", params: { product: "tent-oxford", width: 3, length: 5 } },
  ],
};
