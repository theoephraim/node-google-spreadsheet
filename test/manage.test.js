const delay = require('delay');
const _ = require('lodash');

const { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } = require('../index');

const docs = require('./load-test-docs')();
const creds = require('./service-account-creds.json');

const doc = docs.private;

describe('Managing doc info and sheets', () => {
  beforeAll(async () => {
    await doc.useServiceAccountAuth(creds);
  });

  // hitting rate limits when running tests on ci - so we add a short delay
  if (process.env.NODE_ENV === 'ci') afterEach(async () => delay(500));

  /* eslint-disable jest/no-commented-out-tests */
  // uncomment temporarily to clear out all the sheets in the test doc
  // it.only('clear out all the existing sheets', async () => {
  //   await doc.loadInfo();
  //   // delete all sheets after the first
  //   for (const sheet of doc.sheetsByIndex.slice(1)) await sheet.delete();
  // });

  describe('accessing and updating document properties', () => {
    it('accessing properties throws an error if info not fetched yet', async () => {
      expect(() => doc.title).toThrow();
    });

    it('can load the doc info', async () => {
      await doc.loadInfo();
    });

    it('should include the document title', async () => {
      expect(doc.title).toBeTruthy();
    });

    it('should include worksheet info and instantiate them', async () => {
      expect(doc.sheetsByIndex.length > 0).toBeTruthy();
      expect(doc.sheetsByIndex[0]).toBeInstanceOf(GoogleSpreadsheetWorksheet);
      const sheet = doc.sheetsByIndex[0];
      expect(sheet.title).toBeTruthy();
      expect(sheet.rowCount > 0).toBeTruthy();
      expect(sheet.columnCount > 0).toBeTruthy();
    });

    it('can find a sheet by title', async () => {
      expect(_.values(doc.sheetsByIndex).length > 0).toBeTruthy();
      const sheet = doc.sheetsByIndex[0];
      expect(doc.sheetsByTitle[sheet.title]).toEqual(sheet);
    });

    it('throws an error if updating title directly', async () => {
      expect(() => { doc.title = 'new title'; }).toThrow();
    });

    it('can update the title using updateProperties', async () => {
      const oldTitle = doc.title;
      const newTitle = `node-google-spreadsheet test - private (updated @ ${+new Date()})`;
      await doc.updateProperties({ title: newTitle });
      expect(doc.title).toBe(newTitle);

      // make sure the update actually stuck
      doc.resetLocalCache();
      await doc.loadInfo();
      expect(doc.title).toBe(newTitle);

      // set the title back
      await doc.updateProperties({ title: oldTitle });
    });

    // TODO: check ability to update other properties?
  });

  describe('adding and updating sheets', () => {
    const newSheetTitle = `Test sheet ${+new Date()}`;
    let sheet;

    afterAll(async () => {
      if (sheet) await sheet.delete();
    });

    it('can add a sheet', async () => {
      const numSheets = doc.sheetCount;
      sheet = await doc.addWorksheet({
        title: newSheetTitle,
        gridProperties: {
          rowCount: 7,
          columnCount: 11,
        },
        headerValues: ['col1', 'col2', 'col3', 'col4', 'col5'],
      });
      expect(doc.sheetCount).toBe(numSheets + 1);

      expect(sheet.title).toBe(newSheetTitle);
    });

    it('check the sheet is actually there', async () => {
      doc.resetLocalCache();
      await doc.loadInfo(); // re-fetch
      const newSheet = doc.sheetsByIndex.pop();
      expect(newSheet.title).toBe(sheet.title);
      expect(newSheet.rowCount).toBe(sheet.rowCount);
      expect(newSheet.columnCount).toBe(sheet.columnCount);
    });

    it('check the headers', async () => {
      await sheet.loadHeaderRow();
      expect(sheet.headerValues.length).toBe(5);
      expect(sheet.headerValues[0]).toBe('col1');
      expect(sheet.headerValues[4]).toBe('col5');
    });

    it('clears the rest of the header row when setting headers', async () => {
      await sheet.setHeaderRow(['newcol1', 'newcol2']);
      expect(sheet.headerValues.length).toBe(2);
    });
  });

  describe('updating sheet properties', () => {
    let sheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({ title: `Spécial CнArs - ${+new Date()}` });
    });
    afterAll(async () => {
      await sheet.delete();
    });

    it('throws an error if updating title directly', async () => {
      expect(() => { sheet.title = 'new title'; }).toThrow();
    });

    it('can update the title using updateProperties', async () => {
      const newTitle = `${sheet.title} updated @ ${+new Date()}`;
      await sheet.updateProperties({ title: newTitle });
      expect(sheet.title).toBe(newTitle);

      // make sure the update actually stuck
      sheet.resetLocalCache();
      await doc.loadInfo();
      expect(sheet.title).toBe(newTitle);
    });

    it('can resize a sheet', async () => {
      // cannot update directly
      expect(() => { sheet.rowCount = 77; }).toThrow();
      await sheet.resize({ rowCount: 77, columnCount: 44 });
      expect(sheet.rowCount).toBe(77);
      sheet.resetLocalCache();
      await doc.loadInfo();
      expect(sheet.rowCount).toBe(77);
    });

    it('can clear sheet data', async () => {
      await sheet.setHeaderRow(['some', 'data', 'to', 'clear']);
      await sheet.loadCells();
      expect(sheet.cellStats.nonEmpty).toBe(4);
      await sheet.clear();
      await sheet.loadCells();
      expect(sheet.cellStats.nonEmpty).toBe(0);
    });
  });

  describe('deleting a sheet', () => {
    let sheet;
    let numSheets;

    it('can remove a sheet', async () => {
      await doc.loadInfo();
      numSheets = doc.sheetsByIndex.length;

      sheet = await doc.addWorksheet({
        title: `please delete me ${+new Date()}`,
      });
      expect(doc.sheetsByIndex.length).toBe(numSheets + 1);

      await sheet.delete();
      expect(doc.sheetsByIndex.length).toBe(numSheets);
    });

    it('check the sheet is really gone', async () => {
      doc.resetLocalCache();
      await doc.loadInfo();
      expect(doc.sheetsByIndex.length).toBe(numSheets);
    });
  });

  describe('duplicating a sheet within the same document', () => {
    let sheet;
    let duplicateSheet;
    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Sheet to duplicate ${+new Date()}`,
        headerValues: ['duplicate', 'this', 'sheet'],
      });
    });
    afterAll(async () => {
      await sheet.delete();
      await duplicateSheet.delete();
    });

    it('can duplicate the sheet within the same doc', async () => {
      const existingSheetIndex = sheet.index;

      const newTitle = `duplicated ${+new Date()}`;
      duplicateSheet = await sheet.duplicate({
        title: newTitle,
      });

      expect(duplicateSheet.title).toEqual(newTitle);
      expect(doc.sheetsByIndex[0]).toEqual(duplicateSheet);

      expect(sheet.index).toEqual(existingSheetIndex + 1);
    });
  });

  describe('copying a sheet to another document', () => {
    let sheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Sheet to copy ${+new Date()}`,
        headerValues: ['copy', 'this', 'sheet'],
      });
    });
    afterAll(async () => {
      await sheet.delete();
    });

    it('should fail without proper permissions', async () => {
      const newDocId = docs.privateReadOnly.spreadsheetId;
      await expect(sheet.copyToSpreadsheet(newDocId)).rejects.toThrow('403');
    });

    it('can copy the sheet to another doc', async () => {
      await sheet.copyToSpreadsheet(docs.public.spreadsheetId);

      await docs.public.useServiceAccountAuth(creds);
      await docs.public.loadInfo();

      // check title and content (header row)
      const copiedSheet = docs.public.sheetsByIndex.splice(-1)[0];
      expect(copiedSheet.title).toBe(`Copy of ${sheet.title}`);
      await copiedSheet.loadHeaderRow();
      expect(copiedSheet.headerValues).toEqual(sheet.headerValues);
      await copiedSheet.delete();
    });
  });

  describe('creating a new document', () => {
    let newDoc;

    afterAll(async () => {
      await newDoc.delete();
    });

    it('should fail if GoogleSpreadsheet was initialized with an ID', async () => {
      newDoc = new GoogleSpreadsheet('someid');
      await expect(newDoc.createNewSpreadsheetDocument()).rejects.toThrow();
    });
    it('should fail without auth', async () => {
      newDoc = new GoogleSpreadsheet();
      await expect(newDoc.createNewSpreadsheetDocument()).rejects.toThrow();
    });
    it('should create a new sheet', async () => {
      newDoc = new GoogleSpreadsheet();
      newDoc.useServiceAccountAuth(creds);
      const newTitle = `New doc ${+new Date()}`;
      await newDoc.createNewSpreadsheetDocument({ title: newTitle });
      expect(newDoc.title).toEqual(newTitle);
      expect(newDoc.sheetsByIndex.length > 0).toBeTruthy();
      expect(newDoc.sheetsByIndex[0]).toBeInstanceOf(GoogleSpreadsheetWorksheet);
    });
  });

  describe('insertDimension - inserting columns/rows into a sheet', () => {
    let sheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Insert dimension test ${+new Date()}`,
        headerValues: ['a', 'b'],
      });
      await sheet.addRows([
        { a: 'a1', b: 'b1' },
        { a: 'a2', b: 'b2' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    // TODO: add error checking tests

    it('Should insert a new empty rows at index', async () => {
      // should insert 2 rows in between the first and second row of data (first row is header)
      await sheet.insertDimension('ROWS', { startIndex: 2, endIndex: 4 });

      // read rows and check it did what we expected
      const rows = await sheet.getRows();
      // header row
      expect(rows[0].a).toEqual('a1');
      expect(rows[0].b).toEqual('b1');
      expect(rows[1].a).toBeUndefined();
      expect(rows[1].b).toBeUndefined();
      expect(rows[2].a).toBeUndefined();
      expect(rows[2].b).toBeUndefined();
      expect(rows[3].a).toEqual('a2');
      expect(rows[3].b).toEqual('b2');
    });
  });
});
