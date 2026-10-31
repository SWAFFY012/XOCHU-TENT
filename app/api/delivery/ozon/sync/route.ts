import { NextResponse } from "next/server";
import { ozon, ozonSnapshot } from "@/lib/delivery/ozon";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const limited = rateLimit(10, 10 * 60_000);

/**
 * Проверка подключения Ozon: получает токен и выгружает товары в .data/ozon-products.json
 * для сопоставления с каталогом. Наружу — только права токена и число товаров.
 * С телом {city, items:[{slug, option, color, size, qty}]} — прогоняет расчёт доставки Ozon и показывает ошибку Ozon,
 * если расчёт не вышел (в корзине она скрыта за «рассчитает менеджер»).
 * Ошибки — со статусом 200: ответы 502/503 Хостленд подменяет своей страницей «Loading».
 */
export async function POST(req: Request) {
  if (limited(clientIp(req))) return NextResponse.json({ error: "Слишком часто. Попробуйте через 10 минут." }, { status: 429 });
  if (!ozon.ready()) return NextResponse.json({ ok: false, error: "Не заданы OZON_APP_CLIENT_ID и OZON_APP_CLIENT_SECRET" });
  const body = (await req.json().catch(() => ({}))) as { city?: string; items?: { slug: string; option: string; color: string; size: string; qty: number }[] };
  try {
    if (body.city && body.items?.length) {
      const items = body.items.slice(0, 5).map((i) => ({ slug: String(i.slug), option: String(i.option), color: String(i.color), size: String(i.size), qty: Math.max(1, Number(i.qty) || 1), custom: false }));
      return NextResponse.json({ ok: true, calc: await ozon.calculate({ city: String(body.city).slice(0, 80), address: "", parcels: [], value: 0, items }) });
    }
    return NextResponse.json({ ok: true, ...(await ozonSnapshot()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 500) : String(e) });
  }
}
