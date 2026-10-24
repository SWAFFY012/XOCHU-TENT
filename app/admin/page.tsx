import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { deliveryProviders } from "@/lib/delivery";
import { formatPrice, formatSize, formatWeight, plural } from "@/lib/format";
import { deliveryLine, serviceTitle } from "@/lib/orders/messages";
import { listOrders } from "@/lib/orders/store";
import { ORDER_STATUSES, STATUS_LABEL, type Order } from "@/lib/orders/types";
import { logout, setStatus } from "./actions";
import { LoginForm } from "./LoginForm";
import { ShipmentForm } from "./ShipmentForm";

export const metadata: Metadata = {
  title: "Заказы",
  robots: { index: false, follow: false },
};

const PAYMENT_LABEL: Record<Order["payment"]["status"], string> = {
  none: "не оплачен",
  pending: "ждём оплату",
  paid: "оплачен онлайн",
  failed: "оплата не прошла",
  refunded: "возврат",
};

const dateFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Moscow" });

/** Заказы с сайта: статусы, трек-номера. Вход по паролю из ADMIN_PASSWORD. */
export default function AdminPage() {
  return (
    <div className="wrap pt-[4.5rem] pb-16 md:pt-24">
      <h1 className="mb-6 text-[2.6rem] md:text-[4.2rem]">Заказы</h1>
      <Suspense fallback={<div className="h-60 animate-pulse rounded-3xl bg-paper" />}>
        <AdminContent />
      </Suspense>
    </div>
  );
}

async function AdminContent() {
  await connection();
  if (!adminEnabled()) return <p className="text-ink-soft">Админка выключена: задайте ADMIN_PASSWORD в переменных окружения сервера.</p>;
  if (!(await isAdmin())) return <LoginForm />;

  const orders = await listOrders();
  return (
    <div className="flex flex-col gap-4">
      <form action={logout} className="-mt-3 self-end">
        <button type="submit" className="text-sm text-ink-soft underline underline-offset-2">
          Выйти
        </button>
      </form>
      {!orders.length && <p className="text-ink-soft">Заказов пока нет.</p>}
      {orders.map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}
    </div>
  );
}

function OrderCard({ o }: { o: Order }) {
  const c = o.customer;
  const d = o.delivery;
  const provider = d.method === "carrier" ? deliveryProviders[d.service] : null;
  const places = o.items.reduce((s, i) => s + i.qty, 0);
  const canShip = d.method === "carrier" && o.kind === "order" && Boolean(provider?.createOrder && provider.ready());
  return (
    <article className="grid gap-4 rounded-3xl bg-paper p-4 md:grid-cols-[1.4fr_1fr] md:p-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-3xl font-extrabold">
            {o.kind === "order" ? "Заказ" : "Заявка"} №{o.id}
          </h2>
          <span className="text-sm text-ink-soft">{dateFmt.format(new Date(o.createdAt))}</span>
          <span className="rounded-md bg-ink/8 px-2 py-0.5 text-xs font-semibold">{STATUS_LABEL[o.status]}</span>
          {o.kind === "order" && (
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${o.payment.status === "paid" ? "bg-tarp text-paper" : "bg-strap/40"}`}>
              {PAYMENT_LABEL[o.payment.status]}
            </span>
          )}
        </div>
        <p className="break-words">
          <b className="font-semibold">{c.name}</b> · <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-oxford">{c.phone}</a>
          {c.email && <> · {c.email}</>}
          {c.telegram && <> · {c.telegram}</>}
        </p>
        <p className="text-sm text-ink-soft">{deliveryLine(o)}</p>
        {d.method === "carrier" && (d.carrierOrderId || d.track) && (
          <p className="text-sm">
            {d.track && (
              <>
                Трек: <b className="font-semibold">{d.track}</b>
              </>
            )}
            {d.carrierOrderId && (
              <span className="text-ink-soft">
                {" "}
                · заказ в кабинете {serviceTitle(d.service)}: {d.carrierOrderId}
              </span>
            )}
          </p>
        )}
        <p className="text-xs text-ink-soft">
          Вес ≈ {formatWeight(o.weight)} · {places} {plural(places, "место", "места", "мест")} · упаковка{" "}
          {[...new Set(o.items.map((i) => i.box).filter(Boolean))].join(", ") || "—"} см
        </p>
        {o.comment && <p className="text-sm">«{o.comment}»</p>}
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">
            {o.items.length} поз. · {formatPrice(o.itemsTotal)}
            {o.total !== o.itemsTotal && ` · к оплате ${formatPrice(o.total)}`}
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {o.items.map((i, n) => (
              <li key={n}>
                {i.title}, {formatSize(i.size)}, {i.color}
                {i.option !== "Стандарт" && `, ${i.option}`}
                {i.custom && " (свой размер)"} — {i.qty} × {formatPrice(i.price)}
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className="flex flex-col gap-3 self-start">
        <form action={setStatus} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={o.id} />
          <label className="text-sm font-semibold" htmlFor={`st-${o.id}`}>
            Статус
          </label>
          <select id={`st-${o.id}`} name="status" defaultValue={o.status} className="field min-h-11 py-2">
            {ORDER_STATUSES.filter((s) => (o.delivery.method === "pickup" ? s !== "handed_to_carrier" : s !== "ready_for_pickup")).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          {o.delivery.method === "carrier" && (
            <>
              <label className="text-sm font-semibold" htmlFor={`tr-${o.id}`}>
                Трек-номер
              </label>
              <input id={`tr-${o.id}`} name="track" defaultValue={o.delivery.track ?? ""} className="field min-h-11 py-2" />
            </>
          )}
          <button type="submit" className="btn btn-ink min-h-11 text-base">
            Сохранить
          </button>
          <p className="text-xs text-ink-soft">{o.delivery.method === "pickup" ? "«Готов к самовывозу»" : "«Передан в ТК»"} — покупателю уйдёт уведомление.</p>
        </form>
        {canShip && d.method === "carrier" && <ShipmentForm id={o.id} service={serviceTitle(d.service)} created={Boolean(d.carrierOrderId)} />}
      </div>
    </article>
  );
}
