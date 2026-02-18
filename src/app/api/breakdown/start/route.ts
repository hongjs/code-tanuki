import { NextRequest, NextResponse } from 'next/server';
import { v7 as uuidv7 } from 'uuid';
import { JiraClient } from '@/lib/api/jira';
import { GeminiClient } from '@/lib/api/gemini';
import { getBreakdownStorage } from '@/lib/storage';
import { breakdownStartSchema } from '@/lib/utils/validation';
import { logger } from '@/lib/logger/winston';
import { BreakdownSession, FullJiraTicket, JiraAttachment } from '@/types/breakdown';

function extractTicketId(raw: string): string {
  const trimmed = raw.trim();
  // Full URL: https://company.atlassian.net/browse/PROJ-123
  const urlMatch = trimmed.match(/([A-Z][A-Z0-9_]+-\d+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  return trimmed.toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = breakdownStartSchema.parse(body);

    const ticketIds = input.jiraTicketIds.map(extractTicketId);
    // deduplicate
    const uniqueTicketIds = [...new Set(ticketIds)];

    const breakdownId = uuidv7();
    const storage = getBreakdownStorage();

    const session: BreakdownSession = {
      id: breakdownId,
      status: 'fetching-jira',
      jiraTicketIds: uniqueTicketIds,
      modelId: input.modelId,
      detailLevel: input.detailLevel,
      enableDevCoaching: input.enableDevCoaching,
      additionalPrompt: input.additionalPrompt,
      qaRoundCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storage.createSession(session);

    logger.info(`Starting breakdown session`, { breakdownId, ticketIds: uniqueTicketIds });

    const jiraClient = new JiraClient(
      process.env.JIRA_BASE_URL!,
      process.env.JIRA_EMAIL!,
      process.env.JIRA_API_TOKEN!
    );

    // Fetch all tickets in parallel
    const tickets: FullJiraTicket[] = await Promise.all(
      uniqueTicketIds.map((id) => jiraClient.fetchTicketFull(id))
    );

    await storage.saveJiraData(breakdownId, tickets);
    await storage.updateSession(breakdownId, { status: 'analyzing-images' });

    // Collect all image attachments across tickets (capped globally)
    const maxImages = parseInt(process.env.BREAKDOWN_MAX_IMAGES || '5');
    const allImageAttachments: (JiraAttachment & { ticketKey: string })[] = [];
    for (const ticket of tickets) {
      for (const att of ticket.attachments) {
        if (att.mimeType.startsWith('image/') && allImageAttachments.length < maxImages) {
          allImageAttachments.push({ ...att, ticketKey: ticket.key });
        }
      }
    }

    if (allImageAttachments.length > 0) {
      try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey) {
          const geminiClient = new GeminiClient(geminiApiKey);
          const downloadedImages: { buffer: Buffer; mimeType: string; filename: string }[] = [];

          await Promise.all(
            allImageAttachments.map(async (att) => {
              try {
                const buffer = await jiraClient.downloadAttachment(att.content);
                await storage.saveAttachment(breakdownId, att.filename, buffer);
                downloadedImages.push({
                  buffer,
                  mimeType: att.mimeType,
                  filename: `${att.ticketKey}/${att.filename}`,
                });
              } catch (e) {
                logger.warn(`Failed to download attachment: ${att.filename}`, { error: e });
              }
            })
          );

          if (downloadedImages.length > 0) {
            const description = await geminiClient.describeImages(downloadedImages);
            await storage.saveImageDescription(breakdownId, description);
          }
        } else {
          logger.info('No GEMINI_API_KEY configured, skipping image analysis');
        }
      } catch (e) {
        logger.warn('Image analysis failed, continuing without it', { error: e });
      }
    }

    await storage.updateSession(breakdownId, { status: 'ai-initial-analysis' });

    // Primary summary = first ticket
    const primaryTicket = tickets[0];
    const summaryLabel =
      tickets.length === 1
        ? primaryTicket.summary
        : `${primaryTicket.summary} (+${tickets.length - 1} more)`;

    await storage.updateList({
      id: breakdownId,
      jiraTicketIds: uniqueTicketIds,
      jiraSummary: summaryLabel,
      status: 'ai-initial-analysis',
      modelId: input.modelId,
      cardCount: 0,
      createdAt: session.createdAt,
      updatedAt: new Date().toISOString(),
    });

    logger.info(`Breakdown session initialized`, {
      breakdownId,
      ticketIds: uniqueTicketIds,
      imageCount: allImageAttachments.length,
    });

    return NextResponse.json({
      breakdownId,
      status: 'ai-initial-analysis',
      jiraTickets: tickets.map((t) => ({
        key: t.key,
        summary: t.summary,
        type: t.type,
        attachmentCount: t.attachments.length,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to start breakdown', { error: message });

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request', details: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
