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

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "addkey") {

        if (
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        ) {
            return interaction.reply({
                content: "Bạn không có quyền dùng lệnh này.",
                flags: 64
            });
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
            return interaction.reply(
                `Lỗi: ${error.message}`
            );
        }

        return interaction.reply(
            `Đã lưu key: ${name}`
        );
    }

    if (interaction.commandName === "listkey") {

        const { data, error } = await supabase
            .from("keys")
            .select("name");

        if (error) {
            return interaction.reply(
                `Lỗi: ${error.message}`
            );
        }

        if (!data.length) {
            return interaction.reply(
                "Không có key nào."
            );
        }

        return interaction.reply(
            data.map(x => x.name).join("\n")
        );
    }

    if (interaction.commandName === "delkey") {

        if (
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        ) {
            return interaction.reply({
                content: "Bạn không có quyền dùng lệnh này.",
                flags: 64
            });
        }

        const name = interaction.options.getString("name");

        const { error } = await supabase
            .from("keys")
            .delete()
            .eq("name", name);

        if (error) {
            return interaction.reply(
                `Lỗi: ${error.message}`
            );
        }

        return interaction.reply(
            `Đã xóa key: ${name}`
        );
    }

});

client.on("messageCreate", async message => {

    if (message.author.bot) return;

    const keyName = message.content.trim();

    const { data } = await supabase
        .from("keys")
        .select("value")
        .eq("name", keyName)
        .single();

    if (data) {
        return message.reply(data.value);
    }

});

client.login(TOKEN); 
