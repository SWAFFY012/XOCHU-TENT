"use client";

import { useEffect, useRef, useState } from "react";
import "./RapidLayersIntro.css";

// Adapted from Codrops RapidLayersAnimation (MIT):
// https://github.com/codrops/RapidLayersAnimation/blob/master/src/js/revealer.js
// The outer panel and its image move in opposite directions to reveal a stationary photo.
// Full license: public/licenses/codrops-rapid-layers.txt.
const FRAMES = ["tarp", "01-material", "welding", "02-cut", "03-weld", "curtains", "04-sew", "sewing", "05-grommets", "06-ready", "video-start"];
const DURATION = 1050;
const STAGGER = 160;
let hasPlayed = false;

export function RapidLayersIntro({ onReveal, onComplete }: { onReveal: () => void; onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const overlay = root.current;
    if (!overlay) return;

    let cancelled = false;
    let finished = false;
    let revealed = false;
    let locked = false;
    let originalOverflow = "";
    let decodeTimeout: ReturnType<typeof setTimeout> | undefined;
    const animations: Animation[] = [];
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");

    const unlock = () => {
      if (!locked) return;
      document.body.style.overflow = originalOverflow;
      locked = false;
    };
    const reveal = () => {
      if (revealed || cancelled) return;
      revealed = true;
      onReveal();
    };
    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      hasPlayed = true;
      try {
        sessionStorage.setItem("ht-intro", "1");
      } catch {}
      animations.forEach((animation) => animation.cancel());
      unlock();
      reveal();
      onComplete();
      setDone(true);
    };

    // Never hold someone at the top when they followed a deep link or returned to the page.
    // Повторный заход в той же вкладке — без вступления, сразу к сайту
    let seen = false;
    try {
      seen = sessionStorage.getItem("ht-intro") === "1";
    } catch {}
    const skip = hasPlayed || seen || preference.matches || !!window.location.hash || window.scrollY > 40;
    const watchdog = setTimeout(finish, 7000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") finish();
    };
    const onPreference = () => {
      if (preference.matches) finish();
    };
    document.addEventListener("keydown", onKey);
    preference.addEventListener("change", onPreference);

    const run = async () => {
      if (skip) {
        finish();
        return;
      }
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      locked = true;

      const panels = Array.from(overlay.querySelectorAll<HTMLElement>("[data-intro-layer]"));
      // Wait only for the first image, behind a plain background. Once it appears,
      // the rapid sequence starts immediately without a stationary opening photo.
      const ready = await Promise.race([
        (async () => {
          const img = panels[0]?.querySelector("img");
          if (!img) return false;
          try {
            await img.decode();
            return img.naturalWidth > 0;
          } catch {
            return false;
          }
        })(),
        new Promise<null>((resolve) => {
          decodeTimeout = setTimeout(() => resolve(null), 2000);
        }),
      ]);
      clearTimeout(decodeTimeout);
      if (cancelled || finished) return;
      if (!ready) {
        finish();
        return;
      }
      const available = panels;
      if (!available.length) {
        finish();
        return;
      }

      const slide = (element: HTMLElement, from: string, to: string, delay: number, exit = false) => {
        const animation = element.animate(
          [{ transform: `translate3d(0, ${from}, 0)` }, { transform: `translate3d(0, ${to}, 0)` }],
          {
            duration: DURATION,
            delay,
            easing: exit ? "cubic-bezier(0.87, 0, 0.13, 1)" : "cubic-bezier(0.45, 0, 0.55, 1)",
            fill: "forwards",
          },
        );
        animations.push(animation);
        return animation.finished.catch(() => undefined);
      };

      await Promise.all(available.flatMap((panel, index) => {
        const photo = panel.querySelector<HTMLElement>("[data-intro-image]")!;
        return [
          slide(panel, "101%", "0%", index * STAGGER),
          slide(photo, "-101%", "0%", index * STAGGER),
        ];
      }));
      if (cancelled || finished) return;

      // The sole intentional hold belongs to the actual first frame of the video.
      await new Promise<void>((resolve) => { decodeTimeout = setTimeout(resolve, 450); });
      if (cancelled || finished) return;
      available.slice(0, -1).forEach((panel) => { panel.style.visibility = "hidden"; });
      overlay.classList.add("rapid-intro--revealing");
      reveal();
      const last = available[available.length - 1];
      // Matching still -> paused video frame; the video starts only after the fade.
      const handoff = last.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: "forwards", easing: "ease-out" });
      animations.push(handoff);
      await handoff.finished.catch(() => undefined);
      finish();
    };

    // Wait until the first committed frame; this also makes Strict Mode cleanup safe.
    const start = requestAnimationFrame(() => { void run().catch(finish); });
    return () => {
      cancelled = true;
      cancelAnimationFrame(start);
      clearTimeout(watchdog);
      clearTimeout(decodeTimeout);
      animations.forEach((animation) => animation.cancel());
      unlock();
      document.removeEventListener("keydown", onKey);
      preference.removeEventListener("change", onPreference);
    };
  }, [onReveal, onComplete, done]);

  if (done) return null;

  return (
    <div ref={root} className="rapid-intro" data-rapid-intro>
      <div className="rapid-intro__backdrop" aria-hidden />
      <div className="rapid-intro__layers" aria-hidden>
        {FRAMES.map((frame, index) => (
          <div key={frame} className="rapid-intro__layer" data-intro-layer>
            <div className="rapid-intro__image" data-intro-image>
              {/* Responsive WebP assets are generated ahead of time. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/intro/${frame}-1920.webp`}
                srcSet={`/intro/${frame}-960.webp 960w, /intro/${frame}-1920.webp 1920w, /intro/${frame}-3840.webp 3840w`}
                sizes="100vw"
                width={3840}
                height={2160}
                alt=""
                loading="eager"
                decoding="async"
                fetchPriority={index === 0 ? "high" : "auto"}
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
