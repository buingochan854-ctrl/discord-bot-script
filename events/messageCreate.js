// ===== DEBUG =====
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
        if (!process.env.COOKIE_YT) {
            console.log("[YT] ⚠️ COOKIE_YT không tồn tại");
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

        console.log("[YT] ✅ Đã tạo cookies.txt");

        return true;
    } catch (err) {
        console.error("[YT] Cookie error:", err);
        return false;
    }
}

// =====================================================
// YOUTUBE URL
// =====================================================

function getYouTubeUrl(content) {
    const regex =
        /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[\w-]+|shorts\/[\w-]+|live\/[\w-]+)|youtu\.be\/[\w-]+)(?:[^\s<>]*)?/i;

    const match = content.match(regex);

    if (!match) return null;

    return match[0].replace(/[)>.,]+$/, "");
}

// =====================================================
// DOWNLOAD YOUTUBE
// =====================================================

function downloadYouTube(url) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!prepareCookie()) {
                return reject(
                    new Error("COOKIE_YT chưa được cấu hình")
                );
            }

            fs.mkdirSync(DOWNLOAD_DIR, {
                recursive: true
            });

            const output = path.join(
                DOWNLOAD_DIR,
                `${Date.now()}-%(id)s.%(ext)s`
            );

            console.log("[YT] 🔎 URL:", url);
            console.log("[YT] 📁 Output:", output);

            console.log(
                "[YT-DLP] Binary:",
                ytDlp.path || "unknown"
            );

            const process = ytDlp.exec(url, {
                cookies: COOKIE_FILE,

                noPlaylist: true,

                format:
                    "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",

                mergeOutputFormat: "mp4",

                noPart: true,

                output: output,

                noWarnings: true
            });

            let stderr = "";

            process.stdout?.on("data", data => {
                console.log(
                    `[YT-DLP] ${data.toString().trim()}`
                );
            });

            process.stderr?.on("data", data => {
                const text = data.toString();

                stderr += text;

                console.log(
                    `[YT-DLP ERROR] ${text.trim()}`
                );
            });

            process.on("error", err => {
                reject(
                    new Error(
                        `Không chạy được yt-dlp: ${err.message}`
                    )
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

                try {
                    const files =
                        fs.readdirSync(DOWNLOAD_DIR)
                            .filter(file =>
                                file.endsWith(".mp4") ||
                                file.endsWith(".webm") ||
                                file.endsWith(".mkv")
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

                    if (!files.length) {
                        return reject(
                            new Error(
                                "Không tìm thấy file video"
                            )
                        );
                    }

                    resolve(files[0].path);

                } catch (err) {
                    reject(err);
                }
            });

        } catch (err) {
            reject(err);
        }
    });
}

// =====================================================
// DELETE TEMP FILE
// =====================================================

function deleteFile(filePath) {
    try {
        if (
            filePath &&
            fs.existsSync(filePath)
        ) {
            fs.unlinkSync(filePath);

            console.log(
                "[YT] 🗑️ Đã xóa file tạm"
            );
        }
    } catch (err) {
        console.error(
            "[YT] Delete error:",
            err.message
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

    text = text
        .replace(
            /\x1B\[[0-?]*[ -/]*[@-~]/g,
            ""
        )
        .replace(/\s+/g, " ")
        .trim();

    if (text.length > 700) {
        text =
            text.slice(0, 700) +
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

                if (!message.content) {
                    console.log(
                        "[DEBUG] Empty content, ignored"
                    );
                    return;
                }

                const content =
                    message.content.trim();

                // =================================================
                // YOUTUBE
                // =================================================

                const youtubeUrl =
                    getYouTubeUrl(content);

                if (youtubeUrl) {

                    console.log(
                        `[YT] 🔎 Phát hiện link: ${youtubeUrl}`
                    );

                    let loadingMessage =
                        null;

                    let videoPath =
                        null;

                    try {

                        // =============================================
                        // LOADING
                        // =============================================

                        loadingMessage =
                            await message.reply(
                                `${LOADING} Đang Tải Video`
                            );

                        // =============================================
                        // DOWNLOAD
                        // =============================================

                        videoPath =
                            await downloadYouTube(
                                youtubeUrl
                            );

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

                        // =============================================
                        // SIZE
                        // =============================================

                        const stats =
                            fs.statSync(
                                videoPath
                            );

                        const sizeMB =
                            stats.size /
                            1024 /
                            1024;

                        console.log(
                            `[YT] 📦 Video: ${sizeMB.toFixed(2)} MB`
                        );

                        // =============================================
                        // DISCORD UPLOAD
                        // =============================================

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
                                "[YT] ✅ Upload thành công"
                            );

                        } catch (uploadError) {

                            console.error(
                                "[YT] ❌ Upload failed:",
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

                        // =============================================
                        // CLEANUP
                        // =============================================

                        deleteFile(
                            videoPath
                        );
                    }

                    // Không xử lý YouTube URL như Key
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

                if (!target) return;

                // =================================================
                // KEY CHANNEL
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
        }
    );
};
