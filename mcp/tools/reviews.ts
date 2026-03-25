import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiFetch } from '../lib/api-fetch.js';

const reviewCommentSchema = z.object({
  path: z.string().describe('File path relative to repo root'),
  line: z.number().int().describe('Line number the comment targets'),
  start_line: z.number().int().optional().describe('Start line for multi-line suggestions'),
  body: z.string().describe('Comment body (markdown). Use ```suggestion blocks if applicable.'),
  severity: z.enum(['critical', 'warning', 'suggestion']).describe('Severity level'),
});

export function registerReviewTools(server: McpServer): void {
  // ── list_reviews ───────────────────────────────────────────────────────────
  server.registerTool(
    'list_reviews',
    {
      description: 'List all code reviews (v2) stored locally, sorted by newest first.',
      inputSchema: {},
    },
    async () => {
      const data = await apiFetch('/api/reviews-v2');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── get_review ─────────────────────────────────────────────────────────────
  server.registerTool(
    'get_review',
    {
      description: 'Get full detail of a code review by its ID.',
      inputSchema: {
        id: z.string().describe('Review UUID'),
      },
    },
    async ({ id }) => {
      const data = await apiFetch(`/api/reviews-v2/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── save_review ────────────────────────────────────────────────────────────
  server.registerTool(
    'save_review',
    {
      description:
        'Create a new code review record (v2) and persist it to local storage. ' +
        'Returns the saved review including the generated ID and timestamp.',
      inputSchema: {
        prUrl: z.string().url().describe('Full GitHub PR URL'),
        prNumber: z.number().int().describe('PR number'),
        repository: z.string().describe('Repository in "owner/repo" format'),
        prTitle: z.string().describe('PR title'),
        summary: z.string().optional().describe('Brief AI-generated summary of the PR'),
        jiraTicketId: z.string().optional().describe('Associated Jira ticket ID, e.g. "PROJ-123"'),
        comments: z.array(reviewCommentSchema).describe('List of review comments'),
      },
    },
    async (body) => {
      const data = await apiFetch('/api/reviews-v2', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
