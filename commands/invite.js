const Discord = require("discord.js");

module.exports.run = async (bot, message, args, helpers) => {
    message.author.send("https://discordapp.com/oauth2/authorize?client_id=410051035470495746&scope=bot&permissions=8&response_type=code&redirect_url=https://google.com");
    return message.channel.send("Sent bot invite link via private message.");
}

module.exports.help = {
    name: "invite",
    description: "This will send an invite link for the bot"
}
