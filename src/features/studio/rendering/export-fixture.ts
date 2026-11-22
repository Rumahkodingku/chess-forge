import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";
import type { VideoProject } from "@/features/studio/scene/scene.types";

export type ExportFixtureVariant = "portrait" | "landscape";

const dimensions: Record<
  ExportFixtureVariant,
  { width: number; height: number }
> = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
};

export function createExportFixtureProject(
  variant: ExportFixtureVariant,
): VideoProject {
  const game = parseSinglePgn(R1_FIXTURE_PGN, "pgn-text", "R1 export fixture");
  const base = createWalkingSkeletonProject({ game, selectedPly: 1 });
  const canvas = dimensions[variant];
  const scene = base.scenes[0];

  return {
    ...base,
    name: "R1 export proof",
    canvas: {
      aspectRatio: variant === "portrait" ? "9:16" : "16:9",
      ...canvas,
    },
    scenes: scene
      ? [
          {
            ...scene,
            durationInFrames: 150,
            textOverlays: scene.textOverlays.map((overlay) => ({
              ...overlay,
              durationInFrames: 150,
            })),
          },
        ]
      : [],
  };
}
