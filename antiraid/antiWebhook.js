const cache = require("./webhookCache");
const config = require("./config");
const logger = require("./webhookLogger");

module.exports = async function (message) {

    if (!message.guild) return false;

    // Không phải webhook
    if (!message.webhookId)
        return false;

    const data = cache.get(message.webhookId);

    const now = Date.now();

    // Xóa các tin nhắn cũ
    data.messages = data.messages.filter(

        x => now - x.time < config.WEBHOOK.INTERVAL

    );

    // Thêm tin nhắn mới
    data.messages.push({

        id: message.id,

        content: message.content,

        time: now

    });

    // Cập nhật thời gian hoạt động
    data.lastViolation = now;

    // ==========================
// Kiểm tra spam tốc độ
// ==========================

const spamSpeed =
    data.messages.length >=
    config.WEBHOOK.MAX_MESSAGES;

// ==========================
// Kiểm tra spam nội dung
// ==========================

const contentCount = {};

for (const msg of data.messages) {

    const text = (msg.content || "")
        .trim()
        .toLowerCase();

    if (!text.length)
        continue;

    contentCount[text] =
        (contentCount[text] || 0) + 1;

}

let duplicate = false;
let duplicateContent = "";

for (const text in contentCount) {

    if (
        contentCount[text] >=
        config.WEBHOOK.MAX_DUPLICATE
    ) {

        duplicate = true;
        duplicateContent = text;
        break;

    }

}

// ==========================
// Có vi phạm
// ==========================

if (spamSpeed || duplicate) {

    console.log(

        `[Webhook Anti] Violation (${message.webhookId})`

    );

    // Xóa các tin đã lưu
    for (const msg of data.messages) {

        try {

            const target =
                await message.channel.messages
                .fetch(msg.id)
                .catch(() => null);

            if (target)
                await target.delete().catch(() => {});

        } catch {}

    }

    data.messages = [];

    data.warns++;

data.lastViolation = now;

// ==========================
// Xử lý theo cấp độ
// ==========================

let level = 1;

if (data.warns >= 2)
    level = 2;

if (data.warns >= config.WEBHOOK.DELETE_LEVEL)
    level = 3;

    let reason = "";

    if (spamSpeed) {

        reason =
            `Spam (${config.WEBHOOK.MAX_MESSAGES}+ messages/${config.WEBHOOK.INTERVAL / 1000}s)`;

    } else {

        reason =
            `Duplicate (${config.WEBHOOK.MAX_DUPLICATE}+ lần)\n${duplicateContent}`;

    }

   await logger(

    message,

    level,

    reason

);
    return true;

}

    return false;

};