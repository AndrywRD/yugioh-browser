import Link from "next/link";
import type { Deck } from "@ruptura-arcana/shared";
import { GameCard } from "./GameCard";

interface CollectionPanelProps {
  playerLogged: boolean;
  loading: boolean;
  activeDeck: Deck | null;
  activeDeckTotal: number;
  collectionCount: number;
  fusionCount: number;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-900/65 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export function CollectionPanel({ playerLogged, loading, activeDeck, activeDeckTotal, collectionCount, fusionCount }: CollectionPanelProps) {
  if (!playerLogged) {
    return (
      <GameCard title="Colecao" subtitle="Entre para acessar seus decks e fusoes.">
        <p className="text-sm text-slate-300">O progresso de colecao e fusion log aparece apos login.</p>
      </GameCard>
    );
  }

  return (
    <div className="grid gap-3">
      <GameCard title="Resumo da Colecao" subtitle="Estado atual da conta">
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`collection-skeleton-${index}`} className="h-[68px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <SummaryItem label="Deck ativo" value={activeDeck ? `${activeDeck.name} (${activeDeckTotal}/40)` : "Sem deck"} />
            <SummaryItem label="Fusoes descobertas" value={String(fusionCount)} />
            <SummaryItem label="Cartas na colecao" value={String(collectionCount)} />
          </div>
        )}
      </GameCard>

      <GameCard title="Acoes de Colecao" subtitle="Atalhos rapidos">
        <div className="grid gap-2 sm:grid-cols-4">
          <Link href="/deck-builder" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Deck Builder
          </Link>
          <Link href="/fusion-log" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Fusion Log
          </Link>
          <Link href="/shop" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Card Trader
          </Link>
          <Link href="/profile" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Perfil
          </Link>
        </div>
      </GameCard>
    </div>
  );
}
