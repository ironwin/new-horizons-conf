/* MagicMirror² Config Sample
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/configuration/introduction.html
 * and https://docs.magicmirror.builders/modules/configuration.html
 *
 * You can use environment variables using a `config.js.template` file instead of `config.js`
 * which will be converted to `config.js` while starting. For more information
 * see https://docs.magicmirror.builders/configuration/introduction.html#enviromnent-variables
 */
let config = {
	address: "localhost",	// Address to listen on, can be:
							// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
							// - another specific IPv4/6 to listen on a specific interface
							// - "0.0.0.0", "::" to listen on any interface
							// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/",			// The URL path where MagicMirror² is hosted. If you are using a Reverse proxy
					  		// you must set the sub path here. basePath must end with a /
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],	// Set [] to allow all IP addresses
															// or add a specific IPv4 of 192.168.1.5 :
															// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.1.5"],
															// or IPv4 range of 192.168.3.0 --> 192.168.3.15 use CIDR format :
															// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.3.0/28"],

	useHttps: false, 		// Support HTTPS or not, default "false" will use HTTP
	httpsPrivateKey: "", 	// HTTPS private key path, only require when useHttps is true
	httpsCertificate: "", 	// HTTPS Certificate path, only require when useHttps is true

	language: "en",
	locale: "en-US",
	logLevel: ["INFO", "LOG", "WARN", "ERROR"], // Add "DEBUG" for even more logging
	timeFormat: 24,
	units: "metric",

	modules: [
		{
			module: "alert",
		},
		{
			module: "compliments",
			position: "fullscreen_above",
			config: {
				remoteFile: "https://raw.githubusercontent.com/ironwin/new-horizons-conf/main/compliments.json",
				updateInterval: 10000,
				classes: "thin bright"
			}
		},	
		{
			module: "clock",
			position: "top_bar", // This can be any of the regions.
			config: {
				timeFormat: 24,
				timezone:  "Asia/Seoul",
				displaySeconds: false,
				clockBold: true,
				showSunTimes: true,
				lat: 37.532600,
				lon: 127.024612,
			  // The config property is optional.
			  // See 'Configuration options' for more information.
			},
		},
		/*
		{
			module: "MMM-FlipClock",
			position: "top_bar",
			timezone: "Asia/Seoul",
			displaySeconds: "false",
			easing: "ease-in-out-circ"
  		},
		*/
		{
			module: "MMM-OpenmapWeather",
			position: "fullscreen_above",
			config: {
				weatherProvider: "openweathermap",
				type: "current",
				location: "Seoul",
				locationID: "1835847", //ID from http://bulk.openweathermap.org/sample/city.list.json.gz; unzip the gz file and find your city
				//apiKey: "20e5316b12193be98be3b5540ed104cd",
				appid: "20e5316b12193be98be3b5540ed104cd",
				colorIcon: true
			}
		},	
		/* default/calendar module configuration */
		{
			module: "calendar",
			position: "bottom_right",
			config: {
				broadcastPastEvents: true, // <= IMPORTANT to see past events
				coloredText: true,
				calendars: [
					{
						name: "icloud",
						url: "webcal://p43-caldav.icloud.com/published/2/MTA3MzMwMTUyNzEwNzMzMPb7GX7rZ2ic_ctjs4YI1R_37eJnRtRKHoEC9Jsna2Cf",
						color: "yellow"
					},
					{
						name: "ko_holiday",
						url: "webcal://p03-calendars.icloud.com/holidays/kr_ko.ics",
						color: "red"
					}
				],
			}
		},
        {
              module: 'MMM-BackgroundSlideshow',
              position: 'fullscreen_below',
              config: {
                 imagePaths: ['/home/pi/Pictures/JWST/'],
                 transitionImages: true,
                 randomizeImageOrder: true
              }
        },
		{
			module: "MMM-WeatherChart",
			position: "bottom_left",
			config: {
				apiKey: "2d042881f9ad1d79b452c49ebc05fab2",
				dataNum: 24,
				dataType: "hourly",
				height: "250px",
				width: "700px",
				lat: 37.532600,
				lon: 127.024612,
				units: "metric",
				showRain: true,
				includeSnow: true,
				showSnow: true,
				showIcon: true
			}
		},
		/*
		{
			module: "weather",
			position: "bottom_left",
			header: "Weather Forecast",
			config: {
					weatherProvider: "openweathermap",
					type: "forecast",
					//location: "New York",
					//locationID: "1835848", //ID from http://bulk.openweathermap.org/sample/city.list.json.gz; unzip the gz file and find your city
					location: "Seoul",
					locationID: "1835847", //ID from http://bulk.openweathermap.org/sample/city.list.json.gz; unzip the gz file and find your city	
					apiKey: "bfe4f26a6e90799397d2ecfb2e2eaf63"
			}
		},
		*/
		{
			module: "MMM-PiTemp",
			position: "top_right",
			config: {}
		},		
		{
			module: 'MMM-AirQuality',
			position: 'top_right',
			config: {
				location: 'seoul',
				lang: "kr"
			}	
		}		
	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") {module.exports = config;}
