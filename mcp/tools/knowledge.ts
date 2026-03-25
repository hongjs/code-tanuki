import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const KNOWLEDGE_FILE = path.resolve(process.env.KNOWLEDGE_FILE ?? './data/knowledge.md');

export function registerKnowledgeTools(server: McpServer): void {
  // ── read_knowledge ─────────────────────────────────────────────────────────
  server.registerTool(
    'read_knowledge',
    {
      description:
        'Read the project knowledge base (data/knowledge.md). ' +
        'This file contains domain rules, tech conventions, and architecture notes ' +
        'that are injected into every AI code review.',
      inputSchema: {},
    },
    async () => {
      const content = await readFile(KNOWLEDGE_FILE, 'utf-8');
      return { content: [{ type: 'text', text: content }] };
    }
  );

  // ── update_knowledge ───────────────────────────────────────────────────────
  server.registerTool(
    'update_knowledge',
    {
      description:
        'Overwrite the project knowledge base (data/knowledge.md) with new content. ' +
        'Use this to add domain rules, update conventions, or remove outdated notes.',
      inputSchema: {
        content: z.string().min(1).describe('Full Markdown content to write to knowledge.md'),
      },
    },
    async ({ content }) => {
      await writeFile(KNOWLEDGE_FILE, content, 'utf-8');
      return { content: [{ type: 'text', text: 'knowledge.md updated successfully.' }] };
    }
  );
}
