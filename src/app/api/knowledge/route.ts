import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClaudeClient } from '@/lib/api/claude';
import { getBreakdownStorage } from '@/lib/storage';
import { buildKnowledgeInitPrompt } from '@/lib/constants/breakdown-prompts';
import { logger } from '@/lib/logger/winston';

const putSchema = z.object({
  content: z.string(),
});

const postSchema = z.object({
  context: z.string().min(1),
  modelId: z.string().optional(),
});

export async function GET() {
  try {
    const storage = getBreakdownStorage();
    const content = await storage.readKnowledge();
    return NextResponse.json({ content });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to read knowledge', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = putSchema.parse(body);

    const storage = getBreakdownStorage();
    await storage.writeKnowledge(content);

    logger.info('Knowledge base updated');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to update knowledge', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, modelId } = postSchema.parse(body);

    const defaultModelId =
      modelId || process.env.CLAUDE_MODEL_DEFAULT || 'claude-sonnet-4-6';

    logger.info('Generating knowledge.md from context');

    const claudeClient = new ClaudeClient(process.env.ANTHROPIC_API_KEY!);
    const prompt = buildKnowledgeInitPrompt(context);
    const structuredContent = await claudeClient.generateText({
      prompt,
      modelId: defaultModelId,
    });

    return NextResponse.json({ content: structuredContent });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to generate knowledge from context', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
