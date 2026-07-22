const { ActivityType } = require("discord.js");
const keyCache = require("../cache/keyCache");

function getVNTime() {
    return new Date().toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour12: false
    });
}

function getVNDay() {
    const days = [
        "Chủ Nhật",
        "Thứ 2",
        "Thứ 3",
        "Thứ 4",
        "Thứ 5",
        "Thứ 6",
        "Thứ 7"
    ];

    return days[new Date().getDay()];
}

async function updateBotStatus(client) {
    try {
        const count = keyCache.size();
        const ping = Math.round(client.ws.ping);

        await client.user.setActivity(
            `${count} Keys | ${ping}ms | 🇻🇳 ${getVNDay()} ${getVNTime()}`,
            {
                type: ActivityType.Watching
            }
        );
    } catch (err) {
        console.error("[Status Update Error]", err);
    }
}

module.exports = { updateBotStatus };