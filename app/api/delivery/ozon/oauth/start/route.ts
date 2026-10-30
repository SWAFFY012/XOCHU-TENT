import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ozon, ozonAuthorizeUrl } from "@/lib/delivery/ozon";

/**
 * Продавец открывает эту ссылку, войдя в seller.ozon.ru, и разрешает сайту доступ к кабинету.
 * state в cookie защищает обратный URL от подложного кода.
 */
export async function GET() {
  if (!ozon.ready()) return NextResponse.json({ ok: false, error: "Не заданы OZON_APP_CLIENT_ID и OZON_APP_CLIENT_SECRET" });
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(ozonAuthorizeUrl(state));
  res.cookies.set("ozon_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/delivery/ozon/oauth" });
  return res;
}
