import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from 'http';
import { z } from 'zod';

const BASE_URL = process.env.CODE_TANUKI_BASE_URL ?? 'http://localhost:8082';
const PORT = parseInt(process.env.MCP_PORT ?? '3001', 10);

async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = (data as any)?.error ?? res.statusText;
    throw new Error(`API error ${res.status}: ${msg}`);
  }
  return data;
}

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'code-tanuki-tickets',
    version: '1.0.0',
  });

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

  // ── push_ticket_to_jira ────────────────────────────────────────────────────
  server.registerTool(
    'push_ticket_to_jira',
    {
      description:
        'Create the local ticket as a new Jira issue. Stores the returned jiraKey on the local record.',
      inputSchema: {
        localId: z.string().describe('UUIDv7 local ticket ID'),
      },
    },
    async ({ localId }) => {
      const data = await apiFetch(`/api/tickets/${localId}/jira`, { method: 'POST' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── update_ticket_on_jira ──────────────────────────────────────────────────
  server.registerTool(
    'update_ticket_on_jira',
    {
      description:
        'Push local changes to the existing Jira issue (ticket must already have a jiraKey)',
      inputSchema: {
        localId: z.string().describe('UUIDv7 local ticket ID'),
      },
    },
    async ({ localId }) => {
      const data = await apiFetch(`/api/tickets/${localId}/jira`, { method: 'PATCH' });
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

  return server;
}

// ── HTTP / SSE server ──────────────────────────────────────────────────────
const transports = new Map<string, SSEServerTransport>();

const httpServer = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/sse') {
    const transport = new SSEServerTransport('/messages', res);
    transports.set(transport.sessionId, transport);
    transport.onclose = () => transports.delete(transport.sessionId);

    const server = createMcpServer();
    await server.connect(transport);
  } else if (req.method === 'POST' && req.url?.startsWith('/messages')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const sessionId = url.searchParams.get('sessionId');
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

httpServer.listen(PORT, () => {
  process.stderr.write(
    `[code-tanuki-mcp] SSE server started\n` +
    `  SSE endpoint : http://localhost:${PORT}/sse\n` +
    `  BASE_URL     : ${BASE_URL}\n`
  );
});
