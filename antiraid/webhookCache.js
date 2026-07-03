const cache = new Map();

module.exports = {

    get(id){

        if(!cache.has(id)){

            cache.set(id,{

                warns:0,

                messages:[],

                lastViolation:0

            });

        }

        return cache.get(id);

    },

    delete(id){

        cache.delete(id);

    },

    values(){

        return cache;

    }

}