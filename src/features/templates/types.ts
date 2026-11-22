import { z } from "zod";
import { canvasSettingsSchema } from "@/features/studio/scene/scene.types";

export const templateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    version: z.number().int().positive(),
    isBuiltIn: z.boolean(),
    preview: z.string().optional(),
    defaultCanvas: canvasSettingsSchema,
    defaultStyle: z.record(z.string(), z.unknown()),
    sceneRules: z.record(z.string(), z.unknown()),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.number().int().positive(),
  })
  .strict();

export type Template = z.infer<typeof templateSchema>;

export const templateListSchema = z.array(templateSchema);
