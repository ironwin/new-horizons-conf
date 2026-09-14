/* Magic Mirror Module: MMM-WeatherEffects
 * Fullscreen Rain & Snow Animation based on current weather
 */

Module.register("MMM-WeatherEffects", {
	defaults: {
		latitude: 37.532600,
		longitude: 127.024612,
		timezone: "Asia/Seoul",
		updateInterval: 5 * 60 * 1000, // 5 minutes
		effect: "auto", // "auto", "rain", "snow", "none"
		rainCount: 85,
		snowCount: 60,
		rainSpeed: 1.0,
		snowSpeed: 1.0,
		splashEnabled: true
	},

	getStyles() {
		return ["MMM-WeatherEffects.css"];
	},

	start() {
		this.detectedEffect = "none";
		this.currentEffect = this.config.effect === "auto" ? "none" : this.config.effect;
		this.particles = [];
		this.splashes = [];
		this.animationRunning = false;
		this.animationFrame = null;

		this.sendSocketNotification("WEATHER_EFFECTS_CONFIG", this.config);
	},

	getDom() {
		const container = document.createElement("div");
		container.className = "weather-effects-container";

		this.canvas = document.createElement("canvas");
		this.canvas.id = "weather-effects-canvas";
		container.appendChild(this.canvas);

		setTimeout(() => {
			this.resizeCanvas();
			window.addEventListener("resize", () => this.resizeCanvas());
			this.setupParticles();
			if (this.currentEffect !== "none") {
				this.startAnimation();
			}
		}, 100);

		return container;
	},

	resizeCanvas() {
		if (!this.canvas) return;
		this.canvas.width = window.innerWidth || 1024;
		this.canvas.height = window.innerHeight || 768;
	},

	setupParticles() {
		this.particles = [];
		this.splashes = [];
		const w = this.canvas ? this.canvas.width : (window.innerWidth || 1024);
		const h = this.canvas ? this.canvas.height : (window.innerHeight || 768);

		if (this.currentEffect === "rain") {
			for (let i = 0; i < this.config.rainCount; i++) {
				this.particles.push(this.createRainParticle(w, h, true));
			}
		} else if (this.currentEffect === "snow") {
			for (let i = 0; i < this.config.snowCount; i++) {
				this.particles.push(this.createSnowParticle(w, h, true));
			}
		}
	},

	createRainParticle(w, h, randomY) {
		const wind = -1.2 + (Math.random() * 0.4 - 0.2);
		return {
			x: Math.random() * (w + 120) - 60,
			y: randomY ? Math.random() * h : -20 - Math.random() * 60,
			length: 18 + Math.random() * 20,
			speed: 15 + Math.random() * 10,
			wind: wind,
			opacity: 0.35 + Math.random() * 0.35,
			thickness: 1.0 + Math.random() * 0.8
		};
	},

	createSnowParticle(w, h, randomY) {
		return {
			x: Math.random() * w,
			y: randomY ? Math.random() * h : -10 - Math.random() * 30,
			radius: 1.2 + Math.random() * 2.8,
			speed: 0.8 + Math.random() * 1.5,
			angle: Math.random() * Math.PI * 2,
			swaySpeed: 0.015 + Math.random() * 0.02,
			swayWidth: 0.8 + Math.random() * 1.6,
			opacity: 0.45 + Math.random() * 0.45
		};
	},

	startAnimation() {
		if (this.animationRunning) return;
		this.animationRunning = true;
		const loop = () => {
			if (!this.animationRunning) return;
			this.draw();
			this.animationFrame = requestAnimationFrame(loop);
		};
		this.animationFrame = requestAnimationFrame(loop);
	},

	stopAnimation() {
		this.animationRunning = false;
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = null;
		}
		if (this.canvas) {
			const ctx = this.canvas.getContext("2d");
			if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}
	},

	draw() {
		if (!this.canvas) return;
		const ctx = this.canvas.getContext("2d");
		if (!ctx) return;
		const w = this.canvas.width;
		const h = this.canvas.height;

		ctx.clearRect(0, 0, w, h);

		if (this.currentEffect === "rain") {
			for (let i = 0; i < this.particles.length; i++) {
				const p = this.particles[i];
				p.y += p.speed * this.config.rainSpeed;
				p.x += p.wind * this.config.rainSpeed;

				const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.wind * (p.length / 8), p.y + p.length);
				grad.addColorStop(0, "rgba(180, 220, 255, 0)");
				grad.addColorStop(1, `rgba(160, 220, 255, ${p.opacity})`);
				ctx.strokeStyle = grad;
				ctx.lineWidth = p.thickness;
				ctx.beginPath();
				ctx.moveTo(p.x, p.y);
				ctx.lineTo(p.x + p.wind * (p.length / 8), p.y + p.length);
				ctx.stroke();

				if (p.y > h) {
					if (this.config.splashEnabled && Math.random() < 0.4) {
						this.splashes.push({
							x: p.x,
							y: h - Math.random() * 6,
							radius: 1,
							maxRadius: 3 + Math.random() * 4,
							alpha: 0.45
						});
					}
					this.particles[i] = this.createRainParticle(w, h, false);
				}
			}

			// Splashes
			for (let i = this.splashes.length - 1; i >= 0; i--) {
				const s = this.splashes[i];
				ctx.beginPath();
				ctx.ellipse(s.x, s.y, s.radius * 2, s.radius * 0.7, 0, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(180, 225, 255, ${s.alpha})`;
				ctx.lineWidth = 1;
				ctx.stroke();
				s.radius += 0.5;
				s.alpha -= 0.05;
				if (s.alpha <= 0) this.splashes.splice(i, 1);
			}
		} else if (this.currentEffect === "snow") {
			for (let i = 0; i < this.particles.length; i++) {
				const p = this.particles[i];
				p.angle += p.swaySpeed;
				p.y += p.speed * this.config.snowSpeed;
				p.x += Math.sin(p.angle) * p.swayWidth;

				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
				ctx.shadowColor = "rgba(255, 255, 255, 0.65)";
				ctx.shadowBlur = p.radius * 2;
				ctx.fill();

				if (p.y > h + 10) {
					this.particles[i] = this.createSnowParticle(w, h, false);
				}
			}
			ctx.shadowBlur = 0;
		}
	},

	setEffect(effect) {
		if (this.currentEffect === effect) return;
		this.currentEffect = effect;
		if (effect === "none") {
			this.stopAnimation();
		} else {
			this.setupParticles();
			this.startAnimation();
		}
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "WEATHER_EFFECT_UPDATE") {
			this.detectedEffect = payload.effect;
			if (this.config.effect === "auto") {
				this.setEffect(this.detectedEffect);
			}
		}
	},

	notificationReceived(notification, payload) {
		if (notification === "SET_WEATHER_EFFECT") {
			if (typeof payload === "string") {
				if (payload === "auto") {
					this.config.effect = "auto";
					this.setEffect(this.detectedEffect);
				} else {
					this.config.effect = payload;
					this.setEffect(payload);
				}
			}
		} else if (notification === "SET_WEATHER_EFFECT_AUTO") {
			this.detectedEffect = payload;
			if (this.config.effect === "auto") {
				this.setEffect(payload);
			}
		}
	}
});
