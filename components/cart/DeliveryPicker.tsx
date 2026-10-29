"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Loader2, MapPin, Search } from "lucide-react";
import type { DeliveryOption, DeliveryPoint } from "@/lib/delivery/types";
import { formatPrice, plural } from "@/lib/format";
import { deliveryServices, site } from "@/lib/site";
import { PointsMap } from "./PointsMap";

export type CartLine = { slug: string; option: string; color: string; size: string; qty: number; custom: boolean };
type Errors = Partial<Record<"city" | "address" | "point" | "service", string>>;

const serviceOf = (id: string) => deliveryServices.find((s) => s.id === id)!;
const optionKey = (o: Pick<DeliveryOption, "service" | "mode">) => `${o.service}:${o.mode}`;
const optionLabel = (o: DeliveryOption) => (o.mode === "door" ? "курьером до двери" : serviceOf(o.service).pvzLabel);

/** Пока не посчитали — все службы без цены, чтобы заказ можно было оформить и так. */
const fallbackOptions: DeliveryOption[] = deliveryServices.flatMap((s) => s.modes.map((mode) => ({ service: s.id, mode, cost: null, note: "рассчитает менеджер" })));

/**
 * Доставка транспортной компанией: город → стоимость всеми службами → пункт выдачи на карте или адрес.
 * Значения уходят в форму скрытыми полями; выбранный вариант — наверх, в итог заказа.
 */
