import { randomBytes } from "node:crypto";
import { NextResponse, connection } from "next/server";
import { OZON_SCOPE_ALIASES, ozon, ozonAuthorizeUrl } from "@/lib/delivery/ozon";

/**
 * Продавец открывает эту ссылку, войдя в seller.ozon.ru, и разрешает сайту доступ к кабинету.
 * state в cookie защищает обратный URL от подложного кода.
 * ?scopes=logistics,product — запросить только часть прав; ?scopes=none — без списка прав (по умолчанию все права приложения).
 */
export async function GET(req: Request) {
  // на каждый запрос свой state: не собирать статически
  await connection();
  if (!ozon.ready()) return NextResponse.json({ ok: false, error: "Не заданы OZON_APP_CLIENT_ID и OZON_APP_CLIENT_SECRET" });
  const state = randomBytes(16).toString("hex");
  const only = new URL(req.url).searchParams.get("scopes");
  const scopes = only === "none" ? null : only ? only.split(",").map((x) => OZON_SCOPE_ALIASES[x.trim()]).filter(Boolean) : undefined;
  const res = NextResponse.redirect(ozonAuthorizeUrl(state, scopes));
  res.cookies.set("ozon_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/delivery/ozon/oauth" });
  return res;
}
