const axios = require("axios");
const fs = require("fs");
const path = require("path");

const {
    COBALT_API,
    MAX_UPLOAD_SIZE
} = require("../config");

module.exports = async function (message, url) {

    const loading = await message.reply("📥 Đang lấy video...");

    try {

        const { data } = await axios.post(
            COBALT_API,
            {
                url,
                videoQuality: "720",
                youtubeVideoCodec: "h264"
            },
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        if (!data.url)
            return loading.edit("❌ Không lấy được video.");

        const file = path.join(
            "downloads",
            `${Date.now()}.mp4`
        );

        const response = await axios({
            url: data.url,
            method: "GET",
            responseType: "stream"
        });

        const writer = fs.createWriteStream(file);

        response.data.pipe(writer);

        writer.on("finish", async () => {

            const size = fs.statSync(file).size;

            if (size <= MAX_UPLOAD_SIZE) {

                await message.reply({
                    files: [file]
                });

                fs.unlinkSync(file);

                return loading.delete().catch(() => {});

            }

            fs.unlinkSync(file);

            loading.edit(
                `📦 Video quá lớn.\n\n⬇ ${data.url}`
            );

        });

        writer.on("error", () => {

            loading.edit("❌ Không tải được video.");

        });

    } catch (err) {

        console.log(err.response?.data || err);

        loading.edit("❌ API Cobalt lỗi.");

    }

};