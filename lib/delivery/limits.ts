import type { DeliveryServiceId } from "@/lib/site";
import type { Parcel } from "./types";

/**
 * Ограничения служб по весу и габаритам одного места (ориентиры с сайтов служб, октябрь 2026).
 * ok — принимают по обычному тарифу; check — принимают, но цену и условия уточняет менеджер;
 * no — служба такой груз не возьмёт, вариант не показываем.
 */
export type LimitCheck = { level: "ok" } | { level: "check" | "no"; reason: string };

/** помещается ли место в коробку «до A×B×C» (обе стороны отсортированы по убыванию) */
const fits = (d: Parcel["dims"], max: [number, number, number]) => d[0] <= max[0] && d[1] <= max[1] && d[2] <= max[2];

const ok: LimitCheck = { level: "ok" };

function cdek(p: Parcel): LimitCheck {
  // Сборные грузы: до 1000 кг на место, с поддоном до 300×200×200 см
  if (p.weight <= 1000 && fits(p.dims, [300, 200, 200])) return ok;
  return { level: "check", reason: "крупногабаритный груз — менеджер согласует со СДЭК" };
}

const rules: Partial<Record<DeliveryServiceId, (p: Parcel) => LimitCheck>> = { cdek };

/** Худший результат по всем местам заказа. */
export function checkLimits(service: DeliveryServiceId, parcels: Parcel[]): LimitCheck {
  const rule = rules[service];
  if (!rule) return ok;
  let worst: LimitCheck = ok;
  for (const p of parcels) {
    const r = rule(p);
    if (r.level === "no") return r;
    if (r.level === "check") worst = r;
  }
  return worst;
}

