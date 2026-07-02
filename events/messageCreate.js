const supabase = require("../database/supabase");
const { cleanKeyName } = require("../utils/helpers");

module.exports = (client) => {

    client.on("messageCreate", async (message) => {

        if (message.author.bot) return;

const text = message.content;

const regex =
/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/\S+/i;

if (regex.test(text)) {

    return downloadYoutube(
        message,
        text
    );

}

        // Lệnh ping
        if (message.content.toLowerCase() === ".ping") {

            try {

                const msg = await message.reply("🏓 Đang kiểm tra...");

                const apiPing = client.ws.ping;
                const botPing = msg.createdTimestamp - message.createdTimestamp;

                let status = "🟢 Ổn định";

                if (apiPing > 200) status = "🟡 Khá";
                if (apiPing > 500) status = "🔴 Chậm";

                await msg.edit({
                    content:
`🏓 **Pong!**

📡 API Ping: **${apiPing}ms**
⚡ Bot Ping: **${botPing}ms**
📶 Trạng thái: **${status}**

🤖 Bot: **${client.user.tag}**
🟢 Uptime: **${Math.floor(process.uptime())} giây**
💾 RAM: **${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB**`
                });

            } catch (err) {

                console.error("[Ping Command Error]", err);

            }

            return;
        }

        // Tìm key
        const searchName = cleanKeyName(message.content);

        if (!searchName) return;

        try {

            const { data, error } = await supabase
                .from("keys")
                .select("name, value");

            if (error) {

                console.error(error);
                return;

            }

            const target = data.find(
                x => cleanKeyName(x.name) === searchName
            );

            if (!target) return;

            await message.reply(target.value);

        } catch (err) {

            console.error(err);

        }

    });

};