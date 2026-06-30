const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Nén video
 * @param {string} input Đường dẫn file gốc
 * @param {string} output Đường dẫn file sau khi nén
 */
function compressVideo(input, output) {
    return new Promise((resolve, reject) => {

        ffmpeg(input)

            // Video
            .videoCodec("libx264")
            .videoBitrate("700k")

            // Audio
            .audioCodec("aac")
            .audioBitrate("96k")

            // Tối ưu tốc độ
            .outputOptions([
                "-preset veryfast",
                "-movflags +faststart"
            ])

            .format("mp4")

            .on("end", () => {
                resolve(output);
            })

            .on("error", err => {
                reject(err);
            })

            .save(output);

    });
}

module.exports = {
    compressVideo
}; 
