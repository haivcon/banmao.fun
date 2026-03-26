// lib/telegram.ts

export const TELEGRAM_TOKEN_ENDPOINT = "/api/telegram/generate-token";
export const TELEGRAM_STATUS_ENDPOINT = "/api/telegram/check-status";
export const TELEGRAM_BOT_USERNAME = "banmaorps_bot";
export const TELEGRAM_CONNECTION_STORAGE_KEY = "banmao_telegram_connected";
export const TELEGRAM_LEGACY_USERNAME_STORAGE_KEY = "banmao_telegram_username";

export function buildTelegramConnectionKey(account: string | null | undefined) {
  if (!account) return TELEGRAM_CONNECTION_STORAGE_KEY;
  return `${TELEGRAM_CONNECTION_STORAGE_KEY}_${account.toLowerCase()}`;
}

export function buildTelegramBotUrl(token: string) {
  const sanitizedUsername = TELEGRAM_BOT_USERNAME.replace(/^@+/, "")
    .trim()
    .replace(/\s+/g, "");

  const username = sanitizedUsername || "banmaorps_bot";

  const usernameSegment = encodeURIComponent(username);
  const tokenSegment = encodeURIComponent(token);

  return `https://t.me/${usernameSegment}?start=${tokenSegment}`;
}