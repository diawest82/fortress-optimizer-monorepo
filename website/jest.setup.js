require('@testing-library/jest-dom');

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Clear mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
