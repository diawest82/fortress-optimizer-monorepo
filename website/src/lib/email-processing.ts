/**
 * Email Processing Service
 * Analyzes emails and categorizes them
 * Detects enterprise queries and company size
 */

import { ReceivedEmail } from './email-storage';

export interface EmailAnalysis {
  category: ReceivedEmail['category'];
  isEnterprise: boolean;
  companySize?: number;
  summary: string;
  recommendation: string;
  requiresHuman: boolean;
  confidence: number;
}

/**
 * Detect if email is from an enterprise (company with >999 users)
 * Note: Enterprise threshold is configurable via Settings model
 */
function detectEnterpriseQuery(email: { subject: string; body: string; from?: string }, enterpriseThreshold: number = 999): {
  isEnterprise: boolean;
  companySize?: number;
  signals: string[];
} {
  const content = `${email.subject} ${email.body}`.toLowerCase();
  const signals: string[] = [];
  
  // Enterprise signals
  const enterpriseIndicators = [
    /\b(enterprise|large[- ]scale|corporation|multinational|global|extensive|massive)\b/i,
    /\b(\d{4,})\s*(employees?|users?|team members?|developers?)\b/i,
    /\b(>|greater than|over|more than)\s*\d{3,}.*(?:employees?|users?|team|developers?)\b/i,
    /\b(thousand|10k|100k|million)\b/i,
    /\b(compliance|soc\s*2|iso|hipaa|gdpr)\b/i,
    /\b(custom[- ]?contract|enterprise[- ]?agreement|sla)\b/i,
    /\b(fortune\s*\d+|bloomberg|forbes)\b/i,
  ];
  
  let maxCompanySize = 0;
  let isEnterprise = false;
  
  for (const indicator of enterpriseIndicators) {
    if (indicator.test(content)) {
      signals.push(indicator.toString());
      
      // Extract company size if mentioned
      const sizeMatch = content.match(/\b(>|greater than|over|more than)?\s*(\d+)\s*(?:employees?|users?|team|developers?|employees|seats)\b/i);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[2]);
        if (size > enterpriseThreshold) {
          isEnterprise = true;
          maxCompanySize = Math.max(maxCompanySize, size);
        }
      }
      
      // Check for specific enterprise size indicators
      if (/\b(thousand|10k|100k|million)\b/i.test(content)) {
        isEnterprise = true;
        maxCompanySize = maxCompanySize || 1000;
      }
    }
  }
  
  return {
    isEnterprise,
    companySize: maxCompanySize > enterpriseThreshold ? maxCompanySize : undefined,
    signals,
  };
}

/**
 * Categorize email based on content
 */
function categorizeEmail(email: { subject: string; body: string }): ReceivedEmail['category'] {
  const content = `${email.subject} ${email.body}`.toLowerCase();
  
  // Support patterns
  if (/\b(help|problem|issue|bug|error|broken|not working|crash|fail)\b/i.test(content)) {
    return 'support';
  }
  
  // Sales patterns
  if (/\b(pricing|quote|plan|upgrade|purchase|license|cost|pricing|deal)\b/i.test(content)) {
    return 'sales';
  }
  
  // Enterprise patterns
  if (/\b(enterprise|custom|integration|api|scale|performance|sla)\b/i.test(content)) {
    return 'enterprise';
  }
  
  // Feedback patterns
  if (/\b(feedback|suggestion|feature|request|improve|enhancement|wish)\b/i.test(content)) {
    return 'feedback';
  }
  
  return 'general';
}

/**
 * Determine if email requires human handling
 */
function requiresHumanHandling(analysis: {
  category: ReceivedEmail['category'];
  isEnterprise: boolean;
  content: string;
}): boolean {
  // Enterprise queries always need human
  if (analysis.isEnterprise) return true;
  
  // Complex support issues
  if (analysis.category === 'support' && analysis.content.length > 500) return true;
  
  // Sales inquiries
  if (analysis.category === 'sales') return true;
  
  // Custom requests
  if (/\b(custom|special|specific|unique|unique case)\b/i.test(analysis.content)) return true;
  
  return false;
}

/**
 * Generate AI summary of email
 */
export function generateEmailSummary(email: { subject: string; body: string }): string {
  const words = email.body.split(/\s+/).slice(0, 30).join(' ');
  if (email.body.length > 200) {
    return words + '...';
  }
  return email.body;
}

/**
 * Generate AI recommendation
 */
export function generateRecommendation(analysis: EmailAnalysis): string {
  if (analysis.isEnterprise) {
    return '📌 ENTERPRISE QUERY: Route to sales team for custom proposal and account management.';
  }
  
  switch (analysis.category) {
    case 'support':
      if (analysis.requiresHuman) {
        return '👤 Complex support issue - assign to support specialist for investigation.';
      }
      return '📚 Check FAQ and documentation. Provide self-serve resources if applicable.';
    
    case 'sales':
      return '💼 Sales inquiry - forward to sales team with pricing and plan comparison.';
    
    case 'enterprise':
      return '🏢 Enterprise inquiry - escalate to enterprise sales and success team.';
    
    case 'feedback':
      return '💡 Feedback appreciated - log in product roadmap, thank user for suggestion.';
    
    default:
      return '📧 General inquiry - respond with relevant information and next steps.';
  }
}

/**
 * Analyze received email
 */
export async function analyzeEmail(email: {
  subject: string;
  body: string;
  from?: string;
}, enterpriseThreshold?: number): Promise<EmailAnalysis> {
  // Use default threshold of 999 if not provided
  const threshold = enterpriseThreshold ?? 999;
  
  const enterpriseDetection = detectEnterpriseQuery(email, threshold);
  const category = categorizeEmail(email);
  const summary = generateEmailSummary(email);
  const requiresHuman = requiresHumanHandling({
    category,
    isEnterprise: enterpriseDetection.isEnterprise,
    content: email.body,
  });
  
  const recommendation = generateRecommendation({
    category,
    isEnterprise: enterpriseDetection.isEnterprise,
    companySize: enterpriseDetection.companySize,
    summary,
    recommendation: '', // Will be set below
    requiresHuman,
    confidence: 0.85, // Will be updated below
  });
  
  return {
    category,
    isEnterprise: enterpriseDetection.isEnterprise,
    companySize: enterpriseDetection.companySize,
    summary,
    recommendation,
    requiresHuman,
    confidence: 0.85,
  };
}
