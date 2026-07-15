import { z } from "zod";

export const createSummarySchema = z.object({
  project: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  title: z.string().min(1),
  content: z.string().min(1),
});

export const updateSummarySchema = createSummarySchema.partial();

export type CreateSummaryInput = z.infer<typeof createSummarySchema>;
export type UpdateSummaryInput = z.infer<typeof updateSummarySchema>;

export type Summary = CreateSummaryInput & {
  id: string;
  createdAt: string;
};
