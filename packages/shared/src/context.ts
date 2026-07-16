import { z } from "zod";

export const answerRequestSchema = z.object({
  transcriptWindow: z.string().min(1),
});
export type AnswerRequest = z.infer<typeof answerRequestSchema>;

export type MasterContext = {
  id: string;
  content: string;
  tokenEstimate: number;
  createdAt: string;
};

export type MasterContextVersion = Pick<MasterContext, "id" | "tokenEstimate" | "createdAt">;

export type ContextResponse = {
  current: MasterContext | null;
  versions: MasterContextVersion[];
};
