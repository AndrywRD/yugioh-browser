export type UiScale = "COMPACT" | "NORMAL" | "LARGE";

export interface UiPreferences {
  scale: UiScale;
  fastAnimations: boolean;
  highContrast: boolean;
  colorblindAssist: boolean;
  fontBoost: boolean;
}

export const UI_PREFERENCES_STORAGE_KEY = "ruptura_arcana_ui_preferences_v1";

const DEFAULT_UI_PREFERENCES: UiPreferences = {
  scale: "NORMAL",
  fastAnimations: false,
  highContrast: false,
  colorblindAssist: false,
  fontBoost: false
};

function normalizeScale(value: unknown): UiScale {
  if (value === "COMPACT" || value === "LARGE" || value === "NORMAL") return value;
  return "NORMAL";
}

function normalizeUiPreferences(value: unknown): UiPreferences {
  if (!value || typeof value !== "object") return DEFAULT_UI_PREFERENCES;
  const input = value as Partial<UiPreferences>;
  return {
    scale: normalizeScale(input.scale),
    fastAnimations: Boolean(input.fastAnimations),
    highContrast: Boolean(input.highContrast),
    colorblindAssist: Boolean(input.colorblindAssist),
    fontBoost: Boolean(input.fontBoost)
  };
}

export function getDefaultUiPreferences(): UiPreferences {
  return { ...DEFAULT_UI_PREFERENCES };
}

export function loadUiPreferences(): UiPreferences {
  if (typeof window === "undefined") return getDefaultUiPreferences();
  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (!raw) return getDefaultUiPreferences();
    return normalizeUiPreferences(JSON.parse(raw));
  } catch {
    return getDefaultUiPreferences();
  }
}

export function applyUiPreferences(preferences: UiPreferences): void {
  if (typeof window === "undefined") return;
  const root = window.document.documentElement;
  root.classList.remove("ui-scale-compact", "ui-scale-normal", "ui-scale-large", "ui-fast-animations", "ui-high-contrast", "ui-colorblind", "ui-font-boost");

  if (preferences.scale === "COMPACT") {
    root.classList.add("ui-scale-compact");
  } else if (preferences.scale === "LARGE") {
    root.classList.add("ui-scale-large");
  } else {
    root.classList.add("ui-scale-normal");
  }

  if (preferences.fastAnimations) root.classList.add("ui-fast-animations");
  if (preferences.highContrast) root.classList.add("ui-high-contrast");
  if (preferences.colorblindAssist) root.classList.add("ui-colorblind");
  if (preferences.fontBoost) root.classList.add("ui-font-boost");
}

export function saveUiPreferences(preferences: UiPreferences): UiPreferences {
  const normalized = normalizeUiPreferences(preferences);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
    applyUiPreferences(normalized);
    window.dispatchEvent(new CustomEvent("ui-preferences:changed", { detail: normalized }));
  }
  return normalized;
}

