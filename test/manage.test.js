const { GoogleSpreadsheetWorksheet } = require('../index.js');

const docs = require('./load-test-docs')();
const creds = require('./service-account-creds.json');

const doc = docs.private;

describe('Managing doc info and sheets', () => {
  beforeAll(async () => {
    await doc.useServiceAccountAuth(creds);
  });

  describe('accessing and updating document properties', () => {
    it('accessing properties throws an error if info not fetched yet', async () => {
      expect(() => doc.title).toThrow();
    });

    it('can load the doc info', async () => {
      await doc.getInfo();
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

    it('throws an error if updating title directly', async () => {
      expect(() => { doc.title = 'new title'; }).toThrow();
    });

    it('can update the title using updateProperties', async () => {
      const oldTitle = doc.title;
      const newTitle = `${doc.title} updated @ ${+new Date()}`;
      await doc.updateProperties({ title: newTitle });
      expect(doc.title).toBe(newTitle);

      // make sure the update actually stuck
      doc.resetLocalCache();
      await doc.getInfo();
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
      sheet = await doc.addWorksheet({
        title: newSheetTitle,
        gridProperties: {
          rowCount: 7,
          columnCount: 11,
        },
        headers: ['col1', 'col2', 'col3', 'col4', 'col5'],
      });

      expect(sheet.title).toBe(newSheetTitle);
    });

    it('check the sheet is actually there', async () => {
      doc.resetLocalCache();
      await doc.getInfo(); // re-fetch
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
      sheet = await doc.addSheet({});
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
      await doc.getInfo();
      expect(sheet.title).toBe(newTitle);
    });

    it('can resize a sheet', async () => {
      // cannot update directly
      expect(() => { sheet.rowCount = 77; }).toThrow();
      await sheet.resize({ rowCount: 77, columnCount: 44 });
      expect(sheet.rowCount).toBe(77);
      sheet.resetLocalCache();
      await doc.getInfo();
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
      await doc.getInfo();
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
      await doc.getInfo();
      expect(doc.sheetsByIndex.length).toBe(numSheets);
    });
  });

  describe('copying a sheet to another document', () => {
    let sheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Sheet to copy ${+new Date()}`,
        headers: ['copy', 'this', 'sheet'],
      });
    });
    afterAll(async () => {
      sheet.delete();
    });

    it('should fail without proper permissions', async () => {
      const newDocId = docs.privateReadOnly.spreadsheetId;
      await expect(sheet.copyToSpreadsheet(newDocId)).rejects.toThrow('403');
    });

    it('can copy the sheet to another doc', async () => {
      await sheet.copyToSpreadsheet(docs.public.spreadsheetId);

      await docs.public.useServiceAccountAuth(creds);
      await docs.public.getInfo();

      // check title and content (header row)
      const copiedSheet = docs.public.sheetsByIndex.splice(-1)[0];
      expect(copiedSheet.title).toBe(`Copy of ${sheet.title}`);
      await copiedSheet.loadHeaderRow();
      expect(copiedSheet.headers).toEqual(sheet.headers);
      await copiedSheet.delete();
    });
  });
});
