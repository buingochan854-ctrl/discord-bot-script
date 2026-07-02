const { spawn } = require("child_process");
const path = require("path");

module.exports = async function downloadYoutube(message, url) {

    const output = path.join(
        "downloads",
        `${Date.now()}.mp4`
    );

    const loading = await message.reply("📥 Đang tải video...");

    const yt = spawn("yt-dlp", [
        "-f",
        "mp4",
        "-o",
        output,
        url
    ]);

    yt.on("close", async (code) => {

        if (code !== 0) {
            return loading.edit("❌ Không thể tải video.");
        }

        await message.reply({
            files: [output]
        });

        loading.delete().catch(() => {});
    });

};