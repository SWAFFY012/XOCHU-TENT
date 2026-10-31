/**
 * Позиция корзины → артикул товара на Ozon.
 * Артикулы заказчика строятся по правилу: «Тент_Оксфорд_3х4_васильковый», «ПВХ_синий_3х4», «УШ_ВО_2,2х3,4»…
 * Сравниваем без учёта регистра, с одинаковым «х» и запятой в дробях: у заказчика где-то «2.5х3», где-то «2,5х3».
 */
export type OzonLine = { slug: string; option: string; color: string; size: string };

/** Приводит артикул к виду для сравнения. */
export const normalizeOffer = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/x/g, "х")
    .replace(/\./g, ",")
    .replace(/\s+/g, "_")
    .replace("оксфрорд", "оксфорд")
    .replace(/_м$/, "");

const lower = (c: string) => c.toLowerCase();
const pick = (map: Record<string, string>, c: string) => map[c] ?? lower(c);
/** ВО, ОП, СКПВ — первое слово названия пропитки */
const abbr = (option: string) => option.split(/\s+/)[0];

const OXFORD: Record<string, string> = { Синий: "васильковый" };
const PVH: Record<string, string> = { Оливковый: "фисташка" };
const SHTORA_OKS: Record<string, string> = { Бежевый: "беж", Коричневый: "кор", Серый: "сер", Черный: "чер" };

/** «1х2,8» → «2,8х1»: тент один и тот же, у заказчика часть размеров записана в другом порядке. */
const swapSides = (size: string) => size.split("х").reverse().join("х");

/**
 * Возможные артикулы позиции на Ozon, нормализованные, самые вероятные первыми: сначала размер как на сайте,
 * потом с переставленными сторонами. Пусто — такого изделия у заказчика нет.
 */
export function ozonOfferKeys(line: OzonLine): string[] {
  const swapped = swapSides(line.size);
  const keys = new Set(offerKeys(line));
  if (swapped !== line.size) for (const k of offerKeys({ ...line, size: swapped })) keys.add(k);
  return [...keys];
}

function offerKeys({ slug, option, color, size }: OzonLine): string[] {
  const keys: string[] = [];
  switch (slug) {
    case "tent-oxford":
      keys.push(`Тент_Оксфорд_${size}_${pick(OXFORD, color)}`);
      break;
    case "tent-pvh": {
      const c = pick(PVH, color);
      keys.push(`ПВХ_${c}_${size}`, `ПВХ_${c}_${size}_кгт`);
      break;
    }
    case "tent-brezent":
      keys.push(`Брезент_${abbr(option)}_${size}`);
      break;
    case "shtora-pvh":
      keys.push(`ПВХ_штора_${size}_вставка_${lower(color)}`);
      break;
    case "shtora-oxford":
      keys.push(`УШ_ОКС_${size}_${pick(SHTORA_OKS, color)}`);
      break;
    case "shtora-brezent":
      keys.push(`УШ_${abbr(option)}_${size}`);
      break;
    case "setka-tenevaya":
      if (option === "ПВХ") keys.push(`Сетка_пвх_${color === "Хаки" ? "хаки" : "кор"}_${size}`);
      else keys.push(`Сетка_брезентовая_${size}`, `Сетка_брезент_${size}`);
      break;
    case "tkan-brezent":
      keys.push(`Ткань_брезент_${size}_${abbr(option)}`);
      break;
    case "tkan-oxford":
      keys.push(`Ткань_ОКС_${size}_${lower(color)}`);
      break;
    case "tkan-pvh":
      keys.push(`Ткань_ПВХ_${size}_${lower(color)}`);
      break;
  }
  return keys.map(normalizeOffer);
}
