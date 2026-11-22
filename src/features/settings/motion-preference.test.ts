import { describe, expect, it } from "vitest";
import { applyMotionPreference } from "@/features/settings/motion-preference";
import { DEFAULT_SETTINGS } from "@/features/settings/types";

describe("applyMotionPreference", () => {
  it("sets the document motion mode from persisted settings", () => {
    applyMotionPreference({
      ...DEFAULT_SETTINGS,
      motionPreferences: { reducedMotion: true },
    });
    expect(document.documentElement.dataset.motion).toBe("reduced");

    applyMotionPreference(DEFAULT_SETTINGS);
    expect(document.documentElement.dataset.motion).toBe("full");
  });
});
