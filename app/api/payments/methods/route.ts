import { NextResponse } from "next/server";
import { yandexPayConfigured, yandexSplitEnabled } from "@/lib/payments/yandexpay";

/** Какие дополнительные способы оплаты подключены на сервере: корзина показывает кнопки «Яндекс Пэй» и «Сплит» только при ключах в .env. */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ yandex: yandexPayConfigured(), split: yandexSplitEnabled() });
}
