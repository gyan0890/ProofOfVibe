const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

export async function sendChannelMessage(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHANNEL_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
  } catch (e) {
    console.error("[telegram] sendChannelMessage failed:", e);
  }
}
