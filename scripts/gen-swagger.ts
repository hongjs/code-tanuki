import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { z } from 'zod';
import {
  createTicketSchema,
  syncFromJiraSchema,
  ticketIndexEntrySchema,
  ticketSchema,
  updateTicketSchema,
} from '../src/lib/schemas/ticket-schemas';
import {
  createReviewV2Schema,
  reviewV2DetailSchema,
  reviewV2IndexEntrySchema,
  updateReviewV2Schema,
} from '../src/lib/schemas/review-v2-schemas';

const registry = new OpenAPIRegistry();

// Register named schemas so they appear in components/schemas
registry.register('Ticket', ticketSchema);
registry.register('TicketIndexEntry', ticketIndexEntrySchema);
registry.register('CreateTicketRequest', createTicketSchema);
registry.register('UpdateTicketRequest', updateTicketSchema);
registry.register('SyncFromJiraRequest', syncFromJiraSchema);
registry.register('ReviewV2IndexEntry', reviewV2IndexEntrySchema);
registry.register('ReviewV2Detail', reviewV2DetailSchema);
registry.register('CreateReviewV2Request', createReviewV2Schema);
registry.register('UpdateReviewV2Request', updateReviewV2Schema);

// ── GET /api/tickets ──────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/tickets',
  tags: ['tickets'],
  summary: 'List local tickets',
  operationId: 'listTickets',
  request: {
    query: z.object({
      search: z.string().optional().openapi({ description: 'Free-text search on title' }),
      type: z.enum(['Epic', 'Story', 'Task', 'Sub-task', 'Bug']).optional(),
      status: z.string().optional().openapi({ description: 'e.g. "To Do", "In Progress", "Done"' }),
    }),
  },
  responses: {
    200: {
      description: 'Array of ticket index entries',
      content: {
        'application/json': {
          schema: z.object({ tickets: z.array(ticketIndexEntrySchema) }),
        },
      },
    },
    500: { description: 'Server error' },
  },
});

// ── POST /api/tickets ─────────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/api/tickets',
  tags: ['tickets'],
  summary: 'Create a local ticket',
  operationId: 'createTicket',
  request: { body: { content: { 'application/json': { schema: createTicketSchema } } } },
  responses: {
    201: {
      description: 'Created ticket',
      content: { 'application/json': { schema: z.object({ ticket: ticketSchema }) } },
    },
    400: { description: 'Validation error' },
    500: { description: 'Server error' },
  },
});

// ── POST /api/tickets/sync-new ────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/api/tickets/sync-new',
  tags: ['jira-sync'],
  summary: 'Sync a ticket from Jira',
  description:
    'Fetches the Jira issue and saves it locally. Updates the record if the jiraKey already exists.',
  operationId: 'syncTicketFromJira',
  request: { body: { content: { 'application/json': { schema: syncFromJiraSchema } } } },
  responses: {
    201: {
      description: 'Synced ticket',
      content: { 'application/json': { schema: z.object({ ticket: ticketSchema }) } },
    },
    400: { description: 'Missing jiraKey' },
    404: { description: 'Jira ticket not found' },
    500: { description: 'Server error' },
  },
});

// ── POST /api/tickets/bulk-jira ───────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/api/tickets/bulk-jira',
  tags: ['jira-sync'],
  summary: 'Bulk Jira sync',
  operationId: 'bulkJiraSync',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z
            .object({
              jiraKeys: z.array(z.string()).openapi({ description: 'Jira issue keys to sync' }),
            })
            .openapi('BulkJiraRequest'),
        },
      },
    },
  },
  responses: {
    200: { description: 'Bulk operation result' },
    500: { description: 'Server error' },
  },
});

// ── GET /api/tickets/{localId} ────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/tickets/{localId}',
  tags: ['tickets'],
  summary: 'Get ticket detail',
  operationId: 'getTicket',
  request: { params: z.object({ localId: z.string().openapi({ format: 'uuid' }) }) },
  responses: {
    200: {
      description: 'Ticket detail',
      content: { 'application/json': { schema: z.object({ ticket: ticketSchema }) } },
    },
    404: { description: 'Not found' },
    500: { description: 'Server error' },
  },
});

// ── PUT /api/tickets/{localId} ────────────────────────────────────────────────
registry.registerPath({
  method: 'put',
  path: '/api/tickets/{localId}',
  tags: ['tickets'],
  summary: 'Update a local ticket',
  operationId: 'updateTicket',
  request: {
    params: z.object({ localId: z.string().openapi({ format: 'uuid' }) }),
    body: { content: { 'application/json': { schema: updateTicketSchema } } },
  },
  responses: {
    200: {
      description: 'Updated ticket',
      content: { 'application/json': { schema: z.object({ ticket: ticketSchema }) } },
    },
    400: { description: 'Validation error' },
    404: { description: 'Not found' },
    500: { description: 'Server error' },
  },
});

// ── DELETE /api/tickets/{localId} ─────────────────────────────────────────────
registry.registerPath({
  method: 'delete',
  path: '/api/tickets/{localId}',
  tags: ['tickets'],
  summary: 'Delete a local ticket',
  operationId: 'deleteTicket',
  request: { params: z.object({ localId: z.string().openapi({ format: 'uuid' }) }) },
  responses: {
    200: {
      description: 'Deleted',
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
    },
    404: { description: 'Not found' },
    500: { description: 'Server error' },
  },
});

