const antiEveryone = require("./antiEveryone");
const antiSpam = require("./antiSpam");
const antiDuplicate = require("./antiDuplicate");
const antiMention = require("./antiMention");
const antiEmoji = require("./antiEmoji");
const antiCaps = require("./antiCaps");
const antiRepeat = require("./antiRepeat");

module.exports = async function(message){

    if(await antiEveryone(message)) return true;

    if(await antiSpam(message)) return true;

    if(await antiDuplicate(message)) return true;

    if(await antiMention(message)) return true;

    if(await antiEmoji(message)) return true;

    if(await antiCaps(message)) return true;

    if(await antiRepeat(message)) return true;

    return false;

}