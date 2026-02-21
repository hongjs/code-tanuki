import { JiraAttachment } from './jira';

export type TicketType = 'Epic' | 'Story' | 'Task' | 'Sub-task' | 'Bug';
export type TicketStatus = 'To Do' | 'In Progress' | 'Done';
export type TicketPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

export interface LocalTicket {
  localId: string;          // UUID - local identifier (always present)
  jiraKey?: string;         // "BYD-1666" - present if created on Jira
  title: string;
  description?: string;
  type: TicketType;
  status: string;           // "To Do" | "In Progress" | "Done"
  priority?: string;        // "Highest" | "High" | "Medium" | "Low" | "Lowest"
  storyPoints?: number;
  assignee?: string;
  parentKey?: string;       // jiraKey of parent Epic/Story
  subtaskKeys?: string[];   // jiraKey of subtasks
  labels?: string[];
  acceptanceCriteria?: string;
  attachments?: JiraAttachment[];
  createdAt: string;        // ISO - when added locally
  updatedAt: string;        // ISO - when last edited locally
  syncedAt?: string;        // ISO - when last synced from Jira
}

// Lightweight index entry for tickets.json
export interface TicketIndexEntry {
  localId: string;
  jiraKey?: string;
  title: string;
  type: TicketType;
  status: string;
  priority?: string;
  storyPoints?: number;
  parentKey?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface TicketFilters {
  search?: string;
  type?: TicketType | '';
  status?: string;
}

export interface BulkJiraRequest {
  action: 'create' | 'sync';
  localIds: string[];
}

export interface BulkJiraResult {
  succeeded: string[];
  failed: Array<{ localId: string; error: string }>;
}
