/**
 * Initialize Admin User
 * POST /api/auth/admin/init
 * Creates the first admin user (only works if no users exist)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    // Check if any users exist
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: 'Users already exist. Use admin panel to add new users.' },
        { status: 403 }
      );
    }

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || 'Admin',
        password: hashedPassword,
        role: 'admin',
      },
    });

    // Create default settings
    await prisma.settings.create({
      data: {
        enterpriseThreshold: 999,
        notifyEmail: email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Admin user created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize admin user' },
      { status: 500 }
    );
  }
}
