"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createHistory,
  type ProjectHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/features/studio/editing/history";
import type { VideoProject } from "@/features/studio/scene/scene.types";

export function useProjectEditor(initialProject: VideoProject | null) {
  const [history, setHistory] = useState<ProjectHistory | null>(() =>
    initialProject ? createHistory(initialProject) : null,
  );

  useEffect(() => {
    if (initialProject) {
      setHistory(createHistory(initialProject));
    }
  }, [initialProject]);

  const update = useCallback(
    (mutator: (project: VideoProject) => VideoProject) => {
      setHistory((current) =>
        current ? pushHistory(current, mutator(current.present)) : current,
      );
    },
    [],
  );

  const undo = useCallback(() => {
    setHistory((current) => (current ? undoHistory(current) : current));
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => (current ? redoHistory(current) : current));
  }, []);

  return {
    project: history?.present ?? initialProject,
    update,
    undo,
    redo,
    canUndo: Boolean(history?.past.length),
    canRedo: Boolean(history?.future.length),
  };
}
