import { z } from 'zod';

export const reviewRequestSchema = z.object({
  prUrl: z.string().url().includes('github.com/').includes('/pull/'),
  jiraTicketId: z
    .string()
    .regex(/^[A-Z]+-\d+$/)
    .optional(),
  additionalPrompt: z.string().max(2000).optional(),
  modelId: z.string().min(1),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

export function validateReviewRequest(data: unknown): ReviewRequest {
  return reviewRequestSchema.parse(data);
}
