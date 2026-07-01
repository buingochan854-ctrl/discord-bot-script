const axios = require("axios");

module.exports = async (url) => {
    try {

        const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;

        const { data } = await axios.get(api);

        if (!data || !data.data) {
            return {
                success: false,
                message: "Không lấy được video TikTok."
            };
        }

        return {
            success: true,
            platform: "TikTok",
            url: data.data.play,
            title: data.data.title || "TikTok Video"
        };

    } catch (err) {

        console.error(err);

        return {
            success: false,
            message: "Lỗi TikTok API."
        };

    }
};