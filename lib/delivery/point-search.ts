/** Поиск по словам: запятые в адресе и порядок слов не мешают найти ПВЗ. */
export function matchesPointQuery(point: { name: string; address: string }, query: string) {
  const normalize = (s: string) => s.toLowerCase().replace(/ё/g, "е");
  const text = normalize(`${point.name} ${point.address}`);
  return normalize(query).split(/[\s,]+/).filter(Boolean).every((word) => text.includes(word));
}
