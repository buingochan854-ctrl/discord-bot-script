const { exec } = require("child_process");

// exec("yt-dlp --version", (err, stdout, stderr) => {
//     console.log("YT-DLP VERSION:", stdout || stderr || err?.message);
// });

exec("ffmpeg -version", (err, stdout, stderr) => {
    console.log("FFMPEG:", stdout?.split("\n")[0] || stderr || err?.message);
});

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
    StringSelectMenuBuilder,
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

// Import caches
const keyCache = require("./cache/keyCache");
const keyChannelCache = require("./cache/keyChannelCache");

// Owner ID
const OWNER_ID = "1455796719378895022";

console.log("================================");
console.log("Discord.js Version:", version);
console.log("Node Version:", process.version);
console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);
console.log("OWNER ID:", OWNER_ID);
console.log("================================");

// Voice constants
const TARGET_GUILD_ID = "1466331775931383853";
const TARGET_VOICE_CHANNEL_ID = "1519747573873643641";

// Test Discord gateway
https.get("https://discord.com/api/v10/gateway", (res) => {
    console.log("Gateway Status:", res.statusCode);
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
        console.log("Gateway Response:", data);
    });
}).on("error", (err) => {
    console.error("Gateway Error:", err);
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

// AntiRaid cache cleaner
const webhookCache = require("./antiraid/webhookCache");
const antiRaidConfig = require("./antiraid/config");

setInterval(() => {
    const now = Date.now();
    const cache = webhookCache.values();
    for (const [id, value] of cache) {
        if (now - value.lastViolation > antiRaidConfig.WEBHOOK.RESET_WARN) {
            cache.delete(id);
        }
    }
}, 60000);

require("./events/messageCreate")(client);

// ---------- Slash Commands ----------
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
        .addStringOption(option => option.setName("newname").setDescription("Tên mới của key (Nếu muốn đổi tên)").setRequired(false)),

    new SlashCommandBuilder()
        .setName("setstatus")
        .setDescription("Đổi trạng thái Bot"),

    new SlashCommandBuilder()
        .setName("keychannel")
        .setDescription("Quản lý giới hạn key theo kênh")
        .addSubcommand(sub => sub
            .setName("add")
            .setDescription("Thêm rule mới")
            .addStringOption(option => 
                option.setName("name").setDescription("Tên key").setRequired(true)
            )
            .addChannelOption(option => 
                option.setName("channel").setDescription("Kênh được phép dùng").setRequired(true)
            )
            .addStringOption(option => 
                option.setName("value").setDescription("Thông báo khi sai kênh").setRequired(true)
            )
            .addStringOption(option => 
                option.setName("end").setDescription("Hậu tố key (VD: VIP)").setRequired(false)
            )
            .addStringOption(option => 
                option.setName("guild_id").setDescription("Guild ID (để trống sẽ tự lấy)").setRequired(false)
            )
        )
        .addSubcommand(sub =>
            sub
                .setName("end")
                .setDescription("Tạo rule theo hậu tố")
                .addStringOption(o =>
                    o.setName("textend").setDescription("Hậu tố (VD: Hub)").setRequired(true)
                )
                .addChannelOption(o =>
                    o.setName("channel").setDescription("Kênh được phép dùng").setRequired(true)
                )
                .addStringOption(o =>
                    o.setName("value").setDescription("Thông báo khi sai kênh").setRequired(true)
                )
                .addStringOption(o =>
                    o.setName("guild_id").setDescription("Guild ID (để trống sẽ tự lấy)").setRequired(false)
                )
        )
        .addSubcommand(sub => sub
            .setName("list")
            .setDescription("Xem danh sách rules")
        )
        .addSubcommand(sub => sub
            .setName("edit")
            .setDescription("Sửa rule")
            .addStringOption(option => 
                option.setName("name").setDescription("Tên key cần sửa").setRequired(true)
            )
            .addChannelOption(option => 
                option.setName("channel").setDescription("Kênh mới").setRequired(false)
            )
            .addStringOption(option => 
                option.setName("end").setDescription("Hậu tố mới").setRequired(false)
            )
            .addStringOption(option => 
                option.setName("value").setDescription("Thông báo mới").setRequired(false)
            )
        )
        .addSubcommand(sub => sub
            .setName("delete")
            .setDescription("Xóa rule")
            .addStringOption(option => 
                option.setName("name").setDescription("Tên key cần xóa").setRequired(true)
            )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("Xóa Rule (normal hoặc suffix)")
                .addStringOption(o =>
                    o.setName("name").setDescription("Tên key (cho rule normal)").setRequired(false)
                )
                .addStringOption(o =>
                    o.setName("textend").setDescription("Hậu tố (cho rule suffix)").setRequired(false)
                )
        )
        .addSubcommand(sub => sub
            .setName("info")
            .setDescription("Xem thông tin cache")
        )
].map(cmd => cmd.toJSON());

client.on("warn", console.log);
client.on("error", console.error);

client.once("clientReady", async () => {
    console.log("================================");
    console.log("BOT READY");
    console.log("BOT:", client.user.tag);
    console.log("================================");

    // Load caches
    await Promise.all([
        keyCache.load(),
        keyChannelCache.load()
    ]);

    // Cập nhật trạng thái lần đầu
    await updateBotStatus(client);

    // Cập nhật lại mỗi 15 giây (để làm mới ping)
    setInterval(() => {
        updateBotStatus(client);
    }, 15000);

    // Voice 24/7
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
                console.log("[VOICE] Không tìm thấy kênh thoại.");
            }
        } else {
            console.log("[VOICE] Không tìm thấy server.");
        }
    } catch (err) {
        console.error("[VOICE JOIN ERROR]:", err);
    }

    // Register commands
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
        }
    } catch (err) {
        console.error("Supabase Error:", err);
    }
});

