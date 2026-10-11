export type CategoryId = "tents" | "curtains" | "windows" | "nets" | "fabric";
export type MaterialId = "brezent" | "oxford" | "pvh" | "pvh-clear" | "mesh";
export type ArtKind = "tarp" | "curtain" | "curtain-window" | "window" | "window-tint" | "net" | "roll";

export type Variant = {
  option: string;
  color: string;
  size: string;
  area: number;
  price: number;
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
  /** [optionIdx, colorIdx, sizeIdx, price] */
  rows: [number, number, number, number][];
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
};
