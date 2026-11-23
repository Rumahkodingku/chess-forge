import type { TemplateSnapshot } from "@/features/studio/scene/scene.types";
import type { Template } from "@/features/templates/types";

export function toTemplateSnapshot(template: Template): TemplateSnapshot {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    description: template.description,
    defaultCanvas: template.defaultCanvas,
    defaultFrameRate: template.defaultFrameRate,
    style: template.style,
    sceneRules: template.sceneRules,
  };
}
