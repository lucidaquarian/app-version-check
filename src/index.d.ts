/**
 * @lucidaquarian/app-version-checker
 * Cross-platform version checker for Cordova and Capacitor mobile applications.
 */

// ─── SemVer ──────────────────────────────────────────────────────────

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
}

export class SemVer {
  static parse(version: string): ParsedVersion;
  static compare(versionA: string, versionB: string): -1 | 0 | 1;
  static gt(versionA: string, versionB: string): boolean;
  static lt(versionA: string, versionB: string): boolean;
  static eq(versionA: string, versionB: string): boolean;
  static gte(versionA: string, versionB: string): boolean;
  static lte(versionA: string, versionB: string): boolean;
  static updateType(
    currentVersion: string,
    latestVersion: string
  ): 'major' | 'minor' | 'patch' | 'prerelease' | 'none';
  static isValid(version: string): boolean;
}

// ─── Providers ───────────────────────────────────────────────────────

export interface AppInfo {
  versionName: string;
  versionCode: string | number;
  packageName: string;
  appName: string;
}

export class CordovaProvider {
  readonly name: 'cordova';
  isAvailable(): boolean;
  getAppInfo(): Promise<AppInfo>;
  getVersion(): Promise<string>;
  getBuildNumber(): Promise<string | number>;
  getPlatform(): string;
}

export class CapacitorProvider {
  readonly name: 'capacitor';
  isAvailable(): boolean;
  isNative(): boolean;
  getAppInfo(): Promise<AppInfo>;
  getVersion(): Promise<string>;
  getBuildNumber(): Promise<string>;
  getPlatform(): string;
  getDeviceInfo(): Promise<object | null>;
}

// ─── Store Lookups ───────────────────────────────────────────────────

export interface AppStoreResult {
  version: string;
  releaseNotes: string;
  storeUrl: string;
  releaseDate: string;
  minimumOsVersion: string;
}

export interface PlayStoreResult {
  version: string;
  storeUrl: string;
}

export interface CustomEndpointResult {
  version: string;
  minVersion: string | null;
  releaseNotes: string;
  storeUrl: string;
  forceUpdate: boolean;
  [key: string]: any;
}

/** Network tuning: a plain timeout in ms, or a full options object. */
export interface NetworkOptions {
  /** Request timeout in ms. */
  timeout?: number;
  /** Extra attempts after the first on transient failures. */
  retries?: number;
  /** Base backoff (ms) between retries; grows exponentially. */
  backoff?: number;
}

export function fetchAppStoreVersion(
  bundleId: string,
  country?: string,
  net?: number | NetworkOptions
): Promise<AppStoreResult>;

export function fetchPlayStoreVersion(
  packageName: string,
  net?: number | NetworkOptions
): Promise<PlayStoreResult>;

export function fetchCustomEndpoint(
  url: string,
  options?: RequestInit,
  net?: number | NetworkOptions
): Promise<CustomEndpointResult>;

// ─── Main Checker ────────────────────────────────────────────────────

export interface AppVersionCheckerConfig {
  /** Platform to use. Defaults to 'auto'. */
  platform?: 'cordova' | 'capacitor' | 'auto';

  /** iOS bundle identifier for App Store lookup. */
  iosBundleId?: string;

  /** Android package name for Play Store lookup. */
  androidPackageName?: string;

  /** Two-letter country code for App Store. Defaults to 'us'. */
  country?: string;

  /** Custom endpoint URL returning JSON with a `version` field. */
  customEndpoint?: string;

  /** Extra fetch options for the custom endpoint. */
  customEndpointOptions?: RequestInit;

  /** Local minimum supported version override. */
  minVersion?: string;

  /** Network timeout (ms) for store / custom-endpoint requests. Defaults to 10000. */
  timeout?: number;

  /** Extra attempts after the first on transient network failures. Defaults to 2. */
  retries?: number;

  /** Base backoff (ms) between retries; grows exponentially. Defaults to 300. */
  retryDelay?: number;

  /** Cache the remote lookup in memory for this many ms. 0 (default) disables caching. */
  cacheTime?: number;
}

export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updateType: 'major' | 'minor' | 'patch' | 'prerelease' | 'none';
  forceUpdate: boolean;
  storeUrl: string;
  releaseNotes: string;
  platform: string;
  devicePlatform: string;
}

export interface StaticCompareResult {
  updateAvailable: boolean;
  updateType: 'major' | 'minor' | 'patch' | 'prerelease' | 'none';
}

export class AppVersionChecker {
  constructor(config?: AppVersionCheckerConfig);

  getProvider(): CordovaProvider | CapacitorProvider;
  getPlatformName(): string;
  getCurrentVersion(): Promise<string>;
  getAppInfo(): Promise<AppInfo>;
  getDevicePlatform(): string;
  getLatestVersion(): Promise<AppStoreResult | PlayStoreResult | CustomEndpointResult>;
  checkForUpdate(): Promise<VersionCheckResult>;
  clearCache(): void;

  static compareVersions(
    currentVersion: string,
    latestVersion: string
  ): StaticCompareResult;
}
