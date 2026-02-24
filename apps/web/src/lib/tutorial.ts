export type TutorialLessonId = "1" | "2" | "3";

export interface TutorialObjectiveDefinition {
  key: string;
  label: string;
}

export interface TutorialLessonDefinition {
  id: TutorialLessonId;
  title: string;
  description: string;
  objectives: TutorialObjectiveDefinition[];
}

export interface TutorialProgress {
  completedLessons: TutorialLessonId[];
  updatedAt: number;
}

export const TUTORIAL_PROGRESS_STORAGE_KEY = "ruptura_arcana_tutorial_progress_v1";

export const TUTORIAL_LESSONS: TutorialLessonDefinition[] = [
  {
    id: "1",
    title: "Licao 1 - Invocacao e Ataque",
    description: "Aprenda a colocar um monstro em campo, atacar e finalizar o turno.",
    objectives: [
      { key: "summon_monster", label: "Invocar 1 monstro em ATK" },
      { key: "declare_attack", label: "Declarar 1 ataque" },
      { key: "end_turn_once", label: "Finalizar o turno" }
    ]
  },
  {
    id: "2",
    title: "Licao 2 - Set e Controle de Campo",
    description: "Treine set de monstro e uso de zona de spell/trap.",
    objectives: [
      { key: "set_monster", label: "Setar 1 monstro em DEF face-down" },
      { key: "flip_summon", label: "Executar 1 Flip Summon" },
      { key: "set_spell_trap", label: "Setar 1 Spell/Trap no campo" }
    ]
  },
  {
    id: "3",
    title: "Licao 3 - Fusao e Fechamento",
    description: "Conecte materiais para fusao e conclua um duelo.",
    objectives: [
      { key: "perform_fusion", label: "Executar 1 tentativa de fusao" },
      { key: "win_duel", label: "Vencer a partida" }
    ]
  }
];

function normalizeLessonId(value: unknown): TutorialLessonId | null {
  if (value === "1" || value === "2" || value === "3") return value;
  return null;
}

function normalizeProgress(value: unknown): TutorialProgress {
  if (!value || typeof value !== "object") {
    return {
      completedLessons: [],
      updatedAt: Date.now()
    };
  }
  const input = value as Partial<TutorialProgress>;
  const completedLessons = Array.isArray(input.completedLessons)
    ? input.completedLessons
        .map((lesson) => normalizeLessonId(lesson))
        .filter((lesson): lesson is TutorialLessonId => Boolean(lesson))
    : [];

  return {
    completedLessons: Array.from(new Set(completedLessons)),
    updatedAt: typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt) ? input.updatedAt : Date.now()
  };
}

export function getTutorialLesson(lessonId: string | null | undefined): TutorialLessonDefinition | null {
  if (!lessonId) return null;
  const normalized = normalizeLessonId(lessonId);
  if (!normalized) return null;
  return TUTORIAL_LESSONS.find((lesson) => lesson.id === normalized) ?? null;
}

export function loadTutorialProgress(): TutorialProgress {
  if (typeof window === "undefined") {
    return {
      completedLessons: [],
      updatedAt: Date.now()
    };
  }
  try {
    const raw = window.localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return {
        completedLessons: [],
        updatedAt: Date.now()
      };
    }
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return {
      completedLessons: [],
      updatedAt: Date.now()
    };
  }
}

function persistTutorialProgress(progress: TutorialProgress): TutorialProgress {
  const normalized = normalizeProgress(progress);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function resetTutorialProgress(): TutorialProgress {
  return persistTutorialProgress({
    completedLessons: [],
    updatedAt: Date.now()
  });
}

export function isTutorialLessonCompleted(progress: TutorialProgress, lessonId: TutorialLessonId): boolean {
  return progress.completedLessons.includes(lessonId);
}

export function getNextTutorialLesson(progress: TutorialProgress): TutorialLessonId | null {
  for (const lesson of TUTORIAL_LESSONS) {
    if (!progress.completedLessons.includes(lesson.id)) return lesson.id;
  }
  return null;
}

export function isTutorialCompleted(progress: TutorialProgress): boolean {
  return TUTORIAL_LESSONS.every((lesson) => progress.completedLessons.includes(lesson.id));
}

export function completeTutorialLesson(lessonId: TutorialLessonId): TutorialProgress {
  const current = loadTutorialProgress();
  if (current.completedLessons.includes(lessonId)) return current;
  return persistTutorialProgress({
    completedLessons: [...current.completedLessons, lessonId],
    updatedAt: Date.now()
  });
}

export function buildTutorialMatchUrl(input: { lessonId: TutorialLessonId; username?: string }): string {
  const params = new URLSearchParams();
  params.set("autoSolo", "1");
  params.set("tutorial", "1");
  params.set("lesson", input.lessonId);
  if (input.username) params.set("username", input.username);
  return `/match?${params.toString()}`;
}
