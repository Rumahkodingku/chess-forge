"use client";

import { Audio } from "@remotion/media";
import { Chess } from "chess.js";
import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BoardSvg } from "@/features/studio/rendering/board-svg";

function positionAfterE4() {
  const chess = new Chess();
  chess.move("e4");
  return chess.fen();
}

export function ExportPocComposition() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const boardSize = isPortrait ? width * 0.84 : height * 0.76;
  const afterE4 = useMemo(positionAfterE4, []);
  const progress = interpolate(frame, [26, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [0, 14, 130, 150], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 18%, #1a1712 0%, #0a0a0b 46%, #070708 100%)",
        color: "#ededf0",
        fontFamily: "Geist, Arial, Helvetica, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: isPortrait ? 72 : 64,
          left: isPortrait ? 72 : 96,
          right: isPortrait ? 72 : 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: titleOpacity,
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 28,
              background: "#e8b45a",
              borderRadius: 2,
            }}
          />
          <span
            style={{
              fontSize: 15,
              letterSpacing: "0.02em",
              color: "#a1a1aa",
            }}
          >
            ChessForge / R0 export proof
          </span>
        </div>
        <span style={{ fontSize: 15, color: "#71717a" }}>1080p / 30 fps</span>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: isPortrait ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: isPortrait ? 44 : 96,
          padding: isPortrait ? "180px 72px 90px" : "120px 96px",
        }}
      >
        <div
          style={{
            width: boardSize,
            maxWidth: "100%",
            borderRadius: 22,
            padding: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 40px 100px -50px rgba(0,0,0,0.95)",
            opacity: titleOpacity,
          }}
        >
          <BoardSvg
            fen={afterE4}
            lastMove="e2e4"
            coordinates
            animation={{
              from: "e2",
              to: "e4",
              color: "w",
              type: "p",
              progress,
            }}
            label="Chessboard during the export proof"
          />
        </div>

        <div
          style={{
            width: isPortrait ? "100%" : 380,
            textAlign: isPortrait ? "center" : "left",
            opacity: titleOpacity,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              letterSpacing: "0.02em",
              color: "#e8b45a",
            }}
          >
            Frame accurate
          </p>
          <h1
            style={{
              margin: "18px 0 0",
              fontSize: isPortrait ? 64 : 58,
              lineHeight: 1.02,
              letterSpacing: "-0.05em",
              fontWeight: 600,
              color: "#f4f4f5",
            }}
          >
            The move,
            <br />
            rendered.
          </h1>
          <p
            style={{
              margin: "24px 0 0",
              fontSize: 22,
              lineHeight: 1.5,
              color: "#a1a1aa",
            }}
          >
            A legal move becomes a deterministic frame sequence. This proof
            checks the render path, not the final template system.
          </p>
          <div
            style={{
              marginTop: 34,
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              border: "1px solid rgba(232,180,90,0.35)",
              borderRadius: 999,
              padding: "10px 16px 10px 12px",
              color: "#ededf0",
              fontSize: 16,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#e8b45a",
              }}
            />
            1. e4
          </div>
        </div>
      </div>

      <Sequence from={24} durationInFrames={18}>
        <Audio src="/audio/sfx/move.wav" volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
}
