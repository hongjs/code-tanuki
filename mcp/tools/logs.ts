import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const LOG_DIR = path.resolve(process.env.LOG_DIR ?? './logs');

export function registerLogTools(server: McpServer): void {
  // ── list_log_files ─────────────────────────────────────────────────────────
  server.registerTool(
    'list_log_files',
    {
      description: 'List available log files in the logs directory with their sizes and last-modified times.',
      inputSchema: {},
    },
    async () => {
      const entries = await readdir(LOG_DIR);
      const files = await Promise.all(
        entries
          .filter((f) => f.endsWith('.log'))
          .map(async (f) => {
            const s = await stat(path.join(LOG_DIR, f));
            return { file: f, sizeBytes: s.size, lastModified: s.mtime.toISOString() };
          })
      );
      return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
    }
  );

  // ── read_log ───────────────────────────────────────────────────────────────
  server.registerTool(
    'read_log',
    {
      description:
        'Read the last N lines of a log file. ' +
        'Optionally filter by log level (error/warn/info/debug) or a search string.',
      inputSchema: {
        file: z
          .enum(['combined.log', 'error.log'])
          .describe('Log file to read'),
        lines: z
          .number()
          .int()
          .min(1)
          .max(2000)
          .optional()
          .describe('Number of lines to return from the end of the file (default: 200)'),
        level: z
          .enum(['error', 'warn', 'info', 'debug'])
          .optional()
          .describe('Filter entries by log level'),
        search: z
          .string()
          .optional()
          .describe('Return only lines whose message or JSON contains this string'),
      },
    },
    async ({ file, lines = 200, level, search }) => {
      const filePath = path.join(LOG_DIR, file);
      const raw = await readFile(filePath, 'utf-8');
      let entries = raw
        .split('\n')
        .filter(Boolean)
        .slice(-lines * 4) // over-fetch so filters leave enough
        .map((line) => {
          try { return JSON.parse(line); } catch { return { raw: line }; }
        });

      if (level) entries = entries.filter((e) => e.level === level);
      if (search) {
        const lower = search.toLowerCase();
        entries = entries.filter((e) => JSON.stringify(e).toLowerCase().includes(lower));
      }

      const result = entries.slice(-lines);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
