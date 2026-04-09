# Archived test files

These files are from an earlier Puppeteer-based browser automation
framework that was abandoned in favor of the Playwright-based qa-system at
[`website/qa-system/`](../../website/qa-system/).

## Why archived (not deleted)

1. **Historical reference.** Some of the assertions and flows here document
   how the early product was tested. Useful when investigating why a test
   exists in the new suite or what it was originally checking.
2. **No CI runner.** Nothing in `.github/workflows/` invokes any of these
   files. They were run manually via `node tests/<filename>.js` (or via
   ad-hoc `npm test` invocations referenced in the file headers, which
   never actually wired up).
3. **Different runtime.** These use `puppeteer` (CommonJS, `require()`),
   not `@playwright/test`. They wouldn't compose with the qa-system
   pytest/playwright pipeline even if you wanted to wire them in.

## What's here

- `actual-installation-usage-tests.js` — beta tool installation flow
- `comprehensive-production-test-suite.js` — broad production smoke
- `comprehensive-tool-testing-suite.js` — per-tool smoke
- `customer-service-tests.js` — support flow
- `fortress-automated-test-suite.js` — overall regression
- `fortress-web-automation-tests.js` — Puppeteer-based browser tests
- `load-test.js` — k6/autocannon style load test
- `simulate-beta-tool-usage.js` — synthetic usage generator

## If you want to reactivate one

Don't move it back to `tests/` directly — the modern equivalent should be
written as a Playwright spec under `website/qa-system/specs/` and added to
[`website/playwright.config.ts`](../../website/playwright.config.ts) as a
new project. Use these files as a reference for the original assertions
but rebuild against the new framework.

The pytest test runner at the repo root explicitly skips this directory
via `norecursedirs` in `pytest.ini`, so these files won't accidentally get
collected as Python tests.
