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


### Creating a new document
Normally you will be working with an existing spreasheet document. However if you need to create a new one, you can accomplish this by initializing the GoogleSpreadsheet object without an id, initializing your preferred auth method, and then calling the following method.

As this will create the document owned by the auth method you are using (which is often a service account), it may not be accessible to your google account. Therefore if it recommended to create documents ahead of time if possible rather than using this method.

#### `createNewSpreadsheetDocument(properties)` :id=fn-createNewSpreadsheetDocument
> Create a new google spreadsheet document

!> You must initialize the GoogleSpreadsheet without an id in order to call this method

Param|Type|Required|Description
---|---|---|---
`properties`|Object|-|Properties to use when creating the new doc

See [basic document properties](#basic-document-properties) above for props documentation.

- 🚨 **Warning** - The document will be owned by the authenticated user, which is a service account, may not be accessible to you personally.
- ✨ **Side effects** - all info (including `spreadsheetId`) and sheets loaded as if you called [`loadInfo()`](#fn-loadInfo)

```javascript
const doc = new GoogleSpreadsheet();
await doc.useServiceAccountAuth(creds);
await doc.createNewSpreadsheetDocument({ title: 'This is a new doc' });
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
`sheetsById`|Object|Child worksheets, keyed by their `sheetId`
`sheetsByTitle`|Object|Child worksheets keyed by their `title` - beware of title conflicts
`sheetsByIndex`|[[GoogleSpreadsheetWorksheet](classes/google-spreadsheet-worksheet)]|Array of sheets, ordered by their index<br>_this is the order they appear in the Google sheets UI_
`sheetCount`|Number|Count of child worksheets<br>_same as `doc.sheetsByIndex.length`_


## Methods


### Authentication

#### `useServiceAccountAuth(creds, impersonateAs)` (async) :id=fn-useServiceAccountAuth
> Initialize JWT-style auth for [google service account](https://cloud.google.com/iam/docs/service-accounts)

Param|Type|Required|Description
---|---|---|---
`creds`|Object|✅|Object containing credentials from google for your service account<br>_usually just `require` the json file google gives you_
`creds.client_email`|String<br>_email_|✅|The email of your service account
`creds.private_key`|String|✅|The private key for your service account
`impersonateAs`|String<br>_email_|-|Email of user to impersonate instead of authing as service account (only possible if service account has domain-wide delegation enabled)


- ✨ **Side effects** - all requests will now authenticate using these credentials

> See [Getting Started > Authentication > Service Account](getting-started/authentication#service-account) for more details

#### `useApiKey(key)` :id=fn-useApiKey
> Set API-key to use for auth - only allows read-only access to public docs

Param|Type|Required|Description
---|---|---|---
`key`|String|✅|API key for your google project

- ✨ **Side effects** - all requests will now authenticate using this api key only

> See [Getting Started > Authentication > API Key](getting-started/authentication#api-key) for more details


#### `useOAuth2Client(oAuth2Client)` :id=fn-useOAuth2Client
> Use [Google's OAuth2Client](https://github.com/googleapis/google-auth-library-nodejs#oauth2) to authenticate on behalf of a user

Param|Type|Required|Description
---|---|---|---
`oAuth2Client`|OAuth2Client|✅|Configured OAuth2Client

- ✨ **Side effects** - requests will use oauth access token to authenticate requests. New access token will be generated if token is expired.

> See [Getting Started > Authentication > OAuth 2.0](getting-started/authentication#oauth) for more details


#### `useRawAccessToken(token)` :id=fn-useRawAccessToken
> Set raw token to use for auth - managed elsewhere

Param|Type|Required|Description
---|---|---|---
`token`|String|✅|Oauth token to use

- ✨ **Side effects** - all requests will now authenticate using this api key only

!> This assumes you are creating and managing/refreshing the token yourself




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



### Export

#### `downloadAsHTML(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsHTML
> Export entire document in HTML format (zip file)

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer

- ↩️ **Returns** - Buffer (or stream) containing HTML data (in a zip file)


#### `downloadAsXLSX(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsXLSX
> Export entire document in XLSX (excel) format

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer

- ↩️ **Returns** - Buffer (or stream) containing XLSX data


#### `downloadAsODS(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsODS
> Export entire document in ODS (Open Document Format) format

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer

- ↩️ **Returns** - Buffer (or stream) containing ODS data

