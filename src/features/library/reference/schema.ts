import { z } from "zod";

export const referenceCategorySchema = z.enum([
  "strategy",
  "tactics",
  "middlegame",
  "endgame",
]);

export const referenceBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().min(1) }).strict(),
  z.object({ type: z.literal("heading"), text: z.string().min(1) }).strict(),
  z
    .object({
      type: z.literal("list"),
      items: z.array(z.string().min(1)).min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("diagram"),
      fen: z.string().min(1),
      orientation: z.enum(["w", "b"]).optional(),
      caption: z.string().min(1),
      highlights: z.array(z.string()).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("callout"),
      tone: z.enum(["tip", "warning", "note"]),
      text: z.string().min(1),
    })
    .strict(),
]);

export const referenceArticleSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: referenceCategorySchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    readingMinutes: z.number().int().positive(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    blocks: z.array(referenceBlockSchema).min(1),
    keyTakeaways: z.array(z.string().min(1)).min(3),
    related: z.array(
      z.object({
        type: z.enum(["opening", "puzzle-theme", "article"]),
        id: z.string().min(1),
        label: z.string().min(1),
      }),
    ),
    schemaVersion: z.literal(1),
  })
  .strict();

export const referenceArticleListSchema = z.array(referenceArticleSchema);

export type ReferenceCategory = z.infer<typeof referenceCategorySchema>;
export type ReferenceBlock = z.infer<typeof referenceBlockSchema>;
export type ReferenceArticle = z.infer<typeof referenceArticleSchema>;
