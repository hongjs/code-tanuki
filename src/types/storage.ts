import { Review } from './review';

export interface IStorageAdapter {
  // Review operations
  saveReview(review: Review): Promise<void>;
  saveArtifact(reviewId: string, filename: string, content: any): Promise<void>;
  getReview(id: string): Promise<Review | null>;
  getAllReviews(filters?: ReviewFilters): Promise<PaginatedReviews>;
  deleteReview(id: string): Promise<void>;

  // Duplicate check
  checkDuplicate(prNumber: number, withinMinutes: number): Promise<Review | null>;

  // Health check
  healthCheck(): Promise<boolean>;
}

export interface ReviewFilters {
  search?: string;
  status?: 'success' | 'error';
  dateFrom?: Date;
  dateTo?: Date;
  model?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedReviews {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
}
