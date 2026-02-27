import { LobbyIcon } from "./LobbyIcon";
import type { LobbySection } from "./types";

interface LobbyTabsProps {
  active: LobbySection;
  onChange: (section: LobbySection) => void;
  disabled?: boolean;
  badges?: Partial<Record<LobbySection, number>>;
  profileAvatarUrl?: string | null;
}

const TAB_ITEMS: Array<{ key: LobbySection; label: string; icon: "campaign" | "online" | "collection" | "friends" | "ranking" | "profile" }> = [
  { key: "CAMPAIGN", label: "Campanha", icon: "campaign" },
  { key: "ONLINE", label: "Online", icon: "online" },
  { key: "FRIENDS", label: "Amigos", icon: "friends" },
  { key: "RANKING", label: "Ranking", icon: "ranking" },
  { key: "PROFILE", label: "Perfil", icon: "profile" }
];

export function LobbyTabs({ active, onChange, disabled = false, badges, profileAvatarUrl }: LobbyTabsProps) {
  return (
    <nav className="fm-scroll flex gap-2 overflow-x-auto rounded-xl border border-[#cfa75d]/35 bg-[linear-gradient(180deg,rgba(7,17,36,0.82),rgba(5,11,27,0.86))] p-1.5">
      {TAB_ITEMS.map((item) => {
        const isActive = item.key === active;
        const badge = Math.max(0, badges?.[item.key] ?? 0);
        return (
          <button
            key={item.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.key)}
            className={`lobby-pressable lobby-tab-button inline-flex min-w-[130px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.07em] transition ${
              isActive
                ? "lobby-tab-button-active border-amber-200/75 bg-[linear-gradient(180deg,rgba(150,102,28,0.86),rgba(95,63,16,0.9))] text-amber-50"
                : "border-slate-600/65 bg-[linear-gradient(180deg,rgba(12,29,58,0.66),rgba(8,20,42,0.72))] text-slate-200 hover:border-amber-200/45"
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            {item.key === "PROFILE" && profileAvatarUrl ? (
              <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-amber-300/60 bg-slate-900/80">
                <img src={profileAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              </span>
            ) : (
              <LobbyIcon kind={item.icon} className="h-3.5 w-3.5" />
            )}
            {item.label}
            {badge > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full border border-rose-300/70 bg-rose-900/70 px-1 py-0.5 text-[10px] font-bold text-rose-100">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
