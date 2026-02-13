---
name: work-on
description: Work on an issue or PR - implement changes, add tests, update docs, lint, add changesets, and create a PR
---

You are given an issue or external PR to implement. The input may be a URL, pasted issue text, or pasted PR diff/description.

**Input:** $ARGUMENTS

## Workflow

Follow these steps in order:

### 1. Understand the task
- If given a URL, fetch it to read the issue/PR details.
- Analyze the issue or PR to understand what needs to be done.
- Summarize the task back to the user and confirm before proceeding.

### 2. Create a branch
- Create a descriptive branch name based on the task (e.g., `fix/cell-formatting-bug`, `feat/add-batch-update`).
- Branch from `main`.

### 3. Implement the changes
- Make the necessary code changes.
- Follow existing code patterns and conventions in the project.

### 4. Add or update tests
- Add tests for the new functionality or bug fix in `src/test/`.
- Follow existing test patterns — tests are integration tests that hit real Google APIs.
- If modifying existing behavior, update relevant existing tests as needed.
- To validate, only run the relevant test file(s) to avoid rate limiting: `bun vitest run src/test/<relevant-file>.test.ts`
- Do NOT run the full test suite.

### 5. Update documentation
- If your changes affect the public API (new methods, changed parameters, new features, etc.), update the relevant docs in `docs/`.
  - Class API docs are in `docs/classes/` (one file per class: `google-spreadsheet.md`, `google-spreadsheet-worksheet.md`, `google-spreadsheet-row.md`, `google-spreadsheet-cell.md`).
  - Guides are in `docs/guides/`.
  - The sidebar is `docs/_sidebar.md` — update it if adding a new page.
- Match the style and format of the existing documentation.

### 6. Lint
- Run `bun run lint:fix` to auto-fix any lint issues.
- If lint errors remain, fix them manually.

### 7. Add a changeset
- Run `bun changeset` — since this is interactive, instead create the changeset file directly.
- Create a `.changeset/<descriptive-name>.md` file with the appropriate format:
  ```
  ---
  "google-spreadsheet": <patch|minor|major>
  ---

  <Short description of the change>
  ```
- Use `patch` for bug fixes, `minor` for new features and non-breaking changes, `major` for breaking changes.

### 8. Commit and push
- Stage and commit all changes with a clear commit message.
- Push the branch to origin.

### 9. Create a PR
- Use `gh pr create` to open a pull request.
- Write a clear title and description summarizing the changes.
- If the input was a GitHub issue, reference it in the PR body (e.g., "Fixes #123").
- Return the PR URL to the user.
