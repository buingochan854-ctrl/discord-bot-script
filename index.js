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

// --- Hàm chuẩn hóa tên Key chuẩn chỉ ---
function cleanKeyName(str) {
    if (!str) return "";
    return str.trim().replace(/\s+/g, " ").toLowerCase();
}

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
        ),

    new SlashCommandBuilder()
        .setName("editkey")
        .setDescription("Chỉnh sửa key")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Tên key cần sửa")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("newvalue")
                .setDescription("Nội dung mới")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("newname")
                .setDescription("Tên mới của key (Nếu muốn đổi tên)")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("logkey")
        .setDescription("Xem lịch sử thao tác key")
].map(cmd => cmd.toJSON());


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
        const userTag = interaction.user.tag; 
        const cmdName = interaction.commandName;

        const isKeyCommand = KEY_COMMAND_KEYWORDS.some(keyword => cmdName.includes(keyword));

        if (BLACKLIST.includes(userId) && isKeyCommand) {
            let actionText = "Thao Tác";
            if (cmdName === "addkey") actionText = "Thêm";
            else if (cmdName === "delkey") actionText = "Xóa";
            else if (cmdName === "editkey") actionText = "Sửa";
            else if (cmdName === "listkey") actionText = "Xem";
            else if (cmdName === "logkey") actionText = "Xem Log";

            return interaction.editReply(
                `❌ Bạn Không Có Quyền ${actionText} Key! (Blacklist)`
            );
        }

        // --- COMMAND: ADDKEY ---
        if (interaction.commandName === "addkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("Bạn không có quyền quản trị viên.");
            }

            const name = cleanKeyName(interaction.options.getString("name"));
            const value = interaction.options.getString("value");

            const { error } = await supabase
                .from("keys")
                .upsert({ name, value });

            if (error) {
                return interaction.editReply(`❌ Lỗi: ${error.message}`);
            }

            // Ghi log hành động ADD
            await supabase.from("key_logs").insert({
                action: "ADD",
                key_name: name,
                user_id: userId,
                user_tag: userTag
            });

            return interaction.editReply(`✅ Đã lưu key: \`${name}\``);
        }

        // --- COMMAND: LISTKEY ---
        if (interaction.commandName === "listkey") {
            const { data, error } = await supabase
                .from("keys")
                .select("name");

            if (error) {
                return interaction.editReply(`❌ Lỗi: ${error.message}`);
            }

            if (!data.length) {
                return interaction.editReply("Không có key nào trong hệ thống.");
            }

            return interaction.editReply(data.map(x => x.name).join("\n"));
        }

        // --- COMMAND: DELKEY ---
        if (interaction.commandName === "delkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("Bạn không có quyền quản trị viên.");
            }

            const name = cleanKeyName(interaction.options.getString("name"));

            // Lấy toàn bộ keys để tìm kiếm dựa trên hàm chuẩn hóa dữ liệu (Quét triệt để data cũ)
            const { data: allKeys, error: fetchError } = await supabase
                .from("keys")
                .select("*");

            if (fetchError) {
                return interaction.editReply(`❌ Lỗi đồng bộ dữ liệu: ${fetchError.message}`);
            }

            const target = allKeys?.find(k => cleanKeyName(k.name) === name);

            if (!target) {
                return interaction.editReply(`❌ Không tìm thấy key \`${name}\` để xóa.`);
            }

            // Tiến hành xóa dựa theo tên gốc chính xác tìm thấy trong Database
            const { error } = await supabase
                .from("keys")
                .delete()
                .eq("name", target.name);

            if (error) {
                return interaction.editReply(`❌ Lỗi khi xóa: ${error.message}`);
            }

            // Ghi log hành động DELETE
            await supabase.from("key_logs").insert({
                action: "DELETE",
                key_name: name,
                user_id: userId,
                user_tag: userTag
            });

            return interaction.editReply(`✅ Đã xóa thành công key: \`${name}\``);
        }

        // --- COMMAND: EDITKEY ---
        if (interaction.commandName === "editkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("Bạn không có quyền quản trị viên.");
            }

            const name = cleanKeyName(interaction.options.getString("name"));
            const newName = interaction.options.getString("newname");
            const newValue = interaction.options.getString("newvalue");

            // Lấy toàn bộ keys để tìm kiếm dữ liệu chuẩn hóa (Quét triệt để data cũ)
            const { data: allKeys, error: fetchError } = await supabase
                .from("keys")
                .select("*");

            if (fetchError) {
                return interaction.editReply(`❌ Lỗi đồng bộ dữ liệu: ${fetchError.message}`);
            }

            const target = allKeys?.find(k => cleanKeyName(k.name) === name);

            if (!target) {
                return interaction.editReply(`❌ Không tìm thấy key \`${name}\` để chỉnh sửa.`);
            }

            const updateData = { value: newValue };
            if (newName) {
                updateData.name = cleanKeyName(newName);
            }

            // Tiến hành cập nhật dựa theo tên gốc chính xác tìm thấy trong Database
            const { error } = await supabase
                .from("keys")
                .update(updateData)
                .eq("name", target.name);

            if (error) {
                return interaction.editReply(`❌ Lỗi khi cập nhật: ${error.message}`);
            }

            const logKeyName = newName ? `${name} -> ${updateData.name}` : name;

            // Ghi log hành động EDIT
            await supabase.from("key_logs").insert({
                action: "EDIT",
                key_name: logKeyName,
                user_id: userId,
                user_tag: userTag
            });

            return interaction.editReply(`✅ Đã chỉnh sửa thành công key: \`${name}\``);
        }

        // --- COMMAND: LOGKEY ---
        if (interaction.commandName === "logkey") {
            const { data, error } = await supabase
                .from("key_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) {
                return interaction.editReply(`❌ Không thể lấy danh sách nhật ký: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return interaction.editReply("Hiện chưa có lịch sử thao tác nào.");
            }

            const logs = data.map(log => {
                const operator = log.user_tag ? log.user_tag : log.user_id;
                return `\`[${log.action}]\` **${log.key_name}** | Thực hiện bởi: *${operator}*`;
            }).join("\n");

            return interaction.editReply({ content: logs });
        }

    } catch (err) {
        console.error(err);
        if (interaction.deferred) {
            interaction.editReply("Đã xảy ra lỗi không mong muốn trong hệ thống.");
        }
    }
});

