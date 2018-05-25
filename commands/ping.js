const Discord = require('discord.js');

const bot = new Discord.Client({disableEveryone: true});

module.exports.run = async (bot, message, args, helpers) => {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
   // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
   const m = await message.channel.send("Ping?");
   m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(bot.ping)}ms`);
}

module.exports.help = {
    name: 'ping',
    description: "Test the ping from the bot's server"
}
