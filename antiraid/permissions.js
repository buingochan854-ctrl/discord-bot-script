const config = require("./config");

module.exports = function(member) {

    if (!member) return false;

    return config.BYPASS.some(permission =>
        member.permissions.has(permission)
    );

};