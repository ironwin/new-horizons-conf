const NodeHelper=require("node_helper");const https=require("https");

// Tiny civil-twilight (dawn/dusk) calculator (no deps). Returns local Date objects.
// Based on the public-domain NOAA / SunCalc-style solar calculations.
const _rad=Math.PI/180,_dayMs=864e5,_J1970=2440588,_J2000=2451545;
const _toJulian=d=>d.valueOf()/_dayMs-0.5+_J1970;
const _fromJulian=j=>new Date((j+0.5-_J1970)*_dayMs);
const _toDays=d=>_toJulian(d)-_J2000;
const _solarMeanAnomaly=d=>_rad*(357.5291+0.98560028*d);
const _eclipticLongitude=M=>{
	const C=_rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M));
	const P=_rad*102.9372;
	return M+C+P+Math.PI;
};
const _declination=L=>Math.asin(Math.sin(L)*Math.sin(_rad*23.4397));
const _julianCycle=(d,lw)=>Math.round(d-0.0009-lw/(2*Math.PI));
const _approxTransit=(Ht,lw,n)=>0.0009+(Ht+lw)/(2*Math.PI)+n;
const _solarTransitJ=(ds,M,L)=>_J2000+ds+0.0053*Math.sin(M)-0.0069*Math.sin(2*L);
const _hourAngle=(h,phi,dec)=>Math.acos((Math.sin(h)-Math.sin(phi)*Math.sin(dec))/(Math.cos(phi)*Math.cos(dec)));
const _getSetJ=(h,lw,phi,dec,n,M,L)=>{
	const w=_hourAngle(h,phi,dec);
	const a=_approxTransit(w,lw,n);
	return _solarTransitJ(a,M,L);
};

function getCivilTwilight(date,lat,lon){
	// date: any Date on the target day (local). Use local noon to avoid DST edge cases.
	const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0,0);
	const lw=_rad*-lon,phi=_rad*lat;
	const days=_toDays(d);
	const n=_julianCycle(days,lw);
	const ds=_approxTransit(0,lw,n);
	const M=_solarMeanAnomaly(ds);
	const L=_eclipticLongitude(M);
	const dec=_declination(L);
	const Jnoon=_solarTransitJ(ds,M,L);
	const h=-6*_rad; // civil twilight
	const Jset=_getSetJ(h,lw,phi,dec,n,M,L);
	const Jrise=Jnoon-(Jset-Jnoon);
	return{dawn:_fromJulian(Jrise),dusk:_fromJulian(Jset)};
}
module.exports=NodeHelper.create({
	socketNotificationReceived(n,p){
		if(n!=="MMM_OMHG_CONFIG")return;
		this.c=p;this.f();clearInterval(this.t);
		this.t=setInterval(()=>this.f(),p.updateInterval);
	},
	f(){
		const c=this.c;
		const q=new URLSearchParams({
			latitude:c.latitude,longitude:c.longitude,
			hourly:"temperature_2m,weathercode,precipitation_probability,precipitation,windspeed_10m,winddirection_10m,uv_index",
			daily:"sunrise,sunset",timezone:c.timezone||"auto",forecast_days:c.forecastDays
		});
		if(c.units==="imperial"){q.set("temperature_unit","fahrenheit");q.set("windspeed_unit","mph");q.set("precipitation_unit","inch");}
		https.get(`https://api.open-meteo.com/v1/forecast?${q}`,{timeout:c.requestTimeout},r=>{
			if(r.statusCode<200||r.statusCode>=300){r.resume();return this.sendSocketNotification("MMM_OMHG_ERROR",{instanceId:c.instanceId,error:`HTTP ${r.statusCode}`});}
			let b="";r.on("data",d=>b+=d);
			r.on("end",()=>{
				try{this.sendSocketNotification("MMM_OMHG_DATA",{instanceId:c.instanceId,data:this.vm(JSON.parse(b),c)});}
				catch{this.sendSocketNotification("MMM_OMHG_ERROR",{instanceId:c.instanceId,error:"Invalid JSON response"});}
			});
		}).on("error",e=>this.sendSocketNotification("MMM_OMHG_ERROR",{instanceId:c.instanceId,error:e.message}));
	},
	vm(j,c){
		const h=j.hourly,d=j.daily,ss={};
		if(d?.time?.length&&d.sunrise?.length&&d.sunset?.length){
			d.time.forEach((t,i)=>ss[t]={sr:Date.parse(d.sunrise[i]),ss:Date.parse(d.sunset[i])});
		}

		const now=Date.now();

		// Open-Meteo times are on the hour. We want the current hour ("Now"), not the next hour.
		// Find the first hour strictly greater than now, then step back one.
		let i=h.time.findIndex(t=>Date.parse(t)>now)-1;
		if(i<0)i=0;

		const take=Math.max(1,Number(c.hoursToShow||10));
		const hours=h.time.slice(i,i+take).map((t,x)=>{
			const ts=Date.parse(t),k=t.slice(0,10),s=ss[k];
			const day=s?.sr&&s?.ss?ts>=s.sr&&ts<s.ss:(new Date(ts).getHours()>=6&&new Date(ts).getHours()<18);

			return{
				t,
				isNow:x===0, // UI header uses this as "Now"
				isDay:day,
				temp:h.temperature_2m?.[i+x],
				code:h.weathercode?.[i+x],
				pProb:h.precipitation_probability?.[i+x],
				pAmt:h.precipitation?.[i+x],
				wSpd:h.windspeed_10m?.[i+x],
				wDir:h.winddirection_10m?.[i+x],
				uv:h.uv_index?.[i+x]
			};
		});

		const dayKey=hours?.[0]?.t?.slice(0,10);
		const s=dayKey?ss[dayKey]:null;
		let sun=null;
		if(s?.sr&&s?.ss){
			const tw=getCivilTwilight(new Date(s.sr),Number(c.latitude),Number(c.longitude));
			sun={
				dawn:tw?.dawn?.getTime?.()??null,
				sunrise:s.sr,
				sunset:s.ss,
				dusk:tw?.dusk?.getTime?.()??null
			};
		}

		return{hours,sun};
	}
});
