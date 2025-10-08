
// netlify/functions/telegram-relay.js

const fetch = require('node-fetch');

const BOT_TOKEN = '7821519539:AAFmikR4MBeLKRLTYD3nqeTUrSdc7RqJQA8';
const RELAY_BOT = '@HUB9XDOWNLOADERBOT';
const RELAY_BOT_ID = '8224680804';
const OWNER_ID = '1538232799';
const CHANNEL_ID = '-1003011981359';
const GROUP_ID = '-1003151936245';
const CHANNEL_LINK = 'https://t.me/+akSU2_DCpW5iMzll';
const GROUP_LINK = 'https://t.me/+okfdHYdJXjcwNGFl';

// Send message helper
async function sendMessage(chatId, text, extra = {}) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            ...extra
        })
    });
    return await response.json();
}

// Check membership
async function checkMembership(userId, chatId) {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                user_id: userId
            })
        });
        const data = await response.json();
        const status = data.result?.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch {
        return false;
    }
}

// Detect video platform
function detectPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
    if (url.includes('tiktok.com')) return 'TikTok';
    if (url.includes('instagram.com')) return 'Instagram';
    return 'Unknown';
}

// Main handler
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const update = JSON.parse(event.body);

        // Handle messages
        if (update.message) {
            const msg = update.message;
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const text = msg.text || '';

            // Handle /start
            if (text === '/start') {
                const welcomeMsg = `🤝 မဂ်လာပါခင်ဗျာ Bot ကို စတင်မူ့အတွက် ကျေးဇူးတင်ပါတယ်

Bot တွင် Video Link ပို့ပီး Video များကို Quality ကောင်းကောင်း Download ဆွဲပါ

📌 Supported Platforms:
• YouTube (Videos & Shorts)
• Facebook (Videos)
• TikTok (Videos)
• Instagram (Reels)

💡 အသုံးပြုနည်း:
1. Video link ကို copy လုပ်ပါ
2. Bot ထဲမှာ paste လုပ်ပါ
3. Download button နှိပ်ပါ

🎯 Let's start!`;

                await sendMessage(chatId, welcomeMsg);

                // Check membership
                const channelMember = await checkMembership(userId, CHANNEL_ID);
                const groupMember = await checkMembership(userId, GROUP_ID);

                if (!channelMember || !groupMember) {
                    const keyboard = {
                        inline_keyboard: [
                            [{ text: '📢 Join Channel', url: CHANNEL_LINK }],
                            [{ text: '👥 Join Group', url: GROUP_LINK }],
                            [{ text: '✅ Done', callback_data: 'check_membership' }]
                        ]
                    };

                    await sendMessage(chatId, 
                        `⚠️ Bot ကို အသုံးပြုရန် Channel နှင့် Group ကို Join လုပ်ပေးပါ။`,
                        { reply_markup: keyboard }
                    );
                }

                return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
            }

            // Handle video links
            if (text.includes('http')) {
                const platform = detectPlatform(text);
                
                if (platform === 'Unknown') {
                    await sendMessage(chatId, '❌ ပံ့ပိုးမထားသော link ဖြစ်ပါသည်။');
                    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
                }

                // Create deep link to relay bot
                const relayUrl = `https://t.me/HUB9XDOWNLOADERBOT?start=${encodeURIComponent(text)}`;

                const keyboard = {
                    inline_keyboard: [[
                        { 
                            text: '📥 Download Video', 
                            url: relayUrl 
                        }
                    ]]
                };

                await sendMessage(chatId, 
                    `✅ Video Link ရှာတွေ့ပါပီ!\n\n` +
                    `📱 Platform: ${platform}\n` +
                    `🔗 Link: ${text}\n\n` +
                    `📥 အောက်က button ကို နှိပ်ပီး download ဆွဲပါ:`,
                    { reply_markup: keyboard }
                );

                return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
            }

            // Default message
            await sendMessage(chatId, 
                `📎 ကျေးဇူးပြု၍ video link ပို့ပါ။\n\n` +
                `✅ Supported: YouTube, Facebook, TikTok, Instagram`
            );
        }

        // Handle callback queries
        if (update.callback_query) {
            const query = update.callback_query;
            const chatId = query.message.chat.id;
            const userId = query.from.id;
            const data = query.data;

            if (data === 'check_membership') {
                const channelMember = await checkMembership(userId, CHANNEL_ID);
                const groupMember = await checkMembership(userId, GROUP_ID);

                if (channelMember && groupMember) {
                    await sendMessage(chatId, 
                        `✅ ကျေးဇူးတင်ပါတယ်! သင် Join ပြုလုပ်ပီးပါပီ။\n\n` +
                        `🎬 ယခု video link များကို ပို့၍ download ဆွဲနိုင်ပါပီ။`
                    );
                } else {
                    await sendMessage(chatId, 
                        `❌ သင်သည် Channel/Group ကို Join မပြုလုပ်ရသေးပါ။`
                    );
                }
            }

            // Answer callback
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: query.id })
            });
        }

        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

    } catch (error) {
        console.error('Error:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};
            
