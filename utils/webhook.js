const { WebhookClient, EmbedBuilder } = require("discord.js");
const { truncateString } = require("./helpers");
const supabase = require("../database/supabase");

const logWebhook = process.env.KEY_LOG_WEBHOOK
    ? new WebhookClient({ url: process.env.KEY_LOG_WEBHOOK })
    : null;

async function sendKeyLog({
    action,
    user,
    guildName,
    key,
    oldValue = null,
    newValue = null,
    oldName = null,
    newName = null
}) {
    if (!logWebhook) return;

    try {
        let embedColor = 0x2B2D31;

        if (action === "Add Key")
            embedColor = 0x57F287;

        else if (action === "Edit Key")
            embedColor = 0xFEE75C;

        else if (action === "Delete Key")
            embedColor = 0xED4245;

        const { count } = await supabase
            .from("keys")
            .select("*", {
                count: "exact",
                head: true
            });

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setAuthor({
                name: user.tag,
                iconURL: user.displayAvatarURL({
                    dynamic: true
                })
            })
            .setDescription(
                `⏰ **Thời gian:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .addFields(
                {
                    name: "🛠 Hành động",
                    value: `**${action}**`,
                    inline: true
                },
                {
                    name: "👤 ID Người Dùng",
                    value: `\`${user.id}\``,
                    inline: true
                },
                {
                    name: "🏠 Server",
                    value: guildName,
                    inline: true
                },
                {
                    name: "🔑 Key",
                    value: `**${key || "Không rõ"}**`
                }
            );

        if (oldName)
            embed.addFields({
                name: "🏷️ Tên Cũ",
                value: oldName,
                inline: true
            });

        if (newName)
            embed.addFields({
                name: "🏷️ Tên Mới",
                value: newName,
                inline: true
            });

        if (oldValue)
            embed.addFields({
                name: "📄 Value Cũ",
                value:
                    "```lua\n" +
                    truncateString(oldValue) +
                    "\n```"
            });

        if (newValue)
            embed.addFields({
                name: "📄 Value Mới",
                value:
                    "```lua\n" +
                    truncateString(newValue) +
                    "\n```"
            });

        embed.addFields({
            name: "📊 Tổng Keys",
            value: `${count || 0} Keys`
        });

        embed.setFooter({
            text: "Auto Logs"
        });

        await logWebhook.send({
            embeds: [embed]
        });

    } catch (err) {
        console.error("[Webhook Error]", err);
    }
}

module.exports = {
    sendKeyLog
};