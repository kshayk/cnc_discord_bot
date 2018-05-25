const Discord = require('discord.js');
const request = require('request');
const api_keys = require('../api_keys.js');

const language_map = require('../language_index.js');
const fun_language_map = require('../fun_language_index.js');

const translator_api_endpoint = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${encodeURI(api_keys.translator_api)}`;
const fun_translator_api_endpoint = `http://api.funtranslations.com/translate/<language>.json`;

//translate a text: $translate hebrew hello world
module.exports.run = async (bot, message, args, helpers) => {
    if(typeof args[0] === 'undefined') {
        //return list of options
        var regular_languages = JSON.stringify(Object.keys(language_map));
        var fun_languages = JSON.stringify(Object.keys(fun_language_map));

        regular_languages = regular_languages.replace('[', '').replace(']','');
        fun_languages = fun_languages.replace('[', '').replace(']', '');

        var botembed = new Discord.RichEmbed()
            .setDescription('$translate command')
            .setColor('#81a9e8')
            .addField('Summary', 'This command gets a language and a text and translate it accordingly. For example: $translate dutch hello world')
            .addField('Regular languages', `The following languages are available to translate to: ${regular_languages}`)
            .addField('Fun languages', `The following fun languages are available to translate to: ${fun_languages}`);

        return message.channel.send(botembed);
    }

    var language = helpers.capitalizeFirstLetter(args[0]);
    var language_type = null;
    if(typeof language_map[language] === 'undefined') {
        if(typeof fun_language_map[language] === 'undefined') {
            return message.channel.send(`Language ${language} was not found.`);
        } else {
            language_type = 'fun';
        }
    } else {
        language_type = 'regular';
    }

    language = (language_type === 'regular') ? language_map[language] : fun_language_map[language];

    var text = "";

    for(var i = 1; i < args.length; i++) {
        text += ` ${args[i]}`;
    }

    text = encodeURI(text.trim());

    fun_translator_url = fun_translator_api_endpoint.replace('<language>', language);

    url = (language_type === 'regular') ? `${translator_api_endpoint}&text=${text}&lang=${language}` : `${fun_translator_url}?text=${text}`;

    request({
        url,
        json: true
    }, (error, response, body) => {
        if(error) {
            console.log('Translator error: ', error);

            return message.channel.send('An error occurred');
        }

        if(language_type === 'regular') {
            if(body.code !== 200) {
                console.log('Trasnlator error: ', body);

                return message.channel.send(helpers.embedErrorMessage());
            }

            return message.channel.send(body.text[0]);
        } else {
            if(body.error) {
                console.log('Fun translator error: ', body);

                return message.channel.send(helpers.embedErrorMessage());
            }

            return message.channel.send(body.contents.translated);
        }
    });
}

module.exports.help =  {
    name: "translate",
    description: "Translates a certain word/phrase according to given language and text. Usage: $translate dutch hey how are you doing"
}
