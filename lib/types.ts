export type CategoryId = "tents" | "curtains" | "windows" | "nets" | "fabric";
export type MaterialId = "brezent" | "oxford" | "pvh" | "pvh-clear" | "mesh";
export type ArtKind = "tarp" | "curtain" | "curtain-window" | "window" | "window-tint" | "net" | "roll";

export type Variant = {
  option: string;
  color: string;
  size: string;
  area: number;
  price: number;
  /** вес в упаковке, кг */
  weight: number;
  /** упаковка: длина, ширина, высота, см */
  box: [number, number, number];
};

export type Product = {
  slug: string;
  title: string;
  category: CategoryId;
  material: MaterialId;
  kind: ArtKind;
  optionLabel: string | null;
  priceFrom: number;
  priceTo: number;
  pricePerM2Median: number;
  pricePerM2ByOption: Record<string, number>;
  /** средний вес 1 м² изделия, кг — для нестандартных размеров */
  kgPerM2: number;
  areaMin: number;
  areaMax: number;
  colors: string[];
  options: string[];
  sizesCount: number;
  variants: Variant[];
};

/** Товар без вариантов: всё, что нужно каталогу и карточке-превью. */
export type ProductSummary = Omit<Product, "variants"> & {
  rank: number;
  short: string;
  badges: string[];
  /** Фото для карточки каталога (пусто — показываем SVG-иллюстрацию) */
  frames: string[];
};

/** Картинки товара: ключ — пропитка/тип, цвет или «пропитка|цвет» (axis = both) */
export type ProductMedia = {
  slug: string;
  axis: "option" | "color" | "both";
  covers: Record<string, string>;
  gallery: Record<string, string[]>;
  sizes: Record<string, Record<string, string>>;
};

/** Картинки для клиента: вместо тысяч путей — папка и индексы размеров из CompactVariants */
export type ClientMedia = {
  axis: ProductMedia["axis"];
  covers: Record<string, string>;
  gallery: Record<string, string[]>;
  sizes: Record<string, { base: string; idx: number[] }>;
};

/** Компактные варианты для конфигуратора: индексы вместо повторяющихся строк. */
export type CompactVariants = {
  sizes: string[];
  areas: number[];
  /** упаковки «Д×Ш×В» без повторов */
  boxes: string[];
  /** [optionIdx, colorIdx, sizeIdx, price, weightKg, boxIdx] */
  rows: [number, number, number, number, number, number][];
};

export type CartItem = {
  key: string;
  slug: string;
  title: string;
  kind: ArtKind;
  option: string;
  color: string;
  size: string;
  area: number;
  price: number;
  qty: number;
  custom: boolean;
  image?: string;
  /** вес одной штуки, кг (у своего размера — оценка) */
  weight?: number;
  /** упаковка «Д×Ш×В» в см; у своего размера нет */
  box?: string;
};
