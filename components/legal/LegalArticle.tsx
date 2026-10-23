import type { ReactNode } from "react";

/** Оформление юридических страниц: оферта, возврат, доставка, политика. */
export function LegalArticle({ title, edition, lead, children }: { title: string; edition?: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <article className="wrap max-w-3xl pt-24 pb-20 md:pt-32">
      <h1 className="text-[clamp(2.8rem,8vw,4.5rem)] break-words hyphens-auto">{title}</h1>
      {edition && <p className="mt-3 text-ink-soft">Редакция от {edition}</p>}
      {lead && <div className="mt-6 text-lg leading-relaxed">{lead}</div>}
      <div className="mt-10 flex flex-col gap-8 text-[1.05rem] leading-relaxed [&_a]:text-oxford [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-[2.2rem] [&_h2]:leading-tight md:[&_h2]:text-4xl [&_ol]:mt-3 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-6 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}
