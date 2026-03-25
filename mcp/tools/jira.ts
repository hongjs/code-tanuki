import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiFetch } from '../lib/api-fetch.js';

export function registerJiraTools(server: McpServer): void {
  // ── sync_ticket_from_jira ──────────────────────────────────────────────────
  server.registerTool(
    'sync_ticket_from_jira',
    {
      description:
        'Sync a Jira ticket into local storage by Jira key. Creates or updates the local record.',
      inputSchema: {
        jiraKey: z.string().describe('Jira issue key, e.g. "PROJ-123"'),
      },
    },
    async ({ jiraKey }) => {
      const data = await apiFetch('/api/tickets/sync-new', {
        method: 'POST',
        body: JSON.stringify({ jiraKey }),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── refresh_ticket_from_jira ───────────────────────────────────────────────
  server.registerTool(
    'refresh_ticket_from_jira',
    {
      description:
        'Pull the latest state from Jira and update the local record (ticket must already have a jiraKey)',
      inputSchema: {
        localId: z.string().describe('UUIDv7 local ticket ID'),
      },
    },
    async ({ localId }) => {
      const data = await apiFetch(`/api/tickets/${localId}/jira`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── bulk_sync_from_jira ────────────────────────────────────────────────────
  server.registerTool(
    'bulk_sync_from_jira',
    {
      description:
        'Pull the latest Jira state for multiple local tickets at once. ' +
        'All tickets must already have a jiraKey. Read-only on Jira side.',
      inputSchema: {
        localIds: z
          .array(z.string())
          .min(1)
          .describe('List of UUIDv7 local ticket IDs to sync from Jira'),
      },
    },
    async ({ localIds }) => {
      const data = await apiFetch('/api/tickets/bulk-jira', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync', localIds }),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
