// ===== DEBUG: Log khi file được require =====
console.log("📦 messageCreate.js loaded");

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const keyCache = require("../cache/keyCache");
const keyChannelCache = require("../cache/keyChannelCache");

// =====================================================
// YOUTUBE CONFIG
// =====================================================

const LOADING = "<a:loading:1538771492681289828>";
const SUCCESS = "<:success:1518594913179013141>";
const FAILED = "<:failed:1518595211205283992>";

const COOKIE_FILE = "/tmp/cookies.txt";
const DOWNLOAD_DIR = "/tmp/yt-downloads";

// =====================================================
// CHUẨN BỊ COOKIE TỪ RAILWAY VARIABLE
// =====================================================

function prepareCookie() {
    try {
        if (!process.env.COOKIE_YT) {
            console.log("[YT] ⚠️ Không có COOKIE_YT");
            return false;
        }

        fs.writeFileSync(
            COOKIE_FILE,
            process.env.COOKIE_YT,
            {
                encoding: "utf8",
                mode: 0o600
            }
        );

        return true;
    } catch (err) {
        console.error("[YT] Cookie error:", err);
        return false;
    }
}

// =====================================================
// PHÁT HIỆN LINK YOUTUBE
// =====================================================

function getYouTubeUrl(content) {
    const regex =
        /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[\w-]+|shorts\/[\w-]+|live\/[\w-]+)|youtu\.be\/[\w-]+)(?:[^\s<>]*)?/i;

    const match = content.match(regex);

    if (!match) return null;

    return match[0].replace(/[)>.,]+$/, "");
}

// =====================================================
// TẢI VIDEO BẰNG YT-DLP
// =====================================================

function downloadYouTube(url) {
    return new Promise((resolve, reject) => {

        if (!prepareCookie()) {
            return reject(
                new Error("COOKIE_YT chưa được cấu hình trên Railway")
            );
        }

        fs.mkdirSync(DOWNLOAD_DIR, {
            recursive: true
        });

        const output = path.join(
            DOWNLOAD_DIR,
            `${Date.now()}-%(id)s.%(ext)s`
        );

        const args = [
            "--no-playlist",

            "--cookies",
            COOKIE_FILE,

            "-f",
            "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",

            "--merge-output-format",
            "mp4",

            "--no-part",

            "-o",
            output,

            url
        ];

        console.log("[YT] ▶️ yt-dlp:", url);

        const process = spawn("yt-dlp", args);

        let stderr = "";

        process.stderr.on("data", data => {
            stderr += data.toString();
        });

        process.stdout.on("data", data => {
            console.log(`[YT] ${data.toString().trim()}`);
        });

        process.on("error", err => {
            reject(
                new Error(`Không chạy được yt-dlp: ${err.message}`)
            );
        });

        process.on("close", code => {

            if (code !== 0) {
                return reject(
                    new Error(
                        stderr.trim() ||
                        `yt-dlp exit code ${code}`
                    )
                );
            }

            const files = fs.readdirSync(DOWNLOAD_DIR)
                .filter(file =>
                    file.endsWith(".mp4") ||
                    file.endsWith(".webm") ||
                    file.endsWith(".mkv")
                )
                .map(file => {
                    const filePath =
                        path.join(DOWNLOAD_DIR, file);

                    return {
                        path: filePath,
                        time: fs.statSync(filePath).mtimeMs
                    };
                })
                .sort((a, b) => b.time - a.time);

            if (!files.length) {
                return reject(
                    new Error(
                        "Không tìm thấy file video sau khi tải"
                    )
                );
            }

            resolve(files[0].path);
        });
    });
}

// =====================================================
// XÓA FILE
// =====================================================

function deleteFile(filePath) {
    try {
        if (
            filePath &&
            fs.existsSync(filePath)
        ) {
            fs.unlinkSync(filePath);
            console.log("[YT] 🗑️ Đã xóa file tạm");
        }
    } catch (err) {
        console.error(
            "[YT] Delete error:",
            err.message
        );
    }
}

// =====================================================
// LÀM GỌN ERROR
// =====================================================

function cleanError(error) {
    let text =
        error?.message ||
        String(error);

    text = text
        .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (text.length > 700) {
        text = text.slice(0, 700) + "...";
    }

    return text;
}

