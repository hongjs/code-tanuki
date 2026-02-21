import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ticketStorage } from '@/lib/storage/ticket-storage';
import { JiraClient } from '@/lib/api/jira';
import { logger } from '@/lib/logger/winston';
import { env } from '@/lib/utils/env';
import { BulkJiraResult } from '@/types/ticket';

const bulkSchema = z.object({
  action: z.enum(['create', 'sync']),
  localIds: z.array(z.string()).min(1),
});

function getJiraClient(): JiraClient {
  return new JiraClient(env.JIRA_BASE_URL, env.JIRA_EMAIL, env.JIRA_API_TOKEN);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, localIds } = bulkSchema.parse(body);

    const result: BulkJiraResult = { succeeded: [], failed: [] };
    const jiraClient = getJiraClient();

    if (action === 'create') {
      const projectKey = env.JIRA_PROJECT_KEY;
      if (!projectKey) {
        return NextResponse.json(
          { error: 'JIRA_PROJECT_KEY environment variable is not configured' },
          { status: 500 }
        );
      }

      for (const localId of localIds) {
        try {
          const ticket = await ticketStorage.getById(localId);
          if (!ticket) {
            result.failed.push({ localId, error: 'Ticket not found' });
            continue;
          }

          if (ticket.jiraKey) {
            result.failed.push({ localId, error: `Already created: ${ticket.jiraKey}` });
            continue;
          }

          const { key } = await jiraClient.createIssue(ticket, projectKey, env.JIRA_STORY_POINTS_FIELD);
          const updated = {
            ...ticket,
            jiraKey: key,
            syncedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await ticketStorage.save(updated);
          result.succeeded.push(localId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          result.failed.push({ localId, error: message });
        }
      }
    } else if (action === 'sync') {
      for (const localId of localIds) {
        try {
          const ticket = await ticketStorage.getById(localId);
          if (!ticket) {
            result.failed.push({ localId, error: 'Ticket not found' });
            continue;
          }

          if (!ticket.jiraKey) {
            result.failed.push({ localId, error: 'Ticket has not been created on Jira yet' });
            continue;
          }

          const synced = await jiraClient.fetchFullIssue(ticket.jiraKey, env.JIRA_STORY_POINTS_FIELD);
          const updated = {
            ...ticket,
            ...synced,
            updatedAt: new Date().toISOString(),
          };
          await ticketStorage.save(updated);
          result.succeeded.push(localId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          result.failed.push({ localId, error: message });
        }
      }
    }

    logger.info('Bulk Jira operation completed', {
      action,
      succeeded: result.succeeded.length,
      failed: result.failed.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    logger.error('Bulk Jira operation failed', { error });
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
  }
}
