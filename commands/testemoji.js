const Discord = require('discord.js');

const bot = new Discord.Client({disableEveryone: true});

module.exports.run = async (bot, message, args, helpers) => {
    message.react('✔');
    // Create a reaction collector
    const filter = (reaction, user) => reaction.emoji.name === '✔'  && user.id === message.author.id //only checks for this emoji
    const collector = message.createReactionCollector(filter, { time: 15000 });
    collector.on('collect', r => console.log(`Collected ${r.emoji.name}`)); //when a new emoji that passes the filter is getting reacted for that message
    collector.on('end', collected => console.log(`Collected ${collected.size} items`)); //after the timeout is finished getting the collected overall emojis
}

module.exports.help = {
    name: 'testemoji'
}
