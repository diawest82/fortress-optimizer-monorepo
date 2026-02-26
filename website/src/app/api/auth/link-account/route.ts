import { NextRequest, NextResponse } from 'next/server';

interface LinkAccountRequest {
  primaryEmail: string;
  secondaryProvider: string;
  secondaryEmail: string;
}

interface LinkedAccount {
  email: string;
  provider: string;
  linkedAt: string;
}

// Mock database
const linkedAccounts: Map<string, LinkedAccount[]> = new Map();

export async function POST(request: NextRequest) {
  try {
    const { primaryEmail, secondaryProvider, secondaryEmail }: LinkAccountRequest = await request.json();

    if (!primaryEmail || !secondaryProvider || !secondaryEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get or create linked accounts list
    const accounts = linkedAccounts.get(primaryEmail) || [];

    // Check if already linked
    const existing = accounts.find(
      acc => acc.provider === secondaryProvider && acc.email === secondaryEmail
    );

    if (existing) {
      return NextResponse.json(
        { error: 'Account already linked' },
        { status: 409 }
      );
    }

    // Add new linked account
    const newLink: LinkedAccount = {
      email: secondaryEmail,
      provider: secondaryProvider,
      linkedAt: new Date().toISOString(),
    };

    accounts.push(newLink);
    linkedAccounts.set(primaryEmail, accounts);

    return NextResponse.json({
      message: 'Account linked successfully',
      linked: newLink,
    });
  } catch (error) {
    console.error('Account linking error:', error);
    return NextResponse.json(
      { error: 'Linking failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    const accounts = linkedAccounts.get(email) || [];
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching linked accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
