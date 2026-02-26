import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENV = process.env.NEXT_PUBLIC_SENTRY_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENV,
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

  // Performance Monitoring
  tracesSampleRate: SENTRY_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: SENTRY_ENV === 'production' ? 0.1 : 1.0,

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Set sampling rates as an absolute number of requests
  maxBreadcrumbs: 50,

  // Attach stack traces for all messages
  attachStacktrace: true,

  // Integrations
  integrations: [
    new Sentry.Replay({
      // Capture 100% of all sessions + 100% of sessions with an error
      maskAllText: true,
      blockAllMedia: true,
    }),
    new Sentry.BreadcrumbIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      http: true,
      xhr: true,
    }),
  ],

  // Before sending to Sentry
  beforeSend(event, hint) {
    // Filter out certain errors
    if (event.exception) {
      const error = hint.originalException;
      
      // Ignore cancelled requests
      if (error?.message?.includes('cancelled')) {
        return null;
      }

      // Ignore network errors in development
      if (SENTRY_ENV !== 'production' && error?.message?.includes('Network')) {
        return null;
      }
    }

    return event;
  },

  // URL ignore patterns
  ignoreErrors: [
    'top.GLOBALS',
    'chrome-extension://',
    'moz-extension://',
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],

  // Capture unhandled promise rejections
  handleUnhandledRejection: true,
});

export default Sentry;
