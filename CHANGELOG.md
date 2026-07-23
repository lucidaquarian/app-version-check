# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-07-23

### Added
- Native **ES module** entry point alongside CommonJS, wired through an
  `exports` map with `import`/`require`/`types` conditions (plus
  `sideEffects: false` for bundler tree-shaking). Consumers can use either
  `import` or `require`.
- Automatic **retry with exponential backoff** for transient network failures
  (HTTP 429/5xx and connection/timeout errors), configurable via the new
  `retries` and `retryDelay` options. Non-retryable responses (e.g. `404`)
  fail fast.
- Optional in-memory **TTL caching** of the remote lookup via the new
  `cacheTime` option, plus a `clearCache()` method. Disabled by default
  (`cacheTime: 0`).

### Changed
- The store lookup functions' trailing network argument now accepts either a
  timeout `number` (unchanged, backward compatible) or an options object
  `{ timeout, retries, backoff }`.
- The npm publish workflow is now manual (`workflow_dispatch`) with an
  `NPM_TOKEN` presence guard.

## [1.0.0] - 2026-07-22

### Added
- Initial release: cross-platform version/update checker for Cordova and
  Capacitor applications.
- Version lookups from the Apple App Store, Google Play, or a custom endpoint.
- Spec-compliant semver parsing and comparison, including prerelease ordering.
- Forced-update support via a local or remote minimum version.
- Bounded network requests via a configurable `timeout`.
- Full TypeScript declarations; zero runtime dependencies.
