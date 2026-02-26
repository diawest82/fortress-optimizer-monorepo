import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { sendSupportTicketEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, description, category, priority } = await req.json();

    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
        { status: 400 }
      );
    }

    // Generate ticket number
    const ticketNumber = `FORT-${Date.now().toString().slice(-6)}`;

    // Save to database
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        subject,
        description,
        category: category || 'general',
        priority: priority || 'normal',
        creatorId: session.user.id || '',
        creatorEmail: session.user.email,
        creatorName: session.user.name || session.user.email || 'User',
        status: 'open',
      },
    });

    // Send confirmation email
    try {
      await sendSupportTicketEmail({
        email: session.user.email,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
      });
    } catch (emailError) {
      console.error('Failed to send support ticket email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      ticketNumber: ticket.ticketNumber,
      message: 'Support ticket created successfully',
      id: ticket.id,
    });
  } catch (error) {
    console.error('POST /api/support/tickets error:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's support tickets from database
    const tickets = await prisma.supportTicket.findMany({
      where: { creatorId: session.user.id },
      include: { responses: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        responseCount: ticket.responses.length,
      })),
    });
  } catch (error) {
    console.error('GET /api/support/tickets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
