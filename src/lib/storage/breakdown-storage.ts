import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger/winston';
import {
  BreakdownSession,
  BreakdownListEntry,
  FullJiraTicket,
  QAEntry,
  TechnicalCard,
} from '@/types/breakdown';

export class BreakdownStorageAdapter {
  private baseDir: string;
  private listFile: string;
  private knowledgeFile: string;

  constructor(
    baseDir: string = './data/breakdowns',
    knowledgeFile: string = './data/knowledge.md'
  ) {
    this.baseDir = baseDir;
    this.listFile = path.join(baseDir, 'list.json');
    this.knowledgeFile = knowledgeFile;
  }

  private sessionDir(id: string): string {
    return path.join(this.baseDir, id);
  }

  async createSession(session: BreakdownSession): Promise<void> {
    const dir = this.sessionDir(session.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.mkdir(path.join(dir, 'attachments'), { recursive: true });
    await fs.mkdir(path.join(dir, 'prompts'), { recursive: true });
    await fs.mkdir(path.join(dir, 'responses'), { recursive: true });
    await fs.writeFile(path.join(dir, 'state.json'), JSON.stringify(session, null, 2));
    logger.info(`Created breakdown session: ${session.id}`);
  }

  async updateSession(id: string, updates: Partial<BreakdownSession>): Promise<BreakdownSession> {
    const session = await this.getSession(id);
    if (!session) {
      throw new Error(`Breakdown session not found: ${id}`);
    }
    const updated: BreakdownSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(this.sessionDir(id), 'state.json'),
      JSON.stringify(updated, null, 2)
    );
    return updated;
  }

  async getSession(id: string): Promise<BreakdownSession | null> {
    try {
      const data = await fs.readFile(
        path.join(this.sessionDir(id), 'state.json'),
        'utf-8'
      );
      return JSON.parse(data) as BreakdownSession;
    } catch {
      return null;
    }
  }

  async saveJiraData(id: string, tickets: FullJiraTicket[]): Promise<void> {
    await fs.writeFile(
      path.join(this.sessionDir(id), 'jira.json'),
      JSON.stringify(tickets, null, 2)
    );
  }

  async getJiraData(id: string): Promise<FullJiraTicket[]> {
    try {
      const data = await fs.readFile(
        path.join(this.sessionDir(id), 'jira.json'),
        'utf-8'
      );
      const parsed = JSON.parse(data);
      // backward compat: old sessions stored a single object
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  async saveQAEntry(id: string, entry: QAEntry): Promise<void> {
    const history = await this.getQAHistory(id);
    history.push(entry);
    await fs.writeFile(
      path.join(this.sessionDir(id), 'qa-history.json'),
      JSON.stringify(history, null, 2)
    );
  }

  async getQAHistory(id: string): Promise<QAEntry[]> {
    try {
      const data = await fs.readFile(
        path.join(this.sessionDir(id), 'qa-history.json'),
        'utf-8'
      );
      return JSON.parse(data) as QAEntry[];
    } catch {
      return [];
    }
  }

  async savePrompt(id: string, round: number, type: string, content: string): Promise<void> {
    const filename = `${type}-${round}.txt`;
    await fs.writeFile(path.join(this.sessionDir(id), 'prompts', filename), content);
  }

  async saveAIResponse(id: string, round: number, type: string, content: object): Promise<void> {
    const filename = `${type}-${round}.json`;
    await fs.writeFile(
      path.join(this.sessionDir(id), 'responses', filename),
      JSON.stringify(content, null, 2)
    );
  }

  async saveCards(id: string, cards: TechnicalCard[]): Promise<void> {
    await fs.writeFile(
      path.join(this.sessionDir(id), 'cards.json'),
      JSON.stringify(cards, null, 2)
    );
  }

  async getCards(id: string): Promise<TechnicalCard[]> {
    try {
      const data = await fs.readFile(
        path.join(this.sessionDir(id), 'cards.json'),
        'utf-8'
      );
      return JSON.parse(data) as TechnicalCard[];
    } catch {
      return [];
    }
  }

  async saveImageDescription(id: string, description: string): Promise<void> {
    await fs.writeFile(
      path.join(this.sessionDir(id), 'image-description.txt'),
      description
    );
  }

  async getImageDescription(id: string): Promise<string | null> {
    try {
      return await fs.readFile(
        path.join(this.sessionDir(id), 'image-description.txt'),
        'utf-8'
      );
    } catch {
      return null;
    }
  }

  async saveAttachment(id: string, filename: string, buffer: Buffer): Promise<void> {
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    await fs.writeFile(path.join(this.sessionDir(id), 'attachments', sanitized), buffer);
  }

  async getList(): Promise<BreakdownListEntry[]> {
    try {
      await fs.mkdir(path.dirname(this.listFile), { recursive: true });
      const data = await fs.readFile(this.listFile, 'utf-8');
      return JSON.parse(data) as BreakdownListEntry[];
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return [];
      }
      throw error;
    }
  }

  async updateList(entry: BreakdownListEntry): Promise<void> {
    const tmpFile = this.listFile + '.tmp';
    const list = await this.getList();
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.unshift(entry);
    }
    await fs.writeFile(tmpFile, JSON.stringify(list, null, 2));
    await fs.rename(tmpFile, this.listFile);
  }

  async readKnowledge(): Promise<string> {
    try {
      return await fs.readFile(this.knowledgeFile, 'utf-8');
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return '';
      }
      throw error;
    }
  }

  async writeKnowledge(content: string): Promise<void> {
    await fs.mkdir(path.dirname(this.knowledgeFile), { recursive: true });
    await fs.writeFile(this.knowledgeFile, content);
  }
}
