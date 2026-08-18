// =====================================================
// messageCreate.js
// Key System + KeyChannel + YouTube Downloader
// =====================================================

console.log("📦 messageCreate.js loaded");

const fs = require("fs");
const path = require("path");
const ytDlp = require("yt-dlp-exec");

const keyCache = require("../cache/keyCache");
const keyChannelCache = require("../cache/keyChannelCache");

// =====================================================
// CONFIG
// =====================================================

const LOADING = "<a:loading:1538771492681289828>";
const SUCCESS = "<:success:1518594913179013141>";
const FAILED = "<:failed:1518595211205283992>";

const COOKIE_FILE = "/tmp/cookies.txt";
const DOWNLOAD_DIR = "/tmp/yt-downloads";

// =====================================================
// COOKIE_YT
// =====================================================

function prepareCookie() {
    try {
        const cookie = process.env.COOKIE_YT;

        if (!cookie) {
            console.log("[YT-DLP] ⚠️ COOKIE_YT chưa được cấu hình");
            return false;
        }

        fs.writeFileSync(
            COOKIE_FILE,
            cookie,
            {
                encoding: "utf8",
                mode: 0o600
            }
        );

        console.log("[YT-DLP] ✅ Đã tạo cookies.txt từ COOKIE_YT");

        return true;
    } catch (error) {
        console.error(
            "[YT-DLP] Cookie error:",
            error
        );

        return false;
    }
}

// =====================================================
// YOUTUBE URL DETECTOR
// =====================================================

function getYouTubeUrl(content) {
    const regex =
        /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[\w-]+|shorts\/[\w-]+|live\/[\w-]+)|youtu\.be\/[\w-]+)(?:[^\s<>]*)?/i;

    const match = content.match(regex);

    if (!match) {
        return null;
    }

    return match[0].replace(/[)>.,]+$/, "");
}

// =====================================================
// DOWNLOAD YOUTUBE
// =====================================================

async function downloadYouTube(url) {

    if (!prepareCookie()) {
        throw new Error(
            "COOKIE_YT chưa được cấu hình trên Railway"
        );
    }

    fs.mkdirSync(
        DOWNLOAD_DIR,
        {
            recursive: true
        }
    );

    const output = path.join(
        DOWNLOAD_DIR,
        `${Date.now()}-%(id)s.%(ext)s`
    );

    console.log(
        "[YT-DLP] ▶️ yt-dlp:",
        url
    );

    console.log(
        "[YT-DLP] 📁 Output:",
        output
    );

    try {

        // Không dùng spawn("yt-dlp")
        // yt-dlp-exec sẽ quản lý executable
        const subprocess = ytDlp(url, {

            cookies: COOKIE_FILE,

            noPlaylist: true,

            format:
                "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",

            mergeOutputFormat: "mp4",

            output: output,

            noPart: true,

            noWarnings: true,

            preferFreeFormats: false
        });

        let stderr = "";

        if (subprocess.stdout) {
            subprocess.stdout.on(
                "data",
                data => {
                    console.log(
                        `[YT-DLP] ${data.toString().trim()}`
                    );
                }
            );
        }

        if (subprocess.stderr) {
            subprocess.stderr.on(
                "data",
                data => {

                    const text =
                        data.toString();

                    stderr += text;

                    console.log(
                        `[YT-DLP] ${text.trim()}`
                    );
                }
            );
        }

        await subprocess;

    } catch (error) {

        console.error(
            "[YT-DLP] Process error:",
            error
        );

        throw new Error(
            error?.message ||
            "yt-dlp không thể tải video"
        );
    }

    // =================================================
    // FIND DOWNLOADED FILE
    // =================================================

    let files;

    try {

        files = fs
            .readdirSync(DOWNLOAD_DIR)
            .filter(file =>
                file.endsWith(".mp4") ||
                file.endsWith(".mkv") ||
                file.endsWith(".webm")
            )
            .map(file => {

                const filePath =
                    path.join(
                        DOWNLOAD_DIR,
                        file
                    );

                return {
                    path: filePath,
                    time:
                        fs.statSync(
                            filePath
                        ).mtimeMs
                };
            })
            .sort(
                (a, b) =>
                    b.time - a.time
            );

    } catch (error) {

        throw new Error(
            "Không thể đọc file video sau khi tải"
        );
    }

    if (!files.length) {

        throw new Error(
            "yt-dlp đã chạy nhưng không tìm thấy file video"
        );
    }

    const videoPath =
        files[0].path;

    console.log(
        "[YT-DLP] ✅ Download:",
        videoPath
    );

    return videoPath;
}

// =====================================================
// DELETE FILE
// =====================================================

function deleteFile(filePath) {

    if (!filePath) {
        return;
    }

    try {

        if (
            fs.existsSync(
                filePath
            )
        ) {

            fs.unlinkSync(
                filePath
            );

            console.log(
                "[YT-DLP] 🗑️ Đã xóa file tạm:",
                filePath
            );
        }

    } catch (error) {

        console.error(
            "[YT-DLP] Delete error:",
            error
        );
    }
}

// =====================================================
// CLEAN ERROR
// =====================================================

