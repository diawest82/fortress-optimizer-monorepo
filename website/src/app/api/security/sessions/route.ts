import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Mock data - replace with actual database queries
  const sessions = [
    {
      id: '1',
      device: 'MacBook Pro (Current)',
      browser: 'Chrome 120.0',
      ip: '192.168.1.100',
      country: 'United States',
      lastActivity: 'now',
      isCurrent: true,
    },
    {
      id: '2',
      device: 'iPhone 15',
      browser: 'Safari Mobile',
      ip: '203.0.113.45',
      country: 'United States',
      lastActivity: '2 hours ago',
      isCurrent: false,
    },
    {
      id: '3',
      device: 'Windows Desktop',
      browser: 'Edge 120.0',
      ip: '198.51.100.88',
      country: 'Canada',
      lastActivity: '1 day ago',
      isCurrent: false,
    },
  ];

  return NextResponse.json(sessions);
}
