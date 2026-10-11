import type { Metadata } from "next";
import { CartClient } from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Заявка",
  description: "Оформление заявки на тенты, шторы и мягкие окна.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="wrap pt-24 pb-20 md:pt-28">
      <h1 className="text-[3.6rem] md:text-[6.5rem]">Заявка</h1>
      <p className="mt-2 mb-8 max-w-[56ch] text-lg text-ink-soft">
        Проверьте позиции и оставьте контакты.
      </p>
      <CartClient />
    </div>
  );
}
