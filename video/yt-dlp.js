const youtubedl = require("youtube-dl-exec");
const path = require("path");
const fs = require("fs");

module.exports = async function download(url) {

    const downloadFolder = path.join(__dirname, "..", "downloads");

    if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder, {
            recursive: true
        });
    }

    const filename = `${Date.now()}.mp4`;

    const output = path.join(downloadFolder, filename);

    await youtubedl(url, {
        output,
        format: "bv*+ba/b",
        mergeOutputFormat: "mp4",
        noPlaylist: true
    });

    return {
        success: true,
        file: output
    };

};