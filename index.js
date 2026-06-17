const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.on("debug", msg => {
    console.log("[DEBUG]", msg);
});

client.on("error", err => {
    console.error("[CLIENT ERROR]", err);
});

client.on("warn", msg => {
    console.warn("[WARN]", msg);
});

client.on("shardError", err => {
    console.error("[SHARD ERROR]", err);
});

client.once("clientReady", () => {
    console.log("================================");
    console.log("BOT READY");
    console.log("BOT:", client.user.tag);
    console.log("================================");
});

(async () => {
    try {
        console.log("Starting Discord Login...");
        await client.login(process.env.TOKEN);
        console.log("LOGIN SUCCESS");
    } catch (err) {
        console.error("LOGIN FAILED:");
        console.error(err);
    }
})();

http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });
    res.end("Bot Test Online");
}).listen(process.env.PORT || 3000, () => {
    console.log(
        `Web Server Running On Port ${process.env.PORT || 3000}`
    );
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
