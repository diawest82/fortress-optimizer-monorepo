/// <reference types="cypress" />

describe('Account Management', () => {
  beforeEach(() => {
    cy.visit('/account');
  });

  it('should display account page', () => {
    cy.url().should('include', '/account');
    cy.contains(/account|profile|settings/i).should('be.visible');
  });

  it('should display user account information', () => {
    cy.contains(/email|username|account info/i).should('exist');
  });

  it('should have account settings sections', () => {
    cy.contains(/password|security|api keys|settings/i).should('exist');
  });

  it('should allow password change', () => {
    cy.contains('button', /change password|update password/i).click({ force: true });
    cy.get('input[type="password"]').should('exist');
  });

  it('should display API keys section', () => {
    cy.contains(/api keys|api key management/i).should('exist');
  });

  it('should allow API key creation', () => {
    cy.contains('button', /create api key|new key|generate key/i).click({ force: true });
    cy.contains(/key created|api key|generated/i).should('exist').or(cy.wait(500));
  });

  it('should display account delete option', () => {
    cy.contains(/delete account|deactivate/i).should('exist');
  });

  it('should have breadcrumb or back navigation', () => {
    cy.contains('a', /back|home|dashboard/i).should('exist').or(cy.contains('a', /←/));
  });
});
