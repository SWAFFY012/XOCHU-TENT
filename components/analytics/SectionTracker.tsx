"use client";

import { useEffect } from "react";
import { YM_ID, goals, reachGoal, type Goal } from "@/lib/metrika";

/**
 * Какие секции главной и сколько времени они должны быть на экране, чтобы засчитать «посмотрел».
 * Секция считается видимой, если на экране не меньше 40% её высоты или половина окна (для высоких секций),
 * а вкладка активна. Время копится только пока секция видна; цель уходит один раз за визит.
 */
const TARGETS: { selector: string; goal: Goal; ms: number }[] = [
  { selector: ".hero-scale", goal: goals.hero10s, ms: 10_000 },
  { selector: ".hero-scale", goal: goals.hero30s, ms: 30_000 },
  { selector: "#season", goal: goals.viewSeason, ms: 3_000 },
  { selector: "#calc", goal: goals.viewCalc, ms: 3_000 },
  { selector: "#process", goal: goals.viewProcess, ms: 4_000 },
  { selector: "#custom-size", goal: goals.viewCustomSize, ms: 2_000 },
  { selector: "#materials", goal: goals.viewMaterials, ms: 4_000 },
  { selector: "#faq", goal: goals.viewFaq, ms: 3_000 },
  { selector: "#cta", goal: goals.viewCta, ms: 2_000 },
];

const TICK = 500;
// Уже отправленные цели живут, пока открыта вкладка: возврат на главную не засчитывается второй раз
const fired = new Set<Goal>();

export function SectionTracker() {
  useEffect(() => {
    if (!YM_ID) return;
    const spent = new Map<Goal, number>();
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const pending = TARGETS.filter((t) => !fired.has(t.goal));
      if (!pending.length) {
        window.clearInterval(timer);
        return;
      }
      for (const t of pending) {
        const el = document.querySelector(t.selector);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        if (shown < Math.min(r.height * 0.4, window.innerHeight * 0.5)) continue;
        const total = (spent.get(t.goal) ?? 0) + TICK;
        spent.set(t.goal, total);
        if (total >= t.ms) {
          fired.add(t.goal);
          reachGoal(t.goal, { seconds: Math.round(t.ms / 1000) });
        }
      }
    }, TICK);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
