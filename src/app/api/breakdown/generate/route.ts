import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClaudeClient } from '@/lib/api/claude';
import { getBreakdownStorage } from '@/lib/storage';
import { validateCardStructure } from '@/lib/breakdown/orchestrator';
import { buildCardGenerationPrompt } from '@/lib/constants/breakdown-prompts';
import { logger } from '@/lib/logger/winston';

const generateSchema = z.object({
  breakdownId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { breakdownId } = generateSchema.parse(body);

    const storage = getBreakdownStorage();
    const session = await storage.getSession(breakdownId);

    if (!session) {
      return NextResponse.json({ error: 'Breakdown session not found' }, { status: 404 });
    }

    const allowedStatuses = ['generating-cards', 'clarifying', 'ai-initial-analysis', 're-analyzing'];
    if (!allowedStatuses.includes(session.status)) {
      return NextResponse.json(
        { error: `Session cannot generate cards from status: ${session.status}` },
        { status: 400 }
      );
    }

    const tickets = await storage.getJiraData(breakdownId);
    if (!tickets.length) {
      return NextResponse.json({ error: 'Jira data not found' }, { status: 404 });
    }

    const qaHistory = await storage.getQAHistory(breakdownId);
    const knowledge = await storage.readKnowledge();
    const imageDescription = await storage.getImageDescription(breakdownId);

    await storage.updateSession(breakdownId, { status: 'generating-cards' });

    const prompt = buildCardGenerationPrompt(
      tickets,
      knowledge,
      qaHistory,
      session.detailLevel,
      session.enableDevCoaching,
      imageDescription,
      session.additionalPrompt
    );

    const round = session.qaRoundCount + 1;
    await storage.savePrompt(breakdownId, round, 'cards', prompt);

    logger.info(`Generating technical cards`, { breakdownId, modelId: session.modelId });

    const claudeClient = new ClaudeClient(process.env.ANTHROPIC_API_KEY!);
    const aiResponse = await claudeClient.generateTechnicalCards({
      prompt,
      modelId: session.modelId,
    });

    await storage.saveAIResponse(breakdownId, round, 'cards', aiResponse);

    // Validate and clamp story points
    const validatedCards = validateCardStructure(aiResponse.cards || [], session.enableDevCoaching);
    await storage.saveCards(breakdownId, validatedCards);

    await storage.updateSession(breakdownId, {
      status: 'preview',
      knowledgeSuggestion: aiResponse.knowledgeSuggestion,
    });

    // Update list entry
    const updatedSession = await storage.getSession(breakdownId);
    const primaryTicket = tickets[0];
    const summaryLabel =
      tickets.length === 1
        ? primaryTicket.summary
        : `${primaryTicket.summary} (+${tickets.length - 1} more)`;

    await storage.updateList({
      id: breakdownId,
      jiraTicketIds: session.jiraTicketIds,
      jiraSummary: summaryLabel,
      status: 'preview',
      modelId: session.modelId,
      cardCount: validatedCards.length,
      createdAt: session.createdAt,
      updatedAt: updatedSession?.updatedAt || new Date().toISOString(),
    });

    logger.info(`Cards generated`, {
      breakdownId,
      cardCount: validatedCards.length,
      hasKnowledgeSuggestion: !!aiResponse.knowledgeSuggestion,
    });

    return NextResponse.json({
      status: 'preview',
      cards: validatedCards,
      summary: aiResponse.summary,
      knowledgeSuggestion: aiResponse.knowledgeSuggestion,
      tokensUsed: aiResponse.tokensUsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to generate cards', { error: message });

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request', details: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
