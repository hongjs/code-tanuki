import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiFetch } from '../lib/api-fetch.js';

export function registerTicketTools(server: McpServer): void {
  // ── list_tickets ───────────────────────────────────────────────────────────
  server.registerTool(
    'list_tickets',
    {
      description: 'List local Jira tickets with optional filters',
      inputSchema: {
        search: z.string().optional().describe('Free-text search on title'),
        type: z
          .enum(['Epic', 'Story', 'Task', 'Sub-task', 'Bug'])
          .optional()
          .describe('Filter by ticket type'),
        status: z
          .string()
          .optional()
          .describe('Filter by status, e.g. "To Do", "In Progress", "Done"'),
      },
    },
    async ({ search, type, status }) => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      const qs = params.toString();
      const data = await apiFetch(`/api/tickets${qs ? `?${qs}` : ''}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── get_ticket ─────────────────────────────────────────────────────────────
  server.registerTool(
    'get_ticket',
    {
      description: 'Get full detail of a local ticket by its localId',
      inputSchema: {
        localId: z.string().describe('UUIDv7 local ticket ID'),
      },
    },
    async ({ localId }) => {
      const data = await apiFetch(`/api/tickets/${localId}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── create_ticket ──────────────────────────────────────────────────────────
  server.registerTool(
    'create_ticket',
    {
      description: 'Create a new local ticket (not yet pushed to Jira)',
      inputSchema: {
        title: z.string().min(1).describe('Ticket title'),
        type: z.enum(['Epic', 'Story', 'Task', 'Sub-task', 'Bug']).describe('Ticket type'),
        description: z.string().optional().describe('Markdown description'),
        status: z.string().optional().describe('Status, default "To Do"'),
        priority: z.string().optional().describe('Priority, e.g. "High", "Medium", "Low"'),
        storyPoints: z.number().optional().describe('Story point estimate'),
        assignee: z.string().optional().describe('Assignee display name or account ID'),
        parentKey: z.string().optional().describe('Parent Jira key, e.g. "PROJ-10"'),
        subtaskKeys: z.array(z.string()).optional().describe('Subtask Jira keys'),
        labels: z.array(z.string()).optional().describe('Labels'),
      },
    },
    async (body) => {
      const data = await apiFetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── update_ticket ──────────────────────────────────────────────────────────
  server.registerTool(
    'update_ticket',
    {
      description: 'Update fields of an existing local ticket',
      inputSchema: {
        localId: z.string().describe('UUIDv7 local ticket ID'),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        type: z.enum(['Epic', 'Story', 'Task', 'Sub-task', 'Bug']).optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        storyPoints: z.number().optional(),
        assignee: z.string().optional(),
        parentKey: z.string().optional(),
        subtaskKeys: z.array(z.string()).optional(),
        labels: z.array(z.string()).optional(),
      },
    },
    async ({ localId, ...updates }) => {
      const data = await apiFetch(`/api/tickets/${localId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── delete_ticket ──────────────────────────────────────────────────────────
  server.registerTool(
    'delete_ticket',
    {
      description: 'Delete a local ticket by its localId',
      inputSchema: {
        localId: z.string().describe('UUIDv7 local ticket ID'),
      },
    },
    async ({ localId }) => {
      const data = await apiFetch(`/api/tickets/${localId}`, { method: 'DELETE' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
