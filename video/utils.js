const fs = require("fs");

// Kiểm tra file có tồn tại không
function fileExists(file) {
    return fs.existsSync(file);
}

// Lấy dung lượng file (byte)
function getFileSize(file) {
    if (!fileExists(file)) return 0;
    return fs.statSync(file).size;
}

// Định dạng dung lượng
function formatSize(bytes) {
    if (!bytes || bytes <= 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;

    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }

    return `${bytes.toFixed(2)} ${units[i]}`;
}

// Xóa file an toàn
function deleteFile(file) {
    try {
        if (fileExists(file)) {
            fs.unlinkSync(file);
        }
    } catch (err) {
        console.error("[DELETE FILE]", err);
    }
}

// Thanh tiến trình
function progressBar(percent) {
    percent = Math.max(0, Math.min(100, percent));

    const total = 20;
    const done = Math.round(percent / 100 * total);

    return "█".repeat(done) + "░".repeat(total - done);
}

// Kiểm tra có phải link được hỗ trợ không
function isSupportedURL(url) {
    const sites = [
        "youtube.com",
        "youtu.be",
        "tiktok.com",
        "instagram.com",
        "facebook.com",
        "fb.watch",
        "reddit.com",
        "twitter.com",
        "x.com"
    ];

    return sites.some(site => url.includes(site));
}

module.exports = {
    fileExists,
    getFileSize,
    formatSize,
    deleteFile,
    progressBar,
    isSupportedURL
}; 
