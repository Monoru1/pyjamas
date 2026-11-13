import 'server-only';

export class TelegramDeliveryError extends Error {
  constructor(readonly retryAfter?: number, code = 'telegram_delivery_uncertain') {
    super(code);
  }
}

export async function sendStaffTelegram(token: string, chatId: string, text: string, fetcher: typeof fetch = fetch) {
  if (!/^\d+:[\w-]+$/.test(token) || !/^-?[1-9]\d*$/.test(chatId)) {
    throw new TelegramDeliveryError(undefined, 'telegram_not_configured');
  }
  let response: Response;
  try {
    response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
    });
  } catch {
    throw new TelegramDeliveryError();
  }
  if (response.status === 429) {
    const seconds = Number((await response.json().catch(() => null))?.parameters?.retry_after);
    throw new TelegramDeliveryError(Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 60, 'telegram_rate_limited');
  }
  if (response.status >= 400 && response.status < 500) {
    throw new TelegramDeliveryError(undefined, 'telegram_rejected');
  }
  if (!response.ok) throw new TelegramDeliveryError();
  const result = await response.json().catch(() => null);
  if (result?.ok !== true || !Number.isSafeInteger(result.result?.message_id) || result.result.message_id < 1) {
    throw new TelegramDeliveryError();
  }
  return String(result.result.message_id);
}
