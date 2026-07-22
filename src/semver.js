/**
 * Semantic version comparison utilities.
 * Handles parsing and comparing version strings (e.g. "1.2.3", "2.0.0-beta.1").
 */

class SemVer {
  /**
   * Parse a version string into its components.
   * @param {string} version - Version string (e.g., "1.2.3", "1.0.0-beta.1")
   * @returns {{ major: number, minor: number, patch: number, prerelease: string }}
   */
  static parse(version) {
    if (!version || typeof version !== 'string') {
      throw new Error(`Invalid version string: "${version}"`);
    }

    const cleaned = version.replace(/^v/i, '').trim();
    const [versionPart, prerelease = ''] = cleaned.split('-', 2);
    const parts = versionPart.split('.');

    const major = parseInt(parts[0], 10) || 0;
    const minor = parseInt(parts[1], 10) || 0;
    const patch = parseInt(parts[2], 10) || 0;

    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      throw new Error(`Unable to parse version: "${version}"`);
    }

    return { major, minor, patch, prerelease };
  }

  /**
   * Compare two version strings.
   * @param {string} versionA
   * @param {string} versionB
   * @returns {number} -1 if A < B, 0 if A == B, 1 if A > B
   */
  static compare(versionA, versionB) {
    const a = SemVer.parse(versionA);
    const b = SemVer.parse(versionB);

    if (a.major !== b.major) return a.major > b.major ? 1 : -1;
    if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
    if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;

    // Pre-release versions have lower precedence than the release version
    if (a.prerelease && !b.prerelease) return -1;
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease && b.prerelease) {
      return a.prerelease < b.prerelease ? -1 : a.prerelease > b.prerelease ? 1 : 0;
    }

    return 0;
  }

  /**
   * Check if versionA is greater than versionB.
   * @param {string} versionA
   * @param {string} versionB
   * @returns {boolean}
   */
  static gt(versionA, versionB) {
    return SemVer.compare(versionA, versionB) === 1;
  }

  /**
   * Check if versionA is less than versionB.
   * @param {string} versionA
   * @param {string} versionB
   * @returns {boolean}
   */
  static lt(versionA, versionB) {
    return SemVer.compare(versionA, versionB) === -1;
  }

  /**
   * Check if versionA equals versionB.
   * @param {string} versionA
   * @param {string} versionB
   * @returns {boolean}
   */
  static eq(versionA, versionB) {
    return SemVer.compare(versionA, versionB) === 0;
  }

  /**
   * Check if versionA >= versionB.
   * @param {string} versionA
   * @param {string} versionB
   * @returns {boolean}
   */
  static gte(versionA, versionB) {
    return SemVer.compare(versionA, versionB) >= 0;
  }

  /**
   * Check if versionA <= versionB.
   * @param {string} versionA
   * @param {string} versionB
   * @returns {boolean}
   */
  static lte(versionA, versionB) {
    return SemVer.compare(versionA, versionB) <= 0;
  }

  /**
   * Determine the type of update between two versions.
   * @param {string} currentVersion
   * @param {string} latestVersion
   * @returns {'major' | 'minor' | 'patch' | 'prerelease' | 'none'}
   */
  static updateType(currentVersion, latestVersion) {
    if (SemVer.gte(currentVersion, latestVersion)) return 'none';

    const current = SemVer.parse(currentVersion);
    const latest = SemVer.parse(latestVersion);

    if (latest.major > current.major) return 'major';
    if (latest.minor > current.minor) return 'minor';
    if (latest.patch > current.patch) return 'patch';
    return 'prerelease';
  }

  /**
   * Validate whether a string is a valid semver.
   * @param {string} version
   * @returns {boolean}
   */
  static isValid(version) {
    try {
      SemVer.parse(version);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = SemVer;
