const Discord = require('discord.js');
const mongojs = require('mongojs');
const db = mongojs('cnc_bot', ['afks', 'reports']); //specifiyng the database and table(s)

//translate a text: $translate hebrew hello world
module.exports.run = async (bot, message, args, helpers) => {
    var server_id = message.member.guild.id;
    var user_id = message.member.id.replace('!', '');

    var newUser = {
      server_id,
      user_id
    };

    db.afks.find({server_id, user_id}, (err, docs) => {
        if(docs.length === 0) {
            db.afks.insert(newUser, (err, result) => {
                if(err) {
                    console.log('Failed to insert user into database', err);
                    return message.channel.send(helpers.embedErrorMessage());
                }

                return message.channel.send('Successfully added user to the AFK list');
            });
        } else {
            db.afks.remove(newUser, (err) => {
              if(err) {
                  console.log('Failed to remove user from database', err);
                  return message.channel.send(helpers.embedErrorMessage());
              }

              return message.channel.send('Successfully removed user from the AFK list');
            });
        }
    });
}

module.exports.help =  {
    name: "afk",
    description: "Toggle your AFK status"
}
