import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { getOrder } from "@/lib/orders/store";
import { paymentsEnabled, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Заказ оформлен",
  robots: { index: false, follow: false },
};

/** Куда возвращается покупатель после оформления или оплаты. Показывает только номер и статус. */
export default function OrderSuccessPage({ searchParams }: PageProps<"/order/success">) {
  return (
    <div className="wrap max-w-4xl pt-[4.5rem] pb-16 md:pt-24">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-[32px] bg-paper" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: PageProps<"/order/success">["searchParams"] }) {
  await connection();
  const raw = (await searchParams).order;
  const id = typeof raw === "string" && /^[A-Z0-9]{1,12}$/i.test(raw) ? raw : "";
  const order = id ? await getOrder(id).catch(() => undefined) : undefined;

  const lead = order?.kind === "lead";
  const paid = order?.payment.status === "paid";
  const waiting = order?.payment.status === "pending";

  const title = lead ? `Заявка №${id} принята` : paid ? `Заказ №${id} оплачен` : id ? `Заказ №${id} принят` : "Заказ принят";
  const text = lead
    ? `Менеджер посчитает стоимость и свяжется с вами в течение ${site.responseTime} в рабочее время.`
    : paid
      ? "Спасибо! Оплата получена, электронный чек придёт на почту, указанную в заказе."
      : waiting
        ? "Проверяем оплату — обычно это занимает минуту. Электронный чек придёт на почту."
        : paymentsEnabled
          ? "Оплата пока не поступила. Если вы закрыли платёжную форму, менеджер пришлёт ссылку на оплату."
          : "Ссылку на оплату картой или СБП пришлём на почту или в мессенджер после проверки заказа.";

  const steps = lead
    ? ["Менеджер посчитает стоимость и сроки.", "Пришлёт ссылку на оплату или счёт.", "После оплаты запустим заказ в работу."]
    : [
        paid ? "Оплата получена." : "Оплатите заказ по ссылке.",
        `Стандартные размеры отгружаем за ${site.shipStandard}, свой размер шьём за ${site.productionDays}.`,
        "Сообщим, когда заказ будет готов к самовывозу или передан в службу доставки, и пришлём трек-номер.",
      ];

  return (
    <div className="rounded-[32px] bg-tarp p-6 text-paper md:p-14">
      {paid || lead || !paymentsEnabled ? (
        <CheckCircle2 className="size-14 text-strap" aria-hidden />
      ) : (
        <Clock3 className="size-14 text-strap" aria-hidden />
      )}
      <h1 className="mt-5 text-[clamp(2.8rem,8vw,4.5rem)]">{title}</h1>
      <p className="mt-4 max-w-[52ch] text-lg text-paper/80">{text}</p>

      <h2 className="mt-8 font-sans text-lg font-semibold">Что дальше</h2>
      <ol className="mt-3 flex list-decimal flex-col gap-2 pl-6 text-paper/80">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      <p className="mt-8 text-paper/80">
        Вопросы по заказу: <a href={site.phoneHref} className="font-semibold text-paper underline underline-offset-2">{site.phone}</a>,{" "}
        <a href={`mailto:${site.email}`} className="text-paper underline underline-offset-2">{site.email}</a>. {site.hours}.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/catalog" className="btn btn-strap">
          Вернуться в каталог
        </Link>
        <Link href="/delivery" className="btn border-[1.5px] border-paper/40 text-paper hover:bg-paper/10">
          Доставка и оплата
        </Link>
      </div>
    </div>
  );
}
