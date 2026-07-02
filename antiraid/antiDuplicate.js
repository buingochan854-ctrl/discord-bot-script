const config = require("./config");
const cache = require("./cache");
const hasPermission = require("./permissions");
const log = require("./logger");

module.exports = async function(message){

    if(!message.guild)
        return false;

    if(hasPermission(message.member))
        return false;

    const id =
        message.author.id;

    if(
        !cache.duplicateCache.has(id)
    ){

        cache.duplicateCache.set(

            id,

            []

        );

    }

    const list=

    cache.duplicateCache.get(id);

    const now=

    Date.now();

    list.push({

        content:

        message.content,

        time:now

    });

    const valid=

    list.filter(

        x=>

        now-x.time<

        config.DUPLICATE.INTERVAL

    );

    cache.duplicateCache.set(

        id,

        valid

    );

    const count=

    valid.filter(

        x=>

        x.content===

        message.content

    ).length;

    if(

        count<

        config.DUPLICATE.MAX_MESSAGES

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

            m.content===message.content

        );

        for(

            const msg of

            targets.values()

        ){

            await msg.delete().catch(()=>{});

        }

        await log(

            message,

            "Duplicate",

            "Gửi cùng một nội dung nhiều lần"

        );

    }

    catch{}

    cache.duplicateCache.delete(id);

    return true;

}