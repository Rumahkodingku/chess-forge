import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BoardSvg } from "@/features/studio/rendering/board-svg";
import type { Annotation } from "@/features/studio/scene/scene.types";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const annotation: Annotation = {
  id: "arrow-1",
  type: "arrow",
  from: "e2",
  to: "e4",
  color: "red",
  startFrame: 0,
  durationInFrames: 30,
};

describe("BoardSvg", () => {
  it("renders the selected theme and coordinates", () => {
    const html = renderToStaticMarkup(
      <BoardSvg
        fen={START_FEN}
        theme="classic"
        coordinates
        label="Classic board"
      />,
    );
    expect(html).toContain("#f0d9b5");
    expect(html).toContain("#b58863");
    expect(html).toContain("Classic board");
  });

  it("renders moving pieces, annotations, and checkmate emphasis", () => {
    const html = renderToStaticMarkup(
      <BoardSvg
        fen={START_FEN}
        lastMove="e2e4"
        checkSquare="e1"
        checkmate
        animations={[
          {
            from: "e2",
            to: "e4",
            color: "w",
            type: "p",
            progress: 0.5,
          },
        ]}
        annotations={[annotation]}
        frame={10}
        label="Animated board"
      />,
    );
    expect(html).toContain("data-moving-piece");
    expect(html).toContain("r4-arrow-arrow-1");
    expect(html).toContain("#f87171");
    expect(html).toContain("rgba(232,180,90,0.95)");
  });

  it("skips annotations with invalid squares", () => {
    const html = renderToStaticMarkup(
      <BoardSvg
        fen={START_FEN}
        annotations={[
          {
            ...annotation,
            id: "bad-arrow",
            from: "z9",
            to: "e4",
          },
        ]}
        frame={10}
        label="Invalid annotation board"
      />,
    );
    expect(html).not.toContain("bad-arrow");
    expect(html).not.toContain("r4-arrow");
  });
});
