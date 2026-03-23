import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const ticketTypeValues: [string, ...string[]] = ['Epic', 'Story', 'Task', 'Sub-task', 'Bug'];

export const ticketTypeSchema = z
  .enum(['Epic', 'Story', 'Task', 'Sub-task', 'Bug'])
  .openapi({ description: 'Ticket type' });

export const createTicketSchema = z
  .object({
    title: z.string().min(1).openapi({ example: 'Add user authentication' }),
    description: z.string().optional().openapi({ description: 'Markdown body' }),
    type: ticketTypeSchema,
    status: z.string().default('To Do').openapi({ example: 'To Do' }),
    priority: z.string().optional().openapi({ example: 'Medium' }),
    storyPoints: z.number().optional().openapi({ example: 3 }),
    assignee: z.string().optional(),
    parentKey: z.string().optional().openapi({ example: 'PROJ-10' }),
    subtaskKeys: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
  })
  .openapi('CreateTicketRequest');

export const updateTicketSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    type: ticketTypeSchema.optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    storyPoints: z.number().optional(),
    assignee: z.string().optional(),
    parentKey: z.string().optional(),
    subtaskKeys: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
  })
  .openapi('UpdateTicketRequest');

export const syncFromJiraSchema = z
  .object({
    jiraKey: z.string().openapi({ example: 'PROJ-123', description: 'Jira issue key' }),
  })
  .openapi('SyncFromJiraRequest');

export const ticketSchema = z
  .object({
    localId: z.string().openapi({ format: 'uuid', description: 'UUIDv7 local identifier' }),
    jiraKey: z
      .string()
      .nullable()
      .openapi({ example: 'PROJ-123', description: 'Null until pushed to Jira' }),
    title: z.string(),
    description: z.string().optional(),
    type: ticketTypeSchema,
    status: z.string().openapi({ example: 'To Do' }),
    priority: z.string().optional(),
    storyPoints: z.number().optional(),
    assignee: z.string().optional(),
    parentKey: z.string().nullable().optional(),
    subtaskKeys: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    createdAt: z.string().openapi({ format: 'date-time' }),
    updatedAt: z.string().openapi({ format: 'date-time' }),
    syncedAt: z.string().nullable().optional().openapi({ format: 'date-time' }),
  })
  .openapi('Ticket');

export const ticketIndexEntrySchema = z
  .object({
    localId: z.string().openapi({ format: 'uuid' }),
    jiraKey: z.string().nullable(),
    title: z.string(),
    type: ticketTypeSchema,
    status: z.string(),
    parentKey: z.string().nullable().optional(),
    createdAt: z.string().openapi({ format: 'date-time' }),
    updatedAt: z.string().openapi({ format: 'date-time' }),
    syncedAt: z.string().nullable().optional().openapi({ format: 'date-time' }),
  })
  .openapi('TicketIndexEntry');
