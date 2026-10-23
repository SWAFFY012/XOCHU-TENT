import type { Metadata } from "next";
import { CartClient } from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Корзина и оформление заказа",
  description: "Оформление заказа на тенты, шторы и мягкие окна: самовывоз или доставка, оплата картой или СБП.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="wrap pt-[4.5rem] pb-16 md:pt-24">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 md:mb-5">
        <h1 className="text-[2.6rem] md:text-[4.2rem]">Корзина</h1>
        <p className="text-lg text-ink-soft">Оформление заказа</p>
      </div>
      <CartClient />
    </div>
  );
}
