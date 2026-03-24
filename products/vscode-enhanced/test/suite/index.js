/**
 * Test Suite Entry Point — runs inside VS Code
 */

const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

function run() {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 30000,
  });

  const testsRoot = path.resolve(__dirname, '.');

  return new Promise((resolve, reject) => {
    const files = glob.sync('**/**.test.js', { cwd: testsRoot });
    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

    try {
      mocha.run(failures => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { run };
