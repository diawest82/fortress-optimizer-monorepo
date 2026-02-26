import { sendContactEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        { message: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { message: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Send email
    await sendContactEmail(email, name, message);

    return NextResponse.json(
      { message: 'Email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to send email',
      },
      { status: 500 }
    );
  }
}
