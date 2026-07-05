const config = require("./config");
const hasPermission = require("./permissions");
const log = require("./logger");

module.exports = async function(message){

    if(!message.guild) return false;

if (

    config.IGNORE_CHANNELS.includes(
        message.channel.id
    )

) return false;

    if(hasPermission(message.member))
        return false;

    const mentions =
        message.mentions.users.size +
        message.mentions.roles.size;

    if(mentions < config.MENTION.MAX)
        return false;

    try{

        await message.delete().catch(()=>{});

        await log(

            message,

            "Mention Spam",

            `${mentions} lượt mention`

        );

    }catch{}

    return true;

};