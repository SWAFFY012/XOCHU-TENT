import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Вход в /admin по паролю из ADMIN_PASSWORD. В cookie лежит не пароль, а его HMAC:
 * смена пароля в env сразу разлогинивает всех. Без ADMIN_PASSWORD админка выключена.
 */
const COOKIE = "ht_admin";

const token = (password: string) => createHmac("sha256", password).update("hochutent-admin").digest("hex");

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const adminEnabled = () => Boolean(process.env.ADMIN_PASSWORD);

export async function isAdmin() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value) && same(value!, token(password));
}

/** Проверяет пароль и ставит cookie на 30 дней. */
export async function signIn(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !same(token(password), token(expected))) return false;
  (await cookies()).set(COOKIE, token(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function signOut() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}
