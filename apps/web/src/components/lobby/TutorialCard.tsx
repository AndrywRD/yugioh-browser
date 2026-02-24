import type { TutorialProgress, TutorialLessonDefinition, TutorialLessonId } from "../../lib/tutorial";
import { getNextTutorialLesson, isTutorialCompleted, isTutorialLessonCompleted } from "../../lib/tutorial";
import { GameCard } from "./GameCard";

interface TutorialCardProps {
  playerLogged: boolean;
  loading: boolean;
  progress: TutorialProgress | null;
  onStartLesson: (lessonId: TutorialLessonId) => void;
  onReset: () => void;
  lessons: TutorialLessonDefinition[];
  busy?: boolean;
}

export function TutorialCard({ playerLogged, loading, progress, onStartLesson, onReset, lessons, busy = false }: TutorialCardProps) {
  if (!playerLogged) {
    return (
      <GameCard title="Tutorial de Duelo" subtitle="Aprenda o basico antes de entrar em ranked/PvP">
        <p className="text-sm text-slate-200/90">Entre com sua conta para liberar o tutorial guiado em 3 licoes.</p>
      </GameCard>
    );
  }

  const resolvedProgress = progress ?? { completedLessons: [], updatedAt: Date.now() };
  const completedCount = lessons.filter((lesson) => isTutorialLessonCompleted(resolvedProgress, lesson.id)).length;
  const total = lessons.length;
  const nextLesson = getNextTutorialLesson(resolvedProgress);
  const done = isTutorialCompleted(resolvedProgress);
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <GameCard title="Tutorial de Duelo" subtitle="3 licoes praticas para dominar o fluxo base do jogo.">
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/55 p-2.5">
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-200">
            <span>Progresso do tutorial</span>
            <span>
              {completedCount}/{total} ({pct}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-slate-800">
            <div className="h-full rounded bg-emerald-400/75 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-3">
          {lessons.map((lesson) => {
            const completed = isTutorialLessonCompleted(resolvedProgress, lesson.id);
            return (
              <li key={lesson.id} className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-2">
                <p className="text-xs font-semibold text-amber-100">{lesson.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-300">{lesson.description}</p>
                <p className={`mt-1 text-[11px] ${completed ? "text-emerald-300" : "text-slate-400"}`}>
                  {completed ? "Concluida" : "Pendente"}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => nextLesson && onStartLesson(nextLesson)}
            disabled={loading || busy || !nextLesson}
            className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {done ? "Tutorial concluido" : `Continuar: Licao ${nextLesson ?? "?"}`}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading || busy}
            className="rounded-md border border-slate-500/70 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Resetar tutorial
          </button>
        </div>
      </div>
    </GameCard>
  );
}
