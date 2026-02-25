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
      <GameCard title="Tutorial" subtitle="Entre com sua conta para liberar as licoes iniciais.">
        <p className="text-sm text-slate-300">O tutorial guiado ensina invocacao, set, fusao e resposta de trap.</p>
      </GameCard>
    );
  }

  const resolvedProgress = progress ?? { completedLessons: [], updatedAt: Date.now() };
  const completedCount = lessons.filter((lesson) => isTutorialLessonCompleted(resolvedProgress, lesson.id)).length;
  const total = lessons.length;
  const nextLesson = getNextTutorialLesson(resolvedProgress);
  const done = isTutorialCompleted(resolvedProgress);

  if (done) {
    return (
      <GameCard title="Tutorial" subtitle="Concluido. Voce pode revisar licoes quando quiser.">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <p>Todas as licoes foram conclu idas.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => nextLesson && onStartLesson(nextLesson)}
              disabled={loading || busy || !nextLesson}
              className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              Revisar
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={loading || busy}
              className="rounded-md border border-slate-500/70 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Resetar
            </button>
          </div>
        </div>
      </GameCard>
    );
  }

  return (
    <GameCard title="Tutorial" subtitle="Conclua 3 licoes para dominar o fluxo basico.">
      <div className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded bg-emerald-400/75 transition-all" style={{ width: `${Math.round((completedCount / Math.max(1, total)) * 100)}%` }} />
        </div>

        <ul className="space-y-1.5 text-xs text-slate-200">
          {lessons.map((lesson) => {
            const completed = isTutorialLessonCompleted(resolvedProgress, lesson.id);
            return (
              <li key={lesson.id} className="flex items-start gap-2 rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1.5">
                <span className={completed ? "text-emerald-300" : "text-slate-400"}>{completed ? "[x]" : "[ ]"}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100">{lesson.title}</p>
                  <p className="line-clamp-1 text-[11px] text-slate-300">{lesson.description}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => nextLesson && onStartLesson(nextLesson)}
            disabled={loading || busy || !nextLesson}
            className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {`Continuar licao ${nextLesson ?? "?"}`}
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
