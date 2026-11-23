"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { projectDurationInFrames } from "@/features/studio/rendering/timeline";
import type { VideoProject } from "@/features/studio/scene/scene.types";

interface TimelinePanelProps {
  project: VideoProject;
  selectedSceneIndex: number;
  currentFrame: number;
  onSelect: (index: number) => void;
  onSeekFrame: (frame: number) => void;
  onDuration: (sceneId: string, frames: number) => void;
  onReorder: (from: number, to: number) => void;
  onDuplicate: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
  onAdd: (sceneId?: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  intro: "Intro",
  move: "Move",
  analysis: "Analysis",
  recap: "Recap",
  outro: "Outro",
};

export function TimelinePanel({
  project,
  selectedSceneIndex,
  currentFrame,
  onSelect,
  onSeekFrame,
  onDuration,
  onReorder,
  onDuplicate,
  onDelete,
  onAdd,
}: TimelinePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const duration = Math.max(1, projectDurationInFrames(project));
  const selected = project.scenes[selectedSceneIndex];

  const textSpans = useMemo(
    () =>
      project.scenes.flatMap((scene) =>
        scene.textOverlays.map((overlay) => ({
          id: overlay.id,
          start: scene.startFrame + overlay.startFrame,
          duration: overlay.durationInFrames,
          label: overlay.text,
        })),
      ),
    [project.scenes],
  );
  const sfxSpans = useMemo(
    () =>
      project.scenes.flatMap((scene) =>
        scene.audioEvents
          .filter((event) => !event.muted)
          .map((event) => ({
            id: `${scene.id}-${event.id}`,
            start:
              scene.startFrame + scene.timing.leadInFrames + event.frameOffset,
            duration: 18,
            label: event.trigger,
          })),
      ),
    [project.scenes],
  );
  const annotationSpans = useMemo(
    () =>
      project.scenes.flatMap((scene) =>
        scene.annotations.map((annotation) => ({
          id: annotation.id,
          start: scene.startFrame + annotation.startFrame,
          duration: annotation.durationInFrames,
          label: annotation.type,
        })),
      ),
    [project.scenes],
  );

  function dropAt(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    onReorder(dragIndex, index);
    setDragIndex(null);
  }

  return (
    <section className="rounded-xl border border-border/80 bg-surface-1 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-medium">Timeline</h2>
          <p className="text-[10px] text-muted-foreground">
            {project.scenes.length} scenes ·{" "}
            {(duration / project.frameRate).toFixed(1)}s · frame {currentFrame}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAdd(selected?.id)}
          >
            <Plus aria-hidden className="size-3.5" />
            Add scene
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected}
            onClick={() => selected && onDuplicate(selected.id)}
          >
            <Copy aria-hidden className="size-3.5" />
            Duplicate
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              if (
                window.confirm(`Delete scene "${TYPE_LABEL[selected.type]}"?`)
              ) {
                onDelete(selected.id);
              }
            }}
          >
            <Trash2 aria-hidden className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {project.scenes.map((scene, index) => {
            const active = index === selectedSceneIndex;
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: drag is an enhancement; keyboard reorder buttons are provided
              <div
                key={scene.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropAt(index)}
                className={`min-w-[150px] rounded-lg border p-2 ${
                  active
                    ? "border-brand bg-brand/10"
                    : "border-border/70 bg-surface-2/60"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelect(index)}
                  aria-label={`${String(index + 1).padStart(2, "0")} ${scene.type}`}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="ml-2 text-[12px] font-medium">
                    {TYPE_LABEL[scene.type] ?? scene.type}
                  </span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {(scene.durationInFrames / project.frameRate).toFixed(1)}s ·{" "}
                    {scene.durationInFrames}f
                  </span>
                </button>
                <div className="mt-2 flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={scene.durationInFrames}
                    aria-label={`Scene ${index + 1} duration frames`}
                    onChange={(event) =>
                      onDuration(scene.id, Number(event.target.value))
                    }
                    className="h-7 w-full rounded border border-border/70 bg-background px-1 font-mono text-[10px]"
                  />
                  <button
                    type="button"
                    aria-label={`Move scene ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => onReorder(index, index - 1)}
                    className="rounded border border-border/70 p-1 disabled:opacity-40"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move scene ${index + 1} down`}
                    disabled={index === project.scenes.length - 1}
                    onClick={() => onReorder(index, index + 1)}
                    className="rounded border border-border/70 p-1 disabled:opacity-40"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <input
          type="range"
          min={0}
          max={duration - 1}
          value={Math.min(currentFrame, duration - 1)}
          aria-label="Timeline frame"
          onChange={(event) => onSeekFrame(Number(event.target.value))}
          className="mt-2 w-full accent-[#e8b45a]"
        />
      </div>

      <div className="mt-3 space-y-1.5">
        <TrackRow label="Text" spans={textSpans} duration={duration} />
        <TrackRow
          label="Annotations"
          spans={annotationSpans}
          duration={duration}
        />
        <TrackRow
          label="Audio"
          spans={[
            ...project.audioTracks.map((track) => ({
              id: track.id,
              start: track.startFrame,
              duration: track.durationInFrames,
              label: track.kind,
            })),
            ...sfxSpans,
          ]}
          duration={duration}
        />
      </div>
    </section>
  );
}

function TrackRow({
  label,
  spans,
  duration,
}: {
  label: string;
  spans: Array<{ id: string; start: number; duration: number; label: string }>;
  duration: number;
}) {
  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="relative h-5 overflow-hidden rounded bg-surface-2/70">
        {spans.map((span) => (
          <span
            key={span.id}
            title={span.label}
            className="absolute inset-y-1 rounded bg-brand/35"
            style={{
              left: `${Math.max(0, (span.start / duration) * 100)}%`,
              width: `${Math.max(0.5, (span.duration / duration) * 100)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
