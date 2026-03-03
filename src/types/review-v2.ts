import { ReviewComment } from './review';

export type ReviewV2Status = 'pending' | 'approved' | 'posted' | 'error';

export interface ReviewV2IndexEntry {
  id: string;               // UUID v7
  timestamp: string;        // ISO 8601 creation time
  prUrl: string;
  prNumber: number;
  repository: string;       // "owner/repo"
  prTitle: string;
  status: ReviewV2Status;
  summary?: string;         // A brief AI-generated summary of the PR
  jiraTicketId?: string;    // Associated Jira ticket if any
}

export interface ReviewV2Detail extends ReviewV2IndexEntry {
  comments: ReviewComment[];
}
