const Discord = require('discord.js');
const mongojs = require('mongojs');
const botconfig = require('../botconfig.json');

const bot = new Discord.Client({disableEveryone: true});
const db = mongojs('cnc_bot', ['afks', 'reports']); //specifiyng the database and table(s)

module.exports.run = async (bot, message, args, helpers) => {
    let rUser = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0])); // this will find the user that was mentioned in the message

    if( ! rUser) {
        return message.channel.send(helpers.embedErrorMessage('Could not find the user'));
    }

    let reason = args.join(" ").slice(22);

    if(reason.replace(" ", "") === null || reason.replace(" ", "") === "") {
        return message.channel.send(helpers.embedErrorMessage("You must provide a reason for the report"));
    }

    let reportsChannel = message.guild.channels.find(`name`, 'reports') || message.guild.channels.find(`name`, 'spam');

    if( ! reportsChannel) {
        return message.channel.send(helpers.embedErrorMessage("To report a user, the server must have a 'reports' channel"));
    }

    var reportConfirmEmbed = new Discord.RichEmbed()
        .setDescription("Report user?")
        .setColor("#15f153")
        .addField("Reported User", `${rUser} with ID: ${rUser.id}`)
        .addField("Reason", reason)
        .setFooter("at least 4 votes (positive or negative) required to proceed with the reporting. After a minute this poll will close.")

    var embedConfirm = message.channel.send(reportConfirmEmbed).then(async function (my_message) {
        await my_message.react('👍');
        await my_message.react('👎');

        // Create a reaction collector
        var filter = (reaction, user) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎'
        var collected = await my_message.awaitReactions(filter,  { time: 60000 });
        var agree = await collected.get('👍') && await collected.get('👍').count-1;
        var disagree = await collected.get('👎') && await collected.get('👎').count-1;

        if(agree && agree >= 3 && agree > disagree) {
            my_message.delete();

            //check if strikes are more than 3, if so send message asking for kick.
            db.reports.find({server_id: message.member.guild.id , user_id: rUser.id}, (err, docs) => {
                if(err || docs.length === 0) {
                    // update a record in the collection
                    db.reports.insert(
                        // find record with name "MyServer"
                        { user_id: rUser.id, server_id: message.member.guild.id, strikes: 1},
                        (err2, docs2) => {
                            let reportEmbed = new Discord.RichEmbed()
                                .setDescription("Reports")
                                .setColor("#15f153")
                                .addField("Reported User", `${rUser} with ID: ${rUser.id}`)
                                .addField("Reported By", `${message.author} with ID: ${message.author.id}`)
                                .addField("Channel", message.channel)
                                .addField("Time", message.createdAt)
                                .addField("Strikes", "1")
                                .addField("Reason", reason);

                            return reportsChannel.send(reportEmbed);
                        }
                    );
                } else {
                    var new_strike = docs[0].strikes + 1;

                    db.reports.update(
                        // find record with that ID
                        {_id: docs[0]._id},
                        //use the $inc function to add 1 to the strikes
                        {
                            server_id: message.member.guild.id,
                            user_id: rUser.id,
                            strikes: new_strike
                        },
                        //
                        (err2, docs2) => {
                            let reportEmbed = new Discord.RichEmbed()
                                .setDescription("Reports")
                                .setColor("#15f153")
                                .addField("Reported User", `${rUser} with ID: ${rUser.id}`)
                                .addField("Reported By", `${message.author} with ID: ${message.author.id}`)
                                .addField("Channel", message.channel)
                                .addField("Time", message.createdAt)
                                .addField("Strikes", `${new_strike}`)
                                .addField("Reason", reason);

                            reportsChannel.send(reportEmbed);

                            if(new_strike >= 5) {
                                let kickEmbed = new Discord.RichEmbed()
                                    .setDescription("Kick user?")
                                    .setColor("#efad5d")
                                    .addField("Violator", `The user ${rUser} with ID: ${rUser.id} got ${new_strike} reports on his account. To kick the accound do: ${botconfig.prefix}kick {account}`);

                                return reportsChannel.send(kickEmbed);
                            }

                            return;
                        }
                    )
                }
            });

            message.channel.send(`Successfully reported user ${rUser}`);
        } else {
            my_message.delete();
            message.channel.send(`Agree/disagree vote ratio is not sufficient to report the user ${rUser}`);
        }
    });
    // message.delete().catch(O_o=>{}); // deletes the last message, currently not working need to understand how to do that
}

module.exports.help =  {
    name: "report",
    description: "Creates a poll to report a user. Must have a 'reports' text channel to support this method. Usage: $report @user#123 reason"
}
