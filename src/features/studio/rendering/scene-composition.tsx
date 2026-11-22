"use client";

import { Audio } from "@remotion/media";
import { Chess, type Square } from "chess.js";
import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BoardSvg } from "@/features/studio/rendering/board-svg";
import type { Scene, VideoProject } from "@/features/studio/scene/scene.types";

export interface SceneCompositionProps {
  project: VideoProject;
  scene: Scene;
}

export function SceneComposition({ project, scene }: SceneCompositionProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const boardSize = isPortrait ? width * 0.84 : height * 0.76;
  const progress = interpolate(frame, [10, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fade = interpolate(
    frame,
    [0, 12, scene.durationInFrames - 8, scene.durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const move = useMemo(() => {
    if (!scene.moveRange) return undefined;
    return project.gameSnapshot?.moves.find(
      (candidate) => candidate.ply === scene.moveRange?.fromPly,
    );
  }, [project.gameSnapshot?.moves, scene.moveRange]);

  const movingPiece = useMemo(() => {
    if (!move) return undefined;
    try {
      const chess = new Chess(scene.boardState.fen);
      const piece = chess.get(move.uci.slice(0, 2) as Square);
      if (!piece) return undefined;
      return {
        from: move.uci.slice(0, 2),
        to: move.uci.slice(2, 4),
        color: piece.color,
        type: piece.type,
      };
    } catch {
      return undefined;
    }
  }, [move, scene.boardState.fen]);

  const boardFen = move?.fenAfter ?? scene.boardState.fen;
  const label = scene.textOverlays[0]?.text;
  const players = project.gameSnapshot
    ? `${project.gameSnapshot.metadata.white} vs ${project.gameSnapshot.metadata.black}`
    : project.name;

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
          top: isPortrait ? 64 : 56,
          left: isPortrait ? 64 : 88,
          right: isPortrait ? 64 : 88,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: fade,
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
          <span style={{ fontSize: 15, color: "#a1a1aa" }}>{players}</span>
        </div>
        <span style={{ fontSize: 15, color: "#71717a" }}>
          {scene.durationInFrames / 30}s / 30 fps
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: isPortrait ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: isPortrait ? 34 : 72,
          padding: isPortrait ? "150px 64px 70px" : "100px 88px",
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
            opacity: fade,
          }}
        >
          <BoardSvg
            fen={boardFen}
            lastMove={move?.uci}
            coordinates
            animation={
              movingPiece
                ? {
                    ...movingPiece,
                    progress,
                  }
                : undefined
            }
            label="Chessboard scene"
          />
        </div>

        <div
          style={{
            width: isPortrait ? "100%" : 340,
            textAlign: isPortrait ? "center" : "left",
            opacity: fade,
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "#e8b45a" }}>
            ChessForge scene
          </p>
          <h1
            style={{
              margin: "14px 0 0",
              fontSize: isPortrait ? 58 : 52,
              lineHeight: 1.02,
              letterSpacing: "-0.05em",
              fontWeight: 600,
              color: "#f4f4f5",
            }}
          >
            {label ?? project.name}
          </h1>
          <p
            style={{
              margin: "18px 0 0",
              fontSize: 19,
              lineHeight: 1.5,
              color: "#a1a1aa",
            }}
          >
            One move, one scene, one deterministic export.
          </p>
        </div>
      </div>

      <Sequence from={10} durationInFrames={20}>
        <Audio src="/audio/sfx/move.wav" volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
}
