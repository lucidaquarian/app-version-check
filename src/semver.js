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

    // Build metadata (after '+') is ignored for precedence; drop it first.
    const withoutBuild = cleaned.split('+', 1)[0];

    // Separate the version core from the prerelease at the FIRST hyphen only,
    // so hyphenated prerelease identifiers (e.g. "beta-2") stay intact.
    const hyphenIndex = withoutBuild.indexOf('-');
    const versionPart = hyphenIndex === -1 ? withoutBuild : withoutBuild.slice(0, hyphenIndex);
    const prerelease = hyphenIndex === -1 ? '' : withoutBuild.slice(hyphenIndex + 1);

    const parts = versionPart.split('.');

    // Major must be present and numeric; minor/patch default to 0 when omitted.
    // Non-numeric components are a hard error (previously they were silently
    // coerced to 0, which let garbage like "abc" parse as 0.0.0).
    const toComponent = (raw, required) => {
      if (raw === undefined || raw === '') {
        if (required) throw new Error(`Unable to parse version: "${version}"`);
        return 0;
      }
      if (!/^\d+$/.test(raw)) {
        throw new Error(`Unable to parse version: "${version}"`);
      }
      return parseInt(raw, 10);
    };

    const major = toComponent(parts[0], true);
    const minor = toComponent(parts[1], false);
    const patch = toComponent(parts[2], false);

    return { major, minor, patch, prerelease };
  }

  /**
   * Compare two prerelease strings per the SemVer precedence rules:
   * dot-separated identifiers compared left to right, numeric identifiers
   * compared numerically, numeric ranking lower than alphanumeric, and a
   * larger set of identifiers ranking higher when all preceding are equal.
   * @param {string} a - Non-empty prerelease string
   * @param {string} b - Non-empty prerelease string
   * @returns {number} -1, 0, or 1
   * @private
   */
  static _comparePrerelease(a, b) {
    const aIds = a.split('.');
    const bIds = b.split('.');
    const len = Math.max(aIds.length, bIds.length);

    for (let i = 0; i < len; i++) {
      const aId = aIds[i];
      const bId = bIds[i];

      // A larger set of identifiers has higher precedence.
      if (aId === undefined) return -1;
      if (bId === undefined) return 1;

      const aNum = /^\d+$/.test(aId);
      const bNum = /^\d+$/.test(bId);

      if (aNum && bNum) {
        const diff = parseInt(aId, 10) - parseInt(bId, 10);
        if (diff !== 0) return diff < 0 ? -1 : 1;
      } else if (aNum !== bNum) {
        // Numeric identifiers have lower precedence than alphanumeric ones.
        return aNum ? -1 : 1;
      } else if (aId !== bId) {
        return aId < bId ? -1 : 1;
      }
    }

    return 0;
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
      return SemVer._comparePrerelease(a.prerelease, b.prerelease);
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
