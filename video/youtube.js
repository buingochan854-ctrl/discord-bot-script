const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const config = require("../config");

module.exports = async (message, url) => {

    const folder = path.resolve(config.DOWNLOAD_FOLDER);

    if (!fs.existsSync(folder))
        fs.mkdirSync(folder, { recursive: true });

    const output = path.join(
        folder,
        `${Date.now()}.mp4`
    );

    const compressed = output.replace(".mp4", "_compressed.mp4");

    const loading = await message.reply("📥 Đang lấy thông tin video...");

    let retry = 0;

    download();

    function download() {

        loading.edit(
            `📥 Đang tải video...\nLần thử: ${retry + 1}/${config.MAX_RETRY}`
        ).catch(() => {});

        const yt = spawn("yt-dlp", [
            "-f",
            config.DEFAULT_FORMAT,
            "--merge-output-format",
            "mp4",
            "-o",
            output,
            url
        ]);

        yt.stderr.on("data", data => {

            console.log("[YT-DLP]", data.toString());

        });

        yt.on("error", err => {

            console.error(err);

        });

        yt.on("close", code => {

            if (code !== 0) {

                retry++;

                if (retry < config.MAX_RETRY)
                    return download();

                return loading.edit("❌ Không thể tải video.");

            }

            if (!fs.existsSync(output))
                return loading.edit("❌ Không tìm thấy video.");

            sendVideo(output);

        });

    }

    function sendVideo(file) {

        const size =
            fs.statSync(file).size / 1024 / 1024;

        if (size <= config.MAX_UPLOAD_MB) {

            return message.reply({

                files: [file]

            }).then(() => {

                finish(file);

            }).catch(err => {

                console.error(err);

                loading.edit("❌ Không thể gửi video.");

            });

        }

        if (!config.COMPRESS_VIDEO) {

            finish(file);

            return loading.edit(
                `⚠️ Video quá lớn.\n${url}`
            );

        }

        loading.edit("🎞️ Đang nén video...").catch(()=>{});

        const ff = spawn("ffmpeg", [

            "-i",
            file,

            "-vf",
            `scale=-2:${config.MAX_HEIGHT}`,

            "-b:v",
            config.VIDEO_BITRATE,

            "-b:a",
            config.AUDIO_BITRATE,

            "-preset",
            config.FFMPEG_PRESET,

            "-y",

            compressed

        ]);

        ff.stderr.on("data", data => {

            console.log("[FFMPEG]", data.toString());

        });

        ff.on("close", () => {

            if (!fs.existsSync(compressed)) {

                finish(file);

                return loading.edit(
                    `⚠️ Không thể nén video.\n${url}`
                );

            }

            const newSize =
                fs.statSync(compressed).size /
                1024 /
                1024;

            if (newSize > config.MAX_UPLOAD_MB) {

                finish(file);
                finish(compressed);

                return loading.edit(
                    `⚠️ Video vẫn vượt ${config.MAX_UPLOAD_MB}MB.\n${url}`
                );

            }

            message.reply({

                files: [compressed]

            }).then(() => {

                finish(file);
                finish(compressed);

                loading.delete().catch(()=>{});

            }).catch(err => {

                console.error(err);

                loading.edit(
                    `⚠️ Không thể gửi video.\n${url}`
                );

            });

        });

    }

    function finish(file) {

        if (
            config.DELETE_AFTER_SEND &&
            fs.existsSync(file)
        ) {

            fs.unlinkSync(file);

        }

    }

};