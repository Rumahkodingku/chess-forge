import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { R1_FIXTURE_PGN } from "@/features/games/fixtures/r1-walking-skeleton";
import { parseSinglePgn } from "@/features/games/pgn";
import { useProjectAutosave } from "@/features/studio/editing/use-project-autosave";
import { createWalkingSkeletonProject } from "@/features/studio/project-factory";

const game = parseSinglePgn(R1_FIXTURE_PGN);
const base = createWalkingSkeletonProject({ game, selectedPly: 1 });
const next = { ...base, name: "Changed" };

describe("useProjectAutosave", () => {
  it("debounces a project change and reports saved", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const { result, rerender } = renderHook(
      ({ project }) =>
        useProjectAutosave({ project, enabled: true, save, delayMs: 800 }),
      { initialProps: { project: base } },
    );

    rerender({ project: next });
    expect(result.current.state).toBe("saving");
    await act(async () => {
      vi.advanceTimersByTime(799);
    });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledWith(next);
    expect(result.current.state).toBe("saved");
    vi.useRealTimers();
  });

  it("reports an error and retries the current project", async () => {
    vi.useFakeTimers();
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValueOnce(undefined);
    const { result, rerender } = renderHook(
      ({ project }) =>
        useProjectAutosave({ project, enabled: true, save, delayMs: 800 }),
      { initialProps: { project: base } },
    );

    rerender({ project: next });
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });
    expect(result.current.state).toBe("error");
    expect(result.current.error).toContain("disk full");

    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.state).toBe("saved");
    expect(save).toHaveBeenLastCalledWith(next);
    vi.useRealTimers();
  });

  it("reports a failed saveNow so callers can block dependent actions", async () => {
    const save = vi.fn().mockRejectedValue(new Error("disk full"));
    const { result } = renderHook(() =>
      useProjectAutosave({ project: base, enabled: true, save }),
    );

    await act(async () => {
      expect(await result.current.saveNow()).toBe(false);
    });
    expect(result.current.state).toBe("error");
  });

  it("does not save while disabled", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const { rerender } = renderHook(
      ({ project }) =>
        useProjectAutosave({ project, enabled: false, save, delayMs: 800 }),
      { initialProps: { project: base } },
    );
    rerender({ project: next });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(save).not.toHaveBeenCalled();
    vi.useRealTimers();
    await waitFor(() => expect(true).toBe(true));
  });
});
