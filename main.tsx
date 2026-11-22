/**
 * Real-time synthesized ambient nightlife and bar audio using the Web Audio API.
 * Generates subtle crowd chatter, warm background bass pulses, and room ambience without external audio dependencies.
 */
class NightlifeAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private noiseNode: AudioBufferSourceNode | null = null;
  private bassOsc: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;
  private timerId: number | null = null;

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public start(volume = 0.35) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.setVolume(volume);

    // 1. Filtered pink-noise loop simulating room rumble and crowd chatter
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    // Bandpass filter to make it sound like bustling bar murmur
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(480, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.noiseNode.connect(filter);
    filter.connect(this.masterGain);
    this.noiseNode.start();

    // 2. Muffled 124 BPM club heartbeat / bass kick pulse simulating distant dance floor beat
    this.bassOsc = this.ctx.createOscillator();
    this.bassOsc.type = 'sine';
    this.bassOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.bassOsc.connect(this.bassGain);
    this.bassGain.connect(this.masterGain);
    this.bassOsc.start();

    // Pulse bass at 124 BPM (approx 484ms interval)
    const interval = 484;
    this.timerId = window.setInterval(() => {
      if (!this.ctx || !this.bassGain || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      this.bassGain.gain.cancelScheduledValues(now);
      this.bassGain.gain.setValueAtTime(0.0, now);
      this.bassGain.gain.linearRampToValueAtTime(0.18, now + 0.03);
      this.bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    }, interval);
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    try {
      this.noiseNode?.stop();
      this.bassOsc?.stop();
      this.noiseNode?.disconnect();
      this.bassOsc?.disconnect();
      this.bassGain?.disconnect();
    } catch {
      // Ignore cleanup error
    }
    this.noiseNode = null;
    this.bassOsc = null;
    this.bassGain = null;
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  public getIsPlaying() {
    return this.isPlaying;
  }
}

export const nightlifeAudio = new NightlifeAudioEngine();
