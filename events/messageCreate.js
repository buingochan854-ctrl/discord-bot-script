const supabase = require("../database/supabase");
const { cleanKeyName } = require("../utils/helpers");
const keyChannelCache = require("../cache/keyChannelCache");

module.exports = (client) => {

    client.on("messageCreate", async (message) => {

        // Bỏ qua bot
        if (message.author.bot) return;

        // Chỉ hoạt động trong server
        if (!message.guild) return;

        // Không có nội dung
        if (!message.content) return;

        const searchName = cleanKeyName(
            message.content.trim()
        );

        if (!searchName) return;

        try {

            // ===========================
            // TÌM KEY
            // ===========================

            const { data: target, error } = await supabase
                .from("keys")
                .select("name,value")
                .eq("name", searchName)
                .maybeSingle();

            if (error) {
                console.error("[Keys]", error);
                return;
            }

            if (!target)
                return;

            // ===========================
            // KIỂM TRA KEY CHANNEL
            // ===========================

            const result =
                keyChannelCache.checkPermission(

                    target.name,

                    message.channel.id,

                    message.guild.id

                );

            if (!result.allowed) {

                return message.reply(
                    result.message
                );

            }

            // ===========================
            // TRẢ KEY
            // ===========================

            return message.reply(
                target.value
            );

        } catch (err) {

            console.error(
                "[MessageCreate]",
                err
            );

        }

    });

};