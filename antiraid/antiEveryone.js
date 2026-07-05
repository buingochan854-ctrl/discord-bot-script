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

    if(hasPermission(message.member)) return false;

    const content = message.content.toLowerCase();

    if(
        content.includes("@everyone") ||
        content.includes("@here")
    ){

        try{

            await message.delete().catch(()=>{});

            await log(

                message,

                "Everyone Mention",

                "Đã sử dụng @everyone hoặc @here"

            );

        }

        catch{}

        return true;

    }

    return false;

}
