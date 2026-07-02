const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = async function downloadYoutube(message, url) {
    const loading = await message.reply("📥 Đang tải video...");

    try {
        console.log("========== COBALT ==========");
        console.log("URL:", url);

        const response = await axios.post(
            "https://co.wuk.sh/api/json",
            {
                url: url,
                vQuality: "720",
                filenamePattern: "basic",
                isAudioOnly: false
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout: 30000
            }
        );

        console.log("Status:", response.status);
        console.log("Response:", response.data);

        if (!response.data || !response.data.url) {
            return loading.edit("❌ API không trả về link tải.");
        }

        const downloadUrl = response.data.url;
        console.log("Download URL:", downloadUrl);

        // Tự động tạo thư mục "downloads" nếu chưa tồn tại để tránh lỗi ghi file
        const downloadDir = path.join(__dirname, "downloads");
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        const output = path.join(downloadDir, `${Date.now()}.mp4`);
        const writer = fs.createWriteStream(output);

        const video = await axios({
            url: downloadUrl,
            method: "GET",
            responseType: "stream",
            timeout: 60000
        });

        video.data.pipe(writer);

        // Chuyển logic hoàn thành vào Promise để xử lý bất đồng bộ chuẩn xác hơn
        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        try {
            const size = fs.statSync(output).size;
            console.log("Downloaded:", size, "bytes");

            if (size > 25 * 1024 * 1024) {
                if (fs.existsSync(output)) fs.unlinkSync(output);
                return loading.edit(`📦 Video quá lớn.\n${downloadUrl}`);
            }

            await message.reply({ files: [output] });
            if (fs.existsSync(output)) fs.unlinkSync(output);
            loading.delete().catch(() => {});

        } catch (err) {
            console.error(err);
            if (fs.existsSync(output)) fs.unlinkSync(output);
            loading.edit("❌ Không thể gửi video.");
        }

    } catch (err) {
        console.error("====== COBALT ERROR ======");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err);
        }
        return loading.edit("❌ API Cobalt lỗi.");
    }
};
