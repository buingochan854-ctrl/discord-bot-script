const { 
    Client, 
    GatewayIntentBits, 
    version,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require("discord.js");
const { createClient } = require("@supabase/supabase-js");
const http = require("http");
const https = require("https");

console.log("================================");
console.log("Discord.js Version:", version);
console.log("Node Version:", process.version);
console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);
console.log("================================");

// Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

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
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- Khai báo Commands ---
const commands = [
    new SlashCommandBuilder()
        .setName("addkey")
        .setDescription("Thêm key")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Tên key")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("value")
                .setDescription("Giá trị")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("listkey")
        .setDescription("Xem danh sách key"),

    new SlashCommandBuilder()
        .setName("delkey")
        .setDescription("Xóa key")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Tên key")
                .setRequired(true)
        )
].map(cmd => cmd.toJSON());


client.on("debug", (msg) => {
    // Thường log debug rất dài, bạn có thể comment dòng dưới nếu log bị tràn
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

client.once("ready", async () => {
    console.log("================================");
    console.log("BOT READY");
    console.log("BOT:", client.user.tag);
    console.log("================================");

    try {
        const { error } = await supabase
            .from("keys")
            .select("name")
            .limit(1);

        if (error) {
            console.log("Supabase Failed");
            console.error(error);
        } else {
            console.log("Supabase Connected");

            // --- Đăng ký Slash Commands ---
            const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                {
                    body: commands
                }
            );

            console.log("Slash Commands Loaded");
        }
    } catch (err) {
        console.error("Supabase Error:");
        console.error(err);
    }
});

// ==========================================
//   CẤU HÌNH HỆ THỐNG CHẶN KEY (BLACKLIST)
// ==========================================
const BLACKLIST = [
    "1497621718041104446"
];

const KEY_COMMAND_KEYWORDS = [
    "key" 
];

// --- Xử lý Slash Commands ---
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const cmdName = interaction.commandName;

        const isKeyCommand = KEY_COMMAND_KEYWORDS.some(keyword => cmdName.includes(keyword));

        if (BLACKLIST.includes(userId) && isKeyCommand) {
            let actionText = "Thao Tác";
            if (cmdName === "addkey") actionText = "Thêm";
            else if (cmdName === "delkey") actionText = "Xóa";
            else if (cmdName === "listkey") actionText = "Xem";

            return interaction.editReply(
                `❌ Bạn Không Có Quyền ${actionText} Key! (Blacklist)`
            );
        }

        if (interaction.commandName === "addkey") {
            if (
                !interaction.member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )
            ) {
                return interaction.editReply(
                    "Bạn không có quyền."
                );
            }

            // Khi lưu, ta lưu chữ thường (lowercase) để đồng bộ dữ liệu
            const name = interaction.options
                .getString("name")
                .trim()
                .toLowerCase();
            const value = interaction.options.getString("value");

            const { error } = await supabase
                .from("keys")
                .upsert({
                    name,
                    value
                });

            if (error) {
                return interaction.editReply(
                    error.message
                );
            }

            return interaction.editReply(
                `Đã lưu key: ${name}`
            );
        }

        if (interaction.commandName === "listkey") {
            const { data, error } = await supabase
                .from("keys")
                .select("name");

            if (error) {
                return interaction.editReply(
                    error.message
                );
            }

            if (!data.length) {
                return interaction.editReply(
                    "Không có key nào."
                );
            }

            return interaction.editReply(
                data.map(x => x.name).join("\n")
            );
        }

        if (interaction.commandName === "delkey") {
            if (
                !interaction.member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )
            ) {
                return interaction.editReply(
                    "Bạn không có quyền."
                );
            }

            const name = interaction.options
                .getString("name")
                .trim()
                .toLowerCase();

            const { error } = await supabase
                .from("keys")
                .delete()
                .eq("name", name);

            if (error) {
                return interaction.editReply(
                    error.message
                );
            }

            return interaction.editReply(
                `Đã xóa key: ${name}`
            );
        }
    } catch (err) {
        console.error(err);
        if (interaction.deferred) {
            interaction.editReply(
                "Đã xảy ra lỗi."
            );
        }
    }
});

// --- Tự động trả lời key (Đã tối ưu hoa/thường và xóa lỗi PGRST116) ---
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    // Bỏ qua các tin nhắn trống hoặc chỉ có khoảng trắng
    const searchName = message.content.trim();
    if (!searchName) return;

    try {
        // Sử dụng .ilike để tìm không phân biệt hoa thường, kết hợp .maybeSingle() để tránh lỗi 0 rows
        const { data, error } = await supabase
            .from("keys")
            .select("value") 
            .ilike("name", searchName)
            .maybeSingle();

        if (error) {
            console.error("[Supabase Query Error]:", error.message);
            return;
        }

        // Nếu tìm thấy dữ liệu khớp, tiến hành reply tin nhắn
        if (data && data.value) {
            console.log(`[FOUND KEY]: "${searchName}" -> Trả về giá trị.`);
            await message.reply(data.value);
        }

    } catch (err) {
        console.error("[Message Event Crash Prevention]:", err);
    }
});

// Login
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

// Chống crash ứng dụng
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error); 
