import { n as useGameStore } from "./routes-BhqWAMUc.mjs";
import { C as PointsMaterial, D as SphereGeometry, E as Scene, O as SpotLight, S as Points, T as SRGBColorSpace, _ as NearestFilter, a as BufferGeometry, b as PlaneGeometry, c as Color, d as Group, f as HemisphereLight, g as MeshLambertMaterial, h as MeshBasicMaterial, i as BufferAttribute, l as CylinderGeometry, m as Mesh, n as AmbientLight, o as CanvasTexture, p as MathUtils, r as BoxGeometry, s as CircleGeometry, t as WebGLRenderer, u as FogExp2, v as Object3D, w as RepeatWrapping, x as PointLight, y as PerspectiveCamera } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engine-CK9uZRdI.js
/** Procedural horror audio via Web Audio API — no external files. */
var HorrorAudio = class {
	ctx = null;
	master = null;
	music = null;
	sfx = null;
	muted = false;
	droneOsc = [];
	droneLfo = null;
	noiseBuf = null;
	footTimer = 0;
	stingCooldown = 0;
	started = false;
	unlock() {
		if (!this.ctx) {
			const AC = window.AudioContext || window.webkitAudioContext;
			this.ctx = new AC({ latencyHint: "interactive" });
			this.master = this.ctx.createGain();
			this.music = this.ctx.createGain();
			this.sfx = this.ctx.createGain();
			this.master.gain.value = this.muted ? 0 : .7;
			this.music.gain.value = .22;
			this.sfx.gain.value = .85;
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.master.connect(this.ctx.destination);
			this.noiseBuf = this.makeNoise(this.ctx, 1.2);
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
		if (!this.started && this.ctx.state === "running") {
			this.started = true;
			this.startDrone();
		}
	}
	setMuted(m) {
		this.muted = m;
		if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : .7, this.ctx.currentTime, .04);
	}
	resume() {
		if (this.ctx?.state === "suspended") this.ctx.resume();
	}
	makeNoise(ctx, seconds) {
		const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
		const data = buf.getChannelData(0);
		let last = 0;
		for (let i = 0; i < data.length; i++) {
			last = last * .96 + (Math.random() * 2 - 1) * .35;
			data[i] = last;
		}
		return buf;
	}
	startDrone() {
		const ctx = this.ctx;
		const music = this.music;
		if (!ctx || !music) return;
		for (const f of [
			38,
			46.5,
			77,
			93
		]) {
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			osc.type = f < 50 ? "sine" : "triangle";
			osc.frequency.value = f;
			g.gain.value = f < 50 ? .38 : .08;
			osc.connect(g);
			g.connect(music);
			osc.start();
			this.droneOsc.push(osc);
		}
		const lfo = ctx.createOscillator();
		const lfoG = ctx.createGain();
		lfo.frequency.value = .07;
		lfoG.gain.value = 4;
		lfo.connect(lfoG);
		lfoG.connect(this.droneOsc[0].frequency);
		lfo.start();
		this.droneLfo = lfo;
		const filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 280;
		filter.Q.value = .7;
	}
	noiseBurst(duration, freq, q, gain, rate = 1) {
		const ctx = this.ctx;
		const sfx = this.sfx;
		if (!ctx || !sfx || !this.noiseBuf) return;
		const src = ctx.createBufferSource();
		src.buffer = this.noiseBuf;
		src.playbackRate.value = rate;
		const bp = ctx.createBiquadFilter();
		bp.type = "bandpass";
		bp.frequency.value = freq;
		bp.Q.value = q;
		const g = ctx.createGain();
		const t = ctx.currentTime;
		g.gain.setValueAtTime(1e-4, t);
		g.gain.exponentialRampToValueAtTime(gain, t + .012);
		g.gain.exponentialRampToValueAtTime(1e-4, t + duration);
		src.connect(bp);
		bp.connect(g);
		g.connect(sfx);
		src.start();
		src.stop(t + duration + .02);
		src.onended = () => {
			src.disconnect();
			bp.disconnect();
			g.disconnect();
		};
	}
	flashlightClick(on) {
		const ctx = this.ctx;
		const sfx = this.sfx;
		if (!ctx || !sfx) return;
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "square";
		osc.frequency.value = on ? 190 : 120;
		const t = ctx.currentTime;
		g.gain.setValueAtTime(.09, t);
		g.gain.exponentialRampToValueAtTime(1e-4, t + .07);
		osc.connect(g);
		g.connect(sfx);
		osc.start();
		osc.stop(t + .08);
	}
	footstep(running, crouch) {
		const freq = crouch ? 140 : running ? 220 : 180;
		this.noiseBurst(crouch ? .09 : .07, freq, 3.2, running ? .22 : .12, .85 + Math.random() * .3);
	}
	tickFoot(dt, speed, running, crouch, moving) {
		if (!moving) {
			this.footTimer = 0;
			return;
		}
		const interval = crouch ? .62 : running ? .32 : .46;
		this.footTimer += dt * Math.min(1.6, .35 + speed / 4);
		if (this.footTimer >= interval) {
			this.footTimer = 0;
			this.footstep(running, crouch);
		}
	}
	drawer() {
		this.noiseBurst(.28, 420, 1.4, .2, .7);
		this.noiseBurst(.18, 180, 2, .16, .5);
	}
	pickup() {
		const ctx = this.ctx;
		const sfx = this.sfx;
		if (!ctx || !sfx) return;
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "sine";
		const t = ctx.currentTime;
		osc.frequency.setValueAtTime(520, t);
		osc.frequency.exponentialRampToValueAtTime(880, t + .16);
		g.gain.setValueAtTime(.12, t);
		g.gain.exponentialRampToValueAtTime(1e-4, t + .22);
		osc.connect(g);
		g.connect(sfx);
		osc.start();
		osc.stop(t + .24);
	}
	paper() {
		this.noiseBurst(.2, 2400, .8, .1, 1.4);
	}
	locker(open) {
		this.noiseBurst(open ? .22 : .16, open ? 280 : 200, 1.8, .18, open ? .6 : .8);
	}
	sting() {
		const ctx = this.ctx;
		const sfx = this.sfx;
		if (!ctx || !sfx) return;
		if (this.stingCooldown > 0) return;
		this.stingCooldown = 4;
		const t = ctx.currentTime;
		for (const f of [
			932,
			987,
			1400
		]) {
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(f, t);
			osc.frequency.exponentialRampToValueAtTime(f * .55, t + .7);
			g.gain.setValueAtTime(.07, t);
			g.gain.exponentialRampToValueAtTime(1e-4, t + .75);
			const filter = ctx.createBiquadFilter();
			filter.type = "highpass";
			filter.frequency.value = 600;
			osc.connect(filter);
			filter.connect(g);
			g.connect(sfx);
			osc.start();
			osc.stop(t + .8);
		}
	}
	caught() {
		this.noiseBurst(.8, 90, .6, .4, .4);
		this.noiseBurst(.5, 1400, 4, .15, 1.6);
	}
	win() {
		const ctx = this.ctx;
		const sfx = this.sfx;
		if (!ctx || !sfx) return;
		const t = ctx.currentTime;
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(220, t);
		osc.frequency.exponentialRampToValueAtTime(440, t + .9);
		g.gain.setValueAtTime(.08, t);
		g.gain.exponentialRampToValueAtTime(1e-4, t + 1.2);
		osc.connect(g);
		g.connect(sfx);
		osc.start();
		osc.stop(t + 1.25);
	}
	gateRattle() {
		this.noiseBurst(.35, 160, 2.2, .22, .45);
	}
	heartbeat(intensity, dt) {
		if (intensity < .15 || !this.ctx || !this.sfx) return;
		this._heartAcc = (this._heartAcc ?? 0) + dt;
		const period = .95 - intensity * .45;
		if (this._heartAcc >= period) {
			this._heartAcc = 0;
			const ctx = this.ctx;
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			osc.type = "sine";
			osc.frequency.value = 52;
			const t = ctx.currentTime;
			g.gain.setValueAtTime(1e-4, t);
			g.gain.exponentialRampToValueAtTime(.12 * intensity, t + .03);
			g.gain.exponentialRampToValueAtTime(1e-4, t + .16);
			osc.connect(g);
			g.connect(this.sfx);
			osc.start();
			osc.stop(t + .18);
		}
	}
	_heartAcc = 0;
	update(dt) {
		if (this.stingCooldown > 0) this.stingCooldown -= dt;
	}
	dispose() {
		for (const o of this.droneOsc) try {
			o.stop();
			o.disconnect();
		} catch {}
		this.droneOsc = [];
		try {
			this.droneLfo?.stop();
			this.droneLfo?.disconnect();
		} catch {}
		this.ctx?.close();
		this.ctx = null;
		this.started = false;
	}
};
var MAP = [
	"####################################",
	"#DDDDDD#PPPPPP#111111#222222#333333#",
	"#DDDDDD#PPPPPP#111111#222222#333333#",
	"#DDDDDD#PPPPPP#111111#222222#333333#",
	"#DDDDDD#PPPPPP#111111#222222#333333#",
	"###  #####  #####  #####  #####  ###",
	"#                                  #",
	"#                                  #",
	"#                                  #",
	"###  ###  ####  ####################",
	"#BBBB#AAA#4444#HHHHHHHHHHHHHHHHHHHH#",
	"#BBBB#AAA#4444#HHHHHHHHHHHHHHHHHHHH#",
	"#BBBB#AAA#4444#HHHHHHHHHHHHHHHHHHHH#",
	"#BBBB#AAA#4444#HHHHHHHHHHHHH     HH#",
	"#############################GG#####"
];
var MAP_H = MAP.length;
var MAP_W = MAP[0].length;
var WORLD_W = MAP_W * 2;
var WORLD_D = MAP_H * 2;
var ROOM_NAME = {
	D: "Diretoria",
	P: "Sala dos Professores",
	"1": "Sala 1",
	"2": "Sala 2",
	"3": "Sala 3",
	"4": "Sala 4",
	B: "Banheiro",
	A: "Almoxarifado",
	H: "Hall"
};
function charAt(tx, tz) {
	if (tz < 0 || tz >= MAP_H || tx < 0 || tx >= MAP_W) return "#";
	return MAP[tz][tx];
}
function tileOf(x, z) {
	return {
		tx: Math.floor(x / 2),
		tz: Math.floor(z / 2)
	};
}
function tileCenter(tx, tz) {
	return {
		x: (tx + .5) * 2,
		z: (tz + .5) * 2
	};
}
function isWallChar(c, gateClosed) {
	return c === "#" || c === "G" && gateClosed;
}
function isBlocked(x, z, gateClosed) {
	const { tx, tz } = tileOf(x, z);
	return isWallChar(charAt(tx, tz), gateClosed);
}
function findTiles(ch) {
	const out = [];
	for (let tz = 0; tz < MAP_H; tz++) for (let tx = 0; tx < MAP_W; tx++) if (MAP[tz][tx] === ch) out.push({
		tx,
		tz
	});
	return out;
}
function roomBounds(ch) {
	const tiles = findTiles(ch);
	if (!tiles.length) return null;
	let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
	for (const t of tiles) {
		minx = Math.min(minx, t.tx * 2);
		maxx = Math.max(maxx, (t.tx + 1) * 2);
		minz = Math.min(minz, t.tz * 2);
		maxz = Math.max(maxz, (t.tz + 1) * 2);
	}
	return {
		minx,
		maxx,
		minz,
		maxz
	};
}
function spawnIn(ch) {
	const tiles = findTiles(ch);
	const t = tiles[Math.floor(tiles.length / 2)] ?? {
		tx: 20,
		tz: 2
	};
	return tileCenter(t.tx, t.tz);
}
/** Circle vs nearby wall tiles. Resolves penetration. */
function resolveCircle(px, pz, r, gateClosed, extras) {
	let x = px;
	let z = pz;
	const tx0 = Math.floor(x / 2);
	const tz0 = Math.floor(z / 2);
	for (let tz = tz0 - 2; tz <= tz0 + 2; tz++) for (let tx = tx0 - 2; tx <= tx0 + 2; tx++) {
		if (!isWallChar(charAt(tx, tz), gateClosed)) continue;
		const hit = pushOut(x, z, r, tx * 2, tz * 2, (tx + 1) * 2, (tz + 1) * 2);
		x = hit.x;
		z = hit.z;
	}
	for (const b of extras) {
		const hit = pushOut(x, z, r, b.minx, b.minz, b.maxx, b.maxz);
		x = hit.x;
		z = hit.z;
	}
	return {
		x,
		z
	};
}
function pushOut(x, z, r, minx, minz, maxx, maxz) {
	const cx = Math.max(minx, Math.min(x, maxx));
	const cz = Math.max(minz, Math.min(z, maxz));
	let dx = x - cx;
	let dz = z - cz;
	const d2 = dx * dx + dz * dz;
	if (d2 >= r * r) return {
		x,
		z
	};
	if (d2 < 1e-8) {
		const left = x - minx;
		const right = maxx - x;
		const top = z - minz;
		const bot = maxz - z;
		const m = Math.min(left, right, top, bot);
		if (m === left) return {
			x: minx - r,
			z
		};
		if (m === right) return {
			x: maxx + r,
			z
		};
		if (m === top) return {
			x,
			z: minz - r
		};
		return {
			x,
			z: maxz + r
		};
	}
	const d = Math.sqrt(d2);
	const pen = r - d;
	return {
		x: x + dx / d * pen,
		z: z + dz / d * pen
	};
}
function lineOfSight(ax, az, bx, bz, gateClosed) {
	const dx = bx - ax;
	const dz = bz - az;
	const steps = Math.max(2, Math.ceil(Math.hypot(dx, dz) / .45));
	for (let i = 1; i < steps; i++) {
		const t = i / steps;
		if (isBlocked(ax + dx * t, az + dz * t, gateClosed)) return false;
	}
	return true;
}
function collectDoors() {
	const doors = [];
	for (let tz = 0; tz < MAP_H; tz++) for (let tx = 0; tx < MAP_W; tx++) {
		if (MAP[tz][tx] !== " ") continue;
		const n = charAt(tx, tz - 1);
		const s = charAt(tx, tz + 1);
		const e = charAt(tx + 1, tz);
		const w = charAt(tx - 1, tz);
		let label = "";
		let facing = "s";
		if (ROOM_NAME[n]) {
			label = ROOM_NAME[n];
			facing = "s";
		} else if (ROOM_NAME[s]) {
			label = ROOM_NAME[s];
			facing = "n";
		} else if (ROOM_NAME[e]) {
			label = ROOM_NAME[e];
			facing = "w";
		} else if (ROOM_NAME[w]) {
			label = ROOM_NAME[w];
			facing = "e";
		}
		if (!label) continue;
		if (doors.some((d) => d.label === label && Math.hypot(d.x - (tx + .5) * 2, d.z - (tz + .5) * 2) < 3)) continue;
		const c = tileCenter(tx, tz);
		doors.push({
			x: c.x,
			z: c.z,
			label,
			facing
		});
	}
	return doors;
}
function canvasTex(size, draw, repeat = 1) {
	const c = document.createElement("canvas");
	c.width = c.height = size;
	draw(c.getContext("2d"), size);
	const t = new CanvasTexture(c);
	t.magFilter = NearestFilter;
	t.minFilter = NearestFilter;
	t.wrapS = t.wrapT = RepeatWrapping;
	t.repeat.set(repeat, repeat);
	t.colorSpace = SRGBColorSpace;
	t.needsUpdate = true;
	return t;
}
function noise(ctx, s, alpha) {
	const img = ctx.getImageData(0, 0, s, s);
	const d = img.data;
	for (let i = 0; i < d.length; i += 4) {
		const n = (Math.random() - .5) * 255 * alpha;
		d[i] = Math.max(0, Math.min(255, d[i] + n));
		d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
		d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
	}
	ctx.putImageData(img, 0, 0);
}
function createTextures() {
	return {
		wall: canvasTex(64, (ctx, s) => {
			ctx.fillStyle = "#6a4a4c";
			ctx.fillRect(0, 0, s, s);
			ctx.fillStyle = "#5c3f42";
			for (let y = 0; y < s; y += 16) ctx.fillRect(0, y, s, 1);
			ctx.fillStyle = "#7a5858";
			for (let i = 0; i < 40; i++) {
				ctx.globalAlpha = .25;
				ctx.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 8, 2);
			}
			ctx.globalAlpha = 1;
			ctx.fillStyle = "#3a2426";
			ctx.fillRect(10, 28, 18, 10);
			ctx.fillStyle = "#4a3032";
			ctx.fillRect(38, 8, 12, 22);
			noise(ctx, s, .12);
		}, 2),
		floor: canvasTex(64, (ctx, s) => {
			const tile = 16;
			for (let y = 0; y < s; y += tile) for (let x = 0; x < s; x += tile) {
				ctx.fillStyle = (x + y) / tile % 2 === 0 ? "#1a1c18" : "#141612";
				ctx.fillRect(x, y, tile, tile);
				ctx.strokeStyle = "#0c0d0a";
				ctx.strokeRect(x + .5, y + .5, 15, 15);
			}
			noise(ctx, s, .08);
		}, 8),
		ceil: canvasTex(64, (ctx, s) => {
			ctx.fillStyle = "#2a2624";
			ctx.fillRect(0, 0, s, s);
			ctx.strokeStyle = "#1a1816";
			for (let i = 0; i <= s; i += 16) {
				ctx.beginPath();
				ctx.moveTo(i, 0);
				ctx.lineTo(i, s);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, i);
				ctx.lineTo(s, i);
				ctx.stroke();
			}
			ctx.fillStyle = "#3a2218";
			ctx.globalAlpha = .35;
			ctx.beginPath();
			ctx.ellipse(44, 20, 14, 10, .4, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;
			noise(ctx, s, .1);
		}, 6),
		wood: canvasTex(32, (ctx, s) => {
			ctx.fillStyle = "#3a2818";
			ctx.fillRect(0, 0, s, s);
			for (let y = 0; y < s; y++) {
				ctx.fillStyle = y % 4 === 0 ? "#2e2012" : "#46301c";
				ctx.fillRect(0, y, s, 1);
			}
			noise(ctx, s, .08);
		}),
		metal: canvasTex(32, (ctx, s) => {
			ctx.fillStyle = "#2c3034";
			ctx.fillRect(0, 0, s, s);
			ctx.fillStyle = "#1c2024";
			ctx.fillRect(0, 0, 4, s);
			ctx.fillRect(s - 3, 0, 3, s);
			ctx.fillStyle = "#3a4046";
			ctx.fillRect(12, 8, 8, 3);
			noise(ctx, s, .1);
		}),
		paper: canvasTex(32, (ctx, s) => {
			ctx.fillStyle = "#d8c8a8";
			ctx.fillRect(0, 0, s, s);
			ctx.fillStyle = "#2a2018";
			ctx.globalAlpha = .55;
			for (let i = 0; i < 6; i++) ctx.fillRect(4, 6 + i * 4, 22 - i % 3 * 4, 1);
			ctx.globalAlpha = 1;
			noise(ctx, s, .06);
		}),
		door: canvasTex(64, (ctx, s) => {
			ctx.fillStyle = "#4a3020";
			ctx.fillRect(0, 0, s, s);
			ctx.fillStyle = "#3a2418";
			ctx.fillRect(4, 4, s - 8, s - 8);
			ctx.fillStyle = "#c4a35a";
			ctx.fillRect(s - 18, 30, 6, 6);
			noise(ctx, s, .08);
		}),
		gate: canvasTex(32, (ctx, s) => {
			ctx.fillStyle = "#1a1c1a";
			ctx.fillRect(0, 0, s, s);
			ctx.strokeStyle = "#4a5048";
			ctx.lineWidth = 2;
			for (let x = 4; x < s; x += 6) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, s);
				ctx.stroke();
			}
			ctx.strokeStyle = "#6a7068";
			ctx.beginPath();
			ctx.moveTo(0, 10);
			ctx.lineTo(s, 10);
			ctx.moveTo(0, 22);
			ctx.lineTo(s, 22);
			ctx.stroke();
		})
	};
}
function makeLabelTexture(text) {
	const c = document.createElement("canvas");
	c.width = 256;
	c.height = 64;
	const ctx = c.getContext("2d");
	ctx.fillStyle = "#d8c8a8";
	ctx.fillRect(0, 0, 256, 64);
	ctx.fillStyle = "#6a3030";
	ctx.fillRect(0, 0, 256, 8);
	ctx.fillRect(0, 56, 256, 8);
	ctx.fillStyle = "#1a1210";
	ctx.font = "bold 22px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text.toUpperCase(), 128, 34);
	const t = new CanvasTexture(c);
	t.magFilter = NearestFilter;
	t.minFilter = NearestFilter;
	t.colorSpace = SRGBColorSpace;
	return t;
}
var STEP = 1 / 60;
var PLAYER_R = .32;
var EYE = 1.62;
var CROUCH_EYE = .92;
var WALK = 3.05;
var SPRINT = 4.85;
var CROUCH_SPD = 1.45;
var PITCH_LIM = Math.PI / 2 - .04;
var FOG = 460038;
var HorrorGame = class {
	canvas;
	renderer;
	scene;
	camera;
	rig;
	tex;
	mats = {};
	geos = [];
	extras = [];
	interacts = [];
	enemies = [];
	audio = new HorrorAudio();
	keys = /* @__PURE__ */ new Set();
	qaKeys = null;
	px = 0;
	pz = 0;
	py = EYE;
	yaw = 0;
	pitch = 0;
	speed = 0;
	vx = 0;
	vz = 0;
	crouch = 0;
	bob = 0;
	battery = 72;
	flashOn = false;
	items = /* @__PURE__ */ new Set();
	hidden = false;
	hideSpot = null;
	gateClosed = true;
	playing = false;
	ended = false;
	hold = 0;
	prevE = false;
	prevF = false;
	lookDrag = false;
	lastLookX = 0;
	lastLookY = 0;
	moveAxis = {
		x: 0,
		y: 0
	};
	spot;
	fill;
	flickers = [];
	dust;
	dustGeo;
	raf = 0;
	last = 0;
	acc = 0;
	disposed = false;
	trauma = 0;
	hudAcc = 0;
	lastPrompt = "";
	pointerLocked = false;
	onResize;
	onKeyDown;
	onKeyUp;
	onMouseMove;
	onPointerDown;
	onPointerUp;
	onPointerMove;
	onLockChange;
	onVis;
	flashlightGrp;
	gateMesh = null;
	time = 0;
	spottedOnce = false;
	constructor(canvas) {
		this.canvas = canvas;
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: false,
			powerPreference: "high-performance",
			alpha: false
		});
		this.renderer.setPixelRatio(1);
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = 0;
		this.renderer.shadowMap.enabled = false;
		this.renderer.autoClear = true;
		this.scene = new Scene();
		this.scene.background = new Color(FOG);
		this.scene.fog = new FogExp2(FOG, .085);
		this.camera = new PerspectiveCamera(72, 1, .05, 48);
		this.rig = new Object3D();
		this.rig.add(this.camera);
		this.scene.add(this.rig);
		this.tex = createTextures();
		this.buildMaterials();
		this.buildWorld();
		this.buildPlayerLights();
		this.dustGeo = this.buildDust();
		this.dust = new Points(this.dustGeo, new PointsMaterial({
			color: 13417386,
			size: .035,
			transparent: true,
			opacity: .35,
			depthWrite: false
		}));
		this.scene.add(this.dust);
		this.flashlightGrp = this.buildFlashlightModel();
		this.camera.add(this.flashlightGrp);
		const spawn = spawnIn("2");
		this.px = spawn.x;
		this.pz = spawn.z;
		this.yaw = Math.PI;
		this.syncRig();
		this.buildEnemies();
		this.onResize = () => this.resize();
		this.onKeyDown = (e) => this.key(e, true);
		this.onKeyUp = (e) => this.key(e, false);
		this.onMouseMove = (e) => this.mouseLook(e);
		this.onPointerDown = (e) => this.ptrDown(e);
		this.onPointerUp = () => {
			this.lookDrag = false;
		};
		this.onPointerMove = (e) => this.ptrMove(e);
		this.onLockChange = () => {
			const locked = document.pointerLockElement === this.canvas;
			const was = this.pointerLocked;
			this.pointerLocked = locked;
			if (was && !locked && this.playing && !this.ended && !this.hidden && !this.qaKeys) {
				if (useGameStore.getState().screen === "playing") useGameStore.getState().patch({ screen: "paused" });
			}
		};
		this.onVis = () => {
			if (document.visibilityState === "visible") this.audio.resume();
		};
		window.addEventListener("resize", this.onResize);
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		document.addEventListener("mousemove", this.onMouseMove);
		canvas.addEventListener("pointerdown", this.onPointerDown);
		window.addEventListener("pointerup", this.onPointerUp);
		canvas.addEventListener("pointermove", this.onPointerMove);
		document.addEventListener("pointerlockchange", this.onLockChange);
		document.addEventListener("visibilitychange", this.onVis);
		this.resize();
		this.last = performance.now();
		this.raf = requestAnimationFrame(this.tick);
		window.__controlsTest = {
			getYaw: () => this.yaw,
			getSpeed: () => this.speed,
			getPosition: () => ({
				x: this.px,
				y: this.py,
				z: this.pz
			}),
			setKeys: (codes) => {
				this.qaKeys = codes.length ? new Set(codes) : null;
				if (codes.length && !this.playing) {
					this.playing = true;
					useGameStore.getState().patch({ screen: "playing" });
				}
			}
		};
		window.__gameReady = true;
		useGameStore.getState().patch({ ready: true });
	}
	start() {
		this.audio.unlock();
		this.playing = true;
		this.ended = false;
		useGameStore.getState().patch({ screen: "playing" });
		this.requestLock();
	}
	resume() {
		if (this.ended) return;
		useGameStore.getState().patch({ screen: "playing" });
		this.requestLock();
	}
	closeNote() {
		if (this.ended) return;
		useGameStore.getState().patch({
			screen: "playing",
			noteTitle: "",
			noteBody: ""
		});
		this.requestLock();
	}
	toggleMute() {
		const m = !useGameStore.getState().muted;
		this.audio.setMuted(m);
		useGameStore.getState().patch({ muted: m });
	}
	setMoveAxis(x, y) {
		this.moveAxis.x = x;
		this.moveAxis.y = y;
	}
	restart() {
		this.items.clear();
		this.battery = 72;
		this.flashOn = false;
		this.hidden = false;
		this.hideSpot = null;
		this.gateClosed = true;
		this.ended = false;
		this.playing = true;
		this.spottedOnce = false;
		this.trauma = 0;
		this.hold = 0;
		const spawn = spawnIn("2");
		this.px = spawn.x;
		this.pz = spawn.z;
		this.yaw = Math.PI;
		this.pitch = 0;
		this.vx = 0;
		this.vz = 0;
		this.crouch = 0;
		for (const i of this.interacts) {
			i.taken = false;
			i.searched = false;
			if (i.mesh) i.mesh.visible = true;
		}
		if (this.gateMesh) this.gateMesh.position.y = 1.55;
		this.resetEnemies();
		useGameStore.getState().patch({
			screen: "playing",
			battery: 72,
			flashlight: false,
			items: [],
			hidden: false,
			spotted: false,
			chase: false,
			objective: "Encontre três ferramentas e abra o portão principal."
		});
		this.requestLock();
	}
	destroy() {
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		window.removeEventListener("resize", this.onResize);
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		document.removeEventListener("mousemove", this.onMouseMove);
		this.canvas.removeEventListener("pointerdown", this.onPointerDown);
		window.removeEventListener("pointerup", this.onPointerUp);
		this.canvas.removeEventListener("pointermove", this.onPointerMove);
		document.removeEventListener("pointerlockchange", this.onLockChange);
		document.removeEventListener("visibilitychange", this.onVis);
		this.audio.dispose();
		for (const g of this.geos) g.dispose();
		for (const m of Object.values(this.mats)) m.dispose();
		for (const t of Object.values(this.tex)) t.dispose();
		this.dustGeo.dispose();
		this.dust.material.dispose();
		this.renderer.dispose();
		if (window.__controlsTest) delete window.__controlsTest;
		window.__gameReady = false;
	}
	requestLock() {
		const p = this.canvas.requestPointerLock?.({ unadjustedMovement: true });
		if (p && typeof p.catch === "function") p.catch(() => {
			this.canvas.requestPointerLock?.();
		});
	}
	key(e, down) {
		if (e.code === "Tab") e.preventDefault();
		if (down && (e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyS" || e.code === "KeyD" || e.code === "Space")) e.preventDefault();
		if (down) this.keys.add(e.code);
		else this.keys.delete(e.code);
		if (down && e.code === "Escape" && this.playing && !this.ended) {
			useGameStore.getState().patch({ screen: "paused" });
			document.exitPointerLock?.();
		}
		if (down && e.code === "KeyM") this.toggleMute();
	}
	isDown(code) {
		if (this.qaKeys) return this.qaKeys.has(code);
		return this.keys.has(code);
	}
	mouseLook(e) {
		if (!this.playing || this.ended || this.hidden) return;
		if (useGameStore.getState().screen !== "playing") return;
		if (!this.pointerLocked) return;
		this.applyLook(e.movementX, e.movementY);
	}
	applyLook(dx, dy) {
		const sens = .0022;
		this.yaw -= dx * sens;
		this.pitch -= dy * sens;
		if (this.pitch > PITCH_LIM) this.pitch = PITCH_LIM;
		if (this.pitch < -PITCH_LIM) this.pitch = -PITCH_LIM;
	}
	ptrDown(e) {
		if (!this.playing) return;
		if (e.button === 0 || e.pointerType === "touch") {
			this.lookDrag = true;
			this.lastLookX = e.clientX;
			this.lastLookY = e.clientY;
			if (useGameStore.getState().screen === "playing") this.requestLock();
		}
	}
	ptrMove(e) {
		if (!this.lookDrag || this.pointerLocked) return;
		if (!this.playing || this.ended || this.hidden) return;
		if (useGameStore.getState().screen !== "playing") return;
		const dx = e.clientX - this.lastLookX;
		const dy = e.clientY - this.lastLookY;
		this.lastLookX = e.clientX;
		this.lastLookY = e.clientY;
		this.applyLook(dx * 1.4, dy * 1.4);
	}
	tick = (now) => {
		if (this.disposed) return;
		const raw = Math.min((now - this.last) / 1e3, .1);
		this.last = now;
		this.acc += raw;
		if (this.acc > .25) this.acc = .25;
		while (this.acc >= STEP) {
			this.update(STEP);
			this.acc -= STEP;
		}
		this.render();
		this.raf = requestAnimationFrame(this.tick);
	};
	update(dt) {
		this.time += dt;
		this.audio.update(dt);
		const screen = useGameStore.getState().screen;
		const live = this.playing && !this.ended && (screen === "playing" || this.qaKeys !== null);
		if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - dt * 1.8);
		if (live && !this.hidden) this.playerMove(dt);
		else {
			this.speed = 0;
			this.vx *= 1 - Math.min(1, dt * 10);
			this.vz *= 1 - Math.min(1, dt * 10);
		}
		if (live) this.handleUse(dt);
		if (this.flashOn) {
			this.battery = Math.max(0, this.battery - dt * 2.05);
			if (this.battery <= 0) {
				this.flashOn = false;
				this.audio.flashlightClick(false);
			}
		}
		const bf = this.battery / 100;
		const flicker = this.battery < 18 ? .55 + Math.sin(this.time * 28) * .25 + Math.random() * .15 : 1;
		this.spot.intensity = this.flashOn ? 42 * bf * flicker : 0;
		this.fill.intensity = this.flashOn ? .55 * bf : 0;
		this.flashlightGrp.visible = true;
		const lens = this.flashlightGrp.getObjectByName("lens");
		if (lens) lens.material.color.set(this.flashOn ? 16773840 : 2235412);
		this.updateFlickers();
		this.updateDust(dt);
		if (live || this.hidden) this.updateEnemies(dt);
		this.py = MathUtils.lerp(this.py, this.crouch > .5 ? CROUCH_EYE : EYE, 1 - Math.exp(-10 * dt));
		this.syncRig();
		this.pushHud(dt);
	}
	playerMove(dt) {
		const wantCrouch = this.isDown("KeyC") || this.isDown("ControlLeft");
		this.crouch = MathUtils.lerp(this.crouch, wantCrouch ? 1 : 0, 1 - Math.exp(-12 * dt));
		const sprint = (this.isDown("ShiftLeft") || this.isDown("ShiftRight")) && this.crouch < .4;
		const max = this.crouch > .5 ? CROUCH_SPD : sprint ? SPRINT : WALK;
		let ix = 0;
		let iz = 0;
		if (this.isDown("KeyW") || this.isDown("ArrowUp")) iz += 1;
		if (this.isDown("KeyS") || this.isDown("ArrowDown")) iz -= 1;
		if (this.isDown("KeyD") || this.isDown("ArrowRight")) ix += 1;
		if (this.isDown("KeyA") || this.isDown("ArrowLeft")) ix -= 1;
		ix += this.moveAxis.x;
		iz += this.moveAxis.y;
		const mag = Math.hypot(ix, iz);
		if (mag > 1) {
			ix /= mag;
			iz /= mag;
		}
		const fx = -Math.sin(this.yaw);
		const fz = -Math.cos(this.yaw);
		const rx = Math.cos(this.yaw);
		const rz = -Math.sin(this.yaw);
		const ax = fx * iz + rx * ix;
		const az = fz * iz + rz * ix;
		const targetVx = ax * max;
		const targetVz = az * max;
		this.vx += (targetVx - this.vx) * (1 - Math.exp(-14 * dt));
		this.vz += (targetVz - this.vz) * (1 - Math.exp(-14 * dt));
		const steps = mag > .01 ? 2 : 1;
		for (let s = 0; s < steps; s++) {
			this.px += this.vx * dt / steps;
			this.pz += this.vz * dt / steps;
			const r = resolveCircle(this.px, this.pz, PLAYER_R, this.gateClosed, this.extras);
			this.px = r.x;
			this.pz = r.z;
		}
		this.speed = Math.hypot(this.vx, this.vz);
		if (this.speed > .4) {
			this.bob += dt * (sprint ? 11 : 8) * (this.speed / max);
			this.audio.tickFoot(dt, this.speed, sprint, this.crouch > .5, true);
		} else this.audio.tickFoot(dt, 0, false, false, false);
	}
	handleUse(dt) {
		const eDown = this.isDown("KeyE");
		const fDown = this.isDown("KeyF");
		if (fDown && !this.prevF) this.toggleFlash();
		this.prevF = fDown;
		if (this.hidden) {
			if (eDown && !this.prevE) this.exitLocker();
			this.prevE = eDown;
			this.hold = 0;
			return;
		}
		const it = this.nearestInteract();
		if (it?.kind === "locker") {
			if (eDown) {
				this.hold += dt;
				if (this.hold >= .48) {
					this.enterLocker(it);
					this.hold = 0;
				}
			} else this.hold = 0;
		} else {
			if (eDown && !this.prevE && it) this.use(it);
			this.hold = 0;
		}
		this.prevE = eDown;
	}
	toggleFlash() {
		if (this.battery <= .5) {
			this.flashOn = false;
			this.audio.flashlightClick(false);
			return;
		}
		this.flashOn = !this.flashOn;
		this.audio.flashlightClick(this.flashOn);
	}
	nearestInteract() {
		const fx = -Math.sin(this.yaw);
		const fz = -Math.cos(this.yaw);
		let best = null;
		let bestScore = -999;
		for (const i of this.interacts) {
			if (i.taken) continue;
			const dx = i.x - this.px;
			const dz = i.z - this.pz;
			const dist = Math.hypot(dx, dz);
			if (dist > i.r + .15) continue;
			const aligned = dist < .001 ? 1 : (dx * fx + dz * fz) / dist;
			if (aligned < .12 && dist > 1.05) continue;
			const score = aligned * 2.2 - dist;
			if (score > bestScore) {
				best = i;
				bestScore = score;
			}
		}
		return best;
	}
	use(it) {
		if (it.kind === "note") {
			this.audio.paper();
			document.exitPointerLock?.();
			useGameStore.getState().patch({
				screen: "note",
				noteTitle: it.title ?? "Bilhete",
				noteBody: it.body ?? ""
			});
			return;
		}
		if (it.kind === "battery") {
			it.taken = true;
			if (it.mesh) it.mesh.visible = false;
			this.battery = Math.min(100, this.battery + 42);
			this.audio.pickup();
			return;
		}
		if (it.kind === "tool" && it.tool) {
			it.taken = true;
			if (it.mesh) it.mesh.visible = false;
			this.items.add(it.tool);
			this.audio.pickup();
			this.trauma = Math.min(1, this.trauma + .12);
			return;
		}
		if (it.kind === "drawer") {
			if (it.searched) return;
			it.searched = true;
			this.audio.drawer();
			if (it.loot) {
				this.items.add(it.loot);
				it.loot = null;
				this.audio.pickup();
			}
			return;
		}
		if (it.kind === "gate") {
			if (this.items.size >= 3) {
				this.gateClosed = false;
				this.audio.win();
				this.ended = true;
				this.playing = true;
				document.exitPointerLock?.();
				if (this.gateMesh) this.gateMesh.position.y = 3.4;
				useGameStore.getState().patch({
					screen: "won",
					items: [...this.items],
					objective: "Você saiu."
				});
			} else {
				this.audio.gateRattle();
				this.trauma = Math.min(1, this.trauma + .2);
			}
		}
	}
	enterLocker(it) {
		this.hidden = true;
		this.hideSpot = it;
		this.px = it.x;
		this.pz = it.z;
		if (it.faceYaw !== void 0) this.yaw = it.faceYaw;
		this.pitch = .08;
		this.audio.locker(true);
		this.vx = 0;
		this.vz = 0;
	}
	exitLocker() {
		if (!this.hideSpot) {
			this.hidden = false;
			return;
		}
		const fy = this.hideSpot.faceYaw ?? this.yaw;
		this.px += -Math.sin(fy) * .85;
		this.pz += -Math.cos(fy) * .85;
		const r = resolveCircle(this.px, this.pz, PLAYER_R, this.gateClosed, this.extras);
		this.px = r.x;
		this.pz = r.z;
		this.hidden = false;
		this.hideSpot = null;
		this.audio.locker(false);
	}
	updateEnemies(dt) {
		let nearest = 99;
		let anyChase = false;
		let spotted = false;
		for (const en of this.enemies) {
			const dx = this.px - en.x;
			const dz = this.pz - en.z;
			const dist = Math.hypot(dx, dz);
			nearest = Math.min(nearest, dist);
			const fx = -Math.sin(en.yaw);
			const fz = -Math.cos(en.yaw);
			const aligned = dist < .001 ? 1 : (dx * fx + dz * fz) / dist;
			const sprint = this.isDown("ShiftLeft") || this.isDown("ShiftRight");
			let range = this.flashOn ? 13.5 : 8.2;
			if (this.crouch > .5) range *= .72;
			if (sprint) range *= 1.12;
			const fov = this.flashOn ? .25 : .48;
			const sees = !this.hidden && dist < range && aligned > fov && lineOfSight(en.x, en.z, this.px, this.pz, this.gateClosed);
			if (this.hidden && en.state === "chase" && dist < 3.2) en.lose = .4;
			if (sees) {
				en.state = "chase";
				en.lastSeen = {
					x: this.px,
					z: this.pz
				};
				en.lose = 3.6;
				spotted = true;
				anyChase = true;
			} else if (en.state === "chase") {
				en.lose -= dt;
				if (en.lose <= 0) en.state = "search";
				else anyChase = true;
			} else if (en.state === "search") {
				en.lose -= dt;
				if (en.lose <= -2.5) en.state = "patrol";
			}
			if (this.hidden && dist > 3.4 && en.state === "chase" && !sees) en.lose -= dt * 1.8;
			let tx = en.x;
			let tz = en.z;
			if (en.state === "chase") {
				tx = this.hidden ? en.lastSeen.x : this.px;
				tz = this.hidden ? en.lastSeen.z : this.pz;
			} else if (en.state === "search") {
				tx = en.lastSeen.x;
				tz = en.lastSeen.z;
				if (Math.hypot(en.x - tx, en.z - tz) < .5) en.state = "patrol";
			} else {
				const wp = en.waypoints[en.wp];
				tx = wp.x;
				tz = wp.z;
				if (Math.hypot(en.x - tx, en.z - tz) < .55) en.wp = (en.wp + 1) % en.waypoints.length;
			}
			const ddx = tx - en.x;
			const ddz = tz - en.z;
			const dl = Math.hypot(ddx, ddz) || 1;
			const spd = en.state === "chase" ? en.chaseSpeed : en.speed;
			let nx = en.x + ddx / dl * spd * dt;
			let nz = en.z + ddz / dl * spd * dt;
			const resolved = resolveCircle(nx, nz, .34, this.gateClosed, this.extras);
			if (Math.hypot(resolved.x - en.x, resolved.z - en.z) < spd * dt * .2) {
				nx = en.x - ddz / dl * spd * dt;
				nz = en.z + ddx / dl * spd * dt;
				const slide = resolveCircle(nx, nz, .34, this.gateClosed, this.extras);
				en.x = slide.x;
				en.z = slide.z;
			} else {
				en.x = resolved.x;
				en.z = resolved.z;
			}
			en.yaw = Math.atan2(-(ddx / dl), -(ddz / dl));
			en.group.position.set(en.x, 0, en.z);
			en.group.rotation.y = en.yaw;
			const pulse = en.state === "chase" ? .7 + Math.sin(this.time * 9) * .3 : .18;
			for (const eye of en.eyes) eye.material.color.set(en.state === "chase" ? 16722466 : 6952976);
			en.glow.intensity = pulse * (en.state === "chase" ? 1.6 : .35);
			if (!this.hidden && dist < .82 && !this.ended) this.catchPlayer(en);
			if (this.hidden && dist < .7 && en.state === "chase" && en.lose > 2.8 && !this.ended) this.catchPlayer(en);
		}
		if (spotted && !this.spottedOnce) {
			this.spottedOnce = true;
			this.audio.sting();
			this.trauma = Math.min(1, this.trauma + .65);
		}
		if (!anyChase) this.spottedOnce = false;
		const prox = 1 - Math.min(1, nearest / 11);
		this.audio.heartbeat(anyChase ? Math.max(.4, prox) : prox * .5, dt);
		useGameStore.getState().patch({
			spotted,
			chase: anyChase,
			nearEnemy: prox,
			hidden: this.hidden
		});
	}
	catchPlayer(en) {
		this.ended = true;
		this.audio.caught();
		this.trauma = 1;
		document.exitPointerLock?.();
		const dx = en.x - this.px;
		const dz = en.z - this.pz;
		this.yaw = Math.atan2(-dx, -dz);
		this.pitch = .12;
		useGameStore.getState().patch({ screen: "dead" });
	}
	resetEnemies() {
		const routes = this.enemyRoutes();
		this.enemies.forEach((en, i) => {
			const r = routes[i];
			en.x = r.waypoints[0].x;
			en.z = r.waypoints[0].z;
			en.wp = 1 % r.waypoints.length;
			en.state = "patrol";
			en.lose = 0;
			en.waypoints = r.waypoints;
			en.group.position.set(en.x, 0, en.z);
		});
	}
	enemyRoutes() {
		const c7 = 15;
		const hall = tileCenter(24, 12);
		const hall2 = tileCenter(18, 11);
		const hall3 = tileCenter(30, 12);
		return [
			{ waypoints: [{
				x: 4,
				z: c7
			}, {
				x: WORLD_W - 5,
				z: c7
			}] },
			{ waypoints: [
				{
					x: hall2.x,
					z: hall2.z
				},
				{
					x: hall.x,
					z: hall.z
				},
				{
					x: hall3.x,
					z: hall3.z
				},
				{
					x: hall.x,
					z: c7
				}
			] },
			{ waypoints: [
				{
					x: 8,
					z: c7
				},
				{
					x: tileCenter(3, 7).x,
					z: c7
				},
				{
					x: tileCenter(15, 7).x,
					z: c7
				},
				{
					x: tileCenter(15, 12).x,
					z: hall2.z
				}
			] }
		];
	}
	pushHud(dt) {
		this.hudAcc += dt;
		if (this.hudAcc < .08 && this.hold === 0) return;
		this.hudAcc = 0;
		const it = this.hidden ? null : this.nearestInteract();
		let prompt = "";
		if (this.hidden) prompt = "E — Sair do armário";
		else if (it?.kind === "note") prompt = "E — Ler o papel";
		else if (it?.kind === "battery") prompt = "E — Pegar pilhas";
		else if (it?.kind === "tool") prompt = `E — Pegar ${it.title ?? "item"}`;
		else if (it?.kind === "drawer") {
			prompt = it.searched ? it.loot === void 0 && this.items.has("key") ? "Gaveta vasculhada" : "Gaveta vazia" : "E — Vasculhar gaveta";
			if (it.searched && it.loot === null && this.items.has("key")) prompt = "Você pegou a chave.";
		} else if (it?.kind === "locker") prompt = "Segure E — Esconder";
		else if (it?.kind === "gate") {
			const missing = [
				"cutters",
				"key",
				"fuse"
			].filter((t) => !this.items.has(t));
			prompt = missing.length === 0 ? "E — Abrir o portão" : `Falta: ${missing.map((m) => ({
				cutters: "alicate",
				key: "chave",
				fuse: "fusível"
			})[m]).join(", ")}`;
		}
		const objective = this.items.size >= 3 ? "Leve as três ferramentas ao portão principal." : `Ferramentas ${this.items.size}/3 — alicate, chave, fusível.`;
		if (prompt === this.lastPrompt && Math.abs(useGameStore.getState().battery - this.battery) < .4) {
			useGameStore.getState().patch({
				battery: this.battery,
				flashlight: this.flashOn,
				items: [...this.items],
				holdProgress: it?.kind === "locker" ? this.hold / .48 : 0,
				objective
			});
			return;
		}
		this.lastPrompt = prompt;
		useGameStore.getState().patch({
			battery: this.battery,
			flashlight: this.flashOn,
			items: [...this.items],
			prompt,
			holdProgress: it?.kind === "locker" ? Math.min(1, this.hold / .48) : 0,
			objective
		});
	}
	syncRig() {
		const bobY = this.speed > .5 && !this.hidden ? Math.sin(this.bob) * .035 : 0;
		const bobX = this.speed > .5 && !this.hidden ? Math.cos(this.bob * .5) * .012 : 0;
		const shake = this.trauma * this.trauma;
		const sx = (Math.random() - .5) * shake * .12;
		const sy = (Math.random() - .5) * shake * .1;
		this.rig.position.set(this.px + bobX + sx, this.py + bobY + sy, this.pz);
		this.rig.rotation.set(0, this.yaw, shake * (Math.random() - .5) * .04);
		this.camera.rotation.x = this.pitch;
		this.flashlightGrp.position.set(.22, -.2 + bobY * .4, -.38);
		this.flashlightGrp.rotation.set(.12 + this.pitch * .05, .08, .18);
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
	resize() {
		const wrap = this.canvas.parentElement ?? this.canvas;
		const w = Math.max(1, wrap.clientWidth);
		const h = Math.max(1, wrap.clientHeight);
		const scale = w < 700 ? 3.2 : 4.2;
		const iw = Math.max(240, Math.floor(w / scale));
		const ih = Math.max(180, Math.floor(h / scale));
		this.renderer.setSize(iw, ih, false);
		this.canvas.style.width = "100%";
		this.canvas.style.height = "100%";
		this.camera.aspect = iw / ih;
		this.camera.updateProjectionMatrix();
	}
	buildMaterials() {
		const snap = (mat, amount = 120) => {
			mat.onBeforeCompile = (shader) => {
				shader.uniforms.uSnap = { value: amount };
				shader.vertexShader = `uniform float uSnap;\n${shader.vertexShader}`.replace(`#include <project_vertex>`, `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;
          if (uSnap > 0.0) {
            vec4 s = gl_Position;
            s.xy = floor(s.xy / s.w * uSnap) / uSnap * s.w;
            gl_Position = s;
          }
          `);
			};
			mat.customProgramCacheKey = () => `psx-${amount}`;
		};
		this.mats.wall = new MeshLambertMaterial({
			map: this.tex.wall,
			color: 13213858
		});
		this.mats.floor = new MeshLambertMaterial({ map: this.tex.floor });
		this.mats.ceil = new MeshLambertMaterial({ map: this.tex.ceil });
		this.mats.wood = new MeshLambertMaterial({ map: this.tex.wood });
		this.mats.metal = new MeshLambertMaterial({
			map: this.tex.metal,
			color: 10134702
		});
		this.mats.paper = new MeshLambertMaterial({
			map: this.tex.paper,
			emissive: 3351057,
			emissiveIntensity: .35
		});
		this.mats.door = new MeshLambertMaterial({ map: this.tex.door });
		this.mats.gate = new MeshLambertMaterial({
			map: this.tex.gate,
			color: 8949888
		});
		this.mats.black = new MeshLambertMaterial({ color: 789003 });
		this.mats.skin = new MeshLambertMaterial({ color: 2758676 });
		this.mats.cloth = new MeshLambertMaterial({ color: 1314840 });
		this.mats.ceramic = new MeshLambertMaterial({ color: 12103844 });
		for (const m of Object.values(this.mats)) snap(m);
	}
	box(sx, sy, sz) {
		const g = new BoxGeometry(sx, sy, sz);
		this.geos.push(g);
		return g;
	}
	mesh(geo, mat, x, y, z) {
		const m = new Mesh(geo, mat);
		m.position.set(x, y, z);
		this.scene.add(m);
		return m;
	}
	addCollider(x, z, hx, hz) {
		this.extras.push({
			minx: x - hx,
			maxx: x + hx,
			minz: z - hz,
			maxz: z + hz
		});
	}
	buildWorld() {
		const amb = new HemisphereLight(2761776, 525317, .22);
		this.scene.add(amb);
		const dim = new AmbientLight(1708052, .07);
		this.scene.add(dim);
		const floorG = this.box(WORLD_W, .12, WORLD_D);
		this.mesh(floorG, this.mats.floor, WORLD_W / 2, -.06, WORLD_D / 2);
		this.mesh(this.box(WORLD_W, .1, WORLD_D), this.mats.ceil, WORLD_W / 2, 3.38, WORLD_D / 2);
		for (let tz = 0; tz < MAP_H; tz++) {
			let tx = 0;
			while (tx < MAP_W) {
				if (MAP[tz][tx] !== "#") {
					tx++;
					continue;
				}
				const start = tx;
				while (tx < MAP_W && MAP[tz][tx] === "#") tx++;
				const w = (tx - start) * 2;
				const cx = start * 2 + w / 2;
				const cz = tz * 2 + 1;
				this.mesh(this.box(w, 3.4, 2), this.mats.wall, cx, 1.7, cz);
			}
		}
		this.buildDoorsAndLabels();
		this.buildRooms();
		this.buildCorridorLockers();
		this.buildHall();
		this.buildPickups();
		this.buildFlickerLights();
	}
	buildDoorsAndLabels() {
		const frame = this.box(.18, 2.2, .18);
		for (const d of collectDoors()) {
			const side = d.facing === "n" || d.facing === "s";
			const ox = side ? .95 : 0;
			const oz = side ? 0 : .95;
			this.mesh(frame, this.mats.wood, d.x - ox, 1.1, d.z - oz);
			this.mesh(frame, this.mats.wood, d.x + ox, 1.1, d.z + oz);
			this.mesh(this.box(side ? 2.1 : .18, .16, side ? .18 : 2.1), this.mats.wood, d.x, 2.22, d.z);
			const labelTex = makeLabelTexture(d.label);
			const lg = new PlaneGeometry(1.35, .34);
			this.geos.push(lg);
			const lm = new MeshLambertMaterial({ map: labelTex });
			this.mats[`label-${d.label}`] = lm;
			const sign = new Mesh(lg, lm);
			const off = .55;
			if (d.facing === "s") sign.position.set(d.x + 1.25, 2.05, d.z - 1.02);
			if (d.facing === "n") {
				sign.position.set(d.x + 1.25, 2.05, d.z + 1.02);
				sign.rotation.y = Math.PI;
			}
			if (d.facing === "e") {
				sign.position.set(d.x - off, 2.05, d.z);
				sign.rotation.y = Math.PI / 2;
			}
			if (d.facing === "w") {
				sign.position.set(d.x + off, 2.05, d.z);
				sign.rotation.y = -Math.PI / 2;
			}
			this.scene.add(sign);
		}
		const gates = findTiles("G");
		if (gates.length) {
			const xs = gates.map((g) => g.tx);
			const minx = Math.min(...xs) * 2;
			const maxx = (Math.max(...xs) + 1) * 2;
			const z = gates[0].tz * 2 + 1;
			const w = maxx - minx;
			this.gateMesh = this.mesh(this.box(w, 3.05, .16), this.mats.gate, (minx + maxx) / 2, 1.55, z);
			this.interacts.push({
				id: "gate",
				kind: "gate",
				x: (minx + maxx) / 2,
				y: 1,
				z: z - 1.1,
				r: 2.1
			});
		}
	}
	buildRooms() {
		this.fillDesks("1");
		this.fillDesks("2");
		this.fillDesks("3");
		this.fillDesks("4");
		this.fillTeachers();
		this.fillDiretoria();
		this.fillBathroom();
		this.fillStorage();
	}
	fillDesks(ch) {
		const b = roomBounds(ch);
		if (!b) return;
		let n = 0;
		for (let z = b.minz + 1.15; z < b.maxz - 2.1; z += 1.85) for (let x = b.minx + 1.15; x < b.maxx - .9; x += 1.7) {
			this.addDesk(x, z);
			n++;
			if (n >= 8) return;
		}
	}
	addDesk(x, z) {
		this.mesh(this.box(1.15, .06, .7), this.mats.wood, x, .78, z);
		this.mesh(this.box(.08, .76, .08), this.mats.wood, x - .48, .38, z - .28);
		this.mesh(this.box(.08, .76, .08), this.mats.wood, x + .48, .38, z - .28);
		this.mesh(this.box(.08, .76, .08), this.mats.wood, x - .48, .38, z + .28);
		this.mesh(this.box(.08, .76, .08), this.mats.wood, x + .48, .38, z + .28);
		this.mesh(this.box(.4, .42, .4), this.mats.wood, x, .34, z + .55);
		this.addCollider(x, z, .55, .38);
	}
	addDrawer(x, z, loot, id) {
		const body = this.mesh(this.box(.9, .85, .55), this.mats.wood, x, .42, z);
		this.mesh(this.box(.7, .08, .08), this.mats.metal, x, .5, z + .28);
		this.addCollider(x, z, .5, .32);
		this.interacts.push({
			id,
			kind: "drawer",
			x,
			y: .5,
			z: z + .4,
			r: 1.5,
			loot,
			searched: false,
			mesh: body
		});
	}
	fillTeachers() {
		const b = roomBounds("P");
		if (!b) return;
		const cx = (b.minx + b.maxx) / 2;
		this.addDesk(cx - 1.6, b.minz + 1.6);
		this.addDesk(cx + 1.6, b.minz + 1.6);
		this.addDrawer(cx - 1.5, b.maxz - 2.4, null, "drawer-p1");
		this.addDrawer(cx, b.maxz - 2.4, "key", "drawer-key");
		this.addDrawer(cx + 1.5, b.maxz - 2.4, null, "drawer-p3");
	}
	fillDiretoria() {
		const b = roomBounds("D");
		if (!b) return;
		const cx = (b.minx + b.maxx) / 2;
		const cz = (b.minz + b.maxz) / 2 - .4;
		this.mesh(this.box(2.2, .08, 1.1), this.mats.wood, cx, .82, cz);
		this.mesh(this.box(2.2, .7, 1.1), this.mats.wood, cx, .4, cz);
		this.addCollider(cx, cz, 1.15, .6);
		this.mesh(this.box(.55, .9, .55), this.mats.wood, cx, .45, cz - 1.05);
		const fuse = this.buildFuse(cx + .55, .95, cz + .1);
		this.interacts.push({
			id: "fuse",
			kind: "tool",
			tool: "fuse",
			title: "Fusível da energia",
			x: cx + .55,
			y: .95,
			z: cz + .1,
			r: 1.5,
			mesh: fuse
		});
		this.addDrawer(b.minx + 1.2, b.minz + 1.3, null, "drawer-d1");
	}
	fillBathroom() {
		const b = roomBounds("B");
		if (!b) return;
		for (let i = 0; i < 3; i++) {
			const z = b.minz + 1.2 + i * 1.7;
			this.mesh(this.box(.06, 2.1, 1.5), this.mats.ceramic, b.maxx - 1.9, 1.05, z);
			this.mesh(this.box(.45, .45, .5), this.mats.ceramic, b.maxx - 1.15, .35, z);
			this.addCollider(b.maxx - 1.9, z, .12, .7);
		}
		const cut = this.buildCutters(b.minx + 1.1, .55, b.maxz - 1.3);
		this.interacts.push({
			id: "cutters",
			kind: "tool",
			tool: "cutters",
			title: "Alicate de corte",
			x: b.minx + 1.1,
			y: .55,
			z: b.maxz - 1.3,
			r: 1.5,
			mesh: cut
		});
	}
	fillStorage() {
		const b = roomBounds("A");
		if (!b) return;
		for (let i = 0; i < 3; i++) {
			const z = b.minz + 1 + i * 1.4;
			this.mesh(this.box(1.4, 1.8, .4), this.mats.metal, (b.minx + b.maxx) / 2, .9, z);
			this.addCollider((b.minx + b.maxx) / 2, z, .7, .25);
		}
	}
	buildCorridorLockers() {
		const places = [
			{
				tx: 4,
				tz: 6,
				face: Math.PI
			},
			{
				tx: 11,
				tz: 6,
				face: Math.PI
			},
			{
				tx: 19,
				tz: 6,
				face: Math.PI
			},
			{
				tx: 27,
				tz: 6,
				face: Math.PI
			},
			{
				tx: 8,
				tz: 8,
				face: 0
			},
			{
				tx: 16,
				tz: 8,
				face: 0
			},
			{
				tx: 25,
				tz: 8,
				face: 0
			}
		];
		for (const p of places) {
			const c = tileCenter(p.tx, p.tz);
			const inward = p.face === 0 ? .55 : -.55;
			const z = c.z + inward;
			this.addLocker(c.x, z, p.face);
		}
	}
	addLocker(x, z, faceYaw) {
		const g = new Group();
		const body = new Mesh(this.box(.72, 2.05, .5), this.mats.metal);
		body.position.y = 1.02;
		g.add(body);
		for (let i = 0; i < 7; i++) {
			const slat = new Mesh(this.box(.55, .04, .02), this.mats.black);
			slat.position.set(0, 1.35 + i * .08, .26);
			g.add(slat);
		}
		const handle = new Mesh(this.box(.05, .14, .06), this.mats.wood);
		handle.position.set(.22, 1.05, .28);
		g.add(handle);
		g.position.set(x, 0, z);
		g.rotation.y = faceYaw;
		this.scene.add(g);
		this.addCollider(x, z, .4, .32);
		this.interacts.push({
			id: `locker-${x.toFixed(1)}-${z.toFixed(1)}`,
			kind: "locker",
			x,
			y: 1,
			z,
			r: 1.35,
			faceYaw,
			mesh: g
		});
	}
	buildHall() {
		const b = roomBounds("H");
		if (!b) return;
		this.mesh(this.box(2.4, 1.2, .06), this.mats.wood, b.minx + 6, 1.6, b.maxz - .4);
		this.mesh(this.box(1.8, .45, .5), this.mats.wood, b.minx + 10, .28, (b.minz + b.maxz) / 2);
		this.addCollider(b.minx + 10, (b.minz + b.maxz) / 2, .95, .3);
	}
	buildPickups() {
		[
			{
				ch: "2",
				title: "Boletim rasgado",
				body: "A cidade anunciou seu desaparecimento antes do anoitecer. Ninguém veio procurar dentro da escola. Você não sumiu. Você só acordou tarde demais, trancado na Rosa Bonfiglioli.",
				ox: .8,
				oz: .6
			},
			{
				ch: "H",
				title: "Lista de chamada",
				body: "Vários nomes riscados com a mesma letra. No rodapé, a caneta treme: NÃO ACENDA A LANTERNA PERTO DELES. Se esconder no armário funciona — se eles não te viram entrar."
			},
			{
				ch: "P",
				title: "Recado no quadro",
				body: "A chave da diretoria não está com ela. Está na gaveta do meio da Sala dos Professores, debaixo das provas rasgadas. Terceira gaveta. Não a primeira."
			},
			{
				ch: "1",
				title: "Caderno molhado",
				body: "Eles não são professores. São o que sobrou quando a escola decidiu não deixar ninguém ir embora. A diretora ainda anda no corredor como se a aula não tivesse acabado."
			},
			{
				ch: "D",
				title: "Ordem de corte de energia",
				body: "O fusível da portaria foi removido e levado para a DIRETORIA. Sem ele a grade não abre. Alguém não queria que a saída existisse depois do terceiro sinal."
			},
			{
				ch: "B",
				title: "Papel no azulejo",
				body: "Os fios da grade foram emendados com arame grosso. Precisa de um ALICATE. Tem um no banheiro dos fundos, no último cubículo, atrás da última privada."
			},
			{
				ch: "3",
				title: "Bilhete de aluno",
				body: "Se a lanterna morrer, procure pilhas nos corredores. As lâmpadas do hall ainda piscam. Isso não é manutenção. É o prédio respirando."
			}
		].forEach((n, idx) => {
			const b = roomBounds(n.ch);
			if (!b) return;
			const x = (b.minx + b.maxx) / 2 + (n.ox ?? idx % 3 * .4 - .4);
			const z = (b.minz + b.maxz) / 2 + (n.oz ?? .5);
			const mesh = this.mesh(this.box(.32, .01, .22), this.mats.paper, x, .04, z);
			mesh.rotation.y = idx * .4;
			const glow = new PointLight(15258272, .28, 2.4, 2);
			glow.position.set(x, .2, z);
			this.scene.add(glow);
			this.interacts.push({
				id: `note-${idx}`,
				kind: "note",
				x,
				y: .05,
				z,
				r: 1.45,
				title: n.title,
				body: n.body,
				mesh
			});
		});
		[
			tileCenter(6, 7),
			tileCenter(18, 7),
			tileCenter(29, 7),
			tileCenter(22, 12),
			tileCenter(2, 3),
			tileCenter(3, 12)
		].forEach((p, i) => {
			const g = new Group();
			const a = new Mesh(new CylinderGeometry(.05, .05, .18, 6), this.mats.metal);
			const b = new Mesh(new CylinderGeometry(.05, .05, .18, 6), this.mats.metal);
			a.position.x = -.06;
			b.position.x = .06;
			g.add(a, b);
			g.position.set(p.x, .12, p.z);
			this.scene.add(g);
			this.geos.push(a.geometry, b.geometry);
			this.interacts.push({
				id: `bat-${i}`,
				kind: "battery",
				x: p.x,
				y: .12,
				z: p.z,
				r: 1.3,
				mesh: g
			});
		});
	}
	buildFuse(x, y, z) {
		const g = new Group();
		const body = new Mesh(new CylinderGeometry(.05, .05, .28, 8), this.mats.ceramic);
		const cap = new Mesh(new CylinderGeometry(.055, .055, .06, 8), this.mats.metal);
		cap.position.y = .16;
		const cap2 = cap.clone();
		cap2.position.y = -.16;
		g.add(body, cap, cap2);
		g.position.set(x, y, z);
		g.rotation.z = Math.PI / 2;
		this.scene.add(g);
		this.geos.push(body.geometry, cap.geometry);
		return g;
	}
	buildCutters(x, y, z) {
		const g = new Group();
		const blade = new Mesh(this.box(.28, .03, .05), this.mats.metal);
		const h1 = new Mesh(this.box(.18, .035, .04), new MeshLambertMaterial({ color: 9052192 }));
		const h2 = h1.clone();
		h1.position.set(-.18, .03, 0);
		h1.rotation.z = .4;
		h2.position.set(-.18, -.03, 0);
		h2.rotation.z = -.4;
		g.add(blade, h1, h2);
		g.position.set(x, y, z);
		g.rotation.y = .6;
		this.scene.add(g);
		return g;
	}
	buildFlickerLights() {
		const spots = [
			tileCenter(10, 7),
			tileCenter(22, 7),
			tileCenter(24, 12),
			tileCenter(20, 2),
			tileCenter(4, 3)
		];
		const bulbGeo = this.box(.7, .08, .25);
		spots.forEach((p, i) => {
			const light = new PointLight(15260864, 1.1, 9, 2);
			light.position.set(p.x, 3.05, p.z);
			this.scene.add(light);
			const mesh = this.mesh(bulbGeo, new MeshBasicMaterial({ color: 14207136 }), p.x, 3.22, p.z);
			this.flickers.push({
				light,
				mesh,
				base: i === 3 ? .45 : .9,
				phase: i * 1.7
			});
		});
	}
	updateFlickers() {
		for (const f of this.flickers) {
			const n = Math.sin(this.time * 17 + f.phase) * .15 + Math.sin(this.time * 3.1 + f.phase) * .1;
			const burst = Math.random() > .97 ? -.7 : 0;
			const v = Math.max(.05, f.base + n + burst);
			f.light.intensity = v * 1.4;
			f.mesh.material.color.setRGB(.85 * v, .78 * v, .62 * v);
		}
	}
	buildDust() {
		const n = 280;
		const pos = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) {
			pos[i * 3] = Math.random() * WORLD_W;
			pos[i * 3 + 1] = .3 + Math.random() * 2.6;
			pos[i * 3 + 2] = Math.random() * WORLD_D;
		}
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(pos, 3));
		this.geos.push(g);
		return g;
	}
	updateDust(dt) {
		const attr = this.dustGeo.getAttribute("position");
		for (let i = 0; i < attr.count; i++) {
			let y = attr.getY(i) + dt * .12;
			if (y > 3.1) y = .2;
			attr.setY(i, y);
			attr.setX(i, attr.getX(i) + Math.sin(this.time * .3 + i) * dt * .05);
		}
		attr.needsUpdate = true;
	}
	buildPlayerLights() {
		this.spot = new SpotLight(16770756, 0, 17, Math.PI / 6.2, .48, 1.35);
		this.spot.position.set(.1, -.05, .15);
		const tgt = new Object3D();
		tgt.position.set(0, -.2, -9);
		this.camera.add(this.spot);
		this.camera.add(tgt);
		this.spot.target = tgt;
		this.fill = new PointLight(16767144, 0, 3.2, 2);
		this.fill.position.set(0, -.1, -.4);
		this.camera.add(this.fill);
	}
	buildFlashlightModel() {
		const g = new Group();
		const body = new Mesh(new CylinderGeometry(.035, .04, .28, 8), this.mats.metal);
		body.rotation.x = Math.PI / 2;
		const head = new Mesh(new CylinderGeometry(.06, .045, .08, 8), this.mats.black);
		head.rotation.x = Math.PI / 2;
		head.position.z = -.16;
		const lens = new Mesh(new CircleGeometry(.045, 10), new MeshBasicMaterial({ color: 2235412 }));
		lens.name = "lens";
		lens.position.z = -.205;
		g.add(body, head, lens);
		this.geos.push(body.geometry, head.geometry, lens.geometry);
		return g;
	}
	buildEnemies() {
		const routes = this.enemyRoutes();
		const kinds = [
			"t",
			"t",
			"d"
		];
		routes.forEach((r, i) => {
			const en = this.makeEnemy(kinds[i], r.waypoints);
			this.enemies.push(en);
			this.scene.add(en.group);
		});
	}
	makeEnemy(kind, waypoints) {
		const g = new Group();
		const h = kind === "d" ? 2.35 : 2.05;
		const torso = new Mesh(this.box(.55, h * .55, .32), this.mats.cloth);
		torso.position.y = h * .55;
		const hip = new Mesh(this.box(.5, h * .28, .28), this.mats.cloth);
		hip.position.y = h * .22;
		const head = new Mesh(new BoxGeometry(.32, .38, .3), this.mats.skin);
		head.position.y = h * .88;
		this.geos.push(head.geometry);
		const armL = new Mesh(this.box(.12, h * .5, .12), this.mats.cloth);
		const armR = armL.clone();
		armL.position.set(-.38, h * .5, .02);
		armR.position.set(.38, h * .5, .02);
		armL.rotation.z = .12;
		armR.rotation.z = -.12;
		const jaw = new Mesh(this.box(.22, .08, .18), this.mats.black);
		jaw.position.set(0, h * .78, .1);
		const eyeGeo = new SphereGeometry(.045, 6, 6);
		this.geos.push(eyeGeo);
		const eMat1 = new MeshBasicMaterial({ color: 6952976 });
		const eMat2 = eMat1.clone();
		const eyeL = new Mesh(eyeGeo, eMat1);
		const eyeR = new Mesh(eyeGeo, eMat2);
		eyeL.position.set(-.08, h * .9, .16);
		eyeR.position.set(.08, h * .9, .16);
		g.add(torso, hip, head, armL, armR, jaw, eyeL, eyeR);
		if (kind === "d") {
			const tie = new Mesh(this.box(.08, .35, .02), new MeshLambertMaterial({ color: 5902352 }));
			tie.position.set(0, h * .62, .17);
			g.add(tie);
		}
		const glow = new PointLight(16720401, .3, 3.5, 2);
		glow.position.set(0, h * .9, .2);
		g.add(glow);
		const start = waypoints[0];
		g.position.set(start.x, 0, start.z);
		return {
			id: kind + start.x,
			group: g,
			eyes: [eyeL, eyeR],
			glow,
			x: start.x,
			z: start.z,
			yaw: 0,
			waypoints,
			wp: 1 % waypoints.length,
			state: "patrol",
			speed: kind === "d" ? 1.35 : 1.55,
			chaseSpeed: kind === "d" ? 3.35 : 3.7,
			lose: 0,
			lastSeen: {
				x: start.x,
				z: start.z
			},
			height: h
		};
	}
};
//#endregion
export { HorrorGame };
