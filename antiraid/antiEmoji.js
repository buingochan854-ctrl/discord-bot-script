const config = require("./config");
const hasPermission = require("./permissions");
const log = require("./logger");

module.exports = async function(message){

    if(!message.guild) return false;

    if(hasPermission(message.member))
        return false;

    const unicode =
        message.content.match(
            /[\u{1F300}-\u{1FAFF}]/gu
        ) || [];

    const custom =
        message.content.match(
            /<a?:\w+:\d+>/g
        ) || [];

    const total =
        unicode.length +
        custom.length;

    if(total < config.EMOJI.MAX)
        return false;

    try{

        await message.delete().catch(()=>{});

        await log(

            message,

            "Emoji Spam",

            `${total} emoji`

        );

    }catch{}

    return true;

};