import { NextResponse } from "next/server";
import { quoteDelivery, toParcels } from "@/lib/delivery";
import { CheckoutError, resolveItems, type CartLine } from "@/lib/orders/build";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const limited = rateLimit(40, 10 * 60_000);
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

/** Стоимость и сроки доставки всеми службами для корзины и города. */
export async function POST(req: Request) {
  if (limited(clientIp(req))) return NextResponse.json({ error: "Слишком много расчётов. Попробуйте через несколько минут." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { city?: string; address?: string; items?: CartLine[] };
  const city = clip(body.city, 80);
  if (city.length < 2) return NextResponse.json({ error: "Укажите город." }, { status: 400 });
  try {
    const items = resolveItems(body.items);
    const parcels = toParcels(items);
    const options = await quoteDelivery({
      city,
      address: clip(body.address, 200),
      parcels,
      value: items.reduce((s, i) => s + i.price * i.qty, 0),
    });
    return NextResponse.json({ options, places: parcels.length });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
