const { ActivityType } = require("discord.js");

async function updateBotStatus(client, supabase) {
    try {
        const { count, error } = await supabase
            .from("keys")
            .select("*", {
                count: "exact",
                head: true
            });

        if (error) {
            console.error("[Status]", error);
            return;
        }

        client.user.setActivity({
            name: `${count} Keys`,
            type: ActivityType.Watching
        });

    } catch (err) {
        console.error("[Status]", err);
    }
}

module.exports = {
    updateBotStatus
}; 
