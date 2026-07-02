const config = require("./config");
const hasPermission = require("./permissions");
const log = require("./logger");

module.exports = async function(message){

    if(!message.guild) return false;

    if(hasPermission(message.member))
        return false;

    const max =
        config.REPEAT.MAX_REPEAT;

    const regex =
        new RegExp(`(.)\\1{${max},}`);

    if(!regex.test(message.content))
        return false;

    try{

        await message.delete().catch(()=>{});

        await log(

            message,

            "Repeat Characters",

            "Ký tự lặp quá nhiều"

        );

    }catch{}

    return true;

};