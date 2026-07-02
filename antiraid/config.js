const { PermissionFlagsBits } = require("discord.js");

module.exports = {

    // ID kênh log
    LOG_CHANNEL: "ID_KENH_LOG",

    // Quyền được bỏ qua
    BYPASS: [
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageMessages
    ],

    // Anti Spam
    SPAM: {
        MAX_MESSAGES: 5,
        INTERVAL: 5000,
        TIMEOUT: 10 // phút
    },

    // Anti Duplicate
    DUPLICATE: {
        MAX_MESSAGES: 3,
        INTERVAL: 10000
    },

    // Anti Mention
    MENTION: {
        MAX: 5
    },

    // Anti Emoji
    EMOJI: {
        MAX: 25
    },

    // Anti Caps
    CAPS: {
        PERCENT: 80
    },

    // Anti Repeat
    REPEAT: {
        MAX_REPEAT: 12
    }

};