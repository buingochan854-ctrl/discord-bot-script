const supabase = require("../database/supabase");

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

        // Sắp xếp: ưu tiên rule mode=normal trước, sau đó mode=suffix
        cache = data.sort((a, b) => {
            // Ưu tiên mode normal trước
            if (a.mode === 'normal' && b.mode === 'suffix') return -1;
            if (a.mode === 'suffix' && b.mode === 'normal') return 1;
            
            // Nếu cùng mode, ưu tiên rule có name dài hơn
            if (a.name && b.name) {
                return b.name.length - a.name.length;
            }
            
            return 0;
        });

        lastUpdate = new Date();
        console.log(`[KeyChannel] ✅ Loaded ${cache.length} rules (${cache.filter(r => r.mode === 'normal').length} normal, ${cache.filter(r => r.mode === 'suffix').length} suffix)`);
        
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
    const key = keyName.toLowerCase();

    for (const rule of cache) {
        // =========================================
        // MODE: SUFFIX - Kiểm tra hậu tố
        // =========================================
        if (rule.mode === "suffix") {
            // Kiểm tra key kết thúc bằng hậu tố (không phân biệt hoa/thường)
            if (key.endsWith(rule.end.toLowerCase())) {
                return rule;
            }
            continue;
        }

        // =========================================
        // MODE: NORMAL - Kiểm tra tên key
        // =========================================
        if (rule.mode === "normal" || !rule.mode) {
            // Chuẩn hóa rule name
            const ruleName = rule.name ? rule.name.toLowerCase() : '';
            
            // Key phải bắt đầu bằng rule.name
            if (!key.startsWith(ruleName)) continue;

            // Nếu rule có end, key phải kết thúc bằng end
            if (rule.end) {
                const ruleEnd = rule.end.toLowerCase();
                if (!key.endsWith(ruleEnd)) continue;
            } else {
                // Nếu không có end, key phải khớp chính xác với rule.name
                if (key !== ruleName) continue;
            }

            // Tìm thấy rule phù hợp
            return rule;
        }
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