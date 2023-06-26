# Changelog

Sorry for not keeping a proper changelog from the beginning. Will try to keep this up to date from now on!

### 4.0.0 (2021-11-07)

- Added `insertDimension` functionality
- Added custom header row index for row-based API
- Bumped dependency versions
- Readme/docs cleanup

### 5.0.0 (2023-03-01)

- rewrite in typescript! no more lagging/outdated types from DefinitelyTyped (`@types/google-spreadsheet`)
- refactor `GoogleSpreadsheetRow` to be more TS friendly
- refactor authentication to rely directly on [google-auth-library](https://www.npmjs.com/package/google-auth-library) as a peer dependency
- support Application Default Credentials (auto inject credentials in some environments)
- refactor document creation into static method, similar auth setup
- support basic sharing / permissions management (drive api)
- support document delete
- replaced `GoogleSpreadsheetFormulaError` with `GoogleSpreadsheetCellErrorValue` and now handles all possible cell error types
- fully deprecated `sheet.getInfo`, 