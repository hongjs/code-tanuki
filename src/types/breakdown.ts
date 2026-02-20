export type BreakdownStatus =
  | 'idle'
  | 'fetching-jira'
  | 'analyzing-images'
  | 'ai-initial-analysis'
  | 'clarifying'
  | 're-analyzing'
  | 'generating-cards'
  | 'preview'
  | 'publishing'
  | 'knowledge-update'
  | 'completed'
  | 'error';

export interface BreakdownSession {
  id: string; // UUID v7
  status: BreakdownStatus;
  jiraTicketIds: string[]; // supports multiple tickets
  modelId: string;
  detailLevel: 'detailed' | 'balanced' | 'minimal';
  enableDevCoaching: boolean;
  additionalPrompt?: string;
  qaRoundCount: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  error?: string;
  publishedIssueKeys?: string[];
  knowledgeSuggestion?: KnowledgeSuggestion;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string; // download URL
}

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  created: string;
}

export interface FullJiraTicket {
  key: string;
  summary: string;
  description: string;
  status: string;
  type: string;
  priority?: string;
  labels: string[];
  storyPoints?: number;
  epicKey?: string;
  epicSummary?: string;
  reporter?: string;
  assignee?: {
    displayName: string;
    emailAddress: string;
  };
  attachments: JiraAttachment[];
  comments: JiraComment[];
  projectKey: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  category: 'api' | 'database' | 'external-service' | 'ui' | 'business-logic' | 'other';
}

export interface QAAnswer {
  questionId: string;
  answer: string;
}

export interface QAEntry {
  round: number;
  timestamp: string;
  questions: ClarifyingQuestion[];
  answers: QAAnswer[];
}

export interface TestStrategy {
  unit: string[];
  integration: string[];
  e2e: string[];
  regression: string[];
}

export interface TechnicalCard {
  id: string;
  title: string;
  type: 'subtask' | 'story';
  description: string;
  acceptanceCriteria: string[];
  technicalDetails: string;
  testStrategy: TestStrategy;
  risks: string[];
  storyPoints: number;
  challengeQuestion?: string;
  parentTicket: string;
}

export interface AIAnalysisResponse {
  needsClarification: boolean;
  questions?: ClarifyingQuestion[];
  analysisNotes?: string;
  knowledgeSuggestion?: KnowledgeSuggestion;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

export interface KnowledgeSuggestion {
  section: string;
  content: string;
  reason: string;
}

export interface AICardsResponse {
  cards: TechnicalCard[];
  summary: string;
  knowledgeSuggestion?: KnowledgeSuggestion;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

export interface BreakdownListEntry {
  id: string;
  jiraTicketIds: string[]; // supports multiple tickets
  jiraSummary: string;
  status: BreakdownStatus;
  modelId: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}
