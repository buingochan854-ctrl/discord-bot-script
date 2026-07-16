const { ActivityType } = require("discord.js");
const keyCache = require("../cache/keyCache");

async function updateBotStatus(client) {
    try {
        const count = keyCache.size();
        const ping = Math.round(client.ws.ping);

        await client.user.setActivity(`${count} Keys • ${ping} ms`, {
            type: ActivityType.Watching
        });
    } catch (err) {
        console.error("[Status Update Error]", err);
    }
}

module.exports = { updateBotStatus };