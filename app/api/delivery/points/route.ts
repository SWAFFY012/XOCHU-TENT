import { NextResponse } from "next/server";
import { deliveryProviders, toParcels } from "@/lib/delivery";
import { CheckoutError, resolveItems, type CartLine } from "@/lib/orders/build";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { deliveryServices } from "@/lib/site";

const limited = rateLimit(40, 10 * 60_000);

/** Пункты выдачи службы в городе, куда пройдёт груз из корзины. */
export async function POST(req: Request) {
  if (limited(clientIp(req))) return NextResponse.json({ error: "Слишком много запросов. Попробуйте через несколько минут." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { service?: string; city?: string; items?: CartLine[] };
  const service = deliveryServices.find((s) => s.id === body.service);
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : "";
  const provider = service && deliveryProviders[service.id];
  if (!provider || city.length < 2) return NextResponse.json({ error: "Укажите город и службу." }, { status: 400 });
  // без ключей службы пунктов нет — покупатель пишет адрес пункта текстом
  if (!provider.ready() || !provider.points) return NextResponse.json({ points: [] });
  try {
    const points = await provider.points({ city, parcels: toParcels(resolveItems(body.items)) });
    return NextResponse.json({ points: points.slice(0, 500) });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(`[delivery] ${service.id} points:`, e instanceof Error ? e.message : e);
    return NextResponse.json({ points: [], error: "Не удалось загрузить пункты выдачи — укажите адрес пункта вручную." });
  }
}
