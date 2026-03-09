# app-version-checker

A cross-platform npm plugin for checking app versions in **Cordova** and **Capacitor** mobile applications. Compare the installed version against the latest published version on the App Store, Google Play, or your own API endpoint — and prompt users to update.

## Features

- **Dual platform support** — works with both Cordova (`cordova-plugin-app-version`) and Capacitor (`@capacitor/app`)
- **Auto-detection** — automatically picks the right platform at runtime, or set it explicitly
- **Store lookups** — fetches the latest version from the Apple App Store or Google Play Store
- **Custom endpoint** — point to your own API for full control over versioning and feature flags
- **Forced updates** — configure a minimum supported version; users below it are required to update
- **Semantic versioning** — built-in semver parser and comparator (major / minor / patch / prerelease)
- **TypeScript ready** — ships with full `.d.ts` declarations
- **Zero dependencies** — no external runtime dependencies

## Installation

```bash
npm install app-version-checker
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

## Quick Start

```js
import { AppVersionChecker } from 'app-version-checker';

const checker = new AppVersionChecker({
  platform: 'auto',                             // 'cordova' | 'capacitor' | 'auto'
  iosBundleId: 'com.yourcompany.yourapp',
  androidPackageName: 'com.yourcompany.yourapp',
});

const result = await checker.checkForUpdate();

if (result.forceUpdate) {
  // Block the user — they must update
} else if (result.updateAvailable) {
  // Show an optional update prompt
}
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `platform` | `'cordova' \| 'capacitor' \| 'auto'` | `'auto'` | Which platform provider to use |
| `iosBundleId` | `string` | `''` | iOS bundle ID for App Store lookups |
| `androidPackageName` | `string` | `''` | Android package name for Play Store lookups |
| `country` | `string` | `'us'` | Two-letter country code for App Store region |
| `customEndpoint` | `string` | `''` | URL to your own version API (skips store lookups) |
| `customEndpointOptions` | `RequestInit` | `{}` | Extra `fetch` options for the custom endpoint |
| `minVersion` | `string` | `''` | Local minimum version override for forced updates |

## API Reference

### `AppVersionChecker`

#### `new AppVersionChecker(config?)`
Create a new checker instance.

#### `checker.checkForUpdate(): Promise<VersionCheckResult>`
Perform a full check — returns:

```ts
{
  currentVersion: string;    // e.g. "1.2.0"
  latestVersion: string;     // e.g. "1.3.1"
  updateAvailable: boolean;
  updateType: 'major' | 'minor' | 'patch' | 'prerelease' | 'none';
  forceUpdate: boolean;
  storeUrl: string;
  releaseNotes: string;
  platform: string;          // 'cordova' | 'capacitor'
  devicePlatform: string;    // 'ios' | 'android' | 'web'
}
```

#### `checker.getCurrentVersion(): Promise<string>`
Get the installed version string.

#### `checker.getAppInfo(): Promise<AppInfo>`
Get full app info (version, build, package name, app name).

#### `checker.getLatestVersion(): Promise<object>`
Fetch remote version info from the store or custom endpoint.

#### `AppVersionChecker.compareVersions(current, latest)`
Static helper — compare two version strings without a device:

```js
const { updateAvailable, updateType } = AppVersionChecker.compareVersions('1.0.0', '2.0.0');
// { updateAvailable: true, updateType: 'major' }
```

### `SemVer`

Standalone semver utilities:

```js
import { SemVer } from 'app-version-checker';

SemVer.parse('1.2.3');              // { major: 1, minor: 2, patch: 3, prerelease: '' }
SemVer.compare('1.0.0', '2.0.0');  // -1
SemVer.gt('2.0.0', '1.0.0');       // true
SemVer.lt('1.0.0', '2.0.0');       // true
SemVer.eq('1.0.0', '1.0.0');       // true
SemVer.updateType('1.0.0', '2.0.0'); // 'major'
SemVer.isValid('1.2.3');            // true
```

## Custom Endpoint

If you set `customEndpoint`, the plugin will fetch from your URL instead of the stores. Your endpoint should return JSON:

```json
{
  "version": "2.1.0",
  "minVersion": "1.5.0",
  "releaseNotes": "Performance improvements and bug fixes.",
  "storeUrl": "https://apps.apple.com/app/id123456789",
  "forceUpdate": false
}
```

Only `version` is required — all other fields are optional.

```js
const checker = new AppVersionChecker({
  customEndpoint: 'https://api.example.com/app/version',
  customEndpointOptions: {
    headers: { Authorization: 'Bearer TOKEN' },
  },
});
```

## Framework Examples

See the `examples/` directory for complete integration examples:

- **`cordova-usage.js`** — Cordova with native dialogs
- **`capacitor-usage.js`** — Capacitor with Ionic Angular and React hook patterns

## Running Tests

```bash
npm test
```

## License

MIT
