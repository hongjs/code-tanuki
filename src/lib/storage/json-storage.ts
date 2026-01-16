import { IStorageAdapter, PaginatedReviews, ReviewFilters } from '@/types/storage';
import { Review } from '@/types/review';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger/winston';

export class JsonStorageAdapter implements IStorageAdapter {
  private dataDir: string;
  private allReviewsFile: string;

  constructor(dataDir: string = './data/reviews') {
    this.dataDir = dataDir;
    this.allReviewsFile = path.join(dataDir, 'all-reviews.json');
  }

  async saveReview(review: Review): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      // 1. Save individual file
      const filename = `${review.timestamp.replace(/:/g, '-')}-${review.prNumber}.json`;
      const individualFilePath = path.join(this.dataDir, filename);
      await fs.writeFile(individualFilePath, JSON.stringify(review, null, 2));

      logger.info(`Saved individual review file: ${filename}`);

      // 2. Append to all-reviews.json
      const allReviews = await this.loadAllReviews();
      allReviews.push(review);
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

  async getReview(id: string): Promise<Review | null> {
    try {
      const allReviews = await this.loadAllReviews();
      return allReviews.find((r) => r.id === id) || null;
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
      // Remove from all-reviews.json
      const allReviews = await this.loadAllReviews();
      const filteredReviews = allReviews.filter((r) => r.id !== id);

      if (filteredReviews.length === allReviews.length) {
        logger.warn(`Review not found for deletion: ${id}`);
        return;
      }

      await fs.writeFile(this.allReviewsFile, JSON.stringify(filteredReviews, null, 2));

      logger.info(`Deleted review from all-reviews.json: ${id}`);

      // Note: Individual files are not deleted for data retention
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
