---
google-spreadsheet: minor
---

upgrade ky from v1 to v2

If you use `doc.sheetsApi` or `doc.driveApi` directly, note that ky v2 changed its hook signatures (hooks now receive state objects instead of direct Request/Error params) and renamed `prefixUrl` to `prefix`. See the [ky v2 migration guide](https://github.com/sindresorhus/ky/releases/tag/v2.0.0) for details.
