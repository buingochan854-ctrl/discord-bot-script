const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require("discord.js");

const { createClient } = require("@supabase/supabase-js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const http = require("http");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

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
                .setDescription("Giá trị key")
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

client.once("ready", async () => {

    console.log(`${client.user.tag} Online`);

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
        }

        const rest = new REST({
            version: "10"
        }).setToken(TOKEN);

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            {
                body: commands
            }
        );

        console.log("Slash Commands Loaded");

    } catch (err) {
        console.error(err);
    }

});

// ==========================================
// XỬ LÝ SLASH COMMANDS (ĐÃ ĐƯỢC CẬP NHẬT)
// ==========================================
client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    try {

        if (interaction.commandName === "addkey") {

            await interaction.deferReply();

            if (
                !interaction.member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )
            ) {
                return interaction.editReply(
                    "Bạn không có quyền dùng lệnh này."
                );
            }

            const name = interaction.options.getString("name");
            const value = interaction.options.getString("value");

            const { error } = await supabase
                .from("keys")
                .upsert({
                    name,
                    value
                });

            if (error) {
                return interaction.editReply(
                    `Lỗi: ${error.message}`
                );
            }

            return interaction.editReply(
                `Đã lưu key: ${name}`
            );
        }

        if (interaction.commandName === "listkey") {

            await interaction.deferReply();

            const { data, error } = await supabase
                .from("keys")
                .select("name");

            if (error) {
                return interaction.editReply(
                    `Lỗi: ${error.message}`
                );
            }

            if (!data || !data.length) {
                return interaction.editReply(
                    "Không có key nào."
                );
            }

            const text = data
                .map(x => x.name)
                .join("\n");

            if (text.length > 1900) {
                return interaction.editReply(
                    `Có ${data.length} key. Danh sách quá dài để hiển thị.`
                );
            }

            return interaction.editReply(text);
        }

        if (interaction.commandName === "delkey") {

            await interaction.deferReply();

            if (
                !interaction.member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )
            ) {
                return interaction.editReply(
                    "Bạn không có quyền dùng lệnh này."
                );
            }

            const name = interaction.options.getString("name");

            const { error } = await supabase
                .from("keys")
                .delete()
                .eq("name", name);

            if (error) {
                return interaction.editReply(
                    `Lỗi: ${error.message}`
                );
            }

            return interaction.editReply(
                `Đã xóa key: ${name}`
            );
        }

    } catch (err) {

        console.error(err);

        if (interaction.deferred || interaction.replied) {
            return interaction.editReply(
                "Đã xảy ra lỗi khi xử lý lệnh."
            );
        }

        return interaction.reply({
            content: "Đã xảy ra lỗi khi xử lý lệnh.",
            ephemeral: true
        });
    }

});

client.on("messageCreate", async message => {

    if (message.author.bot) return;

    try {
        const keyName = message.content.trim();

        const { data } = await supabase
            .from("keys")
            .select("value")
            .eq("name", keyName)
            .single();

        if (data) {
            return message.reply(data.value);
        }
    } catch (err) {
        console.error(err);
    }

});

client.login(TOKEN);

http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });
    res.end("Bot Online");
}).listen(process.env.PORT || 3000, () => {
    console.log(`Web Server Running On Port ${process.env.PORT || 3000}`);
});

// ==========================================
// CƠ CHẾ CHỐNG SẬP BOT (CATCH UNHANDLED ERRORS)
// ==========================================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
