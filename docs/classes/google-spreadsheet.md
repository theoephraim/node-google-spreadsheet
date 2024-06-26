_Class Reference_

# GoogleSpreadsheet

> **This class represents an entire google spreadsheet document**
  <br>
  Provides methods to interact with document metadata/settings, formatting, manage sheets, and acts as the main gateway to interacting with sheets and data that the document contains.

## Initialization

### Existing documents
#### `new GoogleSpreadsheet(id, auth)` :id=fn-newGoogleSpreadsheet
> Work with an existing document

>  You'll need the document ID, which you can find in your browser's URL when you navigate to the document.<br/>
>  For example: `https://docs.google.com/spreadsheets/d/THIS-IS-THE-DOCUMENT-ID/edit#gid=123456789`

Param|Type|Required|Description
---|---|---|---
`spreadsheetId` | String | ✅ | Document ID
`auth` | `GoogleAuth` \|<br/> `JWT` \|<br/> `OAuth2Client` \|<br/> `{ apiKey: string }` \|<br/> `{ token: string }` | ✅ | Authentication to use<br/>See [Authentication](guides/authentication) for more info


### Creating a new document

In cases where you need to create a new document and then work with it, a static method is provided:

#### `GoogleSpreadsheet.createNewSpreadsheetDocument(auth, properties)` (async) :id=fn-createNewSpreadsheetDocument
> Create a new google spreadsheet document

In case you do need to create a new document, a static method is provided.

