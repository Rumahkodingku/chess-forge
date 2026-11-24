import {
  type LearningItemType,
  type LearningProgress,
  learningProgressSchema,
  progressId,
} from "@/features/library/schemas";

const INTERVALS = [1, 3, 7, 14, 30] as const;

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function initialProgress(
  itemType: LearningItemType,
  itemId: string,
  now = new Date().toISOString(),
): LearningProgress {
  return learningProgressSchema.parse({
    id: progressId(itemType, itemId),
    itemType,
    itemId,
    attempts: 0,
    correct: 0,
    streak: 0,
    intervalDays: 0,
    nextReviewAt: now,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  });
}

export function reviewProgress(
  progress: LearningProgress,
  correct: boolean,
  now = new Date().toISOString(),
): LearningProgress {
  const streak = correct ? progress.streak + 1 : 0;
  const intervalDays = correct
    ? INTERVALS[Math.min(streak - 1, INTERVALS.length - 1)]
    : 0;
  return learningProgressSchema.parse({
    ...progress,
    attempts: progress.attempts + 1,
    correct: progress.correct + (correct ? 1 : 0),
    streak,
    intervalDays,
    nextReviewAt: correct ? addDays(now, intervalDays) : now,
    lastResult: correct ? "correct" : "incorrect",
    lastReviewedAt: now,
    updatedAt: now,
  });
}
