const { Client, GatewayIntentBits, version } = require("discord.js");
const http = require("http");
const https = require("https");

console.log("================================");
console.log("Discord.js Version:", version);
console.log("Node Version:", process.version);
console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);
console.log("================================");

// Test truy cập Discord API
https.get("https://discord.com/api/v10/gateway", (res) => {
    console.log("Gateway Status:", res.statusCode);

    let data = "";

    res.on("data", chunk => data += chunk);

    res.on("end", () => {
        console.log("Gateway Response:", data);
    });

}).on("error", (err) => {
    console.error("Gateway Error:");
    console.error(err);
});

// Discord Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.on("debug", (msg) => {
    console.log("[DEBUG]", msg);
});

client.on("warn", (msg) => {
    console.log("[WARN]", msg);
});

client.on("error", (err) => {
    console.error("[CLIENT ERROR]");
    console.error(err);
});

client.on("shardError", (err) => {
    console.error("[SHARD ERROR]");
    console.error(err);
});

client.on("shardDisconnect", (event) => {
    console.log("[SHARD DISCONNECT]", event.code);
});

client.on("shardReconnecting", () => {
    console.log("[SHARD RECONNECTING]");
});

client.on("invalidated", () => {
    console.log("[SESSION INVALIDATED]");
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

// Heartbeat
setInterval(() => {
    console.log("Heartbeat Alive");
}, 10000);

// Web Server cho Render
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

// Chống crash
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
