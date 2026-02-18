import axios, { AxiosInstance } from 'axios';
import { JiraTicket } from '@/types/jira';
import { FullJiraTicket, TechnicalCard } from '@/types/breakdown';
import { JiraAPIError } from '@/types/errors';
import { logger } from '../logger/winston';
import { withRetry } from '../utils/retry';

export class JiraClient {
  private client: AxiosInstance;

  constructor(baseURL: string, email: string, apiToken: string) {
    this.client = axios.create({
      baseURL,
      auth: {
        username: email,
        password: apiToken,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchTicket(ticketId: string): Promise<JiraTicket> {
    return withRetry(
      async () => {
        try {
          logger.info(`Fetching Jira ticket`, { ticketId });

          const response = await this.client.get(`/rest/api/3/issue/${ticketId}`);

          const { data } = response;
          const fields = data.fields;

          // Extract acceptance criteria from description or custom field
          let acceptanceCriteria: string | undefined;
          if (fields.description?.content) {
            const content = fields.description.content;
            for (const block of content) {
              if (block.type === 'heading' && ['acceptance criteria', 'a/c'].includes(block.content?.[0]?.text?.toLowerCase())) {
                // Find next paragraph block
                const index = content.indexOf(block);
                if (index !== -1 && content[index + 1]?.type === 'paragraph') {
                  acceptanceCriteria = content[index + 1].content
                    ?.map((c: { text?: string }) => c.text)
                    .join('');
                }
              }
            }
          }

          const ticket: JiraTicket = {
            key: data.key,
            summary: fields.summary,
            description: this.extractPlainText(fields.description),
            status: fields.status.name,
            type: fields.issuetype.name,
            acceptanceCriteria,
            priority: fields.priority?.name,
            assignee: fields.assignee
              ? {
                  displayName: fields.assignee.displayName,
                  emailAddress: fields.assignee.emailAddress,
                }
              : undefined,
          };

          logger.info(`Successfully fetched Jira ticket`, { ticketId, type: ticket.type });

          return ticket;
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.errorMessages?.join(', ') || error.message;
            logger.error(`Failed to fetch Jira ticket`, {
              ticketId,
              error: message,
              status: error.response?.status,
            });
            throw new JiraAPIError(`Failed to fetch ticket: ${message}`, { ticketId });
          }

          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to fetch Jira ticket`, { ticketId, error: message });
          throw new JiraAPIError(`Failed to fetch ticket: ${message}`, { ticketId });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  async postComment(ticketId: string, prUrl: string, commentsCount: number): Promise<void> {
    return withRetry(
      async () => {
        try {
          logger.info(`Posting comment to Jira ticket`, { ticketId });

          const commentBody = {
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: '✅ AI Review completed: ',
                    },
                    {
                      type: 'text',
                      text: prUrl,
                      marks: [
                        {
                          type: 'link',
                          attrs: {
                            href: prUrl,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: `Posted ${commentsCount} review comments.`,
                    },
                  ],
                },
              ],
            },
          };

          await this.client.post(`/rest/api/3/issue/${ticketId}/comment`, commentBody);

          logger.info(`Successfully posted comment to Jira ticket`, { ticketId });
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.errorMessages?.join(', ') || error.message;
            logger.error(`Failed to post comment to Jira ticket`, {
              ticketId,
              error: message,
              status: error.response?.status,
            });
            throw new JiraAPIError(`Failed to post comment: ${message}`, { ticketId });
          }

          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to post comment to Jira ticket`, { ticketId, error: message });
          throw new JiraAPIError(`Failed to post comment: ${message}`, { ticketId });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  async fetchTicketFull(ticketId: string): Promise<FullJiraTicket> {
    return withRetry(
      async () => {
        try {
          logger.info(`Fetching full Jira ticket`, { ticketId });

          const response = await this.client.get(
            `/rest/api/3/issue/${ticketId}?fields=*all`
          );

          const { data } = response;
          const fields = data.fields;

          const epicLinkField = process.env.JIRA_EPIC_LINK_FIELD || 'customfield_10014';
          const epicKey: string | undefined =
            fields[epicLinkField] ||
            fields.parent?.fields?.issuetype?.name === 'Epic'
              ? fields.parent?.key
              : undefined;
          const epicSummary: string | undefined =
            fields.parent?.fields?.issuetype?.name === 'Epic'
              ? fields.parent?.fields?.summary
              : undefined;

          const storyPoints: number | undefined =
            fields.customfield_10016 ||
            fields.customfield_10028 ||
            fields.story_points ||
            undefined;

          const attachments = (fields.attachment || []).map(
            (a: {
              id: string;
              filename: string;
              mimeType: string;
              size: number;
              content: string;
            }) => ({
              id: a.id,
              filename: a.filename,
              mimeType: a.mimeType,
              size: a.size,
              content: a.content,
            })
          );

          const comments = (fields.comment?.comments || []).map(
            (c: {
              id: string;
              author: { displayName: string };
              body: unknown;
              created: string;
            }) => ({
              id: c.id,
              author: c.author?.displayName || 'Unknown',
              body: this.extractPlainText(c.body as { content?: Array<{ type: string; content?: Array<{ text?: string }> }> }),
              created: c.created,
            })
          );

          const ticket: FullJiraTicket = {
            key: data.key,
            summary: fields.summary,
            description: this.extractPlainText(fields.description),
            status: fields.status.name,
            type: fields.issuetype.name,
            priority: fields.priority?.name,
            labels: fields.labels || [],
            storyPoints,
            epicKey,
            epicSummary,
            reporter: fields.reporter?.displayName,
            assignee: fields.assignee
              ? {
                  displayName: fields.assignee.displayName,
                  emailAddress: fields.assignee.emailAddress,
                }
              : undefined,
            attachments,
            comments,
            projectKey: data.key.split('-')[0],
          };

          logger.info(`Successfully fetched full Jira ticket`, {
            ticketId,
            attachmentCount: attachments.length,
            commentCount: comments.length,
          });

          return ticket;
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.errorMessages?.join(', ') || error.message;
            throw new JiraAPIError(`Failed to fetch full ticket: ${message}`, { ticketId });
          }
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new JiraAPIError(`Failed to fetch full ticket: ${message}`, { ticketId });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  async downloadAttachment(url: string): Promise<Buffer> {
    try {
      const response = await this.client.get(url, {
        responseType: 'arraybuffer',
        maxContentLength: 10 * 1024 * 1024, // 10MB cap
      });
      return Buffer.from(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.errorMessages?.join(', ') || error.message;
        throw new JiraAPIError(`Failed to download attachment: ${message}`, { url });
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new JiraAPIError(`Failed to download attachment: ${message}`, { url });
    }
  }

  async createSubtask(parentTicketId: string, card: TechnicalCard): Promise<string> {
    return withRetry(
      async () => {
        try {
          logger.info(`Creating Jira subtask`, { parentTicketId, title: card.title });

          const projectKey = parentTicketId.split('-')[0];
          const { buildCardADF } = await import('../utils/jira-card-builder');

          const payload = {
            fields: {
              project: { key: projectKey },
              parent: { key: parentTicketId },
              summary: card.title,
              description: buildCardADF(card),
              issuetype: { name: 'Sub-task' },
            },
          };

          const response = await this.client.post('/rest/api/3/issue', payload);
          logger.info(`Created subtask: ${response.data.key}`);
          return response.data.key as string;
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.errorMessages?.join(', ') ||
              JSON.stringify(error.response?.data?.errors) ||
              error.message;
            throw new JiraAPIError(`Failed to create subtask: ${message}`, { parentTicketId });
          }
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new JiraAPIError(`Failed to create subtask: ${message}`, { parentTicketId });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  async createLinkedStory(parentTicketId: string, card: TechnicalCard): Promise<string> {
    return withRetry(
      async () => {
        try {
          logger.info(`Creating linked Jira story`, { parentTicketId, title: card.title });

          const projectKey = parentTicketId.split('-')[0];
          const { buildCardADF } = await import('../utils/jira-card-builder');

          const issuePayload = {
            fields: {
              project: { key: projectKey },
              summary: card.title,
              description: buildCardADF(card),
              issuetype: { name: 'Story' },
            },
          };

          const issueResponse = await this.client.post('/rest/api/3/issue', issuePayload);
          const newKey = issueResponse.data.key as string;

          // Link to parent ticket
          const linkPayload = {
            type: { name: 'is implemented by' },
            inwardIssue: { key: newKey },
            outwardIssue: { key: parentTicketId },
          };

          try {
            await this.client.post('/rest/api/3/issueLink', linkPayload);
          } catch {
            logger.warn(`Could not create issue link, story still created: ${newKey}`);
          }

          logger.info(`Created linked story: ${newKey}`);
          return newKey;
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.errorMessages?.join(', ') ||
              JSON.stringify(error.response?.data?.errors) ||
              error.message;
            throw new JiraAPIError(`Failed to create linked story: ${message}`, { parentTicketId });
          }
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new JiraAPIError(`Failed to create linked story: ${message}`, { parentTicketId });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  private extractPlainText(description: {
    content?: Array<{ type: string; content?: Array<{ text?: string }> }>;
  }): string {
    if (!description?.content) return '';

    let text = '';
    for (const block of description.content) {
      if (block.content) {
        for (const content of block.content) {
          if (content.text) {
            text += content.text + '\n';
          }
        }
      }
    }
    return text.trim();
  }
}
