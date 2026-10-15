// Импорт картинок товара из папки с карточками маркетплейса.
//
//   npm run images -- "<папка товара>" <slug> [--skip=7,13] [--alias=84=брезентовая хаки;88=пвх коричневый] [--force]
//
// Понимает раскладки из «Главные для сайта»:
//   <ключ>.png, <Название>_<ключ>.png, «ВО вариант1.png»   — обложки (необязательно)
//   допы <ключ>/N.png, Доп/<ключ>/N.png                    — галерея ключа
//   Доп/N.png                                               — общая картинка для всех ключей
//   Доп/2беж.png                                            — картинка №2 для ключа «беж»
//   Размеры/<размер>/<ключ>.png                             — карточка размера
//   Размеры/<ключ>/<размер>.png, Размеры/<ключ>/<ключ>_<размер>.png
// Размер: 15х08, 1,5х0,8 или 1.5x0.8. Ключ — пропитка/тип (ВО), цвет (Бежевый, беж, Черн)
// или оба (Бежевый пластик, беж пласт). Скрипт сам сопоставляет ключ с вариантами из data/products.json.
//
// Обращения к покупателям маркетплейсов («Дорогие покупатели», «цвет может отличаться», ВБ/ОЗОН)
// отбрасываются автоматически: по имени файла и по сходству с шаблонами из scripts/junk-signatures.json.
// --skip убирает картинки галереи по номеру, --alias задаёт ключ для непонятных имён файлов.
//
// Результат: public/products/<slug>/… (WebP) и data/media/<slug>.json
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const i = a.indexOf("=");
      return i === -1 ? [a.slice(2), ""] : [a.slice(2, i), a.slice(i + 1)];
    }),
);
const [srcDir, slug] = args.filter((a) => !a.startsWith("--"));
if (!srcDir || !slug) {
  console.error('Использование: npm run images -- "<папка>" <slug> [--skip=7,13] [--alias=84=пвх хаки] [--force]');
  process.exit(1);
}
const skip = new Set(String(flags.skip ?? "").split(",").filter(Boolean));
const force = "force" in flags;

const products = JSON.parse(readFileSync(path.join(root, "data", "products.json"), "utf8"));
const product = products.find((p) => p.slug === slug);
if (!product) throw new Error(`Нет товара ${slug} в data/products.json`);

const IMG = /\.(png|jpe?g|webp)$/i;
const SIZE = /\d+(?:[,.]\d+)?\s*[хxХX]\s*\d+(?:[,.]\d+)?/;
const norm = (s) => s.toLowerCase().replace(/ё/g, "е").trim();
const words = (s) => norm(s).split(/[\s—_-]+/).filter(Boolean);
const baseName = (f) => f.replace(IMG, "");

// ── сопоставление ключей ────────────────────────────────────
const aliases = new Map(
  String(flags.alias ?? "")
    .split(";")
    .filter(Boolean)
    .map((pair) => pair.split("=").map((x) => norm(x))),
);
// Служебные слова в именах файлов
const NOISE = /^(утп|ут|окс|доп|допы|допв|карточки|вариант\d*|\d+|хт|ткань\S*)$/;
// Синонимы цветов, если в прайсе цвет назван иначе
const SYNONYMS = { зел: "оливковый", зеленый: "оливковый", зелёный: "оливковый", оливк: "хаки", оливковый: "хаки" };

const prefixLen = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
/** Слово похоже на значение: префикс («беж»), общее начало от 4 букв («оливка») или опечатка («кричневый») */
const similar = (w, value) =>
  words(value).some((x) => x.startsWith(w) || (w.length >= 4 && prefixLen(w, x) >= 4) || (w.length >= 6 && lev(w, x) <= 1));

function matchWord(raw) {
  // синоним — только если сам цвет у товара не найден
  const syn = SYNONYMS[raw];
  const w = syn && product.colors.some((c) => norm(c) === syn) && !product.colors.some((c) => similar(raw, c)) ? syn : raw;
  const colors = product.colors.filter((c) => similar(w, c));
  const options = product.options.filter((o) => similar(w, o) || (w.length >= 4 && norm(o).includes(w)));
  if (colors.length === 1 && !options.length) return { color: colors[0] };
  if (options.length === 1 && !colors.length) return { option: options[0] };
  if (colors.length === 1 && options.length === 1) return { color: colors[0], option: options[0] };
  return null;
}

/** Ключ из имени -> { axis, value }; value — пропитка, цвет или «пропитка|цвет» */
function matchKey(token) {
  const t = norm(token);
  // «БежУТП_ОКС» -> «беж»: служебные приставки бывают склеены с цветом;
  // «ТканьОксфорд» убираем целиком до этого, иначе от него остаётся «форд»
  const src = aliases.get(t) ?? t.replace(/ткань\S*/g, " ").replace(/утп|окс/g, " ");
  let option;
  let color;
  let any = false;
  for (const w of words(src)) {
    if (NOISE.test(w)) continue;
    const m = matchWord(w);
    if (!m) return null;
    any = true;
    option ??= m.option;
    color ??= m.color;
  }
  if (!any) return null;
  // Единственная пропитка/цвет у товара подставляется сама
  if (!option && product.options.length === 1) option = product.options[0];
  if (!color && product.colors.length === 1) color = product.colors[0];
  const multiOpt = product.options.length > 1;
  const multiCol = product.colors.length > 1;
  if (multiOpt && multiCol) return option && color ? { axis: "both", value: `${option}|${color}` } : null;
  if (multiOpt) return option ? { axis: "option", value: option } : null;
  return color ? { axis: "color", value: color } : null;
}

