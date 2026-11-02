"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { clsx } from "clsx";
import { site } from "@/lib/site";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const HINTS = ["Чем брезент ВО отличается от ОП?", "Что выбрать, чтобы укрыть дрова?", "Как замерить мягкое окно?", "Сколько стоит и как идёт доставка?"];

const GREETING = "Здравствуйте! Я помощник «Хочу Тент». Подскажу по материалам, размерам, ценам, доставке и оплате. Спрашивайте.";

/** Ссылки [текст](адрес), голые https://… и **жирный** из ответа модели — в элементы. Остальной HTML не выводим. */
function format(text: string, onNavigate: () => void): ReactNode[] {
  const re = /\[([^\]]+)\]\((\/[^\s)]*|https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)|\*\*([^*]+)\*\*/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const link = (label: string, href: string, key: number) =>
    href.startsWith("/") ? (
      <Link key={key} href={href} onClick={onNavigate} className="font-medium text-oxford underline underline-offset-2">
        {label}
      </Link>
    ) : (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-oxford underline underline-offset-2">
        {label}
      </a>
    );
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(link(m[1], m[2], m.index));
    else if (m[3]) out.push(link(m[3].replace(/[.,;:!?]+$/, ""), m[3].replace(/[.,;:!?]+$/, ""), m.index));
    else out.push(<b key={m.index}>{m[4]}</b>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ChatWidget() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Показываем кнопку, только если на сервере подключён ключ ассистента
  useEffect(() => {
    let live = true;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => live && setEnabled(Boolean(d.enabled)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json().catch(() => ({}));
      setMsgs([...next, res.ok && data.reply ? { role: "assistant", content: data.reply } : { role: "assistant", content: data.error ?? "Не получилось ответить. Попробуйте ещё раз.", error: true }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="print:hidden">
      {open && (
        <section
          role="dialog"
          aria-label="Помощник Хочу Тент"
          className="fixed right-4 bottom-20 z-[35] flex h-[min(34rem,calc(100dvh-6.5rem))] w-[min(23.5rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl bg-paper shadow-[0_18px_50px_-12px_rgb(22_27_21/0.45)] ring-1 ring-line"
        >
          <header className="flex items-center gap-3 bg-tarp px-4 py-3 text-paper">
            <span className="grid size-9 place-items-center rounded-full bg-strap text-ink">
              <MessageCircle size={18} aria-hidden />
            </span>
            <div className="mr-auto leading-tight">
              <p className="font-semibold">Помощник</p>
              <p className="text-xs text-paper/70">Подскажет по товарам и заказу</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть чат" className="grid size-9 place-items-center rounded-full hover:bg-paper/10">
              <X size={18} aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 text-[0.95rem] leading-relaxed" aria-live="polite">
            <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-chalk px-3.5 py-2.5">{GREETING}</p>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {HINTS.map((h) => (
                  <button key={h} type="button" onClick={() => send(h)} className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-sm hover:border-seam">
                    {h}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <p
                key={i}
                className={clsx(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 break-words whitespace-pre-wrap",
                  m.role === "user" ? "self-end rounded-br-md bg-tarp text-paper" : "rounded-bl-md bg-chalk",
                  m.error && "bg-danger/10 text-danger",
                )}
              >
                {m.role === "assistant" && !m.error
                  ? format(m.content, () => setOpen(false)).map((n, k) => <Fragment key={k}>{n}</Fragment>)
                  : m.content}
              </p>
            ))}
            {busy && (
              <p className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-chalk px-4 py-3" aria-label="Помощник печатает">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="size-1.5 animate-bounce rounded-full bg-seam" style={{ animationDelay: `${d}ms` }} />
                ))}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="border-t border-line bg-paper p-3"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder="Напишите вопрос…"
                aria-label="Ваш вопрос"
                className="field min-h-11 flex-1 py-2"
              />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Отправить" className="btn btn-strap size-11 shrink-0 !p-0 disabled:opacity-50">
                <Send size={18} aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-ink-soft">
              Отвечает нейросеть, возможны ошибки. Точно скажет менеджер: <a href={site.phoneHref} className="underline">{site.phone}</a>
            </p>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Закрыть чат" : "Открыть чат с помощником"}
        className="fixed right-4 bottom-4 z-[35] grid size-14 place-items-center rounded-full bg-strap text-ink shadow-[0_8px_24px_-6px_rgb(22_27_21/0.5),inset_0_-3px_0_var(--color-strap-deep)] transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X size={24} aria-hidden /> : <MessageCircle size={26} aria-hidden />}
      </button>
    </div>
  );
}
