/**
 * Capacitor platform provider.
 * Retrieves the current app version using @capacitor/app or @capacitor/device APIs.
 */

class CapacitorProvider {
  constructor() {
    this.name = 'capacitor';
    this._appPlugin = null;
    this._devicePlugin = null;
  }

  /**
   * Check if we are running inside a Capacitor environment.
   * @returns {boolean}
   */
  isAvailable() {
    return (
      typeof window !== 'undefined' &&
      typeof window.Capacitor !== 'undefined' &&
      window.Capacitor.isNativePlatform !== undefined
    );
  }

  /**
   * Check if the app is running on a native device (not web).
   * @returns {boolean}
   */
  isNative() {
    return this.isAvailable() && window.Capacitor.isNativePlatform();
  }

  /**
   * Dynamically import the @capacitor/app plugin.
   * @returns {Promise<any>}
   * @private
   */
  async _getAppPlugin() {
    if (this._appPlugin) return this._appPlugin;

    try {
      // Try Capacitor 4+ / 5+ dynamic import
      const mod = await import('@capacitor/app');
      this._appPlugin = mod.App;
      return this._appPlugin;
    } catch {
      // Fallback: check global Capacitor Plugins
      if (window.Capacitor?.Plugins?.App) {
        this._appPlugin = window.Capacitor.Plugins.App;
        return this._appPlugin;
      }
      throw new Error(
        '@capacitor/app plugin is not installed. ' +
        'Install it with: npm install @capacitor/app'
      );
    }
  }

  /**
   * Dynamically import the @capacitor/device plugin.
   * @returns {Promise<any>}
   * @private
   */
  async _getDevicePlugin() {
    if (this._devicePlugin) return this._devicePlugin;

    try {
      const mod = await import('@capacitor/device');
      this._devicePlugin = mod.Device;
      return this._devicePlugin;
    } catch {
      if (window.Capacitor?.Plugins?.Device) {
        this._devicePlugin = window.Capacitor.Plugins.Device;
        return this._devicePlugin;
      }
      // Device plugin is optional, return null
      return null;
    }
  }

  /**
   * Get the current app version info from Capacitor.
   *
   * @returns {Promise<{ versionName: string, versionCode: string, platform: string }>}
   */
  async getAppInfo() {
    if (!this.isAvailable()) {
      throw new Error(
        'Capacitor is not available. Ensure this is running inside a Capacitor app.'
      );
    }

    const App = await this._getAppPlugin();
    const info = await App.getInfo();

    return {
      versionName: info.version,       // e.g. "1.2.3"
      versionCode: info.build,         // e.g. "42"
      packageName: info.id,            // e.g. "com.example.app"
      appName: info.name,              // e.g. "My App"
    };
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
   * Get the build/version code.
   * @returns {Promise<string>}
   */
  async getBuildNumber() {
    const info = await this.getAppInfo();
    return info.versionCode;
  }

  /**
   * Get the current platform ("ios", "android", or "web").
   * @returns {string}
   */
  getPlatform() {
    if (!this.isAvailable()) return 'unknown';
    return window.Capacitor.getPlatform();
  }

  /**
   * Get device information (OS version, model, etc.).
   * Requires @capacitor/device plugin.
   * @returns {Promise<object|null>}
   */
  async getDeviceInfo() {
    const Device = await this._getDevicePlugin();
    if (!Device) return null;
    return Device.getInfo();
  }
}

module.exports = CapacitorProvider;
