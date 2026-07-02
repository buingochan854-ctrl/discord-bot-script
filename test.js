const downloader = require("./video/downloader");

(async () => {

    const result = await downloader(
        "LINK_TIKTOK"
    );

    console.log(result);

})();