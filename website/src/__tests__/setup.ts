// src/__tests__/setup.ts
import '@testing-library/jest-dom';

// Setup environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fortress_test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.STRIPE_SECRET_KEY = 'sk_test_testing';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_testing';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      isPreview: false
    };
  }
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated'
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }: any) => children
}));

// Global test utilities
export const getAuthToken = async (email: string = 'test@example.com') => {
  // Mock implementation - return a test token
  return 'test-token-' + Date.now();
};

export const createTestUser = async (email: string = 'test@example.com') => {
  // Mock implementation
  return {
    id: 'test-user-' + Date.now(),
    email,
    tier: 'free',
    createdAt: new Date()
  };
};

export const cleanupDatabase = async () => {
  // Mock implementation
  return true;
};
