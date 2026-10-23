import "server-only";
import type { DeliveryServiceId } from "@/lib/site";
import type { DeliveryProvider } from "./types";

/**
 * Заглушка службы, пока её API не подключён: расчёта нет, стоимость считает менеджер.
 * Чтобы подключить службу, замените заглушку реализацией calculate()/createOrder() с ключами из env.
 */
function manual(id: DeliveryServiceId, envKeys: string[]): DeliveryProvider {
  return {
    id,
    ready: () => envKeys.every((k) => Boolean(process.env[k])),
    // TODO: расчёт по API службы. Пока null — «рассчитает менеджер».
    calculate: async () => null,
  };
}

// TODO: СДЭК API v2 (api.cdek.ru/v2): OAuth по CDEK_CLIENT_ID / CDEK_CLIENT_SECRET, калькулятор тарифов
export const cdek = manual("cdek", ["CDEK_CLIENT_ID", "CDEK_CLIENT_SECRET"]);
// TODO: API Почты России (otpravka.pochta.ru): токен и ключ авторизации
export const post = manual("post", ["POCHTA_TOKEN", "POCHTA_KEY"]);
// TODO: API Деловых Линий (dev.dellin.ru): ключ приложения и сессия
export const dellin = manual("dellin", ["DELLIN_APP_KEY"]);
// TODO: API ПЭК (pecom.ru/business/developers): логин и ключ
export const pek = manual("pek", ["PEK_LOGIN", "PEK_API_KEY"]);
