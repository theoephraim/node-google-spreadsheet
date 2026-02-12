# CLAUDE.md

## Project Overview
`google-spreadsheet` — a Google Sheets API wrapper for Node.js (published as `google-spreadsheet` on npm).

Goal of the project is to provide a simplified, more ergonomic interface compared to Google's official SDKs.

## Tech Stack
- TypeScript (strict mode), ESM module
- Built with `tsup` (outputs CJS + ESM to `dist/`)
- Tested with `vitest`
- Linted with `eslint`
- Uses `pnpm` as package manager
- Versioning/releases managed with `changesets`

## Common Commands
- `pnpm test` — run tests (vitest in watch mode)
- `pnpm run test:ci` — run tests once
- `pnpm run build` — build with tsup
- `pnpm run lint` — run eslint
- `pnpm run lint:fix` — run eslint with auto-fix
- `pnpm changeset` — create a changeset for version bumps

## Project Structure
- `src/` — source code
  - `src/index.ts` — package entry point
  - `src/lib/` — internal utilities and helpers
    - `src/lib/GoogleSpreadsheet.ts` — main document class
    - `src/lib/GoogleSpreadsheetWorksheet.ts` — worksheet class
    - `src/lib/GoogleSpreadsheetRow.ts` — row class
    - `src/lib/GoogleSpreadsheetCell.ts` — cell class
  - `src/test/` — test files (`*.test.ts`)
- `docs/` — docsify documentation site

## Testing
- Tests hit real Google APIs against test documents — they are integration tests, not mocked.
- Tests run sequentially (`fileParallelism: false` in vitest config).
- Test files: `src/test/*.test.ts`
