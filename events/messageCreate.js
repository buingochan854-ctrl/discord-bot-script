// ===== DEBUG =====
console.log("📦 messageCreate.js loaded");

const fs = require("fs");
const path = require("path");
const os = require("os");

const keyCache = require("../cache/keyCache");
const keyChannelCache = require("../cache/keyChannelCache");

// yt-dlp-exec
const ytDlp = require("yt-dlp-exec");

// Discord attachment giới hạn tùy server/boost.
// Để an toàn, nếu file quá lớn thì gửi link YouTube.
const MAX_DISCORD_FILE_SIZE = 25 * 1024 * 1024;

// Emoji của bot
const LOADING = "<a:loading:1538771492681289828>";
const SUCCESS = "<:success:1518594913179013141>";
const FAILED = "<:failed:1518595211205283992>";

function isYouTubeUrl(text) {
    return /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/i.test(text);
}

function extractYouTubeUrl(text) {
    const match = text.match(
        /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[^\s]+|youtu\.be\/[^\s]+|youtube\.com\/shorts\/[^\s]+)/i
    );

    if (!match) return null;

    // Bỏ dấu ngoặc/markdown nếu người dùng gửi link dạng [text](url)
    return match[0]
        .replace(/[)>]+$/g, "")
        .trim();
}

function getCookiesFile() {
    const cookie = process.env.COOKIE_YT;

    if (!cookie) {
        console.log("[YT-DLP] ⚠️ Không có COOKIE_YT");
        return null;
    }

    const cookiePath = path.join(os.tmpdir(), "cookies.txt");

    try {
        fs.writeFileSync(cookiePath, cookie, "utf8");
        console.log("[YT-DLP] ✅ Đã tạo cookies.txt từ COOKIE_YT");
        return cookiePath;
    } catch (err) {
        console.error("[YT-DLP] Cookie error:", err);
        return null;
    }
}

async function downloadYouTube(url) {
    const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "youtube-")
    );

    const outputTemplate = path.join(
        tempDir,
        "video.%(ext)s"
    );

    const cookiePath = getCookiesFile();

    try {
        console.log(`[YT] ▶️ yt-dlp: ${url}`);

        const options = {
            output: outputTemplate,

            // MP4
            format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",

            mergeOutputFormat: "mp4",

            // Không tải playlist
            noPlaylist: true,

            // Hạn chế lỗi mạng
            retries: 3,
            fragmentRetries: 3,

            // Quiet để log không quá dài
            noWarnings: false
        };

        if (cookiePath) {
            options.cookies = cookiePath;
        }

        await ytDlp(url, options);

        const files = fs.readdirSync(tempDir);

        const videoFile = files.find(file =>
            /\.(mp4|mkv|webm|mov)$/i.test(file)
        );

        if (!videoFile) {
            throw new Error("Không tìm thấy file video sau khi tải.");
        }

        const filePath = path.join(tempDir, videoFile);

        const stat = fs.statSync(filePath);

        console.log(
            `[YT] ✅ Tải thành công: ${videoFile} (${stat.size} bytes)`
        );

        return {
            filePath,
            tempDir,
            size: stat.size
        };

    } catch (err) {
        try {
            fs.rmSync(tempDir, {
                recursive: true,
                force: true
            });
        } catch {}

        throw err;
    }
}

function cleanupTemp(tempDir) {
    try {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, {
                recursive: true,
                force: true
            });
        }
    } catch (err) {
        console.error("[YT] Cleanup error:", err);
    }
}

async function handleYouTube(message, url) {
    console.log(`[YT] 🔎 Phát hiện YouTube: ${url}`);

    let loadingMessage;

    try {
        loadingMessage = await message.reply(
            `${LOADING} Đang Tải Video`
        );

        const result = await downloadYouTube(url);

        // Discord giới hạn upload
        if (result.size > MAX_DISCORD_FILE_SIZE) {
            cleanupTemp(result.tempDir);

            return loadingMessage.edit(
                `${SUCCESS} <@${message.author.id}> Video của bạn quá lớn để gửi trực tiếp.\n\n` +
                `**Youtube • Ấn vào đây để mở video**\n${url}`
            );
        }

        try {
            await loadingMessage.edit({
                content: `${SUCCESS} <@${message.author.id}> Video của bạn:`,
                files: [
                    {
                        attachment: result.filePath,
                        name: "video.mp4"
                    }
                ]
            });
        } catch (uploadError) {
            console.error("[YT UPLOAD ERROR]", uploadError);

            // Nếu Discord từ chối upload vì kích thước
            await loadingMessage.edit(
                `${SUCCESS} <@${message.author.id}> Video quá lớn để gửi trực tiếp.\n\n` +
                `**Youtube • Ấn vào đây để mở video**\n${url}`
            );
        }

        cleanupTemp(result.tempDir);

    } catch (err) {
        console.error("[YT ERROR]", err);

        if (loadingMessage) {
            const errorText =
                err?.stderr ||
                err?.message ||
                String(err);

            // Không gửi log lỗi quá dài
            const shortError = errorText
                .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
                .slice(0, 1000);

            await loadingMessage.edit(
                `${FAILED} Lỗi khi tải: \`${shortError}\``
            ).catch(() => {});
        } else {
            await message.reply(
                `${FAILED} Lỗi khi tải video.`
            ).catch(() => {});
        }
    }
}

module.exports = (client) => {
    console.log("✅ messageCreate registered");

    client.on("messageCreate", async (message) => {
        try {
            console.log(
                `[MESSAGE] ${message.author.tag}: ${message.content}`
            );

            // Bot không xử lý tin nhắn của bot
            if (message.author.bot) {
                console.log("[DEBUG] Bot message, ignored");
                return;
            }

            if (!message.content) {
                console.log("[DEBUG] Empty content, ignored");
                return;
            }

            const content = message.content.trim();

            // =========================================================
            // YOUTUBE
            // =========================================================

            if (isYouTubeUrl(content)) {
                const youtubeUrl = extractYouTubeUrl(content);

                if (youtubeUrl) {
                    // Không xử lý Key cho link YouTube
                    await handleYouTube(message, youtubeUrl);
                    return;
                }
            }

            // =========================================================
            // KEY SYSTEM
            // =========================================================

            console.log(
                `[QUERY] Searching key: "${content}"`
            );

            const target = keyCache.get(content);

            console.log(
                "[TARGET]",
                target ? target.name : "NOT FOUND"
            );

            if (!target) return;

            // Nếu DM thì không dùng guild.id
            if (!message.guild) {
                return message.reply(target.value);
            }

            try {
                const result = keyChannelCache.checkPermission(
                    target.name,
                    message.channel.id,
                    message.guild.id
                );

                console.log(
                    "[PERMISSION]",
                    result
                );

                if (!result.allowed) {
                    return message.reply(result.message);
                }

                return message.reply(target.value);

            } catch (err) {
                console.error(
                    "[Key Check Error]",
                    err
                );

                return message.reply(target.value);
            }

        } catch (err) {
            console.error(
                "[MESSAGE CREATE ERROR]",
                err
            );
        }
    });
};
