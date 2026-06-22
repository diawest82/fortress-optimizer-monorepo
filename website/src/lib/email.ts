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
        <li>Read our <a href="https://fortress-optimizer.com/docs">documentation</a></li>
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

export async function sendUpgradeConfirmationEmail(
  email: string,
  tier: string,
  price: string
) {
  const tierDetails: Record<string, { name: string; features: string[] }> = {
    individual: {
      name: 'Sign Up',
      features: ['500K tokens/month', 'Real-time optimization', 'Advanced analytics', 'Email support', 'API access'],
    },
    teams: {
      name: 'Teams',
      features: ['Unlimited tokens', 'Team seat management', 'Priority support', 'Slack integration', 'Advanced analytics'],
    },
    enterprise: {
      name: 'Enterprise',
      features: ['Unlimited everything', 'Custom integrations', 'Dedicated account manager', '24/7 support'],
    },
  };

  const details = tierDetails[tier] || tierDetails.individual;

  return sendEmail({
    to: email,
    subject: `Welcome to Fortress ${details.name} Plan!`,
    html: `
      <h2>Upgrade Successful!</h2>
      <p>Your payment has been processed and you now have access to the <strong>${details.name}</strong> plan.</p>
      
      <h3>Your Plan Includes:</h3>
      <ul>
        ${details.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      
      <p><a href="https://fortress-optimizer.com/dashboard" style="background-color: #0ea5e9; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a></p>
      
      <p>Need help? Contact our support team at support@fortress-optimizer.com</p>
    `,
  });
}

export async function sendPaymentFailedEmail(email: string, reason: string) {
  return sendEmail({
    to: email,
    subject: 'Payment Failed - Action Required',
    html: `
      <h2>Payment Issue</h2>
      <p>We attempted to process your payment but it was declined.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      
      <p><a href="https://fortress-optimizer.com/account/billing" style="background-color: #ef4444; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Update Payment Method</a></p>
      
      <p>If you continue to experience issues, please contact support@fortress-optimizer.com</p>
    `,
  });
}

export async function sendTeamInviteEmail(
  email: string,
  teamName: string,
  inviterName: string,
  inviteLink: string
) {
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to join ${teamName} on Fortress`,
    html: `
      <h2>Team Invitation</h2>
      <p>${inviterName} has invited you to join the <strong>${teamName}</strong> team on Fortress Token Optimizer.</p>

      <p><a href="${inviteLink}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Accept Invitation</a></p>

      <p>Or copy this link: ${inviteLink}</p>

      <p>Questions? Reply to this email or visit our support page.</p>
    `,
  });
}

// ── Free-tier flow (onboarding + paid conversion) ──────────────────────────

/**
 * Sent when a user claims their one free API key. Includes the key because the
 * backend stores only a SHA-256 hash — this email is the user's only recovery
 * copy. (Free tier only; treat the inbox copy as the key of record.)
 */
export async function sendFreeKeyEmail(email: string, apiKey: string) {
  return sendEmail({
    to: email,
    subject: 'Your Fortress free API key',
    html: `
      <h2>Your free API key is ready</h2>
      <p>Here is your Fortress API key. Save it now — for security we only store a
      hash, so this email is your only copy.</p>

      <p style="font-family: monospace; background:#0b1020; color:#9be7a0; padding:12px 16px; border-radius:8px; word-break:break-all;">${apiKey}</p>

      <h3>Use it</h3>
      <p>Set it as <code>FORTRESS_API_KEY</code>, or pass it as a Bearer token:</p>
      <p style="font-family: monospace; background:#0b1020; color:#cbd5e1; padding:12px 16px; border-radius:8px; word-break:break-all;">Authorization: Bearer ${apiKey}</p>

      <ul>
        <li>Free tier: <strong>10,000 tokens/month</strong></li>
        <li><a href="https://www.fortress-optimizer.com/docs/getting-started">Getting started</a> · <a href="https://www.fortress-optimizer.com/install">Integrations</a></li>
      </ul>

      <p>Need more than the free trial?
        <a href="https://www.fortress-optimizer.com/pricing" style="background-color:#0ea5e9; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block;">Upgrade to Pro</a>
      </p>

      <p>Happy optimizing!<br />The Fortress Team</p>
    `,
  });
}

/** Nudge when a free user crosses ~80% of their monthly token grant. */
export async function sendUsageWarningEmail(email: string, used: number, limit: number) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return sendEmail({
    to: email,
    subject: `You've used ${pct}% of your free Fortress tokens`,
    html: `
      <h2>You're at ${pct}% of your free tokens</h2>
      <p>You've used <strong>${used.toLocaleString()}</strong> of your
      <strong>${limit.toLocaleString()}</strong> monthly tokens on the free plan.</p>
      <p>Upgrade to Pro for <strong>unlimited tokens</strong> so your optimization never pauses.</p>
      <p><a href="https://www.fortress-optimizer.com/pricing" style="background-color:#0ea5e9; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block;">Upgrade to Pro — $15/mo</a></p>
      <p>The Fortress Team</p>
    `,
  });
}

/** Sent when a free user hits their monthly token limit. */
export async function sendUsageLimitEmail(email: string, limit: number) {
  return sendEmail({
    to: email,
    subject: "You've hit your free Fortress limit — upgrade for unlimited",
    html: `
      <h2>Free limit reached</h2>
      <p>You've used all <strong>${limit.toLocaleString()}</strong> of your free monthly tokens.
      Optimization is paused until your monthly reset.</p>
      <p>Upgrade to Pro for <strong>unlimited tokens</strong> and keep going now:</p>
      <p><a href="https://www.fortress-optimizer.com/pricing" style="background-color:#0ea5e9; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block;">Upgrade to Pro — $15/mo</a></p>
      <p>The Fortress Team</p>
    `,
  });
}
