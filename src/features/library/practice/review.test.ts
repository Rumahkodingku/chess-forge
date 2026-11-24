import { describe, expect, it } from "vitest";
import {
  initialProgress,
  reviewProgress,
} from "@/features/library/practice/review";

const now = "2026-11-24T00:00:00.000Z";

describe("learning progress scheduler", () => {
  it("starts due immediately", () => {
    const progress = initialProgress("puzzle", "p1", now);
    expect(progress.attempts).toBe(0);
    expect(progress.nextReviewAt).toBe(now);
  });

  it("moves a correct answer to one day", () => {
    const progress = reviewProgress(
      initialProgress("puzzle", "p1", now),
      true,
      now,
    );
    expect(progress.intervalDays).toBe(1);
    expect(progress.nextReviewAt).toBe("2026-11-25T00:00:00.000Z");
    expect(progress.streak).toBe(1);
  });

  it("uses 1, 3, 7, 14, 30 day intervals", () => {
    let progress = initialProgress("puzzle", "p1", now);
    const intervals: number[] = [];
    for (let index = 0; index < 6; index += 1) {
      progress = reviewProgress(progress, true, now);
      intervals.push(progress.intervalDays);
    }
    expect(intervals).toEqual([1, 3, 7, 14, 30, 30]);
  });

  it("resets an incorrect answer", () => {
    let progress = initialProgress("puzzle", "p1", now);
    progress = reviewProgress(progress, true, now);
    progress = reviewProgress(progress, false, now);
    expect(progress.intervalDays).toBe(0);
    expect(progress.streak).toBe(0);
    expect(progress.nextReviewAt).toBe(now);
  });
});
