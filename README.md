# Хочу Тент — сайт производства

Next.js 16 (App Router, Cache Components) + TypeScript + Tailwind 4 + framer-motion.

## Запуск

```bash
npm install
cp .env.example .env.local   # заполнить токен бота и chat_id
npm run dev                  # http://localhost:3000
npm run build && npm start   # продакшен
```

Без `TELEGRAM_BOT_TOKEN` в dev-режиме заявки печатаются в консоль сервера, в продакшене API отвечает 503.

## Данные

- `data/prices.xlsx` — прайс (выгрузка Ozon). После замены выполните `npm run data`.
- `data/products.json` — 12 товаров и все варианты. Читается только на сервере (`lib/catalog.ts`).
- Каталог получает сводку без вариантов, карточка — сжатые варианты одного товара.

## Фото товаров

Фото берутся из папок с карточками маркетплейса (как в архиве «Главные для сайта»):

```bash
npm run images -- "<папка товара>" <slug>
# пример: npm run images -- "D:/Главные для сайта/Сетка" setka-tenevaya --alias="84=брезентовая хаки;88=пвх коричневый;92=пвх хаки"
```

Скрипт сам сопоставляет цвета/пропитки и размеры с прайсом, отбрасывает обращения маркетплейсов
(«Дорогие покупатели», ВБ/ОЗОН) и пишет WebP в `public/products/<slug>` + манифест `data/media/<slug>.json`.

## Где менять заглушки

Всё в **`lib/site.ts`**: телефон, адрес, реквизиты, домен, координаты карты, сроки, плотности материалов (`materialSpecs`). Фото товаров — через `npm run images` (см. выше).
Тексты товаров, FAQ и категории — в `lib/content.ts`. Строки с пометкой `TODO` нужно проверить перед запуском.

## Структура

| Путь | Что |
|---|---|
| `app/page.tsx` | главная: вступление, hero-видео, «Готовы к зиме», этапы и материалы (горизонтально), калькулятор, FAQ |
| `app/catalog` | каталог, фильтры в URL (`?cat=&mat=&color=&max=&sort=&q=`) |
| `app/catalog/[slug]` | страница товара (статическая) |
| `app/@modal/(.)catalog/[slug]` | та же карточка поверх каталога, выезжающей панелью |
| `app/cart` + `app/api/lead` | заявка → Telegram, цены пересчитываются на сервере |
| `components/motion` | переходы страниц («ступени»), плавный скролл (Lenis), горизонтальные главы (`PanelChapter`), вступление (`RapidLayersIntro`, Codrops), буквенные заголовки (`SplitReveal`) |
| `components/home` | секции главной: hero, «Готовы к зиме», заставка, этапы и материалы, калькулятор |

Компоненты `StairsTransition` и `CurtainCard` адаптированы из 21st.dev (Page Transition, Card Curtain Reveal).
Видео: `public/hero.mp4` (1080p) и `public/hero-720.mp4` (телефоны), кадрированы из 4:3 в 16:9.
