import type { MoveAssessment } from "@/features/analysis/types";

export function mergeAssessments(
  current: MoveAssessment[],
  incoming: MoveAssessment[],
): MoveAssessment[] {
  const byPly = new Map(
    current.map((assessment) => [assessment.ply, assessment]),
  );
  for (const assessment of incoming) {
    byPly.set(assessment.ply, assessment);
  }
  return [...byPly.values()].sort((left, right) => left.ply - right.ply);
}
