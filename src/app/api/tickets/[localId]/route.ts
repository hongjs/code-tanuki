import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ticketStorage } from '@/lib/storage/ticket-storage';
import { logger } from '@/lib/logger/winston';
import { TicketType } from '@/types/ticket';
import { updateTicketSchema } from '@/lib/schemas/ticket-schemas';

interface RouteParams {
  params: Promise<{ localId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { localId } = await params;
    const ticket = await ticketStorage.getById(localId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    logger.error('Failed to get ticket', { error });
    return NextResponse.json({ error: 'Failed to get ticket' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { localId } = await params;
    const existing = await ticketStorage.getById(localId);

    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates = updateTicketSchema.parse(body);

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await ticketStorage.save(updated);

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    logger.error('Failed to update ticket', { error });
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { localId } = await params;
    const existing = await ticketStorage.getById(localId);

    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await ticketStorage.delete(localId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete ticket', { error });
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
