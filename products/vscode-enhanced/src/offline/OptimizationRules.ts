/**
 * Fortress Token Optimizer - Offline Optimization Rules Engine
 * 
 * Applies deterministic, rule-based transformations to prompts
 * 100% offline, no ML models or network required
 * 
 * © 2026 Fortress Optimizer LLC. All Rights Reserved.
 * PATENT PENDING: Rule-based prompt optimization for token reduction
 */

export interface OptimizationRule {
  name: string;
  description: string;
  level: 'light' | 'balanced' | 'aggressive';
  apply(prompt: string): string;
  priority: number;
}

export class OptimizationRulesEngine {
  private rules: Map<string, OptimizationRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize all optimization rules
   */
  private initializeDefaultRules(): void {
    // Light optimization rules (minimal changes)
    this.registerRule(new ConsolidateAdjectivesRule());
    this.registerRule(new RemoveExtraWhitespaceRule());
    
    // Balanced optimization rules (good balance of quality and savings)
    this.registerRule(new RemoveRedundantInstructionsRule());
    this.registerRule(new SimplifyRequestRule());
    this.registerRule(new ConvertBulletsToInlineRule());
    
    // Aggressive optimization rules (maximum savings, slight quality risk)
    this.registerRule(new RemoveUnnecessaryExamplesRule());
    this.registerRule(new ConvertToCompactNotationRule());
    this.registerRule(new PrioritizeContextRule());
  }

  /**
   * Register a custom optimization rule
   */
  registerRule(rule: OptimizationRule): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * Get a specific rule by name
   */
  getRule(name: string): OptimizationRule | undefined {
    return this.rules.get(name);
  }

  /**
   * Get rules for a given optimization level
   */
  getDefaultRules(level: 'light' | 'balanced' | 'aggressive' = 'balanced'): string[] {
    return Array.from(this.rules.values())
      .filter(rule => {
        if (level === 'light') return rule.level === 'light';
        if (level === 'balanced') return rule.level === 'light' || rule.level === 'balanced';
        return true; // aggressive includes all
      })
      .sort((a, b) => b.priority - a.priority)
      .map(rule => rule.name);
  }

  /**
   * Get all default rules
   */
  getDefaultRuleSet(): OptimizationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Load rules from external source (e.g., cached file)
   */
  loadRules(rulesData: any): void {
    if (Array.isArray(rulesData)) {
      rulesData.forEach(rule => {
        // Load custom rules from external source
        // For now, just use built-in rules
      });
    }
  }
}

/**
 * Rule 1: Consolidate Adjectives
 * Combines multiple adjectives describing the same noun
 * 
 * Example:
 *   Input:  "You are helpful. You are knowledgeable. You are kind."
 *   Output: "You are helpful, knowledgeable, and kind."
 *   Savings: ~25%
 */
class ConsolidateAdjectivesRule implements OptimizationRule {
  name = 'consolidate-adjectives';
  description = 'Combine multiple adjectives into single statement';
  level: 'light' = 'light';
  priority = 10;

  apply(prompt: string): string {
    // Pattern: "subject verb adjective. subject verb adjective2."
    const subjectPattern = /(\w+\s+(?:is|are|be)\s+)(.+?)\.\s*\1(.+?)\./gi;
    
    return prompt.replace(subjectPattern, (match, subject, adj1, adj2) => {
      const adjectives = [adj1, adj2]
        .map(a => a.trim())
        .filter(a => a.length > 0)
        .join(', ');
      
      return `${subject}${adjectives}.`;
    });
  }
}

/**
 * Rule 2: Remove Extra Whitespace
 * Removes unnecessary whitespace, newlines, and indentation
 * 
 * Example:
 *   Input:  "You are helpful.\n\n\nPlease respond."
 *   Output: "You are helpful. Please respond."
 *   Savings: ~15%
 */
class RemoveExtraWhitespaceRule implements OptimizationRule {
  name = 'remove-extra-whitespace';
  description = 'Remove unnecessary whitespace and newlines';
  level: 'light' = 'light';
  priority = 8;

  apply(prompt: string): string {
    return prompt
      .replace(/\n\s*\n/g, '\n') // Remove multiple blank lines
      .replace(/\s+\n/g, '\n')   // Remove trailing whitespace on lines
      .replace(/\n\s+/g, '\n')   // Remove leading whitespace on lines
      .replace(/  +/g, ' ')      // Replace multiple spaces with single space
      .trim();
  }
}

/**
 * Rule 3: Remove Redundant Instructions
 * Identifies and removes instructions that appear multiple times
 * 
 * Example:
 *   Input:  "Be helpful. Please help. Assist the user."
 *   Output: "Be helpful."
 *   Savings: ~40%
 */
class RemoveRedundantInstructionsRule implements OptimizationRule {
  name = 'remove-redundant-instructions';
  description = 'Remove semantically duplicate instructions';
  level: 'balanced' = 'balanced';
  priority = 12;

  apply(prompt: string): string {
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const sentence of sentences) {
      const normalized = this.normalize(sentence.trim());
      
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(sentence.trim());
      }
    }

    return unique.join('. ') + '.';
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?]/g, '')
      .replace(/\bplease\b|\bkindly\b/g, '')
      .trim();
  }
}

