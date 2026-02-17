/**
 * Email Webhook Endpoint
 * Receives emails from Resend or other email services
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeEmail, updateEmailAnalysis } from '@/lib/email-storage';
import { analyzeEmail } from '@/lib/email-processing';

/**
 * POST /api/webhook/email
 * Receives incoming emails from email service
 * 
 * Expected payload:
 * {
 *   from: string,
 *   to: string,
 *   subject: string,
 *   html?: string,
 *   text: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional - add based on your email service)
    // const signature = request.headers.get('x-webhook-signature');
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const body = await request.json();
    const { from, to, subject, text, html } = body;

    // Validation
    if (!from || !to || !subject || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: from, to, subject, text' },
        { status: 400 }
      );
    }

    // Store the email
    const storedEmail = await storeEmail({
      from,
      to,
      subject,
      body: text,
      html,
    });

    // Analyze the email asynchronously
    try {
      const analysis = await analyzeEmail({
        subject,
        body: text,
        from,
      });

      // Update email with analysis
      await updateEmailAnalysis(storedEmail.id, {
        category: analysis.category,
        isEnterprise: analysis.isEnterprise,
        companySize: analysis.companySize,
        aiSummary: analysis.summary,
        aiRecommendation: analysis.recommendation,
        requiresHuman: analysis.requiresHuman,
      });
    } catch (error) {
      console.error('Error analyzing email:', error);
      // Continue - email is stored even if analysis fails
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Email received and stored',
        emailId: storedEmail.id 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process email' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhook/email
 * Health check for webhook
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Email webhook is ready to receive emails' 
  });
}
