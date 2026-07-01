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
    ActivityType,
} = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");

const http = require("http");
const https = require("https");

const supabase = require("./database/supabase");

const {
    cleanKeyName,
    truncateString
} = require("./utils/helpers");

const { sendKeyLog } = require("./utils/webhook");

const { updateBotStatus } = require("./utils/status");

console.log("================================");
console.log("Discord.js Version:", version);
console.log("Node Version:", process.version);
console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);
console.log("================================");

// --- Constants Voice 24/7 ---
const TARGET_GUILD_ID = "1466331775931383853";
const TARGET_VOICE_CHANNEL_ID = "1519747573873643641";

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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

require("./events/messageCreate")(client);

// --- Khai báo Commands ---
const commands = [
    new SlashCommandBuilder()
        .setName("addkey")
        .setDescription("Thêm key")
        .addStringOption(option => option.setName("name").setDescription("Tên key").setRequired(true))
        .addStringOption(option => option.setName("value").setDescription("Giá trị").setRequired(true)),

    new SlashCommandBuilder()
        .setName("listkey")
        .setDescription("Xem danh sách key"),

    new SlashCommandBuilder()
        .setName("delkey")
        .setDescription("Xóa key")
        .addStringOption(option => option.setName("name").setDescription("Tên key").setRequired(true)),

    new SlashCommandBuilder()
        .setName("editkey")
        .setDescription("Chỉnh sửa key")
        .addStringOption(option => option.setName("name").setDescription("Tên key cần sửa").setRequired(true))
        .addStringOption(option => option.setName("newvalue").setDescription("Nội dung mới").setRequired(true))
        .addStringOption(option => option.setName("newname").setDescription("Tên mới của key (Nếu muốn đổi tên)").setRequired(false))
].map(cmd => cmd.toJSON());


client.on("warn", console.log);
client.on("error", console.error);

client.once("clientReady", async () => {
    console.log("================================");
    console.log("BOT READY");
    console.log("BOT:", client.user.tag);
    console.log("================================");

    // --- CẤU HÌNH TREO KÊNH THOẠI 24/7 ---
    try {
        const guild = client.guilds.cache.get(TARGET_GUILD_ID);
        if (guild) {
            const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
            if (channel) {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfMute: true,
                    selfDeaf: true
                });
                console.log("[VOICE] Đã tự động tham gia kênh thoại 24/7!");
            } else {
                console.log("[VOICE] Không tìm thấy kênh thoại với ID đã cung cấp.");
            }
        } else {
            console.log("[VOICE] Không tìm thấy server (Guild) với ID đã cung cấp.");
        }
    } catch (err) {
        console.error("[VOICE JOIN ERROR]:", err);
    }

    try {
        const { error } = await supabase.from("keys").select("name").limit(1);

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

            await updateBotStatus(client, supabase);
            setInterval(() => {
                updateBotStatus(client, supabase);
            }, 600000); 
        }
    } catch (err) {
        console.error("Supabase Error:", err);
    }
});

// --- SỰ KIỆN TỰ ĐỘNG KẾT NỐI LẠI KÊNH THOẠI ---
client.on("voiceStateUpdate", (oldState, newState) => {
    if (oldState.member.id !== client.user.id) return;

    if (!newState.channel) {
        console.log("[VOICE] Bot bị ngắt kết nối khỏi kênh thoại. Đang thử kết nối lại...");
        
        const guild = client.guilds.cache.get(TARGET_GUILD_ID);
        if (!guild) return;
        
        const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
        if (!channel) return;

        joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfMute: true,
            selfDeaf: true
        });
        console.log("[VOICE] Đã kết nối lại kênh thoại thành công.");
    }
});

// ==========================================
//   CẤU HÌNH HỆ THỐNG CHẶN KEY (BLACKLIST)
// ==========================================
const BLACKLIST = [
    "1497621718041104446"
];

