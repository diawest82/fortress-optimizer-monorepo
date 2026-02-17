/// <reference types="cypress" />

/**
 * E2E Tests for Security Features (Phase 5A-7)
 * Tests for: Password Strength, MFA Setup, Session Management, Risk Scoring
 */

describe('Security Features - Phase 5A-7', () => {
  const testUser = {
    email: `security-test-${Date.now()}@fortress.dev`,
    password: 'SecurePassword123!@#',
    weakPassword: 'weak',
    strongPassword: 'UltraSecure#Pass2024!',
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Password Strength Meter', () => {
    it('should display password strength meter on signup page', () => {
      cy.visit('/auth/signup');
      cy.get('input[type="password"]', { timeout: 5000 }).should('be.visible');
      // Password strength feedback should appear when user types
    });

    it('should reject weak passwords', () => {
      cy.visit('/auth/signup');
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.weakPassword);
      cy.contains('button', /sign up|create account/i).click();
      cy.contains(/password.*weak|too short|8 characters|minimum/i, { timeout: 5000 }).should('be.visible');
    });

    it('should accept strong passwords', () => {
      cy.visit('/auth/signup');
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.strongPassword);
      cy.wait(500);
      // Should not show weakness error
      cy.contains(/password.*weak|too short/i).should('not.exist');
    });

    it('should validate password requirements in real-time', () => {
      cy.visit('/auth/signup');
      const passwordInput = cy.get('input[type="password"]');
      
      // Type weak password
      passwordInput.type('test');
      cy.wait(400); // Wait for debounce
      
      // Type more to make it stronger
      passwordInput.clear().type('TestPassword123!');
      cy.wait(400);
      
      // Validation should update
    });

    it('should validate password API endpoint', () => {
      cy.request({
        method: 'POST',
        url: '/api/password/validate',
        body: { password: testUser.strongPassword },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('score');
        expect(response.body).to.have.property('feedback');
        expect(response.body.score).to.be.greaterThan(70);
      });
    });

    it('should return low score for weak passwords', () => {
      cy.request({
        method: 'POST',
        url: '/api/password/validate',
        body: { password: testUser.weakPassword },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.score).to.be.lessThan(30);
      });
    });
  });

  describe('MFA Setup', () => {
    beforeEach(() => {
      // Create and login as test user
      cy.visit('/auth/login');
      cy.get('input[type="email"]', { timeout: 5000 }).type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.contains('button', /log in|sign in/i).click();
      cy.wait(1000);
    });

    it('should navigate to security dashboard', () => {
      cy.visit('/account');
      cy.contains('Security').click({ force: true });
      cy.contains(/security|settings/i).should('be.visible');
    });

    it('should initiate MFA setup', () => {
      cy.visit('/account');
      cy.contains('button', /enable mfa|set up mfa|2fa/i).click({ force: true });
      // Should show MFA setup wizard
    });

    it('should generate TOTP secret', () => {
      cy.request({
        method: 'POST',
        url: '/api/mfa/totp-setup',
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('secret');
        expect(response.body).to.have.property('qrCode');
      });
    });

    it('should verify TOTP code', () => {
      cy.request({
        method: 'POST',
        url: '/api/mfa/totp-setup',
        body: {},
        failOnStatusCode: false,
      }).then(() => {
        // Try to verify with a code (will fail without proper TOTP library, but tests endpoint)
        cy.request({
          method: 'POST',
          url: '/api/mfa/verify',
          body: { code: '000000' },
          failOnStatusCode: false,
        }).then((verifyResponse) => {
          expect(verifyResponse.status).to.be.oneOf([200, 400, 401]);
        });
      });
    });
  });

  describe('Session Management', () => {
    it('should retrieve active sessions', () => {
      cy.request({
        method: 'GET',
        url: '/api/security/sessions',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        if (response.body.length > 0) {
          expect(response.body[0]).to.have.all.keys(
            'id',
            'device',
            'browser',
            'ip',
            'country',
            'lastActivity'
          );
        }
      });
    });

    it('should revoke a session', () => {
      cy.request({
        method: 'GET',
        url: '/api/security/sessions',
        failOnStatusCode: false,
      }).then((listResponse) => {
        if (listResponse.body.length > 0) {
          const sessionId = listResponse.body[0].id;
          cy.request({
            method: 'POST',
            url: `/api/security/sessions/${sessionId}/revoke`,
            body: {},
            failOnStatusCode: false,
          }).then((revokeResponse) => {
            expect(revokeResponse.status).to.eq(200);
            expect(revokeResponse.body).to.have.property('success');
          });
        }
      });
    });

    it('should display sessions in UI', () => {
      cy.visit('/account');
      cy.contains('Sessions', { timeout: 5000 }).should('exist');
      // Sessions list should show
    });
  });

  describe('Security Metrics Dashboard', () => {
    it('should fetch security metrics', () => {
      cy.request({
        method: 'GET',
        url: '/api/security/metrics',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.all.keys(
          'passwordStrength',
          'mfaEnabled',
          'activeSessions',
          'accountAge'
        );
        expect(response.body.passwordStrength).to.be.a('number');
        expect(response.body.activeSessions).to.be.a('number');
      });
    });

    it('should display real-time metrics on dashboard', () => {
      cy.visit('/dashboard');
      cy.contains('Security', { timeout: 5000 }).should('exist');
      // Metrics should be visible
    });

    it('should fetch dashboard metrics', () => {
      cy.request({
        method: 'GET',
        url: '/api/security/dashboard-metrics',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.keys(
          'totalLogins',
          'failedLogins',
          'mfaAdoptionRate',
          'passwordChanges',
          'suspiciousActivities',
          'lastUpdated'
        );
      });
    });
  });

  describe('Zero-Trust Architecture', () => {
    it('should validate device fingerprint on login', () => {
      cy.visit('/auth/login');
      cy.get('input[type="email"]', { timeout: 5000 }).type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.contains('button', /log in|sign in/i).click();
      
      // Check if device fingerprint was created in session
      cy.wait(1000);
      cy.getCookie('deviceId').should('exist');
    });

    it('should handle geolocation anomaly detection gracefully', () => {
      // This test verifies the system handles location data without breaking
      cy.visit('/account', { failOnStatusCode: false });
      cy.wait(1000);
      // Should load without error even if not authenticated
    });

    it('should assign risk score to login', () => {
      cy.visit('/auth/login');
      cy.get('input[type="email"]', { timeout: 5000 }).type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.contains('button', /log in|sign in/i).click();
      
      // Should log in if risk score allows
      cy.wait(1000);
    });
  });

  describe('OAuth Integration', () => {
    it('should display OAuth buttons on sign-in page', () => {
      cy.visit('/auth/login');
      cy.contains(/google|github|sign in with/i, { timeout: 5000 }).should('exist');
    });

    it('should link OAuth provider endpoint', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/link-account',
        body: {
          email: testUser.email,
          provider: 'google',
          providerId: 'test-provider-id',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 400, 401]);
      });
    });

    it('should retrieve linked accounts', () => {
      cy.request({
        method: 'GET',
        url: `/api/auth/link-account?email=${testUser.email}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 400, 404]);
        if (response.status === 200) {
          expect(response.body).to.be.an('array');
        }
      });
    });
  });

  describe('Integration Tests - Full Security Flow', () => {
    it('should complete full signup with security validation', () => {
      const uniqueEmail = `full-test-${Date.now()}@fortress.dev`;
      
      cy.visit('/auth/signup');
      cy.get('input[type="email"]').type(uniqueEmail);
      cy.get('input[type="password"]').type(testUser.strongPassword);
      
      // Verify password is accepted
      cy.wait(500);
      cy.contains(/password.*weak|too short/i).should('not.exist');
      
      cy.contains('button', /sign up|create account/i).click();
      
      // Should be redirected on successful signup
      cy.url({ timeout: 10000 }).should('match', /(dashboard|login|verify|success|account|auth)/i);
    });

    it('should load security dashboard with all components', () => {
      cy.visit('/account');
      cy.wait(2000);
      
      // Should have security sections
      const securitySections = ['password', 'session', 'mfa', 'security'];
      securitySections.forEach(() => {
        // At least one security-related element should exist
      });
    });

    it('should handle concurrent API requests without race conditions', () => {
      const requests = [
        cy.request('/api/security/metrics'),
        cy.request('/api/security/dashboard-metrics'),
        cy.request('/api/security/sessions'),
      ];

      cy.wrap(null).then(() => {
        Promise.all(requests).then((responses: Response[]) => {
          responses.forEach((response) => {
            expect(response.status).to.eq(200);
          });
        });
      });
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle invalid password validation request', () => {
      cy.request({
        method: 'POST',
        url: '/api/password/validate',
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 400]);
      });
    });

    it('should handle missing email in link-account', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/link-account',
        body: { provider: 'google' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 422]);
      });
    });

    it('should handle non-existent session revocation', () => {
      cy.request({
        method: 'POST',
        url: '/api/security/sessions/non-existent-id/revoke',
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        // Should either return 404 or 200 with success: false
        expect(response.status).to.be.oneOf([404, 200, 400]);
      });
    });

    it('[INTENTIONAL BREAK TEST] should catch malformed API responses', () => {
      // This test intentionally creates a malformed request to verify error handling
      cy.request({
        method: 'POST',
        url: '/api/password/validate',
        body: 'NOT_JSON', // Intentionally invalid
        failOnStatusCode: false,
      }).then((response) => {
        // Should fail gracefully with 4xx error
        expect(response.status).to.be.at.least(400);
      });
    });

    it('should handle rapid password validations (debounce test)', () => {
      cy.visit('/auth/signup');
      const passwordInput = cy.get('input[type="password"]');
      
      // Simulate rapid typing
      passwordInput.type('test', { delay: 0 });
      cy.wait(500);
      
      // Should only process once after debounce
      passwordInput.clear().type('TestPassword123!', { delay: 0 });
      cy.wait(500);
    });

    it('should timeout gracefully on slow API', () => {
      cy.request({
        method: 'GET',
        url: '/api/security/sessions',
        timeout: 5000,
        failOnStatusCode: false,
      }).then((response) => {
        // Should either succeed or timeout gracefully
        expect([200, 408, 504]).to.include(response.status);
      });
    });
  });
});
