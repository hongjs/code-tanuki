import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/api/jira';
import { logger } from '@/lib/logger/winston';

export async function GET(request: NextRequest) {
  try {
    const ticketId = request.nextUrl.searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraToken = process.env.JIRA_API_TOKEN;

    if (!jiraBaseUrl || !jiraEmail || !jiraToken) {
      logger.error('Jira environment variables are not set');
      return NextResponse.json({ error: 'Jira not configured' }, { status: 500 });
    }

    const jiraClient = new JiraClient(jiraBaseUrl, jiraEmail, jiraToken);
    const ticket = await jiraClient.fetchTicket(ticketId);

    return NextResponse.json(ticket);
  } catch (error) {
    logger.error('Failed to fetch Jira ticket', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: 'Failed to fetch Jira ticket' }, { status: 500 });
  }
}
