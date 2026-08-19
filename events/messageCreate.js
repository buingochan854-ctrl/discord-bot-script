// ===== DEBUG =====
console.log("📦 messageCreate.js loaded");

const fs = require("fs");
const path = require("path");
const os = require("os");

const ytDlp = require("yt-dlp-exec");
const ffmpegPath = require("ffmpeg-static");

const keyCache = require("../cache/keyCache");
const keyChannelCache = require("../cache/keyChannelCache");

const LOADING_EMOJI = "<a:loading:1538771492681289828>";
const SUCCESS_EMOJI = "<:success:1518594913179013141>";
const FAILED_EMOJI = "<:failed:1518595211205283992>";

const MAX_DISCORD_FILE_SIZE = 25 * 1024 * 1024;

// ==============================
// YouTube URL
// ==============================

function getYouTubeUrl(content) {
    const regex =
        /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[\w-]+|shorts\/[\w-]+|live\/[\w-]+)|youtu\.be\/[\w-]+)/i;

    const match = content.match(regex);
    return match ? match[0] : null;
}

// ==============================
// Cookie
// ==============================

function createCookieFile() {
    const cookie = process.env.COOKIE_YT;

    if (!cookie) {
        console.log("[YT-DLP] ⚠️ COOKIE_YT chưa được cấu hình.");
        return null;
    }

    const cookiePath = path.join(os.tmpdir(), "cookies.txt");

    try {
        /*
         * COOKIE_YT có thể là nội dung Netscape cookie
         * hoặc được lưu dưới dạng một chuỗi nhiều dòng.
         */
        fs.writeFileSync(cookiePath, cookie, "utf8");

        console.log("[YT-DLP] ✅ Đã tạo cookies.txt");

        return cookiePath;
    } catch (err) {
        console.error("[YT-DLP] Cookie Error:", err);
        return null;
    }
}

// ==============================
// Format lỗi
// ==============================

function cleanError(error) {
    if (!error) return "Lỗi không xác định";

    let text = "";

    if (typeof error === "string") {
        text = error;
    } else {
        text =
            error.stderr ||
            error.stdout ||
            error.message ||
            String(error);
    }

    text = text
        .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
        .trim();

    if (text.length > 1500) {
        text = text.substring(0, 1500) + "...";
    }

    return text;
}

// ==============================
// Download YouTube
// ==============================

async function downloadYouTube(url) {
    const outputDir = path.join(os.tmpdir(), "youtube-downloads");

    fs.mkdirSync(outputDir, {
        recursive: true
    });

    const outputTemplate = path.join(
        outputDir,
        `video-${Date.now()}-%(id)s.%(ext)s`
    );

    const cookiePath = createCookieFile();

    console.log("[YT] ▶️ yt-dlp-exec:", url);

    try {
        const args = {
            noPlaylist: true,

            /*
             * Ưu tiên MP4.
             * Giới hạn 720p để giảm kích thước file.
             */
            format:
                "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best",

            output: outputTemplate,

            mergeOutputFormat: "mp4",

            noWarnings: true,

            ffmpegLocation: ffmpegPath
        };

        if (cookiePath) {
            args.cookies = cookiePath;
        }

        await ytDlp(url, args);

        const files = fs
            .readdirSync(outputDir)
            .map(file => ({
                name: file,
                path: path.join(outputDir, file),
                time: fs.statSync(path.join(outputDir, file)).mtimeMs
            }))
            .filter(file =>
                /\.(mp4|mkv|webm|mov)$/i.test(file.name)
            )
            .sort((a, b) => b.time - a.time);

        if (!files.length) {
            throw new Error("yt-dlp không tạo được file video.");
        }

        const video = files[0];

        console.log(
            `[YT] ✅ Download thành công: ${video.name}`
        );

        return video.path;

    } catch (error) {
        console.error(
            "[YT ERROR]",
            cleanError(error)
        );

        throw new Error(cleanError(error));
    }
}

// ==============================
// Xóa file
// ==============================

function deleteFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("[YT] 🗑️ Đã xóa:", filePath);
        }
    } catch (err) {
        console.error("[YT] Delete Error:", err);
    }
}

// ==============================
// Message Event
// ==============================

