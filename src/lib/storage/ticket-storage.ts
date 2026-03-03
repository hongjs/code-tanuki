import * as fs from 'fs/promises';
import * as path from 'path';
import { v7 as uuidv7 } from 'uuid';
import { LocalTicket, TicketFilters, TicketIndexEntry, TicketType } from '@/types/ticket';
import { logger } from '../logger/winston';
import { env } from '../utils/env';

const BASE_DIR = env.TICKET_DATA_DIR || 'data/jira-tickets';
const INDEX_FILE = `${BASE_DIR}/tickets.json`;
const DATA_DIR = `${BASE_DIR}/data`;

const JIRA_KEY_PATTERN = /^[A-Z]+-\d+$/;

function toIndexEntry(ticket: LocalTicket): TicketIndexEntry {
  return {
    localId: ticket.localId,
    jiraKey: ticket.jiraKey,
    title: ticket.title,
    type: ticket.type,
    status: ticket.status,
    priority: ticket.priority,
    storyPoints: ticket.storyPoints,
    parentKey: ticket.parentKey,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    syncedAt: ticket.syncedAt,
  };
}

// Migrate old flat format (from tickets.json before restructure)
function migrateEntry(raw: Record<string, unknown>): LocalTicket {
  if (raw.localId) {
    return raw as unknown as LocalTicket;
  }

  // Old format: { id, type, title, objective, status, parentEpic, subtasks }
  const oldId = raw.id as string | undefined;
  const jiraKey = oldId && JIRA_KEY_PATTERN.test(oldId) ? oldId : undefined;
  const now = new Date().toISOString();

  return {
    localId: uuidv7(),
    jiraKey,
    title: (raw.title as string) || '',
    description: (raw.objective as string) || undefined,
    type: (raw.type as TicketType) || 'Task',
    status: (raw.status as string) || 'To Do',
    priority: raw.priority as string | undefined,
    storyPoints: raw.storyPoints as number | undefined,
    assignee: raw.assignee as string | undefined,
    parentKey: (raw.parentEpic as string) || undefined,
    subtaskKeys: (raw.subtasks as string[]) || undefined,
    labels: raw.labels as string[] | undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export class TicketStorage {
  private async ensureDirs(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  private async loadIndex(): Promise<LocalTicket[]> {
    try {
      await fs.mkdir(BASE_DIR, { recursive: true });
      const data = await fs.readFile(INDEX_FILE, 'utf-8');
      const raw = JSON.parse(data) as Record<string, unknown>[];
      return raw.map(migrateEntry);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          return [];
        }
      }
      throw error;
    }
  }

  private async saveIndex(tickets: LocalTicket[]): Promise<void> {
    await fs.mkdir(BASE_DIR, { recursive: true });
    const indexEntries = tickets.map(toIndexEntry);
    await fs.writeFile(INDEX_FILE, JSON.stringify(indexEntries, null, 2));
  }

  async getAll(filters?: TicketFilters): Promise<LocalTicket[]> {
    let tickets = await this.loadIndex();

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.jiraKey?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    if (filters?.type) {
      tickets = tickets.filter((t) => t.type === filters.type);
    }

    if (filters?.status) {
      tickets = tickets.filter((t) => t.status === filters.status);
    }

    return tickets;
  }

  async getById(localId: string): Promise<LocalTicket | null> {
    try {
      // Try item.json first (full content)
      const itemPath = path.join(DATA_DIR, localId, 'item.json');
      try {
        const data = await fs.readFile(itemPath, 'utf-8');
        return JSON.parse(data) as LocalTicket;
      } catch {
        // Fallback to index
        const tickets = await this.loadIndex();
        return tickets.find((t) => t.localId === localId) || null;
      }
    } catch (error) {
      logger.error('Failed to get ticket by id', {
        localId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async save(ticket: LocalTicket): Promise<void> {
    try {
      await this.ensureDirs();

      // 1. Write full content to data/{localId}/item.json
      const ticketDir = path.join(DATA_DIR, ticket.localId);
      await fs.mkdir(ticketDir, { recursive: true });
      await fs.writeFile(path.join(ticketDir, 'item.json'), JSON.stringify(ticket, null, 2));

      // 2. Update index (lightweight)
      const tickets = await this.loadIndex();
      const existingIndex = tickets.findIndex((t) => t.localId === ticket.localId);
      if (existingIndex >= 0) {
        tickets[existingIndex] = ticket;
      } else {
        tickets.push(ticket);
      }
      await this.saveIndex(tickets);

      logger.info(`Saved ticket ${ticket.localId}`, { jiraKey: ticket.jiraKey });
    } catch (error) {
      logger.error('Failed to save ticket', {
        localId: ticket.localId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async delete(localId: string): Promise<void> {
    try {
      // 1. Remove from index
      const tickets = await this.loadIndex();
      const filtered = tickets.filter((t) => t.localId !== localId);
      await this.saveIndex(filtered);

      // 2. Remove data directory
      const ticketDir = path.join(DATA_DIR, localId);
      try {
        await fs.rm(ticketDir, { recursive: true, force: true });
      } catch (e) {
        logger.warn(`Failed to delete ticket directory ${localId}`, { error: e });
      }

      logger.info(`Deleted ticket ${localId}`);
    } catch (error) {
      logger.error('Failed to delete ticket', {
        localId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getAttachmentsDir(localId: string): Promise<string> {
    const dir = path.join(DATA_DIR, localId, 'attachments');
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async listAttachments(localId: string): Promise<string[]> {
    const dir = path.join(DATA_DIR, localId, 'attachments');
    try {
      return await fs.readdir(dir);
    } catch {
      return [];
    }
  }
}

export const ticketStorage = new TicketStorage();
