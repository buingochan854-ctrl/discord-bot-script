const supabase = require("../database/supabase");
const { cleanKeyName } = require("../utils/helpers");
const keyChannelCache = require("../cache/keyChannelCache");

module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        // Bỏ qua tin nhắn từ bot
        if (message.author.bot) return;

        // Bỏ qua tin nhắn không có nội dung
        if (!message.content) return;

        const content = message.content.trim();
        const searchName = cleanKeyName(content);

        // Lấy tất cả keys từ database
        const { data, error } = await supabase
            .from("keys")
            .select("name, value");

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        if (!data || data.length === 0) return;

        // Tìm key bằng cleanKeyName để không phân biệt hoa/thường
        const target = data.find(x => cleanKeyName(x.name) === searchName);

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

            if (!result.allowed) {
                return message.reply(result.message);
            }

            // Cho phép
            return message.reply(target.value);

        } catch (err) {
            console.error("Key Check Error:", err);
            // Fallback: vẫn trả key nếu có lỗi
            return message.reply(target.value);
        }
    });
};