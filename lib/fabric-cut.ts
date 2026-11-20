/** Размер отреза хранится как длина × фиксированная ширина рулона. */
export const fabricCuts: Readonly<Record<string, { width: number; maxLength: number }>> = {
  "tkan-brezent": { width: 0.9, maxLength: 20 },
  "tkan-oxford": { width: 1.5, maxLength: 20 },
  "tkan-pvh": { width: 2.5, maxLength: 25 },
};

export function validCustomSize(slug: string, length: number, width: number) {
  if (!Number.isFinite(length) || !Number.isFinite(width)) return false;
  const cut = fabricCuts[slug];
  return cut
    ? length >= 1 && length <= cut.maxLength && width === cut.width
    : length >= 0.5 && length <= 30 && width >= 0.5 && width <= 50;
}
