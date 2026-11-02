"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Send, X } from "lucide-react";
import { clsx } from "clsx";
import { site } from "@/lib/site";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const HINTS = ["Чем брезент ВО отличается от ОП?", "Что выбрать, чтобы укрыть дрова?", "Как замерить мягкое окно?", "Сколько стоит и как идёт доставка?"];

const GREETING = "Здравствуйте! Я ИИ-ассистент «Хочу Тент». Подскажу по материалам, размерам, ценам, доставке и оплате. Спрашивайте.";

const HINT_KEY = "ai-hint-seen";

/** Ссылки [текст](адрес), голые https://… и **жирный** из ответа модели — в элементы. Остальной HTML не выводим. */
function format(text: string, onNavigate: () => void): ReactNode[] {
  const re = /\[([^\]]+)\]\((\/[^\s)]*|https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)|\*\*([^*]+)\*\*/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  // модель иногда пишет адрес своего сайта целиком: такая ссылка должна открываться в этой же вкладке
  const link = (label: string, raw: string, key: number) => {
    let href = raw;
    try {
      const u = new URL(raw);
      if (u.hostname === location.hostname) href = u.pathname + u.search + u.hash;
    } catch {}
    return href.startsWith("/") ? (
      <Link key={key} href={href} onClick={onNavigate} className="font-medium text-oxford underline underline-offset-2">
        {label}
      </Link>
    ) : (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-oxford underline underline-offset-2">
        {label}
      </a>
    );
  };
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

/**
 * Знак ассистента: жёлтый люверс (как на тентах) с речевым пузырём, в котором четырёхконечная искра.
 * Искру вырезаем в самом пузыре (evenodd), поэтому сквозь неё виден жёлтый фон люверса.
 */
function Mark({ size, open = false }: { size: number; open?: boolean }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full bg-strap text-ink shadow-[inset_0_-3px_0_var(--color-strap-deep)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="absolute inset-[4px] rounded-full ring-1 ring-ink/20" />
      {open ? (
        <X size={size * 0.46} strokeWidth={2.4} />
      ) : (
        <svg viewBox="0 0 24 24" width={size * 0.54} height={size * 0.54} fill="currentColor" fillRule="evenodd">
          <path d="M8.5 3.5h7A3.5 3.5 0 0 1 19 7v6.5a3.5 3.5 0 0 1-3.5 3.5H11l-4 3.8V17h-.5A3.5 3.5 0 0 1 3 13.5V7a3.5 3.5 0 0 1 3.5-3.5h2ZM12 6.6l1.05 2.75L15.8 10.4l-2.75 1.05L12 14.2l-1.05-2.75L8.2 10.4l2.75-1.05L12 6.6Z" />
        </svg>
      )}
    </span>
  );
}

