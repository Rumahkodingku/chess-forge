// biome-ignore-all lint/a11y/noLabelWithoutControl: labels wrap the project Input and select controls
"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SceneField } from "@/features/studio/editing/scene-editing";
import { validateTextOverlays } from "@/features/studio/rendering/text-safety";
import type {
  Annotation,
  EasingName,
  Scene,
  TextOverlay,
  VideoProject,
} from "@/features/studio/scene/scene.types";
import { createId } from "@/lib/id";

interface SceneInspectorProps {
  project: VideoProject;
  scene: Scene;
  sceneFrame: number;
  onChange: (field: SceneField, mutator: (scene: Scene) => Scene) => void;
  onReset: (field: SceneField) => void;
}

const fieldClass =
  "h-8 w-full rounded border border-border/70 bg-background px-2 text-[11px]";
const labelClass = "grid gap-1 text-[10px] text-muted-foreground";

function numberValue(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Section({
  title,
  onReset,
  canReset,
  children,
}: {
  title: string;
  onReset: () => void;
  canReset: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-border/60 pb-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-medium">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[10px]"
          disabled={!canReset}
          onClick={onReset}
        >
          <RotateCcw aria-hidden className="size-3" />
          Reset
        </Button>
      </div>
      {children}
    </section>
  );
}

export function SceneInspector({
  project,
  scene,
  sceneFrame,
  onChange,
  onReset,
}: SceneInspectorProps) {
  const canReset = Boolean(project.template);
  const textWarnings = validateTextOverlays(scene.textOverlays, project.canvas);
  const timing = scene.timing;

  function updateText(id: string, patch: Partial<TextOverlay>) {
    onChange("textOverlays", (current) => ({
      ...current,
      textOverlays: current.textOverlays.map((overlay) =>
        overlay.id === id ? { ...overlay, ...patch } : overlay,
      ),
    }));
  }

  function updateAnnotation(id: string, patch: Partial<Annotation>) {
    onChange("annotations", (current) => ({
      ...current,
      annotations: current.annotations.map((annotation) =>
        annotation.id === id ? { ...annotation, ...patch } : annotation,
      ),
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-surface-1 p-3">
      <div>
        <h2 className="text-[13px] font-medium">Scene inspector</h2>
        <p className="text-[10px] text-muted-foreground">
          {scene.type} · {scene.durationInFrames} frames · local frame{" "}
          {sceneFrame}
        </p>
      </div>

      <Section
        title="Board"
        canReset={canReset}
        onReset={() => onReset("boardState")}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            Theme
            <select
              className={fieldClass}
              value={scene.boardState.theme}
              onChange={(event) =>
                onChange("boardState", (current) => ({
                  ...current,
                  boardState: {
                    ...current.boardState,
                    theme: event.target.value as "forge" | "classic",
                  },
                }))
              }
            >
              <option value="forge">Forge</option>
              <option value="classic">Classic</option>
            </select>
          </label>
          <label className={labelClass}>
            Orientation
            <select
              className={fieldClass}
              value={scene.boardState.orientation}
              onChange={(event) =>
                onChange("boardState", (current) => ({
                  ...current,
                  boardState: {
                    ...current.boardState,
                    orientation: event.target.value as "w" | "b",
                  },
                }))
              }
            >
              <option value="w">White</option>
              <option value="b">Black</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={scene.boardState.coordinates}
              onChange={(event) =>
                onChange("boardState", (current) => ({
                  ...current,
                  boardState: {
                    ...current.boardState,
                    coordinates: event.target.checked,
                  },
                }))
              }
            />
            Coordinates
          </label>
        </div>
      </Section>

      <Section
        title="Timing"
        canReset={canReset}
        onReset={() => onReset("timing")}
      >
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["leadInFrames", "Lead-in"],
              ["moveDurationFrames", "Move duration"],
              ["gapFrames", "Gap"],
              ["holdFrames", "Hold"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={labelClass}>
              {label}
              <Input
                type="number"
                min={key === "moveDurationFrames" ? 1 : 0}
                value={timing[key]}
                onChange={(event) =>
                  onChange("timing", (current) => ({
                    ...current,
                    timing: {
                      ...current.timing,
                      [key]: Math.max(
                        key === "moveDurationFrames" ? 1 : 0,
                        numberValue(event.target.value),
                      ),
                    },
                  }))
                }
                className="h-8 text-[11px]"
              />
            </label>
          ))}
          <label className={labelClass}>
            Easing
            <select
              className={fieldClass}
              value={timing.easing}
              onChange={(event) =>
                onChange("timing", (current) => ({
                  ...current,
                  timing: {
                    ...current.timing,
                    easing: event.target.value as EasingName,
                  },
                }))
              }
            >
              <option value="linear">Linear</option>
              <option value="easeIn">Ease in</option>
              <option value="easeOut">Ease out</option>
              <option value="easeInOut">Ease in-out</option>
            </select>
          </label>
        </div>
      </Section>

      <Section
        title="Camera"
        canReset={canReset}
        onReset={() => onReset("camera")}
      >
        <div className="space-y-2">
          {scene.camera.keyframes.map((keyframe, index) => (
            <div
              key={`${keyframe.frame}-${index}`}
              className="grid grid-cols-5 gap-1"
            >
              {(
                [
                  ["frame", "Frame"],
                  ["zoom", "Zoom"],
                  ["x", "X"],
                  ["y", "Y"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className={labelClass}>
                  {label}
                  <Input
                    type="number"
                    step={key === "frame" ? 1 : 0.05}
                    value={keyframe[key]}
                    onChange={(event) =>
                      onChange("camera", (current) => ({
                        ...current,
                        camera: {
                          keyframes: current.camera.keyframes.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    [key]: numberValue(event.target.value),
                                  }
                                : item,
                          ),
                        },
                      }))
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
              ))}
              <label className={labelClass}>
                Ease
                <select
                  className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                  value={keyframe.easing}
                  onChange={(event) =>
                    onChange("camera", (current) => ({
                      ...current,
                      camera: {
                        keyframes: current.camera.keyframes.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  easing: event.target.value as EasingName,
                                }
                              : item,
                        ),
                      },
                    }))
                  }
                >
                  <option value="linear">Linear</option>
                  <option value="easeIn">In</option>
                  <option value="easeOut">Out</option>
                  <option value="easeInOut">In-out</option>
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Delete camera keyframe ${index + 1}`}
                className="col-span-5 h-6 justify-start px-1 text-[10px] text-destructive"
                onClick={() =>
                  onChange("camera", (current) => ({
                    ...current,
                    camera: {
                      keyframes: current.camera.keyframes.filter(
                        (_item, itemIndex) => itemIndex !== index,
                      ),
                    },
                  }))
                }
              >
                Delete keyframe
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[10px]"
            onClick={() =>
              onChange("camera", (current) => ({
                ...current,
                camera: {
                  keyframes: [
                    ...current.camera.keyframes,
                    {
                      frame: Math.max(0, sceneFrame),
                      zoom: 1.2,
                      x: 0,
                      y: 0,
                      easing: "easeInOut" as const,
                    },
                  ].sort((left, right) => left.frame - right.frame),
                },
              }))
            }
          >
            <Plus aria-hidden className="size-3" />
            Add at current frame
          </Button>
        </div>
      </Section>

      <Section
        title="Annotations"
        canReset={canReset}
        onReset={() => onReset("annotations")}
      >
        <div className="space-y-2">
          {scene.annotations.map((annotation) => (
            <div key={annotation.id} className="space-y-1 rounded border p-2">
              <div className="grid grid-cols-3 gap-1">
                <label className={labelClass}>
                  Type
                  <select
                    className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                    value={annotation.type}
                    onChange={(event) =>
                      updateAnnotation(annotation.id, {
                        type: event.target.value as Annotation["type"],
                      })
                    }
                  >
                    <option value="arrow">Arrow</option>
                    <option value="square">Square</option>
                    <option value="highlight">Highlight</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Color
                  <select
                    className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                    value={annotation.color}
                    onChange={(event) =>
                      updateAnnotation(annotation.id, {
                        color: event.target.value as Annotation["color"],
                      })
                    }
                  >
                    {["brand", "red", "green", "blue", "white"].map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Opacity
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={annotation.opacity ?? 1}
                    onChange={(event) =>
                      updateAnnotation(annotation.id, {
                        opacity: numberValue(event.target.value, 1),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <label className={labelClass}>
                  From
                  <Input
                    value={annotation.from ?? ""}
                    onChange={(event) =>
                      updateAnnotation(annotation.id, {
                        from: event.target.value,
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className={labelClass}>
                  To
                  <Input
                    value={annotation.to ?? ""}
                    onChange={(event) =>
                      updateAnnotation(annotation.id, {
                        to: event.target.value,
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className={labelClass}>
                  Start
                  <Input
                    type="number"
                    min={0}
                    value={annotation.startFrame}
                    onChange={(event) =>
                      updateAnnotation(annotation.id, {
                        startFrame: numberValue(event.target.value),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className={labelClass}>
                  Duration
                  <Input
                    type="number"
                    min={1}
                    value={annotation.durationInFrames}
                    onChange={(event) =>
                      updateAnnotation(annotation.id, {
                        durationInFrames: Math.max(
                          1,
                          numberValue(event.target.value, 1),
                        ),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-1 text-[10px] text-destructive"
                onClick={() =>
                  onChange("annotations", (current) => ({
                    ...current,
                    annotations: current.annotations.filter(
                      (item) => item.id !== annotation.id,
                    ),
                  }))
                }
              >
                Delete annotation
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[10px]"
            onClick={() =>
              onChange("annotations", (current) => ({
                ...current,
                annotations: [
                  ...current.annotations,
                  {
                    id: createId(),
                    type: "arrow",
                    from: "e2",
                    to: "e4",
                    color: "brand",
                    startFrame: 0,
                    durationInFrames: current.durationInFrames,
                    opacity: 1,
                  },
                ],
              }))
            }
          >
            <Plus aria-hidden className="size-3" />
            Add annotation
          </Button>
        </div>
      </Section>

      <Section
        title="Text"
        canReset={canReset}
        onReset={() => onReset("textOverlays")}
      >
        {textWarnings.length ? (
          <div className="rounded border border-brand/30 bg-brand/10 p-2 text-[10px] text-brand">
            {textWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
        <div className="space-y-2">
          {scene.textOverlays.map((overlay) => (
            <div key={overlay.id} className="space-y-1 rounded border p-2">
              <Input
                value={overlay.text}
                aria-label={`Text ${overlay.kind}`}
                onChange={(event) =>
                  updateText(overlay.id, { text: event.target.value })
                }
                className="h-7 text-[11px]"
              />
              <div className="grid grid-cols-3 gap-1">
                <label className={labelClass}>
                  Kind
                  <select
                    className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                    value={overlay.kind}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        kind: event.target.value as TextOverlay["kind"],
                      })
                    }
                  >
                    {["title", "move-label", "explanation", "caption"].map(
                      (kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className={labelClass}>
                  Font
                  <select
                    className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                    value={overlay.font}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        font: event.target.value as TextOverlay["font"],
                      })
                    }
                  >
                    <option value="display">Display</option>
                    <option value="body">Body</option>
                    <option value="mono">Mono</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Size
                  <Input
                    type="number"
                    min={1}
                    value={overlay.fontSize}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        fontSize: Math.max(1, numberValue(event.target.value)),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className={labelClass}>
                  Align
                  <select
                    className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                    value={overlay.align}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        align: event.target.value as TextOverlay["align"],
                      })
                    }
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Position
                  <select
                    className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                    value={overlay.position}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        position: event.target.value as TextOverlay["position"],
                      })
                    }
                  >
                    {["top", "bottom", "left", "right", "center"].map(
                      (position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className={labelClass}>
                  Color
                  <select
                    className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                    value={overlay.color}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        color: event.target.value as TextOverlay["color"],
                      })
                    }
                  >
                    {["foreground", "muted", "brand", "danger"].map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  X
                  <Input
                    type="number"
                    value={overlay.x}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        x: numberValue(event.target.value),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className={labelClass}>
                  Y
                  <Input
                    type="number"
                    value={overlay.y}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        y: numberValue(event.target.value),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className={labelClass}>
                  Width %
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={overlay.maxWidth}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        maxWidth: Math.min(
                          100,
                          Math.max(1, numberValue(event.target.value, 80)),
                        ),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className={labelClass}>
                  Start
                  <Input
                    type="number"
                    min={0}
                    value={overlay.startFrame}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        startFrame: numberValue(event.target.value),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className={labelClass}>
                  Duration
                  <Input
                    type="number"
                    min={1}
                    value={overlay.durationInFrames}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        durationInFrames: Math.max(
                          1,
                          numberValue(event.target.value, 1),
                        ),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className="flex items-center gap-2 text-[10px]">
                  <input
                    type="checkbox"
                    checked={overlay.background}
                    onChange={(event) =>
                      updateText(overlay.id, {
                        background: event.target.checked,
                      })
                    }
                  />
                  Background
                </label>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-1 text-[10px] text-destructive"
                onClick={() =>
                  onChange("textOverlays", (current) => ({
                    ...current,
                    textOverlays: current.textOverlays.filter(
                      (item) => item.id !== overlay.id,
                    ),
                  }))
                }
              >
                Delete overlay
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[10px]"
            onClick={() =>
              onChange("textOverlays", (current) => ({
                ...current,
                textOverlays: [
                  ...current.textOverlays,
                  {
                    id: createId(),
                    kind: "caption",
                    text: "New caption",
                    font: "body",
                    fontSize: 28,
                    color: "foreground",
                    align: "center",
                    position: "bottom",
                    x: 0,
                    y: 6,
                    maxWidth: 80,
                    background: false,
                    startFrame: 0,
                    durationInFrames: current.durationInFrames,
                  },
                ],
              }))
            }
          >
            <Plus aria-hidden className="size-3" />
            Add text overlay
          </Button>
        </div>
      </Section>

      <Section
        title="Effects"
        canReset={canReset}
        onReset={() => onReset("effects")}
      >
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              ["lastMoveHighlight", "Last move"],
              ["checkIndicator", "Check"],
              ["captureEmphasis", "Capture"],
              ["checkmateEmphasis", "Checkmate"],
              ["glow", "Glow"],
              ["focus", "Focus"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={scene.effects[key]}
                onChange={(event) =>
                  onChange("effects", (current) => ({
                    ...current,
                    effects: {
                      ...current.effects,
                      [key]: event.target.checked,
                    },
                  }))
                }
              />
              {label}
            </label>
          ))}
        </div>
      </Section>

      <Section
        title="Scene SFX"
        canReset={canReset}
        onReset={() => onReset("audioEvents")}
      >
        <div className="space-y-2">
          {scene.audioEvents.map((event) => (
            <div key={event.id} className="grid grid-cols-4 gap-1">
              <label className={labelClass}>
                Trigger
                <select
                  className="h-7 rounded border border-border/70 bg-background px-1 text-[10px]"
                  value={event.trigger}
                  onChange={(input) =>
                    onChange("audioEvents", (current) => ({
                      ...current,
                      audioEvents: current.audioEvents.map((item) =>
                        item.id === event.id
                          ? {
                              ...item,
                              trigger: input.target
                                .value as typeof event.trigger,
                            }
                          : item,
                      ),
                    }))
                  }
                >
                  {["move", "capture", "check", "checkmate"].map((trigger) => (
                    <option key={trigger} value={trigger}>
                      {trigger}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Offset
                <Input
                  type="number"
                  value={event.frameOffset}
                  onChange={(input) =>
                    onChange("audioEvents", (current) => ({
                      ...current,
                      audioEvents: current.audioEvents.map((item) =>
                        item.id === event.id
                          ? {
                              ...item,
                              frameOffset: numberValue(input.target.value),
                            }
                          : item,
                      ),
                    }))
                  }
                  className="h-7 px-1 text-[10px]"
                />
              </label>
              <label className={labelClass}>
                Volume
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={event.volume}
                  onChange={(input) =>
                    onChange("audioEvents", (current) => ({
                      ...current,
                      audioEvents: current.audioEvents.map((item) =>
                        item.id === event.id
                          ? {
                              ...item,
                              volume: Math.min(
                                1,
                                Math.max(0, numberValue(input.target.value)),
                              ),
                            }
                          : item,
                      ),
                    }))
                  }
                  className="h-7 px-1 text-[10px]"
                />
              </label>
              <div className="flex items-end gap-1">
                <label className="flex items-center gap-1 text-[10px]">
                  <input
                    type="checkbox"
                    checked={event.muted}
                    onChange={(input) =>
                      onChange("audioEvents", (current) => ({
                        ...current,
                        audioEvents: current.audioEvents.map((item) =>
                          item.id === event.id
                            ? { ...item, muted: input.target.checked }
                            : item,
                        ),
                      }))
                    }
                  />
                  Mute
                </label>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Delete scene SFX"
                  onClick={() =>
                    onChange("audioEvents", (current) => ({
                      ...current,
                      audioEvents: current.audioEvents.filter(
                        (item) => item.id !== event.id,
                      ),
                    }))
                  }
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[10px]"
            onClick={() =>
              onChange("audioEvents", (current) => ({
                ...current,
                audioEvents: [
                  ...current.audioEvents,
                  {
                    id: createId(),
                    trigger: "move",
                    frameOffset: 0,
                    volume: 0.5,
                    muted: false,
                  },
                ],
              }))
            }
          >
            <Plus aria-hidden className="size-3" />
            Add SFX event
          </Button>
        </div>
      </Section>
    </div>
  );
}
