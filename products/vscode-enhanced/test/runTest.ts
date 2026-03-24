/**
 * VS Code Extension Functional Test Runner
 *
 * Downloads VS Code, installs the extension, and runs tests
 * inside a real VS Code instance.
 *
 * Run: npx ts-node test/runTest.ts
 */

const { runTests } = require('@vscode/test-electron');
const path = require('path');

async function main() {
  try {
    // The folder containing the extension (package.json)
    const extensionDevelopmentPath = path.resolve(__dirname, '..');

    // The path to the test suite
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Download VS Code, unzip it, and run the integration tests
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions', // Disable other extensions
        '--disable-gpu',       // CI-friendly
      ],
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
