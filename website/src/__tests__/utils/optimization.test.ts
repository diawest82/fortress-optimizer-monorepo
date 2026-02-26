/**
 * Example unit test for utility functions
 * Run: npm run test:unit
 */

// Example utility function to test
const calculateSavings = (tokens: number, savingsRate: number): number => {
  return tokens * savingsRate;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const calculateTokenOptimization = (originalTokens: number, channel: string): number => {
  const savings = {
    slack: 0.15,
    'github-copilot': 0.20,
    'vs-code': 0.18,
    'claude-desktop': 0.25,
  };
  
  const rate = savings[channel as keyof typeof savings] || 0.15;
  return originalTokens * (1 - rate);
};

describe('Token Optimization Utilities', () => {
  describe('calculateSavings', () => {
    it('should calculate savings correctly', () => {
      const result = calculateSavings(1000, 0.2);
      expect(result).toBe(200);
    });

    it('should handle zero tokens', () => {
      const result = calculateSavings(0, 0.2);
      expect(result).toBe(0);
    });

    it('should handle zero savings rate', () => {
      const result = calculateSavings(1000, 0);
      expect(result).toBe(0);
    });

    it('should handle maximum savings (100%)', () => {
      const result = calculateSavings(1000, 1.0);
      expect(result).toBe(1000);
    });

    it('should handle decimal token counts', () => {
      const result = calculateSavings(1234.56, 0.15);
      expect(result).toBeCloseTo(185.184, 2);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      const result = formatCurrency(1000);
      expect(result).toBe('$1,000.00');
    });

    it('should handle fractional amounts', () => {
      const result = formatCurrency(1234.567);
      expect(result).toBe('$1,234.57');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toBe('$0.00');
    });
  });

  describe('calculateTokenOptimization', () => {
    it('should calculate Slack channel optimization', () => {
      const result = calculateTokenOptimization(1000, 'slack');
      expect(result).toBe(850); // 15% savings
    });

    it('should calculate GitHub Copilot optimization', () => {
      const result = calculateTokenOptimization(1000, 'github-copilot');
      expect(result).toBe(800); // 20% savings
    });

    it('should calculate VS Code optimization', () => {
      const result = calculateTokenOptimization(1000, 'vs-code');
      expect(result).toBeCloseTo(820, 2); // 18% savings
    });

    it('should calculate Claude Desktop optimization', () => {
      const result = calculateTokenOptimization(1000, 'claude-desktop');
      expect(result).toBe(750); // 25% savings
    });

    it('should default to 15% savings for unknown channel', () => {
      const result = calculateTokenOptimization(1000, 'unknown');
      expect(result).toBe(850); // 15% default
    });

    it('should handle large token counts', () => {
      const result = calculateTokenOptimization(1000000, 'github-copilot');
      expect(result).toBe(800000); // 20% of 1M = 200k savings
    });
  });
});
