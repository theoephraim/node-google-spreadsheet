# Exporting Data

The Google sheets UI lets you export your document in various formats by navigating to the `File > Download` menu.

Some of these formats export the entire document, while others are only a single sheet (the sheet you are currently viewing).

These are the available formats:

File Type|File Extension|Full Document|Method|Notes
---|---|---|---|---
Web Page | zip | ✅ | [`doc.downloadAsHTML()`](classes/google-spreadsheet?id=fn-downloadAsHTML) | _unzips to folder containing html file(s)_
Microsoft Excel | xlsx | ✅ | [`doc.downloadAsXLSX()`](classes/google-spreadsheet?id=fn-downloadAsXLSX) |
OpenDocument | ods | ✅ | [`doc.downloadAsODS()`](classes/google-spreadsheet?id=fn-downloadAsODS) |
Comma Separated Values | csv | | [`sheet.downloadAsCSV()`](classes/google-spreadsheet-worksheet?id=fn-downloadAsCSV) |
Tab Separated Values | tsv | | [`sheet.downloadAsTSV()`](classes/google-spreadsheet-worksheet?id=fn-downloadAsTSV) |
PDF | pdf |  | [`sheet.downloadAsPDF()`](/classes/google-spreadsheet-worksheet?id=fn-downloadAsPDF) | 


All of these methods by default fetch an ArrayBuffer, but can be passed an optional parameter to return a stream instead.

## ArrayBuffer mode (default)
```javascript
  const doc = new GoogleSpreadsheet('<YOUR-DOC-ID>', auth);

  const xlsxBuffer = await doc.downloadAsXLSX();
  await fs.writeFile('./my-export.xlsx', Buffer.from(xlsxBuffer));
```

## Stream mode

Dealing with streams can be useful to do things like upload the file directly to somewhere else, or to handle a large CSV.

This example doesn't get into the details, but this simple example should at least get you started.

```javascript
  const doc = new GoogleSpreadsheet('<YOUR-DOC-ID>', auth);

  const csvStream = await doc.downloadAsCSV(true);
  const writableStream = fs.createWriteStream('./my-export-stream.csv');
  
  writableStream.on('finish', () => {
    console.log('done');
  });
  writableStream.on('error', (err) => {
    console.log(err);
  });

  csvStream.pipe(writableStream);
```

