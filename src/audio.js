/**
 * Retro SFX synthesizer using Web Audio API.
 * Generates 16-bit style sound effects programmatically — no audio files needed.
 */
export class RetroAudio {
  constructor(scene) {
    this.scene = scene;
    this.ctx = null;
    this.muted = false;
    this.bgm = null;
    this.initialized = false;
  }

  /** Must be called from a user gesture (click/key) to unlock Web Audio */
  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.initialized = true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.bgm) {
      this.bgm.gain.value = muted ? 0 : 0.15;
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ── SFX Generators ──

  /** Pew-pew laser shot */
  playShoot() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.1);
  }

  /** Enemy hit thud */
  playHit() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.08);
  }

  /** Power-up collect chime (ascending arpeggio) */
  playPickup() {
    if (this.muted || !this.ctx) return;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'square';
      const t = this.ctx.currentTime + i * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  /** Evolution level-up fanfare */
  playLevelUp() {
    if (this.muted || !this.ctx) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'square';
      const t = this.ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /** Debuff negative buzz */
  playDebuff() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);
  }

  /** Speed buff chime (bright ascending) */
  playSpeedBuff() {
    if (this.muted || !this.ctx) return;
    const notes = [659, 784, 988]; // E5, G5, B5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'triangle';
      const t = this.ctx.currentTime + i * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  /** Player damage */
  playPlayerHit() {
    if (this.muted || !this.ctx) return;
    // White noise burst
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    noise.start(this.ctx.currentTime);
    noise.stop(this.ctx.currentTime + 0.1);
  }

  /** Boss spawn warning siren */
  playBossSpawn() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'square';
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    // Siren: oscillate between two frequencies
    for (let i = 0; i < 4; i++) {
      const t = this.ctx.currentTime + i * 0.2;
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(660, t + 0.1);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.8);
  }

  /** Simple synthwave BGM loop using oscillators */
  startBGM() {
    if (!this.ctx) return;
    this._bgmMode = 'normal';
    this._startNormalBGM();
  }

  _startNormalBGM() {
    this._clearBGMLoop();
    const bpm = 120;
    const step = 60 / bpm / 2;
    const loopLen = step * 16;

    const bassNotes = [110, 110, 130.81, 130.81, 146.83, 146.83, 130.81, 130.81,
                       110, 110, 130.81, 130.81, 146.83, 164.81, 146.83, 130.81];
    const padNotes = [330, 392, 440, 523, 440, 392, 330, 392,
                      349, 440, 523, 659, 523, 440, 349, 440];

    const masterGain = this.ctx.createGain();
    masterGain.gain.value = this.muted ? 0 : 0.15;
    masterGain.connect(this.ctx.destination);
    this.bgm = masterGain;

    const createLoop = () => {
      if (this._bgmMode !== 'normal') return;
      const startTime = this.ctx.currentTime;

      bassNotes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(masterGain);
        osc.type = 'sawtooth';
        const t = startTime + i * step;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.9);
        osc.start(t); osc.stop(t + step);
      });

      padNotes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(masterGain);
        osc.type = 'triangle';
        const t = startTime + i * step;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.8);
        osc.start(t); osc.stop(t + step);
      });

      for (let i = 0; i < 16; i++) {
        const bufSize = this.ctx.sampleRate * 0.03;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < bufSize; j++) d[j] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const g = this.ctx.createGain();
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 8000;
        src.connect(hp); hp.connect(g); g.connect(masterGain);
        const t = startTime + i * step;
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        src.start(t); src.stop(t + 0.03);
      }

      this._bgmTimer = setTimeout(() => createLoop(), loopLen * 1000 - 50);
    };
    createLoop();
  }

  /** Ominous boss BGM — slow, heavy, minor key */
  _startBossBGM() {
    this._clearBGMLoop();
    const bpm = 80;
    const step = 60 / bpm / 2;
    const loopLen = step * 16;

    // Minor key bass — E2, D2, C2, B1 pattern
    const bassNotes = [82.41, 82.41, 73.42, 73.42, 65.41, 65.41, 61.74, 61.74,
                       82.41, 82.41, 73.42, 73.42, 65.41, 61.74, 65.41, 73.42];
    // Dissonant pad — minor seconds and tritones
    const padNotes = [165, 156, 165, 156, 131, 123, 131, 123,
                      165, 156, 185, 156, 131, 123, 131, 147];

    const masterGain = this.ctx.createGain();
    masterGain.gain.value = this.muted ? 0 : 0.18;
    masterGain.connect(this.ctx.destination);
    this.bgm = masterGain;

    const createLoop = () => {
      if (this._bgmMode !== 'boss') return;
      const startTime = this.ctx.currentTime;

      // Heavy distorted bass
      bassNotes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(masterGain);
        osc.type = 'sawtooth';
        const t = startTime + i * step;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + step * 0.95);
        osc.start(t); osc.stop(t + step);
      });

      // Eerie pad
      padNotes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(masterGain);
        osc.type = 'sine';
        const t = startTime + i * step;
        osc.frequency.setValueAtTime(freq, t);
        // Slow vibrato
        osc.frequency.linearRampToValueAtTime(freq * 1.02, t + step * 0.5);
        osc.frequency.linearRampToValueAtTime(freq, t + step);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.9);
        osc.start(t); osc.stop(t + step);
      });

      // Slow heavy kick-like thuds (every 4th step)
      for (let i = 0; i < 16; i += 4) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(masterGain);
        osc.type = 'sine';
        const t = startTime + i * step;
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
      }

      this._bgmTimer = setTimeout(() => createLoop(), loopLen * 1000 - 50);
    };
    createLoop();
  }

  /** Crossfade from normal BGM to boss BGM */
  switchToBossBGM() {
    if (!this.ctx || this._bgmMode === 'boss') return;
    // Fade out current
    if (this.bgm) {
      this.bgm.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    }
    this._bgmMode = 'boss';
    // Start boss BGM after fade
    setTimeout(() => this._startBossBGM(), 1500);
  }

  _clearBGMLoop() {
    if (this._bgmTimer) {
      clearTimeout(this._bgmTimer);
      this._bgmTimer = null;
    }
  }

  stopBGM() {
    this._clearBGMLoop();
    this._bgmMode = null;
    this.bgm = null;
  }

  destroy() {
    this.stopBGM();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
