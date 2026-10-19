// Собирает data/products.json из прайса Ozon (data/prices.xlsx).
// Колонки: Продукт, Тип, Цвет, Размер, Цена без СПП, Вес, кг., Длина/Ширина/Высота, см. (упаковка).
// Запуск: npm run data
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import XLSX from "xlsx";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2] ?? path.join(root, "data", "prices.xlsx");
const out = path.join(root, "data", "products.json");

// Название в прайсе -> карточка товара на сайте
const PRODUCTS = {
  "Брезент Полог": { slug: "tent-brezent", title: "Тент брезентовый (полог)", category: "tents", material: "brezent", kind: "tarp", optionLabel: "Пропитка" },
  "Тент_Оксфорд": { slug: "tent-oxford", title: "Тент Оксфорд укрывной", category: "tents", material: "oxford", kind: "tarp", optionLabel: null },
  "Тент_ПВХ": { slug: "tent-pvh", title: "Тент ПВХ", category: "tents", material: "pvh", kind: "tarp", optionLabel: null },
  "Сетка": { slug: "setka-tenevaya", title: "Сетка теневая с кантом и люверсами", category: "nets", material: "mesh", kind: "net", optionLabel: "Кант" },
  "Ткань Брезент": { slug: "tkan-brezent", title: "Брезент на отрез", category: "fabric", material: "brezent", kind: "roll", optionLabel: "Пропитка" },
  "Ткань Оксфорд": { slug: "tkan-oxford", title: "Ткань Оксфорд на отрез", category: "fabric", material: "oxford", kind: "roll", optionLabel: null },
  "Ткань ПВХ": { slug: "tkan-pvh", title: "Ткань ПВХ на отрез", category: "fabric", material: "pvh", kind: "roll", optionLabel: null },
  "УТП штора Оксфорд": { slug: "shtora-oxford", title: "Штора утеплённая из Оксфорда", category: "curtains", material: "oxford", kind: "curtain", optionLabel: null },
  "Утп_Штора": { slug: "shtora-brezent", title: "Штора утеплённая из брезента", category: "curtains", material: "brezent", kind: "curtain", optionLabel: "Пропитка" },
  "Штора_ПВХ": { slug: "shtora-pvh", title: "Штора ПВХ для автомойки с прозрачной вставкой", category: "curtains", material: "pvh", kind: "curtain-window", optionLabel: "Тип" },
  "Мягкое окно": { slug: "myagkoe-okno", title: "Мягкое окно ПВХ", category: "windows", material: "pvh-clear", kind: "window", optionLabel: "Поворотные скобы" },
  "Мягкое окно тонированное": { slug: "myagkoe-okno-tonirovannoe", title: "Мягкое окно тонированное", category: "windows", material: "pvh-clear", kind: "window-tint", optionLabel: "Поворотные скобы" },
};

// Порядок карточек в каталоге по умолчанию («популярные»)
const ORDER = [
  "tent-oxford", "tent-pvh", "tent-brezent", "shtora-pvh", "myagkoe-okno", "shtora-oxford",
  "shtora-brezent", "myagkoe-okno-tonirovannoe", "setka-tenevaya", "tkan-brezent", "tkan-oxford", "tkan-pvh",
];

const OPTION_NAMES = {
  "ВО": "ВО — водоупорная",
  "ОП": "ОП — огнеупорная",
  "СКПВ": "СКПВ — от гнили и плесени",
  "пластик": "Пластиковые",
  "цинк": "Оцинкованные",
  "Брезентовая": "Брезентовая",
  "ПВХ": "ПВХ",
  "прозрачная вставка": "С прозрачной вставкой",
};

const cap = (s) => {
  const t = String(s).trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};
const num = (s) => Number(String(s).replace(",", "."));
const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const wb = XLSX.read(readFileSync(src));
const map = new Map();

for (const sheet of wb.SheetNames) {
  for (const row of XLSX.utils.sheet_to_json(wb.Sheets[sheet])) {
    const name = String(row["Продукт"] ?? "").trim();
    const meta = PRODUCTS[name];
    if (!meta) continue;
    const color = cap(row["Цвет"]);
    const rawType = String(row["Тип"] ?? "").trim();
    // У части товаров «Тип» дублирует цвет: пропитки там нет
    const option = meta.optionLabel ? (OPTION_NAMES[rawType] ?? rawType) : "Стандарт";
    const size = String(row["Размер"]).trim().replace(/x/gi, "х");
    const [w, l] = size.split("х").map(num);
    const price = Math.round(Number(row["Цена без СПП"]));
    if (!w || !l || !price) continue;
    // Вес и габариты упаковки — для расчёта доставки
    const weight = Number(row["Вес, кг."]) || 0;
    const box = [row["Длина, см."], row["Ширина, см."], row["Высота, см."]].map((x) => Number(x) || 0);

    if (!map.has(meta.slug)) map.set(meta.slug, { meta, variants: new Map() });
    const key = `${option}|${color}|${size}`;
    const prev = map.get(meta.slug).variants.get(key);
    // Дубли строк в прайсе: оставляем меньшую цену
    if (!prev || price < prev.price) {
      map.get(meta.slug).variants.set(key, { option, color, size, area: Math.round(w * l * 100) / 100, price, weight, box });
    }
  }
}

const products = ORDER.filter((s) => map.has(s)).map((slug) => {
  const { meta, variants } = map.get(slug);
  const list = [...variants.values()].sort((a, b) => {
    const [aw, al] = a.size.split("х").map(num);
    const [bw, bl] = b.size.split("х").map(num);
    return aw - bw || al - bl || a.option.localeCompare(b.option) || a.color.localeCompare(b.color);
  });
  const perM2 = list.map((v) => v.price / v.area);
  // Порядок пропиток как в OPTION_NAMES (ВО, ОП, СКПВ…)
  const order = Object.values(OPTION_NAMES);
  const options = [...new Set(list.map((v) => v.option))].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const pricePerM2ByOption = Object.fromEntries(
    options.map((o) => [o, Math.round(median(list.filter((v) => v.option === o).map((v) => v.price / v.area)))]),
  );
  const areas = list.map((v) => v.area);
  // Вес 1 м² изделия: для оценки веса нестандартного размера
  const kgPerM2 = Math.round(median(list.filter((v) => v.weight).map((v) => v.weight / v.area)) * 1000) / 1000;
  return {
    slug,
    title: meta.title,
    category: meta.category,
    material: meta.material,
    kind: meta.kind,
    optionLabel: meta.optionLabel,
    priceFrom: Math.min(...list.map((v) => v.price)),
    priceTo: Math.max(...list.map((v) => v.price)),
    pricePerM2Median: Math.round(median(perM2)),
    pricePerM2ByOption,
    kgPerM2,
    areaMin: Math.min(...areas),
    areaMax: Math.max(...areas),
    colors: [...new Set(list.map((v) => v.color))],
    options,
    sizesCount: new Set(list.map((v) => v.size)).size,
    variants: list,
  };
});

writeFileSync(out, JSON.stringify(products));
const total = products.reduce((s, p) => s + p.variants.length, 0);
console.log(`products: ${products.length}, variants: ${total} -> ${path.relative(root, out)}`);
