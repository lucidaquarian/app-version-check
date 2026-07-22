/**
 * Tests for the store lookup strategies (src/stores.js).
 * Mocks global.fetch so no real network calls are made.
 * Run with: node test/stores.test.js
 */

const {
  fetchAppStoreVersion,
  fetchPlayStoreVersion,
  fetchCustomEndpoint,
} = require('../src/stores');

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

async function assertRejects(promiseFn, message) {
  try {
    await promiseFn();
    failed++;
    console.error(`  ❌ ${message} (did not reject)`);
  } catch {
    passed++;
    console.log(`  ✅ ${message}`);
  }
}

/** Install a fake global.fetch and return a restore function. */
function mockFetch(impl) {
  const original = global.fetch;
  global.fetch = impl;
  return () => {
    global.fetch = original;
  };
}

async function main() {
  // ─── fetchAppStoreVersion ──────────────────────────────────────────
  console.log('\n🔹 fetchAppStoreVersion');

  await (async () => {
    let capturedUrl = '';
    const restore = mockFetch(async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => ({
          results: [{
            version: '2.3.1',
            releaseNotes: 'Bug fixes',
            trackViewUrl: 'https://apps.apple.com/app/id123',
            currentVersionReleaseDate: '2026-01-01',
            minimumOsVersion: '14.0',
          }],
        }),
      };
    });
    const result = await fetchAppStoreVersion('com.example.app', 'gb');
    restore();
    assert(result.version === '2.3.1', 'Returns version from results[0]');
    assert(result.releaseNotes === 'Bug fixes', 'Maps releaseNotes');
    assert(result.storeUrl === 'https://apps.apple.com/app/id123', 'Maps trackViewUrl to storeUrl');
    assert(result.minimumOsVersion === '14.0', 'Maps minimumOsVersion');
    assert(capturedUrl.includes('bundleId=com.example.app'), 'Sends bundleId in query');
    assert(capturedUrl.includes('country=gb'), 'Sends country in query');
  })();

  await (async () => {
    const restore = mockFetch(async () => ({ ok: true, json: async () => ({ results: [] }) }));
    await assertRejects(() => fetchAppStoreVersion('com.missing.app'), 'Rejects when app not found (empty results)');
    restore();
  })();

  await (async () => {
    const restore = mockFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await assertRejects(() => fetchAppStoreVersion('com.example.app'), 'Rejects on non-ok HTTP status');
    restore();
  })();

  await assertRejects(() => fetchAppStoreVersion(''), 'Rejects when bundleId is missing');

  // ─── fetchPlayStoreVersion ─────────────────────────────────────────
  console.log('\n🔹 fetchPlayStoreVersion');

  await (async () => {
    const restore = mockFetch(async () => ({
      ok: true,
      text: async () => 'noise before [[["3.4.5"]]] noise after',
    }));
    const result = await fetchPlayStoreVersion('com.example.app');
    restore();
    assert(result.version === '3.4.5', 'Extracts version from Play Store HTML');
    assert(result.storeUrl.includes('id=com.example.app'), 'Builds storeUrl with package name');
  })();

  await (async () => {
    const restore = mockFetch(async () => ({ ok: true, text: async () => '<html>no version here</html>' }));
    await assertRejects(() => fetchPlayStoreVersion('com.example.app'), 'Rejects when version cannot be extracted');
    restore();
  })();

  await (async () => {
    const restore = mockFetch(async () => ({ ok: false, status: 404, text: async () => '' }));
    await assertRejects(() => fetchPlayStoreVersion('com.example.app'), 'Rejects on non-ok HTTP status');
    restore();
  })();

  await assertRejects(() => fetchPlayStoreVersion(''), 'Rejects when packageName is missing');

  // ─── fetchCustomEndpoint ───────────────────────────────────────────
  console.log('\n🔹 fetchCustomEndpoint');

  await (async () => {
    let capturedOptions = null;
    const restore = mockFetch(async (url, options) => {
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({
          version: '2.1.0',
          minVersion: '1.5.0',
          releaseNotes: 'Perf improvements',
          storeUrl: 'https://example.com/download',
          forceUpdate: true,
          extraField: 'kept',
        }),
      };
    });
    const result = await fetchCustomEndpoint('https://api.example.com/version', {
      headers: { Authorization: 'Bearer TOKEN' },
    });
    restore();
    assert(result.version === '2.1.0', 'Maps version');
    assert(result.minVersion === '1.5.0', 'Maps minVersion');
    assert(result.forceUpdate === true, 'Maps forceUpdate');
    assert(result.extraField === 'kept', 'Passes through extra fields');
    assert(capturedOptions.headers.Accept === 'application/json', 'Sets Accept header');
    assert(capturedOptions.headers.Authorization === 'Bearer TOKEN', 'Merges caller headers');
  })();

  await (async () => {
    const restore = mockFetch(async () => ({
      ok: true,
      json: async () => ({ version: '1.0.0' }),
    }));
    const result = await fetchCustomEndpoint('https://api.example.com/version');
    restore();
    assert(result.minVersion === null, 'Defaults minVersion to null');
    assert(result.releaseNotes === '', 'Defaults releaseNotes to empty string');
    assert(result.forceUpdate === false, 'Defaults forceUpdate to false');
  })();

  await (async () => {
    const restore = mockFetch(async () => ({ ok: true, json: async () => ({ notVersion: 'x' }) }));
    await assertRejects(() => fetchCustomEndpoint('https://api.example.com/version'), 'Rejects when response has no version field');
    restore();
  })();

  await (async () => {
    const restore = mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await assertRejects(() => fetchCustomEndpoint('https://api.example.com/version'), 'Rejects on non-ok HTTP status');
    restore();
  })();

  await assertRejects(() => fetchCustomEndpoint(''), 'Rejects when url is missing');

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log('═'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main();
