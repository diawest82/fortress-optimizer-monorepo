// Client-side event tracking with PostHog, Meta Pixel, and Google Analytics
// File: src/lib/tracking.ts

declare global {
  interface Window {
    posthog?: {
      init?: (apiKey: string, config: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      reset?: () => void;
      opt_in_capturing?: () => void;
      opt_out_capturing?: () => void;
    };
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
    gtag?: (command: string, target: string, params?: Record<string, unknown>) => void;
  }
}

/**
 * Get current cookie consent
 */
function getConsent() {
  if (typeof window === 'undefined') {
    return { analytics: false, marketing: false };
  }

  const consent = localStorage.getItem('cookie-consent');
  if (!consent) {
    return { analytics: false, marketing: false };
  }

  return JSON.parse(consent) as { analytics: boolean; marketing: boolean };
}

/**
 * Track conversion events (sign ups, upgrades, purchases)
 */
export function trackConversion(event: string, properties?: Record<string, string | number | boolean>) {
  const consent = getConsent();
  
  // PostHog
  if (consent.analytics && window.posthog) {
    window.posthog.capture(event, properties);
  }

  // Meta Pixel
  if (consent.marketing && window.fbq) {
    window.fbq('track', event, properties);
  }

  // Google Analytics
  if (consent.analytics && window.gtag && process.env.NEXT_PUBLIC_GA_ID) {
    window.gtag('event', event, properties as Record<string, unknown>);
  }
}

/**
 * Track user identification
 */
export function identifyUser(userId: string, properties?: Record<string, string | number | boolean>) {
  const consent = getConsent();

  if (consent.analytics && window.posthog) {
    window.posthog.identify(userId, properties);
  }

  if (consent.analytics && window.gtag && process.env.NEXT_PUBLIC_GA_ID) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      user_id: userId,
      ...properties,
    });
  }
}

/**
 * Track events for analytics (legacy API compatibility)
 */
export async function trackEvent(
  eventName: string,
  data?: Record<string, string | number | boolean>
) {
  trackConversion(eventName, data);

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
 * Track upgrade events
 */
export function trackUpgrade(fromTier: string, toTier: string, price?: number) {
  trackConversion('upgrade', {
    from_tier: fromTier,
    to_tier: toTier,
    ...(price && { value: price, currency: 'USD' }),
  });

  // Meta Pixel custom conversion
  if (getConsent().marketing && window.fbq) {
    window.fbq('track', 'Purchase', {
      value: price,
      currency: 'USD',
      content_name: toTier,
    });
  }
}

/**
 * Track tool usage (token counter, compatibility checker, etc.)
 */
export function trackToolUsage(toolName: string, properties?: Record<string, string | number | boolean>) {
  trackConversion('tool_used', {
    tool_name: toolName,
    ...properties,
  });
}

// Convenience exports for common events
export const analytics = {
  // Sign up funnel
  signupStarted: () => trackConversion('signup_started'),
  signupCompleted: (userId: string, tier: string) => {
    trackConversion('signup_completed', { tier });
    identifyUser(userId, { tier });
    trackConversion('CompleteRegistration', { tier });
  },

  // Upgrades
  upgradeStarted: (fromTier: string, toTier: string) => 
    trackConversion('upgrade_started', { from_tier: fromTier, to_tier: toTier }),
  upgradeCompleted: (fromTier: string, toTier: string, price: number) => 
    trackUpgrade(fromTier, toTier, price),

  // Tool usage
  tokenCounterUsed: (tokens: number) => trackToolUsage('token_counter', { tokens }),
  compatibilityCheckerUsed: (provider: string) => trackToolUsage('compatibility_checker', { provider }),
  costCalculatorUsed: (savings: number) => trackToolUsage('cost_calculator', { savings }),

  // Engagement
  pricingViewed: () => trackConversion('pricing_viewed'),
  docsViewed: (section: string) => trackConversion('docs_viewed', { section }),

  // Content
  videoWatched: (videoId: string) => trackConversion('video_watched', { video_id: videoId }),
};

/**
 * Track signup
 */
export async function trackSignup(email: string, source?: string) {
  const params: Record<string, string | number | boolean> = { email };
  if (source) {
    params.source = source;
  }
  await trackEvent('signup', params);

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
