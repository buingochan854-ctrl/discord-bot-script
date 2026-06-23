const { 
    Client, 
    GatewayIntentBits, 
    version,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActivityType
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

// --- Hàm tự động cập nhật trạng thái số lượng key ---
async function updateStatus() {
    try {
        const { count, error } = await supabase
            .from("keys")
            .select("*", { count: "exact", head: true });

        if (error) {
            console.error("[Status Update Error]: Fetch failed", error.message);
            return;
        }

        client.user.setActivity(`${count || 0} Keys`, {
            type: ActivityType.Watching // Kiểu hiển thị: "Đang xem ... Keys"
        });
        console.log(`[STATUS UPDATED]: Watching ${count || 0} Keys`);
    } catch (err) {
        console.error("[Status Update Error]:", err);
    }
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
    // Thường log debug rất dài, có thể ẩn đi nếu muốn sạch console
    // console.log("[DEBUG]", msg);
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

            // --- Khởi tạo trạng thái ban đầu và đặt vòng lặp ---
            await updateStatus();
            setInterval(updateStatus, 60000); // Tự động cập nhật lại mỗi 60 giây
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
                `<:failed:1518595211205283992> Bạn Không Có Quyền ${actionText} Key! (Blacklist)`
            );
        }

        // --- COMMAND: ADDKEY ---
        if (interaction.commandName === "addkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("<:failed:1518595211205283992> Bạn không có quyền quản trị viên.");
            }

            const name = cleanKeyName(interaction.options.getString("name"));
            const value = interaction.options.getString("value");

            const { error } = await supabase
                .from("keys")
                .upsert({ name, value });

            if (error) {
                return interaction.editReply(`<:failed:1518595211205283992> Lỗi: ${error.message}`);
            }

            // Ghi log hành động ADD
            await supabase.from("key_logs").insert({
                action: "ADD",
                key_name: name,
                user_id: userId,
                user_tag: userTag
            });

            // Cập nhật trạng thái số lượng key ngay lập tức
            await updateStatus();

            return interaction.editReply(`<:success:1518594913179013141> Đã lưu key: \`${name}\``);
        }

        // --- COMMAND: LISTKEY (HỆ THỐNG CHIA TRANG EMBED + BUTTON) ---
        if (interaction.commandName === "listkey") {
            const { data, error } = await supabase
                .from("keys")
                .select("name")
                .order("name", { ascending: true });

            if (error) {
                return interaction.editReply(`<:failed:1518595211205283992> Lỗi: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return interaction.editReply("<:failed:1518595211205283992> Không có key nào trong hệ thống.");
            }

            const totalKeys = data.length;
            const keysPerPage = 30;
            const totalPages = Math.ceil(totalKeys / keysPerPage);
            let currentPage = 0;

            const generatePageMessage = (page) => {
                const start = page * keysPerPage;
                const end = Math.min(start + keysPerPage, totalKeys);
                const pageKeys = data.slice(start, end).map((x, index) => `${start + index + 1}. ${x.name}`);

                const embed = new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("📦 Danh Sách Key")
                    .setDescription(pageKeys.join("\n"))
                    .setFooter({
                        text: `Trang ${page + 1}/${totalPages} | Key: ${start + 1}-${end}/${totalKeys}`
                    });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("first").setEmoji("⏪").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId("prev").setEmoji("◀️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId("next").setEmoji("▶️").setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
                    new ButtonBuilder().setCustomId("last").setEmoji("⏩").setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1)
                );

                return { embeds: [embed], components: [row] };
            };

            const mainMessage = await interaction.editReply(generatePageMessage(currentPage));

            const collector = mainMessage.createMessageComponentCollector({
                filter: (btnInteraction) => btnInteraction.user.id === interaction.user.id,
                time: 60000
            });

            collector.on("collect", async (btnInteraction) => {
                if (btnInteraction.customId === "first") currentPage = 0;
                else if (btnInteraction.customId === "prev") currentPage--;
                else if (btnInteraction.customId === "next") currentPage++;
                else if (btnInteraction.customId === "last") currentPage = totalPages - 1;

                await btnInteraction.update(generatePageMessage(currentPage));
            });

            collector.on("end", async () => {
                try {
                    const start = currentPage * keysPerPage;
                    const end = Math.min(start + keysPerPage, totalKeys);
                    const pageKeys = data.slice(start, end).map((x, index) => `${start + index + 1}. ${x.name}`);

                    const disableEmbed = new EmbedBuilder()
                        .setColor("#747f8d")
                        .setTitle("📦 Danh Sách Key (Hết hạn tương tác)")
                        .setDescription(pageKeys.join("\n"))
                        .setFooter({
                            text: `Trang ${currentPage + 1}/${totalPages} | Key: ${start + 1}-${end}/${totalKeys}`
                        });

                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("first_d").setEmoji("⏪").setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId("prev_d").setEmoji("◀️").setStyle(ButtonStyle.Primary).setDisabled(true),
                        new ButtonBuilder().setCustomId("next_d").setEmoji("▶️").setStyle(ButtonStyle.Primary).setDisabled(true),
                        new ButtonBuilder().setCustomId("last_d").setEmoji("⏩").setStyle(ButtonStyle.Secondary).setDisabled(true)
                    );

                    await interaction.editReply({ embeds: [disableEmbed], components: [disabledRow] });
                } catch (err) {}
            });
            return;
        }

        // --- COMMAND: DELKEY ---
        if (interaction.commandName === "delkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("<:failed:1518595211205283992> Bạn không có quyền quản trị viên.");
            }

            const name = cleanKeyName(interaction.options.getString("name"));

            const { data: allKeys, error: fetchError } = await supabase
                .from("keys")
                .select("*");

            if (fetchError) {
                return interaction.editReply(`<:failed:1518595211205283992> Lỗi đồng bộ dữ liệu: ${fetchError.message}`);
            }

            const target = allKeys?.find(k => cleanKeyName(k.name) === name);

            if (!target) {
                return interaction.editReply(`<:failed:1518595211205283992> Không tìm thấy key \`${name}\` để xóa.`);
            }

            const { error } = await supabase
                .from("keys")
                .delete()
                .eq("name", target.name);

            if (error) {
                return interaction.editReply(`<:failed:1518595211205283992> Lỗi khi xóa: ${error.message}`);
            }

            // Ghi log hành động DELETE
            await supabase.from("key_logs").insert({
                action: "DELETE",
                key_name: name,
                user_id: userId,
                user_tag: userTag
            });

            // Cập nhật trạng thái số lượng key ngay lập tức
            await updateStatus();

            return interaction.editReply(`<:success:1518594913179013141> Đã xóa thành công key: \`${name}\``);
        }

        // --- COMMAND: EDITKEY ---
        if (interaction.commandName === "editkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("<:failed:1518595211205283992> Bạn không có quyền quản trị viên.");
            }

            const name = cleanKeyName(interaction.options.getString("name"));
            const newName = interaction.options.getString("newname");
            const newValue = interaction.options.getString("newvalue");

            const { data: allKeys, error: fetchError } = await supabase
                .from("keys")
                .select("*");

            if (fetchError) {
                return interaction.editReply(`<:failed:1518595211205283992> Lỗi đồng bộ dữ liệu: ${fetchError.message}`);
            }

            const target = allKeys?.find(k => cleanKeyName(k.name) === name);

            if (!target) {
                return interaction.editReply(`<:failed:1518595211205283992> Không tìm thấy key \`${name}\` để chỉnh sửa.`);
            }

            const updateData = { value: newValue };
            if (newName) {
                updateData.name = cleanKeyName(newName);
            }

            const { error } = await supabase
                .from("keys")
                .update(updateData)
                .eq("name", target.name);

            if (error) {
                return interaction.editReply(`<:failed:1518595211205283992> Lỗi khi cập nhật: ${error.message}`);
            }

            const logKeyName = newName ? `${name} -> ${updateData.name}` : name;

            // Ghi log hành động EDIT
            await supabase.from("key_logs").insert({
                action: "EDIT",
                key_name: logKeyName,
                user_id: userId,
                user_tag: userTag
            });

            return interaction.editReply(`<:success:1518594913179013141> Đã chỉnh sửa thành công key: \`${name}\``);
        }

        // --- COMMAND: LOGKEY ---
        if (interaction.commandName === "logkey") {
            const { data, error } = await supabase
                .from("key_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) {
                return interaction.editReply(`<:failed:1518595211205283992> Không thể lấy danh sách nhật ký: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return interaction.editReply("<:failed:1518595211205283992> Hiện chưa có lịch sử thao tác nào.");
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
            interaction.editReply("<:failed:1518595211205283992> Đã xảy ra lỗi không mong muốn trong hệ thống.");
        }
    }
});

// --- Sự kiện messageCreate: Xử lý lệnh Prefix (.ping) và Tự động trả lời key ---
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    // 1. Kiểm tra lệnh .ping
    if (message.content.toLowerCase() === ".ping") {
        try {
            const msg = await message.reply("🏓 Đang kiểm tra...");

            const apiPing = client.ws.ping;
            const botPing = msg.createdTimestamp - message.createdTimestamp;

            let status = "🟢 Ổn định";
            if (apiPing > 200) status = "🟡 Khá";
            if (apiPing > 500) status = "🔴 Chậm";

            await msg.edit({
                content: `🏓 **Pong!**\n\n📡 API Ping: **${apiPing}ms**\n⚡ Bot Ping: **${botPing}ms**\n📶 Trạng thái: **${status}**\n\n🤖 Bot: **${client.user.tag}**\n🟢 Uptime: **${Math.floor(process.uptime())} giây**\n💾 RAM: **${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB**`
            });
        } catch (err) {
            console.error("[Ping Command Error]:", err);
        }
        return; // Dừng lại ở đây, không quét tiếp xuống phần kiểm tra Key
    }

    // 2. Tự động trả lời key từ Database
    const searchName = cleanKeyName(message.content);
    if (!searchName) return;

    try {
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
