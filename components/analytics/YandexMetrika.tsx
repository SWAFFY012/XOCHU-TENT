"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { YM_ID, goals, reachGoal, type Goal } from "@/lib/metrika";

/** Какие ссылки считаем целями. Один обработчик на весь документ, ссылки в разметке не меняются. */
function goalForHref(href: string): Goal | null {
  if (href.startsWith("tel:")) return goals.phoneClick;
  if (href.startsWith("mailto:")) return goals.emailClick;
  if (/^https?:\/\/(t\.me|telegram\.me)\//i.test(href)) return goals.telegramClick;
  if (/^https?:\/\/(api\.whatsapp\.com|wa\.me)\//i.test(href)) return goals.whatsappClick;
  if (/^https?:\/\/(www\.)?ozon\.ru\//i.test(href)) return goals.ozonClick;
  return null;
}

/**
 * Счётчик Яндекс Метрики: Вебвизор, карта кликов, электронная коммерция,
 * просмотры страниц при переходах внутри сайта и цели по кликам на контакты.
 * Если NEXT_PUBLIC_YM_ID не задан, компонент ничего не рендерит.
 */
export function YandexMetrika() {
  const pathname = usePathname();

  // defer: true в init — первый и все следующие просмотры отправляем сами, при каждой смене страницы
  useEffect(() => {
    if (!YM_ID) return;
    try {
      window.ym?.(YM_ID, "hit", window.location.href);
    } catch {
      // игнорируем
    }
  }, [pathname]);

  useEffect(() => {
    if (!YM_ID) return;
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href");
      const goal = href ? goalForHref(href) : null;
      if (goal) reachGoal(goal, { href });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (!YM_ID) return null;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${YM_ID},"init",{defer:true,clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true,ecommerce:"dataLayer"});`}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
        </div>
      </noscript>
    </>
  );
}
