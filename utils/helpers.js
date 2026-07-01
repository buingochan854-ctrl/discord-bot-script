function cleanKeyName(str) {
    if (!str) return "";
    return str.trim().replace(/\s+/g, " ").toLowerCase();
}

function truncateString(str, max = 900) {
    if (!str) return "";

    if (str.length <= max) {
        return str;
    }

    return `${str.substring(0, max)}\n\n*... [Đã cắt bớt vì script quá dài (${str.length} ký tự)]*`;
}

module.exports = {
    cleanKeyName,
    truncateString
}; 
