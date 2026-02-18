import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/api/jira';
import { getBreakdownStorage } from '@/lib/storage';
import { breakdownPublishSchema } from '@/lib/utils/validation';
import { buildSummaryCommentADF } from '@/lib/utils/jira-card-builder';
import { logger } from '@/lib/logger/winston';
import { TechnicalCard } from '@/types/breakdown';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = breakdownPublishSchema.parse(body);
    const { breakdownId, cards } = input;

    const storage = getBreakdownStorage();
    const session = await storage.getSession(breakdownId);

    if (!session) {
      return NextResponse.json({ error: 'Breakdown session not found' }, { status: 404 });
    }

    const tickets = await storage.getJiraData(breakdownId);
    if (!tickets.length) {
      return NextResponse.json({ error: 'Jira data not found' }, { status: 404 });
    }

    // Save the final (possibly user-edited) cards
    await storage.saveCards(breakdownId, cards as TechnicalCard[]);
    await storage.updateSession(breakdownId, { status: 'publishing' });

    const primaryTicket = tickets[0];
    logger.info(`Publishing ${cards.length} cards to Jira`, {
      breakdownId,
      ticketCount: tickets.length,
      primaryTicket: primaryTicket.key,
    });

    const jiraClient = new JiraClient(
      process.env.JIRA_BASE_URL!,
      process.env.JIRA_EMAIL!,
      process.env.JIRA_API_TOKEN!
    );

    const createdIssueKeys: string[] = [];
    const errors: string[] = [];

    // Build a lookup map of ticket key → FullJiraTicket for fast parent resolution
    const ticketMap = new Map(tickets.map((t) => [t.key, t]));

    // Create each card in Jira under its designated parentTicket
    for (const card of cards) {
      const parentKey = card.parentTicket || primaryTicket.key;
      // Verify the parentTicket is one of our tickets (fallback to primary)
      const resolvedParent = ticketMap.has(parentKey) ? parentKey : primaryTicket.key;

      try {
        let issueKey: string;
        if (card.type === 'subtask') {
          issueKey = await jiraClient.createSubtask(resolvedParent, card as TechnicalCard);
        } else {
          issueKey = await jiraClient.createLinkedStory(resolvedParent, card as TechnicalCard);
        }
        createdIssueKeys.push(issueKey);
        logger.info(`Created ${card.type}: ${issueKey} under ${resolvedParent}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error(`Failed to create card: ${card.title}`, { error: msg });
        errors.push(`${card.title}: ${msg}`);
      }
    }

    // Post summary comment to all involved tickets
    if (createdIssueKeys.length > 0) {
      for (const ticket of tickets) {
        try {
          const summaryADF = buildSummaryCommentADF(cards as TechnicalCard[], breakdownId);
          await jiraClient.postComment(
            ticket.key,
            JSON.stringify(summaryADF),
            createdIssueKeys.length
          );
        } catch (e) {
          logger.warn(`Failed to post summary comment to ${ticket.key}`, { error: e });
        }
      }
    }

    const updatedSession = await storage.getSession(breakdownId);
    const knowledgeSuggestion = updatedSession?.knowledgeSuggestion;
    const finalStatus = knowledgeSuggestion ? 'knowledge-update' : 'completed';

    await storage.updateSession(breakdownId, {
      status: finalStatus,
      publishedIssueKeys: createdIssueKeys,
    });

    const summaryLabel =
      tickets.length === 1
        ? primaryTicket.summary
        : `${primaryTicket.summary} (+${tickets.length - 1} more)`;

    // Update list entry
    await storage.updateList({
      id: breakdownId,
      jiraTicketIds: session.jiraTicketIds,
      jiraSummary: summaryLabel,
      status: finalStatus,
      modelId: session.modelId,
      cardCount: createdIssueKeys.length,
      createdAt: session.createdAt,
      updatedAt: new Date().toISOString(),
    });

    logger.info(`Publish complete`, {
      breakdownId,
      created: createdIssueKeys.length,
      errors: errors.length,
    });

    return NextResponse.json({
      success: errors.length === 0,
      createdIssueKeys,
      errors: errors.length > 0 ? errors : undefined,
      knowledgeSuggestion,
      status: finalStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to publish breakdown', { error: message });

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request', details: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
