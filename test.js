const download = require("./video/yt-dlp");

(async () => {

    const result = await download(
        "https://vt.tiktok.com/ZSCyYaB9T/ "
    );

    console.log(result);

})();