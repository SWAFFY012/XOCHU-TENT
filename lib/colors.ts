// Оттенки для свотчей и SVG-иллюстраций
export const colorHex: Record<string, string> = {
  Хаки: "#6E6B3E",
  Бежевый: "#D6C5A0",
  Коричневый: "#6B4A32",
  Серый: "#8C9192",
  Синий: "#2B4E9C",
  Черный: "#26292A",
  Белый: "#F3F4F1",
  Оливковый: "#5F6B37",
};

export const hexOf = (name: string) => colorHex[name] ?? "#8C9192";

/** Светлый цвет ткани -> тёмные линии на иллюстрации */
export const isLight = (name: string) => ["Бежевый", "Белый"].includes(name);
