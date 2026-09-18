import * as THREE from "three";
import { HorrorAudio } from "./audio";
import {
  AABB,
  MAP,
  MAP_H,
  MAP_W,
  TILE,
  WORLD_D,
  WORLD_W,
  collectDoors,
  findTiles,
  lineOfSight,
  resolveCircle,
  roomBounds,
  spawnIn,
  tileCenter,
} from "./map";
import { useGameStore, type ToolId } from "./store";
import { createTextures, makeLabelTexture, type TexPack } from "./textures";

const STEP = 1 / 60;
const PLAYER_R = 0.32;
const EYE = 1.62;
const CROUCH_EYE = 0.92;
const WALK = 3.05;
const SPRINT = 4.85;
const CROUCH_SPD = 1.45;
const PITCH_LIM = Math.PI / 2 - 0.04;
const FOG = 0x070506;

type Kind = "note" | "battery" | "tool" | "drawer" | "locker" | "gate";

type Interact = {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  z: number;
  r: number;
  taken?: boolean;
  title?: string;
  body?: string;
  tool?: ToolId;
  loot?: ToolId | null;
  searched?: boolean;
  faceYaw?: number;
  mesh?: THREE.Object3D;
};

type Enemy = {
  id: string;
  group: THREE.Group;
  eyes: THREE.Mesh[];
  glow: THREE.PointLight;
  x: number;
  z: number;
  yaw: number;
  waypoints: { x: number; z: number }[];
  wp: number;
  state: "patrol" | "chase" | "search";
  speed: number;
  chaseSpeed: number;
  lose: number;
  lastSeen: { x: number; z: number };
  height: number;
};

type Probe = {
  getYaw: () => number;
  getSpeed: () => number;
  getPosition: () => { x: number; y: number; z: number };
  setKeys: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: Probe;
    __gameReady?: boolean;
  }
}