export function DeliveryPicker({ lines, errors, onOption }: { lines: CartLine[]; errors: Errors; onOption: (o: DeliveryOption | null) => void }) {
  const [city, setCity] = useState("");
  const [options, setOptions] = useState<DeliveryOption[] | null>(null);
  const [calc, setCalc] = useState<{ state: "idle" | "loading" } | { state: "error"; message: string }>({ state: "idle" });
  const [key, setKey] = useState("");
  const [points, setPoints] = useState<{ key: string; list: DeliveryPoint[]; error?: string }>({ key: "", list: [] });
  const [picked, setPicked] = useState<{ key: string; point: DeliveryPoint } | null>(null);
  const [query, setQuery] = useState("");

  const linesKey = JSON.stringify(lines);
  const list = options ?? fallbackOptions;
  const selected = list.find((o) => optionKey(o) === key && !o.unavailable) ?? null;
  const service = selected?.service;

  useEffect(() => onOption(selected), [selected, onOption]);

  // Стоимость всеми службами: пересчитываем, когда покупатель перестал печатать город
  useEffect(() => {
    const c = city.trim();
    if (c.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setCalc({ state: "loading" });
      try {
        const res = await fetch("/api/delivery/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: c, items: JSON.parse(linesKey) }),
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Не удалось посчитать доставку.");
        setOptions(data.options);
        setCalc({ state: "idle" });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setOptions(null);
        setCalc({ state: "error", message: e instanceof Error ? e.message : "Не удалось посчитать доставку." });
      }
    }, 700);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [city, linesKey]);

  // Пункты выдачи выбранной службы в городе
  const needPoints = selected?.mode === "pvz";
  const pointsKey = needPoints ? `${service}|${city.trim().toLowerCase()}|${linesKey}` : "";
  const pointsLoading = !!pointsKey && points.key !== pointsKey;
  useEffect(() => {
    if (!pointsKey) return;
    const ctrl = new AbortController();
    fetch("/api/delivery/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, city: city.trim(), items: JSON.parse(linesKey) }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setPoints({ key: pointsKey, list: d.points ?? [], error: d.error }))
      .catch(() => !ctrl.signal.aborted && setPoints({ key: pointsKey, list: [], error: "Не удалось загрузить пункты выдачи." }));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);
  // выбранный пункт действует, пока не сменились служба, город или корзина
  const point = picked?.key === pointsKey ? picked.point : null;
  const setPoint = (p: DeliveryPoint) => setPicked({ key: pointsKey, point: p });

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = q ? points.list.filter((p) => `${p.name} ${p.address}`.toLowerCase().includes(q)) : points.list;
    return found.slice(0, 60);
  }, [points.list, query]);

  const hasPoints = needPoints && !pointsLoading && points.list.length > 0;
  // адрес текстом: до двери и до пункта, если пунктов службы не загрузили (нет ключей API)
  const needAddress = selected && !hasPoints && !pointsLoading;
  const available = list.filter((o) => !o.unavailable);
  const blocked = list.filter((o) => o.unavailable);

  return (
    <div className="flex flex-col gap-3">
      <Field id="city" label="Город" error={errors.city}>
        <input
          id="f-city"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="address-level2"
          placeholder="Казань"
          className="field min-h-11 py-2"
          aria-invalid={!!errors.city}
          aria-describedby="e-city"
        />
      </Field>

      <div className="flex items-center gap-2 text-sm text-ink-soft" aria-live="polite">
        {calc.state === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Считаем доставку всеми службами…
          </>
        ) : calc.state === "error" ? (
          <span className="text-danger">{calc.message} Выберите службу — стоимость посчитает менеджер.</span>
        ) : options ? (
          <span>
            Стоимость по тарифам служб для вашего заказа · {lines.reduce((s, l) => s + l.qty, 0)} {plural(lines.reduce((s, l) => s + l.qty, 0), "место", "места", "мест")}
          </span>
        ) : (
          <span>Укажите город — посчитаем стоимость и сроки всеми службами.</span>
        )}
      </div>

      <div id="f-service" tabIndex={-1} role="radiogroup" aria-label="Служба доставки" className="flex flex-col gap-1.5 outline-none">
        {available.map((o) => (
          <label
            key={optionKey(o)}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-line px-3.5 py-2.5 has-[:checked]:border-ink has-[:checked]:bg-ink/[0.04] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oxford"
          >
            <input type="radio" name="option" value={optionKey(o)} checked={key === optionKey(o)} onChange={() => setKey(optionKey(o))} className="size-4 shrink-0 accent-[var(--color-ink)]" />
            <span className="flex min-w-0 grow flex-col">
              <span className="font-semibold">
                {serviceOf(o.service).title} <span className="font-normal text-ink-soft">· {optionLabel(o)}</span>
              </span>
              {(o.days || o.note) && (
                <span className={`text-xs ${o.preliminary ? "text-tarp" : "text-ink-soft"}`}>
                  {o.days && `${o.days} ${plural(Number(o.days.split("–").at(-1)), "день", "дня", "дней")} в пути`}
                  {o.days && o.note && " · "}
                  {o.note}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right font-semibold tabular-nums">{o.cost ? `${o.preliminary ? "≈ " : ""}${formatPrice(o.cost)}` : "—"}</span>
          </label>
        ))}
        {blocked.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1 text-xs text-ink-soft">
            {blocked.map((o) => (
              <li key={optionKey(o)} className="flex items-start gap-1.5">
                <Ban className="mt-px size-3.5 shrink-0" aria-hidden />
                {serviceOf(o.service).title} {optionLabel(o)} — не возьмёт: {o.note}
              </li>
            ))}
          </ul>
        )}
        {errors.service && (
          <p id="e-service" className="text-sm text-danger">
            {errors.service}
          </p>
        )}
      </div>

      {/* пункт выдачи */}
      {needPoints && (
        <div className="flex flex-col gap-2">
          {pointsLoading ? (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Загружаем пункты выдачи…
            </p>
          ) : hasPoints ? (
            <>
              <PointsMap points={points.list} selected={point?.id} onSelect={setPoint} />
              <label className="relative">
                <span className="sr-only">Поиск пункта по адресу</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Улица или метро" className="field min-h-11 py-2 pl-9" />
              </label>
              <ul id="f-point" tabIndex={-1} className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-2xl border-[1.5px] border-line p-1.5" aria-label="Пункты выдачи">
                {shown.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPoint(p)}
                      aria-pressed={point?.id === p.id}
                      className="flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-ink/5 aria-pressed:bg-ink aria-pressed:text-paper"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-semibold">{p.address}</span>
                        {p.workTime && <span className="block text-xs opacity-75">{p.workTime}</span>}
                      </span>
                    </button>
                  </li>
                ))}
                {!shown.length && <li className="px-2.5 py-2 text-sm text-ink-soft">Ничего не нашли — измените запрос.</li>}
              </ul>
              {point && (
                <p className="rounded-xl bg-ink/5 px-3 py-2.5 text-sm">
                  <b className="font-semibold">Пункт выдачи:</b> {point.address}
                </p>
              )}
              {errors.point && <p className="text-sm text-danger">{errors.point}</p>}
            </>
          ) : (
            points.error && <p className="text-sm text-ink-soft">{points.error}</p>
          )}
        </div>
      )}

      {needAddress && (
        <Field
          id="address"
          label={selected.mode === "door" ? "Улица, дом, квартира" : "Адрес пункта выдачи"}
          error={errors.address}
        >
          <input
            id="f-address"
            name="address"
            autoComplete="street-address"
            placeholder={selected.mode === "door" ? "ул. Баумана, 12, кв. 5" : "Адрес пункта выдачи"}
            className="field min-h-11 py-2"
            aria-invalid={!!errors.address}
            aria-describedby="e-address"
          />
        </Field>
      )}

      {/* что уходит в форму */}
      <input type="hidden" name="service" value={selected?.service ?? ""} />
      <input type="hidden" name="mode" value={selected?.mode ?? ""} />
      <input type="hidden" name="pointId" value={hasPoints && point ? point.id : ""} />
      <input type="hidden" name="pointName" value={hasPoints && point ? point.name : ""} />
      <input type="hidden" name="pointAddress" value={hasPoints && point ? point.address : ""} />
      <input type="hidden" name="needPoint" value={hasPoints ? "1" : ""} />

      <p className="rounded-xl bg-ink/5 px-3 py-2.5 text-sm">
        Курьер «Хочу Тент» сдаёт заказ в службу в Санкт-Петербурге за {site.handoverDays} дня. Срок в пути — по расчёту службы.
      </p>
    </div>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
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
