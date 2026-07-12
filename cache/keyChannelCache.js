const supabase = require("../database/supabase");

let cache = [];

/**
 * Load rules từ Supabase
 */
async function load() {
    try {
        const { data, error } = await supabase
            .from("key_channels")
            .select("*");

        if (error) {
            console.error("[KeyChannel Cache]", error);
            return false;
        }

        cache = (data || []).sort((a, b) => {
            if (b.name.length !== a.name.length) {
                return b.name.length - a.name.length;
            }

            if (a.end && !b.end) return -1;
            if (!a.end && b.end) return 1;

            return 0;
        });

        console.log(
            `[KeyChannel] Loaded ${cache.length} rules`
        );

        return true;

    } catch (err) {
        console.error("[KeyChannel Cache]", err);
        return false;
    }
}

/**
 * Reload cache
 */
async function reload() {
    return await load();
}

/**
 * Lấy toàn bộ cache
 */
function get() {
    return cache;
}

/**
 * Tìm rule phù hợp nhất
 */
function findRule(keyName) {

    if (!keyName) return null;

    for (const rule of cache) {

        if (!keyName.startsWith(rule.name))
            continue;

        if (rule.end) {

            if (!keyName.endsWith(rule.end))
                continue;

        } else {

            if (keyName !== rule.name)
                continue;

        }

        return rule;

    }

    return null;
}

/**
 * Kiểm tra quyền sử dụng key
 */
function checkPermission(
    keyName,
    channelId,
    guildId
) {

    const rule = findRule(keyName);

    // Không có rule -> cho phép
    if (!rule) {

        return {
            allowed: true
        };

    }

    // Sai Guild
    if (
        rule.guild_id &&
        guildId !== rule.guild_id
    ) {

        return {

            allowed: false,

            message:
                rule.value ||
                "❌ Key này không được phép sử dụng tại server này."

        };

    }

    // Sai Channel
    if (
        rule.channel_id &&
        channelId !== rule.channel_id
    ) {

        return {

            allowed: false,

            message:
                rule.value ||
                "❌ Key này chỉ được phép sử dụng tại kênh quy định."

        };

    }

    return {
        allowed: true
    };

}

/**
 * Thông tin cache
 */
function getInfo() {

    return {

        size: cache.length,

        rules: cache.map(rule => ({

            name: rule.name,

            end: rule.end,

            guild_id: rule.guild_id,

            channel_id: rule.channel_id

        }))

    };

}

/**
 * Xóa cache
 */
function clear() {

    cache = [];

}

module.exports = {

    load,

    reload,

    get,

    findRule,

    checkPermission,

    getInfo,

    clear

};