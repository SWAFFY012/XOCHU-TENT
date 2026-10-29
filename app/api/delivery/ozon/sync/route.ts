import { NextResponse } from "next/server";
import { ozon, ozonSnapshot } from "@/lib/delivery/ozon";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const limited = rateLimit(3, 10 * 60_000);

/**
 * Проверка подключения Ozon: получает токен и выгружает товары в .data/ozon-products.json
 * для сопоставления с каталогом. Наружу — только права токена и число товаров.
 * Ошибки — со статусом 200: ответы 502/503 Хостленд подменяет своей страницей «Loading».
 */
export async function POST(req: Request) {
  if (limited(clientIp(req))) return NextResponse.json({ error: "Слишком часто. Попробуйте через 10 минут." }, { status: 429 });
  if (!ozon.ready()) return NextResponse.json({ ok: false, error: "Не заданы OZON_APP_CLIENT_ID и OZON_APP_CLIENT_SECRET" });
  try {
    return NextResponse.json({ ok: true, ...(await ozonSnapshot()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 500) : String(e) });
  }
}
