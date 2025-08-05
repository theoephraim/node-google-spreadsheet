---
"google-spreadsheet": major
---

Swap [axios](https://www.npmjs.com/package/axios) for [ky](https://www.npmjs.com/package/ky) - a thin fetch wrapper.

Mostly things should work exactly the same, but we'll do a major release just in case.

BREAKING CHANGE:
- export functions in stream mode now return a web ReadableStream
