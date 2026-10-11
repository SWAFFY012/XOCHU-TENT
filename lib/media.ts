import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ClientMedia, ProductMedia } from "./types";

// Манифесты картинок создаёт scripts/import-images.mjs -> data/media/<slug>.json
const cache = new Map<string, ProductMedia>();

export function getMedia(slug: string): ProductMedia | null {
  const hit = cache.get(slug);
  if (hit) return hit;
  const file = path.join(process.cwd(), "data", "media", `${slug}.json`);
  if (!existsSync(file)) return null; // отсутствие не кэшируем: манифест могут добавить позже
  const media = JSON.parse(readFileSync(file, "utf8")) as ProductMedia;
  cache.set(slug, media);
  return media;
}

/** Кадры для карточки каталога: обложки всех пропиток/цветов, затем галерея первой */
export function cardFrames(m: ProductMedia | null): string[] {
  if (!m) return [];
  // При ключе «пропитка|цвет» показываем все цвета одной пропитки
  const keys = Object.keys(m.covers);
  const firstOption = keys[0]?.split("|")[0];
  const covers = keys.filter((k) => m.axis !== "both" || k.startsWith(firstOption + "|")).map((k) => m.covers[k]);
  const first = Object.values(m.gallery)[0] ?? [];
  return [...covers, ...first.slice(0, 3)].slice(0, 6);
}

/** Имя файла размера: «1,5х0,8» -> «15x08» (так его пишет scripts/import-images.mjs) */
export const sizeFile = (size: string) => size.replace(/[,.]/g, "").replace(/х/g, "x");

/** Сжимает манифест для клиента; пути к карточкам размеров собираются из папки и размера */
export function toClientMedia(m: ProductMedia | null, sizes: string[]): ClientMedia | null {
  if (!m) return null;
  const index = new Map(sizes.map((s, i) => [s, i]));
  const out: ClientMedia = { axis: m.axis, covers: m.covers, gallery: m.gallery, sizes: {} };
  for (const [key, bySize] of Object.entries(m.sizes)) {
    const entries = Object.entries(bySize);
    if (!entries.length) continue;
    const base = entries[0][1].slice(0, entries[0][1].lastIndexOf("/"));
    // Страхуемся: шаблон должен совпасть для всех файлов
    if (!entries.every(([s, url]) => url === `${base}/${sizeFile(s)}.webp` && index.has(s))) throw new Error(`Нестандартные пути картинок: ${m.slug} / ${key}`);
    out.sizes[key] = { base, idx: entries.map(([s]) => index.get(s)!) };
  }
  return out;
}
