import { NextRequest, NextResponse } from 'next/server';
import { ticketStorage } from '@/lib/storage/ticket-storage';
import { JiraClient } from '@/lib/api/jira';
import { logger } from '@/lib/logger/winston';
import { env } from '@/lib/utils/env';

function getJiraClient(): JiraClient {
  return new JiraClient(env.JIRA_BASE_URL, env.JIRA_EMAIL, env.JIRA_API_TOKEN);
}

interface RouteParams {
  params: Promise<{ localId: string }>;
}

// POST /api/tickets/[localId]/jira  → create on Jira
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { localId } = await params;
    const ticket = await ticketStorage.getById(localId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.jiraKey) {
      return NextResponse.json(
        { error: `Already created: ${ticket.jiraKey}` },
        { status: 409 }
      );
    }

    const projectKey = env.JIRA_PROJECT_KEY;
    if (!projectKey) {
      return NextResponse.json(
        { error: 'JIRA_PROJECT_KEY environment variable is not configured' },
        { status: 500 }
      );
    }

    const jiraClient = getJiraClient();
    const { key } = await jiraClient.createIssue(ticket, projectKey, env.JIRA_STORY_POINTS_FIELD);

    const updated = {
      ...ticket,
      jiraKey: key,
      syncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ticketStorage.save(updated);

    logger.info('Created ticket on Jira', { localId, jiraKey: key });
    return NextResponse.json({ jiraKey: key, ticket: updated });
  } catch (error) {
    logger.error('Failed to create ticket on Jira', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/tickets/[localId]/jira  → update on Jira
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const { localId } = await params;
    const ticket = await ticketStorage.getById(localId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!ticket.jiraKey) {
      return NextResponse.json(
        { error: 'Ticket has not been created on Jira yet' },
        { status: 400 }
      );
    }

    const jiraClient = getJiraClient();
    await jiraClient.updateIssue(ticket.jiraKey, ticket, env.JIRA_STORY_POINTS_FIELD);

    logger.info('Updated ticket on Jira', { localId, jiraKey: ticket.jiraKey });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to update ticket on Jira', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/tickets/[localId]/jira  → sync from Jira
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { localId } = await params;
    const ticket = await ticketStorage.getById(localId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!ticket.jiraKey) {
      return NextResponse.json(
        { error: 'Ticket has not been created on Jira yet' },
        { status: 400 }
      );
    }

    const jiraClient = getJiraClient();
    const synced = await jiraClient.fetchFullIssue(ticket.jiraKey, env.JIRA_STORY_POINTS_FIELD, env.JIRA_EPIC_LINK_FIELD);

    const updated = {
      ...ticket,
      ...synced,
      // Explicitly clear parentKey if Jira returned no parent
      parentKey: synced.parentKey ?? undefined,
      updatedAt: new Date().toISOString(),
    };
    await ticketStorage.save(updated);

    logger.info('Synced ticket from Jira', { localId, jiraKey: ticket.jiraKey });
    return NextResponse.json({ ticket: updated });
  } catch (error) {
    logger.error('Failed to sync ticket from Jira', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
