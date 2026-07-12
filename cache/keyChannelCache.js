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
        
        // ===== DEBUG CACHE =====
        console.log(`[KeyChannel] ✅ Loaded ${cache.length} rules`);
        console.log(`[KeyChannel] Normal: ${cache.filter(r => r.mode === 'normal' || !r.mode).length}`);
        console.log(`[KeyChannel] Suffix: ${cache.filter(r => r.mode === 'suffix').length}`);
        
        if (cache.length > 0) {
            console.log(`[KeyChannel] Sample rules:`, cache.slice(0, 3).map(r => ({
                mode: r.mode || 'normal',
                name: r.name,
                end: r.end
            })));
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
    if (!cache || cache.length === 0) {
        console.log("[findRule] Cache empty");
        return null;
    }

    // Chuẩn hóa key name
    const key = keyName.toLowerCase();
    
    // ===== DEBUG =====
    console.log(`[findRule] Searching for: "${key}"`);
    console.log(`[findRule] Cache size: ${cache.length}`);

    for (const rule of cache) {
        // =========================================
        // MODE: SUFFIX - Kiểm tra hậu tố
        // =========================================
        if (rule.mode === "suffix") {
            // Kiểm tra key kết thúc bằng hậu tố (không phân biệt hoa/thường)
            const endsWithSuffix = key.endsWith(rule.end.toLowerCase());
            if (endsWithSuffix) {
                console.log(`[findRule] Found suffix rule: "${rule.end}" for key "${key}"`);
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

            console.log(`[findRule] Found normal rule: "${rule.name}" for key "${key}"`);
            return rule;
        }
    }

    console.log(`[findRule] No rule found for key: "${key}"`);
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
    console.log(`[checkPermission] Checking: "${keyName}" in channel ${channelId}, guild ${guildId}`);
    
    const rule = findRule(keyName);

    // Không có rule → cho phép sử dụng
    if (!rule) {
        console.log(`[checkPermission] No rule, allowing`);
        return { allowed: true };
    }

    console.log(`[checkPermission] Found rule:`, {
        mode: rule.mode,
        name: rule.name,
        end: rule.end,
        guild_id: rule.guild_id,
        channel_id: rule.channel_id
    });

    // Kiểm tra Guild
    if (rule.guild_id && guildId !== rule.guild_id) {
        console.log(`[checkPermission] Guild mismatch: ${guildId} !== ${rule.guild_id}`);
        return {
            allowed: false,
            message: rule.value || `❌ Key \`${keyName}\` không được phép sử dụng trong server này.`
        };
    }

    // Kiểm tra Channel
    if (channelId !== rule.channel_id) {
        console.log(`[checkPermission] Channel mismatch: ${channelId} !== ${rule.channel_id}`);
        return {
            allowed: false,
            message: rule.value || `❌ Key \`${keyName}\` không được phép sử dụng trong kênh này.`
        };
    }

    // Cho phép
    console.log(`[checkPermission] Allowed`);
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