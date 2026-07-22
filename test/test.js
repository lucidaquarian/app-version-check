/**
 * Test suite for app-update-checker
 * Run with: node test/test.js
 */

const { SemVer, AppVersionChecker } = require('../src/index');

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

function assertThrows(fn, message) {
  try {
    fn();
    failed++;
    console.error(`  ❌ ${message} (did not throw)`);
  } catch {
    passed++;
    console.log(`  ✅ ${message}`);
  }
}

// ─── SemVer.parse ────────────────────────────────────────────────────

console.log('\n🔹 SemVer.parse');

(() => {
  const v = SemVer.parse('1.2.3');
  assert(v.major === 1 && v.minor === 2 && v.patch === 3, 'Parses "1.2.3"');
})();

(() => {
  const v = SemVer.parse('v10.20.30');
  assert(v.major === 10 && v.minor === 20 && v.patch === 30, 'Strips leading "v"');
})();

(() => {
  const v = SemVer.parse('2.0.0-beta.1');
  assert(v.major === 2 && v.prerelease === 'beta.1', 'Parses prerelease tag');
})();

(() => {
  const v = SemVer.parse('1.0');
  assert(v.major === 1 && v.minor === 0 && v.patch === 0, 'Handles two-part version');
})();

(() => {
  const v = SemVer.parse('1.0.0-beta-2');
  assert(v.prerelease === 'beta-2', 'Preserves hyphens inside the prerelease tag');
})();

(() => {
  const v = SemVer.parse('1.2.3+build.99');
  assert(v.major === 1 && v.minor === 2 && v.patch === 3, 'Ignores build metadata');
})();

(() => {
  const v = SemVer.parse('  v1.2.3  ');
  assert(v.major === 1 && v.minor === 2 && v.patch === 3, 'Trims surrounding whitespace before stripping "v"');
})();

assertThrows(() => SemVer.parse(''), 'Throws on empty string');
assertThrows(() => SemVer.parse(null), 'Throws on null');
assertThrows(() => SemVer.parse(undefined), 'Throws on undefined');
assertThrows(() => SemVer.parse('abc'), 'Throws on non-numeric string');
assertThrows(() => SemVer.parse('1.x.0'), 'Throws on non-numeric component');

// ─── SemVer.compare ──────────────────────────────────────────────────

console.log('\n🔹 SemVer.compare');

assert(SemVer.compare('1.0.0', '1.0.0') === 0, '1.0.0 == 1.0.0');
assert(SemVer.compare('1.0.0', '2.0.0') === -1, '1.0.0 < 2.0.0');
assert(SemVer.compare('2.0.0', '1.0.0') === 1, '2.0.0 > 1.0.0');
assert(SemVer.compare('1.1.0', '1.0.0') === 1, '1.1.0 > 1.0.0');
assert(SemVer.compare('1.0.1', '1.0.0') === 1, '1.0.1 > 1.0.0');
assert(SemVer.compare('1.0.0-alpha', '1.0.0') === -1, '1.0.0-alpha < 1.0.0');
assert(SemVer.compare('1.0.0', '1.0.0-alpha') === 1, '1.0.0 > 1.0.0-alpha');
assert(SemVer.compare('1.0.0-alpha', '1.0.0-beta') === -1, 'alpha < beta');
assert(SemVer.compare('1.0.0-alpha.2', '1.0.0-alpha.10') === -1, 'alpha.2 < alpha.10 (numeric identifiers)');
assert(SemVer.compare('1.0.0-alpha.10', '1.0.0-alpha.2') === 1, 'alpha.10 > alpha.2 (numeric identifiers)');
assert(SemVer.compare('1.0.0-alpha', '1.0.0-alpha.1') === -1, 'fewer identifiers < more identifiers');
assert(SemVer.compare('1.0.0-alpha.1', '1.0.0-beta') === -1, 'numeric identifier ranks below alphanumeric');
assert(SemVer.compare('1.0.0-beta.2', '1.0.0-beta.2') === 0, 'identical prereleases are equal');

