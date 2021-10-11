const botconfig = require('./botconfig.json');
const Discord = require('discord.js');
const fs = require('fs');
const mongojs = require('mongojs');
const db = mongojs('cnc_bot', ['afks', 'reports', 'disabled_features']); //specifiyng the database and table(s)

const api_keys = require('./api_keys.js');

const bot = new Discord.Client({disableEveryone: true});

bot.commands = new Discord.Collection();

var file_descriptions = [];
//Preparing all the command files here
fs.readdir("./commands/", (err, files) => {
    if(err) {
        console.log(err);
        return;
    }

    //getting only js files
    var jsfile = files.filter(f => f.split(".").pop() === "js");
    if(jsfile.length === 0) {
        console.log("No JS files found.");
        return;
    }

    jsfile.forEach((f, i) => {
        var props = require(`./commands/${f}`);

        //preparing the array to later show in the $help command
        var file_desc_object = {};
        file_desc_object.name = props.help.name;
        file_desc_object.description = props.help.description;
        file_descriptions.push(file_desc_object);

        //inserting the files to the bots memory
        bot.commands.set(props.help.name, props);
    });
});


//TODO: make a yargs here for option of bot activity and other stuff

//when bot is online, do something
bot.on("ready", async () => {
    console.log(`bot prefix: ${botconfig.prefix}`);
    console.log(`${bot.user.username} is online`);
    bot.user.setActivity("$ to activate", {type: "PLAYING"}); //type can also be "WATCHING" for stream watch and such. its not mandatory to declare type, it will be automatically "PLAYING"
});

bot.on("message", async message => {
    //temp disaable on some channels
    // if(message.channel.id === '312178681298550785' || message.channel.id ===  "392703710213439499") {
    //     return;
    // }

    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    let prefix = botconfig.prefix; //like var but in the scope
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    //In this case, some of the commands are without the prefix, so checking them first.
    //if one of them matches the if statements; perform the action. if not; return.
    if(message.content.indexOf(prefix) !== 0) {
        if(hasMemberTagged(message.content)) {
            return;
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

        // var ok_variations = ['ok', 'o k', 'okay', 'o','k', 'okey'];
        //
        // if(message.author.id === "163725432472993795" && ok_variations.indexOf(message.content.toLowerCase()) != -1) {
        //     message.delete();
        //
        //     message.channel.send(`deleted 'ok' message by <@${message.author.id}>`);
        // }
        //
        // return;
    };

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

    var commandfile = bot.commands.get(cmd.slice(prefix.length));
    if(cmd === `${prefix}help`) {
        var botembed = new Discord.RichEmbed()
            .setDescription('CNC Bot Commands')
            .setColor('#81a9e8');

        file_descriptions.forEach((i, k) => {
            botembed.addField(`${prefix}${i.name}`, i.description);
        });

        message.author.send(botembed);
        return message.channel.send("Sent bot usage instruction via private message.");
    } else if(commandfile) {
        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        var helper_functions = {
            capitalizeFirstLetter,
            embedWarningMessage,
            embedErrorMessage
        };

        commandfile.run(bot, message, args, helper_functions);
    } else {
        console.log('could not find the command file');
    }
});

bot.login(api_keys.discord_bot_token);

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
