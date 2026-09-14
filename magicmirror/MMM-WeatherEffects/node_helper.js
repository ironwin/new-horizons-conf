const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
	socketNotificationReceived(notification, payload) {
		if (notification === "WEATHER_EFFECTS_CONFIG") {
			this.config = payload;
			this.fetchWeather();
			clearInterval(this.fetchTimer);
			this.fetchTimer = setInterval(() => this.fetchWeather(), payload.updateInterval || 5 * 60 * 1000);
		}
	},

	fetchWeather() {
		const c = this.config;
		if (!c || !c.latitude || !c.longitude) return;

		const q = new URLSearchParams({
			latitude: c.latitude,
			longitude: c.longitude,
			current: "weathercode,precipitation,rain,snowfall",
			timezone: c.timezone || "auto"
		});

		const url = `https://api.open-meteo.com/v1/forecast?${q}`;

		https.get(url, { timeout: 10000 }, (res) => {
			if (res.statusCode < 200 || res.statusCode >= 300) {
				res.resume();
				return;
			}
			let body = "";
			res.on("data", (chunk) => body += chunk);
			res.on("end", () => {
				try {
					const json = JSON.parse(body);
					const cur = json.current || {};
					const code = Number(cur.weathercode || 0);
					const precip = Number(cur.precipitation || 0);
					const rain = Number(cur.rain || 0);
					const snowfall = Number(cur.snowfall || 0);

					// WMO Snow codes: 71, 73, 75, 77, 85, 86
					const isSnow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86) || snowfall > 0;
					// WMO Rain codes: 51-67, 80-82, 95-99
					const isRain = !isSnow && (rain > 0 || precip > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95);

					let detected = "none";
					if (isSnow) detected = "snow";
					else if (isRain) detected = "rain";

					this.sendSocketNotification("WEATHER_EFFECT_UPDATE", {
						effect: detected,
						weatherCode: code,
						precipitation: precip,
						rain: rain,
						snowfall: snowfall
					});
				} catch (err) {
					console.error("[MMM-WeatherEffects] Parse error:", err.message);
				}
			});
		}).on("error", (err) => {
			console.error("[MMM-WeatherEffects] Fetch error:", err.message);
		});
	}
});
