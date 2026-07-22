/**
 * app-version-checker
 *
 * A cross-platform version checker for Cordova and Capacitor mobile applications.
 * Detects the current app version, compares it against the latest published version
 * (from the App Store, Google Play, or a custom endpoint), and returns actionable
 * update information.
 *
 * @example
 *   const { AppVersionChecker } = require('app-version-checker');
 *
 *   const checker = new AppVersionChecker({
 *     platform: 'auto',                          // 'cordova' | 'capacitor' | 'auto'
 *     iosBundleId: 'com.example.myapp',           // for App Store lookup
 *     androidPackageName: 'com.example.myapp',    // for Play Store lookup
 *     country: 'us',                              // App Store region
 *   });
 *
 *   const result = await checker.checkForUpdate();
 *   if (result.updateAvailable) {
 *     console.log(`New version ${result.latestVersion} available!`);
 *   }
 */

const SemVer = require('./semver');
const CordovaProvider = require('./providers/cordova');
const CapacitorProvider = require('./providers/capacitor');
const {
  fetchAppStoreVersion,
  fetchPlayStoreVersion,
  fetchCustomEndpoint,
} = require('./stores');

// ─── Default Configuration ───────────────────────────────────────────

const DEFAULT_CONFIG = {
  /** @type {'cordova' | 'capacitor' | 'auto'} */
  platform: 'auto',

  /** iOS bundle identifier for App Store lookup */
  iosBundleId: '',

  /** Android package name for Play Store lookup */
  androidPackageName: '',

  /** Two-letter country code for App Store */
  country: 'us',

  /**
   * Optional custom endpoint URL that returns JSON with a `version` field.
   * When set, the store lookup is skipped in favor of this endpoint.
   */
  customEndpoint: '',

  /** Extra fetch options passed to the custom endpoint request */
  customEndpointOptions: {},

  /**
   * If set, any installed version below this is treated as a forced update,
   * regardless of what the store says. Overridden by the remote `minVersion`.
   */
  minVersion: '',

  /** Network timeout (ms) for store / custom-endpoint requests. */
  timeout: 10000,
};

// ─── Main Class ──────────────────────────────────────────────────────

class AppVersionChecker {
  /**
   * @param {Partial<typeof DEFAULT_CONFIG>} config
   */
  constructor(config = {}) {
    /** @type {typeof DEFAULT_CONFIG} */
    this.config = { ...DEFAULT_CONFIG, ...config };

    this._cordova = new CordovaProvider();
    this._capacitor = new CapacitorProvider();
    this._provider = null;
  }

  // ── Provider Detection ─────────────────────────────────────────────

  /**
   * Detect and return the appropriate platform provider.
   * @returns {CordovaProvider | CapacitorProvider}
   */
  getProvider() {
    if (this._provider) return this._provider;

    const { platform } = this.config;

    if (platform === 'cordova') {
      this._provider = this._cordova;
    } else if (platform === 'capacitor') {
      this._provider = this._capacitor;
    } else {
      // Auto-detect: prefer Capacitor (newer), fall back to Cordova
      if (this._capacitor.isAvailable()) {
        this._provider = this._capacitor;
      } else if (this._cordova.isAvailable()) {
        this._provider = this._cordova;
      } else {
        throw new Error(
          'No mobile platform detected. ' +
          'Ensure Cordova or Capacitor is initialized, or set the "platform" config explicitly.'
        );
      }
    }

    return this._provider;
  }

  /**
   * Get the name of the detected platform.
   * @returns {string}
   */
  getPlatformName() {
    return this.getProvider().name;
  }

  // ── Local Version ──────────────────────────────────────────────────

  /**
   * Get the currently installed app version.
   * @returns {Promise<string>}
   */
  async getCurrentVersion() {
    return this.getProvider().getVersion();
  }

  /**
   * Get the full app info object from the platform.
   * @returns {Promise<object>}
   */
  async getAppInfo() {
    return this.getProvider().getAppInfo();
  }

