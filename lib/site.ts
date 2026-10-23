// ─────────────────────────────────────────────────────────────
// ЕДИНЫЙ КОНФИГ ЗАГЛУШЕК. Всё, что помечено TODO, замените на реальные данные.
// ─────────────────────────────────────────────────────────────

// origin приводит кириллический домен к punycode и убирает хвостовой слеш
const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://xn----jtbybvccot.xn--p1ai").origin;

export const site = {
  name: "Хочу Тент",
  legalName: "ИП Аракелов Артур Азатович",
  inn: "236701853098",
  ogrn: "324237500372978",
  // Основной домен: canonical, sitemap, robots, OG. Задаётся в NEXT_PUBLIC_SITE_URL (punycode или кириллицей)
  url: SITE_URL,
  domain: "хочу-тент.рф",
  phone: "+7 (988) 418-68-86",
  phoneHref: "tel:+79884186886",
  email: "zakaz@hochutent.ru", // TODO: реальная почта для заказов и заявлений (домен hochutent.ru не наш)
  telegram: "https://t.me/hochutent", // TODO
  whatsapp: "https://wa.me/79000000000", // TODO
  ozon: "https://www.ozon.ru/seller/hochutent/",
  city: "Янино-1",
  region: "Ленинградская область",
  address: "Ленинградская обл., Всеволожский р-н, г.п. Янино-1, тер. Три Холма, вх. 3/1",
  addressShort: "Янино-1, тер. Три Холма, вх. 3/1",
  addressNote: "Самовывоз по договорённости: предупредите о приезде, подготовим заказ.",
  hours: "Пн–Пт 9:00–19:00, Сб 10:00–16:00", // TODO
  // Точка «ХОЧУТЕНТ» в Яндекс Картах
  map: { lat: 59.951195, lon: 30.580512 },
  yandexOrgId: "181363525341",
  yandexOrgUrl: "https://yandex.ru/maps/org/khochutent/181363525341/",
  yandexVerification: "", // TODO: код из Яндекс Вебмастера
  // Цифры с витрины Ozon (на 11.10.2026). Обновляйте вручную.
  ozonStats: { rating: "4,9", reviews: "5 246", orders: "13,1 тыс." },
  productionDays: "1–3 рабочих дня", // TODO: реальный срок пошива
  responseTime: "15 минут", // TODO: за сколько отвечает менеджер в рабочее время
  foundedYear: 2019, // TODO
  workshopArea: "600 м²", // TODO
  dailyOutput: "до 150 изделий в день", // TODO
  // Сроки, на которые ссылаются оферта, «Доставка и оплата» и корзина
  shipStandard: "1–2 дня", // отгрузка стандартных размеров
  handoverDays: 3, // передача в ТК: до N дней с момента заказа или готовности
  pickupReadyDays: 3, // самовывоз: сообщим о готовности в течение N рабочих дней
  legalEdition: "23 октября 2026 года", // дата редакции оферты, возврата и доставки
} as const;

/**
 * Онлайн-оплата через Ozon Pay. Пока false — «Оформить и оплатить» создаёт заказ,
 * а ссылку на оплату присылает менеджер. true — покупатель уходит на платёжную форму.
 */
export const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

/**
 * Кто и когда оплачивает доставку транспортной компанией.
 * TODO: подтвердить у заказчика. "on_receipt" — покупатель платит ТК при получении;
 * "with_order" — стоимость доставки добавляется к заказу и оплачивается онлайн вместе с товаром.
 */
export const deliveryPayment: "on_receipt" | "with_order" = "on_receipt";

/**
 * Изделия, для которых свой размер нельзя оплатить сразу: цену подтверждает менеджер.
 * Для остальных цена из калькулятора итоговая. TODO: подтвердить список у заказчика.
 */
export const customQuoteOnly: readonly string[] = [];

/** Службы доставки. Стоимость пока считает менеджер; расчёт по API — в lib/delivery. */
export const deliveryServices = [
  { id: "cdek", title: "СДЭК", note: "пункт выдачи или курьер" },
  { id: "post", title: "Почта России", note: "до отделения" },
  { id: "ozon", title: "Ozon Логистика", note: "пункт выдачи Ozon" },
  { id: "dellin", title: "Деловые Линии", note: "до терминала или двери" },
  { id: "pek", title: "ПЭК", note: "до терминала или двери" },
] as const;
export type DeliveryServiceId = (typeof deliveryServices)[number]["id"];

/** Маршрут до самовывоза в Яндекс Картах */
export const routeUrl = `https://yandex.ru/maps/?rtext=~${site.map.lat}%2C${site.map.lon}&rtt=auto`;

// Фото товаров: npm run images -- "<папка>" <slug>  (см. scripts/import-images.mjs)

// Плотности и характеристики материалов. TODO: проверить по паспортам ткани.
export const materialSpecs: Record<string, { density: string; temp: string; life: string; extra: string[] }> = {
  brezent: {
    density: "360–430 г/м²",
    temp: "от −40 до +70 °C",
    life: "5–7 лет", // TODO
    extra: ["Хлопковая ткань высокоплотного плетения", "Дышит: под ней не скапливается конденсат", "Не боится сильного ветра, солнца и мороза"],
  },
  oxford: {
    density: "280 г/м²",
    temp: "от −30 до +70 °C",
    life: "3–5 лет",
    extra: ["Высокоплотная структура ткани", "Двойной подгиб по краю и прочный шов", "Выдерживает ветер, дождь и солнце"],
  },
  pvh: {
    density: "630–650 г/м²", // TODO
    temp: "от −40 до +70 °C",
    life: "7–10 лет",
    extra: ["Полиэстеровая сетка, залитая ПВХ с двух сторон", "Полностью непромокаемый, моется водой", "Сварка швов ТВЧ и горячим воздухом"],
  },
  "pvh-clear": {
    density: "700 мкм",
    temp: "от −30 до +60 °C",
    life: "5–7 лет",
    extra: ["Водонепроницаемость: дождь и снег остаются снаружи", "Теплоизоляция: сохраняет тепло в беседке", "Электроизоляция"],
  },
  mesh: {
    density: "80 г/м²",
    temp: "от −40 до +70 °C",
    life: "3–5 лет", // TODO
    extra: ["Затенение 80%", "Пропускает воздух", "Выдерживает сильный ветер и солнце"],
  },
};
