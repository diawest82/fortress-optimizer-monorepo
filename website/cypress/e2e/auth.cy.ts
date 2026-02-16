/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should display home page with all critical sections', () => {
    cy.get('header').should('exist');
    cy.get('nav').should('exist');
    cy.contains('Fortress Token Optimizer').should('be.visible');
    cy.get('footer').should('exist');
  });

  it('should navigate to signup page', () => {
    cy.contains('a', /sign up|get started|start free/i).click({ force: true });
    cy.url().should('include', '/signup');
    cy.contains('Sign up').should('be.visible');
  });

  it('should show validation errors on empty signup', () => {
    cy.visit('/signup');
    cy.contains('button', /sign up|create account/i).click();
    cy.contains(/email is required|email.*required/i).should('be.visible');
    cy.contains(/password is required|password.*required/i).should('be.visible');
  });

  it('should show validation error for invalid email', () => {
    cy.visit('/signup');
    cy.get('input[type="email"]').type('invalid-email');
    cy.get('input[type="password"]').type('TestPass123!');
    cy.contains('button', /sign up|create account/i).click();
    cy.contains(/invalid.*email|email.*invalid/i).should('be.visible');
  });

  it('should show validation error for weak password', () => {
    cy.visit('/signup');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('weak');
    cy.contains('button', /sign up|create account/i).click();
    cy.contains(/password.*8 characters|weak password|too short/i).should('be.visible');
  });

  it('should successfully create new account', () => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPass123!';

    cy.visit('/signup');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains('button', /sign up|create account/i).click();

    // Should either redirect to dashboard or show success message
    cy.url().should('match', /(dashboard|login|verify|success)/i);
    cy.wait(1000); // Wait for redirect
  });

  it('should prevent duplicate account creation', () => {
    const email = 'duplicate@example.com';
    const password = 'TestPass123!';

    cy.visit('/signup');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains('button', /sign up|create account/i).click();
    cy.wait(2000);

    // Try signing up again with same email
    cy.visit('/signup');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains('button', /sign up|create account/i).click();
    cy.contains(/already exists|already registered|email in use/i).should('be.visible');
  });

  it('should navigate to login page', () => {
    cy.visit('/signup');
    cy.contains('a', /log in|already have an account|sign in/i).click();
    cy.url().should('include', '/login');
    cy.contains(/log in|sign in|login/i).should('be.visible');
  });

  it('should show validation errors on empty login', () => {
    cy.visit('/login');
    cy.contains('button', /log in|sign in|login/i).click();
    cy.contains(/email is required|email.*required/i).should('be.visible');
    cy.contains(/password is required|password.*required/i).should('be.visible');
  });

  it('should show error for non-existent user', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('nonexistent@example.com');
    cy.get('input[type="password"]').type('TestPass123!');
    cy.contains('button', /log in|sign in|login/i).click();
    cy.contains(/invalid credentials|user not found|incorrect/i).should('be.visible');
  });

  it('should show error for wrong password', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('WrongPassword123!');
    cy.contains('button', /log in|sign in|login/i).click();
    cy.contains(/invalid credentials|incorrect password|wrong/i).should('be.visible');
  });

  it('should successfully login with valid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('TestPass123!');
    cy.contains('button', /log in|sign in|login/i).click();

    // Should redirect to dashboard or home
    cy.url().should('not.include', '/login');
    cy.wait(1000); // Wait for navigation
  });

  it('should implement rate limiting on login attempts', () => {
    const email = 'attacker@example.com';
    const password = 'WrongPassword123!';

    cy.visit('/login');

    // Make 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type(password);
      cy.contains('button', /log in|sign in|login/i).click();
      cy.wait(500);
      cy.visit('/login'); // Go back to login form
    }

    // 6th attempt should be rate limited
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains('button', /log in|sign in|login/i).click();
    cy.contains(/too many attempts|rate limit|locked|try again/i).should('be.visible');
  });
});