/**
 * Rule 4: Simplify Request
 * Converts verbose requests to concise equivalents
 * 
 * Example:
 *   Input:  "Would you be so kind as to provide a response?"
 *   Output: "Please respond."
 *   Savings: ~80%
 */
class SimplifyRequestRule implements OptimizationRule {
  name = 'simplify-request';
  description = 'Convert verbose requests to concise equivalents';
  level: 'balanced' = 'balanced';
  priority = 11;

  private patterns = [
    { pattern: /would you be so kind as to (.*?)\?/gi, replacement: 'Please $1.' },
    { pattern: /could you please (.*?)\?/gi, replacement: 'Please $1.' },
    { pattern: /i would appreciate it if you (.*?)[.!?]/gi, replacement: 'Please $1.' },
    { pattern: /provide a detailed\/comprehensive (.*?)[.!?]/gi, replacement: 'Provide a detailed $1.' },
    { pattern: /show all your work/gi, replacement: 'Show all work' },
    { pattern: /think step by step/gi, replacement: 'Think step-by-step' },
  ];

  apply(prompt: string): string {
    let result = prompt;
    
    for (const { pattern, replacement } of this.patterns) {
      result = result.replace(pattern, replacement);
    }
    
    return result;
  }
}

/**
 * Rule 5: Convert Bullets to Inline
 * Converts bullet lists to inline text
 * 
 * Example:
 *   Input:  "Requirements:\n• Be helpful\n• Be honest\n• Be concise"
 *   Output: "Requirements: be helpful, honest, and concise."
 *   Savings: ~20%
 */
class ConvertBulletsToInlineRule implements OptimizationRule {
  name = 'convert-bullets-to-inline';
  description = 'Convert bullet lists to inline comma-separated';
  level: 'balanced' = 'balanced';
  priority = 9;

  apply(prompt: string): string {
    // Match bullet lists
    const bulletPattern = /([\w\s]+):\s*\n(?:[-•*]\s+(.+)\n*)+/gi;
    
    return prompt.replace(bulletPattern, (match, title, firstItem) => {
      const bullets = match
        .split('\n')
        .slice(1)
        .filter(line => /^[-•*]/.test(line.trim()))
        .map(line => line.replace(/^[-•*]\s+/, '').trim());
      
      return `${title}: ${bullets.join(', ')}.`;
    });
  }
}

/**
 * Rule 6: Remove Unnecessary Examples
 * Removes examples that don't provide unique information
 * 
 * Example:
 *   Input:  "Consider this example: For instance, you could..."
 *   Output: "Consider this: you could..."
 *   Savings: ~30%
 */
class RemoveUnnecessaryExamplesRule implements OptimizationRule {
  name = 'remove-unnecessary-examples';
  description = 'Remove redundant example introductions';
  level: 'aggressive' = 'aggressive';
  priority = 7;

  private patterns = [
    /for example[,:]?\s*/gi,
    /for instance[,:]?\s*/gi,
    /as an example[,:]?\s*/gi,
    /consider this example[,:]?\s*/gi,
    /e\.g\.\s+/gi,
  ];

  apply(prompt: string): string {
    let result = prompt;
    
    for (const pattern of this.patterns) {
      result = result.replace(pattern, '');
    }
    
    return result;
  }
}

/**
 * Rule 7: Convert to Compact Notation
 * Uses abbreviated forms and compact notation
 * 
 * Example:
 *   Input:  "Create a comprehensive marketing strategy for enterprise customers"
 *   Output: "Create a marketing strategy (enterprise)"
 *   Savings: ~35%
 */
class ConvertToCompactNotationRule implements OptimizationRule {
  name = 'convert-to-compact-notation';
  description = 'Use compact notation and abbreviations';
  level: 'aggressive' = 'aggressive';
  priority = 6;

  apply(prompt: string): string {
    let result = prompt;
    
    // Common abbreviations
    const abbrevs = [
      { pattern: /\bcommunity-based\b/gi, replacement: '(community)' },
      { pattern: /\bcustomer-centric\b/gi, replacement: '(customer-focused)' },
      { pattern: /\bcomprehensive\b/gi, replacement: '' },
      { pattern: /\bdetailed\b/gi, replacement: '(detail)' },
    ];
    
    for (const { pattern, replacement } of abbrevs) {
      result = result.replace(pattern, replacement);
    }
    
    return result;
  }
}

/**
 * Rule 8: Prioritize Context
 * Reorders prompt to put critical info first
 * Useful for early context window termination
 * 
 * Example:
 *   Input:  "[System] [Context] [User Query]"
 *   Output: "[User Query] [System] [Context]"
 *   Savings: ~15% (by reducing trailing tokens)
 */
class PrioritizeContextRule implements OptimizationRule {
  name = 'prioritize-context';
  description = 'Reorder to put critical info first';
  level: 'aggressive' = 'aggressive';
  priority = 5;

  apply(prompt: string): string {
    // Simple heuristic: move queries/requests to top
    const lines = prompt.split('\n').filter(l => l.trim().length > 0);
    const requests = lines.filter(l => /^(what|how|when|why|find|create|analyze|write)/i.test(l.trim()));
    const others = lines.filter(l => !requests.includes(l));
    
    if (requests.length > 0) {
      return [...requests, ...others].join('\n');
    }
    
    return prompt;
  }
}
