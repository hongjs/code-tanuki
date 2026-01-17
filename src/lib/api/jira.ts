import axios, { AxiosInstance } from 'axios';
import { JiraTicket } from '@/types/jira';
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
