import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const reviewV2StatusSchema = z
  .enum(['pending', 'approved', 'posted', 'error'])
  .openapi('ReviewV2Status');

export const reviewCommentSchema = z
  .object({
    path: z.string().openapi({ description: 'File path relative to repo root' }),
    line: z.number().int().openapi({ description: 'Line number the comment targets' }),
    start_line: z
      .number()
      .int()
      .optional()
      .openapi({ description: 'Start line for multi-line suggestions' }),
    body: z
      .string()
      .openapi({ description: 'Comment body in Markdown. Use ```suggestion blocks if applicable.' }),
    severity: z
      .enum(['critical', 'warning', 'suggestion'])
      .openapi({ description: 'Severity level of the comment' }),
  })
  .openapi('ReviewComment');

export const reviewV2IndexEntrySchema = z
  .object({
    id: z.string().openapi({ format: 'uuid', description: 'UUID v7' }),
    timestamp: z.string().openapi({ format: 'date-time', description: 'ISO 8601 creation time' }),
    prUrl: z.string().url().openapi({ description: 'Full GitHub PR URL' }),
    prNumber: z.number().int().openapi({ description: 'PR number' }),
    repository: z.string().openapi({ description: '"owner/repo" format' }),
    prTitle: z.string().openapi({ description: 'PR title' }),
    status: reviewV2StatusSchema,
    summary: z.string().optional().openapi({ description: 'Brief AI-generated summary of the PR' }),
    jiraTicketId: z
      .string()
      .optional()
      .openapi({ description: 'Associated Jira ticket ID, e.g. "PROJ-123"' }),
  })
  .openapi('ReviewV2IndexEntry');

export const reviewV2DetailSchema = reviewV2IndexEntrySchema
  .extend({
    comments: z.array(reviewCommentSchema).openapi({ description: 'Review comments' }),
  })
  .openapi('ReviewV2Detail');

export const createReviewV2Schema = z
  .object({
    prUrl: z.string().url().openapi({ description: 'Full GitHub PR URL' }),
    prNumber: z.number().int().openapi({ description: 'PR number' }),
    repository: z.string().openapi({ description: '"owner/repo" format' }),
    prTitle: z.string().openapi({ description: 'PR title' }),
    summary: z.string().optional().openapi({ description: 'Brief AI-generated summary' }),
    jiraTicketId: z.string().optional().openapi({ description: 'Associated Jira ticket ID' }),
    comments: z.array(reviewCommentSchema).default([]),
  })
  .openapi('CreateReviewV2Request');

export const updateReviewV2Schema = z
  .object({
    comments: z.array(reviewCommentSchema).openapi({ description: 'Updated list of comments' }),
  })
  .openapi('UpdateReviewV2Request');
