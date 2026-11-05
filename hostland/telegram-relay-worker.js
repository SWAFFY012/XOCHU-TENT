// Посредник между сайтом на Hostland и Telegram: с российского хостинга api.telegram.org не открывается (таймаут).
// Cloudflare Worker принимает запрос сайта и пересылает его в Telegram. Бесплатно, ключей в нём нет:
// токен бота остаётся в .env сайта и идёт в адресе запроса, как и в обычном Telegram API.
//
// Как поставить:
//  1. dash.cloudflare.com → Workers & Pages → Create → Create Worker → Deploy (имя любое, например xochu-tg).
//  2. Edit code → удалить пример, вставить этот файл целиком → Deploy.
//  3. Скопировать адрес вида https://xochu-tg.<аккаунт>.workers.dev и записать в .env сайта:
//       TELEGRAM_API_URL=https://xochu-tg.<аккаунт>.workers.dev
//  4. Перезапустить сайт и нажать «Проверить Telegram» в /admin.
//
// Пересылаются только sendMessage; остальные адреса и методы отклоняются, чтобы посредник нельзя было использовать иначе.
export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (request.method !== "POST" || !/^\/bot[^/]+\/sendMessage$/.test(pathname)) {
      return new Response("not found", { status: 404 });
    }
    return fetch("https://api.telegram.org" + pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: request.body,
    });
  },
};
