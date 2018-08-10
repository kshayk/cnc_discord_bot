const Discord = require("discord.js");
const request = require('request');
const api_keys = require('../api_keys.js');

module.exports.run = async (bot, message, args, helpers) => {
    message.channel.startTyping();

    var location = "";

    for(let i = 0; i < args.length; i++) {
        location += ` ${args[i]}`;
    }

    if(typeof location === "undefined" || location == null || location === "") {
        return message.channel.send(helpers.embedErrorMessage("Missing location. To use this command do \`\`\`$map new york\`\`\` for example"));
    }

    location = encodeURI(location);

    var google_url = `https://www.google.com/maps/search/${location}`;

    await request({
        url: "https://api.screenshotapi.io/capture",
        headers: {
            'apikey': api_keys.screenshotapi
        },
        body: {
            "url": google_url,
            "viewport": "1280x1024",
            "fullpage": false,
            "javascript": true,
            "webdriver": "chrome",
            "device": "chromecast",
            "waitSeconds": 0,
            "fresh": false
        },
        method: "POST",
        json: true
    }, async (err, response, body) => {
        if(typeof body.statusCode === 'undefined') {
            await setTimeout(async () => {
                await request({
                    url: `https://api.screenshotapi.io/retrieve?key=${body.key}`,
                    headers: {
                        'apikey': api_keys.screenshotapi
                    },
                    method: "GET"
                }, (err, response, body2) => {
                    console.log(body2);
                    if (JSON.parse(body2).status === "processing") {
                        message.channel.stopTyping();
                        return message.channel.send(helpers.embedErrorMessage("Failed to get desired image"));
                    } else {
                        message.channel.stopTyping();
                        return message.channel.send(JSON.parse(body2).imageUrl);
                    }
                });
            },15000);
        }
    });
}

module.exports.help = {
    name: "map",
    description: "sets your text as ASCII. Usage: to get all the ascii fonts, do $ascii fonts. To write something in ASCII do $ascii font my text here ($ascii 3-d test)"
}
