interface ProfileChipsProps {
  winsPve: number;
  winsPvp: number;
  gold: number;
}

function Chip({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="fm-chip inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
      <span aria-hidden>{icon}</span>
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export function ProfileChips({ winsPve, winsPvp, gold }: ProfileChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip icon="🏆" label="PVE" value={winsPve} />
      <Chip icon="⚔️" label="PVP" value={winsPvp} />
      <Chip icon="🪙" label="Gold" value={gold} />
    </div>
  );
}

