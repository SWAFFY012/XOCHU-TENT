import "server-only";
import { deliveryServices, type DeliveryServiceId } from "@/lib/site";
import { cdek } from "./cdek";
import { checkLimits } from "./limits";
import { ozon } from "./ozon";
import type { DeliveryOption, DeliveryProvider, DeliveryQuery } from "./types";

export const deliveryProviders: Record<DeliveryServiceId, DeliveryProvider> = { cdek, ozon };

/**
 * Варианты доставки всеми службами: ограничения по весу и габаритам, затем расчёт по API.
 * Служба без ключей или с ошибкой API остаётся в списке с пометкой «рассчитает менеджер».
 */
export async function quoteDelivery(q: DeliveryQuery, only?: DeliveryServiceId): Promise<DeliveryOption[]> {
  const services = deliveryServices.filter((s) => !only || s.id === only);
  const lists = await Promise.all(
    services.map(async ({ id, modes }) => {
      const limit = checkLimits(id, q.parcels);
      if (limit.level === "no") return modes.map((mode): DeliveryOption => ({ service: id, mode, cost: null, unavailable: true, note: limit.reason }));

      const provider = deliveryProviders[id];
      const calculated = provider.ready()
        ? await provider.calculate(q).catch((e) => {
            console.error(`[delivery] ${id}:`, e instanceof Error ? e.message : e);
            return [];
          })
        : [];
      return modes.map((mode): DeliveryOption => {
        const o = calculated.find((x) => x.mode === mode) ?? { service: id, mode, cost: null };
        if (limit.level === "check") return { ...o, preliminary: true, note: limit.reason };
        return o.cost === null && !o.note ? { ...o, note: "рассчитает менеджер" } : o;
      });
    }),
  );
  return lists.flat();
}

export { checkLimits } from "./limits";
export { toParcels } from "./parcels";
export type { DeliveryMode, DeliveryOption, DeliveryPoint, DeliveryProvider, DeliveryQuery, Parcel } from "./types";
