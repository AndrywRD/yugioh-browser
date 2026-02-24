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
    <nav className="fm-scroll flex gap-2 overflow-x-auto rounded-xl border border-[#cfa75d]/45 bg-[linear-gradient(180deg,rgba(7,18,38,0.9),rgba(5,12,30,0.92))] p-2">
      {TAB_ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.key)}
            className={`lobby-pressable lobby-tab-button inline-flex min-w-[132px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${
              isActive
                ? "lobby-tab-button-active border-amber-200/85 bg-[linear-gradient(180deg,rgba(174,118,28,0.94),rgba(115,76,18,0.98))] text-amber-50 shadow-[inset_0_1px_0_rgba(255,233,181,0.28)]"
                : "border-amber-200/35 bg-[linear-gradient(180deg,rgba(15,39,74,0.9),rgba(9,26,52,0.92))] text-slate-100 hover:border-amber-200/70 hover:-translate-y-0.5"
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
