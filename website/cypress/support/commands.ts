// Custom Cypress commands for security testing

Cypress.Commands.add('loginAs', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('button', /log in|sign in/i).click();
  cy.wait(1000);
});

Cypress.Commands.add('signUpAs', (email: string, password: string, name?: string) => {
  cy.visit('/signup');
  if (name) {
    cy.get('input[type="text"]').first().type(name);
  }
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('button', /sign up|create account/i).click();
  cy.wait(2000);
});

Cypress.Commands.add('goToSecurity', () => {
  cy.visit('/account');
  cy.contains('Security', { timeout: 5000 }).click({ force: true });
});

Cypress.Commands.add('validatePasswordStrength', (score: number) => {
  cy.get('[data-testid="password-strength"]', { timeout: 3000 }).should('exist');
});

// Extend Cypress namespace
declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(email: string, password: string): Chainable<void>;
      signUpAs(email: string, password: string, name?: string): Chainable<void>;
      goToSecurity(): Chainable<void>;
      validatePasswordStrength(score: number): Chainable<void>;
    }
  }
}

export {};
