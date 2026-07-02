const {
    EmbedBuilder
} = require("discord.js");

const config = require("./config");

module.exports = async function(

    message,

    type,

    reason

) {

    try {

        const channel =
            message.guild.channels.cache.get(
                config.LOG_CHANNEL
            );

        if (!channel) return;

        const embed =
            new EmbedBuilder()

            .setColor("Red")

            .setTitle("🛡 Anti Raid")

            .addFields(

                {
                    name: "👤 Người dùng",
                    value: `${message.author.tag}`,
                    inline: true
                },

                {
                    name: "📛 Vi phạm",
                    value: type,
                    inline: true
                },

                {
                    name: "📍 Kênh",
                    value: `${message.channel}`,
                    inline: true
                },

                {
                    name: "📝 Nội dung",
                    value:
                    message.content.length > 1024
                        ? message.content.slice(0,1020)+"..."
                        : message.content || "*Không có*"
                },

                {
                    name: "📄 Chi tiết",
                    value: reason
                }

            )

            .setTimestamp();

        await channel.send({

            embeds: [embed]

        });

    }

    catch(err){

        console.error(err);

    }

}