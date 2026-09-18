/** Procedural horror audio via Web Audio API — no external files. */

export class HorrorAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  muted = false;
  private droneOsc: OscillatorNode[] = [];
  private droneLfo: OscillatorNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private footTimer = 0;
  private stingCooldown = 0;
  private started = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.music.gain.value = 0.22;
      this.sfx.gain.value = 0.85;
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.makeNoise(this.ctx, 1.2);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (!this.started && this.ctx.state === "running") {
      this.started = true;
      this.startDrone();
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.04);
    }
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  private makeNoise(ctx: AudioContext, seconds: number) {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = last * 0.96 + (Math.random() * 2 - 1) * 0.35;
      data[i] = last;
    }
    return buf;
  }

  private startDrone() {
    const ctx = this.ctx;
    const music = this.music;
    if (!ctx || !music) return;

    const freqs = [38, 46.5, 77, 93];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = f < 50 ? "sine" : "triangle";
      osc.frequency.value = f;
      g.gain.value = f < 50 ? 0.38 : 0.08;
      osc.connect(g);
      g.connect(music);
      osc.start();
      this.droneOsc.push(osc);
    }

    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoG.gain.value = 4;
    lfo.connect(lfoG);
    lfoG.connect(this.droneOsc[0].frequency);
    lfo.start();
    this.droneLfo = lfo;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 280;
    filter.Q.value = 0.7;
  }

  private noiseBurst(duration: number, freq: number, q: number, gain: number, rate = 1) {
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
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(bp);
    bp.connect(g);
    g.connect(sfx);
    src.start();
    src.stop(t + duration + 0.02);
    src.onended = () => {
      src.disconnect();
      bp.disconnect();
      g.disconnect();
    };
  }

  flashlightClick(on: boolean) {
    const ctx = this.ctx;
    const sfx = this.sfx;
    if (!ctx || !sfx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = on ? 190 : 120;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(g);
    g.connect(sfx);
    osc.start();
    osc.stop(t + 0.08);
  }

  footstep(running: boolean, crouch: boolean) {
    const freq = crouch ? 140 : running ? 220 : 180;
    this.noiseBurst(crouch ? 0.09 : 0.07, freq, 3.2, running ? 0.22 : 0.12, 0.85 + Math.random() * 0.3);
  }

  tickFoot(dt: number, speed: number, running: boolean, crouch: boolean, moving: boolean) {
    if (!moving) {
      this.footTimer = 0;
      return;
    }
    const interval = crouch ? 0.62 : running ? 0.32 : 0.46;
    this.footTimer += dt * Math.min(1.6, 0.35 + speed / 4);
    if (this.footTimer >= interval) {
      this.footTimer = 0;
      this.footstep(running, crouch);
    }
  }

  drawer() {
    this.noiseBurst(0.28, 420, 1.4, 0.2, 0.7);
    this.noiseBurst(0.18, 180, 2, 0.16, 0.5);
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
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.16);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g);
    g.connect(sfx);
    osc.start();
    osc.stop(t + 0.24);
  }

  paper() {
    this.noiseBurst(0.2, 2400, 0.8, 0.1, 1.4);
  }

  locker(open: boolean) {
    this.noiseBurst(open ? 0.22 : 0.16, open ? 280 : 200, 1.8, 0.18, open ? 0.6 : 0.8);
  }

  sting() {
    const ctx = this.ctx;
    const sfx = this.sfx;
    if (!ctx || !sfx) return;
    if (this.stingCooldown > 0) return;
    this.stingCooldown = 4;
    const t = ctx.currentTime;
    for (const f of [932, 987, 1400]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.7);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 600;
      osc.connect(filter);
      filter.connect(g);
      g.connect(sfx);
      osc.start();
      osc.stop(t + 0.8);
    }
  }

  caught() {
    this.noiseBurst(0.8, 90, 0.6, 0.4, 0.4);
    this.noiseBurst(0.5, 1400, 4, 0.15, 1.6);
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
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.9);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    osc.connect(g);
    g.connect(sfx);
    osc.start();
    osc.stop(t + 1.25);
  }

  gateRattle() {
    this.noiseBurst(0.35, 160, 2.2, 0.22, 0.45);
  }

  heartbeat(intensity: number, dt: number) {
    if (intensity < 0.15 || !this.ctx || !this.sfx) return;
    this._heartAcc = (this._heartAcc ?? 0) + dt;
    const period = 0.95 - intensity * 0.45;
    if (this._heartAcc >= period) {
      this._heartAcc = 0;
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 52;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12 * intensity, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start();
      osc.stop(t + 0.18);
    }
  }
  private _heartAcc = 0;

  update(dt: number) {
    if (this.stingCooldown > 0) this.stingCooldown -= dt;
  }

  dispose() {
    for (const o of this.droneOsc) {
      try {
        o.stop();
        o.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.droneOsc = [];
    try {
      this.droneLfo?.stop();
      this.droneLfo?.disconnect();
    } catch {
      /* */
    }
    void this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}
