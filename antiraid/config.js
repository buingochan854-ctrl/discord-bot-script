const { PermissionFlagsBits } = require("discord.js");

module.exports = {

    // ==========================
    // Kênh log Anti Raid
    // ==========================

    LOG_CHANNEL: "1509791922057642049",

    // ==========================
    // Những kênh KHÔNG áp dụng Anti
    // ==========================

    IGNORE_CHANNELS: [

        "1518957150628745287"

    ],

    // ==========================
    // Bypass permissions
    // ==========================

    BYPASS: [

        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ModerateMembers

    ],

    // ==========================
    // Anti Spam Members
    // ==========================

    SPAM: {

        MAX_MESSAGES: 5,

        INTERVAL: 5000,

        MUTE_TIME: 10 * 60 * 1000

    },

    // ==========================
    // Anti Duplicate Members
    // ==========================

    DUPLICATE: {

        MAX_DUPLICATE: 3,

        INTERVAL: 10000

    },

    // ==========================
    // Anti Mention
    // ==========================

    MENTION: {

        MAX_EVERYONE: 1,

        MAX_HERE: 1,

        MAX_ROLE: 3,

        MAX_USER: 10

    },

    // ==========================
    // Anti Webhook
    // ==========================

    WEBHOOK: {

        // Spam tốc độ

        MAX_MESSAGES: 8,

        INTERVAL: 5000,

        // Spam nội dung

        MAX_DUPLICATE: 3,

        // Sau bao lâu reset cảnh báo

        RESET_WARN: 30 * 60 * 1000,

        // Lần thứ mấy thì xóa webhook

        DELETE_LEVEL: 3

    }

};
