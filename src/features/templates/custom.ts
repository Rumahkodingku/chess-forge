import type { VideoProject } from "@/features/studio/scene/scene.types";
import type { Template } from "@/features/templates/types";
import { createId } from "@/lib/id";

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
    updatedAt: new Date().toISOString(),
  };
}