// ── POST /api/tickets/{localId}/jira ──────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/api/tickets/{localId}/jira',
  tags: ['jira-sync'],
  summary: 'Push ticket to Jira (create)',
  description: 'Creates the local ticket as a new Jira issue and stores the returned jiraKey.',
  operationId: 'pushTicketToJira',
  request: { params: z.object({ localId: z.string().openapi({ format: 'uuid' }) }) },
  responses: {
    200: {
      description: 'Created on Jira',
      content: {
        'application/json': {
          schema: z.object({ jiraKey: z.string(), ticket: ticketSchema }),
        },
      },
    },
    404: { description: 'Local ticket not found' },
    409: { description: 'Already exists on Jira' },
    500: { description: 'Server error' },
  },
});

// ── PATCH /api/tickets/{localId}/jira ─────────────────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/api/tickets/{localId}/jira',
  tags: ['jira-sync'],
  summary: 'Update ticket on Jira',
  description: 'Pushes local changes to the existing Jira issue.',
  operationId: 'updateTicketOnJira',
  request: { params: z.object({ localId: z.string().openapi({ format: 'uuid' }) }) },
  responses: {
    200: {
      description: 'Updated on Jira',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), ticket: ticketSchema }),
        },
      },
    },
    400: { description: 'No jiraKey on local ticket' },
    404: { description: 'Local ticket not found' },
    500: { description: 'Server error' },
  },
});

// ── GET /api/tickets/{localId}/jira ───────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/tickets/{localId}/jira',
  tags: ['jira-sync'],
  summary: 'Refresh ticket from Jira',
  description: 'Pulls the latest data from Jira and updates the local record.',
  operationId: 'refreshTicketFromJira',
  request: { params: z.object({ localId: z.string().openapi({ format: 'uuid' }) }) },
  responses: {
    200: {
      description: 'Refreshed ticket',
      content: { 'application/json': { schema: z.object({ ticket: ticketSchema }) } },
    },
    400: { description: 'No jiraKey on local ticket' },
    404: { description: 'Local ticket not found' },
    500: { description: 'Server error' },
  },
});

// ── GET /api/reviews-v2 ──────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/reviews-v2',
  tags: ['reviews-v2'],
  summary: 'List all code reviews',
  operationId: 'listReviews',
  responses: {
    200: {
      description: 'Array of review index entries',
      content: { 'application/json': { schema: z.array(reviewV2IndexEntrySchema) } },
    },
    500: { description: 'Server error' },
  },
});

// ── POST /api/reviews-v2 ─────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/api/reviews-v2',
  tags: ['reviews-v2'],
  summary: 'Create a new code review',
  operationId: 'createReview',
  request: { body: { content: { 'application/json': { schema: createReviewV2Schema } } } },
  responses: {
    201: {
      description: 'Created review',
      content: { 'application/json': { schema: reviewV2DetailSchema } },
    },
    500: { description: 'Server error' },
  },
});

// ── GET /api/reviews-v2/{id} ─────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/reviews-v2/{id}',
  tags: ['reviews-v2'],
  summary: 'Get review detail',
  operationId: 'getReview',
  request: { params: z.object({ id: z.string().openapi({ format: 'uuid' }) }) },
  responses: {
    200: {
      description: 'Review detail',
      content: { 'application/json': { schema: reviewV2DetailSchema } },
    },
    404: { description: 'Not found' },
    500: { description: 'Server error' },
  },
});

// ── PUT /api/reviews-v2/{id} ─────────────────────────────────────────────────
registry.registerPath({
  method: 'put',
  path: '/api/reviews-v2/{id}',
  tags: ['reviews-v2'],
  summary: 'Update review comments',
  operationId: 'updateReview',
  request: {
    params: z.object({ id: z.string().openapi({ format: 'uuid' }) }),
    body: { content: { 'application/json': { schema: updateReviewV2Schema } } },
  },
  responses: {
    200: {
      description: 'Updated review',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), review: reviewV2DetailSchema }) } },
    },
    404: { description: 'Not found' },
    500: { description: 'Server error' },
  },
});

// ── POST /api/reviews-v2/{id}/approve ────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/api/reviews-v2/{id}/approve',
  tags: ['reviews-v2'],
  summary: 'Post review comments to GitHub PR',
  description: 'Posts all review comments to the linked GitHub PR and marks the review as posted.',
  operationId: 'approveReview',
  request: { params: z.object({ id: z.string().openapi({ format: 'uuid' }) }) },
  responses: {
    200: {
      description: 'Posted to GitHub successfully',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
    400: { description: 'Already posted' },
    404: { description: 'Not found' },
    500: { description: 'Server error' },
  },
});

// ── Generate ──────────────────────────────────────────────────────────────────
const generator = new OpenApiGeneratorV3(registry.definitions);
const spec = generator.generateDocument({
  openapi: '3.0.3',
  info: {
    title: 'Code Tanuki — Ticket API',
    version: '1.0.0',
    description:
      'Local Jira ticket management API for Code Tanuki. All endpoints are relative to the running Next.js server.',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Dev (next dev)' },
    { url: 'http://localhost:8082', description: 'Docker' },
  ],
});

const outputPath = path.resolve(process.cwd(), 'docs/swagger.yaml');
fs.writeFileSync(outputPath, yaml.dump(spec, { lineWidth: 120, noRefs: true }), 'utf-8');
console.log(`✅ swagger.yaml generated at ${outputPath}`);
