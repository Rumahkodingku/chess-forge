// biome-ignore-all lint/a11y/noLabelWithoutControl: labels wrap the project Input controls
"use client";

import { Loader2, Music, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAssetRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import {
  AUDIO_MIME_TYPES,
  importAudioAsset,
  readAudioDuration,
} from "@/features/studio/audio/audio-upload";
import type { VideoProject } from "@/features/studio/scene/scene.types";
import { toErrorMessage } from "@/lib/errors";
import { createId } from "@/lib/id";

interface ProjectAudioEditorProps {
  project: VideoProject;
  onChange: (mutator: (project: VideoProject) => VideoProject) => void;
}

export function ProjectAudioEditor({
  project,
  onChange,
}: ProjectAudioEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectBytes = project.assets.reduce(
    (total, asset) => total + asset.size,
    0,
  );

  function updateTrack(
    id: string,
    patch: Partial<VideoProject["audioTracks"][number]>,
  ) {
    onChange((current) => ({
      ...current,
      audioTracks: current.audioTracks.map((track) =>
        track.id === id ? { ...track, ...patch } : track,
      ),
    }));
  }

  function addBuiltin() {
    onChange((current) => ({
      ...current,
      audioTracks: [
        ...current.audioTracks,
        {
          id: createId(),
          kind: "sfx",
          source: { type: "builtin", id: "move" },
          startFrame: 0,
          durationInFrames: 30,
          volume: 0.5,
          muted: false,
          loop: false,
        },
      ],
    }));
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const durationSeconds = await readAudioDuration(file);
      const db = await openChessForgeDatabase();
      const { asset, durationSeconds: duration } = await importAudioAsset({
        file,
        durationSeconds,
        projectBytes,
        repository: createAssetRepository(db),
      });
      const id = createId();
      onChange((current) => ({
        ...current,
        assets: current.assets.some((item) => item.id === asset.id)
          ? current.assets
          : [
              ...current.assets,
              {
                id: asset.id,
                kind: asset.kind,
                mimeType: asset.mimeType,
                size: asset.size,
                hash: asset.hash,
                createdAt: asset.createdAt,
              },
            ],
        audioTracks: [
          ...current.audioTracks,
          {
            id,
            kind: "music",
            source: { type: "asset", assetId: asset.id },
            startFrame: 0,
            durationInFrames: Math.max(
              1,
              Math.round(duration * current.frameRate),
            ),
            volume: 0.5,
            muted: false,
            loop: false,
          },
        ],
      }));
      if (inputRef.current) inputRef.current.value = "";
    } catch (uploadError) {
      setError(toErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addBuiltin}>
          <Plus aria-hidden className="size-3.5" />
          Add SFX track
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Upload aria-hidden className="size-3.5" />
          )}
          Upload music
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={AUDIO_MIME_TYPES.join(",")}
          aria-label="Upload audio file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        MP3, WAV, OGG, M4A, or WebM. Max 50 MB and 10 minutes. Project media
        used: {(projectBytes / (1024 * 1024)).toFixed(1)} / 250 MB.
      </p>
      {error ? (
        <p role="alert" className="text-[11px] text-destructive">
          {error}
        </p>
      ) : null}

      {project.audioTracks.length ? (
        <div className="space-y-2">
          {project.audioTracks.map((track) => (
            <div
              key={track.id}
              className="space-y-2 rounded border border-border/70 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium">
                  <Music aria-hidden className="size-3.5 text-brand" />
                  {track.source.type === "builtin"
                    ? `SFX: ${track.source.id}`
                    : track.kind}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Delete audio track"
                  onClick={() =>
                    onChange((current) => ({
                      ...current,
                      audioTracks: current.audioTracks.filter(
                        (item) => item.id !== track.id,
                      ),
                    }))
                  }
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="grid gap-1 text-[10px] text-muted-foreground">
                  Start
                  <Input
                    type="number"
                    min={0}
                    value={track.startFrame}
                    onChange={(event) =>
                      updateTrack(track.id, {
                        startFrame: Math.max(0, Number(event.target.value)),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className="grid gap-1 text-[10px] text-muted-foreground">
                  Duration
                  <Input
                    type="number"
                    min={1}
                    value={track.durationInFrames}
                    onChange={(event) =>
                      updateTrack(track.id, {
                        durationInFrames: Math.max(
                          1,
                          Number(event.target.value),
                        ),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
                <label className="grid gap-1 text-[10px] text-muted-foreground">
                  Volume
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={track.volume}
                    onChange={(event) =>
                      updateTrack(track.id, {
                        volume: Math.min(
                          1,
                          Math.max(0, Number(event.target.value)),
                        ),
                      })
                    }
                    className="h-7 px-1 text-[10px]"
                  />
                </label>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={track.muted}
                    onChange={(event) =>
                      updateTrack(track.id, { muted: event.target.checked })
                    }
                  />
                  Mute
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={track.loop}
                    onChange={(event) =>
                      updateTrack(track.id, { loop: event.target.checked })
                    }
                  />
                  Loop
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          No project audio yet.
        </p>
      )}
    </div>
  );
}
