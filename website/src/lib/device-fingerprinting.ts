// Device Fingerprinting Service
// Creates unique identifiers for devices based on user-agent and browser characteristics

import crypto from 'crypto';

export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  platform: string;
  browserLanguage: string;
  screenResolution: string;
  timezone: string;
  createdAt: Date;
}

export function generateDeviceFingerprint(userAgentHeader: string): string {
  // Combine multiple signals for a fingerprint
  const signal = `${userAgentHeader}-${Date.now()}`;
  return crypto.createHash('sha256').update(signal).digest('hex');
}

export function createFingerprint(
  userAgent: string,
  platform: string,
  language: string,
  screenRes: string,
  timezone: string
): DeviceFingerprint {
  const combined = `${userAgent}${platform}${language}${screenRes}${timezone}`;
  const id = crypto.createHash('sha256').update(combined).digest('hex');

  return {
    id,
    userAgent,
    platform,
    browserLanguage: language,
    screenResolution: screenRes,
    timezone,
    createdAt: new Date(),
  };
}

export function fingerprintsMatch(fp1: DeviceFingerprint, fp2: DeviceFingerprint): boolean {
  // Consider devices the same if most characteristics match
  const matches = [
    fp1.platform === fp2.platform,
    fp1.browserLanguage === fp2.browserLanguage,
    fp1.screenResolution === fp2.screenResolution,
    fp1.timezone === fp2.timezone,
  ];

  const matchCount = matches.filter(Boolean).length;
  return matchCount >= 3; // At least 3/4 must match
}
