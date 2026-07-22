/**
 * Store lookup strategies.
 * Fetch the latest published version from the App Store, Google Play, or a custom endpoint.
 */

/** Default network timeout (ms) applied to every store request. */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * `fetch` wrapper that aborts the request after `timeoutMs`, so a hung
 * connection can never make a version check hang indefinitely. Any caller
 * supplied `options.signal` is still honored (aborting it aborts the request).
 *
 * @param {string} url
 * @param {object} [options] - Standard fetch options; may include a `signal`.
 * @param {number} [timeoutMs] - Timeout in ms. 0 or negative disables it.
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  // Chain a caller-provided signal to our controller so either can abort.
  const callerSignal = options.signal;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    // Distinguish our timeout from a caller-initiated abort or a real error.
    if (err && err.name === 'AbortError' && !(callerSignal && callerSignal.aborted)) {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Fetch the latest version from Apple App Store using the iTunes Lookup API.
 *
 * @param {string} bundleId - The iOS bundle identifier (e.g. "com.example.app")
 * @param {string} [country='us'] - Two-letter ISO country code
 * @param {number} [timeoutMs] - Request timeout in ms
 * @returns {Promise<{ version: string, releaseNotes: string, storeUrl: string, releaseDate: string, minimumOsVersion: string }>}
 */
async function fetchAppStoreVersion(bundleId, country = 'us', timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!bundleId) throw new Error('bundleId is required for App Store lookup');

  const url = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=${encodeURIComponent(country)}`;

  const response = await fetchWithTimeout(url, {}, timeoutMs);
  if (!response.ok) {
    throw new Error(`App Store lookup failed: HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(
      `App not found on the App Store with bundleId "${bundleId}" in country "${country}".`
    );
  }

  const result = data.results[0];

  if (!result.version) {
    throw new Error(
      `App Store result for bundleId "${bundleId}" did not include a version.`
    );
  }

  return {
    version: result.version,
    releaseNotes: result.releaseNotes || '',
    storeUrl: result.trackViewUrl || '',
    releaseDate: result.currentVersionReleaseDate || '',
    minimumOsVersion: result.minimumOsVersion || '',
  };
}

/**
 * Fetch the latest version from Google Play Store.
 * NOTE: Google does not provide an official public API for this.
 * This uses a lightweight HTML-scraping approach as a fallback.
 * For production use, prefer a custom server endpoint or the Google Play Developer API.
 *
 * @param {string} packageName - The Android package name (e.g. "com.example.app")
 * @param {number} [timeoutMs] - Request timeout in ms
 * @returns {Promise<{ version: string, storeUrl: string }>}
 */
async function fetchPlayStoreVersion(packageName, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!packageName) throw new Error('packageName is required for Play Store lookup');

  const storeUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&hl=en`;

  const response = await fetchWithTimeout(storeUrl, {}, timeoutMs);
  if (!response.ok) {
    throw new Error(`Play Store lookup failed: HTTP ${response.status}`);
  }

  const html = await response.text();

  // Attempt to extract the version from the page content. This is fragile and
  // may break if Google changes their markup, so several known shapes are
  // tried before giving up. Prefer a custom endpoint for production use.
  const patterns = [
    /\[\[\["(\d+(?:\.\d+)+)"\]\]/,          // primary: [[["1.2.3"]]]
    /"version"\s*:\s*"(\d+(?:\.\d+)+)"/i,   // JSON-ish "version":"1.2.3"
    /Current Version[\s\S]{0,80}?(\d+(?:\.\d+)+)/i, // legacy label markup
  ];

  let version = null;
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      version = match[1];
      break;
    }
  }

  if (!version) {
    throw new Error(
      'Could not extract version from Play Store page. ' +
      'Consider using a custom endpoint instead.'
    );
  }

  return {
    version,
    storeUrl,
  };
}

/**
 * Fetch the latest version from a custom remote endpoint.
 * The endpoint should return JSON with at least a `version` field.
 *
 * Expected response format:
 * {
 *   "version": "2.1.0",
 *   "minVersion": "1.5.0",        // optional: minimum supported version
 *   "releaseNotes": "Bug fixes",  // optional
 *   "storeUrl": "https://...",    // optional: link to download/update
 *   "forceUpdate": false          // optional: whether update is mandatory
 * }
 *
 * @param {string} url - The endpoint URL
 * @param {object} [options] - Fetch options (headers, etc.)
 * @param {number} [timeoutMs] - Request timeout in ms
 * @returns {Promise<object>}
 */
async function fetchCustomEndpoint(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!url) throw new Error('URL is required for custom endpoint lookup');

  const response = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`Custom endpoint lookup failed: HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.version) {
    throw new Error('Custom endpoint response must include a "version" field.');
  }

  // Spread the raw payload first so pass-through fields are preserved, then
  // apply the normalized fields last so their defaults are not clobbered by
  // falsy/absent values from the endpoint.
  return {
    ...data,
    version: data.version,
    minVersion: data.minVersion || null,
    releaseNotes: data.releaseNotes || '',
    storeUrl: data.storeUrl || '',
    forceUpdate: data.forceUpdate || false,
  };
}

module.exports = {
  fetchAppStoreVersion,
  fetchPlayStoreVersion,
  fetchCustomEndpoint,
  DEFAULT_TIMEOUT_MS,
};
