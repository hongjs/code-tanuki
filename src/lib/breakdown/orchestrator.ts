import { BreakdownStorageAdapter } from '@/lib/storage/breakdown-storage';
import { ClaudeClient } from '@/lib/api/claude';
import {
  AIAnalysisResponse,
  FullJiraTicket,
  KnowledgeSuggestion,
  QAEntry,
  TechnicalCard,
} from '@/types/breakdown';
import {
  buildStableContext,
  buildInitialAnalysisDynamic,
  buildReAnalysisDynamic,
  buildKnowledgeUpdatePrompt,
} from '@/lib/constants/breakdown-prompts';
import { logger } from '@/lib/logger/winston';

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13];

export async function applyKnowledgeSuggestion(
  suggestion: KnowledgeSuggestion,
  storage: BreakdownStorageAdapter,
  claudeClient: ClaudeClient,
  modelId: string,
  cards: TechnicalCard[] = []
): Promise<void> {
  try {
    const currentKnowledge = await storage.readKnowledge();
    const prompt = buildKnowledgeUpdatePrompt(currentKnowledge, suggestion, cards);
    const updatedKnowledge = await claudeClient.generateText({ prompt, modelId });
    await storage.writeKnowledge(updatedKnowledge);
    logger.info('Knowledge base auto-updated from AI suggestion', { section: suggestion.section });
  } catch (error) {
    logger.warn('Failed to auto-apply knowledge suggestion (non-fatal)', {
      error: error instanceof Error ? error.message : String(error),
      section: suggestion.section,
    });
  }
}

function clampToFibonacci(points: number): number {
  if (FIBONACCI_POINTS.includes(points)) return points;
  return FIBONACCI_POINTS.reduce((prev, curr) =>
    Math.abs(curr - points) < Math.abs(prev - points) ? curr : prev
  );
}

export interface AnalysisResult {
  needsClarification: boolean;
  questions?: AIAnalysisResponse['questions'];
  analysisNotes?: string;
  status: 'clarifying' | 'ready';
}

export async function runAnalysis(
  breakdownId: string,
  storage: BreakdownStorageAdapter,
  claudeClient: ClaudeClient
): Promise<AnalysisResult> {
  const session = await storage.getSession(breakdownId);
  if (!session) throw new Error(`Session not found: ${breakdownId}`);

  const tickets = await storage.getJiraData(breakdownId);
  if (!tickets.length) throw new Error(`Jira data not found for session: ${breakdownId}`);

  const qaHistory = await storage.getQAHistory(breakdownId);
  const knowledge = await storage.readKnowledge();
  const imageDescription = await storage.getImageDescription(breakdownId);
  const maxQaRounds = parseInt(process.env.BREAKDOWN_MAX_QA_ROUNDS || '3');

  const round = session.qaRoundCount + 1;

  const stableContext = buildStableContext(tickets, knowledge, imageDescription);
  const dynamicPrompt =
    qaHistory.length === 0
      ? buildInitialAnalysisDynamic(tickets, session.additionalPrompt)
      : buildReAnalysisDynamic(tickets, qaHistory, session.additionalPrompt);

  // Save combined prompt for debugging
  await storage.savePrompt(breakdownId, round, 'analysis', `${stableContext}\n\n${dynamicPrompt}`);

  const aiResponse = await claudeClient.analyzeUserStory({
    prompt: dynamicPrompt,
    stableContext,
    modelId: session.modelId,
  });

  await storage.saveAIResponse(breakdownId, round, 'analysis', aiResponse);

  logger.info(`Analysis round ${round} complete`, {
    breakdownId,
    ticketCount: tickets.length,
    needsClarification: aiResponse.needsClarification,
    questionCount: aiResponse.questions?.length || 0,
  });

  // Auto-apply knowledge suggestion if AI returned one — fire and forget so it
  // doesn't block the clarifying-questions dialog from appearing to the user.
  if (aiResponse.knowledgeSuggestion) {
    applyKnowledgeSuggestion(
      aiResponse.knowledgeSuggestion,
      storage,
      claudeClient,
      session.modelId
    ).catch(() => {/* already logged inside applyKnowledgeSuggestion */});
  }

  const shouldAskMore =
    aiResponse.needsClarification &&
    (aiResponse.questions?.length ?? 0) > 0 &&
    session.qaRoundCount < maxQaRounds;

  if (shouldAskMore) {
    await storage.updateSession(breakdownId, { status: 'clarifying' });
    return {
      needsClarification: true,
      questions: aiResponse.questions,
      analysisNotes: aiResponse.analysisNotes,
      status: 'clarifying',
    };
  }

  await storage.updateSession(breakdownId, { status: 'generating-cards' });
  return {
    needsClarification: false,
    analysisNotes: aiResponse.analysisNotes,
    status: 'ready',
  };
}

export function validateCardStructure(
  cards: TechnicalCard[],
  enableCoaching: boolean
): TechnicalCard[] {
  return cards.map((card) => ({
    ...card,
    storyPoints: clampToFibonacci(card.storyPoints ?? 3),
    acceptanceCriteria: Array.isArray(card.acceptanceCriteria) ? card.acceptanceCriteria : [],
    risks: Array.isArray(card.risks) ? card.risks : [],
    testStrategy: {
      unit:
        Array.isArray(card.testStrategy?.unit) && card.testStrategy.unit.length > 0
          ? card.testStrategy.unit
          : ['Verify core logic works correctly'],
      integration: Array.isArray(card.testStrategy?.integration) ? card.testStrategy.integration : [],
      e2e: Array.isArray(card.testStrategy?.e2e) ? card.testStrategy.e2e : [],
      regression: Array.isArray(card.testStrategy?.regression) ? card.testStrategy.regression : [],
    },
    challengeQuestion: enableCoaching ? card.challengeQuestion : undefined,
  }));
}

export function buildAIContext(
  tickets: FullJiraTicket[],
  knowledge: string,
  qaHistory: QAEntry[],
  imageDescription?: string | null
): string {
  const parts: string[] = [];

  if (knowledge) {
    parts.push(`## Project Knowledge\n${knowledge}`);
  }

  const ticketSection = tickets
    .map((t) => `## Jira Ticket: ${t.key}\n${t.summary}\n\n${t.description}`)
    .join('\n\n---\n\n');
  parts.push(ticketSection);

  if (imageDescription) {
    parts.push(`## UI/Design Context\n${imageDescription}`);
  }

  if (qaHistory.length > 0) {
    const qaText = qaHistory
      .map(
        (entry) =>
          `Round ${entry.round}:\n` +
          entry.questions
            .map((q) => {
              const answer = entry.answers.find((a) => a.questionId === q.id);
              return `Q: ${q.question}\nA: ${answer?.answer || '(not answered)'}`;
            })
            .join('\n\n')
      )
      .join('\n\n---\n\n');

    parts.push(`## Q&A Clarifications\n${qaText}`);
  }

  return parts.join('\n\n');
}
