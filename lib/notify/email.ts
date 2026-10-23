import "server-only";
import nodemailer from "nodemailer";

/**
 * Письма покупателю (готовность заказа, трек-номер) через SMTP.
 * Нужны SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM — например, ящик на Яндекс 360
 * (smtp.yandex.ru, 465, пароль приложения). Без них письмо не уходит, а менеджер получает текст в Telegram.
 */
export const emailReady = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailReady() || !to) return false;
  const port = Number(process.env.SMTP_PORT || 465);
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
    return true;
  } catch (e) {
    console.error("[email]", e);
    return false;
  }
}
