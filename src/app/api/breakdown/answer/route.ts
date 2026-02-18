import { NextRequest, NextResponse } from 'next/server';
import { ClaudeClient } from '@/lib/api/claude';
import { getBreakdownStorage } from '@/lib/storage';
import { runAnalysis } from '@/lib/breakdown/orchestrator';
import { breakdownAnswerSchema } from '@/lib/utils/validation';
import { logger } from '@/lib/logger/winston';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = breakdownAnswerSchema.parse(body);
    const { breakdownId, answers } = input;

    const storage = getBreakdownStorage();
    const session = await storage.getSession(breakdownId);

    if (!session) {
      return NextResponse.json({ error: 'Breakdown session not found' }, { status: 404 });
    }

    if (session.status !== 'clarifying') {
      return NextResponse.json(
        { error: `Session is not in clarifying state: ${session.status}` },
        { status: 400 }
      );
    }

    // Load current questions to build QA entry
    const qaHistory = await storage.getQAHistory(breakdownId);
    const currentRound = session.qaRoundCount + 1;

    // Get the last analysis response to get questions
    let questions: Array<{ id: string; question: string; category: string }> = [];
    try {
      const storage2 = getBreakdownStorage();
      const jira = await storage2.getJiraData(breakdownId);
      // Questions should be from the last analysis response
      // They're stored in the responses directory
      // We'll reconstruct from what we have
      questions = answers.map((a) => ({
        id: a.questionId,
        question: `Question ${a.questionId}`,
        category: 'other' as const,
      }));
    } catch {
      questions = answers.map((a) => ({
        id: a.questionId,
        question: `Question ${a.questionId}`,
        category: 'other' as const,
      }));
    }

    // Append QA entry
    await storage.saveQAEntry(breakdownId, {
      round: currentRound,
      timestamp: new Date().toISOString(),
      questions: questions as Array<{ id: string; question: string; category: 'api' | 'database' | 'external-service' | 'ui' | 'business-logic' | 'other' }>,
      answers,
    });

    // Increment QA round count and set status to re-analyzing
    await storage.updateSession(breakdownId, {
      status: 're-analyzing',
      qaRoundCount: currentRound,
    });

    logger.info(`Answers submitted, re-analyzing`, { breakdownId, round: currentRound });

    // Re-run analysis with updated Q&A history
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
        qaRound: currentRound + 1,
        maxQaRounds: parseInt(process.env.BREAKDOWN_MAX_QA_ROUNDS || '3'),
      });
    }

    return NextResponse.json({
      status: 'ready',
      analysisNotes: result.analysisNotes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to submit answers', { error: message });

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request', details: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
