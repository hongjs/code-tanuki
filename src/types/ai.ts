import { JiraTicket } from './jira';
import { ReviewComment } from './review';

export type AIProvider = 'claude' | 'gemini';

export interface AIReviewRequest {
  diff: string;
  prTitle: string;
  prBody: string;
  jiraTicket?: JiraTicket;
  additionalPrompt?: string;
  maxTokens?: number;
  modelId: string;
  provider?: AIProvider;
  knowledge?: string;
}

export interface AIReviewResponse {
  comments: ReviewComment[];
  tokensUsed?: {
    input: number;
    output: number;
  };
  warning?: string;
  knowledgeSection?: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  provider: AIProvider;
  outTokenPrice: number;
  inTokenPrice: number;
}

export interface AppConfig {
  hasJiraConfig: boolean;
  hasAnthropicKey: boolean;
  hasGeminiKey: boolean;
}