// Auto reconnect voice
client.on("voiceStateUpdate", (oldState, newState) => {
    if (oldState.member.id !== client.user.id) return;
    if (!newState.channel) {
        console.log("[VOICE] Bot bị ngắt kết nối. Đang thử kết nối lại...");
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
        console.log("[VOICE] Đã kết nối lại.");
    }
});

// Blacklist
const BLACKLIST = ["1497621718041104446"];
const KEY_COMMAND_KEYWORDS = ["key"];

// ---------- Interaction Handling ----------
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const cmdName = interaction.commandName;

        // Blacklist check
        const isKeyCommand = KEY_COMMAND_KEYWORDS.some(kw => cmdName.includes(kw));
        if (BLACKLIST.includes(userId) && isKeyCommand) {
            let actionText = "Thao Tác";
            if (cmdName === "addkey") actionText = "Thêm";
            else if (cmdName === "delkey") actionText = "Xóa";
            else if (cmdName === "editkey") actionText = "Sửa";
            else if (cmdName === "listkey") actionText = "Xem";
            return interaction.editReply(`<:failed:1518595211205283992> Bạn Không Có Quyền ${actionText} Key! (Blacklist)`);
        }

        // ---------- /setstatus ----------
        if (cmdName === "setstatus") {
            if (interaction.user.id !== OWNER_ID) {
                return interaction.editReply("❌ Chỉ Owner Bot mới được dùng lệnh này.");
            }
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("bot_status")
                    .setPlaceholder("Chọn trạng thái Bot")
                    .addOptions([
                        { label: "🟢 Trực Tuyến", value: "online" },
                        { label: "⛔ Vui Lòng Không Làm Phiền", value: "dnd" },
                        { label: "🌙 Chờ", value: "idle" },
                        { label: "⚫ Vô Hình", value: "invisible" }
                    ])
            );
            return interaction.editReply({
                content: "## ⚙️ Menu đổi trạng thái Bot",
                components: [row]
            });
        }

        // ---------- /addkey ----------
        if (cmdName === "addkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("<:failed:1518595211205283992> Bạn không có quyền quản trị viên.");
            }
            const name = cleanKeyName(interaction.options.getString("name"));
            const value = interaction.options.getString("value");

            const { error } = await supabase.from("keys").upsert({ name, value });
            if (error) return interaction.editReply(`<:failed:1518595211205283992> Lỗi: ${error.message}`);

            // Update cache
            keyCache.set(name, value);

            // Cập nhật status ngay (không chặn)
            setImmediate(() => updateBotStatus(client));

            setImmediate(() => {
                sendKeyLog({
                    action: "Add Key",
                    user: interaction.user,
                    guildName: interaction.guild?.name || "Tin nhắn riêng",
                    key: name,
                    newValue: value
                });
            });

            return interaction.editReply(`<:success:1518594913179013141> Đã lưu key: \`${name}\``);
        }

        // ---------- /listkey ----------
        if (cmdName === "listkey") {
            const keys = keyCache.getAll();
            if (!keys || keys.length === 0) {
                return interaction.editReply("<:failed:1518595211205283992> Không có key nào trong hệ thống.");
            }
            const data = keys.sort((a, b) => a.name.localeCompare(b.name));
            const totalKeys = data.length;
            const keysPerPage = 30;
            const totalPages = Math.ceil(totalKeys / keysPerPage);
            let currentPage = 0;

            const generatePageMessage = (page) => {
                const start = page * keysPerPage;
                const end = Math.min(start + keysPerPage, totalKeys);
                const pageKeys = data.slice(start, end).map((x, idx) => `${start + idx + 1}. ${x.name}`);

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
                    const pageKeys = data.slice(start, end).map((x, idx) => `${start + idx + 1}. ${x.name}`);
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

        // ---------- /delkey ----------
        if (cmdName === "delkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("<:failed:1518595211205283992> Bạn không có quyền quản trị viên.");
            }
            const name = cleanKeyName(interaction.options.getString("name"));
            const target = keyCache.get(name);
            if (!target) {
                return interaction.editReply(`<:failed:1518595211205283992> Không tìm thấy key \`${name}\` để xóa.`);
            }

            const { error } = await supabase.from("keys").delete().eq("name", target.name);
            if (error) return interaction.editReply(`<:failed:1518595211205283992> Lỗi khi xóa: ${error.message}`);

            keyCache.deleteKey(name);

            // Xóa rule liên quan nếu có
            const { error: delRuleErr } = await supabase
                .from("key_channels")
                .delete()
                .eq("name", target.name);
            if (!delRuleErr) {
                keyChannelCache.removeRule(target.name, null);
            }

            // Cập nhật status ngay
            setImmediate(() => updateBotStatus(client));

            setImmediate(() => {
                sendKeyLog({
                    action: "Delete Key",
                    user: interaction.user,
                    guildName: interaction.guild?.name || "Tin nhắn riêng",
                    key: name,
                    oldValue: target.value
                });
            });

            return interaction.editReply(`<:success:1518594913179013141> Đã xóa thành công key: \`${name}\``);
        }

        // ---------- /editkey ----------
        if (cmdName === "editkey") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply("<:failed:1518595211205283992> Bạn không có quyền quản trị viên.");
            }
            const name = cleanKeyName(interaction.options.getString("name"));
            const newName = interaction.options.getString("newname");
            const newValue = interaction.options.getString("newvalue");

            const target = keyCache.get(name);
            if (!target) {
                return interaction.editReply(`<:failed:1518595211205283992> Không tìm thấy key \`${name}\`.`);
            }

            const updateData = { value: newValue };
            if (newName) {
                const cleanedNewName = cleanKeyName(newName);
                updateData.name = cleanedNewName;
            }

            const { error } = await supabase.from("keys").update(updateData).eq("name", target.name);
            if (error) return interaction.editReply(`<:failed:1518595211205283992> Lỗi khi cập nhật: ${error.message}`);

            // Update cache
            keyCache.deleteKey(name);
            const finalName = newName ? cleanKeyName(newName) : name;
            keyCache.set(finalName, newValue);

            // Update rule name if changed
            if (newName) {
                const { error: updRuleErr } = await supabase
                    .from("key_channels")
                    .update({ name: cleanKeyName(newName) })
                    .eq("name", target.name);
                if (!updRuleErr) {
                    keyChannelCache.removeRule(target.name, null);
                    // Cần reload vì addRule phức tạp hơn
                    await keyChannelCache.reload();
                }
            }

            // Cập nhật status (tùy chọn, để làm mới ping)
            setImmediate(() => updateBotStatus(client));

            setImmediate(() => {
                sendKeyLog({
                    action: "Edit Key",
                    user: interaction.user,
                    guildName: interaction.guild?.name || "Tin nhắn riêng",
                    key: finalName,
                    oldValue: target.value,
                    newValue,
                    oldName: target.name,
                    newName: finalName
                });
            });

            return interaction.editReply(`<:success:1518594913179013141> Đã chỉnh sửa thành công key: \`${name}\``);
        }

        // ---------- /keychannel ----------
        if (cmdName === "keychannel") {
            const sub = interaction.options.getSubcommand();

            // ---- /keychannel add ----
            if (sub === "add") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.editReply("❌ Bạn không có quyền sử dụng lệnh này.");
                }
                try {
                    const name = cleanKeyName(interaction.options.getString("name"));
                    const channel = interaction.options.getChannel("channel");
                    const value = interaction.options.getString("value");
                    const end = interaction.options.getString("end") || null;
                    const guildId = interaction.options.getString("guild_id") || interaction.guild.id;

                    // Check if key exists
                    const keyExists = keyCache.get(name);
                    if (!keyExists) {
                        return interaction.editReply(`❌ Key \`${name}\` không tồn tại. Vui lòng tạo key trước bằng /addkey`);
                    }

                    // Check duplicate rule
                    const existing = keyChannelCache.findRule(name);
                    if (existing) {
                        return interaction.editReply(`❌ Rule này đã tồn tại.\n📌 Key: \`${name}\`\n🔚 End: \`${existing.end || "Không có"}\``);
                    }

                    const { error } = await supabase.from("key_channels").insert({
                        mode: "normal",
                        name,
                        end,
                        guild_id: guildId,
                        channel_id: channel.id,
                        value
                    });
                    if (error) return interaction.editReply(`❌ ${error.message}`);

                    // Update cache
                    const newRule = { mode: "normal", name, end, guild_id: guildId, channel_id: channel.id, value };
                    keyChannelCache.addRule(newRule);

                    const embed = new EmbedBuilder()
                        .setColor("#00FF00")
                        .setTitle("✅ Đã tạo rule thành công")
                        .addFields(
                            { name: "📌 Key", value: `\`${name}\``, inline: true },
                            { name: "🔚 End", value: end ? `\`${end}\`` : "Không có", inline: true },
                            { name: "🏠 Guild", value: `\`${guildId}\``, inline: true },
                            { name: "📺 Channel", value: `<#${channel.id}>`, inline: true },
                            { name: "💬 Thông báo", value: `\`${truncateString(value, 50)}\``, inline: false }
                        )
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });

                    setImmediate(() => {
                        sendKeyLog({
                            action: "Add KeyChannel Rule",
                            user: interaction.user,
                            guildName: interaction.guild?.name || "Tin nhắn riêng",
                            key: name,
                            newValue: `Kênh: ${channel.name} | Guild: ${guildId} | End: ${end || "Không"}`
                        });
                    });
                } catch (err) {
                    console.error("KeyChannel Add Error:", err);
                    return interaction.editReply("❌ Đã xảy ra lỗi khi tạo rule.");
                }
            }

            // ---- /keychannel end ----
            if (sub === "end") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.editReply("❌ Bạn không có quyền sử dụng lệnh này.");
                }
                try {
                    const textend = interaction.options.getString("textend").toLowerCase();
                    const channel = interaction.options.getChannel("channel");
                    const guildId = interaction.options.getString("guild_id") || interaction.guild.id;
                    const value = interaction.options.getString("value");

                    const existing = keyChannelCache.get().find(r => r.mode === "suffix" && r.end.toLowerCase() === textend);
                    if (existing) {
                        return interaction.editReply(`❌ Rule hậu tố \`${textend}\` đã tồn tại.\n📺 Channel: <#${existing.channel_id}>`);
                    }

                    const { error } = await supabase.from("key_channels").insert({
                        mode: "suffix",
                        name: null,
                        end: textend,
                        guild_id: guildId,
                        channel_id: channel.id,
                        value
                    });
                    if (error) return interaction.editReply(`❌ ${error.message}`);

                    const newRule = { mode: "suffix", name: null, end: textend, guild_id: guildId, channel_id: channel.id, value };
                    keyChannelCache.addRule(newRule);

                    const embed = new EmbedBuilder()
                        .setColor("#00FF00")
                        .setTitle("✅ Đã tạo Rule hậu tố thành công")
                        .addFields(
                            { name: "🔚 Hậu tố", value: `\`${textend}\``, inline: true },
                            { name: "🏠 Guild", value: `\`${guildId}\``, inline: true },
                            { name: "📺 Channel", value: `<#${channel.id}>`, inline: true },
                            { name: "💬 Thông báo", value: `\`${truncateString(value, 50)}\``, inline: false }
                        )
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });

                    setImmediate(() => {
                        sendKeyLog({
                            action: "Add Suffix Rule",
                            user: interaction.user,
                            guildName: interaction.guild?.name || "Tin nhắn riêng",
                            key: `*${textend}`,
                            newValue: `Kênh: ${channel.name} | Guild: ${guildId}`
                        });
                    });
                } catch (err) {
                    console.error("KeyChannel End Error:", err);
                    return interaction.editReply("❌ Đã xảy ra lỗi khi tạo rule hậu tố.");
                }
            }

            // ---- /keychannel list ----
            if (sub === "list") {
                const rules = keyChannelCache.get();
                if (!rules || rules.length === 0) {
                    return interaction.editReply("📭 Không có rule nào trong hệ thống.");
                }
                const normalRules = rules.filter(r => r.mode === "normal" || !r.mode);
                const suffixRules = rules.filter(r => r.mode === "suffix");
                let desc = "";
                if (normalRules.length > 0) {
                    desc += "**📌 Rule Normal:**\n";
                    desc += normalRules.map((r, i) => 
                        `${i + 1}. **${r.name}** ${r.end ? `\`[${r.end}]\`` : ''}\n` +
                        `   📺 <#${r.channel_id}> | 🏠 \`${r.guild_id}\``
                    ).join("\n");
                }
                if (suffixRules.length > 0) {
                    if (desc) desc += "\n\n";
                    desc += "**🔚 Rule Hậu tố:**\n";
                    desc += suffixRules.map((r, i) => 
                        `${i + 1}. **${r.end}**\n` +
                        `   📺 <#${r.channel_id}> | 🏠 \`${r.guild_id}\``
                    ).join("\n");
                }
                const embed = new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("📋 Danh sách KeyChannel Rules")
                    .setDescription(desc || "Không có rule nào")
                    .setFooter({ text: `Tổng: ${rules.length} rules (${normalRules.length} normal, ${suffixRules.length} suffix)` })
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            // ---- /keychannel edit ----
            if (sub === "edit") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.editReply("❌ Bạn không có quyền sử dụng lệnh này.");
                }
                try {
                    const name = cleanKeyName(interaction.options.getString("name"));
                    const channel = interaction.options.getChannel("channel");
                    const end = interaction.options.getString("end");
                    const value = interaction.options.getString("value");

                    const existing = keyChannelCache.findRule(name);
                    if (!existing) {
                        return interaction.editReply(`❌ Không tìm thấy rule cho key \`${name}\``);
                    }

                    const updateData = {};
                    if (channel) updateData.channel_id = channel.id;
                    if (end !== undefined && end !== null) updateData.end = end;
                    if (value) updateData.value = value;
                    if (Object.keys(updateData).length === 0) {
                        return interaction.editReply("❌ Không có thông tin nào để cập nhật.");
                    }

                    const { error } = await supabase.from("key_channels").update(updateData).eq("name", existing.name);
                    if (error) return interaction.editReply(`❌ ${error.message}`);

                    // Reload keyChannel cache (vì đã sửa)
                    await keyChannelCache.reload();

                    const embed = new EmbedBuilder()
                        .setColor("#FFA500")
                        .setTitle("✅ Đã cập nhật rule thành công")
                        .addFields(
                            { name: "📌 Key", value: `\`${name}\``, inline: true },
                            { name: "🔚 End", value: end !== undefined && end !== null ? `\`${end || "Không có"}\`` : "Không đổi", inline: true },
                            { name: "📺 Channel", value: channel ? `<#${channel.id}>` : "Không đổi", inline: true },
                            { name: "💬 Thông báo", value: value ? `\`${truncateString(value, 50)}\`` : "Không đổi", inline: false }
                        )
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });

                    setImmediate(() => {
                        sendKeyLog({
                            action: "Edit KeyChannel Rule",
                            user: interaction.user,
                            guildName: interaction.guild?.name || "Tin nhắn riêng",
                            key: name,
                            newValue: `Cập nhật rule: ${JSON.stringify(updateData)}`
                        });
                    });
                } catch (err) {
                    console.error("KeyChannel Edit Error:", err);
                    return interaction.editReply("❌ Đã xảy ra lỗi khi cập nhật rule.");
                }
            }

            // ---- /keychannel delete ----
            if (sub === "delete") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.editReply("❌ Bạn không có quyền sử dụng lệnh này.");
                }
                try {
                    const name = cleanKeyName(interaction.options.getString("name"));
                    const existing = keyChannelCache.findRule(name);
                    if (!existing) {
                        return interaction.editReply(`❌ Không tìm thấy rule cho key \`${name}\``);
                    }

                    const { error } = await supabase.from("key_channels").delete().eq("name", existing.name);
                    if (error) return interaction.editReply(`❌ ${error.message}`);

                    keyChannelCache.removeRule(existing.name, null);

                    const embed = new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("🗑️ Đã xóa rule thành công")
                        .addFields(
                            { name: "📌 Key", value: `\`${name}\``, inline: true },
                            { name: "🔚 End", value: existing.end ? `\`${existing.end}\`` : "Không có", inline: true }
                        )
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });

                    setImmediate(() => {
                        sendKeyLog({
                            action: "Delete KeyChannel Rule",
                            user: interaction.user,
                            guildName: interaction.guild?.name || "Tin nhắn riêng",
                            key: name,
                            oldValue: `Đã xóa rule`
                        });
                    });
                } catch (err) {
                    console.error("KeyChannel Delete Error:", err);
                    return interaction.editReply("❌ Đã xảy ra lỗi khi xóa rule.");
                }
            }

            // ---- /keychannel remove ----
            if (sub === "remove") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.editReply("❌ Bạn không có quyền sử dụng lệnh này.");
                }
                try {
                    const name = interaction.options.getString("name");
                    const textend = interaction.options.getString("textend");
                    let deletedRule = null;

                    if (name) {
                        const cleanName = cleanKeyName(name);
                        const existing = keyChannelCache.findRule(cleanName);
                        if (!existing || existing.mode === "suffix") {
                            return interaction.editReply(`❌ Không tìm thấy rule normal cho key \`${name}\``);
                        }
                        deletedRule = existing;
                        const { error } = await supabase
                            .from("key_channels")
                            .delete()
                            .eq("mode", "normal")
                            .eq("name", cleanName);
                        if (error) return interaction.editReply(`❌ ${error.message}`);
                        keyChannelCache.removeRule(cleanName, null);
                    } else if (textend) {
                        const cleanEnd = textend.toLowerCase();
                        const rules = keyChannelCache.get();
                        const found = rules.find(r => r.mode === "suffix" && r.end.toLowerCase() === cleanEnd);
                        if (!found) {
                            return interaction.editReply(`❌ Không tìm thấy rule hậu tố \`${textend}\``);
                        }
                        deletedRule = found;
                        const { error } = await supabase
                            .from("key_channels")
                            .delete()
                            .eq("mode", "suffix")
                            .eq("end", cleanEnd);
                        if (error) return interaction.editReply(`❌ ${error.message}`);
                        keyChannelCache.removeRule(null, cleanEnd);
                    } else {
                        return interaction.editReply("❌ Vui lòng nhập **name** (cho rule normal) hoặc **textend** (cho rule suffix).");
                    }

                    const embed = new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("🗑️ Đã xóa Rule thành công")
                        .addFields(
                            { name: "📌 Loại", value: deletedRule.mode === "suffix" ? "Hậu tố" : "Normal", inline: true },
                            { name: "📌 Tên", value: deletedRule.mode === "suffix" ? `\`*${deletedRule.end}\`` : `\`${deletedRule.name}\``, inline: true },
                            { name: "📺 Channel", value: `<#${deletedRule.channel_id}>`, inline: true }
                        )
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });

                    setImmediate(() => {
                        sendKeyLog({
                            action: "Remove Rule",
                            user: interaction.user,
                            guildName: interaction.guild?.name || "Tin nhắn riêng",
                            key: deletedRule.mode === "suffix" ? `*${deletedRule.end}` : deletedRule.name,
                            oldValue: `Đã xóa rule ${deletedRule.mode}`
                        });
                    });
                } catch (err) {
                    console.error("KeyChannel Remove Error:", err);
                    return interaction.editReply("❌ Đã xảy ra lỗi khi xóa rule.");
                }
            }

            // ---- /keychannel info ----
            if (sub === "info") {
                const info = keyChannelCache.getInfo();
                const embed = new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("ℹ️ Thông tin KeyChannel Cache")
                    .addFields(
                        { name: "📊 Tổng số rules", value: `\`${info.size}\``, inline: true },
                        { name: "📌 Normal rules", value: `\`${info.normalRules || 0}\``, inline: true },
                        { name: "🔚 Suffix rules", value: `\`${info.suffixRules || 0}\``, inline: true },
                        { name: "🔄 Cập nhật lần cuối", value: info.lastUpdate ? `<t:${Math.floor(info.lastUpdate.getTime()/1000)}:R>` : "Chưa có", inline: false }
                    )
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
        }

    } catch (err) {
        console.error(err);
        if (interaction.deferred) {
            interaction.editReply("<:failed:1518595211205283992> Đã xảy ra lỗi không mong muốn trong hệ thống.");
        }
    }
});

// ---------- String Select Menu (setstatus) ----------
client.on("interactionCreate", async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "bot_status") return;
    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: "❌ Chỉ Owner Bot mới dùng được.", ephemeral: true });
    }

    try {
        const value = interaction.values[0];
        await client.user.setStatus(value);
        let text = "";
        switch (value) {
            case "online": text = "🟢 Trực Tuyến"; break;
            case "idle": text = "🌙 Chờ"; break;
            case "dnd": text = "⛔ Vui Lòng Không Làm Phiền"; break;
            case "invisible": text = "⚫ Vô Hình"; break;
            default: text = value;
        }
        await interaction.update({
            content: `✅ Đã đổi trạng thái thành **${text}**.`,
            components: []
        });
        console.log(`[STATUS] Changed to ${value} by ${interaction.user.tag}`);
    } catch (err) {
        console.error("[STATUS ERROR]", err);
        await interaction.reply({ content: "❌ Đã xảy ra lỗi khi đổi trạng thái.", ephemeral: true });
    }
});

// ---------- Login ----------
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

// ---------- Web Server ----------
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot Test Online");
}).listen(process.env.PORT || 3000, () => {
    console.log(`Web Server Running On Port ${process.env.PORT || 3000}`);
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);