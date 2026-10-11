const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

export const formatPrice = (n: number) => `${rub.format(Math.round(n))} ₽`;

export const formatArea = (n: number) =>
  `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} м²`;

/** "3х4,5" -> "3 × 4,5 м" */
export const formatSize = (s: string) => `${s.replace("х", " × ")} м`;

export const parseSize = (s: string): [number, number] => {
  const [w, l] = s.split("х").map((x) => Number(x.replace(",", ".")));
  return [w, l];
};

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Ориентировочная цена нестандартного размера: площадь × медиана ₽/м², округление до 10 ₽. */
export const estimateCustom = (area: number, perM2: number) => Math.ceil((area * perM2) / 10) * 10;
