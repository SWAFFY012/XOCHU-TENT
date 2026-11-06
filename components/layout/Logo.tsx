import Image from "next/image";

/** Логотип: фирменный знак (public/logo-mark.png) и название */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 max-[389px]:gap-2 ${className ?? ""}`}>
      <Image src="/logo-mark.png" alt="" width={774} height={246} priority className="h-8 w-auto drop-shadow-[0_0_1px_rgba(255,255,255,.6)] max-[389px]:h-7 max-[339px]:h-6 md:h-10" />
      <span className="font-tektur text-[1.35rem] leading-none font-bold tracking-tight uppercase max-[389px]:text-[1.15rem] max-[339px]:text-[1.02rem] md:text-[1.7rem]">Хочутент</span>
    </span>
  );
}
