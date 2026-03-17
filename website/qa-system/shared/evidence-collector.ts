import { Page, TestInfo } from '@playwright/test';

export interface Evidence {
  consoleErrors: string[];
  networkErrors: Array<{ url: string; status: number }>;
}

/**
 * Attach console and network listeners to capture errors during test.
 * On failure, automatically attaches screenshot + error logs to test report.
 */
export function collectEvidence(page: Page): Evidence {
  const evidence: Evidence = {
    consoleErrors: [],
    networkErrors: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      evidence.consoleErrors.push(msg.text());
    }
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      evidence.networkErrors.push({
        url: response.url(),
        status,
      });
    }
  });

  return evidence;
}

/**
 * Attach evidence to test report on failure.
 */
export async function attachEvidence(
  page: Page,
  testInfo: TestInfo,
  evidence: Evidence
) {
  if (testInfo.status !== 'passed') {
    // Screenshot
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('failure-screenshot', {
      body: screenshot,
      contentType: 'image/png',
    });

    // Console errors
    if (evidence.consoleErrors.length > 0) {
      await testInfo.attach('console-errors', {
        body: evidence.consoleErrors.join('\n'),
        contentType: 'text/plain',
      });
    }

    // Network errors
    if (evidence.networkErrors.length > 0) {
      await testInfo.attach('network-errors', {
        body: JSON.stringify(evidence.networkErrors, null, 2),
        contentType: 'application/json',
      });
    }
  }
}
