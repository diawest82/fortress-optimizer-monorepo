/**
 * Strict email validation for signup/login.
 *
 * Rejects:
 *  - Apostrophes, quotes, backticks (SQL-injection-looking chars)
 *  - Angle brackets, ampersands, semicolons (HTML/JS injection)
 *  - Whitespace, multiple @, consecutive dots
 *  - Anything over 254 chars (RFC 5321 SMTP limit)
 *  - Local part over 64 chars (RFC 5321 limit)
 *
 * Accepts a deliberately conservative subset of RFC 5322: letters,
 * digits, dot, underscore, hyphen, plus, percent. This is stricter than
 * the spec allows but matches what real-world email providers accept
 * and prevents storing values that look like injection payloads.
 */

const STRICT_EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export type EmailValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; reason: string };

export function validateEmail(input: unknown): EmailValidationResult {
  if (typeof input !== 'string') return { valid: false, reason: 'Email is required' };
  const email = input.trim();
  if (!email) return { valid: false, reason: 'Email is required' };
  if (email.length > 254) return { valid: false, reason: 'Email too long' };
  const at = email.indexOf('@');
  if (at < 0 || at !== email.lastIndexOf('@')) {
    return { valid: false, reason: 'Invalid email format' };
  }
  const local = email.slice(0, at);
  if (local.length === 0 || local.length > 64) {
    return { valid: false, reason: 'Invalid email format' };
  }
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return { valid: false, reason: 'Invalid email format' };
  }
  if (!STRICT_EMAIL_RE.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  return { valid: true, normalized: email.toLowerCase() };
}

/** Boolean-only helper for client-side use. */
export function isValidEmail(input: unknown): boolean {
  return validateEmail(input).valid;
}
