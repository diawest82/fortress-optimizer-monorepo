import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const SUPPORT_EMAIL = 'support@fortress-optimizer.com';

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