const KEY_COMMAND_KEYWORDS = ["key"];

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
            else if (cmdName === "editkey") actionText = "Sửa";
            else if (cmdName === "listkey") actionText = "Xem";

            return interaction.editReply(`<:failed:1518595211205283992> Bạn Không Có Quyền ${actionText} Key! (Blacklist)`);
        }

        // --- COMMAND: ADDKEY ---
        if (interaction.commandName === "addkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("<:failed:1518595211205283992> Bạn không có quyền quản trị viên.");
            }

            const name = cleanKeyName(interaction.options.getString("name"));
            const value = interaction.options.getString("value");

            const { error } = await supabase.from("keys").upsert({ name, value });

            if (error) {
                return interaction.editReply(`<:failed:1518595211205283992> Lỗi: ${error.message}`);
            }

            await sendKeyLog({
                action: "Add Key",
                user: interaction.user,
                guildName: interaction.guild?.name || "Tin nhắn riêng",
                key: name,
                newValue: value
            });

            await updateBotStatus(client, supabase);
            return interaction.editReply(`<:success:1518594913179013141> Đã lưu key: \`${name}\``);
        }

        // --- COMMAND: LISTKEY ---
        if (interaction.commandName === "listkey") {
            const { data, error } = await supabase.from("keys").select("name").order("name", { ascending: true });

            if (error) return interaction.editReply(`<:failed:1518595211205283992> Lỗi: ${error.message}`);
            if (!data || data.length === 0) return interaction.editReply("<:failed:1518595211205283992> Không có key nào trong hệ thống.");

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
                    .setFooter({ text: `Trang ${page + 1}/${totalPages} | Key: ${start + 1}-${end}/${totalKeys}` });

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
                        .setFooter({ text: `Trang ${currentPage + 1}/${totalPages} | Key: ${start + 1}-${end}/${totalKeys}` });

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
            const { data: allKeys, error: fetchError } = await supabase.from("keys").select("*");

            if (fetchError) return interaction.editReply(`<:failed:1518595211205283992> Lỗi đồng bộ dữ liệu: ${fetchError.message}`);

            const target = allKeys?.find(k => cleanKeyName(k.name) === name);
            if (!target) return interaction.editReply(`<:failed:1518595211205283992> Không tìm thấy key \`${name}\` để xóa.`);

            const oldKey = target;
            const { error } = await supabase.from("keys").delete().eq("name", target.name);

            if (error) return interaction.editReply(`<:failed:1518595211205283992> Lỗi khi xóa: ${error.message}`);

            await sendKeyLog({
                action: "Delete Key",
                user: interaction.user,
                guildName: interaction.guild?.name || "Tin nhắn riêng",
                key: oldKey.name,
                oldValue: oldKey.value
            });

            await updateBotStatus(client, supabase);
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

            const { data: allKeys, error: fetchError } = await supabase.from("keys").select("*");

            if (fetchError) return interaction.editReply(`<:failed:1518595211205283992> Lỗi đồng bộ: ${fetchError.message}`);

            const target = allKeys?.find(k => cleanKeyName(k.name) === name);
            if (!target) return interaction.editReply(`<:failed:1518595211205283992> Không tìm thấy key \`${name}\`.`);

            const oldValue = target.value;
            const oldName = target.name;

            const updateData = { value: newValue };
            if (newName) updateData.name = cleanKeyName(newName);

            const { error } = await supabase.from("keys").update(updateData).eq("name", target.name);
            if (error) return interaction.editReply(`<:failed:1518595211205283992> Lỗi khi cập nhật: ${error.message}`);

            const cleanedNewName = newName ? cleanKeyName(newName) : null;

            await sendKeyLog({
                action: "Edit Key",
                user: interaction.user,
                guildName: interaction.guild?.name || "Tin nhắn riêng",
                key: cleanedNewName || oldName,
                oldValue,
                newValue,
                oldName,
                newName: cleanedNewName
            });

            await updateBotStatus(client, supabase);
            return interaction.editReply(`<:success:1518594913179013141> Đã chỉnh sửa thành công key: \`${name}\``);
        }

    } catch (err) {
        console.error(err);
        if (interaction.deferred) {
            interaction.editReply("<:failed:1518595211205283992> Đã xảy ra lỗi không mong muốn trong hệ thống.");
        }
    }
});

// Login & Timeout check
let loggedIn = false;

(async () => {
    try {
        console.log("Starting Discord Login...");
        await client.login(process.env.TOKEN);
        loggedIn = true;
        console.log("LOGIN SUCCESS");
    } catch (err) {
        console.error("LOGIN FAILED:", err);
    }
})();

setTimeout(() => {
    if (!loggedIn) console.log("LOGIN TIMEOUT 30 SECONDS - Token lỗi hoặc mạng có vấn đề!");
}, 30000);

http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot Test Online");
}).listen(process.env.PORT || 3000, () => {
    console.log(`Web Server Running On Port ${process.env.PORT || 3000}`);
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

