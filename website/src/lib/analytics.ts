/**
 * Analytics Tracking
 * Tracks user events, feature usage, and metrics across the application
 */

interface AnalyticsEvent {
  userId?: string;
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: Date;
}

const ANALYTICS_QUEUE: AnalyticsEvent[] = [];

/**
 * Track an analytics event
 * In production, this would send to a service like PostHog, Mixpanel, or Amplitude
 */
export async function trackEvent(event: AnalyticsEvent) {
  const enrichedEvent: AnalyticsEvent = {
    ...event,
    timestamp: event.timestamp || new Date(),
  };

  // Queue for batch processing
  ANALYTICS_QUEUE.push(enrichedEvent);

  // Flush queue if it reaches a certain size
  if (ANALYTICS_QUEUE.length >= 10) {
    await flushAnalytics();
  }
}

/**
 * Flush queued analytics events to the server
 */
export async function flushAnalytics() {
  if (ANALYTICS_QUEUE.length === 0) return;

  const events = [...ANALYTICS_QUEUE];
  ANALYTICS_QUEUE.length = 0;

  try {
    // Send to your analytics service
    // This endpoint should POST to /api/analytics
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      console.error('Failed to flush analytics:', response.status);
      // Re-queue failed events
      ANALYTICS_QUEUE.push(...events);
    }
  } catch (error) {
    console.error('Analytics flush error:', error);
    // Re-queue on error
    ANALYTICS_QUEUE.push(...events);
  }
}

/**
 * Common event tracking functions
 */
export const analytics = {
  // Authentication
  signupStarted: (email: string) =>
    trackEvent({ event: 'signup_started', properties: { email } }),
  signupCompleted: (userId: string, tier: string = 'free') =>
    trackEvent({ userId, event: 'signup_completed', properties: { tier } }),
  loginCompleted: (userId: string) =>
    trackEvent({ userId, event: 'login_completed' }),

  // Subscription
  checkoutStarted: (userId: string, tier: string) =>
    trackEvent({ userId, event: 'checkout_started', properties: { tier } }),
  checkoutCompleted: (userId: string, tier: string, amount: number) =>
    trackEvent({ userId, event: 'checkout_completed', properties: { tier, amount } }),
  upgradeFailed: (userId: string, reason: string) =>
    trackEvent({ userId, event: 'upgrade_failed', properties: { reason } }),

  // Feature usage
  optimizationRequested: (userId: string, textLength: number) =>
    trackEvent({ userId, event: 'optimization_requested', properties: { textLength } }),
  optimizationCompleted: (userId: string, originalTokens: number, optimizedTokens: number) =>
    trackEvent({
      userId,
      event: 'optimization_completed',
      properties: { originalTokens, optimizedTokens, savings: originalTokens - optimizedTokens },
    }),

  // Support
  ticketCreated: (userId: string, category: string) =>
    trackEvent({ userId, event: 'support_ticket_created', properties: { category } }),
  ticketResolved: (userId: string, resolutionTime: number) =>
    trackEvent({ userId, event: 'support_ticket_resolved', properties: { resolutionTime } }),

  // Team
  teamCreated: (userId: string, teamName: string) =>
    trackEvent({ userId, event: 'team_created', properties: { teamName } }),
  teamMemberAdded: (userId: string, teamId: string) =>
    trackEvent({ userId, event: 'team_member_added', properties: { teamId } }),

  // API
  apiKeyGenerated: (userId: string) =>
    trackEvent({ userId, event: 'api_key_generated' }),
  apiKeyRevoked: (userId: string) =>
    trackEvent({ userId, event: 'api_key_revoked' }),

  // Dashboard
  dashboardViewed: (userId: string, tab: string) =>
    trackEvent({ userId, event: 'dashboard_viewed', properties: { tab } }),

  // Tools
  toolUsed: (userId: string | undefined, toolName: string) =>
    trackEvent({ userId, event: 'tool_used', properties: { toolName } }),
};
