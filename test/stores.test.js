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
    await assertRejects(() => fetchAppStoreVersion('com.example.app', 'us', { retries: 0 }), 'Rejects on non-ok HTTP status');
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
    const restore = mockFetch(async () => ({ ok: true, text: async () => 'blah "version":"7.8.9" blah' }));
    const result = await fetchPlayStoreVersion('com.example.app');
    restore();
    assert(result.version === '7.8.9', 'Falls back to alternate version pattern');
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
    // Falsy fields in the payload must not defeat the normalized defaults.
    const restore = mockFetch(async () => ({
      ok: true,
      json: async () => ({ version: '1.0.0', releaseNotes: null, minVersion: '' }),
    }));
    const result = await fetchCustomEndpoint('https://api.example.com/version');
    restore();
    assert(result.releaseNotes === '', 'Normalizes null releaseNotes to empty string');
    assert(result.minVersion === null, 'Normalizes empty minVersion to null');
  })();

  await (async () => {
    const restore = mockFetch(async () => ({ ok: true, json: async () => ({ notVersion: 'x' }) }));
    await assertRejects(() => fetchCustomEndpoint('https://api.example.com/version'), 'Rejects when response has no version field');
    restore();
  })();

  await (async () => {
    const restore = mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await assertRejects(() => fetchCustomEndpoint('https://api.example.com/version', {}, { retries: 0 }), 'Rejects on non-ok HTTP status');
    restore();
  })();

  await assertRejects(() => fetchCustomEndpoint(''), 'Rejects when url is missing');

  // ─── Request timeout ───────────────────────────────────────────────
  console.log('\n🔹 Request timeout');

  await (async () => {
    // A fetch that never resolves on its own must be aborted by the timeout.
    const restore = mockFetch((url, options) => new Promise((_resolve, reject) => {
      const signal = options && options.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }
    }));
    let timedOut = false;
    try {
      await fetchCustomEndpoint('https://api.example.com/version', {}, { timeout: 20, retries: 0 });
    } catch (err) {
      timedOut = /timed out/.test(err.message);
    }
    restore();
    assert(timedOut, 'Aborts and reports a timeout when the request hangs');
  })();

  // ─── Retry on transient failures ───────────────────────────────────
  console.log('\n🔹 Retry on transient failures');

  await (async () => {
    // Two 503s then a success — should retry and resolve.
    let calls = 0;
    const restore = mockFetch(async () => {
      calls++;
      if (calls <= 2) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, json: async () => ({ version: '1.2.3' }) };
    });
    const result = await fetchCustomEndpoint('https://api.example.com/version', {}, { retries: 2, backoff: 0 });
    restore();
    assert(result.version === '1.2.3', 'Retries on 5xx and eventually succeeds');
    assert(calls === 3, 'Made exactly 3 attempts (1 + 2 retries)');
  })();

  await (async () => {
    // Network error then success — should retry.
    let calls = 0;
    const restore = mockFetch(async () => {
      calls++;
      if (calls === 1) throw new TypeError('network down');
      return { ok: true, json: async () => ({ version: '9.0.0' }) };
    });
    const result = await fetchCustomEndpoint('https://api.example.com/version', {}, { retries: 2, backoff: 0 });
    restore();
    assert(result.version === '9.0.0', 'Retries on a thrown network error and succeeds');
    assert(calls === 2, 'Stopped retrying once it succeeded');
  })();

  await (async () => {
    // Always 503 — should give up after the configured retries.
    let calls = 0;
    const restore = mockFetch(async () => { calls++; return { ok: false, status: 503, json: async () => ({}) }; });
    await assertRejects(
      () => fetchCustomEndpoint('https://api.example.com/version', {}, { retries: 2, backoff: 0 }),
      'Gives up after exhausting retries on persistent 5xx'
    );
    restore();
    assert(calls === 3, 'Attempted 3 times before giving up');
  })();

  await (async () => {
    // 404 is not retryable — should fail immediately, no extra attempts.
    let calls = 0;
    const restore = mockFetch(async () => { calls++; return { ok: false, status: 404, json: async () => ({}) }; });
    await assertRejects(
      () => fetchCustomEndpoint('https://api.example.com/version', {}, { retries: 3, backoff: 0 }),
      'Does not retry a non-retryable 4xx'
    );
    restore();
    assert(calls === 1, 'Made only one attempt for a 404');
  })();

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log('═'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main();
