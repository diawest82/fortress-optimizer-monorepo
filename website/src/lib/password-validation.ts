/**
 * Password Validation & Complexity Requirements
 * Enforces strong password requirements and checks against common passwords
 */

interface PasswordStrength {
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
  feedback: string[];
}

/**
 * Common weak passwords to block
 */
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', 'qwerty', 'abc123', '12345678',
  'letmein', 'welcome', 'monkey', 'dragon', 'master', 'admin', 'root',
  'toor', 'pass', 'test', 'guest', 'info', 'adm', 'administrator'
]);

/**
 * Validate password complexity and strength
 */
export function validatePassword(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Minimum length (8 characters)
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 20;
  }

  // Maximum length (128 characters)
  if (password.length > 128) {
    feedback.push('Password must not exceed 128 characters');
  }

  // Lowercase letters
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add lowercase letters (a-z)');
  }

  // Uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add uppercase letters (A-Z)');
  }

  // Numbers
  if (/[0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add numbers (0-9)');
  }

  // Special characters
  if (/[!@#$%^&*()_+=\-\[\]{};:'",.<>?/\\|`~]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Add special characters (!@#$%^&* etc)');
  }

  // Check length bonus
  if (password.length >= 12) {
    score += 10;
  }
  if (password.length >= 16) {
    score += 5;
  }

  // Check for common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    feedback.push('This password is too common. Please choose a unique password');
    score = 0;
  }

  // Check for sequential characters (111, aaa, abc)
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeating characters');
    score = Math.max(0, score - 10);
  }

  // Check for sequential numbers or letters
  if (/(?:012|123|234|345|456|567|678|789|abc|bcd|cde|def)/.test(password.toLowerCase())) {
    feedback.push('Avoid sequential patterns');
    score = Math.max(0, score - 10);
  }

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score < 20) {
    strength = 'weak';
  } else if (score < 50) {
    strength = 'fair';
  } else if (score < 75) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  const isValid = feedback.length === 0;

  return {
    isValid,
    strength,
    score: Math.min(100, score),
    feedback,
  };
}

/**
 * Check if password meets minimum requirements
 */
export function isPasswordStrong(password: string): boolean {
  const validation = validatePassword(password);
  return validation.isValid && validation.strength !== 'weak';
}

/**
 * Get password strength percentage
 */
export function getPasswordStrengthPercentage(password: string): number {
  return validatePassword(password).score;
}
