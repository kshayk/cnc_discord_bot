const botconfig = require('./botconfig.json');
const Discord = require('discord.js');
const api_keys = require('./api_keys.js');
const request = require('request');
const language_map = require('./language_index.js');

const google_api_endpoint = `https://maps.googleapis.com/maps/api/geocode/json?key=${api_keys.google_maps_api}&address=`;
const weather_api_endpoint = `http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid=${api_keys.weather_api}`;
const translator_api_endpoint = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${encodeURI(api_keys.translator_api)}`;

const bot = new Discord.Client({disableEveryone: true});

//TODO: make a yargs here for option of bot activity and other stuff

//when bot is online, do something
bot.on("ready", async () => {
    console.log(`bot prefix: ${botconfig.prefix}`);
    console.log(`${bot.user.username} is online`);
    bot.user.setActivity("$ to activate");
});

bot.on("message", async message => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    let prefix = botconfig.prefix; //like var but in the scope
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    //!say hello (gets only the hello with those splits)
    if(cmd === `${prefix}hello`) {
        return message.channel.send("hello!");
    }

    //get current weather for a specific location
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
                 return message.channel.send("An error has occurred");
              } else {
                 console.log("google:" + body.error_message);
                 return message.channel.send("An error has occurred");
              }
            } else {
              if(body.results.length === 0 || body.status === 'ZERO_RESULTS') {
                 message.channel.send("No results found for this location");
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
                        return message.channel.send("An error has occurred");
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

    if(cmd === `${prefix}translate`) {
        var language = capitalizeFirstLetter(args[0]);
        if(typeof language_map[language] === 'undefined') {
            return message.channel.send(`Language ${language} was not found.`);
        }

        language = language_map[language];

        var text = "";

        for(var i = 1; i < args.length; i++) {
            text += ` ${args[i]}`;
        }

        text = encodeURI(text.trim());

        url = `${translator_api_endpoint}&text=${text}&lang=${language}`;

        request({
            url,
            json: true
        }, (error, response, body) => {
            if(error) {
                console.log('Translator error: ', error);

                return message.channel.send('An error occurred');
            }

            if(body.code !== 200) {
                console.log('Trasnlator error: ', body);

                return message.channel.send('An error occurred');
            }

            return message.channel.send(body.text[0]);
        });
    }

    if(cmd === `DC`) {
        return message.channel.send("SO");
    }

    if(cmd === "LIT") {
        return message.channel.send("RN");
    }

});

bot.login(api_keys.discord_bot_token);

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
