const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
    console.log("READY!");
});

client.login(process.env.TOKEN)
    .then(() => console.log("LOGIN SUCCESS"))
    .catch(err => console.error("LOGIN ERROR:", err));
