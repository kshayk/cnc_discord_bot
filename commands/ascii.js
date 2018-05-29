const Discord = require("discord.js");
const request = require('request');

module.exports.run = async (bot, message, args, helpers) => {
    var base_url = "http://artii.herokuapp.com";

    var font = args[0];
    var text = ``;

    for(var i = 1; i < args.length; i++) {
        text += ` ${args[i]}`;
    }

    if(typeof font === "undefined" || font === null || font === "") {
        return message.channel.send(helpers.embedErrorMessage("Missing font type. To find type do $ascii fonts"));
    }

    if(font.replace(" ", "") === "fonts") {
        request(`${base_url}/fonts_list`, (err, response, body) => {
            if(err) {
                return message.channel.send(helpers.embedErrorMessage("Something went wrong, did you use the command correctly?"));
            }

            //Splitting it with : as the separator
            var fonts_arr = response.body.split("\n");

            var i,j,temparray,chunk = 100;
            for (i=0,j=fonts_arr.length; i<j; i+=chunk) {
                temparray = fonts_arr.slice(i,i+chunk);

                console.log(temparray);
                message.author.send(temparray);
            }
        });

        return message.channel.send("sent fonts via private message");
    }

    if(typeof text === "undefined" || text === null || text === "") {
        return message.channel.send(helpers.embedErrorMessage("Missing a text."));
    }

    request(`${base_url}/make?text=${encodeURI(text)}&font=${encodeURI(font)}`, (err, response, body) => {
        if(err) {
            return message.channel.send(helpers.embedErrorMessage("Something went wrong, did you use the command correctly?"));
        }

        console.log(response.body);
        return message.channel.send("```" + response.body + "```");
    });
}

module.exports.help = {
    name: "ascii",
    description: "sets your text as ASCII. Usage: to get all the ascii fonts, do $ascii fonts. To write something in ASCII do $ascii font my text here ($ascii 3-d test)"
}
