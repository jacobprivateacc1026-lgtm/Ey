// Procedural Web Audio API synthesizer for clean, offline-first cognitive SFX & cosmic ambient soundscape

let audioCtx: AudioContext | null = null;

interface AmbientNodes {
  masterGain: GainNode;
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  stageNumber: number;
}

let activeAmbient: AmbientNodes | null = null;

const STAGE_DRONE_TONES: Record<number, { root: number; harmonic: number }> = {
  0: { root: 92.5, harmonic: 138.59 },  // F#2 + C#3 (Threshold Archive)
  1: { root: 110, harmonic: 164.81 },   // A2 + E3 (Euclidean clarity)
  2: { root: 98, harmonic: 146.83 },    // G2 + D3 (Fractured drift)
  3: { root: 116.54, harmonic: 174.61 }, // Bb2 + F3 (Recursive depth)
  4: { root: 103.83, harmonic: 155.56 }, // Ab2 + Eb3 (Modal tension)
  5: { root: 123.47, harmonic: 185 },   // B2 + F#3 (Axiomless expanse)
  6: { root: 130.81, harmonic: 196 },   // C3 + G3 (Convergence)
};

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      audioCtx = new Ctor();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal = 0.06,
  delay = 0
) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playSfx(
  kind: 'click' | 'solve' | 'error' | 'upgrade' | 'hint' | 'boss' | 'discovery',
  enabled: boolean
): void {
  if (!enabled) return;
  try {
    switch (kind) {
      case 'click':
        playTone(520, 0.06, 'sine', 0.032);
        break;
      case 'hint':
        playTone(440, 0.14, 'triangle', 0.04, 0);
        playTone(660, 0.18, 'sine', 0.038, 0.07);
        break;
      case 'discovery':
        playTone(493.88, 0.14, 'sine', 0.045, 0);
        playTone(739.99, 0.22, 'triangle', 0.045, 0.08);
        break;
      case 'upgrade':
        playTone(392, 0.12, 'triangle', 0.048, 0);
        playTone(523.25, 0.14, 'triangle', 0.048, 0.07);
        playTone(783.99, 0.24, 'sine', 0.048, 0.14);
        break;
      case 'solve':
        playTone(440, 0.14, 'sine', 0.052, 0);
        playTone(554.37, 0.14, 'sine', 0.052, 0.08);
        playTone(659.25, 0.18, 'sine', 0.052, 0.16);
        playTone(880, 0.34, 'triangle', 0.056, 0.24);
        break;
      case 'boss':
        playTone(220, 0.22, 'sawtooth', 0.032, 0);
        playTone(330, 0.28, 'triangle', 0.042, 0.09);
        playTone(660, 0.42, 'sine', 0.05, 0.18);
        break;
      case 'error':
        playTone(196, 0.16, 'triangle', 0.042, 0);
        playTone(164.81, 0.2, 'triangle', 0.038, 0.08);
        break;
    }
  } catch {
    // Ignore audio context blocks
  }
}

export function stopAmbientSoundscape(): void {
  if (!activeAmbient) return;
  const current = activeAmbient;
  activeAmbient = null;
  try {
    const ctx = audioCtx;
    if (ctx) {
      const now = ctx.currentTime;
      current.masterGain.gain.cancelScheduledValues(now);
      current.masterGain.gain.setTargetAtTime(0.0001, now, 0.15);
      window.setTimeout(() => {
        try {
          current.oscA.stop();
          current.oscB.stop();
          current.lfo.stop();
          current.masterGain.disconnect();
        } catch {
          // ignore already stopped
        }
      }, 350);
    }
  } catch {
    // ignore
  }
}

export function syncAmbientSoundscape(enabled: boolean, stageNumber: number): void {
  if (!enabled) {
    stopAmbientSoundscape();
    return;
  }
  const ctx = getCtx();
  if (!ctx) return;
  const tones = STAGE_DRONE_TONES[stageNumber] ?? STAGE_DRONE_TONES[1];

  try {
    if (activeAmbient) {
      if (activeAmbient.stageNumber !== stageNumber) {
        const now = ctx.currentTime;
        activeAmbient.oscA.frequency.setTargetAtTime(tones.root, now, 0.6);
        activeAmbient.oscB.frequency.setTargetAtTime(tones.harmonic, now, 0.6);
        activeAmbient.stageNumber = stageNumber;
      }
      return;
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.022, now + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);

    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.setValueAtTime(tones.root, now);

    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.setValueAtTime(tones.harmonic, now);

    const oscBGain = ctx.createGain();
    oscBGain.gain.setValueAtTime(0.35, now);

    // Subtle slow breathing modulation on filter cutoff
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.11, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(95, now);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    oscA.connect(filter);
    oscB.connect(oscBGain);
    oscBGain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    oscA.start(now);
    oscB.start(now);
    lfo.start(now);

    activeAmbient = {
      masterGain,
      oscA,
      oscB,
      lfo,
      lfoGain,
      stageNumber,
    };
  } catch {
    // Ignore autoplay / audio context restrictions
  }
}
