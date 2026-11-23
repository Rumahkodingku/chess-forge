import type {
  TemplateStyle,
  TemplateTextStyle,
  TextOverlay,
  VideoProject,
} from "@/features/studio/scene/scene.types";
import type { Template } from "@/features/templates/types";
import { createId } from "@/lib/id";

function textStyleFromOverlay(
  overlay: TextOverlay | undefined,
  fallback: TemplateTextStyle,
): TemplateTextStyle {
  if (!overlay) return fallback;
  return {
    font: overlay.font,
    fontSize: overlay.fontSize,
    color: overlay.color,
    align: overlay.align,
    position: overlay.position,
    x: overlay.x,
    y: overlay.y,
    maxWidth: overlay.maxWidth,
    background: overlay.background,
  };
}

function styleFromProject(project: VideoProject): TemplateStyle | null {
  if (!project.template) return null;
  const base = project.template.style;
  const scene =
    project.scenes.find((item) => item.moveRange) ?? project.scenes[0];
  if (!scene) return base;
  const overlayFor = (kind: TextOverlay["kind"]) =>
    scene.textOverlays.find((overlay) => overlay.kind === kind);
  const zoom = scene.camera.keyframes[0]?.zoom ?? base.camera.sceneZoom;
  return {
    boardTheme: scene.boardState.theme,
    coordinates: scene.boardState.coordinates,
    effects: scene.effects,
    camera: { ...base.camera, sceneZoom: zoom },
    timing: scene.timing,
    text: {
      title: textStyleFromOverlay(overlayFor("title"), base.text.title),
      moveLabel: textStyleFromOverlay(
        overlayFor("move-label"),
        base.text.moveLabel,
      ),
      explanation: textStyleFromOverlay(
        overlayFor("explanation"),
        base.text.explanation,
      ),
      caption: textStyleFromOverlay(overlayFor("caption"), base.text.caption),
    },
    audio: { ...base.audio, sceneSfx: scene.audioEvents },
  };
}

export interface CustomTemplateInput {
  project: VideoProject;
  name: string;
  description?: string;
}

export function templateFromProject({
  project,
  name,
  description,
}: CustomTemplateInput): Template | null {
  if (!project.template) return null;
  const now = new Date().toISOString();
  return {
    ...project.template,
    id: createId(),
    name: name.trim(),
    description: description?.trim() ?? project.template.description,
    style: styleFromProject(project) ?? project.template.style,
    version: 1,
    isBuiltIn: false,
    previewKey: "custom",
    createdAt: now,
    updatedAt: now,
    schemaVersion: 2,
  };
}

export function updateTemplateFromProject(
  template: Template,
  project: VideoProject,
): Template {
  if (!project.template) return template;
  return {
    ...project.template,
    id: template.id,
    name: template.name,
    description: template.description,
    style: styleFromProject(project) ?? project.template.style,
    version: template.version + 1,
    isBuiltIn: false,
    previewKey: template.previewKey,
    createdAt: template.createdAt,
    updatedAt: new Date().toISOString(),
    schemaVersion: 2,
  };
}

export function duplicateTemplate(template: Template): Template {
  const now = new Date().toISOString();
  return {
    ...template,
    id: createId(),
    name: `${template.name} copy`,
    version: 1,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 2,
  };
}

export function renameTemplate(
  template: Template,
  name: string,
  description?: string,
): Template {
  const trimmed = name.trim();
  if (!trimmed) return template;
  return {
    ...template,
    name: trimmed,
    description: description?.trim() ?? template.description,
    version: template.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
