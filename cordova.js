/**
 * Cordova platform provider.
 * Retrieves the current app version using the cordova-plugin-app-version API.
 */

class CordovaProvider {
  constructor() {
    this.name = 'cordova';
  }

  /**
   * Check if we are running inside a Cordova environment.
   * @returns {boolean}
   */
  isAvailable() {
    return (
      typeof window !== 'undefined' &&
      typeof window.cordova !== 'undefined'
    );
  }

  /**
   * Get the current app version from Cordova.
   * Requires `cordova-plugin-app-version` to be installed.
   *
   * @returns {Promise<{ versionName: string, versionCode: string|number, packageName: string, appName: string }>}
   */
  async getAppInfo() {
    if (!this.isAvailable()) {
      throw new Error(
        'Cordova is not available. Ensure this is running inside a Cordova app.'
      );
    }

    await this._waitForDeviceReady();

    const cordova = window.cordova;

    // Check for cordova-plugin-app-version
    if (
      typeof cordova.getAppVersion === 'undefined' &&
      typeof window.AppVersion === 'undefined'
    ) {
      throw new Error(
        'cordova-plugin-app-version is not installed. ' +
        'Install it with: cordova plugin add cordova-plugin-app-version'
      );
    }

    const appVersion = cordova.getAppVersion || window.AppVersion;

    const [versionName, versionCode, packageName, appName] = await Promise.all([
      this._promisify(appVersion.getVersionNumber),
      this._promisify(appVersion.getVersionCode),
      this._promisify(appVersion.getPackageName),
      this._promisify(appVersion.getAppName),
    ]);

    return { versionName, versionCode, packageName, appName };
  }

  /**
   * Get only the version string (e.g. "1.2.3").
   * @returns {Promise<string>}
   */
  async getVersion() {
    const info = await this.getAppInfo();
    return info.versionName;
  }

  /**
   * Get the build/version code (e.g. 42).
   * @returns {Promise<string|number>}
   */
  async getBuildNumber() {
    const info = await this.getAppInfo();
    return info.versionCode;
  }

  /**
   * Get the current platform (ios or android).
   * @returns {string}
   */
  getPlatform() {
    if (!this.isAvailable()) return 'unknown';
    return window.cordova.platformId || window.device?.platform?.toLowerCase() || 'unknown';
  }

  /**
   * Wait for the Cordova deviceready event.
   * @returns {Promise<void>}
   * @private
   */
  _waitForDeviceReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete' || window.cordova?.plugins) {
        resolve();
      } else {
        document.addEventListener('deviceready', resolve, false);
      }
    });
  }

  /**
   * Convert a Cordova callback-style function to a Promise.
   * @param {Function} fn
   * @returns {Promise<any>}
   * @private
   */
  _promisify(fn) {
    return new Promise((resolve, reject) => {
      try {
        fn(resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = CordovaProvider;
