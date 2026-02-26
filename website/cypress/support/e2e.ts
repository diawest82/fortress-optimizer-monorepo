// Cypress E2E Support File
// This file runs before each test file

import './commands';

// Disable cypress's uncaught exception handler for testing
Cypress.on('uncaught:exception', (err) => {
  // Return false to prevent Cypress from failing the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  // Suppress hydration mismatch errors during development
  if (err.message.includes('Hydration failed')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});

// Configure timeouts
beforeEach(() => {
  // Increase timeout for security operations
  cy.intercept('/api/security/**').as('securityApi');
  cy.intercept('/api/auth/**').as('authApi');
  cy.intercept('/api/password/**').as('passwordApi');
  cy.intercept('/api/mfa/**').as('mfaApi');
});

// Global test setup
export {};
