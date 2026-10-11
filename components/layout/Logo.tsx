import Image from "next/image";

/** Логотип: фирменный знак (public/logo-mark.png) и название */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className ?? ""}`}>
      <Image src="/logo-mark.png" alt="" width={774} height={246} priority className="h-8 w-auto drop-shadow-[0_0_1px_rgba(255,255,255,.6)] md:h-10" />
      <span className="font-tektur text-[1.35rem] leading-none font-bold tracking-tight uppercase md:text-[1.7rem]">Хочутент</span>
    </span>
  );
}
