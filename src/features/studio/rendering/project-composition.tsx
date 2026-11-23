"use client";

import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence } from "remotion";
import { projectAudioSchedule } from "@/features/studio/rendering/audio";
import { SceneComposition } from "@/features/studio/rendering/scene-composition";
import type { VideoProject } from "@/features/studio/scene/scene.types";

export interface ProjectCompositionProps {
  project: VideoProject;
  resolvedAudioAssets: Record<string, string>;
}

export function ProjectComposition({
  project,
  resolvedAudioAssets,
}: ProjectCompositionProps) {
  const audio = projectAudioSchedule(project.audioTracks, resolvedAudioAssets);

  return (
    <AbsoluteFill style={{ backgroundColor: "#070708" }}>
      {project.scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
        >
          <SceneComposition project={project} scene={scene} />
        </Sequence>
      ))}
      {audio.map((track) => (
        <Sequence
          key={track.id}
          from={track.startFrame}
          durationInFrames={track.durationInFrames}
        >
          <Audio src={track.src} volume={track.volume} loop={track.loop} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
