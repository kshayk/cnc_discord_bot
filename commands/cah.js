const Discord = require('discord.js');
const blackCards = require('../cah/black_cards');
const whiteCards = require('../cah/white_cards');

const bot = new Discord.Client({disableEveryone: true});

module.exports.run = async (bot, message, args, helpers) => {
    var blackCard = blackCards.blackCards[Math.floor(Math.random() *blackCards.blackCards.length)];

    var blackCardQuestion = blackCard.text;

    for (let i = 0; i < blackCard.pick; i++)
    {
        var whiteCard = whiteCards.whiteCards[Math.floor(Math.random() *whiteCards.whiteCards.length)];

        if (blackCardQuestion.includes('_'))
        {
            blackCardQuestion = blackCardQuestion.replace("_", `[${whiteCard}]`);
        }
        else
        {
            blackCardQuestion += ` [${whiteCard}].`
        }
    }

    return message.channel.send(blackCardQuestion)
};

module.exports.help = {
    name: 'cah',
    description: "Get a random Cards Against Humanity phrase"
};
