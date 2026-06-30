const YTDlpWrap = require("yt-dlp-wrap").default;

const ytDlp = new YTDlpWrap();

/**
 * Lấy metadata video
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function getMetadata(url) {

    const json = await ytDlp.getVideoInfo(url);

    return {

        title: json.title || "Unknown",

        uploader: json.uploader || json.channel || "Unknown",

        duration: json.duration || 0,

        thumbnail:
            json.thumbnail ||
            (json.thumbnails
                ? json.thumbnails.at(-1)?.url
                : null),

        webpage_url: json.webpage_url || url,

        filesize:
            json.filesize ||
            json.filesize_approx ||
            0,

        ext: json.ext || "mp4",

        id: json.id,

        width: json.width,

        height: json.height

    };

}

module.exports = {
    getMetadata
}; 
