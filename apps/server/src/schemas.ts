import { z } from "zod";

// Server-local copies of the request contracts. Kept here (rather than imported
// from @huddl/shared) so the server has no runtime dependency on that raw-TS
// workspace package — Node can't execute its .ts export on Vercel, and crossing
// the package boundary also skewed zod's type inference in Vercel's build.
// The dashboard still uses @huddl/shared for the same shapes (Vite bundles it).

export const createSummarySchema = z.object({
  project: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  title: z.string().min(1),
  content: z.string().min(1),
});

export const updateSummarySchema = createSummarySchema.partial();

export const answerRequestSchema = z.object({
  transcriptWindow: z.string().min(1),
});
