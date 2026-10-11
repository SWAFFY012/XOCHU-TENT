import type { ReactNode } from "react";
import { clsx } from "clsx";

/** Бесконечная лента: контент дублируется, трек сдвигается на −50% */
export function Marquee({
  children,
  reverse,
  duration = 40,
  className,
}: {
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={clsx("overflow-hidden", className)}>
      <div
        className={clsx("marquee-track flex w-max", reverse && "marquee-track-rev")}
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
