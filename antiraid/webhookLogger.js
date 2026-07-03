const {

    EmbedBuilder

} = require("discord.js");

const config = require("./config");

module.exports = async function(

    message,

    level,

    reason

){

    try{

        const channel =

        message.guild.channels.cache.get(

            config.LOG_CHANNEL

        );

        if(!channel)

            return;

        const embed =

        new EmbedBuilder()

        .setColor(

            level===3

            ?"Red"

            :

            level===2

            ?"Orange"

            :

            "Yellow"

        )

        .setTitle("🛡 Webhook Protection")

        .addFields(

            {

                name:"Webhook",

                value:

                message.author.username,

                inline:true

            },

            {

                name:"Level",

                value:

                level.toString(),

                inline:true

            },

            {

                name:"Reason",

                value:reason

            },

            {

                name:"Channel",

                value:

                `${message.channel}`

            }

        )

        .setTimestamp();

        await channel.send({

            embeds:[embed]

        });

    }

    catch(err){

        console.error(err);

    }

}