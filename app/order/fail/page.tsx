import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { XCircle } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Оплата не прошла",
  robots: { index: false, follow: false },
};

/** Возврат с платёжной формы при ошибке или отмене оплаты. Заказ при этом сохранён. */
export default function OrderFailPage({ searchParams }: PageProps<"/order/fail">) {
  return (
    <div className="wrap max-w-4xl pt-[4.5rem] pb-16 md:pt-24">
      <div className="rounded-[32px] bg-paper p-6 md:p-14">
        <XCircle className="size-14 text-danger" aria-hidden />
        <h1 className="mt-5 text-[clamp(2.8rem,8vw,4.5rem)]">
          Оплата не прошла
          <Suspense>
            <OrderNumber searchParams={searchParams} />
          </Suspense>
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg text-ink-soft">
          Деньги не списаны. Заказ сохранён — оплатить можно позже: позвоните или напишите нам, и мы пришлём новую ссылку на оплату.
          Если банк отклонил карту, попробуйте другую карту или СБП.
        </p>
        <p className="mt-6">
          <a href={site.phoneHref} className="font-semibold text-oxford underline underline-offset-2">{site.phone}</a>,{" "}
          <a href={`mailto:${site.email}`} className="text-oxford underline underline-offset-2">{site.email}</a>. {site.hours}.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={site.phoneHref} className="btn btn-strap">
            Позвонить
          </a>
          <Link href="/catalog" className="btn btn-ghost">
            В каталог
          </Link>
        </div>
      </div>
    </div>
  );
}

async function OrderNumber({ searchParams }: { searchParams: PageProps<"/order/fail">["searchParams"] }) {
  const raw = (await searchParams).order;
  return typeof raw === "string" && /^[A-Z0-9]{1,12}$/i.test(raw) ? <span className="block text-[0.5em] text-ink-soft">Заказ №{raw}</span> : null;
}
