"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageview } from "@/lib/visit";

/** Запоминает, откуда пришёл посетитель (метки объявления, реферер) и сколько страниц открыл: для заказа и Telegram. */
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageview();
  }, [pathname]);
  return null;
}
