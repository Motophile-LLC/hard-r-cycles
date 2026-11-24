class ShopAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxVolume = 0.75;
  private musicVolume = 0.35;
  private sfxMuted = false;
  private musicMuted = false;
  private radioTimer: number | null = null;
  private radioBeat = 0;
  private radioTempo = 1.0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.syncGains();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private syncGains(): void {
    if (!this.ctx || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.sfxGain.gain.setTargetAtTime(this.sfxMuted ? 0 : this.sfxVolume, now, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicMuted ? 0 : this.musicVolume, now, 0.04);
  }

  public unlockAudio(): void {
    this.ensureContext();
    this.syncGains();
  }

  public setVolumes(sfx: number, music: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.syncGains();
  }

  public setMuted(sfxMuted: boolean, musicMuted: boolean): void {
    this.sfxMuted = sfxMuted;
    this.musicMuted = musicMuted;
    this.syncGains();
  }

  public getSettings() {
    return {
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume,
      sfxMuted: this.sfxMuted,
      musicMuted: this.musicMuted,
    };
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainVal: number,
    target: 'sfx' | 'music' = 'sfx',
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.musicGain) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(target === 'sfx' ? this.sfxGain : this.musicGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(
    duration: number,
    filterFreq: number,
    filterType: BiquadFilterType,
    gainVal: number,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    const now = ctx.currentTime + delay;
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + duration + 0.01);
  }

  public playImpactGun(): void {
    // Pneumatic "UGGA-DUGGA" rattle + air exhaust hiss
    for (let i = 0; i < 4; i++) {
      this.playTone(230 - i * 18, 95, 0.055, 'sawtooth', 0.3, 'sfx', i * 0.055);
      this.playNoise(0.04, 1800, 'bandpass', 0.22, i * 0.055);
    }
    this.playNoise(0.18, 3600, 'highpass', 0.16, 0.21);
  }

  public playTorqueClick(): void {
    this.playTone(1350, 920, 0.045, 'triangle', 0.35, 'sfx', 0);
    this.playTone(1750, 1280, 0.05, 'triangle', 0.32, 'sfx', 0.05);
    this.playTone(880, 1320, 0.14, 'sine', 0.18, 'sfx', 0.09);
  }

  public playBoltSnap(): void {
    this.playNoise(0.09, 2800, 'highpass', 0.48, 0);
    this.playTone(980, 140, 0.28, 'sawtooth', 0.38, 'sfx', 0.01);
    this.playTone(460, 150, 0.35, 'triangle', 0.25, 'sfx', 0.12);
  }

  public playTorchHiss(): void {
    this.playNoise(0.16, 1500, 'bandpass', 0.18, 0);
  }

  public playElectricShort(): void {
    this.playNoise(0.28, 2200, 'bandpass', 0.42, 0);
    this.playTone(145, 70, 0.32, 'sawtooth', 0.4, 'sfx', 0);
    this.playTone(620, 110, 0.26, 'square', 0.25, 'sfx', 0.06);
  }

  public playBreakerReset(): void {
    this.playTone(130, 55, 0.12, 'square', 0.35, 'sfx', 0);
    this.playTone(330, 660, 0.16, 'sine', 0.22, 'sfx', 0.08);
  }

  public playBuddyBoing(): void {
    this.playTone(210, 540, 0.16, 'sine', 0.32, 'sfx', 0);
    this.playTone(540, 320, 0.18, 'sine', 0.24, 'sfx', 0.14);
  }

  public playSocketDrop(): void {
    this.playTone(1950, 1780, 0.055, 'sine', 0.28, 'sfx', 0);
    this.playTone(2100, 1890, 0.045, 'sine', 0.22, 'sfx', 0.09);
    this.playTone(2240, 1980, 0.04, 'sine', 0.14, 'sfx', 0.17);
  }

  public playOilSpill(): void {
    this.playNoise(0.14, 700, 'lowpass', 0.35, 0);
    this.playTone(480, 160, 0.22, 'sine', 0.26, 'sfx', 0.04);
  }

  public playWrongTool(): void {
    this.playTone(180, 130, 0.16, 'sawtooth', 0.32, 'sfx', 0);
    this.playTone(150, 95, 0.22, 'sawtooth', 0.32, 'sfx', 0.14);
  }

  public playCashRegister(): void {
    this.playTone(1318, 1318, 0.09, 'triangle', 0.28, 'sfx', 0);
    this.playTone(1975, 1975, 0.26, 'sine', 0.3, 'sfx', 0.08);
  }

  public playCelebrate(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.01, 0.16, 'triangle', 0.25, 'sfx', idx * 0.08);
    });
  }

  public setRadioTempo(multiplier: number): void {
    this.radioTempo = Math.max(0.7, Math.min(1.85, multiplier));
  }

  public startShopRadio(): void {
    if (typeof window === 'undefined') return;
    this.stopShopRadio();
    this.ensureContext();
    this.radioBeat = 0;

    const bassPattern = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    const scheduleNext = () => {
      if (this.radioTimer === null) return;
      const stepMs = Math.round(280 / this.radioTempo);
      const step = this.radioBeat % bassPattern.length;
      const bassNote = bassPattern[step];

      this.playTone(bassNote, bassNote * 0.98, 0.16, 'triangle', 0.16, 'music', 0);
      if (step % 2 === 1) {
        this.playTone(bassNote * 2.5, bassNote * 2.45, 0.08, 'square', 0.055, 'music', 0);
      }

      this.radioBeat += 1;
      this.radioTimer = window.setTimeout(scheduleNext, stepMs);
    };

    this.radioTimer = window.setTimeout(scheduleNext, 200);
  }

  public stopShopRadio(): void {
    if (typeof window !== 'undefined' && this.radioTimer !== null) {
      window.clearTimeout(this.radioTimer);
    }
    this.radioTimer = null;
  }
}

export const shopAudio = new ShopAudioEngine();
