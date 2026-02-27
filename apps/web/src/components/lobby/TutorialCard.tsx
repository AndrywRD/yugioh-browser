import type { TutorialProgress, TutorialLessonDefinition, TutorialLessonId } from "../../lib/tutorial";
import { getNextTutorialLesson, isTutorialLessonCompleted } from "../../lib/tutorial";
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

function badgeClass(state: "DONE" | "AVAILABLE" | "LOCKED"): string {
  if (state === "DONE") return "bg-emerald-600/80 border-emerald-200/80 text-white";
  if (state === "AVAILABLE") return "bg-transparent border-slate-200/80 text-slate-100";
  return "bg-slate-700/80 border-slate-500/80 text-slate-200";
}

export function TutorialCard({ playerLogged, loading, progress, onStartLesson, onReset, lessons, busy = false }: TutorialCardProps) {
  if (!playerLogged) {
    return (
      <GameCard title="TUTORIAL">
        <p className="text-sm text-slate-300">Entre com sua conta para desbloquear as licoes iniciais.</p>
      </GameCard>
    );
  }

  const resolvedProgress: TutorialProgress = progress ?? { completedLessons: [], updatedAt: 0 };
  const lesson1Done = isTutorialLessonCompleted(resolvedProgress, "1");
  const lesson2Done = isTutorialLessonCompleted(resolvedProgress, "2");
  const lesson3Done = isTutorialLessonCompleted(resolvedProgress, "3");
  const lesson2Available = lesson1Done && !lesson2Done;
  const lesson3Available = lesson2Done && !lesson3Done;
  const nextLesson = getNextTutorialLesson(resolvedProgress);
  const nextLessonLabel = nextLesson ? lessons.find((lesson) => lesson.id === nextLesson)?.title ?? `Licao ${nextLesson}` : "Concluido";

  return (
    <GameCard title="TUTORIAL">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${badgeClass("DONE")}`}>OK</div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${badgeClass(
              lesson2Available || lesson2Done ? "AVAILABLE" : "LOCKED"
            )}`}
          >
            {lesson2Done ? "OK" : "[ ]"}
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-bold ${badgeClass(
              lesson3Available || lesson3Done ? "AVAILABLE" : "LOCKED"
            )}`}
          >
            {lesson3Done ? "OK" : "LOCK"}
          </div>
        </div>

        <p className="text-xs text-slate-200">Licao 1: Basico (Concluido) | Proxima: {nextLessonLabel}</p>

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
