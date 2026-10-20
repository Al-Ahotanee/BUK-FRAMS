/**
 * BUK-FRAS Web Audio Synthesizer
 * Generates low-latency, zero-asset audio alerts directly in-browser using HTML5 AudioContext.
 * Guaranteed to work without external MP3 files or network latency.
 */

let audioCtx: AudioContext | null = null;
let soundMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('Web Audio API not supported or blocked:', e);
    return null;
  }
}

export function isSoundMuted(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('buk_audio_muted');
    if (saved !== null) {
      soundMuted = saved === 'true';
    }
  }
  return soundMuted;
}

export function setSoundMuted(muted: boolean): void {
  soundMuted = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('buk_audio_muted', muted ? 'true' : 'false');
  }
}

/**
 * Play a bright, harmonic 3-tone chime for a newly recorded attendance.
 * C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) with smooth exponential decay.
 */
export function playSuccessChime(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.38);
    });
  } catch (err) {
    console.warn('Error playing success chime:', err);
  }
}

/**
 * Play a double-pulse alert tone for a student who is ALREADY recorded in this session.
 * 440Hz (A4) two gentle pings: "Already marked, please step aside".
 */
export function playAlreadyMarkedTone(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const pulses = [0, 0.16];

    pulses.forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now + offset);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
  } catch (err) {
    console.warn('Error playing already marked tone:', err);
  }
}

/**
 * Play a low buzz tone for an unrecognized face (not enrolled in BUK system).
 * 220Hz -> 180Hz buzz.
 */
export function playErrorBuzz(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(170, now + 0.25);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.warn('Error playing error buzz:', err);
  }
}

/**
 * Short ping when capturing a biometric training sample in enrollment.
 */
export function playSampleChime(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch (err) {
    console.warn('Error playing sample chime:', err);
  }
}
