const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = async (url, filename) => {

    const downloads = path.join(__dirname, "..", "downloads");

    if (!fs.existsSync(downloads)) {
        fs.mkdirSync(downloads, { recursive: true });
    }

    const filePath = path.join(downloads, filename);

    const response = await axios({
        url,
        method: "GET",
        responseType: "stream"
    });

    await new Promise((resolve, reject) => {

        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        writer.on("finish", resolve);
        writer.on("error", reject);

    });

    return filePath;

};