Note that as this will create the document owned by the auth method you are using (which is often a service account), it may not be accessible to _your_ google account. If you need to share with yourself or others, see the [sharing methods below](#sharing-permissions)


Param|Type|Required|Description
---|---|---|---
`auth`|Auth|✅|Auth object to use when creating the document<br/>_See [Authentication](guides/authentication) for more info_
`properties`|Object|-|Properties to use when creating the new doc<br/>_See [basic document properties](#basic-document-properties) for more details_



- ↩️ **Returns** - Promise<[GoogleSpreadsheet](classes/google-spreadsheet)> with auth set, id and info loaded
- 🚨 **Warning** - The document will be owned by the authenticated user, which depending on the auth you are using, could be a service account. In this case the sheet may not be accessible to you personally
- ✨ **Side effects** - all info (including `spreadsheetId`) and sheets loaded as if you called [`loadInfo()`](#fn-loadInfo)

```javascript
// see Authentication for more info on auth and how to create jwt
const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(jwt, { title: 'This is a new doc' });
console.log(doc.spreadsheetId);
const sheet1 = doc.sheetsByIndex[0];
```

## Properties

### Basic Document Properties

Basic properties about the document are loaded only after you call call `doc.loadInfo()` and are kept up to date as further interactions are made with the API. These properties are not editable directly. Instead to update them, use the `doc.updateProperties()` method

See [official google docs](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#spreadsheetproperties) for more details.

Property|Type|Description
---|---|---
`spreadsheetId`|String|Document ID<br>_set during initialization, not editable_
`title`|String|Document title
`locale`|String|Document locale/language<br>_ISO code - ex: "en", "en\_US"_
`timeZone`|String|Document timezone<br>_CLDR format - ex: "America/New\_York", "GMT-07:00"_
`autoRecalc`|String<br>_enum_|See [RecalculationInterval](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#RecalculationInterval)
`defaultFormat`|Object|See [CellFormat](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat)
`spreadsheetTheme`|Object|See [SpreadsheetTheme](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#SpreadsheetTheme)
`iterativeCalculationSettings`|Object|See [IterativeCalculationSettings](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#iterativecalculationsettings)

### Worksheets

The child worksheets (each an instance of [`GoogleSpreadsheetWorksheet`](classes/google-spreadsheet-worksheet)) in the document are also loaded once `loadInfo()` is called and can be accessed using these read-only properties of the document.

Property|Type|Description
---|---|---
`sheetsById`| `{ [sheetId: number]: GoogleSpreadsheetWorksheet }` | Child worksheets, keyed by their `sheetId`
`sheetsByTitle`| `{ [title: string]: GoogleSpreadsheetWorksheet }` | Child worksheets keyed by their `title`<br/>_⚠️ beware of title conflicts_
`sheetsByIndex`| `GoogleSpreadsheetWorksheet[]` |Array of sheets, ordered by their index<br>_this is the order they appear in the Google sheets UI_
`sheetCount`| `number` |Count of child worksheets<br>_same as `doc.sheetsByIndex.length`_


## Methods

### Basic info

#### `loadInfo()` (async) :id=fn-loadInfo
> Load basic document props and child sheets

- ✨ **Side Effects -** props are populated, sheets are populated

#### `updateProperties(props)` (async) :id=fn-updateProperties
> Update basic document properties

Param|Type|Required|Description
---|---|---|---
`props`|Object|-|properties to update<br/>See [basic document properties](#basic-document-properties) above for props documentation.


- ✨ **Side Effects -** props are updated


#### `resetLocalCache()` :id=fn-resetLocalCache
> Clear local cache of properties and sheets

You must call `loadInfo()` again to re-load the properties and sheets

- ✨ **Side Effects -** basic props and sheets are gone


### Managing Sheets

#### `addSheet(props)` (async) :id=fn-addSheet
> Add a new worksheet to the document

Param|Type|Required|Description
---|---|---|---
`props`|Object|-|Object of all sheet properties
`props.sheetId`|Number<br>_positive int_|-|Sheet ID, cannot be chagned after setting<br>_easiest to just let google handle it_
`props.headerValues`|[String]|-|Sets the contents of the first row, to be used in row-based interactions
`props.headerRowIndex`|Number|-|Set custom header row index (1-indexed)<br>_defaults to 1 (first)_
`props.[more]`|...|-|_See [GoogleSpreadsheetWorksheet](classes/google-spreadsheet-worksheet#basic-document-properties) for more props_


- ↩️ **Returns** - [GoogleSpreadsheetWorksheet](classes/google-spreadsheet-worksheet) (in a promise)
- ✨ **Side effects** - new sheet is now avilable via sheet getters (`doc.sheetsByIndex`, `doc.sheetsById`, `doc.sheetsByTitle`)

_Also available as `addWorksheet()`_


#### `deleteSheet(sheetId)` (async) :id=fn-deleteSheet
> Delete a worksheet from the document

Param|Type|Required|Description
---|---|---|---
`sheetId`|String|✅|ID of the sheet to remove

- ✨ **Side effects** - sheet is removed and no longer avaialable via sheet getters (`doc.sheetsByIndex`, `doc.sheetsById`, `doc.sheetsByTitle`)

?> **TIP** - Usually easier to use GoogleSpreadsheetWorksheet instance method `delete()`


### Named Ranges

#### `addNamedRange(name, range, rangeId)` (async) :id=fn-addNamedRange
> Add a new named range to the document

Param|Type|Required|Description
---|---|---|---
`name`|String|✅|Name of the range<br>_used in formulas to refer to it_
`range`|String or Object|✅|A1 range or [GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#gridrange) object
`rangeId`|String|-|ID to use<br>_autogenerated by google if empty_

#### `deleteNamedRange(rangeId)` (async) :id=fn-deleteNamedRange
> Delete a named range from the document

Param|Type|Required|Description
---|---|---|---
`rangeId`|String|✅|ID of the range to remove



### Exports

See [Exports guide](guides/exports) for more info.

#### `downloadAsHTML(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsHTML
> Export entire document in HTML format (zip file)

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer<br/>_See [Exports guide](guides/exports) for more details_

- ↩️ **Returns** - Buffer (or stream) containing HTML data (in a zip file)


#### `downloadAsXLSX(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsXLSX
> Export entire document in XLSX (excel) format

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer<br/>_See [Exports guide](guides/exports) for more details_

- ↩️ **Returns** - Buffer (or stream) containing XLSX data


#### `downloadAsODS(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsODS
> Export entire document in ODS (Open Document Format) format

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer<br/>_See [Exports guide](guides/exports) for more details_

- ↩️ **Returns** - Buffer (or stream) containing ODS data

### Deletion
#### `delete()` (async) :id=fn-delete
> delete the document

NOTE - requires drive scopes


### Sharing / Permissions

NOTE - to deal with permissions, you must include Drive API scope(s) when setting up auth
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.file`

#### `listPermissions()` (async) :id=fn-listPermissions
> list all permissions entries for doc

- ↩️ **Returns** - `Promise<PermissionsList>`

```js
const permissions = await doc.listPermissions();
```

#### `setPublicAccessLevel(role)` (async) :id=fn-setPublicAccessLevel
> list all permissions entries for doc

Param|Type|Required|Description
---|---|---|---
`role`|`false` or `'writer'` or `'commenter'` or `'reader'`|✅|

Possible roles:
- `false` - revoke all public access
- `'writer'` - anyone* with the link can edit the document
- `'commenter'` - anyone* with the link can comment on the document
- `'reader'` - anyone with the link can read the document

> * - users will still need to be logged in, even though not explicitly granted any access 



#### `share(emailAddressOrDomain, options?)` (async) :id=fn-share
> list all permissions entries for doc

Param|Type|Required|Description
---|---|---|---
`emailAddressOrDomain`|string|✅|email or domain to share
`options`|object|-|
`options.role`|string|-|set to role
`options.isGroup`|boolean|-|set to true if sharing with an email that refers to a group
`options.emailMessage`|false or string|-|leave empty to send default message<br/>set to a string to include special messsage in email<br/>set to false to disable email notificaiton entirely


Possible roles:
- `owner` - transfers ownership. Only valid for single users (not groups or domains)
- `writer` - allows writing, commenting, reading
- `commenter` - allows reading and commenting
- `reader` - allows reading only
