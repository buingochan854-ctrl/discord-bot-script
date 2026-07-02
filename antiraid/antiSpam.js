const config = require("./config");
const cache = require("./cache");
const hasPermission = require("./permissions");
const log = require("./logger");

module.exports = async function(message){

    if(!message.guild) return false;

    if(hasPermission(message.member))
        return false;

    const id = message.author.id;

    if(!cache.spamCache.has(id))
        cache.spamCache.set(id,[]);

    const messages =
        cache.spamCache.get(id);

    const now = Date.now();

    messages.push({

        id:message.id,

        time:now

    });

    const valid =
        messages.filter(

            x=>

            now-x.time<
            config.SPAM.INTERVAL

        );

    cache.spamCache.set(

        id,

        valid

    );

    if(

        valid.length<

        config.SPAM.MAX_MESSAGES

    )

        return false;

    try{

        const fetched=

        await message.channel.messages.fetch({

            limit:100

        });

        const targets=

        fetched.filter(

            m=>

            m.author.id===id&&

            now-m.createdTimestamp<

            config.SPAM.INTERVAL

        );

        for(const msg of targets.values()){

            await msg.delete().catch(()=>{});

        }

        await log(

            message,

            "Spam",

            `${targets.size} tin nhắn trong ${config.SPAM.INTERVAL/1000}s`

        );

        if(

            message.member.moderatable

        ){

            await message.member.timeout(

                config.SPAM.TIMEOUT*

                60*

                1000,

                "Spam"

            ).catch(()=>{});

        }

    }

    catch{}

    cache.spamCache.delete(id);

    return true;

}