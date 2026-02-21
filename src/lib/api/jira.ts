import axios, { AxiosInstance } from 'axios';
import { JiraAttachment, JiraTicket } from '@/types/jira';
import { LocalTicket } from '@/types/ticket';
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

          const attachments: JiraAttachment[] = (fields.attachment ?? [])
            .filter((a: any) => a.mimeType?.startsWith('image/'))
            .map((a: any) => ({
              id: a.id,
              filename: a.filename,
              mimeType: a.mimeType,
              content: a.content,
            }));

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
            attachments: attachments.length > 0 ? attachments : undefined,
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

  async createIssue(
    ticket: LocalTicket,
    projectKey: string,
    storyPointsField: string = 'customfield_10016'
  ): Promise<{ key: string; id: string }> {
    return withRetry(
      async () => {
        try {
          logger.info('Creating Jira issue', { title: ticket.title, type: ticket.type });

          const fields: Record<string, unknown> = {
            project: { key: projectKey },
            summary: ticket.title,
            issuetype: { name: ticket.type },
          };

          if (ticket.description) {
            fields.description = this.textToADF(ticket.description);
          }

          if (ticket.priority) {
            fields.priority = { name: ticket.priority };
          }

          if (ticket.parentKey) {
            fields.parent = { key: ticket.parentKey };
          }

          if (ticket.storyPoints !== undefined) {
            fields[storyPointsField] = ticket.storyPoints;
          }

          if (ticket.labels && ticket.labels.length > 0) {
            fields.labels = ticket.labels;
          }

          const response = await this.client.post('/rest/api/3/issue', { fields });
          const { key, id } = response.data;

          logger.info('Successfully created Jira issue', { key, localId: ticket.localId });
          return { key, id };
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            const message =
              error.response?.data?.errors
                ? JSON.stringify(error.response.data.errors)
                : error.response?.data?.errorMessages?.join(', ') || error.message;
            logger.error('Failed to create Jira issue', { error: message, status: error.response?.status });
            throw new JiraAPIError(`Failed to create issue: ${message}`, { ticket: ticket.title });
          }
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new JiraAPIError(`Failed to create issue: ${message}`, { ticket: ticket.title });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  async updateIssue(
    jiraKey: string,
    ticket: Partial<LocalTicket>,
    storyPointsField: string = 'customfield_10016'
  ): Promise<void> {
    return withRetry(
      async () => {
        try {
          logger.info('Updating Jira issue', { jiraKey });

          const fields: Record<string, unknown> = {};

          if (ticket.title !== undefined) {
            fields.summary = ticket.title;
          }

          if (ticket.description !== undefined) {
            fields.description = this.textToADF(ticket.description);
          }

          if (ticket.priority !== undefined) {
            fields.priority = { name: ticket.priority };
          }

          if (ticket.storyPoints !== undefined) {
            fields[storyPointsField] = ticket.storyPoints;
          }

          if (ticket.labels !== undefined) {
            fields.labels = ticket.labels;
          }

          await this.client.put(`/rest/api/3/issue/${jiraKey}`, { fields });
          logger.info('Successfully updated Jira issue', { jiraKey });
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            const message =
              error.response?.data?.errors
                ? JSON.stringify(error.response.data.errors)
                : error.response?.data?.errorMessages?.join(', ') || error.message;
            logger.error('Failed to update Jira issue', { jiraKey, error: message });
            throw new JiraAPIError(`Failed to update issue: ${message}`, { jiraKey });
          }
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new JiraAPIError(`Failed to update issue: ${message}`, { jiraKey });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  async fetchFullIssue(
    jiraKey: string,
    storyPointsField: string = 'customfield_10016',
    epicLinkField: string = 'customfield_10014'
  ): Promise<Partial<LocalTicket>> {
    return withRetry(
      async () => {
        try {
          logger.info('Fetching full Jira issue for sync', { jiraKey });

          const response = await this.client.get(`/rest/api/3/issue/${jiraKey}`);
          const { data } = response;
          const fields = data.fields;

          // parent key: next-gen projects use fields.parent.key,
          // classic projects use Epic Link custom field for story→epic relationship
          const parentKey: string | undefined =
            fields.parent?.key ??
            (typeof fields[epicLinkField] === 'string' ? fields[epicLinkField] : undefined) ??
            undefined;

          logger.info('Resolved parentKey from Jira', {
            jiraKey,
            parentFromParentField: fields.parent?.key,
            parentFromEpicLink: fields[epicLinkField],
            resolved: parentKey,
          });

          const partial: Partial<LocalTicket> = {
            title: fields.summary,
            status: fields.status?.name,
            description: this.extractPlainText(fields.description),
            priority: fields.priority?.name,
            assignee: fields.assignee?.displayName,
            storyPoints: fields[storyPointsField] ?? undefined,
            parentKey,
            syncedAt: new Date().toISOString(),
          };

          logger.info('Successfully fetched Jira issue for sync', { jiraKey });
          return partial;
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            const message = error.response?.data?.errorMessages?.join(', ') || error.message;
            logger.error('Failed to fetch full Jira issue', { jiraKey, error: message });
            throw new JiraAPIError(`Failed to fetch issue: ${message}`, { jiraKey });
          }
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new JiraAPIError(`Failed to fetch issue: ${message}`, { jiraKey });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  private textToADF(text: string): object {
    const paragraphs = text.split('\n\n').map((para) => ({
      type: 'paragraph',
      content: para
        ? [{ type: 'text', text: para }]
        : [],
    }));
    return {
      type: 'doc',
      version: 1,
      content: paragraphs,
    };
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