module.exports = (client) => {

    console.log("✅ messageCreate registered");

    client.on("messageCreate", async message => {

        try {

            // ==========================
            // DEBUG
            // ==========================

            console.log(
                `[MESSAGE] ${message.author.tag}: ${message.content}`
            );

            // ==========================
            // Bỏ qua bot
            // ==========================

            if (message.author.bot) {
                console.log("[DEBUG] Bot message, ignored");
                return;
            }

            if (!message.content) {
                console.log("[DEBUG] Empty content, ignored");
                return;
            }

            const content = message.content.trim();

            // ==================================================
            // YOUTUBE AUTO DETECT
            // ==================================================

            const youtubeUrl = getYouTubeUrl(content);

            if (youtubeUrl) {

                console.log(
                    `[YT] 🔎 Phát hiện YouTube: ${youtubeUrl}`
                );

                let loadingMessage = null;
                let videoPath = null;

                try {

                    // ==========================
                    // Loading
                    // ==========================

                    loadingMessage = await message.reply(
                        `${LOADING_EMOJI} Đang Tải Video`
                    );

                    // ==========================
                    // Download
                    // ==========================

                    videoPath = await downloadYouTube(
                        youtubeUrl
                    );

                    if (!videoPath || !fs.existsSync(videoPath)) {
                        throw new Error(
                            "Không tìm thấy file video sau khi tải."
                        );
                    }

                    const stat = fs.statSync(videoPath);

                    console.log(
                        `[YT] 📦 File size: ${stat.size} bytes`
                    );

                    // ==========================
                    // Discord limit
                    // ==========================

                    if (
                        stat.size >
                        MAX_DISCORD_FILE_SIZE
                    ) {

                        console.log(
                            "[YT] ⚠️ Video vượt giới hạn Discord."
                        );

                        if (loadingMessage) {
                            await loadingMessage.edit(
                                `${SUCCESS_EMOJI} <@${message.author.id}> Video của bạn quá lớn để gửi trực tiếp.\n\n` +
                                `**Youtube • Ấn vào đây để mở video**\n` +
                                `${youtubeUrl}`
                            );
                        }

                        deleteFile(videoPath);

                        return;
                    }

                    // ==========================
                    // Upload MP4
                    // ==========================

                    if (loadingMessage) {
                        await loadingMessage.edit({
                            content:
                                `${SUCCESS_EMOJI} <@${message.author.id}> Video của bạn:`,
                            files: [
                                {
                                    attachment: videoPath,
                                    name: "video.mp4"
                                }
                            ]
                        });
                    } else {

                        await message.reply({
                            content:
                                `${SUCCESS_EMOJI} <@${message.author.id}> Video của bạn:`,
                            files: [
                                {
                                    attachment: videoPath,
                                    name: "video.mp4"
                                }
                            ]
                        });

                    }

                    console.log(
                        "[YT] ✅ Đã gửi video cho user."
                    );

                } catch (error) {

                    console.error(
                        "[YT ERROR]",
                        error
                    );

                    const errorText =
                        cleanError(error);

                    const errorMessage =
                        `${FAILED_EMOJI} Lỗi khi tải: \`${errorText}\``;

                    try {

                        if (loadingMessage) {

                            await loadingMessage.edit({
                                content: errorMessage
                            });

                        } else {

                            await message.reply(
                                errorMessage
                            );

                        }

                    } catch (replyError) {

                        console.error(
                            "[YT] Không thể gửi lỗi:",
                            replyError
                        );

                    }

                } finally {

                    // ==========================
                    // Cleanup
                    // ==========================

                    if (videoPath) {
                        deleteFile(videoPath);
                    }

                }

                /*
                 * Rất quan trọng:
                 * Nếu message là YouTube thì không tiếp tục
                 * kiểm tra key.
                 */
                return;
            }

            // ==================================================
            // KEY SYSTEM
            // ==================================================

            console.log(
                `[QUERY] Searching key: "${content}"`
            );

            const target =
                keyCache.get(content);

            console.log(
                "[TARGET]",
                target ? target.name : "NOT FOUND"
            );

            if (!target) return;

            // ==========================
            // Permission
            // ==========================

            try {

                if (!message.guild) {
                    return message.reply(
                        target.value
                    );
                }

                const result =
                    keyChannelCache.checkPermission(
                        target.name,
                        message.channel.id,
                        message.guild.id
                    );

                console.log(
                    "[PERMISSION]",
                    result
                );

                if (!result.allowed) {
                    return message.reply(
                        result.message
                    );
                }

                return message.reply(
                    target.value
                );

            } catch (err) {

                console.error(
                    "[Key Check Error]",
                    err
                );

                return message.reply(
                    target.value
                );
            }

        } catch (err) {

            console.error(
                "[MESSAGE ERROR]",
                err
            );

        }

    });

};
