import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { createServer } from 'http';

import { registerTicketTools } from './tools/tickets.js';
import { registerJiraTools } from './tools/jira.js';
import { registerLogTools } from './tools/logs.js';

const BASE_URL = process.env.CODE_TANUKI_BASE_URL ?? 'http://127.0.0.1:3000';
const PORT = parseInt(process.env.MCP_PORT ?? '3001', 10);

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'code-tanuki-tickets',
    version: '1.1.0',
  });

  registerTicketTools(server);
  registerJiraTools(server);
  registerLogTools(server);

  return server;
}

// ── HTTP / Streamable HTTP server ──────────────────────────────────────────
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

const httpServer = createServer(async (req, res) => {
  if (req.url === '/mcp') {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (req.method === 'POST' && !sessionId) {
      // New session — initialisation request
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      const server = createMcpServer();
      transport.onclose = () => sessions.delete(transport.sessionId!);
      await server.connect(transport);
      await transport.handleRequest(req, res);
      if (transport.sessionId) sessions.set(transport.sessionId, { transport, server });
    } else if (sessionId && sessions.has(sessionId)) {
      // Existing session
      await sessions.get(sessionId)!.transport.handleRequest(req, res);
    } else if (req.method === 'GET') {
      // Stateless GET (health / capability probe)
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad request or unknown session' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

httpServer.listen(PORT, () => {
  process.stderr.write(
    `[code-tanuki-mcp] Streamable HTTP server started\n` +
      `  MCP endpoint : http://127.0.0.1:${PORT}/mcp\n` +
      `  BASE_URL     : ${BASE_URL}\n`
  );
});
