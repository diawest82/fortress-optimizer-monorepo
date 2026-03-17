// Reporting and scheduling
// File: src/lib/automation/reporting.ts

import { sendEmail } from '@/lib/email';

/**
 * Generate daily metrics report
 */
export async function generateDailyReport(metrics: any) {
  return `
FORTRESS - DAILY METRICS REPORT
${new Date().toLocaleDateString()}

📊 ACQUISITION
├─ New Signups: ${metrics.newSignups}
├─ Total Signups: ${metrics.totalSignups}
└─ Top Channel: ${metrics.topChannel}

👥 ENGAGEMENT
├─ Active Users: ${metrics.activeUsers}
├─ Optimizations: ${metrics.optimizationsCompleted}
└─ Avg Actions/User: ${(metrics.optimizationsCompleted / metrics.activeUsers).toFixed(2)}

💰 REVENUE
├─ Paid Users: ${metrics.paidUsers}
├─ MRR: $${metrics.mrrAmount?.toFixed(2) || '0.00'}
└─ ARR: $${(metrics.mrrAmount * 12)?.toFixed(2) || '0.00'}

📉 CHURN
├─ Churned: ${metrics.churnedUsers}
├─ Churn Rate: ${((metrics.churnedUsers / metrics.totalSignups) * 100).toFixed(2)}%
└─ Retention: ${(100 - ((metrics.churnedUsers / metrics.totalSignups) * 100)).toFixed(2)}%
`;
}

/**
 * Generate weekly summary report
 */
export async function generateWeeklySummary(weeklyMetrics: any[]) {
  const totalSignups = weeklyMetrics.reduce((sum, m) => sum + m.newSignups, 0);
  const avgActive = weeklyMetrics.reduce((sum, m) => sum + m.activeUsers, 0) / weeklyMetrics.length;

  return `
FORTRESS - WEEKLY SUMMARY
Week of ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}

📈 GROWTH
Total New Signups: ${totalSignups}
Avg Daily Signups: ${(totalSignups / 7).toFixed(0)}
Avg Active Users: ${avgActive.toFixed(0)}

📊 KEY METRICS
Total Optimizations: ${weeklyMetrics.reduce((sum, m) => sum + m.optimizationsCompleted, 0)}
Top Day: ${weeklyMetrics.sort((a, b) => b.newSignups - a.newSignups)[0]?.date || 'N/A'}
Churn: ${weeklyMetrics.reduce((sum, m) => sum + m.churnedUsers, 0)} users
`;
}

/**
 * Send report via email (placeholder)
 */
export async function sendReportEmail(
  recipients: string[],
  subject: string,
  content: string
) {
  const html = `<pre style="font-family: monospace; white-space: pre-wrap;">${content}</pre>`;
  for (const to of recipients) {
    try {
      await sendEmail({ to, subject, html });
    } catch (error) {
      console.error(`Failed to send report to ${to}:`, error);
    }
  }
  return true;
}

/**
 * Send report via Slack (placeholder)
 */
export async function sendReportSlack(
  webhookUrl: string,
  content: string
) {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content }),
    });
    if (!res.ok) {
      console.error(`Slack webhook failed: ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Slack webhook error:', error);
    return false;
  }
}

/**
 * Calculate metrics for specific date range
 */
export function calculateMetricsChange(
  current: number,
  previous: number
): { value: number; percentage: number; trend: 'up' | 'down' } {
  const change = current - previous;
  const percentage = (change / previous) * 100;
  return {
    value: change,
    percentage: parseFloat(percentage.toFixed(2)),
    trend: change >= 0 ? 'up' : 'down',
  };
}