export function ChatWidget() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calm = useReducedMotion();

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

  // Подсказка над кнопкой: один раз за сессию, через несколько секунд, сама гаснет
  useEffect(() => {
    if (!enabled) return;
    try {
      if (sessionStorage.getItem(HINT_KEY)) return;
    } catch {}
    const show = setTimeout(() => setHint(true), 4500);
    const hide = setTimeout(() => setHint(false), 14000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [enabled]);

  const dismissHint = () => {
    setHint(false);
    try {
      sessionStorage.setItem(HINT_KEY, "1");
    } catch {}
  };

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

  const ease = [0.25, 1, 0.5, 1] as const;
  const dur = (s: number) => (calm ? 0.01 : s);

  return (
    <div className="print:hidden">
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="ИИ-ассистент Хочу Тент"
            // Lenis (плавный скролл сайта) перехватывает колесо; с этим атрибутом колесо крутит список сообщений
            data-lenis-prevent
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: dur(0.24), ease }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed right-4 bottom-[5.9rem] z-[35] flex h-[min(38rem,calc(100dvh-7.5rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] bg-paper shadow-[0_28px_70px_-18px_rgb(22_27_21/0.55)] ring-1 ring-line sm:right-6 sm:bottom-[6.4rem]"
          >
            <header className="flex items-center gap-3 border-b-2 border-dashed border-strap/60 bg-tarp px-4 py-3.5 text-paper">
              <Mark size={42} />
              <div className="mr-auto min-w-0 leading-tight">
                <p className="text-[1.05rem] font-semibold">ИИ-ассистент</p>
                <p className="truncate text-[0.8rem] text-paper/70">Товары, цены и доставка</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть чат" className="grid size-10 place-items-center rounded-full text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper">
                <X size={20} aria-hidden />
              </button>
            </header>

            <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 text-[0.95rem] leading-relaxed [scrollbar-width:thin]" aria-live="polite">
              <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-chalk px-3.5 py-2.5">{GREETING}</p>
              {msgs.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {HINTS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => send(h)}
                      className="rounded-full border border-dashed border-seam bg-paper px-3.5 py-1.5 text-left text-sm transition-colors hover:border-solid hover:border-tarp hover:bg-chalk"
                    >
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
                  {m.role === "assistant" && !m.error ? format(m.content, () => setOpen(false)).map((n, k) => <Fragment key={k}>{n}</Fragment>) : m.content}
                </p>
              ))}
              {busy && (
                <p className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-chalk px-4 py-3" aria-label="Ассистент печатает">
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
                <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Напишите вопрос…" aria-label="Ваш вопрос" className="field min-h-11 flex-1 py-2" />
                <button type="submit" disabled={busy || !text.trim()} aria-label="Отправить" className="btn btn-strap size-11 shrink-0 !rounded-full !p-0 disabled:opacity-50">
                  <Send size={18} aria-hidden />
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-ink-soft">
                Отвечает нейросеть, возможны ошибки. Точно скажет менеджер:{" "}
                <a href={site.phoneHref} className="underline">
                  {site.phone}
                </a>
              </p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="fixed right-4 bottom-4 z-[35] sm:right-6 sm:bottom-6">
        <AnimatePresence>
          {hint && !open && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: dur(0.3), ease }}
              style={{ transformOrigin: "bottom right" }}
              className="absolute right-2 bottom-[calc(100%+0.9rem)] w-[15.5rem] rounded-2xl border border-dashed border-seam bg-paper py-3 pr-9 pl-4 text-[0.9rem] leading-snug shadow-[0_16px_36px_-14px_rgb(22_27_21/0.5)]"
            >
              Подскажу по материалам, размерам и цене. Спросите!
              <button type="button" onClick={dismissHint} aria-label="Скрыть подсказку" className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full text-ink-soft hover:bg-chalk">
                <X size={14} aria-hidden />
              </button>
              <span aria-hidden className="absolute -bottom-[7px] right-12 size-3 rotate-45 border-r border-b border-dashed border-seam bg-paper" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            dismissHint();
          }}
          aria-expanded={open}
          aria-label={open ? "Закрыть чат с ИИ-ассистентом" : "Открыть чат с ИИ-ассистентом"}
          className={clsx(
            "group relative flex items-center gap-3 rounded-full bg-tarp text-paper shadow-[0_16px_36px_-12px_rgb(22_27_21/0.7)] transition-[padding,transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 active:scale-95",
            open ? "p-1.5" : "py-1.5 pr-6 pl-1.5",
          )}
        >
          {/* шов по краю, как подгиб на тенте */}
          <span aria-hidden className="pointer-events-none absolute inset-[3px] rounded-full border border-dashed border-paper/25" />
          <Mark size={open ? 48 : 58} open={open} />
          <span className={clsx("grid overflow-hidden text-left leading-tight transition-[max-width,opacity] duration-300", open ? "max-w-0 opacity-0" : "max-w-60 opacity-100")}>
            <span className="text-[1.08rem] font-semibold whitespace-nowrap">ИИ-ассистент</span>
            <span className="text-[0.8rem] whitespace-nowrap text-paper/70">Подскажет по товарам и цене</span>
          </span>
        </button>
      </div>
    </div>
  );
}
