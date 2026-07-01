const tiktok = require("./video/providers/tiktok");

(async () => {

    const result = await tiktok("https://vt.tiktok.com/xxxxxxxx");

    console.log(result);

})();