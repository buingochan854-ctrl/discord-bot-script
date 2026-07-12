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

        // Sắp xếp theo độ dài name giảm dần để ưu tiên rule dài nhất
        cache = data.sort((a, b) => {
            // Ưu tiên rule có name dài hơn
            if (a.name.length !== b.name.length) {
                return b.name.length - a.name.length;
            }
            // Nếu cùng độ dài, ưu tiên rule có end (không null)
            if (a.end && !b.end) return -1;
            if (!a.end && b.end) return 1;
            return 0;
        });

        lastUpdate = new Date();
        console.log(`[KeyChannel] ✅ Loaded ${cache.length} rules`);
        
        // Debug: In ra cache để kiểm tra
        if (cache.length > 0) {
            console.log(`[KeyChannel] First rule:`, {
                name: cache[0].name,
                end: cache[0].end,
                guild_id: cache[0].guild_id,
                channel_id: cache[0].channel_id
            });
        }
        
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
 * @param {string} keyName - Tên key cần kiểm tra
 * @returns {object|null} - Rule tìm thấy hoặc null
 */
function findRule(keyName) {
    if (!cache || cache.length === 0) return null;

    // Chuẩn hóa key name
    const key = cleanKeyName(keyName);
    
    for (const rule of cache) {
        // Chuẩn hóa rule name
        const ruleName = cleanKeyName(rule.name);
        
        // Key phải bắt đầu bằng rule.name (đã clean)
        if (!key.startsWith(ruleName)) continue;

        // Nếu rule có end, key phải kết thúc bằng end (đã clean)
        if (rule.end) {
            const ruleEnd = cleanKeyName(rule.end);
            if (!key.endsWith(ruleEnd)) continue;
        }

        // Tìm thấy rule phù hợp
        return rule;
    }

    return null;
}

/**
 * Kiểm tra permission cho key trong channel/guild cụ thể
 * @param {string} keyName - Tên key cần kiểm tra
 * @param {string} channelId - ID của kênh
 * @param {string} guildId - ID của server
 * @returns {object} - { allowed: boolean, message?: string }
 */
function checkPermission(keyName, channelId, guildId) {
    const rule = findRule(keyName);

    // Không có rule → cho phép sử dụng
    if (!rule) {
        return { allowed: true };
    }

    // Kiểm tra Guild
    if (rule.guild_id && guildId !== rule.guild_id) {
        return {
            allowed: false,
            message: rule.value || `❌ Key \`${keyName}\` không được phép sử dụng trong server này.`
        };
    }

    // Kiểm tra Channel
    if (channelId !== rule.channel_id) {
        return {
            allowed: false,
            message: rule.value || `❌ Key \`${keyName}\` không được phép sử dụng trong kênh này.`
        };
    }

    // Cho phép
    return { allowed: true };
}

/**
 * Lấy thông tin cache (debug)
 */
function getInfo() {
    return {
        size: cache.length,
        lastUpdate: lastUpdate,
        rules: cache.map(r => ({
            name: r.name,
            end: r.end,
            guild_id: r.guild_id,
            channel_id: r.channel_id
        }))
    };
}

/**
 * Xóa cache (cho test/debug)
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
    clear
};