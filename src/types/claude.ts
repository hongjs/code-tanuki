import { JiraTicket } from './jira';
import { ReviewComment } from './review';

export interface ClaudeReviewRequest {
  diff: string;
  prTitle: string;
  prBody: string;
  jiraTicket?: JiraTicket;
  additionalPrompt?: string;
  maxTokens?: number;
  modelId: string;
  knowledge?: string;
  imageDescriptions?: string[];
}

export interface ClaudeReviewResponse {
  comments: ReviewComment[];
  tokensUsed?: {
    input: number;
    output: number;
  };
  cacheTokens?: {
    write: number;
    read: number;
  };
  warning?: string;
  knowledgeSection?: string;
}

export interface ClaudeModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
}
