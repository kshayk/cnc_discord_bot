const Discord = require("discord.js");
const ms = require("ms");

module.exports.run = async (bot, message, args, helpers) => {
    //$tempmute @user:232 1s/m/h/d/w
    if( ! message.guild.me.hasPermission("KICK_MEMBERS")) {
            return message.channel.send(helpers.embedErrorMessage("The bot does not have permission to mute on this server"));
    }

    if( ! message.member.hasPermission("KICK_MEMBERS")) {
        return message.channel.send(helpers.embedErrorMessage("You do not have permission to mute a user"));
    }

    var tagged_member = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));

    if( ! tagged_member) {
        return message.reply(helpers.embedErrorMessage("This user does not exist in this guild"));
    }

    if(tagged_member.hasPermission("MANAGE_MESSAGES")) {
        return message.reply(helpers.embedErrorMessage("You can not mute this user"));
    }

    var mute_role = message.guild.roles.find("name", "muted");

    if( ! mute_role) {
        //role "muted" does not exist
        try {
            mute_role = await message.guild.createRole({
                name: "muted",
                color: "#383838",
                premissions: []
            });

            message.guild.channels.forEach(async (channel, id) => {
                await channel.overwritePermissions(mute_role, {
                    SEND_MESSAGES: false,
                    ADD_REACTIONS: false
                });
            });
        } catch(e) {
            console.log(e.stack);
        }
    }

    var mute_time = args[1];

    if( ! mute_time || mute_time === null || mute_time === "") {
        return message.channel.send(helpers.embedErrorMessage("Time period must be specified"));
    }

    if(/^\d+$/.test(mute_time.replace(" ", ""))) {
        return message.channel.send(helpers.embedErrorMessage("The time period can only be specified by words. For example: 2s, 3 minutes"));
    }

    var ms_muted_time = ms(mute_time);

    if((ms_muted_time / 1000) > 3600) {
        return message.channel.send(helpers.embedWarningMessage("You can not mute a user for more than an hour"));
    }

    if(message.member.roles.find("name", "muted")){
       return message.channel.send(helpers.embedWarningMessage("This user is already muted"));
    }

    await(tagged_member.addRole(mute_role.id));

    message.channel.send(`<@${tagged_member.id}> has been muted for ${ms(ms_muted_time, { long: true })}`);

    setTimeout(function() {
        tagged_member.removeRole(mute_role.id);
        message.channel.send(`<@${tagged_member.id}> is now un-muted.`);
    }, ms(mute_time));
}

module.exports.help = {
    name: "tempmute",
    description: "Will temporary mute a member. Usage: $tempmute @user:123 20s"
}
