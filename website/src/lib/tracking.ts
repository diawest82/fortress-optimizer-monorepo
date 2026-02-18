// Client-side event tracking
// File: src/lib/tracking.ts

/**
 * Track events for analytics
 */
export async function trackEvent(
  eventName: string,
  data?: Record<string, any>
) {
  try {
    // Get UTM parameters from URL
    const params = new URLSearchParams(window.location.search);
    const utmData = {
      utm_source: params.get('utm_source'),
      utm_campaign: params.get('utm_campaign'),
      utm_medium: params.get('utm_medium'),
    };

    // Get user email if available
    const userEmail = localStorage.getItem('user_email');
    const userId = localStorage.getItem('user_id');

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        email: userEmail,
        userId,
        eventData: data,
        page: window.location.pathname,
        referrer: document.referrer,
        ...utmData,
      }),
    });
  } catch (error) {
    console.error('Tracking error:', error);
  }
}

/**
 * Track page view
 */
export function trackPageView() {
  trackEvent('pageview', {
    page: window.location.pathname,
    title: document.title,
  });
}

/**
 * Track signup
 */
export async function trackSignup(email: string, source?: string) {
  await trackEvent('signup', {
    email,
    source,
  });

  // Store for future events
  localStorage.setItem('user_email', email);
}

/**
 * Track first action
 */
export async function trackFirstAction() {
  await trackEvent('first_optimization_completed');
}

/**
 * Track feature usage
 */
export async function trackFeatureUsage(feature: string, details?: Record<string, any>) {
  await trackEvent('feature_used', {
    feature,
    ...details,
  });
}
