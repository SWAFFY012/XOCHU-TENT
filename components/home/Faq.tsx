import { Plus } from "lucide-react";
import { faq } from "@/lib/content";

export function Faq() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="flex flex-col">
      {faq.map((f) => (
        <details key={f.q} className="group border-b-2 border-dashed border-line py-1">
          <summary className="flex min-h-24 cursor-pointer list-none items-center justify-between gap-5 py-6 text-xl leading-snug font-semibold md:text-[clamp(1.5rem,2.1vw,2.4rem)] [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink/6 transition-transform duration-300 group-open:rotate-45 group-open:bg-strap md:size-14">
              <Plus className="size-7" aria-hidden />
            </span>
          </summary>
          <p className="max-w-[64ch] pb-7 text-lg leading-relaxed text-ink-soft md:text-2xl">{f.a}</p>
        </details>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}
