/* global Module */

Module.register("MMM-OpenMeteoHourlyGrid", {
	defaults: {
		latitude: 37.532600,
		longitude: 127.024612,

		hoursToShow: 6, // total columns (Now + next hours)
		updateInterval: 10 * 60 * 1000,
		requestTimeout: 10 * 1000,

		units: "metric",
		timeFormat: 24,
		timezone: "Asia/Seoul",
		forecastDays: 2,

		showRain: true,
		showWind: false,
		showUv: false,
		showSun: false,

		dayNightIcons: true,

		compact: true,
		labelWidth: "4.5em",
		columnMinWidth: "2.8em",
		iconSize: "1.25em"
	},

	getStyles() { return ["MMM-OpenMeteoHourlyGrid.css", "font-awesome.css"]; },

	start() {
		this.dataModel = null;
		this.error = null;
		this.sendSocketNotification("MMM_OMHG_CONFIG", { ...this.config, instanceId: this.identifier });
	},

	socketNotificationReceived(n, p) {
		if (!p || p.instanceId !== this.identifier) return;
		if (n === "MMM_OMHG_DATA") {
			this.error = null;
			this.dataModel = p.data;
			this.updateDom();
			const cur = p.data?.hours?.[0];
			if (cur) {
				const c = Number(cur.code || 0);
				const isSnow = (c >= 71 && c <= 77) || (c >= 85 && c <= 86);
				const isRain = !isSnow && ((cur.pAmt && cur.pAmt > 0) || (cur.pProb && cur.pProb >= 30) || (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95);
				let eff = "none";
				if (isSnow) eff = "snow";
				else if (isRain) eff = "rain";
				this.sendNotification("SET_WEATHER_EFFECT_AUTO", eff);
			}
		}
		if (n === "MMM_OMHG_ERROR") { this.error = p.error; this.updateDom(); }
	},

	getDom() {
		const w = document.createElement("div");
		w.className = "om-hourly-grid";
		if (this.error) { w.innerHTML = `<div class="dimmed small">${this.error}</div>`; return w; }
		if (!this.dataModel) { w.innerHTML = `<div class="dimmed small">날씨 로딩 중…</div>`; return w; }
		const { columns, rows } = this.build(this.dataModel);
		w.appendChild(this.render(columns, rows, this.dataModel.sun));
		return w;
	},

	build(api) {
		const tempUnit = this.config.units === "imperial" ? "°F" : "°C";
		const windUnit = this.config.units === "imperial" ? "mph" : "km/h";

		const cols = api.hours.slice(0, this.config.hoursToShow).map((h, idx) => {
			const c = Number(h.code || 0);
			const isSnow = (c >= 71 && c <= 77) || (c >= 85 && c <= 86);
			const isRain = !isSnow && ((h.pAmt && h.pAmt > 0) || (h.pProb && h.pProb >= 30) || (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95);

			let rainDisplay = "—";
			if (h.pProb != null && h.pProb > 0) {
				rainDisplay = `${Math.round(h.pProb)}%`;
			} else if (h.pProb === 0) {
				rainDisplay = "0%";
			}

			let rainAmtDisplay = "—";
			if (h.pAmt != null && h.pAmt > 0) {
				rainAmtDisplay = `${h.pAmt.toFixed(1)}mm`;
			}

			return {
				hour: (idx === 0 || h.isNow) ? "현재" : this.hour(h.t),
				icon: `<i class="${this.icon(h)}"></i>`,
				temp: h.temp != null ? `${Math.round(h.temp)}°` : "—",
				rp: rainDisplay,
				rm: rainAmtDisplay,
				w: h.wSpd != null ? `${this.windArrow(h.wDir)} ${Math.round(h.wSpd)}` : "—",
				uv: h.uv != null ? Math.round(h.uv) : "—",
				isRain,
				isSnow
			};
		});

		const rows = [
			{ l: "", h: true, v: c => c.icon, isIcon: true },
			{ l: "기온", v: c => c.temp, isTemp: true }
		];

		if (this.config.showRain) {
			rows.push({ l: "강수확률", v: c => c.rp, isPrecip: true });
			rows.push({ l: "강수량", v: c => c.rm, isPrecipAmt: true });
		}
		if (this.config.showWind) rows.push({ l: `바람 (${windUnit})`, v: c => c.w });
		if (this.config.showUv) rows.push({ l: "자외선", v: c => c.uv });

		return { columns: cols, rows };
	},

	render(cols, rows, sun) {
		const wrap = document.createElement("div");
		wrap.className = "om-wrap";

		const g = document.createElement("div");
		g.className = `om-grid ${this.config.compact ? "om-compact" : ""}`;
		g.style.setProperty("--om-cols", cols.length);
		g.style.setProperty("--om-label-width", this.config.labelWidth);
		g.style.setProperty("--om-col-min", this.config.columnMinWidth);
		g.style.setProperty("--om-icon-size", this.config.iconSize);

		g.appendChild(this.cell("", "om-cell om-label"));
		cols.forEach(c => {
			const cls = `om-cell om-hour-cell${c.isRain ? " precip-rain" : ""}${c.isSnow ? " precip-snow" : ""}`;
			g.appendChild(this.cell(c.hour, cls));
		});

		rows.forEach(r => {
			g.appendChild(this.cell(r.l, "om-cell om-label"));
			cols.forEach(c => {
				let cls = "om-cell";
				if (r.isIcon) cls += " om-icon-cell";
				if (r.isTemp) cls += " om-temp-cell";
				if (c.isRain) cls += " precip-rain";
				if (c.isSnow) cls += " precip-snow";
				g.appendChild(this.cell(r.v(c), cls, r.h));
			});
		});

		wrap.appendChild(g);
		if (sun && this.config.showSun) wrap.appendChild(this.renderSunTable(sun));
		return wrap;
	},

	renderSunTable(sun) {
		const box = document.createElement("div");
		box.className = "om-sun";

		const t = document.createElement("table");
		t.className = "om-sun-table";

		const addRow = (l, v, cls) => {
			const tr = document.createElement("tr");
			if (cls) tr.className = cls;
			const td1 = document.createElement("td"); td1.textContent = l;
			const td2 = document.createElement("td"); td2.textContent = v;
			tr.appendChild(td1); tr.appendChild(td2);
			t.appendChild(tr);
		};

		const trTitle = document.createElement("tr");
		trTitle.className = "om-sun-title";
		const tdTitle = document.createElement("td");
		tdTitle.colSpan = 2;
		tdTitle.textContent = "일출 및 일몰";
		trTitle.appendChild(tdTitle);
		t.appendChild(trTitle);

		const trBlank = document.createElement("tr");
		trBlank.className = "om-sun-gap";
		const tdBlank = document.createElement("td");
		tdBlank.colSpan = 2;
		tdBlank.innerHTML = "&nbsp;";
		trBlank.appendChild(tdBlank);
		t.appendChild(trBlank);

		addRow("여명", this.time(sun.dawn));
		addRow("일출", this.time(sun.sunrise));
		addRow("일몰", this.time(sun.sunset));
		addRow("황혼", this.time(sun.dusk));

		box.appendChild(t);
		return box;
	},

	cell(v, cls, h = false) {
		const d = document.createElement("div"); d.className = cls;
		h ? d.innerHTML = v : d.textContent = v;
		return d;
	},

	hour(t) {
		const h = new Date(t).getHours();
		return this.config.timeFormat === 12 ? `${(h % 12) || 12}${h < 12 ? "am" : "pm"}` : `${String(h).padStart(2, "0")}:00`;
	},

	time(t) {
		if (t == null) return "—";
		const d = new Date(t);
		const h = d.getHours();
		const m = String(d.getMinutes()).padStart(2, "0");
		if (this.config.timeFormat === 12) {
			const hh = (h % 12) || 12;
			return `${hh}:${m}${h < 12 ? "am" : "pm"}`;
		}
		return `${String(h).padStart(2, "0")}:${m}`;
	},

	windArrow(degFrom) {
		if (degFrom == null) return "•";
		const degTo = (degFrom + 180) % 360;
		const arrows = ["↑","↗","→","↘","↓","↙","←","↖"];
		return arrows[Math.round(degTo / 45) % 8];
	},

	icon(h) {
		const day = this.config.dayNightIcons ? !!h.isDay : true;
		const mm = Number(h.pAmt || 0);
		const c = Number(h.code);

		if (c === 0) return day ? "far fa-sun" : "far fa-moon";
		if (c <= 2) return day ? "fas fa-cloud-sun" : "fas fa-cloud-moon";
		if (c === 3) return "far fa-cloud";
		if (c >= 45 && c <= 48) return "fas fa-smog";

		if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) {
			if (mm < 1) return day ? "fas fa-cloud-sun-rain" : "fas fa-cloud-moon-rain";
			if (mm < 5) return "fas fa-cloud-rain";
			return "fas fa-cloud-showers-heavy";
		}

		if ((c >= 71 && c <= 77) || c >= 85) return "far fa-snowflake";
		if (c >= 95) return "fas fa-bolt";
		return "far fa-cloud";
	}
});
