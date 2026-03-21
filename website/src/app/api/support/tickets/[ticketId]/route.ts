import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

function sanitizeHtml(str: string): string {
  return str.replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');
}

// GET /api/support/tickets/:ticketId — fetch single ticket with responses
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await params;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        creatorId: session.user.id, // Only show own tickets
      },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
          where: { isInternal: false }, // Hide internal notes from user
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        responses: ticket.responses.map(r => ({
          id: r.id,
          message: r.message,
          authorEmail: r.authorEmail,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/support/tickets/:id error:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}

// POST /api/support/tickets/:ticketId — add a reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await params;
    const { message } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Verify user owns ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, creatorId: session.user.id },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const cleanMessage = sanitizeHtml(message.slice(0, 10000));

    const response = await prisma.supportResponse.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        authorEmail: session.user.email,
        message: cleanMessage,
        isInternal: false,
      },
    });

    // Reopen ticket if it was resolved/closed
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: 'open', resolvedAt: null },
      });
    }

    return NextResponse.json({
      success: true,
      response: {
        id: response.id,
        message: response.message,
        createdAt: response.createdAt,
      },
    });
  } catch (error) {
    console.error('POST /api/support/tickets/:id error:', error);
    return NextResponse.json({ error: 'Failed to add response' }, { status: 500 });
  }
}