// ─── SemVer helpers ──────────────────────────────────────────────────

console.log('\n🔹 SemVer comparison helpers');

assert(SemVer.gt('2.0.0', '1.0.0') === true, 'gt: 2.0.0 > 1.0.0');
assert(SemVer.gt('1.0.0', '2.0.0') === false, 'gt: 1.0.0 !> 2.0.0');
assert(SemVer.lt('1.0.0', '2.0.0') === true, 'lt: 1.0.0 < 2.0.0');
assert(SemVer.eq('1.0.0', '1.0.0') === true, 'eq: 1.0.0 == 1.0.0');
assert(SemVer.gte('1.0.0', '1.0.0') === true, 'gte: 1.0.0 >= 1.0.0');
assert(SemVer.gte('2.0.0', '1.0.0') === true, 'gte: 2.0.0 >= 1.0.0');
assert(SemVer.lte('1.0.0', '1.0.0') === true, 'lte: 1.0.0 <= 1.0.0');
assert(SemVer.lte('1.0.0', '2.0.0') === true, 'lte: 1.0.0 <= 2.0.0');

// ─── SemVer.updateType ──────────────────────────────────────────────

console.log('\n🔹 SemVer.updateType');

assert(SemVer.updateType('1.0.0', '2.0.0') === 'major', 'Detects major update');
assert(SemVer.updateType('1.0.0', '1.1.0') === 'minor', 'Detects minor update');
assert(SemVer.updateType('1.0.0', '1.0.1') === 'patch', 'Detects patch update');
assert(SemVer.updateType('1.0.0', '1.0.0') === 'none', 'No update if equal');
assert(SemVer.updateType('2.0.0', '1.0.0') === 'none', 'No update if ahead');

// ─── SemVer.isValid ─────────────────────────────────────────────────

console.log('\n🔹 SemVer.isValid');

assert(SemVer.isValid('1.2.3') === true, '"1.2.3" is valid');
assert(SemVer.isValid('v1.0.0') === true, '"v1.0.0" is valid');
assert(SemVer.isValid('1.0.0-beta.1') === true, '"1.0.0-beta.1" is valid');
assert(SemVer.isValid('') === false, 'Empty string is invalid');
assert(SemVer.isValid(null) === false, 'null is invalid');
assert(SemVer.isValid('abc') === false, '"abc" is invalid (not silently 0.0.0)');
assert(SemVer.isValid('1.2.hello') === false, '"1.2.hello" is invalid');

// ─── AppVersionChecker.compareVersions (static) ─────────────────────

console.log('\n🔹 AppVersionChecker.compareVersions (static)');

(() => {
  const result = AppVersionChecker.compareVersions('1.0.0', '2.0.0');
  assert(result.updateAvailable === true, 'Update available: 1.0.0 → 2.0.0');
  assert(result.updateType === 'major', 'Correct update type: major');
})();

(() => {
  const result = AppVersionChecker.compareVersions('2.0.0', '2.0.0');
  assert(result.updateAvailable === false, 'No update: same version');
  assert(result.updateType === 'none', 'Update type is none');
})();

(() => {
  const result = AppVersionChecker.compareVersions('3.0.0', '2.0.0');
  assert(result.updateAvailable === false, 'No update: ahead of latest');
})();

(() => {
  const result = AppVersionChecker.compareVersions('1.2.3', '1.2.4');
  assert(result.updateAvailable === true && result.updateType === 'patch', 'Patch update detected');
})();

(() => {
  const result = AppVersionChecker.compareVersions('1.2.3', '1.3.0');
  assert(result.updateAvailable === true && result.updateType === 'minor', 'Minor update detected');
})();

// ─── Summary ─────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(50));
console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
console.log('═'.repeat(50));

process.exit(failed > 0 ? 1 : 0);
