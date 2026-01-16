export interface Review {
  id: string; // UUID
  timestamp: string; // ISO 8601
  prUrl: string;
  prNumber: number;
  repository: string; // "owner/repo"
  prTitle: string;
  jiraTicketId?: string;
  modelId: string;
  additionalPrompt?: string;
  status: 'success' | 'error';
  comments: ReviewComment[];
  error?: string;
  metadata: ReviewMetadata;
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  severity: 'critical' | 'warning' | 'suggestion';
}

export interface ReviewMetadata {
  durationMs: number;
  retryCount: number;
  tokensUsed?: {
    input: number;
    output: number;
  };
  steps: {
    fetchGitHub: StepResult;
    fetchJira?: StepResult;
    aiReview: StepResult;
    postGitHubComments: StepResult;
    postJiraComment?: StepResult;
  };
}

export interface StepResult {
  success: boolean;
  durationMs: number;
  error?: string;
}

export type ReviewStatus =
  | 'idle'
  | 'fetching-github'
  | 'fetching-jira'
  | 'ai-review'
  | 'posting-comments'
  | 'success'
  | 'error';
