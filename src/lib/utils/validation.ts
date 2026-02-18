import { z } from 'zod';

export const reviewRequestSchema = z.object({
  prUrl: z.string().url().includes('github.com/').includes('/pull/'),
  jiraTicketId: z
    .union([z.string().regex(/^[A-Z]+-\d+$/), z.literal('')])
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  additionalPrompt: z.string().max(2000).optional(),
  maxTokens: z.number().int().positive().optional(),
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
      start_line: z.number().optional(), // For multi-line suggestions
      body: z.string(),
      severity: z.enum(['critical', 'warning', 'suggestion']),
    })
  ),
  reviewId: z.string().uuid().optional(),
});

export const breakdownStartSchema = z.object({
  jiraTicketIds: z
    .array(z.string().min(1))
    .min(1, 'At least one Jira ticket ID is required')
    .max(10, 'Maximum 10 tickets per breakdown'),
  modelId: z.string().min(1),
  detailLevel: z.enum(['detailed', 'balanced', 'minimal']).default('balanced'),
  enableDevCoaching: z.boolean().default(false),
  additionalPrompt: z.string().max(2000).optional(),
});

export const breakdownAnswerSchema = z.object({
  breakdownId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string().min(1, 'Answer cannot be empty'),
    })
  ),
});

export const breakdownPublishSchema = z.object({
  breakdownId: z.string().uuid(),
  cards: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(['subtask', 'story']),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
      technicalDetails: z.string(),
      testStrategy: z.object({
        unit: z.array(z.string()),
        integration: z.array(z.string()),
        e2e: z.array(z.string()),
        regression: z.array(z.string()),
      }),
      risks: z.array(z.string()),
      storyPoints: z.number().int().positive(),
      challengeQuestion: z.string().optional(),
      parentTicket: z.string(),
    })
  ),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type SubmitReviewRequest = z.infer<typeof submitReviewSchema>;
export type BreakdownStartRequest = z.infer<typeof breakdownStartSchema>;

export type BreakdownAnswerRequest = z.infer<typeof breakdownAnswerSchema>;
export type BreakdownPublishRequest = z.infer<typeof breakdownPublishSchema>;

export function validateReviewRequest(data: unknown): ReviewRequest {
  return reviewRequestSchema.parse(data);
}

export function validateSubmitReviewRequest(data: unknown): SubmitReviewRequest {
  return submitReviewSchema.parse(data);
}
