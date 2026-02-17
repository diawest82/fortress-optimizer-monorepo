import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENV = process.env.SENTRY_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENV,
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

  // Performance Monitoring
  tracesSampleRate: SENTRY_ENV === 'production' ? 0.1 : 1.0,

  // Release tracking
  release: process.env.APP_VERSION,

  // Maximum breadcrumbs
  maxBreadcrumbs: 50,

  // Attach stack traces
  attachStacktrace: true,

  // Before sending to Sentry
  beforeSend(event, hint) {
    // Filter sensitive data from server-side errors
    if (event.request) {
      delete event.request.headers;
      delete event.request.cookies;
    }

    if (event.exception) {
      const error = hint.originalException;

      // Ignore known non-error events
      if (error?.message?.includes('NEXT_REDIRECT')) {
        return null;
      }

      // Ignore certain database errors in development
      if (SENTRY_ENV !== 'production' && error?.message?.includes('ECONNREFUSED')) {
        return null;
      }
    }

    return event;
  },

  // Context data to attach to all events
  initialScope: {
    tags: {
      component: 'server',
      runtime: 'nodejs',
    },
  },
});

export default Sentry;
