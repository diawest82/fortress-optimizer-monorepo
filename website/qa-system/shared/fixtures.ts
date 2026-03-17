import { test as base } from '@playwright/test';
import { collectEvidence, attachEvidence, type Evidence } from './evidence-collector';

type EvidenceFixture = {
  evidence: Evidence;
};

/**
 * Extended Playwright test with automatic evidence collection.
 * Console errors, network 4xx/5xx, and screenshots are captured
 * and attached to the test report on failure.
 */
export const test = base.extend<EvidenceFixture>({
  evidence: async ({ page }, use, testInfo) => {
    const evidence = collectEvidence(page);
    await use(evidence);
    await attachEvidence(page, testInfo, evidence);
  },
});

export { expect } from '@playwright/test';
