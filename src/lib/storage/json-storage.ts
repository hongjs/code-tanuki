import { IStorageAdapter, PaginatedReviews, ReviewFilters } from '@/types/storage';
import { Review } from '@/types/review';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger/winston';

export class JsonStorageAdapter implements IStorageAdapter {
  private baseDir: string;
  private dataDir: string;
  private allReviewsFile: string;

  constructor(baseDir: string = './data/reviews') {
    this.baseDir = baseDir;
    this.dataDir = path.join(baseDir, 'data');
    this.allReviewsFile = path.join(baseDir, 'all-reviews.json');
  }

  async saveReview(review: Review): Promise<void> {
    try {
      // Ensure data directories exist
      const reviewDir = path.join(this.dataDir, review.id);
      await fs.mkdir(reviewDir, { recursive: true });

      // 1. Save metadata to item.json
      await fs.writeFile(
        path.join(reviewDir, 'item.json'), 
        JSON.stringify(review, null, 2)
      );

      logger.info(`Saved review item.json for ID: ${review.id}`);

      // 2. Update all-reviews.json (Index)
      // We load all, check if exists (update) or push new
      let allReviews = await this.loadAllReviews();
      const existingIndex = allReviews.findIndex(r => r.id === review.id);
      
      if (existingIndex >= 0) {
        allReviews[existingIndex] = review;
      } else {
        allReviews.push(review);
      }

      await fs.writeFile(this.allReviewsFile, JSON.stringify(allReviews, null, 2));

      logger.info(`Updated all-reviews.json with review ID: ${review.id}`);
    } catch (error) {
      logger.error('Failed to save review', {
        error: error instanceof Error ? error.message : String(error),
        reviewId: review.id,
      });
      throw error;
    }
  }

  async saveArtifact(reviewId: string, filename: string, content: any): Promise<void> {
    try {
      const reviewDir = path.join(this.dataDir, reviewId);
      await fs.mkdir(reviewDir, { recursive: true });

      const filePath = path.join(reviewDir, filename);
      const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      
      await fs.writeFile(filePath, fileContent);
      logger.info(`Saved artifact ${filename} for review ${reviewId}`);
    } catch (error) {
      logger.error(`Failed to save artifact ${filename}`, {
        reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw, just log error for artifacts to avoid breaking main flow
    }
  }

  async getReview(id: string): Promise<Review | null> {
    try {
      // Try to load from specific folder first (source of truth)
      const reviewDir = path.join(this.dataDir, id);
      const itemPath = path.join(reviewDir, 'item.json');
      
      try {
        const data = await fs.readFile(itemPath, 'utf-8');
        return JSON.parse(data) as Review;
      } catch (e) {
        // Fallback to all-reviews if specific file missing (legacy support or inconsistency)
        const allReviews = await this.loadAllReviews();
        return allReviews.find((r) => r.id === id) || null;
      }
    } catch (error) {
      logger.error('Failed to get review', {
        error: error instanceof Error ? error.message : String(error),
        reviewId: id,
      });
      throw error;
    }
  }

  async getAllReviews(filters?: ReviewFilters): Promise<PaginatedReviews> {
    try {
      let reviews = await this.loadAllReviews();

      // Apply filters
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        reviews = reviews.filter(
          (r) =>
            r.prNumber.toString().includes(searchLower) ||
            r.repository.toLowerCase().includes(searchLower) ||
            r.jiraTicketId?.toLowerCase().includes(searchLower)
        );
      }

      if (filters?.status) {
        reviews = reviews.filter((r) => r.status === filters.status);
      }

      if (filters?.dateFrom) {
        reviews = reviews.filter((r) => new Date(r.timestamp) >= filters.dateFrom!);
      }

      if (filters?.dateTo) {
        reviews = reviews.filter((r) => new Date(r.timestamp) <= filters.dateTo!);
      }

      if (filters?.model) {
        reviews = reviews.filter((r) => r.modelId === filters.model);
      }

      // Sort by timestamp desc (newest first)
      reviews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const startIndex = (page - 1) * limit;
      const paginatedReviews = reviews.slice(startIndex, startIndex + limit);

      return {
        reviews: paginatedReviews,
        total: reviews.length,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Failed to get all reviews', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteReview(id: string): Promise<void> {
    try {
      // 1. Remove from all-reviews.json
      const allReviews = await this.loadAllReviews();
      const filteredReviews = allReviews.filter((r) => r.id !== id);

      if (filteredReviews.length === allReviews.length) {
        logger.warn(`Review not found for deletion: ${id}`);
        return;
      }

      await fs.writeFile(this.allReviewsFile, JSON.stringify(filteredReviews, null, 2));

      // 2. Delete review directory
      const reviewDir = path.join(this.dataDir, id);
      try {
        await fs.rm(reviewDir, { recursive: true, force: true });
        logger.info(`Deleted review directory: ${id}`);
      } catch (e) {
        logger.warn(`Failed to delete review directory ${id}`, { error: e });
      }

    } catch (error) {
      logger.error('Failed to delete review', {
        error: error instanceof Error ? error.message : String(error),
        reviewId: id,
      });
      throw error;
    }
  }

  async checkDuplicate(prNumber: number, withinMinutes: number): Promise<Review | null> {
    try {
      const reviews = await this.loadAllReviews();
      const cutoffTime = Date.now() - withinMinutes * 60 * 1000;

      const duplicate = reviews.find(
        (r) => r.prNumber === prNumber && new Date(r.timestamp).getTime() > cutoffTime
      );

      if (duplicate) {
        logger.info(`Found duplicate review for PR #${prNumber}`, {
          reviewId: duplicate.id,
          timestamp: duplicate.timestamp,
        });
      }

      return duplicate || null;
    } catch (error) {
      logger.error('Failed to check duplicate', {
        error: error instanceof Error ? error.message : String(error),
        prNumber,
      });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if data directory exists and is writable
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.access(this.dataDir, fs.constants.W_OK);

      // Try to load all reviews (checks file readability)
      await this.loadAllReviews();

      return true;
    } catch (error) {
      logger.error('Storage health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async loadAllReviews(): Promise<Review[]> {
    try {
      await fs.mkdir(path.dirname(this.allReviewsFile), { recursive: true });
      const data = await fs.readFile(this.allReviewsFile, 'utf-8');
      return JSON.parse(data) as Review[];
    } catch (error: unknown) {
      // Check if error is a NodeJS.ErrnoException
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          // File doesn't exist yet, return empty array
          logger.info('all-reviews.json not found, initializing empty array');
          return [];
        }
      }
      throw error;
    }
  }
}
