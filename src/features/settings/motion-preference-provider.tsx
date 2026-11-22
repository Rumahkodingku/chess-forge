"use client";

import { useEffect } from "react";
import { applyMotionPreference } from "@/features/settings/motion-preference";
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import {
  createSettingsRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";

export function MotionPreferenceProvider() {
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const settings =
          (await createSettingsRepository(db).get()) ?? DEFAULT_SETTINGS;
        if (!cancelled) applyMotionPreference(settings);
      } catch {
        if (!cancelled) applyMotionPreference(DEFAULT_SETTINGS);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
