import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/api/jira';
import { ticketStorage } from '@/lib/storage/ticket-storage';
import { env } from '@/lib/utils/env';
import { v4 as uuidv4 } from 'uuid';
import { LocalTicket, TicketType } from '@/types/ticket';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jiraKey } = body;
    if (!jiraKey) {
      return NextResponse.json({ error: 'Jira Key is required' }, { status: 400 });
    }

    // Check if it already exists
    const existingTickets = await ticketStorage.getAll();
    const existing = existingTickets.find((t) => t.jiraKey === jiraKey);
    if (existing) {
      return NextResponse.json({ error: `Ticket ${jiraKey} already exists as ${existing.localId}` }, { status: 409 });
    }

    const client = new JiraClient(env.JIRA_BASE_URL, env.JIRA_EMAIL, env.JIRA_API_TOKEN);
    const issueData = await client.fetchFullIssue(jiraKey, env.JIRA_STORY_POINTS_FIELD, env.JIRA_EPIC_LINK_FIELD);

    if (!issueData || !issueData.title) {
        return NextResponse.json({ error: `Could not fetch ticket ${jiraKey} from Jira` }, { status: 404 });
    }

    const newTicket: LocalTicket = {
      localId: uuidv4(),
      jiraKey: jiraKey,
      title: issueData.title,
      description: issueData.description,
      type: (issueData as any).type || 'Story', // fetchFullIssue doesn't return type but we can default or fetch it differently
      status: issueData.status || 'To Do',
      priority: issueData.priority,
      storyPoints: issueData.storyPoints,
      assignee: issueData.assignee,
      parentKey: issueData.parentKey,
      acceptanceCriteria: issueData.acceptanceCriteria,
      attachments: issueData.attachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    };

    await ticketStorage.save(newTicket);

    return NextResponse.json({ ticket: newTicket }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to sync new ticket from Jira:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync ticket' },
      { status: 500 }
    );
  }
}
