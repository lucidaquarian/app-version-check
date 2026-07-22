/**
 * Example: Using app-update-checker in a Capacitor application.
 *
 * Prerequisites:
 *   npm install @capacitor/app
 *   npm install app-update-checker
 *
 * Works with Capacitor 4+ / 5+ and Ionic frameworks.
 */

const { AppVersionChecker } = require('app-update-checker');

// ─── Option A: Store-based lookup ────────────────────────────────────

const checker = new AppVersionChecker({
  platform: 'capacitor',                        // explicitly use Capacitor provider
  iosBundleId: 'com.yourcompany.yourapp',
  androidPackageName: 'com.yourcompany.yourapp',
  country: 'us',
});

// ─── Option B: Custom API endpoint ───────────────────────────────────

const checkerWithCustomEndpoint = new AppVersionChecker({
  platform: 'capacitor',
  customEndpoint: 'https://api.yourcompany.com/app/version',
  customEndpointOptions: {
    headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
  },
  minVersion: '1.5.0',  // force-update below this version
});

// ─── Run the Check ───────────────────────────────────────────────────

async function performVersionCheck() {
  try {
    const result = await checker.checkForUpdate();

    console.log(JSON.stringify(result, null, 2));
    // {
    //   currentVersion: "1.2.0",
    //   latestVersion: "1.3.1",
    //   updateAvailable: true,
    //   updateType: "minor",
    //   forceUpdate: false,
    //   storeUrl: "https://apps.apple.com/...",
    //   releaseNotes: "Bug fixes and improvements",
    //   platform: "capacitor",
    //   devicePlatform: "ios"
    // }

    return result;
  } catch (err) {
    console.warn('Version check failed:', err.message);
    return null;
  }
}

// ─── Ionic / Angular Integration Example ─────────────────────────────

/*
  // In an Ionic Angular service (version-check.service.ts):

  import { Injectable } from '@angular/core';
  import { AlertController } from '@ionic/angular';
  import { AppVersionChecker } from 'app-update-checker';
  import { Browser } from '@capacitor/browser';

  @Injectable({ providedIn: 'root' })
  export class VersionCheckService {
    private checker = new AppVersionChecker({
      platform: 'capacitor',
      iosBundleId: 'com.yourcompany.yourapp',
      androidPackageName: 'com.yourcompany.yourapp',
    });

    constructor(private alertCtrl: AlertController) {}

    async checkOnLaunch(): Promise<void> {
      try {
        const result = await this.checker.checkForUpdate();

        if (result.forceUpdate) {
          await this.showForceUpdate(result);
        } else if (result.updateAvailable) {
          await this.showOptionalUpdate(result);
        }
      } catch {
        // Silently fail — don't block the user
      }
    }

    private async showForceUpdate(result) {
      const alert = await this.alertCtrl.create({
        header: 'Update Required',
        message: `Please update to version ${result.latestVersion} to continue.`,
        backdropDismiss: false,
        buttons: [{
          text: 'Update Now',
          handler: () => Browser.open({ url: result.storeUrl }),
        }],
      });
      await alert.present();
    }

    private async showOptionalUpdate(result) {
      const alert = await this.alertCtrl.create({
        header: 'Update Available',
        message: `Version ${result.latestVersion} is available. ${result.releaseNotes}`,
        buttons: [
          { text: 'Later', role: 'cancel' },
          { text: 'Update', handler: () => Browser.open({ url: result.storeUrl }) },
        ],
      });
      await alert.present();
    }
  }
*/

// ─── React / Capacitor Integration Example ───────────────────────────

/*
  // In a React component (useVersionCheck.ts):

  import { useEffect, useState } from 'react';
  import { AppVersionChecker, VersionCheckResult } from 'app-update-checker';

  const checker = new AppVersionChecker({
    platform: 'auto',
    iosBundleId: 'com.yourcompany.yourapp',
    androidPackageName: 'com.yourcompany.yourapp',
  });

  export function useVersionCheck() {
    const [result, setResult] = useState<VersionCheckResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      checker.checkForUpdate()
        .then(setResult)
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }, []);

    return { result, loading };
  }
*/

module.exports = { performVersionCheck };
