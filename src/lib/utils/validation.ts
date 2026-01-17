import { z } from 'zod';

export const reviewRequestSchema = z.object({
  prUrl: z.string().url().includes('github.com/').includes('/pull/'),
  jiraTicketId: z
    .union([z.string().regex(/^[A-Z]+-\d+$/), z.literal('')])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  additionalPrompt: z.string().max(2000).optional(),
  modelId: z.string().min(1),
  previewOnly: z.boolean().optional().default(false),
});

export const submitReviewSchema = z.object({
  prUrl: z.string().url().includes('github.com/').includes('/pull/'),
  jiraTicketId: z
    .union([z.string().regex(/^[A-Z]+-\d+$/), z.literal('')])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  modelId: z.string().min(1),
  comments: z.array(
    z.object({
      path: z.string(),
      line: z.number(),
      body: z.string(),
      severity: z.enum(['critical', 'warning', 'suggestion']),
    })
  ),
  reviewId: z.string().uuid().optional(),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type SubmitReviewRequest = z.infer<typeof submitReviewSchema>;

export function validateReviewRequest(data: unknown): ReviewRequest {
  return reviewRequestSchema.parse(data);
}

export function validateSubmitReviewRequest(data: unknown): SubmitReviewRequest {
  return submitReviewSchema.parse(data);
}
