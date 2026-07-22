/**
 * Example: Using app-version-checker in a Cordova application.
 *
 * Prerequisites:
 *   cordova plugin add cordova-plugin-app-version
 *   npm install app-version-checker
 */

const { AppVersionChecker } = require('app-version-checker');

// ─── Basic Setup ─────────────────────────────────────────────────────

const checker = new AppVersionChecker({
  platform: 'cordova',                         // explicitly use Cordova provider
  iosBundleId: 'com.yourcompany.yourapp',       // for iOS App Store lookup
  androidPackageName: 'com.yourcompany.yourapp', // for Google Play lookup
  country: 'us',                                // App Store region
});

// ─── Check on App Launch ─────────────────────────────────────────────

document.addEventListener('deviceready', async () => {
  try {
    const result = await checker.checkForUpdate();

    console.log('Current version:', result.currentVersion);
    console.log('Latest version:', result.latestVersion);
    console.log('Update available:', result.updateAvailable);
    console.log('Update type:', result.updateType);
    console.log('Force update:', result.forceUpdate);

    if (result.forceUpdate) {
      // Show a blocking dialog – user MUST update
      showForceUpdateDialog(result);
    } else if (result.updateAvailable) {
      // Show a dismissible prompt
      showOptionalUpdateDialog(result);
    }
  } catch (err) {
    console.warn('Version check failed:', err.message);
    // Gracefully continue — don't block the user
  }
});

// ─── UI Helpers (replace with your framework's dialogs) ──────────────

function showForceUpdateDialog(result) {
  if (navigator.notification) {
    navigator.notification.alert(
      `Version ${result.latestVersion} is required to continue.\n\n${result.releaseNotes}`,
      () => openStore(result.storeUrl),
      'Update Required',
      'Update Now'
    );
  }
}

function showOptionalUpdateDialog(result) {
  if (navigator.notification) {
    navigator.notification.confirm(
      `Version ${result.latestVersion} is available!\n\n${result.releaseNotes}`,
      (buttonIndex) => {
        if (buttonIndex === 1) openStore(result.storeUrl);
      },
      'Update Available',
      ['Update', 'Later']
    );
  }
}

function openStore(url) {
  if (url && window.cordova?.InAppBrowser) {
    window.cordova.InAppBrowser.open(url, '_system');
  }
}
