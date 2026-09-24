class SoftSoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playChime(notes = [523.25, 659.25, 783.99, 1046.5], duration = 0.6) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        
        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.09 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + duration + 0.05);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  playGentlePing() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Ping audio error:', e);
    }
  }
}

export const synth = new SoftSoundSynth();

// Share the audio context so music also fades reliably on mobile browsers.
class BackgroundMusic {
  constructor() {
    this.audio = new Audio(`${import.meta.env.BASE_URL}from-eden.mp3`);
    this.audio.preload = 'none';
    this.enabled = false;
    this.gain = null;
    this.pauseTimer = null;
    this.audio.addEventListener('timeupdate', () => {
      if (this.enabled && this.audio.duration - this.audio.currentTime < 3 && !this.ending) {
        this.ending = true;
        this.fade(0, Math.max(.1, this.audio.duration - this.audio.currentTime));
      }
    });
    this.audio.addEventListener('ended', () => {
      if (this.enabled) {
        this.audio.currentTime = 0;
        this.setEnabled(true).catch(() => {});
      }
    });
  }

  fade(volume, seconds) {
    const now = synth.ctx.currentTime;
    const gain = this.gain.gain;
    gain.cancelAndHoldAtTime(now);
    gain.linearRampToValueAtTime(volume, now + seconds);
  }

  async setEnabled(enabled) {
    this.enabled = enabled;
    clearTimeout(this.pauseTimer);
    if (!enabled) {
      if (this.gain) this.fade(0, 1.5);
      this.pauseTimer = setTimeout(() => this.audio.pause(), 1600);
      return;
    }
    synth.init();
    if (!synth.ctx) throw new Error('Audio is unavailable');
    if (!this.gain) {
      const source = synth.ctx.createMediaElementSource(this.audio);
      const filter = synth.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 6500;
      this.gain = synth.ctx.createGain();
      this.gain.gain.value = 0;
      source.connect(filter).connect(this.gain).connect(synth.ctx.destination);
    }
    await synth.ctx.resume();
    if (!this.enabled) return;
    await this.audio.play();
    if (!this.enabled) return;
    this.ending = false;
    this.fade(.22, 3);
  }

  dispose() {
    this.enabled = false;
    clearTimeout(this.pauseTimer);
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.gain?.disconnect();
  }
}

export const music = new BackgroundMusic();

