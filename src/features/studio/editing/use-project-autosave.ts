"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { toErrorMessage } from "@/lib/errors";

export type ProjectSaveState = "idle" | "saving" | "saved" | "error";

export interface UseProjectAutosaveInput {
  project: VideoProject | null;
  enabled: boolean;
  save: (project: VideoProject) => Promise<void>;
  delayMs?: number;
}

export function useProjectAutosave({
  project,
  enabled,
  save,
  delayMs = 800,
}: UseProjectAutosaveInput) {
  const [state, setState] = useState<ProjectSaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const projectRef = useRef(project);
  const saveRef = useRef(save);
  const lastSavedRef = useRef(project);
  const requestRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const enabledRef = useRef(false);

  projectRef.current = project;
  saveRef.current = save;

  useEffect(() => {
    if (enabled && !enabledRef.current) {
      enabledRef.current = true;
      lastSavedRef.current = projectRef.current;
    }
    if (!enabled) {
      enabledRef.current = false;
    }
  }, [enabled]);

  const runSave = useCallback(
    async (target: VideoProject): Promise<boolean> => {
      const request = ++requestRef.current;
      setState("saving");
      setError(null);
      try {
        await saveRef.current(target);
        lastSavedRef.current = target;
        dirtyRef.current = projectRef.current !== target;
        setDirty(dirtyRef.current);
        if (requestRef.current === request) {
          setState(dirtyRef.current ? "saving" : "saved");
        }
        return true;
      } catch (saveError) {
        dirtyRef.current = true;
        setDirty(true);
        if (requestRef.current === request) {
          setState("error");
          setError(toErrorMessage(saveError));
        }
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !project) return;
    if (project === lastSavedRef.current) return;
    dirtyRef.current = true;
    setDirty(true);
    requestRef.current += 1;
    setState("saving");
    setError(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runSave(project);
    }, delayMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [delayMs, enabled, project, runSave]);

  const saveNow = useCallback(async () => {
    const target = projectRef.current;
    if (!target) return false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return runSave(target);
  }, [runSave]);

  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return;
      const target = projectRef.current;
      if (!target) return;
      void saveRef.current(target).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return {
    state,
    error,
    dirty,
    saveNow,
    retry: saveNow,
  };
}
