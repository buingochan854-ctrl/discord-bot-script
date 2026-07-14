const supabase = require("../database/supabase");
const { cleanKeyName } = require("../utils/helpers");

let cache = [];
let lastUpdate = null;

/**
 * Tải dữ liệu từ Supabase vào cache
 */
async function load() {
    try {
        const { data, error } = await supabase
            .from("key_channels")
            .select("*");

        if (error) {
            console.error("[KeyChannel Cache] Load Error:", error);
            return false;
        }

        // Sắp xếp: ưu tiên normal trước, suffix sau, và name dài hơn
        cache = data.sort((a, b) => {
            if (a.mode === 'normal' && b.mode === 'suffix') return -1;
            if (a.mode === 'suffix' && b.mode === 'normal') return 1;
            if (a.name && b.name) {
                return b.name.length - a.name.length;
            }
            return 0;
        });

        lastUpdate = new Date();
        console.log(`[KeyChannel] ✅ Loaded ${cache.length} rules (${cache.filter(r => r.mode === 'normal' || !r.mode).length} normal, ${cache.filter(r => r.mode === 'suffix').length} suffix)`);
        return true;
    } catch (err) {
        console.error("[KeyChannel Cache] Fatal Error:", err);
        return false;
    }
}

/**
 * Reload cache (alias của load)
 */
async function reload() {
    console.log("[KeyChannel] Reloading cache...");
    return load();
}

/**
 * Lấy toàn bộ cache
 */
function get() {
    return cache;
}

/**
 * Tìm rule phù hợp nhất cho key
 */
function findRule(keyName) {
    if (!cache || cache.length === 0) return null;

    const key = keyName.toLowerCase();

    for (const rule of cache) {
        // MODE SUFFIX
        if (rule.mode === "suffix") {
            if (key.endsWith(rule.end.toLowerCase())) {
                return rule;
            }
            continue;
        }

        // MODE NORMAL
        if (rule.mode === "normal" || !rule.mode) {
            const ruleName = rule.name ? rule.name.toLowerCase() : '';
            if (!key.startsWith(ruleName)) continue;

            if (rule.end) {
                const ruleEnd = rule.end.toLowerCase();
                if (!key.endsWith(ruleEnd)) continue;
            } else {
                if (key !== ruleName) continue;
            }

            return rule;
        }
    }

    return null;
}

/**
 * Kiểm tra permission cho key trong channel/guild
 */
function checkPermission(keyName, channelId, guildId) {
    const rule = findRule(keyName);

    if (!rule) {
        return { allowed: true };
    }

    if (rule.guild_id && guildId !== rule.guild_id) {
        return {
            allowed: false,
            message: rule.value || `❌ Key \`${keyName}\` không được phép sử dụng trong server này.`
        };
    }

    if (channelId !== rule.channel_id) {
        return {
            allowed: false,
            message: rule.value || `❌ Key \`${keyName}\` không được phép sử dụng trong kênh này.`
        };
    }

    return { allowed: true };
}

/**
 * Lấy thông tin cache (debug)
 */
function getInfo() {
    return {
        size: cache.length,
        lastUpdate: lastUpdate,
        normalRules: cache.filter(r => r.mode === 'normal' || !r.mode).length,
        suffixRules: cache.filter(r => r.mode === 'suffix').length,
        rules: cache.map(r => ({
            mode: r.mode || 'normal',
            name: r.name,
            end: r.end,
            guild_id: r.guild_id,
            channel_id: r.channel_id
        }))
    };
}

/**
 * Thêm rule mới vào cache (không reload toàn bộ)
 */
function addRule(rule) {
    cache.push(rule);
    // Sắp xếp lại
    cache.sort((a, b) => {
        if (a.mode === 'normal' && b.mode === 'suffix') return -1;
        if (a.mode === 'suffix' && b.mode === 'normal') return 1;
        if (a.name && b.name) {
            return b.name.length - a.name.length;
        }
        return 0;
    });
    lastUpdate = new Date();
}

/**
 * Xóa rule khỏi cache
 */
function removeRule(name, end) {
    const index = cache.findIndex(r => {
        if (name && r.name === name) return true;
        if (end && r.end === end) return true;
        return false;
    });
    if (index !== -1) {
        cache.splice(index, 1);
        lastUpdate = new Date();
        return true;
    }
    return false;
}

/**
 * Xóa toàn bộ cache (debug)
 */
function clear() {
    cache = [];
    lastUpdate = null;
    console.log("[KeyChannel Cache] Cache cleared");
}

module.exports = {
    load,
    reload,
    get,
    findRule,
    checkPermission,
    getInfo,
    addRule,
    removeRule,
    clear
};