  /**
   * Get the current OS-level platform (ios / android / web).
   * @returns {string}
   */
  getDevicePlatform() {
    return this.getProvider().getPlatform();
  }

  // ── Remote Version Lookup ──────────────────────────────────────────

  /**
   * Fetch the latest version info from the appropriate store or custom endpoint.
   * @returns {Promise<{ version: string, storeUrl?: string, releaseNotes?: string, minVersion?: string, forceUpdate?: boolean }>}
   */
  async getLatestVersion() {
    const { timeout } = this.config;

    // Prefer custom endpoint if configured
    if (this.config.customEndpoint) {
      return fetchCustomEndpoint(
        this.config.customEndpoint,
        this.config.customEndpointOptions,
        timeout
      );
    }

    const devicePlatform = this.getDevicePlatform();

    if (devicePlatform === 'ios') {
      const bundleId = this.config.iosBundleId;
      if (!bundleId) {
        throw new Error('iosBundleId must be set in config for App Store lookups.');
      }
      return fetchAppStoreVersion(bundleId, this.config.country, timeout);
    }

    if (devicePlatform === 'android') {
      const packageName = this.config.androidPackageName;
      if (!packageName) {
        throw new Error('androidPackageName must be set in config for Play Store lookups.');
      }
      return fetchPlayStoreVersion(packageName, timeout);
    }

    throw new Error(
      `Unsupported device platform "${devicePlatform}". Use a customEndpoint for web-based checks.`
    );
  }

  // ── Update Check ───────────────────────────────────────────────────

  /**
   * Perform a full version check: compare local version against latest remote version.
   *
   * @returns {Promise<VersionCheckResult>}
   *
   * @typedef {Object} VersionCheckResult
   * @property {string}  currentVersion   - The installed app version
   * @property {string}  latestVersion    - The latest available version
   * @property {boolean} updateAvailable  - True if a newer version exists
   * @property {'major'|'minor'|'patch'|'prerelease'|'none'} updateType - Kind of update
   * @property {boolean} forceUpdate      - True if the current version is below the minimum
   * @property {string}  storeUrl         - URL to the store listing (if available)
   * @property {string}  releaseNotes     - Release notes (if available)
   * @property {string}  platform         - Detected platform name
   */
  async checkForUpdate() {
    const [currentVersion, remoteInfo] = await Promise.all([
      this.getCurrentVersion(),
      this.getLatestVersion(),
    ]);

    const latestVersion = remoteInfo.version;
    const updateAvailable = SemVer.lt(currentVersion, latestVersion);
    const updateType = SemVer.updateType(currentVersion, latestVersion);

    // Determine forced update: use remote minVersion if provided, else local config
    const effectiveMinVersion = remoteInfo.minVersion || this.config.minVersion || '';
    let forceUpdate = remoteInfo.forceUpdate || false;
    if (effectiveMinVersion && SemVer.lt(currentVersion, effectiveMinVersion)) {
      forceUpdate = true;
    }

    return {
      currentVersion,
      latestVersion,
      updateAvailable,
      updateType,
      forceUpdate,
      storeUrl: remoteInfo.storeUrl || '',
      releaseNotes: remoteInfo.releaseNotes || '',
      platform: this.getPlatformName(),
      devicePlatform: this.getDevicePlatform(),
    };
  }

  // ── Static Convenience ─────────────────────────────────────────────

  /**
   * Compare two arbitrary version strings without any platform dependency.
   * Useful for quick checks or unit tests.
   *
   * @param {string} currentVersion
   * @param {string} latestVersion
   * @returns {{ updateAvailable: boolean, updateType: string }}
   */
  static compareVersions(currentVersion, latestVersion) {
    return {
      updateAvailable: SemVer.lt(currentVersion, latestVersion),
      updateType: SemVer.updateType(currentVersion, latestVersion),
    };
  }
}

// ─── Exports ─────────────────────────────────────────────────────────

module.exports = {
  AppVersionChecker,
  SemVer,
  CordovaProvider,
  CapacitorProvider,
  fetchAppStoreVersion,
  fetchPlayStoreVersion,
  fetchCustomEndpoint,
};
