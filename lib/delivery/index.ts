import "server-only";
import type { DeliveryServiceId } from "@/lib/site";
import { cdek, dellin, pek, post } from "./carriers";
import { ozon } from "./ozon";
import type { DeliveryProvider } from "./types";

export const deliveryProviders: Record<DeliveryServiceId, DeliveryProvider> = { cdek, post, ozon, dellin, pek };

export type { DeliveryProvider, DeliveryQuery, DeliveryQuote } from "./types";
