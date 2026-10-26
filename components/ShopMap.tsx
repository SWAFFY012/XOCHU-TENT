"use client";

import { PointsMap } from "@/components/cart/PointsMap";
import { site } from "@/lib/site";

const shop = { id: "shop", name: site.name, address: site.address, lat: site.map.lat, lon: site.map.lon };

/** Производство на карте. Клик по метке открывает карточку «Хочу Тент» в Яндекс Картах. */
export function ShopMap({ className }: { className?: string }) {
  return <PointsMap points={[shop]} selected="shop" onSelect={() => window.open(site.yandexOrgUrl, "_blank", "noopener")} className={className} label="Производство «Хочу Тент» на карте" />;
}
