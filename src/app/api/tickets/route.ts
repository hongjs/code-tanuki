import { NextRequest, NextResponse } from 'next/server';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import { ticketStorage } from '@/lib/storage/ticket-storage';
import { logger } from '@/lib/logger/winston';
import { LocalTicket, TicketType } from '@/types/ticket';

const ticketTypeValues: [TicketType, ...TicketType[]] = ['Epic', 'Story', 'Task', 'Sub-task', 'Bug'];

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(ticketTypeValues),
  status: z.string().default('To Do'),
  priority: z.string().optional(),
  storyPoints: z.number().optional(),
  assignee: z.string().optional(),
  parentKey: z.string().optional(),
  subtaskKeys: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  acceptanceCriteria: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const type = (searchParams.get('type') || undefined) as TicketType | undefined;
    const status = searchParams.get('status') || undefined;

    const tickets = await ticketStorage.getAll({ search, type, status });

    return NextResponse.json({ tickets });
  } catch (error) {
    logger.error('Failed to get tickets', { error });
    return NextResponse.json({ error: 'Failed to get tickets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createTicketSchema.parse(body);

    const now = new Date().toISOString();
    const ticket: LocalTicket = {
      localId: uuidv7(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await ticketStorage.save(ticket);

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    logger.error('Failed to create ticket', { error });
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
