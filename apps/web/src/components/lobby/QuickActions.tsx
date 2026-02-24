import Link from "next/link";
import { GameCard } from "./GameCard";
import { LobbyIcon } from "./LobbyIcon";

interface QuickActionsProps {
  disabled?: boolean;
}

interface ActionItem {
  href: string;
  label: string;
  icon: "collection" | "profile";
  subtitle: string;
}

const ACTIONS: ActionItem[] = [
  {
    href: "/deck-builder",
    label: "Deck Builder",
    icon: "collection",
    subtitle: "Ajustar deck ativo"
  },
  {
    href: "/fusion-log",
    label: "Fusion Log",
    icon: "collection",
    subtitle: "Ver fusoes descobertas"
  },
  {
    href: "/profile",
    label: "Perfil",
    icon: "profile",
    subtitle: "Configurar conta"
  }
];

export function QuickActions({ disabled = false }: QuickActionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ACTIONS.map((action) => (
        <GameCard key={action.href} className="p-0">
          {disabled ? (
            <div className="flex items-center justify-between rounded-lg px-4 py-3 opacity-55">
              <div>
                <p className="text-sm font-semibold text-slate-100">{action.label}</p>
                <p className="text-xs text-slate-300">{action.subtitle}</p>
              </div>
              <LobbyIcon kind={action.icon} className="h-5 w-5" />
            </div>
          ) : (
            <Link
              href={action.href}
              className="lobby-pressable flex items-center justify-between rounded-lg px-4 py-3 transition hover:bg-cyan-400/5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">{action.label}</p>
                <p className="text-xs text-slate-300">{action.subtitle}</p>
              </div>
              <LobbyIcon kind={action.icon} className="h-5 w-5" />
            </Link>
          )}
        </GameCard>
      ))}
    </div>
  );
}
