const Discord = require('discord.js');
const mongojs = require('mongojs');

const BLACK_CARD     = 'black';
const WHITE_CARD     = 'white';
const ADD_CARD       = 'add';
const LIST           = 'list';
const DELETE         = 'delete';
const CAH_ADMIN_ROLE = 'cah-admin';

const bot = new Discord.Client({disableEveryone: true});

module.exports.run = async (bot, message, args, helpers) => {
    let serverID  = message.member.guild.id;
    let tableName = `cah_${serverID}`;

    const db = mongojs('cnc_bot', [tableName]);

    switch (args[0]) {
        case ADD_CARD:
            switch (args[1]) {
                case BLACK_CARD:
                    let picksAmount = args[2];

                    if (isNaN(picksAmount)) {
                        return message.channel.send(helpers.embedErrorMessage("Please enter a valid picks amount number as the second argument for this command"));
                    }

                    picksAmount = parseInt(picksAmount);

                    let question = '';
                    for (let i = 3; i < args.length; i++) {
                        question += ` ${args[i]}`;
                    }

                    let blanksAmount = findAllBlankParts(question);

                    if (blanksAmount !== picksAmount) {
                        return message.channel.send(helpers.embedErrorMessage("The picks amount must be the same as the blanks (_) in the sentence"));
                    }

                    db[tableName].insert(
                        // find record with name "MyServer"
                        {type: BLACK_CARD, picks_amount: picksAmount, string: question, added_by: message.author.id},
                        (err2, docs2) => {
                            let blackCardMessage = new Discord.RichEmbed()
                                .setDescription("Cards against humanity - black card")
                                .setColor("#15f153")
                                .addField("Added by", `${message.author} with ID: ${message.author.id}`);

                            return message.channel.send(blackCardMessage);
                        }
                    );

                    break;
                case WHITE_CARD:
                    let answer = '';
                    for (let i = 2; i < args.length; i++) {
                        answer += `${args[i]} `;
                    }

                    db[tableName].insert(
                        // find record with name "MyServer"
                        {type: WHITE_CARD, picks_amount: null, string: answer, added_by: message.author.id},
                        (err2, docs2) => {
                            let whiteCardMessage = new Discord.RichEmbed()
                                .setDescription("Cards against humanity - white card")
                                .setColor("#15f153")
                                .addField("Added by", `${message.author}`);

                            return message.channel.send(whiteCardMessage);
                        }
                    );

                    break;
                default:
                    return message.channel.send(helpers.embedErrorMessage("The first argument for this command must be the card type (black/white)"));
            }
        break;
        case LIST:
            let cardType = args[1];

            if (cardType !== BLACK_CARD && cardType !== WHITE_CARD)
            {
                return message.channel.send(helpers.embedErrorMessage("Please choose a valid card type as the second argument (black/white)"));
            }

            db[tableName].find({type: cardType}, (err, docs) => {
                if (docs.length === 0)
                {
                    let missingBlackCardsMessage = new Discord.RichEmbed()
                        .setDescription(`Cards against humanity - ${cardType} cards missing`)
                        .setColor("#15f153")
                        .addField(`No ${cardType} cards have been found yet for this server.`, "use $help to find out how to add cards");

                    return message.channel.send(whiteCardMessage);
                }

                let cardsListMessage = new Discord.RichEmbed()
                    .setDescription(`List of ${cardType} cards`)
                    .setColor("#15f153");

                docs.forEach((item) => {
                    var messageContent = '';

                    if (cardType === WHITE_CARD)
                    {
                        messageContent = `Answer: ${item.string}`;
                    }
                    else
                    {
                        messageContent = `Question: ${item.string.replace('_', '\\_')}\nPicks Amount: ${item.picks_amount}`;
                    }

                    cardsListMessage.addField(`id: ${item._id}`, messageContent);
                });

                message.channel.send("List sent via DM");
                return message.author.send(cardsListMessage);
            });
        break;
        case DELETE:
            let hasAppropriateRole = false;
            message.member.roles.forEach((role) => {
                if (role.name === CAH_ADMIN_ROLE)
                {
                    hasAppropriateRole = true;
                }
            });

            if ( ! hasAppropriateRole)
            {
                return message.channel.send(helpers.embedErrorMessage(`Missing appropriate role '${CAH_ADMIN_ROLE}'`));
            }

            let cardID = args[1];
            let cardInfo = {
                _id: mongojs.ObjectId(cardID)
            };

            db[tableName].remove(cardInfo, (err) => {
                if(err) {
                    return message.channel.send(helpers.embedErrorMessage("Could not remove card from the list. Are you sure it's there?"));
                }

                return message.channel.send('Successfully removed the card from the list');
            });
        break;
        default:
            db[tableName].find({type: BLACK_CARD}, (err, docs) => {
                if (docs.length === 0)
                {
                    message.channel.send(helpers.embedErrorMessage("Please add black cards first. To see how, run $help and look for $cah-server"));
                    return;
                }

                let blackCard = docs[Math.floor(Math.random() * docs.length)];

                let whiteCards = null;
                db[tableName].find({type: WHITE_CARD}, (err, docs) => {
                    if (docs.length === 0)
                    {
                        message.channel.send(helpers.embedErrorMessage("Please add white cards first. To see how, run $help and look for $cah-server"));
                        return;
                    }

                    whiteCards = docs;

                    var blackCardQuestion = blackCard.string;

                    for (let i = 0; i < blackCard.picks_amount; i++)
                    {
                        let whiteCard = whiteCards[Math.floor(Math.random() * whiteCards.length)];
                        if (blackCardQuestion.includes('_'))
                        {
                            blackCardQuestion = blackCardQuestion.replace("_", `[${whiteCard.string}]`);
                        }
                        else
                        {
                            blackCardQuestion += ` [${whiteCard.string}].`
                        }
                    }

                    return message.channel.send(blackCardQuestion)
                });
            });
        break;
    }
};

var findAllBlankParts = function(string){
    var needle = '_';
    var re = new RegExp(needle,'gi');

    var results = [];//this is the results you want
    while (re.exec(string)){
        results.push(re.lastIndex);
    }

    return results.length;
};

module.exports.help = {
    name: 'cah-server',
    description: "To add a new card use this command as follows:\n Adding a black card (question): $cah-server add black [number of white cards to use] [the question, with _ as a blank word to be filled with a white card answer]\n" +
        "Adding white card (answer): $cah-server add white [the answer]\n" +
        "Playing the cards: just run $cah-server\n" +
        "List the available cards: $cah-server list [card type]\n" +
        "Delete a card from a list: $cah-server delete [card id] (this action requires the user to have an cah-admin role)"
};