// ── мусор маркетплейсов ─────────────────────────────────────
const NAMED_JUNK = /(вб|wb|оз|oz)/i; // 10-ВБ, 13Озон, 6WB, 8OZ, ОЗОН
const isNamedJunk = (file) => NAMED_JUNK.test(baseName(file).replace(/^\d+-?/, ""));
const sigFile = path.join(root, "scripts", "junk-signatures.json");
const junkSigs = existsSync(sigFile) ? JSON.parse(readFileSync(sigFile, "utf8")).map((b) => Buffer.from(b, "base64")) : [];
const signature = (file) => sharp(file).resize(32, 43, { fit: "fill" }).grayscale().raw().toBuffer();
const distance = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};
async function isTemplateJunk(file) {
  if (!junkSigs.length) return false;
  const s = await signature(file);
  return junkSigs.some((j) => distance(s, j) < 8);
}

// ── пути и конвертация ──────────────────────────────────────
const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
const latin = (s) => [...norm(s)].map((c) => TR[c] ?? (/[a-z0-9]/.test(c) ? c : "-")).join("").replace(/-+/g, "-").replace(/^-|-$/g, "");
const keySlug = (key) => latin(key.replace("|", "-"));
const plainSize = (s) => s.replace(/\s/g, "").replace(/[,.]/g, "").replace(/[xXХ]/g, "х");
// «10,0х0,9» и «10х0,9» — один размер: сравниваем ещё и как числа
const numSize = (s) =>
  s.replace(/\s/g, "").split(/[xXХх]/).map((n) => String(Number(n.replace(",", ".")))).join("х");

const outRoot = path.join(root, "public", "products", slug);
const urlOf = (abs) => "/" + path.relative(path.join(root, "public"), abs).split(path.sep).join("/");

async function convert(src, dst, width, quality) {
  mkdirSync(path.dirname(dst), { recursive: true });
  if (!force && existsSync(dst) && statSync(dst).mtimeMs > statSync(src).mtimeMs) return;
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(dst);
}

const manifest = { slug, axis: null, covers: {}, gallery: {}, sizes: {} };
const jobs = [];
const unknown = new Set();
const dropped = [];
const keyOf = (token) => {
  const m = matchKey(token);
  if (!m) {
    unknown.add(token);
    return null;
  }
  if (manifest.axis && manifest.axis !== m.axis) throw new Error(`Разные типы ключей: ${token}`);
  manifest.axis = m.axis;
  return m.value;
};
const skippedByNumber = (file) => {
  const b = baseName(file);
  return skip.has(b) || skip.has(String(parseInt(b)));
};

// Галерея: { key: [{ n, file }] } и общие картинки для всех ключей
const galleryFiles = {};
const sharedFiles = [];
const addGalleryFile = (key, file) => (galleryFiles[key] ??= []).push({ n: parseInt(path.basename(file)) || 0, file });

async function walkGalleryDir(dir, tokenFromDir) {
  for (const f of readdirSync(dir)) {
    const full = path.join(dir, f);
    if (statSync(full).isDirectory()) {
      await walkGalleryDir(full, f);
      continue;
    }
    if (!IMG.test(f)) continue;
    if (isNamedJunk(f) || skippedByNumber(f) || (await isTemplateJunk(full))) {
      dropped.push(path.relative(srcDir, full));
      continue;
    }
    const rest = baseName(f).replace(/^\d+/, "").trim();
    if (rest) {
      // 2беж.png — картинка конкретного ключа
      const key = keyOf(rest);
      if (key) addGalleryFile(key, full);
    } else if (tokenFromDir) {
      const key = keyOf(tokenFromDir);
      if (key) addGalleryFile(key, full);
    } else {
      sharedFiles.push({ n: parseInt(f) || 0, file: full });
    }
  }
}

