import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { subject, description, category, priority } = await req.json();

    // Generate ticket number
    const ticketNumber = `FORT-${Date.now().toString().slice(-6)}`;

    // TODO: Save to database using Prisma
    // const ticket = await prisma.supportTicket.create({
    //   data: {
    //     ticketNumber,
    //     subject,
    //     description,
    //     category,
    //     priority,
    //     creatorId: userId,
    //     creatorEmail: userEmail,
    //     status: 'open',
    //   },
    // });

    return NextResponse.json({
      success: true,
      ticketNumber,
      message: 'Support ticket created successfully',
      subject,
      description,
      category,
      priority,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // TODO: Fetch user's support tickets from database
    // const tickets = await prisma.supportTicket.findMany({
    //   where: { creatorId: userId },
    //   include: { responses: true },
    //   orderBy: { createdAt: 'desc' },
    // });

    return NextResponse.json({
      success: true,
      tickets: [],
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
