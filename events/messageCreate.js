// ===== DEBUG: Log khi file được require =====
console.log("📦 messageCreate.js loaded");

const supabase = require("../database/supabase");
const { cleanKeyName } = require("../utils/helpers");
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
        const searchName = cleanKeyName(content);

        // ===== DEBUG LOG 2: Kiểm tra searchName =====
        console.log(`[QUERY] Searching key: "${searchName}"`);

        const { data, error } = await supabase
            .from("keys")
            .select("name, value");

        if (error) {
            console.error("[Supabase Error]", error);
            return;
        }

        if (!data || data.length === 0) {
            console.log("[DEBUG] No keys found in database");
            return;
        }

        // ===== DEBUG LOG 3: Kiểm tra data từ Supabase =====
        console.log("[DATA]", data.map(x => x.name));

        // Tìm key bằng cleanKeyName
        const target = data.find(x => cleanKeyName(x.name) === searchName);

        // ===== DEBUG LOG 4: Kiểm tra target =====
        console.log("[TARGET]", target ? target.name : "NOT FOUND");

        if (!target) return;

        // Kiểm tra permission bằng cache
        try {
            const result = keyChannelCache.checkPermission(
                target.name,
                message.channel.id,
                message.guild.id
            );

            // ===== DEBUG LOG 5: Kiểm tra permission =====
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