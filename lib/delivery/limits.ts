import type { DeliveryServiceId } from "@/lib/site";
import type { Parcel } from "./types";

/**
 * Ограничения служб по весу и габаритам одного места (ориентиры с сайтов служб, октябрь 2026).
 * ok — принимают по обычному тарифу; check — принимают, но цену и условия уточняет менеджер;
 * no — служба такой груз не возьмёт, вариант не показываем.
 */
export type LimitCheck = { level: "ok" } | { level: "check" | "no"; reason: string };

const sum = ([a, b, c]: Parcel["dims"]) => a + b + c;
/** длина + периметр наибольшего поперечного сечения */
const girth = ([a, b, c]: Parcel["dims"]) => a + 2 * (b + c);
/** помещается ли место в коробку «до A×B×C» (обе стороны отсортированы по убыванию) */
const fits = (d: Parcel["dims"], max: [number, number, number]) => d[0] <= max[0] && d[1] <= max[1] && d[2] <= max[2];

const ok: LimitCheck = { level: "ok" };

function post(p: Parcel): LimitCheck {
  // Базовые тарифы: до 20 кг и сумма сторон до 300 см
  if (p.weight <= 20 && sum(p.dims) <= 300 && p.dims[0] <= 150) return ok;
  // «Курьер экспресс»: до 31,5 кг, длина + периметр сечения до 300 см, сторона до 150 см
  if (p.weight <= 31.5 && girth(p.dims) <= 300 && p.dims[0] <= 150) {
    return { level: "check", reason: "тяжелее 20 кг — примут только в части отделений, менеджер уточнит" };
  }
  return { level: "no", reason: p.weight > 31.5 ? "место тяжелее 31,5 кг" : "упаковка больше 150 см или 300 см по сумме сторон" };
}

function cdek(p: Parcel): LimitCheck {
  // Сборные грузы: до 1000 кг на место, с поддоном до 300×200×200 см
  if (p.weight <= 1000 && fits(p.dims, [300, 200, 200])) return ok;
  return { level: "check", reason: "крупногабаритный груз — менеджер согласует со СДЭК" };
}

function dellin(p: Parcel): LimitCheck {
  if (p.weight > 20_000 || !fits(p.dims, [1350, 245, 242])) return { level: "no", reason: "место больше 13,5 × 2,45 × 2,42 м" };
  if (p.weight >= 800 || p.dims[0] >= 300) return { level: "check", reason: "крупногабаритный груз — менеджер согласует" };
  return ok;
}

function pek(p: Parcel): LimitCheck {
  if (p.weight <= 80 && fits(p.dims, [200, 100, 80])) return ok;
  if (p.weight <= 800 && fits(p.dims, [180, 120, 80])) return { level: "check", reason: "груз на паллете — менеджер уточнит" };
  if (p.weight <= 20_000 && fits(p.dims, [1340, 245, 242])) return { level: "check", reason: "крупногабаритный груз — менеджер согласует" };
  return { level: "no", reason: "место больше 13,4 × 2,45 × 2,42 м" };
}

const rules: Partial<Record<DeliveryServiceId, (p: Parcel) => LimitCheck>> = { post, cdek, dellin, pek };

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