// =====================================================
// MESSAGE CREATE
// =====================================================

module.exports = (client) => {

    console.log("✅ messageCreate registered");

    client.on("messageCreate", async (message) => {

        try {

            // =================================================
            // DEBUG
            // =================================================

            console.log(
                `[MESSAGE] ${message.author.tag}: ${message.content}`
            );

            // Bỏ qua bot
            if (message.author.bot) {
                console.log("[DEBUG] Bot message, ignored");
                return;
            }

            // Không có nội dung
            if (!message.content) {
                console.log("[DEBUG] Empty content, ignored");
                return;
            }

            const content =
                message.content.trim();

            // =================================================
            // YOUTUBE AUTO DETECT
            // =================================================

            const youtubeUrl =
                getYouTubeUrl(content);

            if (youtubeUrl) {

                console.log(
                    `[YT] 🔎 Phát hiện YouTube: ${youtubeUrl}`
                );

                let loadingMessage = null;
                let videoPath = null;

                try {

                    // -----------------------------------------
                    // Đang tải
                    // -----------------------------------------

                    loadingMessage =
                        await message.reply(
                            `${LOADING} Đang Tải Video`
                        );

                    // -----------------------------------------
                    // Tải video
                    // -----------------------------------------

                    videoPath =
                        await downloadYouTube(
                            youtubeUrl
                        );

                    if (
                        !videoPath ||
                        !fs.existsSync(videoPath)
                    ) {
                        throw new Error(
                            "Không tìm thấy video sau khi tải"
                        );
                    }

                    const stats =
                        fs.statSync(videoPath);

                    console.log(
                        `[YT] 📦 Size: ${(
                            stats.size /
                            1024 /
                            1024
                        ).toFixed(2)} MB`
                    );

                    // -----------------------------------------
                    // Gửi video
                    // -----------------------------------------

                    try {

                        await message.reply({
                            content:
                                `${SUCCESS} ${message.author} Video của bạn:`,
                            files: [{
                                attachment: videoPath,
                                name:
                                    path.basename(
                                        videoPath
                                    )
                            }]
                        });

                        if (loadingMessage) {
                            await loadingMessage.delete()
                                .catch(() => {});
                        }

                        console.log(
                            "[YT] ✅ Gửi video thành công"
                        );

                    } catch (uploadError) {

                        // -------------------------------------
                        // File quá lớn / Discord từ chối
                        // -------------------------------------

                        console.error(
                            "[YT] Upload failed:",
                            uploadError.message
                        );

                        const fallback =
                            `${SUCCESS} ${message.author} Video quá lớn để gửi trực tiếp.\n\n` +
                            `**Youtube** • [Ấn vào đây để mở video](${youtubeUrl})`;

                        if (loadingMessage) {

                            await loadingMessage.edit(
                                fallback
                            ).catch(async () => {
                                await message.reply(
                                    fallback
                                );
                            });

                        } else {
                            await message.reply(
                                fallback
                            );
                        }
                    }

                } catch (error) {

                    console.error(
                        "[YT ERROR]",
                        error
                    );

                    const errorText =
                        cleanError(error);

                    const errorMessage =
                        `${FAILED} Lỗi khi tải: \`${errorText}\``;

                    if (loadingMessage) {

                        await loadingMessage.edit(
                            errorMessage
                        ).catch(async () => {
                            await message.reply(
                                errorMessage
                            );
                        });

                    } else {
                        await message.reply(
                            errorMessage
                        );
                    }

                } finally {

                    // -----------------------------------------
                    // Cleanup
                    // -----------------------------------------

                    deleteFile(videoPath);
                }

                // Rất quan trọng:
                // Link YouTube không được xử lý tiếp như một key
                return;
            }

            // =================================================
            // HỆ THỐNG KEY CŨ
            // =================================================

            console.log(
                `[QUERY] Searching key: "${content}"`
            );

            const target =
                keyCache.get(content);

            console.log(
                "[TARGET]",
                target ?
                    target.name :
                    "NOT FOUND"
            );

            if (!target) return;

            // =================================================
            // KEY CHANNEL PERMISSION
            // =================================================

            try {

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
                "[messageCreate Error]",
                err
            );
        }
    });
};
