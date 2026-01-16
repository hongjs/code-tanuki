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
}

export interface JiraCommentRequest {
  ticketId: string;
  body: string;
}
