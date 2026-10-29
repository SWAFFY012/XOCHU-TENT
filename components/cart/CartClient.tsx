"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, Loader2, MapPin, Minus, Navigation, Plus, Send, Trash2 } from "lucide-react";
import { DeliveryPicker } from "@/components/cart/DeliveryPicker";
import { ShopMap } from "@/components/ShopMap";
import { ProductArt } from "@/components/ProductArt";
import { PaymentBadges } from "@/components/PaymentBadges";
import { cartTotal, cartWeight, useCart, useHydrated } from "@/lib/cart";
import { formatArea, formatPrice, formatSize, formatWeight } from "@/lib/format";
import type { DeliveryOption } from "@/lib/delivery/types";
import { deliveryPayment, isQuoteOnly, paymentsEnabled, routeUrl, site } from "@/lib/site";

type Intent = "pay" | "lead";
type Status = { state: "idle" } | { state: "sending"; intent: Intent } | { state: "error"; message: string };
type Field = "name" | "phone" | "email" | "telegram" | "service" | "city" | "point" | "address" | "consent" | "offer";
type Errors = Partial<Record<Field, string>>;

// Ник Telegram: @username (5–32 символа: латиница, цифры, _) или ссылка t.me/username
const TG_RE = /^(?:@|(?:https?:\/\/)?t\.me\/)?[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Маска телефона: что бы ни ввели, показываем «+7 (900) 123-45-67». */
function maskPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d[0] === "8") d = "7" + d.slice(1);
  if (d[0] !== "7") d = "7" + d;
  d = d.slice(0, 11);
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  let s = "+7";
  if (p[0]) s += ` (${p[0]}`;
  if (p[0].length === 3) s += ")";
  if (p[1]) s += ` ${p[1]}`;
  if (p[2]) s += `-${p[2]}`;
  if (p[3]) s += `-${p[3]}`;
  return s;
}

