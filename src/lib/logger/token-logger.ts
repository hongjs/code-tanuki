import * as fs from 'fs/promises';
import * as path from 'path';

export interface TokenUsageRecord {
  timestamp: string;
  method: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

const TOKEN_LOG_FILE = path.join(process.cwd(), 'data', 'token-usage.jsonl');

export async function recordTokenUsage(record: TokenUsageRecord): Promise<void> {
  try {
    await fs.mkdir(path.dirname(TOKEN_LOG_FILE), { recursive: true });
    await fs.appendFile(TOKEN_LOG_FILE, JSON.stringify(record) + '\n');
  } catch {
    // Non-fatal: don't break the main flow if logging fails
  }
}
