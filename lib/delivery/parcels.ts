import type { Parcel } from "./types";

/** Упаковка по умолчанию, если у позиции нет габаритов, см */
const FALLBACK: Parcel["dims"] = [40, 30, 20];

/** «114×105×97» → [114, 105, 97] по убыванию. */
export function parseBox(box: string): Parcel["dims"] {
  const d = box.split(/[×xх*]/).map(Number).filter((n) => n > 0);
  if (d.length !== 3) return FALLBACK;
  return d.sort((a, b) => b - a) as Parcel["dims"];
}

/** Каждая штука товара — отдельное место со своей упаковкой. */
export function toParcels(items: { weight: number; box: string; qty: number }[]): Parcel[] {
  return items.flatMap((i) => Array.from({ length: i.qty }, () => ({ weight: Math.max(0.1, i.weight), dims: parseBox(i.box) })));
}
