const Discord = require('discord.js');
const request = require('request');
const api_keys = require('../api_keys.js');

const google_api_endpoint = `https://maps.googleapis.com/maps/api/geocode/json?key=${api_keys.google_maps_api}&address=`;
const weather_api_endpoint = `http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid=${api_keys.weather_api}`;

module.exports.run = async (bot, message, args, helpers) => {
    // get current weather for a specific location: $weather israel
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
             return message.channel.send(helpers.embedErrorMessage());
          } else {
             console.log("google:" + body.error_message);
             return message.channel.send(helpers.embedErrorMessage());
          }
        } else {
          if(body.results.length === 0 || body.status === 'ZERO_RESULTS') {
             return message.channel.send(helpers.embedErrorMessage("No results found for this location"));
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
                    return message.channel.send(helpers.embedErrorMessage());
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

module.exports.help =  {
    name: "weather",
    description: "Shows weather of a current location. Usage: $weather london uk"
}
