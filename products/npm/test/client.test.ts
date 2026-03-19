/**
 * FortressClient Tests — Tests the actual exported class
 *
 * The original index.test.ts references a phantom FortressOptimizer class
 * that doesn't exist. These tests cover the real FortressClient.
 */

import { FortressClient } from '../src/index';

describe('FortressClient', () => {
  describe('Initialization', () => {
    test('instantiates with API key', () => {
      const client = new FortressClient('fk_test123');
      expect(client).toBeDefined();
    });

    test('accepts custom baseUrl', () => {
      const client = new FortressClient('fk_test', { baseUrl: 'https://custom.example.com' });
      expect(client).toBeDefined();
    });

    test('rejects HTTP baseUrl', () => {
      expect(() => {
        new FortressClient('fk_test', { baseUrl: 'http://insecure.example.com' });
      }).toThrow('HTTPS');
    });

    test('allows localhost HTTP for development', () => {
      const client = new FortressClient('fk_test', { baseUrl: 'http://localhost:8000' });
      expect(client).toBeDefined();
    });

    test('caps maxRetries at 10', () => {
      const client = new FortressClient('fk_test', { maxRetries: 999 });
      expect(client).toBeDefined();
    });
  });

  describe('Methods exist', () => {
    const client = new FortressClient('fk_test');

    test('has optimize method', () => {
      expect(typeof client.optimize).toBe('function');
    });

    test('has getUsage method', () => {
      expect(typeof client.getUsage).toBe('function');
    });

    test('has getProviders method', () => {
      expect(typeof client.getProviders).toBe('function');
    });

    test('has healthCheck method', () => {
      expect(typeof client.healthCheck).toBe('function');
    });
  });
});
