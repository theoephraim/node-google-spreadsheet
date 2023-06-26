# Breaking Changes Upgrade Guide

Some helpful info about how to deal with breaking changes

## V3 -> V4

### Auth

Authentication methods have been decoupled from the library itself, and now instead you can rely on using the `google-auth-library` directly.

In practice, initialization looks slightly different but doesn't change too much.

#### Using a service account
```javascript
import { JWT } from 'google-auth-library';
import creds from './service-account-creds-file.json';

const serviceAccountJWT = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
});

const doc = new GoogleSpreadsheet('YOUR-DOC-ID', serviceAccountJWT);
```




### Row-based API

In order to work better with TypeScript, the api has changed from using dynamic getters/setters to a more explicit get/set functions.

While the getter/setter method used previously was _slightly_ more convenient, the new way allows us to specify the type/shape of the row data, and will help avoid any naming collisions with properties and functions on the `GoogleSpreadsheetRow` class.  

Before:
```javascript
console.log(row.first_name);
row.email = 'theo@example.com';
Object.assign(row, { first_name: 'Theo', email: 'theo@example.com' })
```

After:
```javascript
console.log(row.get('first_name'));
row.set('email', 'theo@example.com');
row.assign({ first_name: 'Theo', email: 'theo@example.com' });
```

#### Using with TypeScript

You can now (optionally) specify the shape of the data that will be returned in rows.

```ts
type UserRow = { first_name: string; email: string };

const userRows = await sheet.getRows<UserRow>();
const name = userRows[0].get('first_name'); // key checked to exist, value is typed

// type errors
userRows[0].get('bad_key'); // key does not exist!
userRows[0].set('first_name', 123); // type of value is wrong
```

### Row deletion / clearing

Previously when a row was deleted, the row numbers of other loaded rows become out of sync. Now a cache of rows is stored
on the Worksheet object, and when a row is deleted, all other rows in the cache have their row numbers updated if necessary.

This will hopefully make row-deletion much more usable and match expectations.

Calling `sheet.clearRows()` will also clear row values in the cache.

### Cell Errors

If cells are in an error state,`cell.formulaError` has been renamed to `cell.errorValue` to match google's API.

The error class was also renamed from `GoogleSpreadsheetFormulaError` to `GoogleSpreadsheetCellErrorValue`

