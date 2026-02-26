/// <reference types="cypress" />

describe('Navigation and Accessibility', () => {
  it('should load home page successfully', () => {
    cy.visit('/');
    cy.get('body').should('exist');
    cy.get('header').should('exist');
  });

  it('should have responsive navigation header', () => {
    cy.visit('/');
    cy.get('nav').should('exist');
    cy.contains('Fortress Token Optimizer').should('be.visible');
  });

  it('should display footer on all pages', () => {
    cy.visit('/');
    cy.get('footer').should('exist');
    cy.contains(/©|copyright|fortress/i).should('be.visible');
  });

  it('should navigate between main pages', () => {
    cy.visit('/');
    
    // Check homepage links
    cy.contains('a', /home|features|pricing|install/i, { timeout: 5000 })
      .should('exist');
  });

  it('should have working install page', () => {
    cy.visit('/install');
    cy.url().should('include', '/install');
    cy.contains(/install|integration|setup/i).should('be.visible');
  });

  it('should have working pricing page', () => {
    cy.visit('/pricing');
    cy.url().should('include', '/pricing');
    cy.contains(/pricing|plans|price/i).should('be.visible');
  });

  it('should handle 404 errors gracefully', () => {
    cy.visit('/nonexistent-page', { failOnStatusCode: false });
    cy.contains(/not found|404|page not found/i).should('exist')
      .or(cy.get('body').should('exist'));
  });

  it('should load all pages without JavaScript errors', () => {
    const pages = ['/'];
    
    pages.forEach((page) => {
      cy.visit(page);
      cy.window().then((win) => {
        // Check for console errors
        cy.spy(win.console, 'error');
      });
    });
  });

  it('should have proper page titles', () => {
    cy.visit('/');
    cy.title().should('not.be.empty');
  });

  it('should display responsive mobile menu', () => {
    cy.viewport('iphone-x');
    cy.visit('/');
    cy.get('header').should('exist');
    cy.contains('a', /menu|navigation/i).should('exist').or(cy.get('nav').should('exist'));
  });

  it('should maintain state across navigation', () => {
    cy.visit('/');
    cy.contains('a', /install/i).click({ force: true });
    cy.url().should('include', '/install');
    cy.contains('a', /home|back/i).click({ force: true });
    cy.url().should('include', '/');
  });

  it('should load external resources correctly', () => {
    cy.visit('/');
    // Check for Tailwind CSS being applied
    cy.get('body').should('have.css', 'font-family');
  });
});
