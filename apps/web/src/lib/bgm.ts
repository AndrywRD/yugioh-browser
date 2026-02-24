export type BgmTrackId = "LOBBY" | "DUEL";

const TRACK_SOURCES: Record<BgmTrackId, string[]> = {
  LOBBY: ["/audio/bgm/fm_lobby.mp3", "/audio/bgm/lobby.mp3"],
  DUEL: ["/audio/bgm/fm_duel.mp3", "/audio/bgm/duel.mp3"]
};

export function resolveTrackForPath(pathname: string | null): BgmTrackId | null {
  if (!pathname) return null;
  if (pathname.startsWith("/match")) return "DUEL";
  if (pathname.startsWith("/_")) return null;
  return "LOBBY";
}

export class BgmManager {
  private audio: HTMLAudioElement | null = null;
  private unlocked = false;
  private activeTrack: BgmTrackId | null = null;
  private activeSources: string[] = [];
  private sourceIndex = 0;
  private warnedTracks = new Set<BgmTrackId>();

  constructor(private volume = 0.22) {}

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = "auto";
      this.audio.volume = this.volume;
      this.audio.addEventListener("error", this.handleAudioError);
    }
    return this.audio;
  }

  private handleAudioError = (): void => {
    if (!this.audio || this.activeSources.length === 0) return;
    this.sourceIndex += 1;
    if (this.sourceIndex < this.activeSources.length) {
      this.audio.src = this.activeSources[this.sourceIndex];
      this.audio.load();
      if (this.unlocked) {
        void this.audio.play().catch(() => undefined);
      }
      return;
    }

    if (this.activeTrack && !this.warnedTracks.has(this.activeTrack)) {
      this.warnedTracks.add(this.activeTrack);
      // eslint-disable-next-line no-console
      console.warn(`[BGM] Nenhum arquivo encontrado para a trilha ${this.activeTrack}.`);
    }
  };

  unlock(): void {
    this.unlocked = true;
    const audio = this.ensureAudio();
    if (!audio) return;
    if (this.activeTrack && audio.paused) {
      void audio.play().catch(() => undefined);
    }
  }

  setTrack(track: BgmTrackId | null): void {
    if (track === this.activeTrack) return;
    const audio = this.ensureAudio();
    if (!audio) return;

    if (!track) {
      this.activeTrack = null;
      this.activeSources = [];
      this.sourceIndex = 0;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    this.activeTrack = track;
    this.activeSources = TRACK_SOURCES[track];
    this.sourceIndex = 0;
    audio.volume = this.volume;
    audio.src = this.activeSources[this.sourceIndex];
    audio.load();

    if (this.unlocked) {
      void audio.play().catch(() => undefined);
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  dispose(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.removeEventListener("error", this.handleAudioError);
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio = null;
  }
}

