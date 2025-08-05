# Exporting Data

The Google sheets UI lets you export your document in various formats by navigating to the `File > Download` menu.

Some of these formats export the entire document, while others are only a single sheet (the sheet you are currently viewing).

These are the available formats:

File Type|File Extension|Contents|Method
---|---|---|---
Web Page | zip > html+css | document | [`doc.downloadAsHTML()`](classes/google-spreadsheet?id=fn-downloadAsHTML) 
Microsoft Excel | xlsx | document | [`doc.downloadAsXLSX()`](classes/google-spreadsheet?id=fn-downloadAsXLSX)
OpenDocument | ods | document | [`doc.downloadAsODS()`](classes/google-spreadsheet?id=fn-downloadAsODS)
Comma Separated Values | csv | worksheet | [`sheet.downloadAsCSV()`](classes/google-spreadsheet-worksheet?id=fn-downloadAsCSV)
Tab Separated Values | tsv | worksheet | [`sheet.downloadAsTSV()`](classes/google-spreadsheet-worksheet?id=fn-downloadAsTSV)
PDF | pdf | worksheet | [`sheet.downloadAsPDF()`](/classes/google-spreadsheet-worksheet?id=fn-downloadAsPDF)


All of these methods by default fetch an ArrayBuffer, but can be passed an optional parameter to return a stream instead.

## ArrayBuffer mode (default)

This means you are dealing with the entire document at once. Usually you'd want to write this to a file, for example:

```javascript
  const doc = new GoogleSpreadsheet('<YOUR-DOC-ID>', auth);

  const xlsxBuffer = await doc.downloadAsXLSX();
  await fs.writeFile('./my-export.xlsx', Buffer.from(xlsxBuffer));
```

## Stream mode

Dealing with [streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) means you are dealing with a stream of data rather than the entire file at once. This can be useful to do things like upload the file to somewhere else without saving it locally first, or to handle a large CSV when you want to do something else with each entry.

This example doesn't get into the details of using streams, but this simple example should at least get you started:

```javascript
  import { Readable } from 'node:stream';

  // ...
  const doc = new GoogleSpreadsheet('<YOUR-DOC-ID>', auth);

  const csvStream = await doc.downloadAsCSV(true); // this `true` arg toggles to stream mode
  const writableStream = fs.createWriteStream('./my-export-stream.csv');
  writableStream.on('finish', () => {
    console.log('done');
  });
  writableStream.on('error', (err) => {
    console.log(err);
  });

  // convert the ReadableStream (web response) to a normal Node.js stream
  // and pipe to the fs writable stream
  Readable.fromWeb(csvStream).pipe(writableStream);
```

