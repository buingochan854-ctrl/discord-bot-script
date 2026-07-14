// ===== DEBUG: Log khi file được require =====
console.log("📦 messageCreate.js loaded");

const keyCache = require("../cache/keyCache");
const keyChannelCache = require("../cache/keyChannelCache");

module.exports = (client) => {
    console.log("✅ messageCreate registered");

    client.on("messageCreate", async (message) => {
        // ===== DEBUG LOG 1: Kiểm tra event có chạy không =====
        console.log(`[MESSAGE] ${message.author.tag}: ${message.content}`);

        // Bỏ qua tin nhắn từ bot
        if (message.author.bot) {
            console.log("[DEBUG] Bot message, ignored");
            return;
        }

        // Bỏ qua tin nhắn không có nội dung
        if (!message.content) {
            console.log("[DEBUG] Empty content, ignored");
            return;
        }

        const content = message.content.trim();

        // ===== DEBUG LOG 2: Lấy key từ cache =====
        console.log(`[QUERY] Searching key: "${content}"`);
        const target = keyCache.get(content);

        // ===== DEBUG LOG 3: Kiểm tra target =====
        console.log("[TARGET]", target ? target.name : "NOT FOUND");

        if (!target) return;

        // Kiểm tra permission bằng cache
        try {
            const result = keyChannelCache.checkPermission(
                target.name,
                message.channel.id,
                message.guild.id
            );

            // ===== DEBUG LOG 4: Kiểm tra permission =====
            console.log("[PERMISSION]", result);

            if (!result.allowed) {
                return message.reply(result.message);
            }

            return message.reply(target.value);

        } catch (err) {
            console.error("[Key Check Error]", err);
            return message.reply(target.value);
        }
    });
};