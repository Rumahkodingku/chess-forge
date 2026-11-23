import { z } from "zod";
import {
  type TemplateSnapshot,
  templateSnapshotSchema,
} from "@/features/studio/scene/scene.types";

export const templateSchema = templateSnapshotSchema
  .extend({
    isBuiltIn: z.boolean(),
    previewKey: z.string().min(1),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.literal(2),
  })
  .strict();

export type Template = z.infer<typeof templateSchema>;
export type { TemplateSnapshot };

export const templateListSchema = z.array(templateSchema);

export const legacyTemplateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    version: z.number().int().positive(),
    isBuiltIn: z.boolean(),
    preview: z.string().optional(),
    defaultCanvas: z.object({
      aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5"]),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    defaultStyle: z.record(z.string(), z.unknown()),
    sceneRules: z.record(z.string(), z.unknown()),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.number().int().positive(),
  })
  .passthrough();
