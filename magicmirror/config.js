/* Magic Mirror Config Sample
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/getting-started/configuration.html#general
 * and https://docs.magicmirror.builders/modules/configuration.html
 */
let config = {
	address: "0.0.0.0", 	// Address to listen on, can be:
							// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
							// - another specific IPv4/6 to listen on a specific interface
							// - "0.0.0.0", "::" to listen on any interface
							// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/", 	// The URL path where MagicMirror is hosted. If you are using a Reverse proxy
					// you must set the sub path here. basePath must end with a /
	//ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"], 	// Set [] to allow all IP addresses
	ipWhitelist: [], 	// Set [] to allow all IP addresses
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
	// serverOnly:  true/false/"local" ,
	// local for armv6l processors, default
	//   starts serveronly and then starts chrome browser
	// false, default for all NON-armv6l devices
	// true, force serveronly mode, because you want to.. no UI on this device

	modules: [
		{
			module: "alert",
		},
		{
			module: "compliments",
			position: "top_bar",
			config: {
					remoteFile: "https://raw.githubusercontent.com/ironwin/new-horizons-conf/main/compliments.json",
					updateInterval: 10000,
					classes: "xlarge bright"
			}
		},	
		{
			module: "MMM-FlipClock",
			position: "top_center",
			timezone: "Asia/Seoul",
			displaySeconds: "false",
			easing: "ease-in-out-circ"
  		},
		{
			module: "calendar",
			header: "our calendar",
			position: "bottom_left",
			config: {
					calendars: [
							{
									symbol: "calendar-check",
									url: "webcal://p43-caldav.icloud.com/published/2/MTA3MzMwMTUyNzEwNzMzMPb7GX7rZ2ic_ctjs4YI1R_37eJnRtRKHoEC9Jsna2Cf"
							},
							{
									url: "webcal://p03-calendars.icloud.com/holidays/kr_ko.ics"
							}
					],
					maximumEntries: 5
			}
		},
		{
			module: "weather",
			position: "top_right",
			config: {
					weatherProvider: "openweathermap",
					type: "current",
					location: "New York",
					locationID: "1835848", //ID from http://bulk.openweathermap.org/sample/city.list.json.gz; unzip the gz file and find your city
					apiKey: "20e5316b12193be98be3b5540ed104cd"
			}
		},
		{
			module: 'MMM-AirQuality',
			position: 'top_right',
			config: {
					location: 'seoul',
							lang: "kr"
					}
		},
		{
			module: "weather",
			position: "bottom_right",
			header: "Weather Forecast",
			config: {
					weatherProvider: "openweathermap",
					type: "forecast",
					location: "New York",
					locationID: "1835848", //ID from http://bulk.openweathermap.org/sample/city.list.json.gz; unzip the gz file and find your city
					apiKey: "bfe4f26a6e90799397d2ecfb2e2eaf63"
			}
		},
		{
			module: "newsfeed",
			position: "bottom_bar",
			config: {
				feeds: [
						{
							title: "yonhap News",
							url: "http://www.yonhapnewstv.co.kr/browse/feed"
						},
						{
							title: "google  News",
							url: "https://news.google.com/rss/?hl=ko&gl=KR&ceid=KR%3Ako/"
						},
				],
				showSourceTitle: true,
				showPublishDate: true,
				broadcastNewsFeeds: true,
				broadcastNewsUpdates: true
			}
		},
		{
			module: 'MMM-Tools',
			position: 'top_left',
			header: "Tools",
			UPTIME: {
					useMagicMirror: false,
					displayUptime: false,
					displayRecord: false,
			  },
		},		
		{
            "module": "MMM-WeatherChart",
            "position": "lower_third",
            "config": {
                "apiKey": "2d042881f9ad1d79b452c49ebc05fab2",
                "dataNum": 24,
                "dataType": "hourly",
                "height": "301px",
                "width": "800px",
                "lat": 37.532600,
                "lon": 127.024612,
                "units": "metric",
                "showRain": true,
                "includeSnow": true,
                "showSnow": true,
                "showIcon": true
			}
		}
	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") {module.exports = config;}
