/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Fails fast if configuration is incomplete
 */

interface EnvConfig {
  nodeEnv: string;
  jwtSecret: string;
  apiUrl: string;
  frontendUrl: string;
  resendApiKey?: string;
  mailgunApiKey?: string;
}

export function validateEnvironment(): EnvConfig {
  const errors: string[] = [];

  // Check required variables
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!process.env.NODE_ENV) {
    console.warn('NODE_ENV not explicitly set, defaulting to "development"');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is not defined (required for authentication)');
  }
  if (jwtSecret && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://localhost:3000`;
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || `http://localhost:3000`;

  // Check optional but recommended variables
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey && nodeEnv === 'production') {
    console.warn('Warning: RESEND_API_KEY not set. Email functionality disabled.');
  }

  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  if (!mailgunApiKey && nodeEnv === 'production') {
    console.warn('Warning: MAILGUN_API_KEY not set. Email backup disabled.');
  }

  // Fail fast if critical variables are missing
  if (errors.length > 0) {
    console.error('❌ Environment Configuration Errors:');
    errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error(
      `Environment validation failed. Please set required environment variables.`
    );
  }

  console.log('✅ Environment validation passed');

  return {
    nodeEnv,
    jwtSecret: jwtSecret || '',
    apiUrl,
    frontendUrl,
    resendApiKey,
    mailgunApiKey,
  };
}

/**
 * Get environment config with validation
 * This should be called once at application startup
 */
let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnvironment();
  }
  return cachedConfig;
}
