import 'dmno/auto-inject-globals';
import {
  describe, expect, it, beforeAll, afterAll, afterEach,
} from 'vitest';
import delay from 'delay';
import * as _ from '../lib/lodash';

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from '..';

import { DOC_IDS, testServiceAccountAuth } from './auth/docs-and-auth';

const doc = new GoogleSpreadsheet(DOC_IDS.private, testServiceAccountAuth);

// TODO: reorganize some of this?

describe('Managing doc info and sheets', () => {
  describe('creation and deletion', () => {
    let spreadsheetId: string;
    const title = `new sheet - ${+new Date()}`;
    it('can create a new document', async () => {
      const newDoc = await GoogleSpreadsheet.createNewSpreadsheetDocument(testServiceAccountAuth, { title });
      expect(newDoc.title).toEqual(title);
      spreadsheetId = newDoc.spreadsheetId;
    });
    it('confirm the document exists', async () => {
      const newDoc = new GoogleSpreadsheet(spreadsheetId, testServiceAccountAuth);
      await newDoc.loadInfo();
      expect(newDoc.title).toEqual(title);
    });
    it('can delete the document', async () => {
      const newDoc = new GoogleSpreadsheet(spreadsheetId, testServiceAccountAuth);
      await newDoc.delete();
    });
    it('deleting the document twice fails', async () => {
      const newDoc = new GoogleSpreadsheet(spreadsheetId, testServiceAccountAuth);
      await expect(newDoc.delete()).rejects.toThrow('404');
    });
  });

  // beforeAll(async () => {
  //   // TODO: do something to trigger auth refresh?
  // });

  // hitting rate limits when running tests on ci - so we add a short delay
  if (DMNO_CONFIG.TEST_DELAY) afterEach(async () => delay(DMNO_CONFIG.TEST_DELAY));

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
      expect(() => { (doc as any).title = 'new title'; }).toThrow();
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
    let sheet: GoogleSpreadsheetWorksheet;

    afterAll(async () => {
      if (sheet) await sheet.delete();
    });

    it('can add a sheet', async () => {
      const numSheets = doc.sheetCount;
      sheet = await doc.addSheet({
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
      if (!newSheet) throw new Error('Expected to find new sheet');
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
    let sheet: GoogleSpreadsheetWorksheet;

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
      expect(() => { (sheet as any).rowCount = 77; }).toThrow();
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

  describe('data validation rules', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({ title: `validation rules test ${+new Date()}` });
    });
    afterAll(async () => {
      await sheet.delete();
    });


    it('can set data validation', async () => {
      // add a dropdown; ref: https://stackoverflow.com/a/43442775/3068233
      await sheet.setDataValidation(
        {
          startRowIndex: 2,
          endRowIndex: 100,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              {
                userEnteredValue: 'YES',
              },
              {
                userEnteredValue: 'NO',
              },
              {
                userEnteredValue: 'MAYBE',
              },
            ],
          },
          showCustomUi: true,
          strict: true,
        }
      );
    });

    it('can clear a data validation', async () => {
      await sheet.setDataValidation(
        {
          startRowIndex: 2,
          endRowIndex: 100,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        false
      );
    });
  });

  describe('deleting a sheet', () => {
    let sheet: GoogleSpreadsheetWorksheet;
    let numSheets: number;

    it('can remove a sheet', async () => {
      await doc.loadInfo();
      numSheets = doc.sheetsByIndex.length;

      sheet = await doc.addSheet({
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
    let sheet: GoogleSpreadsheetWorksheet;
    let duplicateSheet: GoogleSpreadsheetWorksheet;
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
    let sheet: GoogleSpreadsheetWorksheet;

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
      const newDocId = DOC_IDS.privateReadOnly;
      await expect(sheet.copyToSpreadsheet(newDocId)).rejects.toThrow('403');
    });

    it('can copy the sheet to another doc', async () => {
      await sheet.copyToSpreadsheet(DOC_IDS.public);

      const publicDoc = new GoogleSpreadsheet(DOC_IDS.public, testServiceAccountAuth);
      await publicDoc.loadInfo();
      // check title and content (header row)
      const copiedSheet = publicDoc.sheetsByIndex.splice(-1)[0];
      expect(copiedSheet.title).toBe(`Copy of ${sheet.title}`);
      await copiedSheet.loadHeaderRow();
      expect(copiedSheet.headerValues).toEqual(sheet.headerValues);
      await copiedSheet.delete();
    });
  });

  describe('creating a new document', () => {
    let newDoc: GoogleSpreadsheet;

    afterAll(async () => {
      await newDoc.delete();
    });

    it('should fail without auth', async () => {
      // @ts-ignore
      await expect(GoogleSpreadsheet.createNewSpreadsheetDocument()).rejects.toThrow();
    });
    it('should create a new sheet', async () => {
      const newTitle = `New doc ${+new Date()}`;
      newDoc = await GoogleSpreadsheet.createNewSpreadsheetDocument(testServiceAccountAuth, { title: newTitle });
      expect(newDoc.title).toEqual(newTitle);
      expect(newDoc.sheetsByIndex.length > 0).toBeTruthy();
      expect(newDoc.sheetsByIndex[0]).toBeInstanceOf(GoogleSpreadsheetWorksheet);
    });
  });

  describe('insertDimension - inserting columns/rows into a sheet', () => {
    let sheet: GoogleSpreadsheetWorksheet;

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
      const rows = await sheet.getRows<{
        a: string,
        b: string,
      }>();
      // header row
      expect(rows[0].get('a')).toEqual('a1');
      expect(rows[0].get('b')).toEqual('b1');
      expect(rows[1].get('a')).toBeUndefined();
      expect(rows[1].get('b')).toBeUndefined();
      expect(rows[2].get('a')).toBeUndefined();
      expect(rows[2].get('b')).toBeUndefined();
      expect(rows[3].get('a')).toEqual('a2');
      expect(rows[3].get('b')).toEqual('b2');
    });
  });
});
