import "server-only";
import { randomUUID } from "node:crypto";
import https from "node:https";
import tls from "node:tls";
import { RUSSIAN_ROOT_CA } from "./ca";

/**
 * GigaChat API (Сбер). Ключ авторизации — в личном кабинете developers.sber.ru → проект GigaChat API → «Получить ключ».
 * GIGACHAT_AUTH_KEY — ключ авторизации (Base64 от client_id:client_secret), GIGACHAT_SCOPE — GIGACHAT_API_PERS для физлица,
 * GIGACHAT_MODEL — GigaChat-2 (Lite), GigaChat-2-Pro или GigaChat-2-Max.
 * Серверы подписаны сертификатом Минцифры, которого нет в хранилище Node: передаём его в agent, а не отключаем проверку TLS.
 */
const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const API_URL = (process.env.GIGACHAT_API_URL || "https://api.giga.chat/v1").replace(/\/$/, "");

const agent = new https.Agent({ ca: [...tls.rootCertificates, RUSSIAN_ROOT_CA], keepAlive: true });

export const gigachatReady = () => Boolean(process.env.GIGACHAT_AUTH_KEY);

export type GigaMessage = {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string;
  functions_state_id?: string;
  function_call?: { name: string; arguments: Record<string, unknown> | string };
};

type Reply = { message: GigaMessage; finish: string };

function post(url: string, headers: Record<string, string>, body: string, timeout = 40_000) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = https.request(url, { method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(body) }, agent, timeout }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("timeout", () => req.destroy(new Error("GigaChat не ответил вовремя")));
    req.on("error", reject);
    req.end(body);
  });
}

let token: { value: string; exp: number } | null = null;

async function accessToken() {
  if (token && Date.now() < token.exp - 60_000) return token.value;
  const res = await post(
    OAUTH_URL,
    {
      Authorization: `Basic ${process.env.GIGACHAT_AUTH_KEY}`,
      RqUID: randomUUID(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    `scope=${process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS"}`,
  );
  const data = safeJson(res.body) as { access_token?: string; expires_at?: number } | null;
  if (res.status !== 200 || !data?.access_token) throw new Error(`GigaChat OAuth ${res.status}: ${res.body.slice(0, 200)}`);
  token = { value: data.access_token, exp: data.expires_at ?? Date.now() + 25 * 60_000 };
  return token.value;
}

const safeJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/** Один запрос chat/completions. 401 — токен протух, получаем новый; 429 — занят единственный поток, ждём секунду. */
export async function complete(messages: GigaMessage[], functions?: object[]): Promise<Reply> {
  const body = JSON.stringify({
    model: process.env.GIGACHAT_MODEL || "GigaChat-2-Pro",
    messages,
    temperature: 0.3,
    max_tokens: 700,
    ...(functions ? { functions, function_call: "auto" } : {}),
  });
  for (let attempt = 0; ; attempt++) {
    const res = await post(`${API_URL}/chat/completions`, { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", Accept: "application/json" }, body);
    if (res.status === 401 && attempt < 1) {
      token = null;
      continue;
    }
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }
    const data = safeJson(res.body) as { choices?: { message: GigaMessage; finish_reason: string }[] } | null;
    const choice = data?.choices?.[0];
    if (res.status !== 200 || !choice) throw new Error(`GigaChat ${res.status}: ${res.body.slice(0, 200)}`);
    return { message: choice.message, finish: choice.finish_reason };
  }
}
