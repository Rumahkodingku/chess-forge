import fixture from "@/features/studio/fixtures/r4-project.json";
import { normalizeProject } from "@/features/studio/scene/project-normalization";
import type { VideoProject } from "@/features/studio/scene/scene.types";

export const R4_FIXTURE_PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export function createR4FixtureProject(): VideoProject {
  return normalizeProject(fixture);
}
