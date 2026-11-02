import { NextResponse } from "next/server";
import { answer, AssistantBusy, type ChatTurn } from "@/lib/assistant/answer";
import { gigachatReady } from "@/lib/assistant/gigachat";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Не больше 15 вопросов с одного IP за 10 минут; всего по сайту — 1500 в сутки, чтобы не сжечь бесплатные токены
const limited = rateLimit(15, 10 * 60_000);
const dayLimited = rateLimit(1500, 24 * 60 * 60_000);

const MAX_TURNS = 8;
const MAX_LEN = 600;

/** Виджет спрашивает, настроен ли ассистент, и показывается только если да. */
export async function GET() {
  return NextResponse.json({ enabled: gigachatReady() });
}

export async function POST(req: Request) {
  if (!gigachatReady()) return NextResponse.json({ error: "Ассистент пока не подключён." }, { status: 503 });
  if (limited(clientIp(req)) || dayLimited("all")) {
    return NextResponse.json({ error: "Слишком много вопросов. Попробуйте через несколько минут или позвоните нам." }, { status: 429 });
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать вопрос." }, { status: 400 });
  }
  const history: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m): m is ChatTurn => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_LEN) }))
    .filter((m) => m.content)
    .slice(-MAX_TURNS);
  if (history.at(-1)?.role !== "user") return NextResponse.json({ error: "Напишите вопрос." }, { status: 400 });

  try {
    return NextResponse.json({ reply: await answer(history) });
  } catch (e) {
    if (e instanceof AssistantBusy) return NextResponse.json({ error: "Сейчас много вопросов. Попробуйте через минуту." }, { status: 503 });
    console.error("[assistant]", e);
    return NextResponse.json({ error: "Не получилось ответить. Позвоните нам или напишите в Telegram." }, { status: 502 });
  }
}
