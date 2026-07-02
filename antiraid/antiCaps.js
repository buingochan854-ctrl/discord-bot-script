const config = require("./config");
const hasPermission = require("./permissions");
const log = require("./logger");

module.exports = async function(message){

    if(!message.guild) return false;

    if(hasPermission(message.member))
        return false;

    const letters =
        message.content.match(/[A-Za-z]/g);

    if(!letters)
        return false;

    if(letters.length < 10)
        return false;

    const upper =
        message.content.match(/[A-Z]/g) || [];

    const percent =
        (upper.length / letters.length) * 100;

    if(percent < config.CAPS.PERCENT)
        return false;

    try{

        await message.delete().catch(()=>{});

        await log(

            message,

            "Caps Spam",

            `${Math.round(percent)}% chữ in hoa`

        );

    }catch{}

    return true;

};