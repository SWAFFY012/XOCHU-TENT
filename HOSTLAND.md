# Автодеплой «Хочу Тент» на Hostland

Сайт — Node.js-приложение на Next.js. При каждом изменении в ветке `main` GitHub Actions
(`.github/workflows/deploy.yml`) собирает его и выгружает по FTP в каталог приложения
на Hostland, затем перезапускает приложение через `tmp/restart.txt`.

## 1. Приложение в панели Hostland

Аккаунт Hostland `host1890550` (не путать с аккаунтом «Сириуса»).
«Сайты» → `хочу-тент.рф` → Nodejs:

- каталог приложения — `/home/host1890550/xn----jtbybvccot.xn--p1ai/projects/xochu-tent`;
- Node.js v24.11.1, стартовый файл — `server.js`.

`server.js` — обёртка из `hostland/server.js`: перенаправляет http на https и отдаёт файлы
проверки Let's Encrypt из `htdocs/www/.well-known` (без этого не продлится SSL).
Сам сервер Next она подключает как `next-server.js`.
В окне настроек Nodejs в панели не нажимайте «Сохранить» с включённым
«Перезаписать каталог приложения» — это удалит сайт.

Секреты сервера — файл `.env` в каталоге приложения (полный список — в `.env.example`):

```text
TELEGRAM_BOT_TOKEN=...      # заказы менеджеру
TELEGRAM_CHAT_ID=...
ADMIN_PASSWORD=...          # вход в /admin
SMTP_HOST=... SMTP_USER=... SMTP_PASS=... SMTP_FROM=...   # письма покупателю
OZONPAY_API_URL=... OZONPAY_ACCESS_KEY=... OZONPAY_SECRET_KEY=...
CDEK_CLIENT_ID=... CDEK_CLIENT_SECRET=... CDEK_SHIPMENT_POINT=...   # расчёт и отправления СДЭК
PEK_LOGIN=... PEK_API_KEY=...                                       # расчёт ПЭК
DELLIN_APP_KEY=...                                                   # расчёт Деловых Линий
```

Почта России считается без ключа. Служба без ключей остаётся в корзине с пометкой «рассчитает менеджер».

Заказы хранятся в `.data/orders.json` в каталоге приложения. Деплой не трогает ни `.env`, ни `.data`:
FTP-выгрузка удаляет только то, что сама загрузила. Делайте копию `.data/orders.json` вместе с бэкапами.

`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PAYMENTS_ENABLED` и `NEXT_PUBLIC_YANDEX_MAPS_KEY` вшиваются при сборке — их задают переменными
репозитория на GitHub (раздел 2), а не в `.env`.

## 2. Настройки репозитория на GitHub

Settings → Secrets and variables → Actions:

**Secrets:**

- `FTP_SERVER` — `185.26.122.11`;
- `FTP_USERNAME` — `host1890550` (FTP-аккаунт из «Файлы | FTP», корень — домашний каталог);
- `FTP_PASSWORD` — пароль этого FTP-аккаунта.

**Variables:**

- `NEXT_PUBLIC_SITE_URL` — основной домен, по умолчанию `https://хочу-тент.рф`;
- `NEXT_PUBLIC_PAYMENTS_ENABLED` — `true`, когда подключена оплата Ozon Pay (по умолчанию выключена);
- `NEXT_PUBLIC_YANDEX_MAPS_KEY` — ключ Яндекс Карт для выбора пункта выдачи в корзине;
- `HOSTLAND_APP_DIR` — каталог приложения от корня FTP, со слешем в конце:
  `./xn----jtbybvccot.xn--p1ai/projects/xochu-tent/`.

Пока секреты или переменная не заданы, сборка проходит, а выгрузка пропускается с предупреждением.

## 3. Что выгружается

Папка `.next/standalone`: обёртка `server.js`, `next-server.js`, урезанный `node_modules`, `.next`, `public` (фото товаров)
и `data/media`. Первая выгрузка долгая — около 600 МБ картинок, дальше уходят только изменения.

## 4. Проверка

После деплоя откройте `https://хочу-тент.рф/version.txt`: там короткий номер коммита и время
последней выгрузки. Лог деплоя — вкладка Actions в репозитории.
