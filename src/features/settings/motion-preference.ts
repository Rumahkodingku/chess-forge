import type { ApplicationSettings } from "@/features/settings/types";

export function applyMotionPreference(settings: ApplicationSettings): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.motion = settings.motionPreferences
    .reducedMotion
    ? "reduced"
    : "full";
}
