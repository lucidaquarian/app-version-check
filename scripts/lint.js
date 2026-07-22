/**
 * Zero-dependency lint: syntax-check every source file with `node --check`.
 *
 * The project intentionally ships with no runtime or dev dependencies, so this
 * stands in for a full linter — it catches parse/syntax errors across src/
 * without requiring anything to be installed. Run with: npm run lint
 */

const { execFileSync } = require('child_process');
const { readdirSync, statSync } = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');

/** Recursively collect all .js files under a directory. */
function collectJsFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectJsFiles(full));
    } else if (full.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const files = collectJsFiles(ROOT);
let failed = 0;

for (const file of files) {
  const rel = path.relative(path.join(__dirname, '..'), file);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`  ✅ ${rel}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${rel}`);
    if (err.stderr) console.error(err.stderr.toString());
  }
}

console.log(`\nChecked ${files.length} file(s), ${failed} with errors.`);
process.exit(failed > 0 ? 1 : 0);
