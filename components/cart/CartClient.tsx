"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, CreditCard, Loader2, Minus, Navigation, Plus, Send, Trash2 } from "lucide-react";
import { ProductArt } from "@/components/ProductArt";
import { cartTotal, cartWeight, useCart, useHydrated } from "@/lib/cart";
import { formatArea, formatPrice, formatSize, formatWeight, plural } from "@/lib/format";
import { deliveryServices, routeUrl, site, type DeliveryServiceId } from "@/lib/site";

type Intent = "pay" | "lead";
type Status =
  | { state: "idle" }
  | { state: "sending"; intent: Intent }
  | { state: "done"; id: string; intent: Intent }
  | { state: "error"; message: string };
type Errors = Partial<Record<"name" | "phone" | "telegram" | "city" | "consent", string>>;

const PHONE_RE = /^\+?[\d\s\-()]{10,18}$/;
// Ник Telegram: @username (5–32 символа: латиница, цифры, _) или ссылка t.me/username
const TG_RE = /^(?:@|(?:https?:\/\/)?t\.me\/)?[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export function CartClient() {
  const hydrated = useHydrated();
  const { items, setQty, remove, clear } = useCart();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [errors, setErrors] = useState<Errors>({});
  const [contact, setContact] = useState("phone");
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [service, setService] = useState<DeliveryServiceId>("cdek");
  const total = cartTotal(items);
  const weight = cartWeight(items);
  const hasCustom = items.some((i) => i.custom);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Какой кнопкой отправили форму: «Оплатить» или «Отправить заявку»
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent: Intent = submitter?.value === "pay" ? "pay" : "lead";
    const fd = new FormData(e.currentTarget);
    const form = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      comment: String(fd.get("comment") ?? "").trim(),
      contact,
      telegram: contact === "telegram" ? String(fd.get("telegram") ?? "").trim() : "",
      delivery,
      service: delivery === "delivery" ? service : "",
      intent,
      website: String(fd.get("website") ?? ""), // ловушка для ботов
      consent: fd.get("consent") === "on",
    };
    const errs: Errors = {};
    if (form.name.length < 2) errs.name = "Укажите имя, чтобы менеджер знал, как к вам обращаться.";
    if (!PHONE_RE.test(form.phone)) errs.phone = "Укажите телефон в формате +7 900 000-00-00.";
    if (contact === "telegram" && !TG_RE.test(form.telegram)) errs.telegram = "Укажите ник в Telegram, например @hochutent.";
    if (delivery === "delivery" && form.city.length < 2) errs.city = "Укажите город доставки — посчитаем стоимость.";
    if (!form.consent) errs.consent = "Без согласия на обработку данных мы не сможем связаться с вами.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      return;
    }

    setStatus({ state: "sending", intent });
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map(({ slug, option, color, size, qty, custom }) => ({ slug, option, color, size, qty, custom })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Заявка не отправилась.");
      clear();
      setStatus({ state: "done", id: data.id, intent });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Заявка не отправилась." });
    }
  }

  if (status.state === "done") {
    return (
      <motion.div
        initial={{ clipPath: "inset(0 50% 0 50% round 32px)" }}
        animate={{ clipPath: "inset(0 0% 0 0% round 32px)" }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        className="rounded-[32px] bg-tarp p-8 text-paper md:p-14"
      >
        <CheckCircle2 className="size-14 text-strap" aria-hidden />
        <h2 className="mt-5 text-[3.2rem] md:text-7xl">{status.intent === "pay" ? `Заказ №${status.id} оформлен` : `Заявка №${status.id} принята`}</h2>
        <p className="mt-4 max-w-[52ch] text-lg text-paper/80">
          {status.intent === "pay"
            ? `Онлайн-оплата на сайте скоро заработает. Пока менеджер проверит заказ и пришлёт ссылку на оплату — обычно за ${site.responseTime}.`
            : `Менеджер свяжется с вами в течение ${site.responseTime} в рабочее время.`}
        </p>
        <Link href="/catalog" className="btn btn-strap mt-8">
          Вернуться в каталог
        </Link>
      </motion.div>
    );
  }

  if (!hydrated) return <div className="h-80 animate-pulse rounded-3xl bg-paper" />;

  if (!items.length) {
    return (
      <div className="rounded-[32px] border-2 border-dashed border-line p-8 text-center md:p-14">
        <p className="font-display text-5xl font-extrabold">В заявке пока пусто</p>
        <p className="mx-auto mt-3 max-w-[44ch] text-ink-soft">
          Выберите изделие в каталоге и нажмите «Добавить в заявку». Или позвоните — оформим по телефону.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/catalog" className="btn btn-strap">
            Открыть каталог
          </Link>
          <a href={site.phoneHref} className="btn btn-ghost">
            {site.phone}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-8">
      <ul className="order-2 flex flex-col gap-3 lg:order-none">
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <motion.li
              key={i.key}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
              className="grid grid-cols-[5.5rem_1fr] gap-4 rounded-3xl bg-paper p-3 sm:grid-cols-[7rem_1fr] sm:p-4"
            >
              <Link href={`/catalog/${i.slug}`} className="aspect-[3/4] overflow-hidden rounded-2xl bg-[#e1e6dd]">
                {i.image ? (
                  <Image src={i.image} alt="" width={120} height={160} className="h-full w-full object-cover" />
                ) : (
                  <ProductArt kind={i.kind} color={i.color} className="h-full w-full p-1.5" />
                )}
              </Link>
              <div className="flex min-w-0 flex-col gap-1">
                <Link href={`/catalog/${i.slug}`} className="font-semibold leading-snug hover:text-oxford">
                  {i.title}
                </Link>
                <p className="text-sm text-ink-soft">
                  {formatSize(i.size)}, {formatArea(i.area)} · {i.color}
                  {i.option !== "Стандарт" && ` · ${i.option}`}
                </p>
                {i.custom && <span className="w-fit rounded-md bg-strap/30 px-1.5 py-0.5 text-xs font-semibold">Свой размер, цена ориентировочная</span>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center rounded-full bg-ink/6">
                    <button type="button" className="grid size-10 place-items-center" onClick={() => setQty(i.key, i.qty - 1)} aria-label="Меньше">
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center font-semibold tabular-nums">{i.qty}</span>
                    <button type="button" className="grid size-10 place-items-center" onClick={() => setQty(i.key, i.qty + 1)} aria-label="Больше">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <span className="font-display text-3xl font-extrabold">{formatPrice(i.price * i.qty)}</span>
                  <button type="button" onClick={() => remove(i.key)} className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-danger/10 hover:text-danger" aria-label={`Удалить ${i.title}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* форма компактная: целиком помещается в экран, на телефоне — над списком товаров */}
      <form onSubmit={onSubmit} noValidate className="order-1 flex flex-col gap-2.5 rounded-[28px] bg-paper p-4 sm:gap-3 md:p-6 lg:sticky lg:top-24 lg:order-none">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-ink-soft">
            {items.length} {plural(items.length, "позиция", "позиции", "позиций")}
          </span>
          <span className="font-display text-5xl leading-none font-extrabold">{formatPrice(total)}</span>
        </div>
        <p className="-mt-1 text-sm text-ink-soft">
          {weight > 0 && <>Вес заказа ≈ {formatWeight(weight)} · </>}
          {delivery === "pickup" ? "самовывоз бесплатно" : "доставка по тарифу службы"}
        </p>
        {hasCustom && <p className="text-sm text-ink-soft">В заявке есть нестандартные размеры: итог ориентировочный.</p>}
        <div className="seam text-line" />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="name" label="Имя" error={errors.name}>
            <input id="f-name" name="name" autoComplete="name" className="field min-h-11 py-2" aria-invalid={!!errors.name} aria-describedby="e-name" />
          </Field>
          <Field id="phone" label="Телефон" error={errors.phone}>
            <input id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 900 000-00-00" className="field min-h-11 py-2" aria-invalid={!!errors.phone} aria-describedby="e-phone" />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Как связаться</legend>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {[
              ["phone", "Звонок"],
              ["telegram", "Telegram"],
              ["whatsapp", "WhatsApp"],
            ].map(([v, l]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-line has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oxford">
                <input type="radio" name="contact" value={v} checked={contact === v} onChange={() => setContact(v)} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        {/* при выборе Telegram — поле для ника */}
        <AnimatePresence initial={false}>
          {contact === "telegram" && (
            <motion.div
              key="tg"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden"
            >
              <Field id="telegram" label="Ник в Telegram" hint="напишем вам туда" error={errors.telegram}>
                <input
                  id="f-telegram"
                  name="telegram"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="@username"
                  className="field min-h-11 py-2"
                  aria-invalid={!!errors.telegram}
                  aria-describedby="e-telegram"
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        {/* получение: самовывоз из Янино-1 или доставка службой */}
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Получение</legend>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(
              [
                ["pickup", "Самовывоз"],
                ["delivery", "Доставка"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-line font-semibold has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oxford">
                <input type="radio" name="delivery" value={v} checked={delivery === v} onChange={() => setDelivery(v)} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        {delivery === "pickup" ? (
          <p className="flex items-start justify-between gap-3 rounded-xl bg-ink/5 px-3 py-2.5 text-sm">
            <span>
              <b className="font-semibold">Бесплатно.</b> {site.addressShort}, {site.region}
            </span>
            <a href={routeUrl} target="_blank" rel="noopener" className="flex shrink-0 items-center gap-1 font-semibold text-oxford underline-offset-2 hover:underline">
              <Navigation className="size-3.5" aria-hidden /> Маршрут
            </a>
          </p>
        ) : (
          <div role="radiogroup" aria-label="Служба доставки" className="flex flex-wrap gap-1 text-[0.8rem] sm:text-[0.82rem]">
            {deliveryServices.map((d) => (
              <label key={d.id} title={d.note} className="flex min-h-10 grow cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-line px-2 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oxford">
                <input type="radio" name="service" value={d.id} checked={service === d.id} onChange={() => setService(d.id)} className="sr-only" />
                {d.title}
              </label>
            ))}
          </div>
        )}
        <div className={delivery === "delivery" ? "grid gap-3 sm:grid-cols-[1fr_1.4fr]" : "grid gap-3"}>
          {delivery === "delivery" && (
            <Field id="city" label="Город доставки" error={errors.city}>
              <input id="f-city" name="city" autoComplete="address-level2" placeholder="Например, Казань" className="field min-h-11 py-2" aria-invalid={!!errors.city} aria-describedby="e-city" />
            </Field>
          )}
          <Field id="comment" label="Комментарий">
            <input id="f-comment" name="comment" maxLength={1000} placeholder={delivery === "delivery" ? "адрес, ПВЗ, сроки" : "когда удобно забрать"} className="field min-h-11 py-2" />
          </Field>
        </div>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        <label className="flex items-start gap-3 text-sm">
          <input id="f-consent" type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-[var(--color-tarp)]" aria-invalid={!!errors.consent} aria-describedby="e-consent" />
          <span>
            Согласен на обработку персональных данных по{" "}
            <Link href="/privacy" className="text-oxford underline underline-offset-2" target="_blank">
              политике конфиденциальности
            </Link>
          </span>
        </label>
        {errors.consent && (
          <p id="e-consent" className="-mt-2 text-sm text-danger">
            {errors.consent}
          </p>
        )}

        {status.state === "error" && (
          <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger" role="alert">
            {status.message} Позвоните нам: {site.phone}.
          </p>
        )}

        {/* «Оплатить» — для размеров из каталога; свой размер сначала подтверждает менеджер */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            name="intent"
            value="pay"
            disabled={status.state === "sending" || hasCustom}
            className="btn btn-strap px-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.state === "sending" && status.intent === "pay" ? <Loader2 className="size-5 animate-spin" /> : <CreditCard className="size-5" aria-hidden />}
            Оплатить
          </button>
          <button type="submit" name="intent" value="lead" disabled={status.state === "sending"} className="btn btn-ghost px-3 text-base disabled:opacity-60">
            {status.state === "sending" && status.intent === "lead" ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" aria-hidden />}
            <span className="sm:hidden">Заявка</span>
            <span className="hidden sm:inline">Отправить заявку</span>
          </button>
        </div>
        {hasCustom && <p className="-mt-1 text-xs text-ink-soft">Свой размер оплачивается после подтверждения цены менеджером — отправьте заявку.</p>}
      </form>
    </div>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${id}`} className="flex items-baseline justify-between text-sm font-semibold">
        {label}
        {hint && <span className="font-normal text-ink-soft">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`e-${id}`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
