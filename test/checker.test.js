/**
 * Tests for the AppVersionChecker orchestration class (src/index.js).
 * Uses fake providers and a mocked global.fetch so no device or network is needed.
 * Exercises provider detection, store routing, and the update/forceUpdate logic.
 * Run with: node test/checker.test.js
 */

const { AppVersionChecker } = require('../src/index');

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
  return () => { global.fetch = original; };
}

/** A minimal stand-in for a platform provider. */
function fakeProvider({ name = 'capacitor', version = '1.0.0', platform = 'ios', available = true } = {}) {
  return {
    name,
    isAvailable: () => available,
    getPlatform: () => platform,
    getVersion: async () => version,
    getAppInfo: async () => ({ versionName: version, versionCode: '1', packageName: 'com.x', appName: 'X' }),
  };
}

/** Build a checker whose detected provider is `provider`, bypassing detection. */
function checkerWith(provider, config = {}) {
  const checker = new AppVersionChecker(config);
  checker._provider = provider;
  return checker;
}

/** Mock a custom-endpoint JSON response. */
function mockEndpoint(json) {
  return mockFetch(async () => ({ ok: true, json: async () => json }));
}

async function main() {
  // ─── Provider detection ────────────────────────────────────────────
  console.log('\n🔹 Provider detection');

  (() => {
    const c = new AppVersionChecker({ platform: 'cordova' });
    c._cordova = { name: 'cordova', isAvailable: () => false };
    c._capacitor = { name: 'capacitor', isAvailable: () => true };
    assert(c.getProvider().name === 'cordova', 'Explicit platform:"cordova" uses the Cordova provider');
  })();

  (() => {
    const c = new AppVersionChecker({ platform: 'capacitor' });
    c._cordova = { name: 'cordova', isAvailable: () => true };
    c._capacitor = { name: 'capacitor', isAvailable: () => false };
    assert(c.getProvider().name === 'capacitor', 'Explicit platform:"capacitor" uses the Capacitor provider');
  })();

  (() => {
    const c = new AppVersionChecker({ platform: 'auto' });
    c._cordova = { name: 'cordova', isAvailable: () => true };
    c._capacitor = { name: 'capacitor', isAvailable: () => true };
    assert(c.getProvider().name === 'capacitor', 'Auto-detect prefers Capacitor when both are available');
  })();

  (() => {
    const c = new AppVersionChecker({ platform: 'auto' });
    c._cordova = { name: 'cordova', isAvailable: () => true };
    c._capacitor = { name: 'capacitor', isAvailable: () => false };
    assert(c.getProvider().name === 'cordova', 'Auto-detect falls back to Cordova when Capacitor is absent');
  })();

  (() => {
    const c = new AppVersionChecker({ platform: 'auto' });
    c._cordova = { name: 'cordova', isAvailable: () => false };
    c._capacitor = { name: 'capacitor', isAvailable: () => false };
    assertThrows(() => c.getProvider(), 'Auto-detect throws when no platform is available');
  })();

  (() => {
    const c = checkerWith(fakeProvider({ name: 'capacitor', platform: 'android' }));
    assert(c.getPlatformName() === 'capacitor', 'getPlatformName() reflects the provider');
    assert(c.getDevicePlatform() === 'android', 'getDevicePlatform() reflects the provider');
  })();

  // ─── getLatestVersion routing ──────────────────────────────────────
  console.log('\n🔹 getLatestVersion routing');

  await (async () => {
    // customEndpoint wins even on a native platform with store IDs set.
    const c = checkerWith(fakeProvider({ platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
      iosBundleId: 'com.example.app',
    });
    const restore = mockEndpoint({ version: '9.9.9' });
    const info = await c.getLatestVersion();
    restore();
    assert(info.version === '9.9.9', 'customEndpoint takes priority over store lookups');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ platform: 'ios' }), {}); // no iosBundleId
    await assertRejects(() => c.getLatestVersion(), 'iOS lookup rejects without iosBundleId');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ platform: 'android' }), {}); // no androidPackageName
    await assertRejects(() => c.getLatestVersion(), 'Android lookup rejects without androidPackageName');
  })();

  await (async () => {
    // Android routes to the Play Store scraper.
    const c = checkerWith(fakeProvider({ platform: 'android' }), { androidPackageName: 'com.example.app' });
    const restore = mockFetch(async () => ({ ok: true, text: async () => 'x [[["3.2.1"]]] y' }));
    const info = await c.getLatestVersion();
    restore();
    assert(info.version === '3.2.1', 'Android routes to the Play Store lookup');
  })();

  await (async () => {
    // iOS routes to the App Store lookup.
    const c = checkerWith(fakeProvider({ platform: 'ios' }), { iosBundleId: 'com.example.app' });
    const restore = mockFetch(async () => ({ ok: true, json: async () => ({ results: [{ version: '4.5.6' }] }) }));
    const info = await c.getLatestVersion();
    restore();
    assert(info.version === '4.5.6', 'iOS routes to the App Store lookup');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ platform: 'web' }), {}); // web with no customEndpoint
    await assertRejects(() => c.getLatestVersion(), 'Unsupported platform (web) rejects without a customEndpoint');
  })();

  // ─── checkForUpdate: comparison ────────────────────────────────────
  console.log('\n🔹 checkForUpdate — comparison');

  await (async () => {
    const c = checkerWith(fakeProvider({ name: 'capacitor', version: '1.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
    });
    const restore = mockEndpoint({ version: '1.1.0', storeUrl: 'https://store', releaseNotes: 'notes' });
    const r = await c.checkForUpdate();
    restore();
    assert(r.currentVersion === '1.0.0' && r.latestVersion === '1.1.0', 'Reports current and latest versions');
    assert(r.updateAvailable === true, 'updateAvailable true when latest > current');
    assert(r.updateType === 'minor', 'Classifies the update type (minor)');
    assert(r.storeUrl === 'https://store' && r.releaseNotes === 'notes', 'Passes through storeUrl and releaseNotes');
    assert(r.platform === 'capacitor' && r.devicePlatform === 'ios', 'Includes platform and devicePlatform');
    assert(r.forceUpdate === false, 'No forced update without a minimum version');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ version: '2.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
    });
    const restore = mockEndpoint({ version: '1.5.0' });
    const r = await c.checkForUpdate();
    restore();
    assert(r.updateAvailable === false, 'updateAvailable false when current is ahead of latest');
    assert(r.updateType === 'none', 'updateType is none when current is ahead');
  })();

  // ─── checkForUpdate: forceUpdate logic ─────────────────────────────
  console.log('\n🔹 checkForUpdate — forceUpdate logic');

  await (async () => {
    const c = checkerWith(fakeProvider({ version: '1.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
    });
    const restore = mockEndpoint({ version: '1.1.0', forceUpdate: true });
    const r = await c.checkForUpdate();
    restore();
    assert(r.forceUpdate === true, 'Remote forceUpdate:true forces an update');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ version: '1.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
    });
    const restore = mockEndpoint({ version: '2.0.0', minVersion: '1.5.0' });
    const r = await c.checkForUpdate();
    restore();
    assert(r.forceUpdate === true, 'Current below remote minVersion forces an update');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ version: '1.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
      minVersion: '1.5.0',
    });
    const restore = mockEndpoint({ version: '2.0.0' }); // no remote minVersion
    const r = await c.checkForUpdate();
    restore();
    assert(r.forceUpdate === true, 'Current below local config minVersion forces an update');
  })();

  await (async () => {
    // Remote minVersion (lenient) overrides the stricter local config minVersion.
    const c = checkerWith(fakeProvider({ version: '1.2.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
      minVersion: '2.0.0',
    });
    const restore = mockEndpoint({ version: '2.5.0', minVersion: '1.0.0' });
    const r = await c.checkForUpdate();
    restore();
    assert(r.forceUpdate === false, 'Remote minVersion overrides the local config minVersion');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ version: '2.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
      minVersion: '1.5.0',
    });
    const restore = mockEndpoint({ version: '2.1.0' });
    const r = await c.checkForUpdate();
    restore();
    assert(r.updateAvailable === true && r.forceUpdate === false, 'Update available but not forced when above the minimum');
  })();

  // ─── getLatestVersion caching ──────────────────────────────────────
  console.log('\n🔹 getLatestVersion caching');

  /** Mock endpoint that counts how many times it was fetched. */
  function countingEndpoint(json) {
    let calls = 0;
    const restore = mockFetch(async () => { calls++; return { ok: true, json: async () => json }; });
    return { restore, calls: () => calls };
  }

  await (async () => {
    const c = checkerWith(fakeProvider({ version: '1.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
      cacheTime: 60000,
    });
    const m = countingEndpoint({ version: '1.1.0' });
    await c.checkForUpdate();
    await c.checkForUpdate();
    m.restore();
    assert(m.calls() === 1, 'Second lookup within cacheTime is served from cache (1 fetch)');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ version: '1.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
      cacheTime: 60000,
    });
    const m = countingEndpoint({ version: '1.1.0' });
    await c.getLatestVersion();
    c.clearCache();
    await c.getLatestVersion();
    m.restore();
    assert(m.calls() === 2, 'clearCache() forces a fresh lookup');
  })();

  await (async () => {
    const c = checkerWith(fakeProvider({ version: '1.0.0', platform: 'ios' }), {
      customEndpoint: 'https://api.example.com/v',
      // cacheTime defaults to 0 → caching disabled
    });
    const m = countingEndpoint({ version: '1.1.0' });
    await c.getLatestVersion();
    await c.getLatestVersion();
    m.restore();
    assert(m.calls() === 2, 'cacheTime 0 disables caching (every lookup hits the network)');
  })();

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log('═'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main();