export class HorrorGame {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rig: THREE.Object3D;
  private tex: TexPack;
  private mats: Record<string, THREE.MeshLambertMaterial> = {};
  private geos: THREE.BufferGeometry[] = [];
  private extras: AABB[] = [];
  private interacts: Interact[] = [];
  private enemies: Enemy[] = [];
  private audio = new HorrorAudio();
  private keys = new Set<string>();
  private qaKeys: Set<string> | null = null;
  private px = 0;
  private pz = 0;
  private py = EYE;
  private yaw = 0;
  private pitch = 0;
  private speed = 0;
  private vx = 0;
  private vz = 0;
  private crouch = 0;
  private bob = 0;
  private battery = 72;
  private flashOn = false;
  private items = new Set<ToolId>();
  private hidden = false;
  private hideSpot: Interact | null = null;
  private gateClosed = true;
  private playing = false;
  private ended = false;
  private hold = 0;
  private prevE = false;
  private prevF = false;
  private lookDrag = false;
  private lastLookX = 0;
  private lastLookY = 0;
  private moveAxis = { x: 0, y: 0 };
  private spot!: THREE.SpotLight;
  private fill!: THREE.PointLight;
  private flickers: { light: THREE.PointLight; mesh: THREE.Mesh; base: number; phase: number }[] = [];
  private dust: THREE.Points;
  private dustGeo: THREE.BufferGeometry;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private disposed = false;
  private trauma = 0;
  private hudAcc = 0;
  private lastPrompt = "";
  private pointerLocked = false;
  private onResize: () => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onLockChange: () => void;
  private onVis: () => void;
  private flashlightGrp: THREE.Group;
  private gateMesh: THREE.Mesh | null = null;
  private time = 0;
  private spottedOnce = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = false;
    this.renderer.autoClear = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(FOG);
    this.scene.fog = new THREE.FogExp2(FOG, 0.085);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 48);
    this.rig = new THREE.Object3D();
    this.rig.add(this.camera);
    this.scene.add(this.rig);

    this.tex = createTextures();
    this.buildMaterials();
    this.buildWorld();
    this.buildPlayerLights();
    this.dustGeo = this.buildDust();
    this.dust = new THREE.Points(
      this.dustGeo,
      new THREE.PointsMaterial({
        color: 0xccbbaa,
        size: 0.035,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
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
        const s = useGameStore.getState().screen;
        if (s === "playing") useGameStore.getState().patch({ screen: "paused" });
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
      getPosition: () => ({ x: this.px, y: this.py, z: this.pz }),
      setKeys: (codes: string[]) => {
        this.qaKeys = codes.length ? new Set(codes) : null;
        if (codes.length && !this.playing) {
          this.playing = true;
          useGameStore.getState().patch({ screen: "playing" });
        }
      },
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
    useGameStore.getState().patch({ screen: "playing", noteTitle: "", noteBody: "" });
    this.requestLock();
  }

  toggleMute() {
    const m = !useGameStore.getState().muted;
    this.audio.setMuted(m);
    useGameStore.getState().patch({ muted: m });
  }

  setMoveAxis(x: number, y: number) {
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
      objective: "Encontre três ferramentas e abra o portão principal.",
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
    (this.dust.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (window.__controlsTest) delete window.__controlsTest;
    window.__gameReady = false;
  }

  private requestLock() {
    const p = this.canvas.requestPointerLock?.({ unadjustedMovement: true } as PointerLockOptions);
    if (p && typeof (p as Promise<void>).catch === "function") {
      (p as Promise<void>).catch(() => {
        this.canvas.requestPointerLock?.();
      });
    }
  }

  private key(e: KeyboardEvent, down: boolean) {
    if (e.code === "Tab") e.preventDefault();
    if (down && (e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyS" || e.code === "KeyD" || e.code === "Space")) {
      e.preventDefault();
    }
    if (down) this.keys.add(e.code);
    else this.keys.delete(e.code);
    if (down && e.code === "Escape" && this.playing && !this.ended) {
      useGameStore.getState().patch({ screen: "paused" });
      document.exitPointerLock?.();
    }
    if (down && (e.code === "KeyM")) this.toggleMute();
  }

  private isDown(code: string) {
    if (this.qaKeys) return this.qaKeys.has(code);
    return this.keys.has(code);
  }

  private mouseLook(e: MouseEvent) {
    if (!this.playing || this.ended || this.hidden) return;
    const screen = useGameStore.getState().screen;
    if (screen !== "playing") return;
    if (!this.pointerLocked) return;
    this.applyLook(e.movementX, e.movementY);
  }

  private applyLook(dx: number, dy: number) {
    const sens = 0.0022;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    if (this.pitch > PITCH_LIM) this.pitch = PITCH_LIM;
    if (this.pitch < -PITCH_LIM) this.pitch = -PITCH_LIM;
  }

  private ptrDown(e: PointerEvent) {
    if (!this.playing) return;
    if (e.button === 0 || e.pointerType === "touch") {
      this.lookDrag = true;
      this.lastLookX = e.clientX;
      this.lastLookY = e.clientY;
      if (useGameStore.getState().screen === "playing") this.requestLock();
    }
  }

  private ptrMove(e: PointerEvent) {
    if (!this.lookDrag || this.pointerLocked) return;
    if (!this.playing || this.ended || this.hidden) return;
    if (useGameStore.getState().screen !== "playing") return;
    const dx = e.clientX - this.lastLookX;
    const dy = e.clientY - this.lastLookY;
    this.lastLookX = e.clientX;
    this.lastLookY = e.clientY;
    this.applyLook(dx * 1.4, dy * 1.4);
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    const raw = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.acc += raw;
    if (this.acc > 0.25) this.acc = 0.25;
    while (this.acc >= STEP) {
      this.update(STEP);
      this.acc -= STEP;
    }
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
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
    const flicker =
      this.battery < 18 ? 0.55 + Math.sin(this.time * 28) * 0.25 + Math.random() * 0.15 : 1;
    this.spot.intensity = this.flashOn ? 42 * bf * flicker : 0;
    this.fill.intensity = this.flashOn ? 0.55 * bf : 0;
    this.flashlightGrp.visible = true;
    const lens = this.flashlightGrp.getObjectByName("lens") as THREE.Mesh | undefined;
    if (lens) {
      const m = lens.material as THREE.MeshBasicMaterial;
      m.color.set(this.flashOn ? 0xfff2d0 : 0x221c14);
    }

    this.updateFlickers();
    this.updateDust(dt);
    if (live || this.hidden) this.updateEnemies(dt);

    this.py = THREE.MathUtils.lerp(this.py, this.crouch > 0.5 ? CROUCH_EYE : EYE, 1 - Math.exp(-10 * dt));
    this.syncRig();
    this.pushHud(dt);
  }

  private playerMove(dt: number) {
    const wantCrouch = this.isDown("KeyC") || this.isDown("ControlLeft");
    this.crouch = THREE.MathUtils.lerp(this.crouch, wantCrouch ? 1 : 0, 1 - Math.exp(-12 * dt));
    const sprint = (this.isDown("ShiftLeft") || this.isDown("ShiftRight")) && this.crouch < 0.4;
    const max = this.crouch > 0.5 ? CROUCH_SPD : sprint ? SPRINT : WALK;

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
    const accel = 14;
    const targetVx = ax * max;
    const targetVz = az * max;
    this.vx += (targetVx - this.vx) * (1 - Math.exp(-accel * dt));
    this.vz += (targetVz - this.vz) * (1 - Math.exp(-accel * dt));

    const steps = mag > 0.01 ? 2 : 1;
    for (let s = 0; s < steps; s++) {
      this.px += (this.vx * dt) / steps;
      this.pz += (this.vz * dt) / steps;
      const r = resolveCircle(this.px, this.pz, PLAYER_R, this.gateClosed, this.extras);
      this.px = r.x;
      this.pz = r.z;
    }

    this.speed = Math.hypot(this.vx, this.vz);
    if (this.speed > 0.4) {
      this.bob += dt * (sprint ? 11 : 8) * (this.speed / max);
      this.audio.tickFoot(dt, this.speed, sprint, this.crouch > 0.5, true);
    } else {
      this.audio.tickFoot(dt, 0, false, false, false);
    }
  }

  private handleUse(dt: number) {
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
        if (this.hold >= 0.48) {
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

  private toggleFlash() {
    if (this.battery <= 0.5) {
      this.flashOn = false;
      this.audio.flashlightClick(false);
      return;
    }
    this.flashOn = !this.flashOn;
    this.audio.flashlightClick(this.flashOn);
  }

  private nearestInteract(): Interact | null {
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    let best: Interact | null = null;
    let bestScore = -999;
    for (const i of this.interacts) {
      if (i.taken) continue;
      const dx = i.x - this.px;
      const dz = i.z - this.pz;
      const dist = Math.hypot(dx, dz);
      if (dist > i.r + 0.15) continue;
      const aligned = dist < 0.001 ? 1 : (dx * fx + dz * fz) / dist;
      if (aligned < 0.12 && dist > 1.05) continue;
      const score = aligned * 2.2 - dist;
      if (score > bestScore) {
        best = i;
        bestScore = score;
      }
    }
    return best;
  }

  private use(it: Interact) {
    if (it.kind === "note") {
      this.audio.paper();
      document.exitPointerLock?.();
      useGameStore.getState().patch({
        screen: "note",
        noteTitle: it.title ?? "Bilhete",
        noteBody: it.body ?? "",
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
      this.trauma = Math.min(1, this.trauma + 0.12);
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
          objective: "Você saiu.",
        });
      } else {
        this.audio.gateRattle();
        this.trauma = Math.min(1, this.trauma + 0.2);
      }
    }
  }

  private enterLocker(it: Interact) {
    this.hidden = true;
    this.hideSpot = it;
    this.px = it.x;
    this.pz = it.z;
    if (it.faceYaw !== undefined) this.yaw = it.faceYaw;
    this.pitch = 0.08;
    this.audio.locker(true);
    this.vx = 0;
    this.vz = 0;
  }

  private exitLocker() {
    if (!this.hideSpot) {
      this.hidden = false;
      return;
    }
    const fy = this.hideSpot.faceYaw ?? this.yaw;
    this.px += -Math.sin(fy) * 0.85;
    this.pz += -Math.cos(fy) * 0.85;
    const r = resolveCircle(this.px, this.pz, PLAYER_R, this.gateClosed, this.extras);
    this.px = r.x;
    this.pz = r.z;
    this.hidden = false;
    this.hideSpot = null;
    this.audio.locker(false);
  }

  private updateEnemies(dt: number) {
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
      const aligned = dist < 0.001 ? 1 : (dx * fx + dz * fz) / dist;
      const sprint = this.isDown("ShiftLeft") || this.isDown("ShiftRight");
      let range = this.flashOn ? 13.5 : 8.2;
      if (this.crouch > 0.5) range *= 0.72;
      if (sprint) range *= 1.12;
      const fov = this.flashOn ? 0.25 : 0.48;
      const sees =
        !this.hidden &&
        dist < range &&
        aligned > fov &&
        lineOfSight(en.x, en.z, this.px, this.pz, this.gateClosed);

      if (this.hidden && en.state === "chase" && dist < 3.2) {
        en.lose = 0.4;
      }

      if (sees) {
        en.state = "chase";
        en.lastSeen = { x: this.px, z: this.pz };
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

      if (this.hidden && dist > 3.4 && en.state === "chase" && !sees) {
        en.lose -= dt * 1.8;
      }

      let tx = en.x;
      let tz = en.z;
      if (en.state === "chase") {
        tx = this.hidden ? en.lastSeen.x : this.px;
        tz = this.hidden ? en.lastSeen.z : this.pz;
      } else if (en.state === "search") {
        tx = en.lastSeen.x;
        tz = en.lastSeen.z;
        if (Math.hypot(en.x - tx, en.z - tz) < 0.5) en.state = "patrol";
      } else {
        const wp = en.waypoints[en.wp];
        tx = wp.x;
        tz = wp.z;
        if (Math.hypot(en.x - tx, en.z - tz) < 0.55) en.wp = (en.wp + 1) % en.waypoints.length;
      }

      const ddx = tx - en.x;
      const ddz = tz - en.z;
      const dl = Math.hypot(ddx, ddz) || 1;
      const spd = en.state === "chase" ? en.chaseSpeed : en.speed;
      let nx = en.x + (ddx / dl) * spd * dt;
      let nz = en.z + (ddz / dl) * spd * dt;
      const resolved = resolveCircle(nx, nz, 0.34, this.gateClosed, this.extras);
      if (Math.hypot(resolved.x - en.x, resolved.z - en.z) < spd * dt * 0.2) {
        nx = en.x - (ddz / dl) * spd * dt;
        nz = en.z + (ddx / dl) * spd * dt;
        const slide = resolveCircle(nx, nz, 0.34, this.gateClosed, this.extras);
        en.x = slide.x;
        en.z = slide.z;
      } else {
        en.x = resolved.x;
        en.z = resolved.z;
      }
      en.yaw = Math.atan2(-(ddx / dl), -(ddz / dl));
      en.group.position.set(en.x, 0, en.z);
      en.group.rotation.y = en.yaw;
      const pulse = en.state === "chase" ? 0.7 + Math.sin(this.time * 9) * 0.3 : 0.18;
      for (const eye of en.eyes) {
        const mat = eye.material as THREE.MeshBasicMaterial;
        mat.color.set(en.state === "chase" ? 0xff2a22 : 0x6a1810);
      }
      en.glow.intensity = pulse * (en.state === "chase" ? 1.6 : 0.35);

      if (!this.hidden && dist < 0.82 && !this.ended) this.catchPlayer(en);
      if (this.hidden && dist < 0.7 && en.state === "chase" && en.lose > 2.8 && !this.ended) {
        this.catchPlayer(en);
      }
    }

    if (spotted && !this.spottedOnce) {
      this.spottedOnce = true;
      this.audio.sting();
      this.trauma = Math.min(1, this.trauma + 0.65);
    }
    if (!anyChase) this.spottedOnce = false;

    const prox = 1 - Math.min(1, nearest / 11);
    this.audio.heartbeat(anyChase ? Math.max(0.4, prox) : prox * 0.5, dt);
    useGameStore.getState().patch({
      spotted,
      chase: anyChase,
      nearEnemy: prox,
      hidden: this.hidden,
    });
  }

  private catchPlayer(en: Enemy) {
    this.ended = true;
    this.audio.caught();
    this.trauma = 1;
    document.exitPointerLock?.();
    const dx = en.x - this.px;
    const dz = en.z - this.pz;
    this.yaw = Math.atan2(-dx, -dz);
    this.pitch = 0.12;
    useGameStore.getState().patch({ screen: "dead" });
  }

  private resetEnemies() {
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

  private enemyRoutes() {
    const c7 = 7 * TILE + TILE * 0.5;
    const hall = tileCenter(24, 12);
    const hall2 = tileCenter(18, 11);
    const hall3 = tileCenter(30, 12);
    return [
      {
        waypoints: [
          { x: 4, z: c7 },
          { x: WORLD_W - 5, z: c7 },
        ],
      },
      {
        waypoints: [
          { x: hall2.x, z: hall2.z },
          { x: hall.x, z: hall.z },
          { x: hall3.x, z: hall3.z },
          { x: hall.x, z: c7 },
        ],
      },
      {
        waypoints: [
          { x: 8, z: c7 },
          { x: tileCenter(3, 7).x, z: c7 },
          { x: tileCenter(15, 7).x, z: c7 },
          { x: tileCenter(15, 12).x, z: hall2.z },
        ],
      },
    ];
  }

  private pushHud(dt: number) {
    this.hudAcc += dt;
    if (this.hudAcc < 0.08 && this.hold === 0) return;
    this.hudAcc = 0;
    const it = this.hidden ? null : this.nearestInteract();
    let prompt = "";
    if (this.hidden) prompt = "E — Sair do armário";
    else if (it?.kind === "note") prompt = "E — Ler o papel";
    else if (it?.kind === "battery") prompt = "E — Pegar pilhas";
    else if (it?.kind === "tool") prompt = `E — Pegar ${it.title ?? "item"}`;
    else if (it?.kind === "drawer") {
      prompt = it.searched
        ? it.loot === undefined && this.items.has("key")
          ? "Gaveta vasculhada"
          : "Gaveta vazia"
        : "E — Vasculhar gaveta";
      if (it.searched && it.loot === null && this.items.has("key")) prompt = "Você pegou a chave.";
    } else if (it?.kind === "locker") prompt = "Segure E — Esconder";
    else if (it?.kind === "gate") {
      const missing = (["cutters", "key", "fuse"] as ToolId[]).filter((t) => !this.items.has(t));
      prompt =
        missing.length === 0
          ? "E — Abrir o portão"
          : `Falta: ${missing.map((m) => ({ cutters: "alicate", key: "chave", fuse: "fusível" })[m]).join(", ")}`;
    }

    const objective =
      this.items.size >= 3
        ? "Leve as três ferramentas ao portão principal."
        : `Ferramentas ${this.items.size}/3 — alicate, chave, fusível.`;

    if (prompt === this.lastPrompt && Math.abs(useGameStore.getState().battery - this.battery) < 0.4) {
      useGameStore.getState().patch({
        battery: this.battery,
        flashlight: this.flashOn,
        items: [...this.items],
        holdProgress: it?.kind === "locker" ? this.hold / 0.48 : 0,
        objective,
      });
      return;
    }
    this.lastPrompt = prompt;
    useGameStore.getState().patch({
      battery: this.battery,
      flashlight: this.flashOn,
      items: [...this.items],
      prompt,
      holdProgress: it?.kind === "locker" ? Math.min(1, this.hold / 0.48) : 0,
      objective,
    });
  }

  private syncRig() {
    const bobY = this.speed > 0.5 && !this.hidden ? Math.sin(this.bob) * 0.035 : 0;
    const bobX = this.speed > 0.5 && !this.hidden ? Math.cos(this.bob * 0.5) * 0.012 : 0;
    const shake = this.trauma * this.trauma;
    const sx = (Math.random() - 0.5) * shake * 0.12;
    const sy = (Math.random() - 0.5) * shake * 0.1;
    this.rig.position.set(this.px + bobX + sx, this.py + bobY + sy, this.pz);
    this.rig.rotation.set(0, this.yaw, shake * (Math.random() - 0.5) * 0.04);
    this.camera.rotation.x = this.pitch;
    this.flashlightGrp.position.set(0.22, -0.2 + bobY * 0.4, -0.38);
    this.flashlightGrp.rotation.set(0.12 + this.pitch * 0.05, 0.08, 0.18);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
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

  private buildMaterials() {
    const snap = (mat: THREE.MeshLambertMaterial, amount = 120) => {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uSnap = { value: amount };
        shader.vertexShader = `uniform float uSnap;\n${shader.vertexShader}`.replace(
          `#include <project_vertex>`,
          `
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
          `,
        );
      };
      mat.customProgramCacheKey = () => `psx-${amount}`;
    };
    this.mats.wall = new THREE.MeshLambertMaterial({ map: this.tex.wall, color: 0xc9a0a2 });
    this.mats.floor = new THREE.MeshLambertMaterial({ map: this.tex.floor });
    this.mats.ceil = new THREE.MeshLambertMaterial({ map: this.tex.ceil });
    this.mats.wood = new THREE.MeshLambertMaterial({ map: this.tex.wood });
    this.mats.metal = new THREE.MeshLambertMaterial({ map: this.tex.metal, color: 0x9aa4ae });
    this.mats.paper = new THREE.MeshLambertMaterial({
      map: this.tex.paper,
      emissive: 0x332211,
      emissiveIntensity: 0.35,
    });
    this.mats.door = new THREE.MeshLambertMaterial({ map: this.tex.door });
    this.mats.gate = new THREE.MeshLambertMaterial({ map: this.tex.gate, color: 0x889080 });
    this.mats.black = new THREE.MeshLambertMaterial({ color: 0x0c0a0b });
    this.mats.skin = new THREE.MeshLambertMaterial({ color: 0x2a1814 });
    this.mats.cloth = new THREE.MeshLambertMaterial({ color: 0x141018 });
    this.mats.ceramic = new THREE.MeshLambertMaterial({ color: 0xb8b0a4 });
    for (const m of Object.values(this.mats)) snap(m);
  }

  private box(sx: number, sy: number, sz: number) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    this.geos.push(g);
    return g;
  }

  private mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }

  private addCollider(x: number, z: number, hx: number, hz: number) {
    this.extras.push({ minx: x - hx, maxx: x + hx, minz: z - hz, maxz: z + hz });
  }

  private buildWorld() {
    const amb = new THREE.HemisphereLight(0x2a2430, 0x080405, 0.22);
    this.scene.add(amb);
    const dim = new THREE.AmbientLight(0x1a1014, 0.07);
    this.scene.add(dim);

    const floorG = this.box(WORLD_W, 0.12, WORLD_D);
    this.mesh(floorG, this.mats.floor, WORLD_W / 2, -0.06, WORLD_D / 2);
    this.mesh(this.box(WORLD_W, 0.1, WORLD_D), this.mats.ceil, WORLD_W / 2, 3.38, WORLD_D / 2);

    for (let tz = 0; tz < MAP_H; tz++) {
      let tx = 0;
      while (tx < MAP_W) {
        if (MAP[tz][tx] !== "#") {
          tx++;
          continue;
        }
        const start = tx;
        while (tx < MAP_W && MAP[tz][tx] === "#") tx++;
        const w = (tx - start) * TILE;
        const cx = start * TILE + w / 2;
        const cz = tz * TILE + TILE / 2;
        this.mesh(this.box(w, 3.4, TILE), this.mats.wall, cx, 1.7, cz);
      }
    }

    this.buildDoorsAndLabels();
    this.buildRooms();
    this.buildCorridorLockers();
    this.buildHall();
    this.buildPickups();
    this.buildFlickerLights();
  }

  private buildDoorsAndLabels() {
    const frame = this.box(0.18, 2.2, 0.18);
    for (const d of collectDoors()) {
      const side = d.facing === "n" || d.facing === "s";
      const ox = side ? 0.95 : 0;
      const oz = side ? 0 : 0.95;
      this.mesh(frame, this.mats.wood, d.x - ox, 1.1, d.z - oz);
      this.mesh(frame, this.mats.wood, d.x + ox, 1.1, d.z + oz);
      this.mesh(this.box(side ? 2.1 : 0.18, 0.16, side ? 0.18 : 2.1), this.mats.wood, d.x, 2.22, d.z);

      const labelTex = makeLabelTexture(d.label);
      const lg = new THREE.PlaneGeometry(1.35, 0.34);
      this.geos.push(lg);
      const lm = new THREE.MeshLambertMaterial({ map: labelTex });
      this.mats[`label-${d.label}`] = lm;
      const sign = new THREE.Mesh(lg, lm);
      const off = 0.55;
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
      const minx = Math.min(...xs) * TILE;
      const maxx = (Math.max(...xs) + 1) * TILE;
      const z = gates[0].tz * TILE + TILE * 0.5;
      const w = maxx - minx;
      this.gateMesh = this.mesh(this.box(w, 3.05, 0.16), this.mats.gate, (minx + maxx) / 2, 1.55, z);
      this.interacts.push({
        id: "gate",
        kind: "gate",
        x: (minx + maxx) / 2,
        y: 1,
        z: z - 1.1,
        r: 2.1,
      });
    }
  }

  private buildRooms() {
    this.fillDesks("1");
    this.fillDesks("2");
    this.fillDesks("3");
    this.fillDesks("4");
    this.fillTeachers();
    this.fillDiretoria();
    this.fillBathroom();
    this.fillStorage();
  }

  private fillDesks(ch: string) {
    const b = roomBounds(ch);
    if (!b) return;
    let n = 0;
    for (let z = b.minz + 1.15; z < b.maxz - 2.1; z += 1.85) {
      for (let x = b.minx + 1.15; x < b.maxx - 0.9; x += 1.7) {
        this.addDesk(x, z);
        n++;
        if (n >= 8) return;
      }
    }
  }

  private addDesk(x: number, z: number) {
    this.mesh(this.box(1.15, 0.06, 0.7), this.mats.wood, x, 0.78, z);
    this.mesh(this.box(0.08, 0.76, 0.08), this.mats.wood, x - 0.48, 0.38, z - 0.28);
    this.mesh(this.box(0.08, 0.76, 0.08), this.mats.wood, x + 0.48, 0.38, z - 0.28);
    this.mesh(this.box(0.08, 0.76, 0.08), this.mats.wood, x - 0.48, 0.38, z + 0.28);
    this.mesh(this.box(0.08, 0.76, 0.08), this.mats.wood, x + 0.48, 0.38, z + 0.28);
    this.mesh(this.box(0.4, 0.42, 0.4), this.mats.wood, x, 0.34, z + 0.55);
    this.addCollider(x, z, 0.55, 0.38);
  }

  private addDrawer(x: number, z: number, loot: ToolId | null, id: string) {
    const body = this.mesh(this.box(0.9, 0.85, 0.55), this.mats.wood, x, 0.42, z);
    this.mesh(this.box(0.7, 0.08, 0.08), this.mats.metal, x, 0.5, z + 0.28);
    this.addCollider(x, z, 0.5, 0.32);
    this.interacts.push({
      id,
      kind: "drawer",
      x,
      y: 0.5,
      z: z + 0.4,
      r: 1.5,
      loot,
      searched: false,
      mesh: body,
    });
  }

  private fillTeachers() {
    const b = roomBounds("P");
    if (!b) return;
    const cx = (b.minx + b.maxx) / 2;
    this.addDesk(cx - 1.6, b.minz + 1.6);
    this.addDesk(cx + 1.6, b.minz + 1.6);
    this.addDrawer(cx - 1.5, b.maxz - 2.4, null, "drawer-p1");
    this.addDrawer(cx, b.maxz - 2.4, "key", "drawer-key");
    this.addDrawer(cx + 1.5, b.maxz - 2.4, null, "drawer-p3");
  }

  private fillDiretoria() {
    const b = roomBounds("D");
    if (!b) return;
    const cx = (b.minx + b.maxx) / 2;
    const cz = (b.minz + b.maxz) / 2 - 0.4;
    this.mesh(this.box(2.2, 0.08, 1.1), this.mats.wood, cx, 0.82, cz);
    this.mesh(this.box(2.2, 0.7, 1.1), this.mats.wood, cx, 0.4, cz);
    this.addCollider(cx, cz, 1.15, 0.6);
    this.mesh(this.box(0.55, 0.9, 0.55), this.mats.wood, cx, 0.45, cz - 1.05);
    const fuse = this.buildFuse(cx + 0.55, 0.95, cz + 0.1);
    this.interacts.push({
      id: "fuse",
      kind: "tool",
      tool: "fuse",
      title: "Fusível da energia",
      x: cx + 0.55,
      y: 0.95,
      z: cz + 0.1,
      r: 1.5,
      mesh: fuse,
    });
    this.addDrawer(b.minx + 1.2, b.minz + 1.3, null, "drawer-d1");
  }

  private fillBathroom() {
    const b = roomBounds("B");
    if (!b) return;
    for (let i = 0; i < 3; i++) {
      const z = b.minz + 1.2 + i * 1.7;
      this.mesh(this.box(0.06, 2.1, 1.5), this.mats.ceramic, b.maxx - 1.9, 1.05, z);
      this.mesh(this.box(0.45, 0.45, 0.5), this.mats.ceramic, b.maxx - 1.15, 0.35, z);
      this.addCollider(b.maxx - 1.9, z, 0.12, 0.7);
    }
    const cut = this.buildCutters(b.minx + 1.1, 0.55, b.maxz - 1.3);
    this.interacts.push({
      id: "cutters",
      kind: "tool",
      tool: "cutters",
      title: "Alicate de corte",
      x: b.minx + 1.1,
      y: 0.55,
      z: b.maxz - 1.3,
      r: 1.5,
      mesh: cut,
    });
  }

  private fillStorage() {
    const b = roomBounds("A");
    if (!b) return;
    for (let i = 0; i < 3; i++) {
      const z = b.minz + 1 + i * 1.4;
      this.mesh(this.box(1.4, 1.8, 0.4), this.mats.metal, (b.minx + b.maxx) / 2, 0.9, z);
      this.addCollider((b.minx + b.maxx) / 2, z, 0.7, 0.25);
    }
  }

  private buildCorridorLockers() {
    const places = [
      { tx: 4, tz: 6, face: Math.PI },
      { tx: 11, tz: 6, face: Math.PI },
      { tx: 19, tz: 6, face: Math.PI },
      { tx: 27, tz: 6, face: Math.PI },
      { tx: 8, tz: 8, face: 0 },
      { tx: 16, tz: 8, face: 0 },
      { tx: 25, tz: 8, face: 0 },
    ];
    for (const p of places) {
      const c = tileCenter(p.tx, p.tz);
      const inward = p.face === 0 ? 0.55 : -0.55;
      const z = c.z + inward;
      this.addLocker(c.x, z, p.face);
    }
  }

  private addLocker(x: number, z: number, faceYaw: number) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.box(0.72, 2.05, 0.5), this.mats.metal);
    body.position.y = 1.02;
    g.add(body);
    for (let i = 0; i < 7; i++) {
      const slat = new THREE.Mesh(this.box(0.55, 0.04, 0.02), this.mats.black);
      slat.position.set(0, 1.35 + i * 0.08, 0.26);
      g.add(slat);
    }
    const handle = new THREE.Mesh(this.box(0.05, 0.14, 0.06), this.mats.wood);
    handle.position.set(0.22, 1.05, 0.28);
    g.add(handle);
    g.position.set(x, 0, z);
    g.rotation.y = faceYaw;
    this.scene.add(g);
    this.addCollider(x, z, 0.4, 0.32);
    this.interacts.push({
      id: `locker-${x.toFixed(1)}-${z.toFixed(1)}`,
      kind: "locker",
      x,
      y: 1,
      z,
      r: 1.35,
      faceYaw,
      mesh: g,
    });
  }

  private buildHall() {
    const b = roomBounds("H");
    if (!b) return;
    this.mesh(
      this.box(2.4, 1.2, 0.06),
      this.mats.wood,
      b.minx + 6,
      1.6,
      b.maxz - 0.4,
    );
    this.mesh(this.box(1.8, 0.45, 0.5), this.mats.wood, b.minx + 10, 0.28, (b.minz + b.maxz) / 2);
    this.addCollider(b.minx + 10, (b.minz + b.maxz) / 2, 0.95, 0.3);
  }

  private buildPickups() {
    const notes: Array<{ ch: string; title: string; body: string; ox?: number; oz?: number }> = [
      {
        ch: "2",
        title: "Boletim rasgado",
        body: "A cidade anunciou seu desaparecimento antes do anoitecer. Ninguém veio procurar dentro da escola. Você não sumiu. Você só acordou tarde demais, trancado na Rosa Bonfiglioli.",
        ox: 0.8,
        oz: 0.6,
      },
      {
        ch: "H",
        title: "Lista de chamada",
        body: "Vários nomes riscados com a mesma letra. No rodapé, a caneta treme: NÃO ACENDA A LANTERNA PERTO DELES. Se esconder no armário funciona — se eles não te viram entrar.",
      },
      {
        ch: "P",
        title: "Recado no quadro",
        body: "A chave da diretoria não está com ela. Está na gaveta do meio da Sala dos Professores, debaixo das provas rasgadas. Terceira gaveta. Não a primeira.",
      },
      {
        ch: "1",
        title: "Caderno molhado",
        body: "Eles não são professores. São o que sobrou quando a escola decidiu não deixar ninguém ir embora. A diretora ainda anda no corredor como se a aula não tivesse acabado.",
      },
      {
        ch: "D",
        title: "Ordem de corte de energia",
        body: "O fusível da portaria foi removido e levado para a DIRETORIA. Sem ele a grade não abre. Alguém não queria que a saída existisse depois do terceiro sinal.",
      },
      {
        ch: "B",
        title: "Papel no azulejo",
        body: "Os fios da grade foram emendados com arame grosso. Precisa de um ALICATE. Tem um no banheiro dos fundos, no último cubículo, atrás da última privada.",
      },
      {
        ch: "3",
        title: "Bilhete de aluno",
        body: "Se a lanterna morrer, procure pilhas nos corredores. As lâmpadas do hall ainda piscam. Isso não é manutenção. É o prédio respirando.",
      },
    ];

    notes.forEach((n, idx) => {
      const b = roomBounds(n.ch);
      if (!b) return;
      const x = (b.minx + b.maxx) / 2 + (n.ox ?? (idx % 3) * 0.4 - 0.4);
      const z = (b.minz + b.maxz) / 2 + (n.oz ?? 0.5);
      const mesh = this.mesh(this.box(0.32, 0.01, 0.22), this.mats.paper, x, 0.04, z);
      mesh.rotation.y = idx * 0.4;
      const glow = new THREE.PointLight(0xe8d2a0, 0.28, 2.4, 2);
      glow.position.set(x, 0.2, z);
      this.scene.add(glow);
      this.interacts.push({
        id: `note-${idx}`,
        kind: "note",
        x,
        y: 0.05,
        z,
        r: 1.45,
        title: n.title,
        body: n.body,
        mesh,
      });
    });

    const bats = [
      tileCenter(6, 7),
      tileCenter(18, 7),
      tileCenter(29, 7),
      tileCenter(22, 12),
      tileCenter(2, 3),
      tileCenter(3, 12),
    ];
    bats.forEach((p, i) => {
      const g = new THREE.Group();
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 6), this.mats.metal);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 6), this.mats.metal);
      a.position.x = -0.06;
      b.position.x = 0.06;
      g.add(a, b);
      g.position.set(p.x, 0.12, p.z);
      this.scene.add(g);
      this.geos.push(a.geometry, b.geometry);
      this.interacts.push({ id: `bat-${i}`, kind: "battery", x: p.x, y: 0.12, z: p.z, r: 1.3, mesh: g });
    });
  }

  private buildFuse(x: number, y: number, z: number) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 8), this.mats.ceramic);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 8), this.mats.metal);
    cap.position.y = 0.16;
    const cap2 = cap.clone();
    cap2.position.y = -0.16;
    g.add(body, cap, cap2);
    g.position.set(x, y, z);
    g.rotation.z = Math.PI / 2;
    this.scene.add(g);
    this.geos.push(body.geometry, cap.geometry);
    return g;
  }

  private buildCutters(x: number, y: number, z: number) {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(this.box(0.28, 0.03, 0.05), this.mats.metal);
    const h1 = new THREE.Mesh(this.box(0.18, 0.035, 0.04), new THREE.MeshLambertMaterial({ color: 0x8a2020 }));
    const h2 = h1.clone();
    h1.position.set(-0.18, 0.03, 0);
    h1.rotation.z = 0.4;
    h2.position.set(-0.18, -0.03, 0);
    h2.rotation.z = -0.4;
    g.add(blade, h1, h2);
    g.position.set(x, y, z);
    g.rotation.y = 0.6;
    this.scene.add(g);
    return g;
  }

  private buildFlickerLights() {
    const spots = [
      tileCenter(10, 7),
      tileCenter(22, 7),
      tileCenter(24, 12),
      tileCenter(20, 2),
      tileCenter(4, 3),
    ];
    const bulbGeo = this.box(0.7, 0.08, 0.25);
    spots.forEach((p, i) => {
      const light = new THREE.PointLight(0xe8dcc0, 1.1, 9, 2);
      light.position.set(p.x, 3.05, p.z);
      this.scene.add(light);
      const mesh = this.mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xd8c8a0 }), p.x, 3.22, p.z);
      this.flickers.push({ light, mesh, base: i === 3 ? 0.45 : 0.9, phase: i * 1.7 });
    });
  }

  private updateFlickers() {
    for (const f of this.flickers) {
      const n = Math.sin(this.time * 17 + f.phase) * 0.15 + Math.sin(this.time * 3.1 + f.phase) * 0.1;
      const burst = Math.random() > 0.97 ? -0.7 : 0;
      const v = Math.max(0.05, f.base + n + burst);
      f.light.intensity = v * 1.4;
      const mat = f.mesh.material as THREE.MeshBasicMaterial;
      mat.color.setRGB(0.85 * v, 0.78 * v, 0.62 * v);
    }
  }

  private buildDust() {
    const n = 280;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * WORLD_W;
      pos[i * 3 + 1] = 0.3 + Math.random() * 2.6;
      pos[i * 3 + 2] = Math.random() * WORLD_D;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.geos.push(g);
    return g;
  }

  private updateDust(dt: number) {
    const attr = this.dustGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      let y = attr.getY(i) + dt * 0.12;
      if (y > 3.1) y = 0.2;
      attr.setY(i, y);
      attr.setX(i, attr.getX(i) + Math.sin(this.time * 0.3 + i) * dt * 0.05);
    }
    attr.needsUpdate = true;
  }

  private buildPlayerLights() {
    this.spot = new THREE.SpotLight(0xffe6c4, 0, 17, Math.PI / 6.2, 0.48, 1.35);
    this.spot.position.set(0.1, -0.05, 0.15);
    const tgt = new THREE.Object3D();
    tgt.position.set(0, -0.2, -9);
    this.camera.add(this.spot);
    this.camera.add(tgt);
    this.spot.target = tgt;
    this.fill = new THREE.PointLight(0xffd8a8, 0, 3.2, 2);
    this.fill.position.set(0, -0.1, -0.4);
    this.camera.add(this.fill);
  }

  private buildFlashlightModel() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 8), this.mats.metal);
    body.rotation.x = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.08, 8), this.mats.black);
    head.rotation.x = Math.PI / 2;
    head.position.z = -0.16;
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 10),
      new THREE.MeshBasicMaterial({ color: 0x221c14 }),
    );
    lens.name = "lens";
    lens.position.z = -0.205;
    g.add(body, head, lens);
    this.geos.push(body.geometry, head.geometry, lens.geometry);
    return g;
  }

  private buildEnemies() {
    const routes = this.enemyRoutes();
    const kinds: Array<"t" | "t" | "d"> = ["t", "t", "d"];
    routes.forEach((r, i) => {
      const en = this.makeEnemy(kinds[i], r.waypoints);
      this.enemies.push(en);
      this.scene.add(en.group);
    });
  }

  private makeEnemy(kind: "t" | "d", waypoints: { x: number; z: number }[]): Enemy {
    const g = new THREE.Group();
    const h = kind === "d" ? 2.35 : 2.05;
    const torso = new THREE.Mesh(this.box(0.55, h * 0.55, 0.32), this.mats.cloth);
    torso.position.y = h * 0.55;
    const hip = new THREE.Mesh(this.box(0.5, h * 0.28, 0.28), this.mats.cloth);
    hip.position.y = h * 0.22;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.3), this.mats.skin);
    head.position.y = h * 0.88;
    this.geos.push(head.geometry);
    const armL = new THREE.Mesh(this.box(0.12, h * 0.5, 0.12), this.mats.cloth);
    const armR = armL.clone();
    armL.position.set(-0.38, h * 0.5, 0.02);
    armR.position.set(0.38, h * 0.5, 0.02);
    armL.rotation.z = 0.12;
    armR.rotation.z = -0.12;
    const jaw = new THREE.Mesh(this.box(0.22, 0.08, 0.18), this.mats.black);
    jaw.position.set(0, h * 0.78, 0.1);
    const eyeGeo = new THREE.SphereGeometry(0.045, 6, 6);
    this.geos.push(eyeGeo);
    const eMat1 = new THREE.MeshBasicMaterial({ color: 0x6a1810 });
    const eMat2 = eMat1.clone();
    const eyeL = new THREE.Mesh(eyeGeo, eMat1);
    const eyeR = new THREE.Mesh(eyeGeo, eMat2);
    eyeL.position.set(-0.08, h * 0.9, 0.16);
    eyeR.position.set(0.08, h * 0.9, 0.16);
    g.add(torso, hip, head, armL, armR, jaw, eyeL, eyeR);
    if (kind === "d") {
      const tie = new THREE.Mesh(this.box(0.08, 0.35, 0.02), new THREE.MeshLambertMaterial({ color: 0x5a1010 }));
      tie.position.set(0, h * 0.62, 0.17);
      g.add(tie);
    }
    const glow = new THREE.PointLight(0xff2211, 0.3, 3.5, 2);
    glow.position.set(0, h * 0.9, 0.2);
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
      lastSeen: { x: start.x, z: start.z },
      height: h,
    };
  }
}
