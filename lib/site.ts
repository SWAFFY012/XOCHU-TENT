// ─────────────────────────────────────────────────────────────
// ЕДИНЫЙ КОНФИГ ЗАГЛУШЕК. Всё, что помечено TODO, замените на реальные данные.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: "Хочу Тент",
  legalName: "ИП Иванов Иван Иванович", // TODO: юрлицо или ИП
  inn: "000000000000", // TODO
  ogrn: "000000000000000", // TODO
  url: "https://hochutent.ru", // TODO: боевой домен (для canonical, sitemap, OG)
  phone: "+7 (900) 000-00-00", // TODO
  phoneHref: "tel:+79000000000", // TODO
  email: "zakaz@hochutent.ru", // TODO
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
  // Онлайн-оплата: пока false — кнопка «Оплатить» отправляет заявку, менеджер присылает ссылку.
  // Когда подключим эквайринг Ozon Банка, кнопка поведёт на платёжную форму.
  onlinePayment: false,
} as const;

/** Способы получения заказа. Цены доставки пока считает менеджер; дальше — расчёт по API служб. */
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
