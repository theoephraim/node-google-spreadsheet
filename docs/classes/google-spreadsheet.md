_Class Reference_

# GoogleSpreadsheet

> **This class represents an entire google spreadsheet document**
  <br>
  Provides methods to interact with document metadata/settings, formatting, manage sheets, and acts as the main gateway to interacting with sheets and data that the document contains.

## Initialization

`new GoogleSpreadsheet(spreadsheetId);`

Param|Type|Description
---|---|---
`spreadsheetId`|String|Document ID from the URL of the spreadsheet

## Properties

### Basic Document Properties

Basic properties about the document are loaded only after you call call `doc.loadInfo()` and are kept up to date as further interactions are made with the API. These properties are not editable directly. Instead to update them, use the `doc.updateProperties()` method

See [official google docs](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#spreadsheetproperties) for more details.

Property|Type|Description
---|---|---
`spreadsheetId`|String|Document ID<br>_set during initialization, not editable_
`title`|String|Document title
`locale`|String|Document locale/language<br>_ISO code - ex: "en", "en_US"_
`timeZone`|String|Document timezone<br>_CLDR format - ex: "America/New_York", "GMT-07:00"_
`autoRecalc`|String<br>_enum_|See [RecalculationInterval](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#RecalculationInterval)
`defaultFormat`|Object|See [CellFormat](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat)
`spreadsheetTheme`|Object|See [SpreadsheetTheme](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#SpreadsheetTheme)
`iterativeCalculationSettings`|Object|See [IterativeCalculationSettings](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#iterativecalculationsettings)

### Worksheets

The child worksheets (each an instance of [`GoogleSpreadsheetWorksheet`](classes/google-spreadsheet-worksheet)) in the document are also loaded once `loadInfo()` is called and can be accessed using these read-only properties of the document.

Property|Type|Description
---|---|---
`sheetsById`|Object|Child worksheets, keyed by their `sheetId`
`sheetsByTitle`|Object|Child worksheets keyed by their `title` - beware of title conflicts
`sheetsByIndex`|[[GoogleSpreadsheetWorksheet](classes/google-spreadsheet-worksheet)]|Array of sheets, ordered by their index<br>_this is the order they appear in the Google sheets UI_
`sheetCount`|Number|Count of child worksheets<br>_same as `doc.sheetsByIndex.length`_


## Methods


### Authentication

#### `useServiceAccountAuth(creds)` (async) :id=fn-useServiceAccountAuth
> Initialize JWT-style auth for [google service account](https://cloud.google.com/iam/docs/service-accounts)

Param|Type|Required|Description
---|---|---|---
`creds`|Object|✅|Object containing credendtials from google for your service account<br>_usually just `require` the json file google gives you_
`creds.client_email`|String<br>_email_|✅|The email of your service account
`creds.private_key`|String|✅|The private key for your service account

- ✨ **Side effects** - all requests will now authenticate using these credentials

> See [Getting Started > Authentication](getting-started/authentication) for more details


#### `useApiKey(key)` :id=fn-useApiKey
> Set API-key to use for auth - only allows read-only access to public docs

Param|Type|Required|Description
---|---|---|---
`key`|String|✅|API key for your google project

- ✨ **Side effects** - all requests will now authenticate using this api key only

> See [Getting Started > Authentication](getting-started/authentication) for more details

#### `useRawAccessToken(token)` :id=fn-useRawAccessToken
> Set token to use for auth - managed elsewhere

Param|Type|Required|Description
---|---|---|---
`token`|String|✅|Oauth token to use

- ✨ **Side effects** - all requests will now authenticate using this api key only

!> This assumes you are creating and managing/refreshing the token yourself. Deeper oauth support coming soon...

### Basic info

#### `loadInfo()` (async) :id=fn-loadInfo
> Load basic document props and child sheets

- ✨ **Side Effects -** props are populated, sheets are populated

#### `updateProperties(props)` (async) :id=fn-updateProperties
> Update basic document properties

Just set keys on the `props` object and those properties will be updated on the doc. For example:
```javascript
await doc.updateProperties({ title: 'New title' });
```
See [basic document properties](#basic-document-properties) above for props documentation.

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