export function CartClient() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { items, setQty, remove, clear } = useCart();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [errors, setErrors] = useState<Errors>({});
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("phone");
  const [delivery, setDelivery] = useState<"pickup" | "carrier">("pickup");
  const [option, setOption] = useState<DeliveryOption | null>(null);
  const goods = cartTotal(items);
  // доставку добавляем к оплате, только если она оплачивается вместе с заказом и цена не предварительная
  const shipping = delivery === "carrier" && deliveryPayment === "with_order" && option?.cost && !option.preliminary ? option.cost : 0;
  const total = goods + shipping;
  const weight = cartWeight(items);
  const count = items.reduce((s, i) => s + i.qty, 0);
  // окна и часть своих размеров — по заявке; старые позиции в корзине без флага тоже проверяем по товару
  const needsQuote = items.some((i) => i.quote || isQuoteOnly(i.slug, i.custom));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Какой кнопкой отправили: «Оформить и оплатить» или «Оставить заявку»
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent: Intent = submitter?.value === "lead" ? "lead" : "pay";
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const form = {
      intent,
      name: get("name"),
      phone,
      email: get("email"),
      contact,
      telegram: contact === "telegram" ? get("telegram") : "",
      comment: get("comment"),
      delivery,
      ...(delivery === "carrier"
        ? {
            service: get("service"),
            mode: get("mode"),
            city: get("city"),
            address: get("address"),
            pointId: get("pointId"),
            pointName: get("pointName"),
            pointAddress: get("pointAddress"),
          }
        : {}),
      consent: fd.get("consent") === "on",
      offer: fd.get("offer") === "on",
      website: get("website"), // ловушка для ботов
    };

    const pay = intent === "pay";
    const errs: Errors = {};
    if (pay ? !/\S{2,}\s+\S{2,}/.test(form.name) : form.name.length < 2) errs.name = pay ? "Укажите фамилию и имя получателя." : "Укажите имя.";
    if (phone.replace(/\D/g, "").length !== 11) errs.phone = "Введите телефон полностью: +7 (900) 000-00-00.";
    if (form.email ? !EMAIL_RE.test(form.email) : pay) errs.email = "Укажите email — на него придёт электронный чек.";
    if (contact === "telegram" && !TG_RE.test(form.telegram)) errs.telegram = "Укажите ник в Telegram, например @username.";
    if (delivery === "carrier") {
      if (form.city!.length < 2) errs.city = "Укажите город.";
      if (!form.service) errs.service = "Выберите службу доставки.";
      else if (get("needPoint") && !form.pointId) errs.point = "Выберите пункт выдачи на карте или в списке.";
      else if (!get("needPoint") && form.address!.length < 3) errs.address = form.mode === "door" ? "Укажите улицу и дом." : "Укажите адрес пункта выдачи.";
    }
    if (!form.consent) errs.consent = "Нужно согласие на обработку персональных данных.";
    if (pay && !form.offer) errs.offer = "Примите условия оферты, чтобы оформить заказ.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      return;
    }

    setStatus({ state: "sending", intent });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map(({ slug, option, color, size, qty, custom }) => ({ slug, option, color, size, qty, custom })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Заказ не отправился.");
      clear();
      if (data.paymentUrl) window.location.assign(data.paymentUrl);
      else router.push(`/order/success?order=${encodeURIComponent(data.id)}`);
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Заказ не отправился." });
    }
  }

  if (!hydrated) return <div className="h-80 animate-pulse rounded-3xl bg-paper" />;

  if (!items.length) {
    return (
      <div className="rounded-[32px] border-2 border-dashed border-line p-8 text-center md:p-14">
        <p className="font-display text-5xl font-extrabold">Корзина пуста</p>
        <p className="mx-auto mt-3 max-w-[44ch] text-ink-soft">Выберите изделие в каталоге и нажмите «В корзину». Или позвоните — оформим по телефону.</p>
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

  const sending = status.state === "sending";

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        {/* товары */}
        <ul className="flex flex-col gap-3" aria-label="Товары в корзине">
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
                  {i.custom && (
                    <span className="w-fit rounded-md bg-strap/30 px-1.5 py-0.5 text-xs font-semibold">
                      {i.quote ? "Свой размер, цену подтвердит менеджер" : "Свой размер"}
                    </span>
                  )}
                  {!i.custom && isQuoteOnly(i.slug, false) && (
                    <span className="w-fit rounded-md bg-strap/30 px-1.5 py-0.5 text-xs font-semibold">По заявке, цену подтвердит менеджер</span>
                  )}
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
                    <button
                      type="button"
                      onClick={() => remove(i.key)}
                      className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-danger/10 hover:text-danger"
                      aria-label={`Удалить ${i.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* получатель */}
        <section className="flex flex-col gap-3 rounded-[28px] bg-paper p-4 md:p-6" aria-labelledby="h-recipient">
          <h2 id="h-recipient" className="text-[1.9rem] leading-none">
            Получатель
          </h2>
          <FormField id="name" label="Фамилия и имя" error={errors.name}>
            <input id="f-name" name="name" autoComplete="name" placeholder="Иванов Иван" className="field min-h-11 py-2" aria-invalid={!!errors.name} aria-describedby="e-name" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="phone" label="Телефон" error={errors.phone}>
              <input
                id="f-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (900) 000-00-00"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                className="field min-h-11 py-2"
                aria-invalid={!!errors.phone}
                aria-describedby="e-phone"
              />
            </FormField>
            <FormField id="email" label="Email" hint="для электронного чека" error={errors.email}>
              <input
                id="f-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="mail@example.ru"
                className="field min-h-11 py-2"
                aria-invalid={!!errors.email}
                aria-describedby="e-email"
              />
            </FormField>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Как с вами связаться</legend>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {[
                ["phone", "Звонок"],
                ["telegram", "Telegram"],
                ["whatsapp", "WhatsApp"],
              ].map(([v, l]) => (
                <Choice key={v} name="contact" value={v} checked={contact === v} onChange={() => setContact(v)}>
                  {l}
                </Choice>
              ))}
            </div>
          </fieldset>
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
                <FormField id="telegram" label="Ник в Telegram" hint="напишем вам туда" error={errors.telegram}>
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
                </FormField>
              </motion.div>
            )}
          </AnimatePresence>
          <FormField id="comment" label="Комментарий">
            <textarea id="f-comment" name="comment" rows={2} maxLength={1000} placeholder="Пожелания по заказу" className="field min-h-11 resize-y py-2" />
          </FormField>
        </section>

        {/* получение */}
        <section className="flex flex-col gap-3 rounded-[28px] bg-paper p-4 md:p-6" aria-labelledby="h-delivery">
          <h2 id="h-delivery" className="text-[1.9rem] leading-none">
            Получение
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm" role="radiogroup" aria-label="Способ получения">
            <Choice name="delivery" value="pickup" checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} bold>
              Самовывоз
            </Choice>
            <Choice name="delivery" value="carrier" checked={delivery === "carrier"} onChange={() => setDelivery("carrier")} bold>
              Доставка
            </Choice>
          </div>

          {delivery === "pickup" ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-5 shrink-0 text-tarp" aria-hidden />
                <span>
                  <b className="font-semibold">Бесплатно.</b> {site.address}. {site.hours}.
                </span>
              </p>
              <ShopMap className="h-56 md:h-64" />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="max-w-[46ch] text-ink-soft">
                  Сообщим о готовности по SMS, в Telegram или на почту — срок до {site.pickupReadyDays} рабочих дней.
                </p>
                <a href={routeUrl} target="_blank" rel="noopener" className="flex items-center gap-1 font-semibold text-oxford underline-offset-2 hover:underline">
                  <Navigation className="size-3.5" aria-hidden /> Маршрут
                </a>
              </div>
            </div>
          ) : (
            <DeliveryPicker
              lines={items.map(({ slug, option, color, size, qty, custom }) => ({ slug, option, color, size, qty, custom }))}
              errors={errors}
              onOption={setOption}
            />
          )}
        </section>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      </div>

      {/* итог и оплата */}
      <div className="flex flex-col gap-3 rounded-[28px] bg-paper p-4 md:p-6 lg:sticky lg:top-24">
        <h2 className="text-[1.9rem] leading-none">Ваш заказ</h2>
        <dl className="flex flex-col gap-2 text-[0.95rem]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">
              Товары, {count} шт.
            </dt>
            <dd className="font-semibold tabular-nums">{formatPrice(goods)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Доставка</dt>
            <dd className="text-right font-semibold">
              {delivery === "pickup" ? "бесплатно" : option?.cost ? `${option.preliminary ? "≈ " : ""}${formatPrice(option.cost)}` : "рассчитает менеджер"}
              {delivery === "carrier" && deliveryPayment === "on_receipt" && <span className="block text-xs font-normal text-ink-soft">оплата при получении</span>}
            </dd>
          </div>
          {weight > 0 && (
            <div className="flex justify-between gap-3 text-sm text-ink-soft">
              <dt>Вес заказа</dt>
              <dd>≈ {formatWeight(weight)}</dd>
            </div>
          )}
        </dl>
        <div className="seam text-line" />
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{needsQuote ? "Предварительно" : "Итого к оплате"}</span>
          <span className="font-display text-5xl leading-none font-extrabold">{formatPrice(total)}</span>
        </div>

        <Check id="consent" error={errors.consent}>
          Согласен на обработку персональных данных по{" "}
          <Link href="/privacy" className="text-oxford underline underline-offset-2" target="_blank">
            политике конфиденциальности
          </Link>
        </Check>
        {!needsQuote && (
          <Check id="offer" error={errors.offer}>
            Принимаю условия{" "}
            <Link href="/oferta" className="text-oxford underline underline-offset-2" target="_blank">
              публичной оферты
            </Link>{" "}
            и{" "}
            <Link href="/returns" className="text-oxford underline underline-offset-2" target="_blank">
              возврата
            </Link>
          </Check>
        )}

        {status.state === "error" && (
          <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger" role="alert">
            {status.message} Позвоните нам: {site.phone}.
          </p>
        )}

        {needsQuote ? (
          <>
            <button type="submit" name="intent" value="lead" disabled={sending} className="btn btn-strap min-h-14 w-full text-lg disabled:opacity-60">
              {sending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
              Отправить заявку
            </button>
            <p className="-mt-1 text-sm text-ink-soft">
              Окна шьём по заявке: менеджер свяжется, уточнит размеры, крепление и сроки, назовёт итоговую цену и пришлёт ссылку на оплату. Предоплата сейчас не нужна.
            </p>
          </>
        ) : (
          <>
            <button type="submit" name="intent" value="pay" disabled={sending} className="btn btn-strap min-h-14 w-full text-lg disabled:cursor-not-allowed disabled:opacity-50">
              {sending && status.intent === "pay" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <CreditCard className="size-5" aria-hidden />}
              Оформить и оплатить
            </button>
            <p className="-mt-1 text-xs text-ink-soft">
              {paymentsEnabled ? "Оплата картой или СБП на защищённой странице Ozon Pay." : "Ссылку на оплату картой или СБП пришлём после проверки заказа."}{" "}
              <Link href="/oferta" className="underline underline-offset-2">Оферта</Link> ·{" "}
              <Link href="/returns" className="underline underline-offset-2">Возврат и обмен</Link>
            </p>
            <PaymentBadges compact className="text-ink-soft" />

            <div className="seam text-line" />
            <button type="submit" name="intent" value="lead" disabled={sending} className="flex items-center justify-center gap-2 text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline disabled:opacity-60">
              {sending && status.intent === "lead" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Нужен расчёт? <span className="font-semibold text-oxford">Оставить заявку менеджеру</span>
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function Choice({ name, value, checked, onChange, bold, children }: { name: string; value: string; checked: boolean; onChange: () => void; bold?: boolean; children: React.ReactNode }) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-line has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oxford ${bold ? "font-semibold" : ""}`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

function Check({ id, error, children }: { id: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm">
        <input id={`f-${id}`} type="checkbox" name={id} className="mt-0.5 size-5 shrink-0 accent-[var(--color-tarp)]" aria-invalid={!!error} aria-describedby={`e-${id}`} />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`e-${id}`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function FormField({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${id}`} className="flex items-baseline justify-between gap-2 text-sm font-semibold">
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
