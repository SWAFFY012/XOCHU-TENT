"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="flex max-w-sm flex-col gap-3 rounded-3xl bg-paper p-6">
      <label htmlFor="password" className="text-sm font-semibold">
        Пароль администратора
      </label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className="field min-h-11 py-2" />
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-ink">
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />} Войти
      </button>
    </form>
  );
}
