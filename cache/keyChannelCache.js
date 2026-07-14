const supabase = require("../database/supabase");
const { cleanKeyName } = require("../utils/helpers");

// Sử dụng Map để tra cứu O(1)
const keyCache = new Map();
let lastUpdate = null;

/**
 * Tải toàn bộ keys từ Supabase vào cache
 */
async function load() {
    const { data, error } = await supabase
        .from("keys")
        .select("name, value");

    if (error) {
        console.error("[Key Cache] Load error:", error);
        return false;
    }

    keyCache.clear();
    for (const row of data) {
        const cleanName = cleanKeyName(row.name);
        keyCache.set(cleanName, row);
    }

    lastUpdate = new Date();
    console.log(`[Key Cache] ✅ Loaded ${keyCache.size} keys`);
    return true;
}

/**
 * Lấy key theo tên (không phân biệt hoa thường)
 */
function get(name) {
    const cleanName = cleanKeyName(name);
    return keyCache.get(cleanName) || null;
}

/**
 * Thêm hoặc cập nhật key trong cache
 */
function set(name, value) {
    const cleanName = cleanKeyName(name);
    keyCache.set(cleanName, { name, value });
}

/**
 * Xóa key khỏi cache
 */
function deleteKey(name) {
    const cleanName = cleanKeyName(name);
    keyCache.delete(cleanName);
}

/**
 * Lấy toàn bộ cache (dùng cho list)
 */
function getAll() {
    return Array.from(keyCache.values());
}

/**
 * Số lượng keys
 */
function size() {
    return keyCache.size;
}

/**
 * Reload cache từ DB
 */
async function reload() {
    return load();
}

module.exports = {
    load,
    get,
    set,
    deleteKey,
    getAll,
    size,
    reload
};