// --- Tự động trả lời key ---
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const searchName = cleanKeyName(message.content);
    if (!searchName) return;

    try {
        // Lấy toàn bộ danh sách key để check trùng khớp theo dạng cleanKeyName nhằm bao quát hết đống data cũ viết hoa viết thường
        const { data: allKeys, error } = await supabase
            .from("keys")
            .select("name, value");

        if (error) {
            console.error("[Supabase Query Error]:", error.message);
            return;
        }

        const target = allKeys?.find(k => cleanKeyName(k.name) === searchName);

        if (target && target.value) {
            console.log(`[FOUND KEY]: "${searchName}" -> Trả về giá trị.`);
            await message.reply(target.value);
        }

    } catch (err) {
        console.error("[Message Event Crash Prevention]:", err);
    }
});

// Login & Xử lý Timeout Log chuẩn xác
let loggedIn = false;

(async () => {
    try {
        console.log("Starting Discord Login...");
        await client.login(process.env.TOKEN);
        loggedIn = true;
        console.log("LOGIN SUCCESS");
    } catch (err) {
        console.error("LOGIN FAILED:");
        console.error(err);
    }
})();

setTimeout(() => {
    if (!loggedIn) {
        console.log("LOGIN TIMEOUT 30 SECONDS - Tiến trình kết nối vẫn đang bị treo hoặc Token lỗi!");
    }
}, 30000);

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
