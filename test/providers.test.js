/**
 * Tests for the platform providers (src/providers/*).
 * Mocks the global `window` / `document` objects that the providers read,
 * so the browser-oriented code can be exercised under Node.
 * Run with: node test/providers.test.js
 */

const CordovaProvider = require('../src/providers/cordova');
const CapacitorProvider = require('../src/providers/capacitor');

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

/** Remove the globals a test installed, restoring a clean Node environment. */
function clearGlobals() {
  delete global.window;
  delete global.document;
  delete global.device;
}

async function main() {
  // ─── CordovaProvider ───────────────────────────────────────────────
  console.log('\n🔹 CordovaProvider');

  (() => {
    clearGlobals();
    const p = new CordovaProvider();
    assert(p.name === 'cordova', 'Has name "cordova"');
    assert(p.isAvailable() === false, 'isAvailable() is false without window.cordova');
    assert(p.getPlatform() === 'unknown', 'getPlatform() is "unknown" when unavailable');
  })();

  await (async () => {
    clearGlobals();
    await assertRejects(() => new CordovaProvider().getAppInfo(), 'getAppInfo() rejects when Cordova is unavailable');
  })();

  await (async () => {
    // Simulate a Cordova runtime with cordova-plugin-app-version installed.
    global.document = { readyState: 'complete', addEventListener() {} };
    global.window = {
      cordova: {
        platformId: 'ios',
        plugins: {},
        getAppVersion: {
          getVersionNumber: (success) => success('1.2.3'),
          getVersionCode: (success) => success(42),
          getPackageName: (success) => success('com.example.app'),
          getAppName: (success) => success('Example'),
        },
      },
    };
    const p = new CordovaProvider();
    assert(p.isAvailable() === true, 'isAvailable() is true with window.cordova');
    assert(p.getPlatform() === 'ios', 'getPlatform() reads cordova.platformId');
    const info = await p.getAppInfo();
    assert(info.versionName === '1.2.3', 'getAppInfo() maps versionName');
    assert(info.versionCode === 42, 'getAppInfo() maps versionCode');
    assert(info.packageName === 'com.example.app', 'getAppInfo() maps packageName');
    assert(info.appName === 'Example', 'getAppInfo() maps appName');
    assert((await p.getVersion()) === '1.2.3', 'getVersion() returns the version string');
    assert((await p.getBuildNumber()) === 42, 'getBuildNumber() returns the version code');
    clearGlobals();
  })();

  await (async () => {
    // Cordova present, but the app-version plugin is missing.
    global.document = { readyState: 'complete', addEventListener() {} };
    global.window = { cordova: { platformId: 'android', plugins: {} } };
    await assertRejects(() => new CordovaProvider().getAppInfo(), 'getAppInfo() rejects when cordova-plugin-app-version is missing');
    clearGlobals();
  })();

  // ─── CapacitorProvider ─────────────────────────────────────────────
  console.log('\n🔹 CapacitorProvider');

  (() => {
    clearGlobals();
    const p = new CapacitorProvider();
    assert(p.name === 'capacitor', 'Has name "capacitor"');
    assert(p.isAvailable() === false, 'isAvailable() is false without window.Capacitor');
    assert(p.isNative() === false, 'isNative() is false when unavailable');
    assert(p.getPlatform() === 'unknown', 'getPlatform() is "unknown" when unavailable');
  })();

  await (async () => {
    clearGlobals();
    await assertRejects(() => new CapacitorProvider().getAppInfo(), 'getAppInfo() rejects when Capacitor is unavailable');
  })();

  await (async () => {
    // Simulate a native Capacitor runtime. The dynamic import('@capacitor/app')
    // fails (not installed), so the provider falls back to Capacitor.Plugins.App.
    global.window = {
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        Plugins: {
          App: {
            getInfo: async () => ({
              version: '4.5.6',
              build: '99',
              id: 'com.example.cap',
              name: 'CapApp',
            }),
          },
        },
      },
    };
    const p = new CapacitorProvider();
    assert(p.isAvailable() === true, 'isAvailable() is true with window.Capacitor');
    assert(p.isNative() === true, 'isNative() reflects isNativePlatform()');
    assert(p.getPlatform() === 'android', 'getPlatform() reads Capacitor.getPlatform()');
    const info = await p.getAppInfo();
    assert(info.versionName === '4.5.6', 'getAppInfo() maps version → versionName');
    assert(info.versionCode === '99', 'getAppInfo() maps build → versionCode');
    assert(info.packageName === 'com.example.cap', 'getAppInfo() maps id → packageName');
    assert(info.appName === 'CapApp', 'getAppInfo() maps name → appName');
    assert((await p.getVersion()) === '4.5.6', 'getVersion() returns the version string');
    assert((await p.getBuildNumber()) === '99', 'getBuildNumber() returns the build');
    clearGlobals();
  })();

  await (async () => {
    // Device plugin is optional — getDeviceInfo() resolves to null when absent.
    global.window = {
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'ios',
        Plugins: {},
      },
    };
    const info = await new CapacitorProvider().getDeviceInfo();
    assert(info === null, 'getDeviceInfo() returns null when Device plugin is absent');
    clearGlobals();
  })();

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log('═'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main();
