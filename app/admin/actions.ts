"use server";

import { refresh } from "next/cache";
import { isAdmin, signIn, signOut } from "@/lib/admin-auth";
import { customerNotice, statusText } from "@/lib/orders/messages";
import { updateOrder } from "@/lib/orders/store";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";
import { sendEmail } from "@/lib/notify/email";
import { esc, notifyManager } from "@/lib/notify/telegram";

// Перебор пароля: после 5 неудач подряд — пауза на 10 минут (в памяти процесса)
let fails = { n: 0, until: 0 };

export async function login(_: string | null, form: FormData): Promise<string | null> {
  if (Date.now() < fails.until) return "Слишком много попыток. Подождите 10 минут.";
  if (await signIn(String(form.get("password") ?? ""))) {
    fails = { n: 0, until: 0 };
    refresh();
    return null;
  }
  fails.n += 1;
  if (fails.n >= 5) fails = { n: 0, until: Date.now() + 10 * 60_000 };
  return "Неверный пароль.";
}

export async function logout() {
  await signOut();
  refresh();
}

/**
 * Смена статуса и трек-номера. При «готов к самовывозу» и «передан в ТК» покупателю уходит письмо;
 * если почта не настроена или письмо не ушло, менеджер получает текст в Telegram, чтобы переслать вручную.
 */
export async function setStatus(form: FormData) {
  if (!(await isAdmin())) throw new Error("Нет доступа");
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as OrderStatus;
  const track = String(form.get("track") ?? "").trim().slice(0, 60);
  if (!ORDER_STATUSES.includes(status)) throw new Error("Неизвестный статус");

  let changed = false;
  const order = await updateOrder(id, (o) => {
    if (o.delivery.method === "carrier" && track && track !== o.delivery.track) {
      o.delivery.track = track;
      changed = true;
    }
    if (o.status !== status) {
      o.status = status;
      o.history.push({ at: new Date().toISOString(), status, note: track ? `трек ${track}` : undefined });
      changed = true;
    }
    return changed;
  });
  if (!order || !changed) return refresh();

  const notice = customerNotice(order);
  let sent = false;
  if (notice && order.customer.email) sent = await sendEmail(order.customer.email, notice.subject, notice.text);
  await notifyManager(
    statusText(order, track ? `Трек: ${track}` : undefined) +
      (notice
        ? sent
          ? `\n✉️ Покупателю отправлено письмо на ${esc(order.customer.email)}`
          : `\n⚠️ Письмо покупателю не ушло — перешлите вручную (${esc(order.customer.phone)}):\n\n${esc(notice.text)}`
        : ""),
  );
  refresh();
}
