const botconfig = require('./botconfig.json');
const Discord = require('discord.js');
const mongojs = require('mongojs');
const db = mongojs('cnc_bot', ['afks', 'reports']); //specifiyng the database and table(s)

const api_keys = require('./api_keys.js');
const request = require('request');
const language_map = require('./language_index.js');
const fun_language_map = require('./fun_language_index.js');

const google_api_endpoint = `https://maps.googleapis.com/maps/api/geocode/json?key=${api_keys.google_maps_api}&address=`;
const weather_api_endpoint = `http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid=${api_keys.weather_api}`;
const translator_api_endpoint = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${encodeURI(api_keys.translator_api)}`;
const fun_translator_api_endpoint = `http://api.funtranslations.com/translate/<language>.json`

const bot = new Discord.Client({disableEveryone: true});

//TODO: make a yargs here for option of bot activity and other stuff

//when bot is online, do something
bot.on("ready", async () => {
    console.log(`bot prefix: ${botconfig.prefix}`);
    console.log(`${bot.user.username} is online`);
    bot.user.setActivity("$ to activate", {type: "PLAYING"}); //type can also be "WATCHING" for stream watch and such. its not mandatory to declare type, it will be automatically "PLAYING"
});

bot.on("message", async message => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    let prefix = botconfig.prefix; //like var but in the scope
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    //get current weather for a specific location: $weather israel
    if(cmd === `${prefix}weather`) {
        var location_string = '';

        if(args.length === 0) {
            return message.channel.send("must get a place for this command");
        }

        for(var i = 0; i < args.length; i++) {
            location_string += ` ${args[i]}`;
        }

        location_string = location_string.trim();

        request({
          url: `${google_api_endpoint}${location_string}`,
          json: true
        }, (error, response, body) => {
            if(error || body.error_message) {
              if(error !== null) {
                 console.log("google:" + error);
                 return message.channel.send(embedErrorMessage());
              } else {
                 console.log("google:" + body.error_message);
                 return message.channel.send(embedErrorMessage());
              }
            } else {
              if(body.results.length === 0 || body.status === 'ZERO_RESULTS') {
                 return message.channel.send(embedErrorMessage("No results found for this location"));
              } else {
                var latitude = body.results[0].geometry.location.lat;
                var longtitude = body.results[0].geometry.location.lng;

                var weather_url = weather_api_endpoint.replace('{lat}', latitude).replace('{lon}', longtitude);

                request({
                  url: weather_url,
                  json: true
                }, (w_error, w_response, w_body) => {
                    if(w_error) {
                        console.log('Weather API: ' + w_error);
                        return message.channel.send(embedErrorMessage());
                    }

                    var temp_celcius = Math.round(w_body.main.temp - 273.15);
                    var temp_fahrenheit = Math.round((temp_celcius * 1.8) + 32);
                    var description = w_body.weather[0].description;

                    return message.channel.send(`The temperature in ${location_string} is: ${temp_celcius}°C / ${temp_fahrenheit}°F | Summary: ${description}`);
                });
              }
            }
        });
    }

    //translate a text: $translate hebew hello world
    if(cmd === `${prefix}translate`) {
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

        var language = capitalizeFirstLetter(args[0]);
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

                    return message.channel.send(embedErrorMessage());
                }

                return message.channel.send(body.text[0]);
            } else {
                if(body.error) {
                    console.log('Fun translator error: ', body);

                    return message.channel.send(embedErrorMessage());
                }

                return message.channel.send(body.contents.translated);
            }
        });
    }

    if(cmd === `${prefix}afk`) {
        // console.log(message);
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
                        return message.channel.send(embedErrorMessage());
                    }

                    return message.channel.send('Successfully added user to the AFK list');
                });
            } else {
                db.afks.remove(newUser, (err) => {
                  if(err) {
                      console.log('Failed to remove user from database', err);
                      return message.channel.send(embedErrorMessage());
                  }

                  return message.channel.send('Successfully removed user from the AFK list');
                });
            }
        });
    }

    if(cmd === `${prefix}report`) {
        let rUser = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0])); // this will find the user that was mentioned in the message

        if( ! rUser) {
            return message.channel.send(embedErrorMessage('Could not find the user'));
        }

        let reason = args.join(" ").slice(22);

        if(reason.replace(" ", "") === null || reason.replace(" ", "") === "") {
            return message.channel.send(embedErrorMessage("You must provide a reason for the report"));
        }

        let reportsChannel = message.guild.channels.find(`name`, 'reports') || message.guild.channels.find(`name`, 'spam');

        if( ! reportsChannel) {
            return message.channel.send(embedErrorMessage("To report a user, the server must have a 'reports' channel"));
        }

        var reportConfirmEmbed = new Discord.RichEmbed()
            .setDescription("Report user?")
            .setColor("#15f153")
            .addField("Reported User", `${rUser} with ID: ${rUser.id}`)
            .addField("Reason", reason)
            .setFooter("at least 4 votes (positive or negative) required to proceed with the reporting. After a minute this poll will close.")

        var embedConfirm = message.channel.send(reportConfirmEmbed).then(async function (my_message) {
            await my_message.react('👍');
            await my_message.react('👎');

            // Create a reaction collector
            var filter = (reaction, user) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎'
            var collected = await my_message.awaitReactions(filter,  { time: 60000 });
            var agree = await collected.get('👍') && await collected.get('👍').count-1;
            var disagree = await collected.get('👎') && await collected.get('👎').count-1;

            if(agree && agree >= 3 && agree > disagree) {
                my_message.delete();

                //check if strikes are more than 3, if so send message asking for kick.
                db.reports.find({server_id: message.member.guild.id , user_id: rUser.id}, (err, docs) => {
                    if(err || docs.length === 0) {
                        // update a record in the collection
                        db.reports.insert(
                            // find record with name "MyServer"
                            { user_id: rUser.id, server_id: message.member.guild.id, strikes: 1},
                            (err2, docs2) => {
                                let reportEmbed = new Discord.RichEmbed()
                                    .setDescription("Reports")
                                    .setColor("#15f153")
                                    .addField("Reported User", `${rUser} with ID: ${rUser.id}`)
                                    .addField("Reported By", `${message.author} with ID: ${message.author.id}`)
                                    .addField("Channel", message.channel)
                                    .addField("Time", message.createdAt)
                                    .addField("Strikes", "1")
                                    .addField("Reason", reason);

                                return reportsChannel.send(reportEmbed);
                            }
                        );
                    } else {
                        var new_strike = docs[0].strikes + 1;

                        db.reports.update(
                            // find record with that ID
                            {_id: docs[0]._id},
                            //use the $inc function to add 1 to the strikes
                            {
                                server_id: message.member.guild.id,
                                user_id: rUser.id,
                                strikes: new_strike
                            },
                            //
                            (err2, docs2) => {
                                let reportEmbed = new Discord.RichEmbed()
                                    .setDescription("Reports")
                                    .setColor("#15f153")
                                    .addField("Reported User", `${rUser} with ID: ${rUser.id}`)
                                    .addField("Reported By", `${message.author} with ID: ${message.author.id}`)
                                    .addField("Channel", message.channel)
                                    .addField("Time", message.createdAt)
                                    .addField("Strikes", `${new_strike}`)
                                    .addField("Reason", reason);

                                reportsChannel.send(reportEmbed);

                                if(new_strike >= 5) {
                                    let kickEmbed = new Discord.RichEmbed()
                                        .setDescription("Kick user?")
                                        .setColor("#efad5d")
                                        .addField("Violator", `The user ${rUser} with ID: ${rUser.id} got ${new_strike} reports on his account. To kick the accound do: ${prefix}kick {account}`);

                                    return reportsChannel.send(kickEmbed);
                                }

                                return;
                            }
                        )
                    }
                });

                message.channel.send(`Successfully reported user ${rUser}`);
            } else {
                my_message.delete();
                message.channel.send(`Agree/disagree vote ratio is not sufficient to report the user ${rUser}`);
            }
        });
        // message.delete().catch(O_o=>{}); // deletes the last message, currently not working need to understand how to do that
    }

    if(cmd === `${prefix}kick`) {
        if( ! message.member.hasPermission("KICK_MEMBERS")) {
            return message.channel.send(embedErrorMessage("You do not have permission to kick a user"));
        }

        var kicked_user = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
        if( ! kicked_user) {
             return message.channel.send(embedErrorMessage("A valid user must be provided as the first argument for this command"));
        }

        if(kicked_user.hasPermission("KICK_MEMBERS")) {
            return message.channel.send(embedErrorMessage("You do not have permission to kick this user"));
        }

        var kick_reason = args.join(" ").slice(22);
        if(kick_reason.replace(" ", "") === null || kick_reason.replace(" ", "") === "") {
            return message.channel.send(embedErrorMessage("You must provide a reason for the kick"));
        }

        let reportsChannel = message.guild.channels.find(`name`, 'reports') || message.guild.channels.find(`name`, 'spam');

        if( ! reportsChannel) {
            return message.channel.send(embedErrorMessage("To kick a user, the server must have a 'reports' channel"));
        }

        var kickConfirmEmbed = new Discord.RichEmbed()
            .setDescription("Kick user?")
            .setColor("#15f153")
            .addField("User pending kick", `${kicked_user} with ID: ${kicked_user.id}`)
            .addField("Reason", kick_reason)
            .setFooter("at least 5 votes (positive or negative) required to proceed with the kick. After a minute this poll will close.")

        var embedConfirm = message.channel.send(kickConfirmEmbed).then(async function (my_message) {
            await my_message.react('👍');
            await my_message.react('👎');

            // Create a reaction collector
            var filter = (reaction, user) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎'
            var collected = await my_message.awaitReactions(filter,  { time: 60000 });
            var agree = await collected.get('👍') && await collected.get('👍').count-1;
            var disagree = await collected.get('👎') && await collected.get('👎').count-1;

            if(agree && agree >= 3 && agree > disagree) {
                my_message.delete();

                //TODO: Kick user here
                message.guild.member(kicked_user).kick(kick_reason);

                let reportEmbed = new Discord.RichEmbed()
                    .setDescription("User kick")
                    .setColor("#15f153")
                    .addField("Kicked User", `${kicked_user} with ID: ${kicked_user.id}`)
                    .addField("Kicked By", `${message.author} with ID: ${message.author.id}`)
                    .addField("Channel", message.channel)
                    .addField("Time", message.createdAt)
                    .addField("Reason", kick_reason);

                return reportsChannel.send(reportEmbed);

                message.channel.send(`Successfully kicked user ${kicked_user}`);
            } else {
                my_message.delete();
                return message.channel.send(`Agree/disagree vote ratio is not sufficient to kick the user ${kicked_user}`);
            }
        });
    }

    if(cmd === `${prefix}testemoji`) {
        message.react('✔');
        // Create a reaction collector
        const filter = (reaction, user) => reaction.emoji.name === '✔'  && user.id === message.author.id //only checks for this emoji
        const collector = message.createReactionCollector(filter, { time: 15000 });
        collector.on('collect', r => console.log(`Collected ${r.emoji.name}`)); //when a new emoji that passes the filter is getting reacted for that message
        collector.on('end', collected => console.log(`Collected ${collected.size} items`)); //after the timeout is finished getting the collected overall emojis
    }

    if(cmd === `${prefix}help`) {
        var botembed = new Discord.RichEmbed()
            .setDescription('CNC Bot Commands')
            .setColor('#81a9e8')
            .addField('$weather', 'Shows weather of a current location. Usage: $weather london uk')
            .addField('$translate', 'Translates a certain word/phrase according to given language and text. Usage: $translate dutch hey how are you doing')
            .addField('$afk', 'Toggle your AFK status')
            .addField('$report', 'Creates a poll to report a user. Must have a "reports" text channel to support this method. Usage: $report @user#123 reason')

        message.author.send(botembed);
        return message.channel.send("Sent bot usage instruction via private message.");
    }

    if(cmd === "DC") {
        return message.channel.send("SO");
    }

    if(cmd === "LIT") {
        return message.channel.send("RN");
    }

    if(cmd === "🔥") {
        return message.channel.send("🚒");
    }

    if(hasMemberTagged(message.content)) {
        var taggedUserArray = findUserRegEx(message.content);

        for(var i = 0; i < taggedUserArray.length; i++) {
            var user_id = taggedUserArray[i].replace('<@', '').replace('>', '').replace('!', '');

            var server_id = message.member.guild.id;

            db.afks.find({server_id, user_id}, (err, docs) => {
                if(docs.length !== 0) {
                    var user = bot.users.get(user_id);

                    return message.channel.send(embedWarningMessage(`The user ${user.username} has set his account as AFK. Please try again later`));
                }
            });
        }
    }
});

bot.login(api_keys.discord_bot_token);

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function embedWarningMessage(message) {
    var botembed = new Discord.RichEmbed()
        .setColor('#efad5d')
        .setThumbnail('https://cdn4.iconfinder.com/data/icons/web-kalorcon/142/error-512.png')
        .addField('Warning', message)

    return botembed;
}

function embedErrorMessage(message = "An error has occurred") {
    var botembed = new Discord.RichEmbed()
        .setDescription('Error')
        .setColor('#e50000')
        .setThumbnail('https://www.iconsdb.com/icons/preview/red/error-xxl.png')
        .addField('Error', message)

    return botembed;
}

function hasMemberTagged(message_content) {
    var getTaggedUsersArray = findUserRegEx(message_content);

    if(getTaggedUsersArray.length !== 0) {
        return true;
    } else {
        return false;
    }
}

function findUserRegEx(message_content) {
    var patt = /<@[!0-9]+>/gm;
    var regex_matches = [];
    var missing_index_users = false;

    var m;

    do {
        m = patt.exec(message_content);
        if (m) {
            regex_matches.push(m[0]);
        }
    } while (m);

    return regex_matches;
}
