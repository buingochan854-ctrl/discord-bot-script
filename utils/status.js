const { ActivityType } = require("discord.js");
const keyCache = require("../cache/keyCache");

// Hàm lấy thời gian Việt Nam
function getVietnamTime() {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh"
    }));
}

// Hàm lấy tên thứ trong tuần
function getWeekday(date) {
    const weekdays = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return weekdays[date.getDay()];
}

// Hàm format giờ: HH:MM:SS
function getTime(date) {
    return date.toLocaleTimeString("vi-VN", { hour12: false });
}

// Hàm format ngày: DD/MM/YYYY
function getDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Cập nhật trạng thái bot
async function updateBotStatus(client) {
    try {
        const count = keyCache.size();
        const ping = Math.round(client.ws.ping);
        
        const vn = getVietnamTime();
        const day = getWeekday(vn);
        const time = getTime(vn);
        const date = getDate(vn);

        // Định dạng: 226 Keys • 18 ms • Thứ 4 • 15:30:45 • 23/07/2026
        const activityText = `${count} Keys • ${ping} ms | 🇻🇳 ${day} • ${time} • ${date}`;

        await client.user.setActivity(activityText, {
            type: ActivityType.Watching
        });
    } catch (err) {
        console.error("[Status Update Error]", err);
    }
}

// Hàm khởi tạo status update
function startStatusUpdater(client, intervalMs = 15000) {
    // Cập nhật lần đầu sau 3 giây
    setTimeout(() => {
        updateBotStatus(client);
    }, 3000);

    // Cập nhật định kỳ
    setInterval(() => {
        updateBotStatus(client);
    }, intervalMs);

    console.log(`[Status] Updater started, interval: ${intervalMs}ms`);
}

// Hàm cập nhật nhanh
function quickUpdate(client) {
    setImmediate(() => updateBotStatus(client));
}

module.exports = {
    updateBotStatus,
    startStatusUpdater,
    quickUpdate,
    getVietnamTime,
    getWeekday,
    getTime,
    getDate
};