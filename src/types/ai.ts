import { JiraTicket } from './jira';
import { ReviewComment } from './review';

export type AIProvider = 'claude' | 'gemini';

export interface AIReviewRequest {
  diff: string;
  prTitle: string;
  prBody: string;
  jiraTicket?: JiraTicket;
  additionalPrompt?: string;
  modelId: string;
  provider: AIProvider;
}

export interface AIReviewResponse {
  comments: ReviewComment[];
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  provider: AIProvider;
}

export interface AppConfig {
  hasJiraConfig: boolean;
  hasAnthropicKey: boolean;
  hasGeminiKey: boolean;
}
