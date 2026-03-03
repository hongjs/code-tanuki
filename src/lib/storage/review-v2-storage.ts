import fs from 'fs/promises';
import path from 'path';
import { ReviewV2IndexEntry, ReviewV2Detail } from '@/types/review-v2';
import { logger } from '../logger/winston';

const BASE_DIR = process.env.REVIEW_V2_DATA_DIR || 'data/reviews-v2';
const INDEX_FILE = path.join(BASE_DIR, 'all-reviews.json');
const DATA_DIR = path.join(BASE_DIR, 'data');

export class ReviewV2Storage {
  private async ensureDirs() {
    await fs.mkdir(BASE_DIR, { recursive: true });
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  private async loadIndex(): Promise<ReviewV2IndexEntry[]> {
    try {
      await this.ensureDirs();
      const data = await fs.readFile(INDEX_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      logger.error('Failed to load reviews-v2 index', { error: error.message });
      return [];
    }
  }

  private async saveIndex(entries: ReviewV2IndexEntry[]): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(INDEX_FILE, JSON.stringify(entries, null, 2));
  }

  async getAll(): Promise<ReviewV2IndexEntry[]> {
    const list = await this.loadIndex();
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getById(id: string): Promise<ReviewV2Detail | null> {
    try {
      const itemPath = path.join(DATA_DIR, id, 'item.json');
      const data = await fs.readFile(itemPath, 'utf-8');
      return JSON.parse(data) as ReviewV2Detail;
    } catch (error: any) {
      logger.error('Failed to get review-v2 by id', { id, error: error.message });
      return null;
    }
  }

  async save(review: ReviewV2Detail): Promise<void> {
    try {
      await this.ensureDirs();

      // 1. Write full content to data/{id}/item.json
      const reviewDir = path.join(DATA_DIR, review.id);
      await fs.mkdir(reviewDir, { recursive: true });
      await fs.writeFile(path.join(reviewDir, 'item.json'), JSON.stringify(review, null, 2));

      // 2. Update index (lightweight)
      const indexEntry: ReviewV2IndexEntry = {
        id: review.id,
        timestamp: review.timestamp,
        prUrl: review.prUrl,
        prNumber: review.prNumber,
        repository: review.repository,
        prTitle: review.prTitle,
        status: review.status,
        summary: review.summary,
        jiraTicketId: review.jiraTicketId,
      };

      const entries = await this.loadIndex();
      const existingIndex = entries.findIndex((t) => t.id === review.id);
      if (existingIndex >= 0) {
        entries[existingIndex] = indexEntry;
      } else {
        entries.push(indexEntry);
      }
      await this.saveIndex(entries);

      logger.info(`Saved review-v2 ${review.id}`);
    } catch (error: any) {
      logger.error('Failed to save review-v2', { id: review.id, error: error.message });
      throw error;
    }
  }
}

export const reviewV2Storage = new ReviewV2Storage();
