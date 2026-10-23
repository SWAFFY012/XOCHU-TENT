import { ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

/** Платёжные системы, которые принимает Ozon Pay: МИР, Visa, Mastercard, СБП. */
export function PaymentBadges({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={clsx("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <ul className="flex flex-wrap items-center gap-1.5" aria-label="Способы оплаты">
        <Badge label="МИР">
          <span className="font-sans text-[0.8rem] font-black tracking-tight text-[#0f754e]">МИР</span>
        </Badge>
        <Badge label="Visa">
          <span className="font-sans text-[0.8rem] font-black tracking-tight text-[#1a1f71] italic">VISA</span>
        </Badge>
        <Badge label="Mastercard">
          <svg viewBox="0 0 32 20" className="h-4" aria-hidden>
            <circle cx="12" cy="10" r="8" fill="#eb001b" />
            <circle cx="20" cy="10" r="8" fill="#f79e1b" />
            <path d="M16 3.07a8 8 0 0 1 0 13.86 8 8 0 0 1 0-13.86z" fill="#ff5f00" />
          </svg>
        </Badge>
        <Badge label="СБП">
          <span className="font-sans text-[0.8rem] font-black tracking-tight text-[#1d1346]">СБП</span>
        </Badge>
      </ul>
      <span className={clsx("flex items-center gap-1.5", compact ? "text-xs" : "text-sm")}>
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        Безопасная оплата через Ozon Pay
      </span>
    </div>
  );
}

function Badge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="grid h-7 min-w-12 place-items-center rounded-md bg-white px-2" title={label}>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="flex items-center">
        {children}
      </span>
    </li>
  );
}
