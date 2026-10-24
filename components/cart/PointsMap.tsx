"use client";

import { useEffect, useRef, useState } from "react";
import type { DeliveryPoint } from "@/lib/delivery/types";

/* Минимум типов Яндекс Карт 2.1, которые нам нужны */
type YMap = {
  geoObjects: { add(o: unknown): void; removeAll(): void };
  setBounds(b: number[][], o?: object): Promise<void>;
  setCenter(c: number[], z?: number, o?: object): Promise<void>;
  destroy(): void;
};
type YPlacemark = { events: { add(e: string, fn: () => void): void }; options: { set(k: string, v: string): void } };
type YMaps = {
  ready(fn: () => void): void;
  Map: new (el: HTMLElement, s: object, o?: object) => YMap;
  Placemark: new (c: number[], p: object, o?: object) => YPlacemark;
  Clusterer: new (o: object) => { add(p: YPlacemark[]): void };
};
declare global {
  interface Window {
    ymaps?: YMaps;
  }
}

const KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY;
let loading: Promise<YMaps> | null = null;

/** Скрипт Яндекс Карт подключаем один раз и только когда карта нужна. */
function loadYmaps() {
  if (window.ymaps) return new Promise<YMaps>((r) => window.ymaps!.ready(() => r(window.ymaps!)));
  loading ??= new Promise<YMaps>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${KEY ? `&apikey=${KEY}` : ""}`;
    s.async = true;
    s.onload = () => window.ymaps!.ready(() => resolve(window.ymaps!));
    s.onerror = () => {
      loading = null;
      reject(new Error("Яндекс Карты не загрузились"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const PRESET = "islands#blueCircleDotIcon";
const PRESET_ACTIVE = "islands#redDotIcon";

/** Карта пунктов выдачи: клик по метке выбирает пункт. */
export function PointsMap({ points, selected, onSelect }: { points: DeliveryPoint[]; selected?: string; onSelect: (p: DeliveryPoint) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<YMap | null>(null);
  const marks = useRef(new Map<string, YPlacemark>());
  const pick = useRef(onSelect);
  const chosen = useRef(selected);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pick.current = onSelect;
    chosen.current = selected;
  });

  // метки пересоздаём, когда сменился список пунктов
  useEffect(() => {
    let cancelled = false;
    loadYmaps()
      .then((ym) => {
        if (cancelled || !el.current) return;
        map.current ??= new ym.Map(el.current, { center: [points[0].lat, points[0].lon], zoom: 11, controls: ["zoomControl"] }, { suppressMapOpenBlock: true });
        map.current.geoObjects.removeAll();
        marks.current.clear();
        const cluster = new ym.Clusterer({ preset: "islands#invertedDarkBlueClusterIcons", groupByCoordinates: false });
        cluster.add(
          points.map((p) => {
            const m = new ym.Placemark([p.lat, p.lon], { hintContent: `${p.name}<br>${p.address}` }, { preset: p.id === chosen.current ? PRESET_ACTIVE : PRESET });
            m.events.add("click", () => pick.current(p));
            marks.current.set(p.id, m);
            return m;
          }),
        );
        map.current.geoObjects.add(cluster);
        if (points.length > 1) {
          const lats = points.map((p) => p.lat);
          const lons = points.map((p) => p.lon);
          map.current.setBounds(
            [
              [Math.min(...lats), Math.min(...lons)],
              [Math.max(...lats), Math.max(...lons)],
            ],
            { checkZoomRange: true, zoomMargin: 24 },
          );
        } else map.current.setCenter([points[0].lat, points[0].lon], 15);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [points]);

  // выбранная метка — красная, карта к ней
  useEffect(() => {
    marks.current.forEach((m, id) => m.options.set("preset", id === selected ? PRESET_ACTIVE : PRESET));
    const p = points.find((x) => x.id === selected);
    if (p && map.current) map.current.setCenter([p.lat, p.lon], 15, { duration: 300 });
  }, [selected, points]);

  useEffect(
    () => () => {
      map.current?.destroy();
      map.current = null;
    },
    [],
  );

  if (failed) return null;
  return <div ref={el} className="h-64 overflow-hidden rounded-2xl bg-[#e1e6dd] md:h-80" role="application" aria-label="Карта пунктов выдачи" />;
}
