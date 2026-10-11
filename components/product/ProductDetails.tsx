import { materials, optionSpecs, productCopy, productGuides, productSpecs, productUses } from "@/lib/content";
import { formatArea, formatPrice } from "@/lib/format";
import { materialSpecs } from "@/lib/site";
import type { ProductSummary } from "@/lib/types";

/** Описание материала и характеристики. Серверный компонент. */
export function ProductDetails({ p }: { p: ProductSummary }) {
  const m = materials[p.material];
  const spec = { ...materialSpecs[p.material], ...productSpecs[p.slug] };
  const copy = productCopy[p.slug];
  const byOption = optionSpecs[p.slug];
  const uses = productUses[p.slug];
  const guides = productGuides[p.slug];

  const rows: [string, string][] = [
    ["Материал", m.title],
    ["Плотность", spec.density],
    ["Температура эксплуатации", spec.temp],
    ["Срок службы", spec.life],
    ["Размеры в таблице", `${formatArea(p.areaMin)} – ${formatArea(p.areaMax)}`],
    ["Цена за м²", `≈ ${formatPrice(p.pricePerM2Median)}`],
  ];
  if (p.optionLabel && p.options.length > 1) rows.splice(1, 0, [p.optionLabel, p.options.join(", ")]);

  return (
    <section className="flex flex-col gap-6 border-t-2 border-dashed border-line pt-7">
      <div className="flex flex-col gap-3 text-[1.02rem] leading-relaxed">
        {copy?.body.map((t) => <p key={t}>{t}</p>)}
      </div>

      {byOption && (
        <div>
          <h2 className="text-3xl">Чем отличаются {p.optionLabel?.toLowerCase() === "пропитка" ? "пропитки" : "варианты"}</h2>
          <div className="mt-4 grid gap-2">
            {Object.entries(byOption).map(([name, o]) => (
              <div key={name} className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 rounded-2xl bg-paper px-4 py-3">
                <span className="font-semibold">{name}</span>
                <span className="font-display text-2xl leading-none font-extrabold">{o.density ?? ""}</span>
                <span className="col-span-2 text-sm text-ink-soft">{o.feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {uses && (
        <div>
          <h2 className="text-3xl">Для чего берут</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {uses.map((u) => (
              <li key={u} className="flex items-center gap-3">
                <span className="grommet" aria-hidden />
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}

      {guides?.map((g) => (
        <div key={g.title}>
          <h2 className="text-3xl">{g.title}</h2>
          <ol className="mt-3 flex flex-col gap-2.5">
            {g.steps.map((st, i) => (
              <li key={st} className="flex gap-3">
                <span className="font-display text-2xl leading-none font-black text-strap-deep">{i + 1}</span>
                <span>{st}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}

      <div>
        <h2 className="text-3xl">Материал: {m.title.toLowerCase()}</h2>
        <p className="mt-2 max-w-[62ch] text-ink-soft">{m.text}</p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {spec.extra.map((e) => (
            <li key={e} className="flex items-center gap-3">
              <span className="grommet" aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-paper sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 border-b border-line px-4 py-3 sm:odd:border-r">
            <dt className="text-sm text-ink-soft">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
