/**
 * ESM entry point.
 *
 * The implementation lives in the CommonJS module `./index.js`. This thin
 * wrapper re-exports it as native ES module bindings, so the package works
 * with both `import { AppVersionChecker } from '...'` and `require('...')`
 * without a build step or duplicated logic.
 */

import mod from './index.js';

export const {
  AppVersionChecker,
  SemVer,
  CordovaProvider,
  CapacitorProvider,
  fetchAppStoreVersion,
  fetchPlayStoreVersion,
  fetchCustomEndpoint,
} = mod;

export default mod;
