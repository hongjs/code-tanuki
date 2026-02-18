import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClaudeClient } from '@/lib/api/claude';
import { getBreakdownStorage } from '@/lib/storage';
import { runAnalysis } from '@/lib/breakdown/orchestrator';
import { logger } from '@/lib/logger/winston';

const analyzeSchema = z.object({
  breakdownId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { breakdownId } = analyzeSchema.parse(body);

    const storage = getBreakdownStorage();
    const session = await storage.getSession(breakdownId);

    if (!session) {
      return NextResponse.json({ error: 'Breakdown session not found' }, { status: 404 });
    }

    logger.info(`Running AI analysis for breakdown`, { breakdownId });

    const claudeClient = new ClaudeClient(process.env.ANTHROPIC_API_KEY!);
    const result = await runAnalysis(breakdownId, storage, claudeClient);

    // Update list entry
    const updatedSession = await storage.getSession(breakdownId);
    if (updatedSession) {
      const tickets = await storage.getJiraData(breakdownId);
      const primaryTicket = tickets[0];
      const summaryLabel =
        tickets.length <= 1
          ? (primaryTicket?.summary || '')
          : `${primaryTicket?.summary || ''} (+${tickets.length - 1} more)`;
      await storage.updateList({
        id: breakdownId,
        jiraTicketIds: updatedSession.jiraTicketIds,
        jiraSummary: summaryLabel,
        status: updatedSession.status,
        modelId: updatedSession.modelId,
        cardCount: 0,
        createdAt: updatedSession.createdAt,
        updatedAt: updatedSession.updatedAt,
      });
    }

    if (result.status === 'clarifying') {
      return NextResponse.json({
        status: 'clarifying',
        questions: result.questions,
        analysisNotes: result.analysisNotes,
        qaRound: session.qaRoundCount + 1,
        maxQaRounds: parseInt(process.env.BREAKDOWN_MAX_QA_ROUNDS || '3'),
      });
    }

    return NextResponse.json({
      status: 'ready',
      analysisNotes: result.analysisNotes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to analyze breakdown', { error: message });

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request', details: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
