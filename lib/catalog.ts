import "server-only";
import raw from "@/data/products.json";
import { productCopy } from "./content";
import { cardFrames, getMedia } from "./media";
import { priceCustom } from "./format";
import { customPricePerM2 } from "./site";
import type { CompactVariants, Product, ProductSummary } from "./types";

// Полный массив вариантов живёт только на сервере.
const products = (raw as unknown as Product[]).map(withCustomPrices);

/**
 * Прайс заказчика (lib/site.ts) вместо цен Ozon: цена м² для своего размера
 * и пересчёт готовых размеров из списка — площадь × цена м², как у своего размера.
 */
function withCustomPrices(p: Product): Product {
  const set = customPricePerM2[p.slug];
  if (set === undefined) return p;
  const pricePerM2ByOption = Object.fromEntries(
    p.options.map((o) => [o, typeof set === "number" ? set : (set[o] ?? p.pricePerM2ByOption[o])]),
  );
  const vals = Object.values(pricePerM2ByOption).sort((a, b) => a - b);
  const mid = vals.length >> 1;
  const pricePerM2Median = Math.round(vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2);
  const variants = p.variants.map((v) => ({ ...v, price: priceCustom(v.area, pricePerM2ByOption[v.option]) }));
  const prices = variants.map((v) => v.price);
  return {
    ...p,
    variants,
    priceFrom: Math.min(...prices),
    priceTo: Math.max(...prices),
    pricePerM2ByOption,
    pricePerM2Median,
  };
}

export function getAllSummaries(): ProductSummary[] {
  return products.map((p, i) => toSummary(p, i));
}

export function getSummary(slug: string): ProductSummary | undefined {
  const i = products.findIndex((p) => p.slug === slug);
  return i === -1 ? undefined : toSummary(products[i], i);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const getSlugs = () => products.map((p) => p.slug);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toSummary({ variants, ...p }: Product, rank: number): ProductSummary {
  const copy = productCopy[p.slug];
  return { ...p, rank, short: copy?.short ?? "", badges: copy?.badges ?? [], frames: cardFrames(getMedia(p.slug)) };
}

/** Сжимает варианты товара для передачи в клиентский конфигуратор. */
export function getCompactVariants(slug: string): CompactVariants {
  const p = getProduct(slug);
  if (!p) return { sizes: [], areas: [], boxes: [], rows: [] };
  const sizes: string[] = [];
  const areas: number[] = [];
  const sizeIdx = new Map<string, number>();
  for (const v of p.variants) {
    if (!sizeIdx.has(v.size)) {
      sizeIdx.set(v.size, sizes.length);
      sizes.push(v.size);
      areas.push(v.area);
    }
  }
  const boxes: string[] = [];
  const boxIdx = new Map<string, number>();
  const rows = p.variants.map((v) => {
    const b = v.box.join("×");
    if (!boxIdx.has(b)) {
      boxIdx.set(b, boxes.length);
      boxes.push(b);
    }
    return [p.options.indexOf(v.option), p.colors.indexOf(v.color), sizeIdx.get(v.size)!, v.price, v.weight, boxIdx.get(b)!] as CompactVariants["rows"][number];
  });
  return { sizes, areas, boxes, rows };
}

/** Вариант целиком (цена, вес, упаковка) для проверки заявки на сервере. */
export function findVariant(slug: string, option: string, color: string, size: string) {
  return getProduct(slug)?.variants.find((v) => v.option === option && v.color === color && v.size === size);
}

