import { connection, NextResponse } from "next/server";
import { yandexPayConfigured, yandexSplitEnabled } from "@/lib/payments/yandexpay";

/** Какие дополнительные способы оплаты подключены на сервере: корзина показывает кнопки «Яндекс Пэй» и «Сплит» только при ключах в .env. */
export async function GET() {
  // без этого Next отрисовал бы ответ при сборке, когда ключей Яндекса ещё нет
  await connection();
  return NextResponse.json({ yandex: yandexPayConfigured(), split: yandexSplitEnabled() });
}
