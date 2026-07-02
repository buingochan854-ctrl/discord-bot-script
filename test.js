const downloader = require("./video/downloader");

(async () => {

    const result = await downloader(
        "https://vt.tiktok.com/ZSCyYaB9T/"
    );

    console.log(result);

})();