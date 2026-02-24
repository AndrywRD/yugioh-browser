export type SfxKey =
  | "ui_click"
  | "ui_open_menu"
  | "ui_confirm"
  | "ui_cancel"
  | "summon"
  | "fusion"
  | "attack_hit"
  | "attack_direct"
  | "end_turn"
  | "victory"
  | "defeat";

type ToneDef = {
  frequency: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
};

const TONES: Record<SfxKey, ToneDef> = {
  ui_click: { frequency: 620, durationMs: 55, type: "triangle", gain: 0.06 },
  ui_open_menu: { frequency: 500, durationMs: 90, type: "sawtooth", gain: 0.07 },
  ui_confirm: { frequency: 760, durationMs: 95, type: "triangle", gain: 0.07 },
  ui_cancel: { frequency: 320, durationMs: 95, type: "triangle", gain: 0.07 },
  summon: { frequency: 420, durationMs: 180, type: "sawtooth", gain: 0.09 },
  fusion: { frequency: 290, durationMs: 260, type: "square", gain: 0.09 },
  attack_hit: { frequency: 170, durationMs: 145, type: "square", gain: 0.1 },
  attack_direct: { frequency: 220, durationMs: 170, type: "square", gain: 0.1 },
  end_turn: { frequency: 520, durationMs: 100, type: "triangle", gain: 0.07 },
  victory: { frequency: 840, durationMs: 280, type: "triangle", gain: 0.09 },
  defeat: { frequency: 190, durationMs: 280, type: "sine", gain: 0.09 }
};

export class SfxManager {
  private context: AudioContext | null = null;

  constructor(private volume = 0.3) {}

  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.context) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.context = new Ctx();
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  play(key: SfxKey): void {
    if (typeof window === "undefined") return;
    this.unlock();
    if (!this.context) return;

    const tone = TONES[key];
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    const now = this.context.currentTime;
    const durationSec = tone.durationMs / 1000;

    oscillator.type = tone.type ?? "triangle";
    oscillator.frequency.setValueAtTime(tone.frequency, now);

    const targetGain = (tone.gain ?? 0.08) * this.volume;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(targetGain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationSec + 0.01);
  }
}
