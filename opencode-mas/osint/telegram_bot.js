import TelegramBot from 'node-telegram-bot-api';

/**
 * System telemetry i powiadomień operacyjnych.
 * Watchdogs detekcji anomalii (np. nieautoryzowany wyciek tagu <private>, wysokie zużycie VRAM).
 * 
 * Token powinien znajdować się w zmiennej środowiskowej: TELEGRAM_BOT_TOKEN
 * Odbiorca powiadomień w: TELEGRAM_CHAT_ID
 */

const token = process.env.TELEGRAM_BOT_TOKEN || 'dummy_token';
const chatId = process.env.TELEGRAM_CHAT_ID || 'dummy_chat_id';

let bot = null;

export function initTelegramBot() {
    if (token === 'dummy_token') {
        console.warn('[Telemetry Watchdog] Błąd: Brak TELEGRAM_BOT_TOKEN. Działanie bota symulowane.');
        return;
    }
    
    // Uruchomienie bota z pollingiem (port TCP outbound, zwykle omijający NAT)
    bot = new TelegramBot(token, { polling: true });
    
    console.log('[Telemetry Watchdog] Zestawiono szyfrowany kanał komunikacji Telegram (Port 443/4096).');

    // Akcje autoryzacyjne inline
    bot.on('callback_query', (query) => {
        const action = query.data;
        const msg = query.message;
        
        if (action === 'AUTH_APPROVE') {
            bot.sendMessage(msg.chat.id, "✅ Operacja agenta autoryzowana pomyślnie.");
        } else if (action === 'AUTH_DENY') {
            bot.sendMessage(msg.chat.id, "🛑 Operacja agenta ZABLOKOWANA. Zainicjowano procedurę kwarantanny pamięci.");
        }
    });
}

/**
 * Wysyła krytyczne powiadomienie do dewelopera operacyjnego wraz z klawiszami akcji (Inline Keyboard).
 */
export async function alertAnomaly(message, requiresAuthorization = false) {
    if (!bot) {
        console.log(`[Telemetry Symulacja] ALERT: ${message}`);
        return;
    }

    const opts = requiresAuthorization ? {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Zezwól', callback_data: 'AUTH_APPROVE' },
                    { text: '🛑 Zablokuj', callback_data: 'AUTH_DENY' }
                ]
            ]
        }
    } : {};

    try {
        await bot.sendMessage(chatId, `🚨 [OpenCode MAS Anomaly]\n\n${message}`, opts);
    } catch (e) {
        console.error(`[Telemetry Watchdog] Nie udało się wysłać powiadomienia: ${e.message}`);
    }
}
