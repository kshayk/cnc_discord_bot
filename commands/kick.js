const Discord = require('discord.js');

const bot = new Discord.Client({disableEveryone: true});

module.exports.run = async (bot, message, args, helpers) => {
    if( ! message.guild.me.hasPermission("KICK_MEMBERS")) {
            return message.channel.send(helpers.embedErrorMessage("The bot does not have permission to kick on this server"));
    }

    if( ! message.member.hasPermission("KICK_MEMBERS")) {
        return message.channel.send(helpers.embedErrorMessage("You do not have permission to kick a user"));
    }

    var kicked_user = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
    if( ! kicked_user) {
         return message.channel.send(helpers.embedErrorMessage("A valid user must be provided as the first argument for this command"));
    }

    if(kicked_user.hasPermission("KICK_MEMBERS")) {
        return message.channel.send(helpers.embedErrorMessage("You do not have permission to kick this user"));
    }

    var kick_reason = args.join(" ").slice(22);
    if(kick_reason.replace(" ", "") === null || kick_reason.replace(" ", "") === "") {
        return message.channel.send(helpers.embedErrorMessage("You must provide a reason for the kick"));
    }

    let reportsChannel = message.guild.channels.find(`name`, 'reports') || message.guild.channels.find(`name`, 'spam');

    if( ! reportsChannel) {
        return message.channel.send(helpers.embedErrorMessage("To kick a user, the server must have a 'reports' channel"));
    }

    var kickConfirmEmbed = new Discord.RichEmbed()
        .setDescription("Kick user?")
        .setColor("#15f153")
        .addField("User pending kick", `${kicked_user} with ID: ${kicked_user.id}`)
        .addField("Reason", kick_reason)
        .setFooter("at least 5 votes (positive or negative) required to proceed with the kick. After a minute this poll will close.")

    var embedConfirm = message.channel.send(kickConfirmEmbed).then(async function (my_message) {
        await my_message.react('👍');
        await my_message.react('👎');

        // Create a reaction collector
        var filter = (reaction, user) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎'
        var collected = await my_message.awaitReactions(filter,  { time: 60000 });
        var agree = await collected.get('👍') && await collected.get('👍').count-1;
        var disagree = await collected.get('👎') && await collected.get('👎').count-1;

        if(agree && agree >= 3 && agree > disagree) {
            my_message.delete();

            //TODO: Kick user here
            message.guild.member(kicked_user).kick(kick_reason);

            let reportEmbed = new Discord.RichEmbed()
                .setDescription("User kick")
                .setColor("#15f153")
                .addField("Kicked User", `${kicked_user} with ID: ${kicked_user.id}`)
                .addField("Kicked By", `${message.author} with ID: ${message.author.id}`)
                .addField("Channel", message.channel)
                .addField("Time", message.createdAt)
                .addField("Reason", kick_reason);

            return reportsChannel.send(reportEmbed);

            message.channel.send(`Successfully kicked user ${kicked_user}`);
        } else {
            my_message.delete();
            return message.channel.send(`Agree/disagree vote ratio is not sufficient to kick the user ${kicked_user}`);
        }
    });
}

module.exports.help =  {
    name: "kick",
    description: "Creates a poll to kick a user. if poll passed, the user will be kicked from the server"
}
