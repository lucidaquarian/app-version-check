# @lucidaquarian/app-version-checker

[![npm version](https://img.shields.io/npm/v/@lucidaquarian/app-version-checker.svg)](https://www.npmjs.com/package/@lucidaquarian/app-version-checker)
[![downloads](https://img.shields.io/npm/dm/@lucidaquarian/app-version-checker.svg)](https://www.npmjs.com/package/@lucidaquarian/app-version-checker)
[![license](https://img.shields.io/npm/l/@lucidaquarian/app-version-checker.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@lucidaquarian/app-version-checker.svg)](https://nodejs.org)

> Detect when your **Cordova** or **Capacitor** app is out of date and prompt users to update.

`@lucidaquarian/app-version-checker` reads the version installed on the device, compares it against the latest published version — from the **Apple App Store**, **Google Play**, or **your own API** — and hands back a single, actionable result: is an update available, what kind (major / minor / patch), and should it be forced?

```js
const result = await checker.checkForUpdate();
// {
//   currentVersion: '1.2.0',
//   latestVersion:  '1.3.1',
//   updateAvailable: true,
//   updateType: 'minor',
//   forceUpdate: false,
//   storeUrl: 'https://apps.apple.com/…',
//   releaseNotes: 'Bug fixes and improvements',
//   platform: 'capacitor',
//   devicePlatform: 'ios'
// }
```

## Why

Mobile users routinely run months-old builds. Shipping a fix doesn't help anyone still on the old version. This library gives you the one signal you need at launch — *"is this device behind, and by how much?"* — so you can show an optional nudge or a hard "update required" gate.

## Features

- **Dual platform** — works with both Cordova (`cordova-plugin-app-version`) and Capacitor (`@capacitor/app`)
- **Auto-detection** — picks the right platform at runtime, or set it explicitly
- **Multiple version sources** — Apple App Store (iTunes Lookup API), Google Play, or a custom endpoint
- **Forced updates** — define a minimum supported version locally or from your server
- **Semantic versioning** — built-in, spec-compliant semver parser and comparator (including prerelease ordering)
- **Network timeouts** — every remote lookup is bounded so a check can never hang
- **TypeScript ready** — ships with full `.d.ts` declarations
- **Zero runtime dependencies**

## Installation

```bash
npm install @lucidaquarian/app-version-checker
```

### Platform prerequisites

**Cordova:**
```bash
cordova plugin add cordova-plugin-app-version
```

**Capacitor:**
```bash
npm install @capacitor/app
npx cap sync
```

> Requires **Node.js ≥ 18** (the store lookups use the global `fetch` API).

## Quick start

```js
import { AppVersionChecker } from '@lucidaquarian/app-version-checker';

const checker = new AppVersionChecker({
  platform: 'auto',                            // 'cordova' | 'capacitor' | 'auto'
  iosBundleId: 'com.yourcompany.yourapp',
  androidPackageName: 'com.yourcompany.yourapp',
});

const result = await checker.checkForUpdate();

if (result.forceUpdate) {
  // Block the user — they must update to continue
} else if (result.updateAvailable) {
  // Show an optional "update available" prompt
}
```

## How it works

1. **Detect the platform** — Capacitor is preferred when both are present; override with `platform`.
2. **Read the installed version** from the native plugin.
3. **Fetch the latest version**, chosen by device platform:
   - `ios` → Apple App Store (needs `iosBundleId`)
   - `android` → Google Play (needs `androidPackageName`)
   - any platform → your `customEndpoint`, if configured (takes priority over the stores)
4. **Compare** the two with the built-in semver engine and return the result.

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `platform` | `'cordova' \| 'capacitor' \| 'auto'` | `'auto'` | Which platform provider to use |
| `iosBundleId` | `string` | `''` | iOS bundle ID for App Store lookups |
| `androidPackageName` | `string` | `''` | Android package name for Play Store lookups |
| `country` | `string` | `'us'` | Two-letter country code for the App Store region |
| `customEndpoint` | `string` | `''` | URL to your own version API (skips store lookups) |
| `customEndpointOptions` | `RequestInit` | `{}` | Extra `fetch` options for the custom endpoint |
| `minVersion` | `string` | `''` | Local minimum supported version for forced updates |
| `timeout` | `number` | `10000` | Network timeout (ms) for store / custom-endpoint requests |
| `retries` | `number` | `2` | Extra attempts after the first on transient failures (429/5xx/network errors) |
| `retryDelay` | `number` | `300` | Base backoff (ms) between retries; grows exponentially |
| `cacheTime` | `number` | `0` | Cache the remote lookup in memory for this many ms; `0` disables caching |

### Caching & retries

Transient failures (HTTP 429/5xx or network errors) are retried automatically with exponential backoff — non-retryable responses like `404` fail fast. If you call `checkForUpdate()` on every app launch, set `cacheTime` (e.g. `21600000` for 6h) so repeated checks reuse the last remote result instead of hitting the store each time. Call `checker.clearCache()` to force a fresh lookup.

## Result shape

`checkForUpdate()` resolves to:

```ts
{
  currentVersion: string;    // installed version, e.g. "1.2.0"
  latestVersion: string;     // latest available, e.g. "1.3.1"
  updateAvailable: boolean;  // true if latest > current
  updateType: 'major' | 'minor' | 'patch' | 'prerelease' | 'none';
  forceUpdate: boolean;      // true if current is below the minimum supported version
  storeUrl: string;          // link to the store listing (if available)
  releaseNotes: string;      // release notes (if available)
  platform: string;          // 'cordova' | 'capacitor'
  devicePlatform: string;    // 'ios' | 'android' | 'web'
}
```

### Forced updates

An update is marked `forceUpdate: true` when the installed version is below the effective minimum. The minimum is resolved as **remote `minVersion` (from your custom endpoint) → local `minVersion` config**, and a remote `forceUpdate: true` flag also forces it.

## API reference

### `new AppVersionChecker(config?)`
Create a checker instance. See [Configuration](#configuration).

### `checker.checkForUpdate(): Promise<VersionCheckResult>`
Run a full check — reads the installed version and the latest remote version, compares them, and returns the [result](#result-shape).

### `checker.getCurrentVersion(): Promise<string>`
The installed version string.

### `checker.getAppInfo(): Promise<AppInfo>`
Full app info: `{ versionName, versionCode, packageName, appName }`.

### `checker.getLatestVersion(): Promise<object>`
Just the remote version info from the store or custom endpoint.

### `checker.getDevicePlatform(): string`
The current OS platform — `'ios'`, `'android'`, or `'web'`.

### `AppVersionChecker.compareVersions(current, latest)` *(static)*
Compare two version strings without any device dependency:

```js
AppVersionChecker.compareVersions('1.0.0', '2.0.0');
// { updateAvailable: true, updateType: 'major' }
```

### `SemVer`

Standalone, spec-compliant semver utilities:

```js
import { SemVer } from '@lucidaquarian/app-version-checker';

SemVer.parse('1.2.3');                 // { major: 1, minor: 2, patch: 3, prerelease: '' }
SemVer.compare('1.0.0', '2.0.0');      // -1
SemVer.gt('2.0.0', '1.0.0');           // true
SemVer.lt('1.0.0', '2.0.0');           // true
SemVer.eq('1.0.0', '1.0.0');           // true
SemVer.gte('1.0.0', '1.0.0');          // true
SemVer.updateType('1.0.0', '2.0.0');   // 'major'
SemVer.isValid('1.2.3');               // true
SemVer.isValid('not-a-version');       // false
```

Prerelease identifiers are compared per the SemVer spec (numeric identifiers compared numerically, ranked below alphanumeric), so `1.0.0-alpha.2 < 1.0.0-alpha.10`.

### Store lookups

The store functions are also exported directly:

```js
import {
  fetchAppStoreVersion,   // (bundleId, country?, timeoutMs?)
  fetchPlayStoreVersion,  // (packageName, timeoutMs?)
  fetchCustomEndpoint,    // (url, options?, timeoutMs?)
} from '@lucidaquarian/app-version-checker';
```

> **Google Play note:** Google has no official public version API, so `fetchPlayStoreVersion` scrapes the store page and can break if Google changes their markup. For production Android checks, prefer a `customEndpoint` backed by your server or the Google Play Developer API.

## Custom endpoint

Set `customEndpoint` and the checker fetches from your URL instead of the stores. Your endpoint should return JSON:

```json
{
  "version": "2.1.0",
  "minVersion": "1.5.0",
  "releaseNotes": "Performance improvements and bug fixes.",
  "storeUrl": "https://apps.apple.com/app/id123456789",
  "forceUpdate": false
}
```

Only `version` is required; all other fields are optional. Any extra fields you include are passed through on the result.

```js
const checker = new AppVersionChecker({
  customEndpoint: 'https://api.example.com/app/version',
  customEndpointOptions: {
    headers: { Authorization: 'Bearer TOKEN' },
  },
  timeout: 8000,
});
```

## Framework examples

See the [`examples/`](./examples) directory for complete integration examples:

- [`cordova-usage.js`](./examples/cordova-usage.js) — Cordova with native dialogs
- [`capacitor-usage.js`](./examples/capacitor-usage.js) — Capacitor with Ionic Angular and a React hook

## Module formats

The package ships both ES module and CommonJS entry points, so either import style works:

```js
// ES modules (Ionic / Vite / webpack / modern Node)
import { AppVersionChecker } from '@lucidaquarian/app-version-checker';

// CommonJS
const { AppVersionChecker } = require('@lucidaquarian/app-version-checker');
```

## TypeScript

Type declarations ship with the package — no `@types` install needed:

```ts
import { AppVersionChecker, VersionCheckResult } from '@lucidaquarian/app-version-checker';
```

## Running tests

```bash
npm test      # unit tests (no network — fetch and native globals are mocked)
npm run lint  # zero-dependency syntax check over src/
```

## License

[MIT](./LICENSE)