function cleanError(error) {

    let text =
        error?.message ||
        String(error);

    // Xóa ANSI color
    text = text.replace(
        /\x1B\[[0-?]*[ -/]*[@-~]/g,
        ""
    );

    text = text
        .replace(/\s+/g, " ")
        .trim();

    if (text.length > 800) {
        text =
            text.substring(0, 800) +
            "...";
    }

    return text;
}

// =====================================================
// MESSAGE CREATE
// =====================================================

module.exports = (client) => {

    console.log(
        "✅ messageCreate registered"
    );

    client.on(
        "messageCreate",
        async message => {

            try {

                // =================================================
                // DEBUG
                // =================================================

                console.log(
                    `[MESSAGE] ${message.author.tag}: ${message.content}`
                );

                // =================================================
                // IGNORE BOT
                // =================================================

                if (message.author.bot) {

                    console.log(
                        "[DEBUG] Bot message, ignored"
                    );

                    return;
                }

                // =================================================
                // EMPTY MESSAGE
                // =================================================

                if (!message.content) {

                    console.log(
                        "[DEBUG] Empty content, ignored"
                    );

                    return;
                }

                const content =
                    message.content.trim();

                // =================================================
                // YOUTUBE DETECTION
                // =================================================

                const youtubeUrl =
                    getYouTubeUrl(
                        content
                    );

                if (youtubeUrl) {

                    console.log(
                        `[YT] 🔎 Phát hiện YouTube: ${youtubeUrl}`
                    );

                    let loadingMessage =
                        null;

                    let videoPath =
                        null;

                    try {

                        // =========================================
                        // LOADING MESSAGE
                        // =========================================

                        loadingMessage =
                            await message.reply(
                                `${LOADING} Đang Tải Video`
                            );

                        // =========================================
                        // DOWNLOAD
                        // =========================================

                        videoPath =
                            await downloadYouTube(
                                youtubeUrl
                            );

                        // =========================================
                        // CHECK FILE
                        // =========================================

                        if (
                            !videoPath ||
                            !fs.existsSync(
                                videoPath
                            )
                        ) {

                            throw new Error(
                                "Không tìm thấy video sau khi tải"
                            );
                        }

                        const stats =
                            fs.statSync(
                                videoPath
                            );

                        const sizeMB =
                            stats.size /
                            1024 /
                            1024;

                        console.log(
                            `[YT-DLP] 📦 File size: ${sizeMB.toFixed(2)} MB`
                        );

                        // =========================================
                        // SEND VIDEO
                        // =========================================

                        try {

                            await message.reply({
                                content:
                                    `${SUCCESS} ${message.author} Video của bạn:`,
                                files: [
                                    {
                                        attachment:
                                            videoPath,

                                        name:
                                            path.basename(
                                                videoPath
                                            )
                                    }
                                ]
                            });

                            // Xóa loading
                            if (
                                loadingMessage
                            ) {

                                await loadingMessage
                                    .delete()
                                    .catch(
                                        () => {}
                                    );
                            }

                            console.log(
                                "[YT-DLP] ✅ Gửi video thành công"
                            );

                        } catch (uploadError) {

                            // =====================================
                            // DISCORD FILE TOO LARGE
                            // =====================================

                            console.error(
                                "[YT-DLP] ❌ Upload failed:",
                                uploadError
                            );

                            const fallback =
                                `${SUCCESS} ${message.author} Video quá lớn để gửi trực tiếp.\n` +
                                `**Youtube** • [Ấn vào đây để mở video](${youtubeUrl})`;

                            if (
                                loadingMessage
                            ) {

                                await loadingMessage
                                    .edit(
                                        fallback
                                    )
                                    .catch(
                                        async () => {

                                            await message.reply(
                                                fallback
                                            );
                                        }
                                    );

                            } else {

                                await message.reply(
                                    fallback
                                );
                            }
                        }

                    } catch (error) {

                        // =========================================
                        // DOWNLOAD ERROR
                        // =========================================

                        console.error(
                            "[YT ERROR]",
                            error
                        );

                        const errorText =
                            cleanError(
                                error
                            );

                        const errorMessage =
                            `${FAILED} Lỗi khi tải: \`${errorText}\``;

                        if (
                            loadingMessage
                        ) {

                            await loadingMessage
                                .edit(
                                    errorMessage
                                )
                                .catch(
                                    async () => {

                                        await message.reply(
                                            errorMessage
                                        );
                                    }
                                );

                        } else {

                            await message.reply(
                                errorMessage
                            );
                        }

                    } finally {

                        // =========================================
                        // CLEANUP
                        // =========================================

                        deleteFile(
                            videoPath
                        );
                    }

                    // Không tiếp tục kiểm tra Key
                    return;
                }

                // =================================================
                // KEY SYSTEM
                // =================================================

                console.log(
                    `[QUERY] Searching key: "${content}"`
                );

                const target =
                    keyCache.get(
                        content
                    );

                console.log(
                    "[TARGET]",
                    target
                        ? target.name
                        : "NOT FOUND"
                );

                if (!target) {
                    return;
                }

                // =================================================
                // KEY CHANNEL PERMISSION
                // =================================================

                try {

                    const result =
                        keyChannelCache.checkPermission(
                            target.name,
                            message.channel.id,
                            message.guild?.id
                        );

                    console.log(
                        "[PERMISSION]",
                        result
                    );

                    if (
                        !result.allowed
                    ) {

                        return message.reply(
                            result.message
                        );
                    }

                    return message.reply(
                        target.value
                    );

                } catch (error) {

                    console.error(
                        "[Key Check Error]",
                        error
                    );

                    return message.reply(
                        target.value
                    );
                }

            } catch (error) {

                console.error(
                    "[messageCreate Error]",
                    error
                );
            }
        }
    );
};
