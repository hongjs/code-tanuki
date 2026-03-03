export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  content: string; // download URL from Jira API
}

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  created: string;
  updated: string;
}

export interface JiraTicket {
  key: string;
  summary: string;
  description: string;
  status: string;
  type: string;
  priority?: string;
  assignee?: {
    displayName: string;
    emailAddress: string;
  };
  attachments?: JiraAttachment[];
  comments?: JiraComment[];
}

export interface JiraCommentRequest {
  ticketId: string;
  body: string;
}
