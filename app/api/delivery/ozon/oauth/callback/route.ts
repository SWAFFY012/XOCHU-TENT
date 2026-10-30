import type { NextRequest } from "next/server";
import { ozonAuthorize } from "@/lib/delivery/ozon";

/** Сюда Ozon возвращает продавца с кодом авторизации. Ответ — простая страница для продавца, всегда 200. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const state = req.cookies.get("ozon_oauth_state")?.value;
  let title = "Ozon подключён";
  let text = "Сайт получил доступ к кабинету Ozon. Окно можно закрыть.";
  if (!q.get("code") || !state || q.get("state") !== state) {
    title = "Не получилось";
    text = q.get("error") ? `Ozon ответил: ${q.get("error")}. ${q.get("error_description") ?? ""}` : "Ссылка устарела. Откройте ссылку подключения ещё раз.";
  } else {
    try {
      const saved = await ozonAuthorize(q.get("code")!);
      text += ` Права: ${saved.scope.join(", ") || "—"}.`;
    } catch (e) {
      title = "Не получилось";
      text = e instanceof Error ? e.message.slice(0, 400) : String(e);
    }
  }
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><body style="font:18px/1.5 system-ui;max-width:560px;margin:15vh auto;padding:0 16px"><h1>${esc(title)}</h1><p>${esc(text)}</p></body>`;
  const res = new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  return res;
}
