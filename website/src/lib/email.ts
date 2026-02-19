import { Resend } from 'resend';

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const SUPPORT_EMAIL = 'support@fortress-optimizer.com';

// Lazy-load Resend to avoid errors during build when API key is not set
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Email service not configured (RESEND_API_KEY not set)');
  }
  return new Resend(apiKey);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: EmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API key not configured');
    throw new Error('Email service not configured');
  }

  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      replyTo,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

export async function sendContactEmail(
  fromEmail: string,
  name: string,
  message: string
) {
  return sendEmail({
    to: SUPPORT_EMAIL,
    subject: `New support request from ${name}`,
    html: `
      <h2>New Support Request</h2>
      <p><strong>From:</strong> ${name} (${fromEmail})</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br />')}</p>
    `,
    replyTo: fromEmail,
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'Welcome to Fortress Token Optimizer',
    html: `
      <h2>Welcome to Fortress, ${name}!</h2>
      <p>We&apos;re excited to have you on board. You&apos;re now part of a select group of teams optimizing their token usage.</p>
      
      <h3>Next Steps:</h3>
      <ol>
        <li>Check out the <a href="https://fortress-optimizer.com/install">installation guides</a></li>
        <li>View the <a href="https://fortress-optimizer.com/dashboard">dashboard</a> to track your savings</li>
        <li>Read our <a href="https://docs.fortress-optimizer.com">documentation</a></li>
      </ol>
      
      <p>Questions? Reply to this email or visit our <a href="https://fortress-optimizer.com/support">support page</a>.</p>
      
      <p>Happy optimizing!<br />
      The Fortress Team</p>
    `,
  });
}

export async function sendSupportTicketEmail({
  email,
  ticketNumber,
  subject,
  category,
}: {
  email: string;
  ticketNumber: string;
  subject: string;
  category: string;
}) {
  return sendEmail({
    to: email,
    subject: `Support Ticket Created: ${ticketNumber}`,
    html: `
      <h2>Support Ticket Received</h2>
      <p>We&apos;ve received your support request and assigned it ticket number <strong>${ticketNumber}</strong>.</p>
      
      <h3>Ticket Details:</h3>
      <ul>
        <li><strong>Ticket:</strong> ${ticketNumber}</li>
        <li><strong>Subject:</strong> ${subject}</li>
        <li><strong>Category:</strong> ${category}</li>
      </ul>
      
      <h3>What Happens Next:</h3>
      <p>Our support team will review your request and respond within the SLA for your plan:</p>
      <ul>
        <li><strong>Free:</strong> 48-72 hours</li>
        <li><strong>Sign Up:</strong> 24-48 hours</li>
        <li><strong>Teams:</strong> 4-8 hours</li>
        <li><strong>Enterprise:</strong> 1 hour</li>
      </ul>
      
      <p>You can track your ticket status in your <a href="https://fortress-optimizer.com/account">account dashboard</a>.</p>
      
      <p>Thanks for choosing Fortress!<br />
      The Support Team</p>
    `,
    replyTo: SUPPORT_EMAIL,
  });
}
