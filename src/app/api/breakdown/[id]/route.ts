import { NextRequest, NextResponse } from 'next/server';
import { getBreakdownStorage } from '@/lib/storage';
import { logger } from '@/lib/logger/winston';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storage = getBreakdownStorage();

    const session = await storage.getSession(id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const [tickets, qaHistory, cards] = await Promise.all([
      storage.getJiraData(id),
      storage.getQAHistory(id),
      storage.getCards(id),
    ]);

    return NextResponse.json({
      session,
      jiraTickets: tickets.map((t) => ({
        key: t.key,
        summary: t.summary,
        type: t.type,
        status: t.status,
        description: t.description,
        labels: t.labels,
        storyPoints: t.storyPoints,
        epicKey: t.epicKey,
      })),
      qaHistory,
      cards,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get breakdown session', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
