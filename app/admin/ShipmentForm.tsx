"use client";

import { useActionState } from "react";
import { Loader2, PackagePlus, RefreshCw } from "lucide-react";
import { createShipment, refreshTrack } from "./actions";

/** Кнопки «Создать отправление» и «Обновить трек» для службы с подключённым API. */
export function ShipmentForm({ id, service, created }: { id: string; service: string; created: boolean }) {
  const [message, action, pending] = useActionState(created ? refreshTrack : createShipment, null);
  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="btn btn-ghost min-h-11 text-base">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : created ? <RefreshCw className="size-4" aria-hidden /> : <PackagePlus className="size-4" aria-hidden />}
        {created ? "Обновить трек" : `Создать отправление в ${service}`}
      </button>
      {message && (
        <p className="text-xs" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
