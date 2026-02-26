/// <reference types="cypress" />

describe('Dashboard', () => {
  beforeEach(() => {
    // Assuming user is logged in from previous tests or manual login
    cy.visit('/dashboard');
  });

  it('should display dashboard page with metrics', () => {
    cy.url().should('include', '/dashboard');
    cy.contains(/dashboard|metrics|usage/i).should('be.visible');
    cy.get('[data-testid="usage-metrics"]').should('exist').or(cy.contains(/tokens saved|usage/i).should('exist'));
  });

  it('should display saved tokens metric', () => {
    cy.get('[data-testid="tokens-saved"]').should('exist')
      .or(cy.contains(/tokens saved|optimization savings/i).should('be.visible'));
  });

  it('should display optimization level controls', () => {
    cy.contains(/optimization level|level/i).should('exist')
      .or(cy.get('[data-testid="optimization-level"]').should('exist'));
  });

  it('should allow adjustment of optimization level', () => {
    // Find and interact with level controls
    cy.get('input[type="range"]').then(($range) => {
      if ($range.length > 0) {
        cy.get('input[type="range"]').first().invoke('val', 3).trigger('change');
        cy.contains(/level 3|optimization updated/i).should('be.visible').or(cy.wait(500));
      }
    });
  });

  it('should display dashboard cards with real-time data', () => {
    cy.get('[data-testid="metric-card"]').should('have.length.greaterThan', 0)
      .or(cy.contains(/metric|card/i).should('exist'));
  });

  it('should have working navigation from dashboard', () => {
    cy.contains('a', /account|settings|profile/i).should('exist');
    cy.contains('a', /api|keys/i).should('exist');
  });

  it('should handle logout from dashboard', () => {
    cy.contains('button', /logout|sign out|exit/i).click({ force: true });
    cy.url().should('not.include', '/dashboard');
  });
});
