"use client";

import { Audio } from "@remotion/media";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { sceneSfxSchedule } from "@/features/studio/rendering/audio";
import { boardStateAtFrame } from "@/features/studio/rendering/board-state";
import { BoardSvg } from "@/features/studio/rendering/board-svg";
import {
  cameraAtFrame,
  clampCameraToSquares,
} from "@/features/studio/rendering/camera";
import type {
  GameSnapshot,
  Scene,
  TextOverlay,
  VideoProject,
} from "@/features/studio/scene/scene.types";

export interface SceneCompositionProps {
  project: VideoProject;
  scene: Scene;
}

const FONT_FAMILY: Record<TextOverlay["font"], string> = {
  display: "Geist, Arial, Helvetica, sans-serif",
  body: "Geist, Arial, Helvetica, sans-serif",
  mono: "Geist Mono, ui-monospace, SFMono-Regular, monospace",
};

const TEXT_COLOR: Record<TextOverlay["color"], string> = {
  foreground: "#f4f4f5",
  muted: "#a1a1aa",
  brand: "#e8b45a",
  danger: "#f87171",
};

function textPositionStyle(overlay: TextOverlay): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    width: `${overlay.maxWidth}%`,
    textAlign: overlay.align,
    fontFamily: FONT_FAMILY[overlay.font],
    color: TEXT_COLOR[overlay.color],
  };
  if (overlay.position === "top") {
    return {
      ...base,
      top: `${overlay.y}%`,
      ...(overlay.align === "center"
        ? { left: `calc(50% + ${overlay.x}%)`, transform: "translateX(-50%)" }
        : overlay.align === "right"
          ? { right: `${overlay.x}%` }
          : { left: `${overlay.x}%` }),
    };
  }
  if (overlay.position === "bottom") {
    return {
      ...base,
      bottom: `${overlay.y}%`,
      ...(overlay.align === "center"
        ? { left: `calc(50% + ${overlay.x}%)`, transform: "translateX(-50%)" }
        : overlay.align === "right"
          ? { right: `${overlay.x}%` }
          : { left: `${overlay.x}%` }),
    };
  }
  if (overlay.position === "left") {
    return {
      ...base,
      left: `${overlay.x}%`,
      top: `${50 + overlay.y}%`,
      transform: "translateY(-50%)",
    };
  }
  if (overlay.position === "right") {
    return {
      ...base,
      right: `${overlay.x}%`,
      top: `${50 + overlay.y}%`,
      transform: "translateY(-50%)",
    };
  }
  return {
    ...base,
    left: `${50 + overlay.x}%`,
    top: `${50 + overlay.y}%`,
    transform: "translate(-50%, -50%)",
  };
}

function staticSnapshot(scene: Scene): GameSnapshot {
  return {
    metadata: { white: "ChessForge", black: "ChessForge", result: "*" },
    initialFen: scene.boardState.fen,
    moves: [],
  };
}

export function SceneComposition({ project, scene }: SceneCompositionProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const snapshot = project.gameSnapshot ?? staticSnapshot(scene);
  const board = boardStateAtFrame(scene, snapshot, frame);
  const activeSquares = board.animations.flatMap((animation) => [
    animation.from,
    animation.to,
  ]);
  const camera = clampCameraToSquares(
    cameraAtFrame(scene.camera.keyframes, frame),
    activeSquares,
    scene.boardState.orientation,
  );
  const isPortrait = height > width;
  const boardSize = Math.min(width * 0.84, height * (isPortrait ? 0.72 : 0.78));
  const players = project.gameSnapshot
    ? `${project.gameSnapshot.metadata.white} vs ${project.gameSnapshot.metadata.black}`
    : project.name;
  const scale = Math.min(width / 1080, height / 1920);
  const sfx = useMemo(
    () => sceneSfxSchedule(scene, snapshot),
    [scene, snapshot],
  );
  const safeInset = {
    left: "7%",
    right: "7%",
    top: "6%",
    bottom: "6%",
  } as const;

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
          top: safeInset.top,
          left: safeInset.left,
          right: safeInset.right,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: 0.9,
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
          <span style={{ fontSize: 15 * scale, color: "#a1a1aa" }}>
            {players}
          </span>
        </div>
        <span style={{ fontSize: 15 * scale, color: "#71717a" }}>
          {Math.round(scene.durationInFrames / project.frameRate)}s /{" "}
          {project.frameRate} fps
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
            boxShadow: scene.effects.glow
              ? "0 0 70px rgba(232,180,90,0.22), 0 40px 100px -50px rgba(0,0,0,0.95)"
              : "0 40px 100px -50px rgba(0,0,0,0.95)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              transform: `translate(${-camera.x * 100}%, ${-camera.y * 100}%) scale(${camera.zoom})`,
              transformOrigin: "center",
            }}
            data-scene-camera
          >
            <BoardSvg
              fen={board.fen}
              orientation={scene.boardState.orientation}
              theme={scene.boardState.theme}
              lastMove={
                scene.effects.lastMoveHighlight ? board.lastMove : undefined
              }
              checkSquare={
                scene.effects.checkIndicator ? board.checkSquare : undefined
              }
              checkmate={
                scene.effects.checkmateEmphasis ? board.checkmate : false
              }
              animations={board.animations}
              captured={
                scene.effects.captureEmphasis ? board.captured : undefined
              }
              flashSquare={
                scene.effects.captureEmphasis ? board.flashSquare : undefined
              }
              moveProgress={board.moveProgress}
              focus={scene.effects.focus}
              focusSquares={scene.focusSquares}
              annotations={scene.annotations}
              frame={frame}
              coordinates={scene.boardState.coordinates}
              label={`Chessboard scene ${scene.type}`}
            />
          </div>
        </div>
        {board.error ? (
          <div
            data-board-error
            style={{
              position: "absolute",
              left: "10%",
              right: "10%",
              bottom: "12%",
              padding: `${10 * scale}px ${14 * scale}px`,
              borderRadius: 10 * scale,
              background: "rgba(7,7,8,0.82)",
              border: "1px solid rgba(248,113,113,0.4)",
              color: "#f87171",
              fontSize: 15 * scale,
              textAlign: "center",
            }}
          >
            {board.error}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          ...safeInset,
        }}
      >
        {scene.textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            data-scene-text
            style={{
              ...textPositionStyle(overlay),
              fontSize: overlay.fontSize * scale,
              fontWeight: overlay.font === "display" ? 600 : 400,
              lineHeight: 1.25,
              opacity:
                frame >= overlay.startFrame &&
                frame < overlay.startFrame + overlay.durationInFrames
                  ? 1
                  : 0,
              ...(overlay.background
                ? {
                    backgroundColor: "rgba(7,7,8,0.72)",
                    padding: `${12 * scale}px ${16 * scale}px`,
                    borderRadius: 10 * scale,
                  }
                : {}),
            }}
          >
            {overlay.text}
          </div>
        ))}
      </div>

      {sfx.map((clip) => (
        <Sequence
          key={`${clip.src}-${clip.startFrame}`}
          from={clip.startFrame}
          durationInFrames={clip.durationInFrames}
        >
          <Audio src={clip.src} volume={clip.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
