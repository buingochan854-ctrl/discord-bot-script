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

    if (

        data.messages.length >=
        config.WEBHOOK.MAX_MESSAGES

    ) {

        console.log(

            `[Webhook Anti] Spam Detected (${message.webhookId})`

        );

        // Xóa toàn bộ tin nhắn đã ghi nhận
        for (const msg of data.messages) {

            try {

                const target = await message.channel.messages
                    .fetch(msg.id)
                    .catch(() => null);

                if (target)
                    await target.delete().catch(() => {});

            } catch {}

        }

        // Reset danh sách tin nhắn
        data.messages = [];

        // Tăng cảnh báo
        data.warns++;

        data.lastViolation = now;

        await logger(

            message,

            data.warns,

            `Spam (${config.WEBHOOK.MAX_MESSAGES}+ messages/${config.WEBHOOK.INTERVAL / 1000}s)`

        );

        return true;

    }

    return false;

};