"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { ProductArt } from "@/components/ProductArt";
import { cartTotal, useCart, useHydrated } from "@/lib/cart";
import { formatArea, formatPrice, formatSize, plural } from "@/lib/format";
import { site } from "@/lib/site";

type Status = { state: "idle" } | { state: "sending" } | { state: "done"; id: string } | { state: "error"; message: string };
type Errors = Partial<Record<"name" | "phone" | "consent", string>>;

const PHONE_RE = /^\+?[\d\s\-()]{10,18}$/;

export function CartClient() {
  const hydrated = useHydrated();
  const { items, setQty, remove, clear } = useCart();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [errors, setErrors] = useState<Errors>({});
  const total = cartTotal(items);
  const hasCustom = items.some((i) => i.custom);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      comment: String(fd.get("comment") ?? "").trim(),
      contact: String(fd.get("contact") ?? "phone"),
      website: String(fd.get("website") ?? ""), // ловушка для ботов
      consent: fd.get("consent") === "on",
    };
    const errs: Errors = {};
    if (form.name.length < 2) errs.name = "Укажите имя, чтобы менеджер знал, как к вам обращаться.";
    if (!PHONE_RE.test(form.phone)) errs.phone = "Укажите телефон в формате +7 900 000-00-00.";
    if (!form.consent) errs.consent = "Без согласия на обработку данных мы не сможем связаться с вами.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      return;
    }

    setStatus({ state: "sending" });
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
      setStatus({ state: "done", id: data.id });
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
        <h2 className="mt-5 text-[3.2rem] md:text-7xl">Заявка №{status.id} принята</h2>
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
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <ul className="flex flex-col gap-3">
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

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-[28px] bg-paper p-5 md:p-7 lg:sticky lg:top-24">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-ink-soft">
            {items.length} {plural(items.length, "позиция", "позиции", "позиций")}
          </span>
          <span className="font-display text-5xl leading-none font-extrabold">{formatPrice(total)}</span>
        </div>
        {hasCustom && <p className="text-sm text-ink-soft">В заявке есть нестандартные размеры: итог ориентировочный.</p>}
        <div className="seam text-line" />

        <Field id="name" label="Имя" error={errors.name}>
          <input id="f-name" name="name" autoComplete="name" className="field" aria-invalid={!!errors.name} aria-describedby="e-name" />
        </Field>
        <Field id="phone" label="Телефон" error={errors.phone}>
          <input id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 900 000-00-00" className="field" aria-invalid={!!errors.phone} aria-describedby="e-phone" />
        </Field>
        <Field id="city" label="Город доставки" hint="Необязательно">
          <input id="f-city" name="city" autoComplete="address-level2" className="field" />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Как связаться</legend>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {[
              ["phone", "Звонок"],
              ["telegram", "Telegram"],
              ["whatsapp", "WhatsApp"],
            ].map(([v, l], idx) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-line has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper">
                <input type="radio" name="contact" value={v} defaultChecked={idx === 0} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="comment" label="Комментарий" hint="Крепёж, сроки, ссылка на фото объекта">
          <textarea id="f-comment" name="comment" rows={3} maxLength={1000} className="field resize-y" />
        </Field>
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

        <button type="submit" disabled={status.state === "sending"} className="btn btn-strap text-base disabled:opacity-60">
          {status.state === "sending" ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Отправляем
            </>
          ) : (
            "Отправить заявку"
          )}
        </button>
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