for (const name of readdirSync(srcDir)) {
  const full = path.join(srcDir, name);
  const isDir = statSync(full).isDirectory();

  // Обложки: Бежевый.png, Брезент_ВО.png, «ВО вариант1.png» (первая побеждает)
  if (!isDir && IMG.test(name)) {
    // «Брезент_ВО» -> ВО, «БежУТП_ОКС» -> беж: пробуем имя целиком, затем последнюю часть
    const b = baseName(name);
    const token = matchKey(b) ? b : b.split("_").pop();
    const key = keyOf(token);
    if (!key || manifest.covers[key]) continue;
    const dst = path.join(outRoot, `cover-${keySlug(key)}.webp`);
    jobs.push(() => convert(full, dst, 1000, 76));
    manifest.covers[key] = urlOf(dst);
    continue;
  }

  // Галерея: «допы ВО», «допв брезент», «Доп», «ДОП», «Доп карточки», «Допы»
  if (isDir && /^доп/i.test(name)) {
    const token = name.replace(/^доп\S*\s*/i, "").replace(/^карточки\s*/i, "").trim();
    await walkGalleryDir(full, token || null);
  }

  // Размеры: размер ищется в любом сегменте пути, остальное — ключ
  if (isDir && /^размеры$/i.test(name)) {
    const byPlain = new Map(product.variants.map((v) => [plainSize(v.size), v.size]));
    const byNum = new Map(product.variants.map((v) => [numSize(v.size), v.size]));
    const walk = (dir, segs) => {
      for (const f of readdirSync(dir)) {
        const p = path.join(dir, f);
        if (statSync(p).isDirectory()) walk(p, [...segs, f]);
        else if (IMG.test(f)) {
          const all = [...segs, baseName(f)];
          const sizeSeg = all.find((s) => SIZE.test(s) || /^\d+х\d+$/i.test(s));
          const sizeRaw = sizeSeg?.match(SIZE)?.[0] ?? sizeSeg;
          const size = sizeRaw && (byNum.get(numSize(sizeRaw)) ?? byPlain.get(plainSize(sizeRaw)));
          if (!size) {
            unknown.add(`размер ${sizeRaw ?? f}`);
            continue;
          }
          const token = all.map((s) => s.replace(SIZE, " ")).join(" ").replace(/[_]/g, " ").trim();
          const key = keyOf(token);
          if (!key) continue;
          const dst = path.join(outRoot, "sizes", keySlug(key), `${plainSize(size).replace(/х/g, "x")}.webp`);
          jobs.push(() => convert(p, dst, 640, 70));
          (manifest.sizes[key] ??= {})[size] = urlOf(dst);
        }
      }
    };
    walk(full, []);
  }
}

// Собираем галерею: картинки ключа + общие, по номеру
const keys = new Set([...Object.keys(galleryFiles), ...Object.keys(manifest.sizes), ...Object.keys(manifest.covers)]);
for (const key of keys) {
  const list = [...(galleryFiles[key] ?? []), ...sharedFiles].sort((a, b) => a.n - b.n);
  if (!list.length) continue;
  manifest.gallery[key] = list.map(({ file }) => {
    const shared = sharedFiles.some((s) => s.file === file);
    const dst = path.join(outRoot, "gallery", shared ? "common" : keySlug(key), baseName(path.basename(file)) + ".webp");
    if (!jobs.some((j) => j.dst === dst)) {
      const job = () => convert(file, dst, 1000, 76);
      job.dst = dst;
      jobs.push(job);
    }
    return urlOf(dst);
  });
}

// Нет обложки — берём карточку размера, ближайшего к медианной площади товара.
// Ткань на отрез продаётся от 1 м, и цена «от» — за него: обложка — самый короткий отрез
const areas = product.variants.map((v) => v.area).sort((a, b) => a - b);
const midArea = product.category === "fabric" ? areas[0] : areas[Math.floor(areas.length / 2)];
const areaOf = Object.fromEntries(product.variants.map((v) => [v.size, v.area]));
for (const [key, bySize] of Object.entries(manifest.sizes)) {
  if (manifest.covers[key]) continue;
  const best = Object.keys(bySize).reduce((b, s) => (Math.abs(areaOf[s] - midArea) < Math.abs(areaOf[b] - midArea) ? s : b));
  manifest.covers[key] = bySize[best];
}

// Параллельно по 6 файлов
let done = 0;
const queue = [...jobs];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      await queue.shift()();
      if (++done % 300 === 0) console.log(`  ${done}/${jobs.length}`);
    }
  }),
);

mkdirSync(path.join(root, "data", "media"), { recursive: true });
writeFileSync(path.join(root, "data", "media", `${slug}.json`), JSON.stringify(manifest, null, 1));

const sizeCount = Object.values(manifest.sizes).reduce((s, m) => s + Object.keys(m).length, 0);
const missing = product.variants.filter((v) => {
  const k = manifest.axis === "both" ? `${v.option}|${v.color}` : manifest.axis === "option" ? v.option : v.color;
  return !manifest.sizes[k]?.[v.size];
}).length;
console.log(
  `${slug}: ключ ${manifest.axis}, обложек ${Object.keys(manifest.covers).length}, галерея ${Object.values(manifest.gallery).flat().length}, размеров ${sizeCount} (без фото вариантов: ${missing} из ${product.variants.length})`,
);
if (dropped.length) console.log(`Отброшено как обращения маркетплейса: ${dropped.length}`);
if (unknown.size) console.log("Не сопоставлено:", [...unknown].slice(0, 30).join(", ") + (unknown.size > 30 ? ` … ещё ${unknown.size - 30}` : ""));
