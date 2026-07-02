const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = async function downloadYoutube(message, url) {

    const output = path.join(
        __dirname,
        "..",
        "downloads",
        `${Date.now()}.mp4`
    );

    const loading = await message.reply("📥 Đang tải video...");

    const yt = spawn("yt-dlp", [
        "-f",
        "bv*+ba/b",
        "--merge-output-format",
        "mp4",
        "-o",
        output,
        url
    ]);

    yt.stdout.on("data", data => {
        console.log("[yt-dlp]", data.toString());
    });

    yt.stderr.on("data", data => {
        console.log("[yt-dlp ERROR]", data.toString());
    });

    yt.on("error", err => {
        console.log(err);
    });

    yt.on("close", async code => {

        console.log("Exit Code:", code);

        if (code !== 0) {
            return loading.edit("❌ Không thể tải video.");
        }

        if (!fs.existsSync(output)) {
            return loading.edit("❌ File không tồn tại.");
        }

        console.log("Size:", fs.statSync(output).size);

        await message.reply({
            files: [output]
        });

        loading.delete().catch(() => {});

        fs.unlink(output, () => {});
    });

};