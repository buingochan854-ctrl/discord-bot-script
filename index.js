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

console.log("================================");
console.log("Discord.js Version:", version);
console.log("Node Version:", process.version);
console.log("================================");

// Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

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

// --- Báo log debug hệ thống ---
client.on("debug", (msg) => {
    console.log("[DEBUG]", msg);
});

client.on("warn", (msg) => {
    console.log("[WARN]", msg);
});

client.on("error", (err) => {
    console.error("CLIENT ERROR:", err);
});

client.on("shardError", (err) => {
    console.error("SHARD ERROR:", err);
});

client.on("shardDisconnect", (event) => {
    console.log("SHARD DISCONNECT:", event.code, `(Reason: ${event.reason || "Unknown"})`);
});

client.once("ready", async () => {
    console.log("================================");
    console.log("BOT READY - CLIENT READY");
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

            const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log("Slash Commands Loaded");
        }
    } catch (err) {
        console.error("Supabase Error:", err);
    }
});

// --- Hàm chuẩn hóa chuỗi dữ liệu (Xóa khoảng trắng thừa + Lowercase) ---
function cleanKeyName(str) {
    if (!str) return "";
    // .replace(/\s+/g, " ") biến nhiều dấu cách liên tiếp ở giữa thành 1 dấu cách duy nhất
    return str.trim().replace(/\s+/g, " ").toLowerCase();
}

// --- Xử lý Slash Commands ---
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const userTag = interaction.user.tag; 
        const cmdName = interaction.commandName;

        const BLACKLIST = ["1497621718041104446"];
        const KEY_COMMAND_KEYWORDS = ["key"];
        const isKeyCommand = KEY_COMMAND_KEYWORDS.some(keyword => cmdName.includes(keyword));

        if (BLACKLIST.includes(userId) && isKeyCommand) {
            let actionText = "Thao Tác";
            if (cmdName === "addkey") actionText = "Thêm";
            else if (cmdName === "delkey") actionText = "Xóa";
            else if (cmdName === "editkey") actionText = "Sửa";
            else if (cmdName === "listkey") actionText = "Xem";
            else if (cmdName === "logkey") actionText = "Xem Log";

            return interaction.editReply(`❌ Bạn Không Có Quyền ${actionText} Key! (Blacklist)`);
        }

        // --- COMMAND: ADDKEY ---
        if (interaction.commandName === "addkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("Bạn không có quyền quản trị viên.");
            }
            const name = cleanKeyName(interaction.options.getString("name"));
            const value = interaction.options.getString("value");

            const { error } = await supabase.from("keys").upsert({ name, value });
            if (error) return interaction.editReply(`❌ Lỗi: ${error.message}`);

            await supabase.from("key_logs").insert({ action: "ADD", key_name: name, user_id: userId, user_tag: userTag });
            return interaction.editReply(`✅ Đã lưu key: \`${name}\``);
        }

        // --- COMMAND: LISTKEY ---
        if (interaction.commandName === "listkey") {
            const { data, error } = await supabase.from("keys").select("name");
            if (error) return interaction.editReply(`❌ Lỗi: ${error.message}`);
            if (!data.length) return interaction.editReply("Không có key nào trong hệ thống.");
            
            // Bọc dấu gạch đứng để dễ phát hiện nếu có khoảng trắng lỗi trong DB cũ
            return interaction.editReply(data.map(x => `• \`${x.name}\``).join("\n"));
        }

        // --- COMMAND: DELKEY ---
        if (interaction.commandName === "delkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("Bạn không có quyền quản trị viên.");
            }
            const name = cleanKeyName(interaction.options.getString("name"));

            const { data, error } = await supabase.from("keys").delete().eq("name", name).select();
            if (error) return interaction.editReply(`❌ Lỗi: ${error.message}`);
            if (!data || data.length === 0) return interaction.editReply(`❌ Không tìm thấy key \`${name}\` để xóa.`);

            await supabase.from("key_logs").insert({ action: "DELETE", key_name: name, user_id: userId, user_tag: userTag });
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

            const updateData = { value: newValue };
            if (newName) updateData.name = cleanKeyName(newName);

            const { data, error } = await supabase.from("keys").update(updateData).eq("name", name).select();
            if (error) return interaction.editReply(`❌ Lỗi: ${error.message}`);
            if (!data || data.length === 0) return interaction.editReply(`❌ Không tìm thấy key \`${name}\` để chỉnh sửa.`);

            const logKeyName = newName ? `${name} -> ${updateData.name}` : name;
            await supabase.from("key_logs").insert({ action: "EDIT", key_name: logKeyName, user_id: userId, user_tag: userTag });
            return interaction.editReply(`✅ Đã chỉnh sửa thành công key: \`${name}\``);
        }

        // --- COMMAND: LOGKEY ---
        if (interaction.commandName === "logkey") {
            const { data, error } = await supabase.from("key_logs").select("*").order("created_at", { ascending: false }).limit(10);
            if (error) return interaction.editReply(`❌ Không thể lấy danh sách nhật ký: ${error.message}`);
            if (!data || data.length === 0) return interaction.editReply("Hiện chưa có lịch sử thao tác nào.");

            const logs = data.map(log => {
                const operator = log.user_tag ? log.user_tag : log.user_id;
                return `\`[${log.action}]\` **${log.key_name}** | Thực hiện bởi: *${operator}*`;
            }).join("\n");
            return interaction.editReply({ content: logs });
        }
    } catch (err) {
        console.error(err);
        if (interaction.deferred) interaction.editReply("Đã xảy ra lỗi không mong muốn trong hệ thống.");
    }
});

// --- Tự động trả lời khi nhắn tin ---
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const searchName = cleanKeyName(message.content);
    if (!searchName) return;

    try {
        // Lệnh chat dùng .ilike() bảo mật và chính xác cho select
        const { data, error } = await supabase.from("keys").select("value").ilike("name", searchName).maybeSingle();
        if (error) {
            console.error("[Supabase Query Error]:", error.message);
            return;
        }
        if (data && data.value) {
            console.log(`[FOUND KEY]: "${searchName}" -> Trả về giá trị.`);
            await message.reply(data.value);
        }
    } catch (err) {
        console.error("[Message Event Crash Prevention]:", err);
    }
});

// --- Tiến trình Login với Bộ đếm Timeout ---
console.log("Starting Discord Login...");

client.login(process.env.TOKEN)
    .then(() => {
        console.log("LOGIN SUCCESS");
    })
    .catch(err => {
        console.error("LOGIN FAILED:");
        console.error(err);
    });

setTimeout(() => {
    console.log("LOGIN TIMEOUT 30 SECONDS - Tiến trình kết nối vẫn đang bị treo!");
}, 30000);

// Heartbeat
setInterval(() => {
    console.log("Heartbeat Alive");
}, 10000);

// Web Server cho Render
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot Test Online");
}).listen(process.env.PORT || 3000, () => {
    console.log(`Web Server Running On Port ${process.env.PORT || 3000}`);
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
