const providers = require("./providers");
const downloadFile = require("./downloadFile");

async function download(url) {

    let result;

    if (url.includes("tiktok.com")) {
        result = await providers.tiktok(url);
    }

    else if (url.includes("youtube")) {
        result = await providers.youtube(url);
    }

    else if (url.includes("facebook")) {
        result = await providers.facebook(url);
    }

    else if (url.includes("instagram")) {
        result = await providers.instagram(url);
    }

    else if (url.includes("capcut")) {
        result = await providers.capcut(url);
    }

    else {
        throw new Error("Platform không hỗ trợ.");
    }

    if (!result.success) return result;

    const filename = `${Date.now()}.mp4`;

    const file = await downloadFile(
        result.url,
        filename
    );

    result.file = file;

    return result;

}

module.exports = download;