import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/api/jira';
import { logger } from '@/lib/logger/winston';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, prUrl, commentsCount } = body as {
      ticketId: string;
      prUrl: string;
      commentsCount: number;
    };

    if (!ticketId || !prUrl || commentsCount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraToken = process.env.JIRA_API_TOKEN;

    if (!jiraBaseUrl || !jiraEmail || !jiraToken) {
      logger.error('Jira environment variables are not set');
      return NextResponse.json({ error: 'Jira not configured' }, { status: 500 });
    }

    const jiraClient = new JiraClient(jiraBaseUrl, jiraEmail, jiraToken);
    await jiraClient.postComment(ticketId, prUrl, commentsCount);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to post Jira comment', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: 'Failed to post Jira comment' }, { status: 500 });
  }
}
