/**
 * VS Code Extension Functional Test Runner
 * Run: node test/runTest.js
 */

const { runTests } = require('@vscode/test-electron');
const path = require('path');

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '..');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    console.log('[vscode-test] Downloading VS Code...');
    console.log('[vscode-test] Extension path:', extensionDevelopmentPath);
    console.log('[vscode-test] Tests path:', extensionTestsPath);

    // Use a specific older VS Code version that works with test-electron
    await runTests({
      version: '1.85.0',
      extensionDevelopmentPath,
      extensionTestsPath,
    });

    console.log('[vscode-test] All tests passed!');
  } catch (err) {
    console.error('[vscode-test] Failed to run tests:', err.message || err);
    console.error('[vscode-test] This likely means the extension failed to activate.');
    console.error('[vscode-test] Check that dist/ has all required modules (panels/, team/, offline/).');
    console.error('[vscode-test] Run "npm run compile" first.');
    process.exit(1);
  }
}

main();
