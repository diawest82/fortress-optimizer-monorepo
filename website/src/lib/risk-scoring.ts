// Rules-Based Risk Scoring
// Calculates risk score based on multiple security signals

export interface RiskFactors {
  unknownDevice: boolean;
  anomalousLocation: boolean;
  unusualTime: boolean;
  failedAttempts: number;
  newIPAddress: boolean;
  suspiciousUserAgent: boolean;
}

export interface RiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendedAction: 'allow' | 'mfa_challenge' | 'block';
}

const RISK_WEIGHTS = {
  unknownDevice: 25,
  anomalousLocation: 30,
  unusualTime: 15,
  failedAttempts: 10, // Per attempt
  newIPAddress: 20,
  suspiciousUserAgent: 15,
};

const SUSPICIOUS_USER_AGENTS = [
  'curl',
  'wget',
  'python-requests',
  'java',
  'postman',
];

export function isSuspiciousUserAgent(userAgent: string): boolean {
  const lowerUA = userAgent.toLowerCase();
  return SUSPICIOUS_USER_AGENTS.some(ua => lowerUA.includes(ua));
}

export function isUnusualTime(hour: number): boolean {
  // Flag logins between 2 AM and 5 AM as unusual
  return hour >= 2 && hour <= 5;
}

export function calculateRiskScore(factors: RiskFactors): RiskScore {
  let score = 0;
  const activeFactors: string[] = [];

  if (factors.unknownDevice) {
    score += RISK_WEIGHTS.unknownDevice;
    activeFactors.push('Unknown device');
  }

  if (factors.anomalousLocation) {
    score += RISK_WEIGHTS.anomalousLocation;
    activeFactors.push('Anomalous location');
  }

  if (factors.unusualTime) {
    score += RISK_WEIGHTS.unusualTime;
    activeFactors.push('Unusual login time');
  }

  if (factors.newIPAddress) {
    score += RISK_WEIGHTS.newIPAddress;
    activeFactors.push('New IP address');
  }

  if (factors.suspiciousUserAgent) {
    score += RISK_WEIGHTS.suspiciousUserAgent;
    activeFactors.push('Suspicious user agent');
  }

  // Add points for failed attempts
  score += Math.min(factors.failedAttempts * RISK_WEIGHTS.failedAttempts, 40);
  if (factors.failedAttempts > 0) {
    activeFactors.push(`${factors.failedAttempts} failed attempt${factors.failedAttempts > 1 ? 's' : ''}`);
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine risk level
  let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (score >= 70) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 30) level = 'medium';

  // Determine recommended action
  let recommendedAction: 'allow' | 'mfa_challenge' | 'block' = 'allow';
  if (level === 'critical') recommendedAction = 'block';
  else if (level === 'high') recommendedAction = 'mfa_challenge';

  return {
    score,
    level,
    factors: activeFactors,
    recommendedAction,
  };
}
