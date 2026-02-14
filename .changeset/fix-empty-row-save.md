---
"google-spreadsheet": patch
---

Fix crash when saving a row with all empty values, and ensure empty cells always return `''` instead of `undefined`
