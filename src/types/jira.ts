export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  content: string; // download URL from Jira API
}

export interface JiraTicket {
  key: string;
  summary: string;
  description: string;
  status: string;
  type: string;
  acceptanceCriteria?: string;
  priority?: string;
  assignee?: {
    displayName: string;
    emailAddress: string;
  };
  attachments?: JiraAttachment[];
}

export interface JiraCommentRequest {
  ticketId: string;
  body: string;
}
