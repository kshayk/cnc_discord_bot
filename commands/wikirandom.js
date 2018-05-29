const Discord = require("discord.js");
const request = require('request');

module.exports.run = async (bot, message, args, helpers) => {
    request("https://en.wikipedia.org/wiki/Special:Random", (err, response, body) => {
        if(err) {
            return message.channel.send(helpers.embedErrorMessage("Something went wrong, did you use the command correctly?"));
        }

        console.log(response.request.uri.href);

        //returns the redirected URL, hence, the article.
        return message.channel.send(response.request.uri.href);
    });
}

module.exports.help = {
    name: "wikirandom",
    description: "Retrieves a random wikipedia page"
}
