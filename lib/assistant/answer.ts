import "server-only";
import { systemPrompt } from "./knowledge";
import { complete, type GigaMessage } from "./gigachat";
import { webLookup, webLookupFunction } from "./web";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export class AssistantBusy extends Error {}

/**
 * Физлицу GigaChat даёт один поток, поэтому вопросы идут по очереди. Дальше пяти ожидающих отказываем:
 * посетитель лучше увидит «позвоните нам», чем будет ждать минуту.
 */
const MAX_WAITING = 5;
let tail: Promise<unknown> = Promise.resolve();
let waiting = 0;

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  if (waiting >= MAX_WAITING) throw new AssistantBusy();
  waiting += 1;
  const run = tail.then(job, job).finally(() => {
    waiting -= 1;
  });
  tail = run.catch(() => {});
  return run;
}

const FALLBACK = "Не получилось подобрать ответ. Позвоните нам или напишите в Telegram — подскажем.";

/** Ответ на вопрос с историей диалога. Модель может один-два раза обратиться к web_lookup за внешним источником. */
export function answer(history: ChatTurn[]): Promise<string> {
  return enqueue(async () => {
    const messages: GigaMessage[] = [{ role: "system", content: systemPrompt() }, ...history];
    for (let step = 0; step < 3; step++) {
      // на последнем шаге функции не передаём — модель обязана ответить текстом
      const { message, finish } = await complete(messages, step < 2 ? [webLookupFunction] : undefined);
      if (finish === "blacklist") return "С такой темой я не помогу. Спросите про тенты, шторы, окна, сетки, доставку или оплату.";

      const call = message.function_call;
      if (!call) return message.content?.trim() || FALLBACK;

      const args = typeof call.arguments === "string" ? safeParse(call.arguments) : call.arguments;
      messages.push({ role: "assistant", content: message.content ?? "", functions_state_id: message.functions_state_id, function_call: call });
      const result = call.name === "web_lookup" ? await webLookup(String(args.query ?? "")) : { error: "неизвестная функция" };
      messages.push({ role: "function", name: call.name, content: JSON.stringify(result) });
    }
    return FALLBACK;
  });
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
