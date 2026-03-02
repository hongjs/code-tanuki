import axios, { AxiosInstance } from 'axios';
import { MarkdownTransformer } from '@atlaskit/editor-markdown-transformer';
import { JiraAttachment, JiraTicket } from '@/types/jira';
import { LocalTicket, TicketType } from '@/types/ticket';
import { JiraAPIError } from '@/types/errors';
import { logger } from '../logger/winston';
import { withRetry } from '../utils/retry';

// Singleton — creating MarkdownTransformer is expensive
let _mdTransformer: MarkdownTransformer | null = null;
function getMdTransformer(): MarkdownTransformer {
  if (!_mdTransformer) _mdTransformer = new MarkdownTransformer();
  return _mdTransformer;
}

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
            description: this.adfToMarkdown(fields.description),
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

          let fullDescription = ticket.description;
          if (ticket.acceptanceCriteria) {
            const acContent = `### ✅ Acceptance Criteria\n\n${ticket.acceptanceCriteria.trim()}`;
            fullDescription = fullDescription ? `${fullDescription.trim()}\n\n${acContent}` : acContent;
          }

          if (fullDescription) {
            fields.description = this.textToADF(fullDescription);
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

          if (ticket.description !== undefined || ticket.acceptanceCriteria !== undefined) {
            let fullDescription = ticket.description;
            if (ticket.acceptanceCriteria) {
              const acContent = `### ✅ Acceptance Criteria\n\n${ticket.acceptanceCriteria.trim()}`;
              fullDescription = fullDescription ? `${fullDescription.trim()}\n\n${acContent}` : acContent;
            }
            if (fullDescription !== undefined) {
              fields.description = this.textToADF(fullDescription);
            }
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
            logger.error('Failed to update Jira issue', {
              jiraKey,
              error: message,
              status: error.response?.status,
              responseData: JSON.stringify(error.response?.data),
            });
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

          let description = this.adfToMarkdown(fields.description);
          const acceptanceCriteria = this.extractAdfSection(fields.description, [
            'acceptance criteria', 'acceptance criterion', 'a/c', 'ac',
          ]);

          const attachments: JiraAttachment[] = (fields.attachment ?? [])
            .filter((a: any) => a.mimeType?.startsWith('image/'))
            .map((a: any) => ({
              id: a.id,
              filename: a.filename,
              mimeType: a.mimeType,
              content: a.content,
            }));

          // Fetch comments
          const commentsCount = fields.comment?.total || 0;
          let comments = undefined;
          if (commentsCount > 0) {
            try {
              comments = await this.fetchComments(jiraKey);
            } catch (err) {
              logger.warn('Failed to fetch comments for issue during full sync', { jiraKey, error: err });
            }
          }

          // Strip the Acceptance Criteria section from the main description
          // so it doesn't duplicate in the UI (since ticket.description and ticket.acceptanceCriteria are rendered separately)
          if (acceptanceCriteria) {
            const acRegex = /###\s+(✅\s+)?Acceptance Criteria[\s\S]*$/i;
            description = description.replace(acRegex, '').trim();
          }

          const partial: Partial<LocalTicket> = {
            title: fields.summary,
            type: fields.issuetype?.name as TicketType || 'Story',
            status: fields.status?.name,
            description,
            acceptanceCriteria,
            priority: fields.priority?.name,
            assignee: fields.assignee?.displayName,
            storyPoints: fields[storyPointsField] ?? undefined,
            parentKey,
            attachments: attachments.length > 0 ? attachments : undefined,
            comments,
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

  async fetchComments(jiraKey: string): Promise<any[]> {
    return withRetry(
      async () => {
        try {
          const response = await this.client.get(`/rest/api/3/issue/${jiraKey}/comment`);
          const comments = response.data.comments || [];
          return comments.map((c: any) => ({
            id: c.id,
            author: c.author?.displayName || 'Unknown',
            body: this.adfToMarkdown(c.body),
            created: c.created,
            updated: c.updated,
          }));
        } catch (error: unknown) {
          logger.error('Failed to fetch comments', { jiraKey, error });
          return []; // Fail gracefully, don't crash the sync
        }
      },
      { maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 3000 }
    );
  }

  async downloadAttachment(contentUrl: string): Promise<Buffer> {
    return withRetry(
      async () => {
        try {
          const response = await this.client.get(contentUrl, { responseType: 'arraybuffer' });
          return Buffer.from(response.data);
        } catch (error: unknown) {
          logger.error('Failed to download attachment', { url: contentUrl, error });
          throw new JiraAPIError(`Failed to download attachment`, { url: contentUrl });
        }
      },
      { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 }
    );
  }

  async syncTicketAttachments(ticket: Partial<LocalTicket>, attachmentsDir: string): Promise<void> {
    if (!ticket.attachments || ticket.attachments.length === 0 || !ticket.localId) {
      return;
    }
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      for (const attachment of ticket.attachments) {
        if (!attachment.content) continue;
        
        const filePath = path.join(attachmentsDir, attachment.filename);
        try {
          // Check if already exists to avoid re-downloading
          await fs.access(filePath);
          continue;
        } catch {
          // File does not exist, proceed to download
        }

        try {
          logger.info(`Downloading attachment ${attachment.filename} for ticket ${ticket.jiraKey}`);
          const buffer = await this.downloadAttachment(attachment.content);
          await fs.writeFile(filePath, buffer);
          logger.info(`Saved attachment ${attachment.filename} to ${filePath}`);
        } catch (err) {
          logger.error(`Failed to process attachment ${attachment.filename}`, { error: err });
        }
      }
    } catch (error) {
      logger.error('Failed during ticket attachment sync', { error });
    }
  }

  /**
   * Convert Markdown → ADF using @atlaskit/editor-markdown-transformer.
   * Falls back to a plain paragraph if markdown is empty.
   */
  private markdownToADF(markdown: string): object {
    if (!markdown?.trim()) {
      return { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [] }] };
    }
    const adf = getMdTransformer().parse(markdown).toJSON();
    adf.version = 1;
    const cleaned = this.cleanADF(adf);
    return this.parseHtmlTagsInAdf(cleaned);
  }

  private parseHtmlTagsInAdf(node: any): any {
    if (node === null || node === undefined) return node;
    if (typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((n) => this.parseHtmlTagsInAdf(n));

    const newNode: any = { ...node };

    if (newNode.content && Array.isArray(newNode.content)) {
      newNode.content = newNode.content.map((n: any) => this.parseHtmlTagsInAdf(n));
      const isInlineContainer = ['paragraph', 'heading', 'tableCell', 'tableHeader'].includes(newNode.type) || 
                               (newNode.content.length > 0 && newNode.content[0].type === 'text');
      if (isInlineContainer) {
        newNode.content = this.processHtmlTokens(newNode.content);
      }
    } else {
      for (const [key, value] of Object.entries(newNode)) {
        if (key !== 'content') newNode[key] = this.parseHtmlTagsInAdf(value);
      }
    }
    return newNode;
  }

  private processHtmlTokens(nodes: any[]): any[] {
    const result: any[] = [];
    let currentColor: string | null = null;
    let isUnderline = false;

    const tagRegex = /(?:<span\s+style="color:([^"]+)">)|(<\/span>)|(<u>)|(<\/u>)/gi;

    for (const node of nodes) {
      if (node.type !== 'text' || !node.text) {
        if (currentColor || isUnderline) {
           node.marks = node.marks || [];
           if (currentColor && !node.marks.some((m:any) => m.type === 'textColor')) {
             node.marks.push({ type: 'textColor', attrs: { color: currentColor } });
           }
           if (isUnderline && !node.marks.some((m:any) => m.type === 'underline')) {
             node.marks.push({ type: 'underline' });
           }
        }
        result.push(node);
        continue;
      }

      let lastIndex = 0;
      let match;
      const textStr = node.text as string;
      tagRegex.lastIndex = 0;

      const pushText = (text: string) => {
        if (!text) return;
        const marks = [...(node.marks || [])];
        if (currentColor && !marks.some((m:any) => m.type === 'textColor')) {
          marks.push({ type: 'textColor', attrs: { color: currentColor } });
        }
        if (isUnderline && !marks.some((m:any) => m.type === 'underline')) {
          marks.push({ type: 'underline' });
        }
        const newNode = { ...node, text };
        if (marks.length > 0) newNode.marks = marks;
        else delete newNode.marks;
        result.push(newNode);
      };

      while ((match = tagRegex.exec(textStr)) !== null) {
        if (match.index > lastIndex) {
          pushText(textStr.substring(lastIndex, match.index));
        }

        if (match[1]) currentColor = match[1];
        else if (match[2]) currentColor = null;
        else if (match[3]) isUnderline = true;
        else if (match[4]) isUnderline = false;

        lastIndex = tagRegex.lastIndex;
      }

      if (lastIndex < textStr.length) {
        pushText(textStr.substring(lastIndex));
      }
    }
    return result;
  }

  /**
   * Recursively strip `localId: null` from ADF nodes.
   * MarkdownTransformer.toJSON() adds localId: null to every node,
   * which Jira's API rejects as invalid ADF.
   */
  private cleanADF(node: any): any {
    if (node === null || node === undefined) return node;
    if (typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((item) => this.cleanADF(item));

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === 'localId' && (value === null || value === '')) continue;
      if (key === 'uniqueId' && (value === null || value === '')) continue;
      
      // Jira strict ADF parser rejects many table-related attributes generated by Atlaskit's markdown-transformer
      if (key === 'attrs' && typeof value === 'object' && value !== null) {
        if (['table', 'tableRow', 'tableHeader', 'tableCell'].includes(node.type)) {
          // Keep only standard basic attrs for cells, ignore the rest
          const safeAttrs: any = {};
          const v = value as any;
          if (v.colspan !== undefined && v.colspan !== null) safeAttrs.colspan = v.colspan;
          if (v.rowspan !== undefined && v.rowspan !== null) safeAttrs.rowspan = v.rowspan;
          if (Object.keys(safeAttrs).length > 0) {
            cleaned.attrs = safeAttrs;
          }
          continue;
        }
      }

      cleaned[key] = this.cleanADF(value);
    }
    return cleaned;
  }

  /** Alias kept for call sites that still use the old name */
  private textToADF(text: string): object {
    return this.markdownToADF(text);
  }

  /** Convert Atlassian Document Format (ADF) to Markdown */
  private adfToMarkdown(adf: any): string {
    if (!adf?.content) return '';
    return this.processAdfNodes(adf.content).trim();
  }

  private processAdfNodes(nodes: any[], indent = ''): string {
    if (!nodes?.length) return '';
    return nodes.map((n) => this.processAdfNode(n, indent)).join('');
  }

  private processAdfNode(node: any, indent = ''): string {
    switch (node.type) {
      case 'paragraph': {
        const text = this.processAdfInline(node.content || []);
        return text.trim() ? `${indent}${text}\n\n` : '\n';
      }
      case 'heading': {
        const level = node.attrs?.level ?? 1;
        const text = this.processAdfInline(node.content || []);
        return `${'#'.repeat(level)} ${text}\n\n`;
      }
      case 'bulletList': {
        const items = (node.content || [])
          .map((item: any) => this.processAdfListItem(item, indent, '-'))
          .join('');
        return items + '\n';
      }
      case 'orderedList': {
        const items = (node.content || [])
          .map((item: any, i: number) => this.processAdfListItem(item, indent, `${i + 1}.`))
          .join('');
        return items + '\n';
      }
      case 'taskList': {
        const items = (node.content || [])
          .map((item: any) => {
            const checked = item.attrs?.state === 'DONE';
            const text = this.processAdfInline(item.content?.[0]?.content || []);
            return `${indent}- [${checked ? 'x' : ' '}] ${text}\n`;
          })
          .join('');
        return items + '\n';
      }
      case 'codeBlock': {
        const lang = node.attrs?.language || '';
        const code = (node.content || []).map((n: any) => n.text || '').join('');
        return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
      }
      case 'blockquote': {
        const inner = this.processAdfNodes(node.content || []);
        return inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n') + '\n';
      }
      case 'rule':
        return '---\n\n';
      case 'hardBreak':
        return '\n';
      case 'listItem':
        return this.processAdfListItem(node, indent, '-');
      case 'table':
        return this.processAdfTable(node) + '\n';
      default:
        if (node.content) return this.processAdfNodes(node.content, indent);
        return '';
    }
  }

  private processAdfTable(node: any): string {
    const rows: any[] = node.content || [];
    if (rows.length === 0) return '';

    const renderRow = (row: any): string => {
      const cells: any[] = row.content || [];
      const cols = cells.map((cell: any) => {
        // cell content is usually [{ type: 'paragraph', content: [...inline] }]
        const inline = (cell.content || [])
          .flatMap((child: any) => child.content || []);
        return this.processAdfInline(inline).trim().replace(/\|/g, '\\|');
      });
      return `| ${cols.join(' | ')} |`;
    };

    const lines: string[] = [];
    let separatorInserted = false;

    for (const row of rows) {
      const isHeader = (row.content || []).some((c: any) => c.type === 'tableHeader');
      lines.push(renderRow(row));
      if (isHeader && !separatorInserted) {
        const colCount = (row.content || []).length;
        lines.push(`| ${Array(colCount).fill('---').join(' | ')} |`);
        separatorInserted = true;
      }
    }

    // If no header row was found, insert separator after first row
    if (!separatorInserted && lines.length > 0) {
      const colCount = (rows[0].content || []).length;
      lines.splice(1, 0, `| ${Array(colCount).fill('---').join(' | ')} |`);
    }

    return lines.join('\n') + '\n';
  }

  private processAdfListItem(item: any, indent: string, bullet: string): string {
    const children: any[] = item.content || [];
    let result = '';
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (i === 0) {
        // first child: inline text on bullet line
        const text =
          child.type === 'paragraph'
            ? this.processAdfInline(child.content || [])
            : this.processAdfNode(child, indent + '  ').trimEnd();
        result += `${indent}${bullet} ${text}\n`;
      } else {
        // nested lists or other blocks
        result += this.processAdfNode(child, indent + '  ');
      }
    }
    return result;
  }

  private processAdfInline(nodes: any[]): string {
    if (!nodes?.length) return '';
    return nodes.map((n) => this.processAdfInlineNode(n)).join('');
  }

  private processAdfInlineNode(node: any): string {
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'emoji') return node.attrs?.text || node.attrs?.shortName || '';
    if (node.type === 'mention') return `@${node.attrs?.text || node.attrs?.displayName || ''}`;
    if (node.type === 'inlineCard') return node.attrs?.url || '';

    if (node.type === 'text') {
      let text: string = node.text || '';
      const marks: any[] = node.marks || [];

      // Collect wrapper tags for HTML-only marks (textColor, underline)
      let openTags = '';
      let closeTags = '';

      for (const mark of marks) {
        switch (mark.type) {
          case 'strong':    text = `**${text}**`; break;
          case 'em':        text = `*${text}*`;   break;
          case 'code':      text = `\`${text}\``; break;
          case 'strike':    text = `~~${text}~~`; break;
          case 'link':      text = `[${text}](${mark.attrs?.href || ''})`; break;
          case 'textColor': {
            const color = mark.attrs?.color || '';
            if (color) { openTags += `<span style="color:${color}">`; closeTags = `</span>${closeTags}`; }
            break;
          }
          case 'underline':
            openTags += '<u>'; closeTags = `</u>${closeTags}`;
            break;
        }
      }

      return openTags + text + closeTags;
    }

    if (node.content) return this.processAdfInline(node.content);
    return '';
  }

  /** Extract a section from ADF that follows a matching heading, converted to markdown */
  extractAdfSection(adf: any, headingKeywords: string[]): string | undefined {
    if (!adf?.content) return undefined;
    const blocks: any[] = adf.content;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.type === 'heading') {
        const headingText = this.processAdfInline(block.content || []).toLowerCase().trim();
        if (headingKeywords.some((kw) => headingText.includes(kw))) {
          // collect all subsequent blocks until next heading
          const sectionNodes: any[] = [];
          for (let j = i + 1; j < blocks.length; j++) {
            if (blocks[j].type === 'heading') break;
            sectionNodes.push(blocks[j]);
          }
          if (sectionNodes.length > 0) {
            return this.processAdfNodes(sectionNodes).trim();
          }
        }
      }
    }
    return undefined;
  }
}
