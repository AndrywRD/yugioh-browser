import { LobbyIcon } from "./LobbyIcon";
import type { LobbySection } from "./types";

interface LobbyTabsProps {
  active: LobbySection;
  onChange: (section: LobbySection) => void;
  disabled?: boolean;
}

const TAB_ITEMS: Array<{ key: LobbySection; label: string; icon: "campaign" | "online" | "collection" | "profile" }> = [
  { key: "CAMPAIGN", label: "Campanha", icon: "campaign" },
  { key: "ONLINE", label: "Online", icon: "online" },
  { key: "COLLECTION", label: "Colecao", icon: "collection" },
  { key: "PROFILE", label: "Perfil", icon: "profile" }
];

export function LobbyTabs({ active, onChange, disabled = false }: LobbyTabsProps) {
  return (
    <nav className="fm-scroll flex gap-2 overflow-x-auto rounded-xl border border-[#cfa75d]/35 bg-[linear-gradient(180deg,rgba(7,17,36,0.82),rgba(5,11,27,0.86))] p-1.5">
      {TAB_ITEMS.map((item) => {
        const isActive = item.key === active;
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
            <LobbyIcon kind={item.icon} className="h-3.5 w-3.5" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
