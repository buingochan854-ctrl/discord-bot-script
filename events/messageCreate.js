const supabase = require("../database/supabase");
const { cleanKeyName } = require("../utils/helpers");
const keyChannelCache = require("../cache/keyChannelCache");

module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        // Bỏ qua tin nhắn từ bot
        if (message.author.bot) return;

        // Bỏ qua tin nhắn không có nội dung
        if (!message.content) return;

        // ===== DEBUG LOG 1 =====
        console.log("[MESSAGE]", message.content);

        const content = message.content.trim();
        const searchName = cleanKeyName(content);

        // ===== DEBUG LOG 2 =====
        console.log("[SEARCH_NAME]", searchName);

        // Lấy tất cả keys từ database (KHÔNG dùng .eq())
        const { data, error } = await supabase
            .from("keys")
            .select("name, value");

        if (error) {
            console.error("[Supabase Error]", error);
            return;
        }

        if (!data || data.length === 0) {
            console.log("[DATA] No keys found in database");
            return;
        }

        // ===== DEBUG LOG 3 =====
        console.log("[DATA]", data.map(x => x.name));

        // Tìm key bằng cleanKeyName để không phân biệt hoa/thường
        const target = data.find(x => cleanKeyName(x.name) === searchName);

        // ===== DEBUG LOG 4 =====
        console.log("[TARGET]", target ? target.name : "NOT FOUND");

        if (!target) return;

        // =============================================
        // P4: Kiểm tra bằng Cache
        // =============================================
        try {
            // Kiểm tra permission bằng cache
            const result = keyChannelCache.checkPermission(
                target.name,
                message.channel.id,
                message.guild.id
            );

            // ===== DEBUG LOG 5 =====
            console.log("[PERMISSION]", result);

            if (!result.allowed) {
                return message.reply(result.message);
            }

            // Cho phép
            return message.reply(target.value);

        } catch (err) {
            console.error("[Key Check Error]", err);
            // Fallback: vẫn trả key nếu có lỗi
            return message.reply(target.value);
        }
    });
};