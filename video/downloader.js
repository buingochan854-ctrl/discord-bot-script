const providers = require("./providers");
const downloadFile = require("./downloadFile");

async function download(url) {

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        return providers.youtube(url);
    }

    if (url.includes("tiktok.com")) {
        return providers.tiktok(url);
    }

    if (url.includes("facebook.com") || url.includes("fb.watch")) {
        return providers.facebook(url);
    }

    if (url.includes("instagram.com")) {
        return providers.instagram(url);
    }

    if (url.includes("capcut.com")) {
        return providers.capcut(url);
    }

    throw new Error("Platform không được hỗ trợ.");
}

module.exports = download;