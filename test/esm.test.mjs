/**
 * ESM smoke test for the dual CJS/ESM entry point (src/index.mjs).
 * Verifies that named and default imports resolve and the API is usable
 * when the package is consumed as an ES module.
 * Run with: node test/esm.test.mjs
 */

import {
  AppVersionChecker,
  SemVer,
  CordovaProvider,
  CapacitorProvider,
  fetchAppStoreVersion,
  fetchPlayStoreVersion,
  fetchCustomEndpoint,
} from '../src/index.mjs';
import defaultExport from '../src/index.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

console.log('\n🔹 ESM entry point');

assert(typeof AppVersionChecker === 'function', 'Named import: AppVersionChecker');
assert(typeof SemVer === 'function', 'Named import: SemVer');
assert(typeof CordovaProvider === 'function', 'Named import: CordovaProvider');
assert(typeof CapacitorProvider === 'function', 'Named import: CapacitorProvider');
assert(typeof fetchAppStoreVersion === 'function', 'Named import: fetchAppStoreVersion');
assert(typeof fetchPlayStoreVersion === 'function', 'Named import: fetchPlayStoreVersion');
assert(typeof fetchCustomEndpoint === 'function', 'Named import: fetchCustomEndpoint');

assert(SemVer.isValid('1.2.3') === true, 'SemVer works through the ESM binding');
assert(
  AppVersionChecker.compareVersions('1.0.0', '2.0.0').updateAvailable === true,
  'AppVersionChecker.compareVersions works through the ESM binding'
);

assert(defaultExport && typeof defaultExport.AppVersionChecker === 'function', 'Default import exposes the namespace');
assert(defaultExport.SemVer === SemVer, 'Default and named exports reference the same objects');

console.log('\n' + '═'.repeat(50));
console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
console.log('═'.repeat(50));

process.exit(failed > 0 ? 1 : 0);
