"use server";

import { refresh } from "next/cache";
import { isAdmin, signIn, signOut } from "@/lib/admin-auth";
import { deliveryProviders } from "@/lib/delivery";
import { customerNotice, serviceTitle, statusText } from "@/lib/orders/messages";
import { getOrder, updateOrder } from "@/lib/orders/store";
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

/**
 * Отправление в кабинете службы (сейчас — СДЭК) по данным заказа: пункт выдачи, тариф, места.
 * Возвращает текст для админки: что создано или почему служба не приняла заказ.
 */
export async function createShipment(_: string | null, form: FormData): Promise<string | null> {
  if (!(await isAdmin())) return "Нет доступа.";
  const order = await getOrder(String(form.get("id") ?? ""));
  if (!order || order.delivery.method !== "carrier") return "Заказ не найден.";
  const d = order.delivery;
  const provider = deliveryProviders[d.service];
  if (!provider.createOrder || !provider.ready()) return `Для ${serviceTitle(d.service)} автоматическое оформление не подключено.`;
  if (d.carrierOrderId) return "Отправление уже создано.";
  try {
    const r = await provider.createOrder(order);
    // номер отправления служба присваивает не сразу — пробуем получить, иначе кнопка «Обновить трек»
    const track = r.track ?? (await provider.getTrack?.(r.carrierOrderId).catch(() => null)) ?? undefined;
    await updateOrder(order.id, (o) => {
      if (o.delivery.method !== "carrier") return false;
      o.delivery.carrierOrderId = r.carrierOrderId;
      if (track) o.delivery.track = track;
      o.history.push({ at: new Date().toISOString(), status: o.status, note: `отправление ${serviceTitle(d.service)} создано` });
    });
    refresh();
    return track ? `Создано, трек ${track}.` : "Создано. Трек-номер появится через минуту — нажмите «Обновить трек».";
  } catch (e) {
    return `${serviceTitle(d.service)} не принял заказ: ${e instanceof Error ? e.message : e}`;
  }
}

export async function refreshTrack(_: string | null, form: FormData): Promise<string | null> {
  if (!(await isAdmin())) return "Нет доступа.";
  const order = await getOrder(String(form.get("id") ?? ""));
  if (!order || order.delivery.method !== "carrier" || !order.delivery.carrierOrderId) return "Отправление не создано.";
  const provider = deliveryProviders[order.delivery.service];
  try {
    const track = await provider.getTrack?.(order.delivery.carrierOrderId);
    if (!track) return "Служба ещё не присвоила номер — попробуйте позже.";
    await updateOrder(order.id, (o) => {
      if (o.delivery.method === "carrier") o.delivery.track = track;
    });
    refresh();
    return `Трек ${track}.`;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
