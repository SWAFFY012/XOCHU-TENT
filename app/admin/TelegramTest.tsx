"use client";

import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { testTelegram } from "./actions";

/** Кнопка «Проверить Telegram»: шлёт тест всем получателям и показывает, дошло ли и почему нет. */
export function TelegramTest() {
  const [message, action, pending] = useActionState(testTelegram, null);
  return (
    <form action={action} className="flex flex-col gap-1 self-end text-right">
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 self-end text-sm text-ink-soft underline underline-offset-2 disabled:opacity-60">
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
        Проверить Telegram
      </button>
      {message && (
        <p className="text-xs whitespace-pre-line" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
