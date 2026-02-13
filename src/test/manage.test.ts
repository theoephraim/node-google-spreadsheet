import {
  describe, expect, it, beforeAll, afterAll, afterEach,
} from 'vitest';
import { setTimeout as delay } from 'timers/promises';
import { ENV } from 'varlock/env';
import * as _ from '../lib/toolkit';

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
  if (ENV.TEST_DELAY) afterEach(async () => delay(ENV.TEST_DELAY));

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

    it('can freeze and unfreeze rows and columns', async () => {
      await sheet.updateGridProperties({
        frozenRowCount: 2,
        frozenColumnCount: 1,
      });
      expect(sheet.gridProperties.frozenRowCount).toBe(2);
      expect(sheet.gridProperties.frozenColumnCount).toBe(1);

      // unfreeze
      await sheet.updateGridProperties({
        frozenRowCount: 0,
        frozenColumnCount: 0,
      });
      // Google API omits 0/default values from responses, so these come back as undefined
      expect(sheet.gridProperties.frozenRowCount).toBeFalsy();
      expect(sheet.gridProperties.frozenColumnCount).toBeFalsy();

      // verify it persisted
      sheet.resetLocalCache();
      await doc.loadInfo();
      expect(sheet.gridProperties.frozenRowCount).toBeFalsy();
      expect(sheet.gridProperties.frozenColumnCount).toBeFalsy();
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

  describe('deleteDimension - deleting columns/rows from a sheet', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Delete dimension test ${+new Date()}`,
        headerValues: ['a', 'b', 'c', 'd'],
      });
      await sheet.addRows([
        {
          a: 'a1', b: 'b1', c: 'c1', d: 'd1',
        },
        {
          a: 'a2', b: 'b2', c: 'c2', d: 'd2',
        },
        {
          a: 'a3', b: 'b3', c: 'c3', d: 'd3',
        },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('should delete rows using deleteDimension', async () => {
      // delete rows 2-3 (indices 2 and 3, which are the 2nd and 3rd data rows)
      await sheet.deleteDimension('ROWS', { startIndex: 2, endIndex: 4 });

      // read rows and check - should only have header + first data row now
      const rows = await sheet.getRows<{
        a: string,
        b: string,
        c: string,
        d: string,
      }>();
      expect(rows.length).toEqual(1);
      expect(rows[0].get('a')).toEqual('a1');
      expect(rows[0].get('b')).toEqual('b1');
    });

    it('should delete columns using deleteDimension', async () => {
      // delete columns B and C (indices 1 and 2)
      await sheet.deleteDimension('COLUMNS', { startIndex: 1, endIndex: 3 });

      // reload header row
      await sheet.loadHeaderRow();
      expect(sheet.headerValues).toEqual(['a', 'd']);
    });

    it('should delete rows using convenience method deleteRows', async () => {
      // first add more rows so we can test deletion
      await sheet.addRows([
        { a: 'a4', d: 'd4' },
        { a: 'a5', d: 'd5' },
      ]);

      // delete the first data row (index 1, since index 0 is header)
      await sheet.deleteRows(1, 2);

      const rows = await sheet.getRows<{ a: string, d: string }>();
      expect(rows.length).toEqual(2);
      expect(rows[0].get('a')).toEqual('a4');
      expect(rows[1].get('a')).toEqual('a5');
    });

    it('should delete columns using convenience method deleteColumns', async () => {
      // delete first column (column A)
      await sheet.deleteColumns(0, 1);

      await sheet.loadHeaderRow();
      expect(sheet.headerValues).toEqual(['d']);
    });
  });

  describe('autoResizeDimensions - auto-resize columns/rows to fit content', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Auto resize test ${+new Date()}`,
        headerValues: ['short', 'a much longer column header value'],
      });
    });
    afterAll(async () => {
      await sheet.delete();
    });

    it('can auto-resize all columns', async () => {
      await sheet.autoResizeDimensions('COLUMNS');
    });

    it('can auto-resize a specific range of columns', async () => {
      await sheet.autoResizeDimensions('COLUMNS', {
        startIndex: 0,
        endIndex: 1,
      });
    });
  });

  describe('insertRange - inserting empty cells into a range', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Insert range test ${+new Date()}`,
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

    it('should insert empty cells and shift rows down', async () => {
      // insert 2 empty rows in column A only, between the first and second data rows
      await sheet.insertRange({
        startRowIndex: 2,
        endRowIndex: 4,
        startColumnIndex: 0,
        endColumnIndex: 1,
      }, 'ROWS');

      // reload and check
      await sheet.loadCells();
      // row 1 (index 1) should still have a1
      expect(sheet.getCell(1, 0).value).toEqual('a1');
      // rows 2-3 should be empty in column A
      expect(sheet.getCell(2, 0).value).toBeNull();
      expect(sheet.getCell(3, 0).value).toBeNull();
      // row 4 column A should have a2 (shifted down)
      expect(sheet.getCell(4, 0).value).toEqual('a2');
      // column B should be unaffected - b1 and b2 still in rows 1-2
      expect(sheet.getCell(1, 1).value).toEqual('b1');
      expect(sheet.getCell(2, 1).value).toEqual('b2');
    });
  });

  describe('named ranges', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Named range test ${+new Date()}`,
      });
    });
    afterAll(async () => {
      await sheet.delete();
    });

    it('can add and delete a named range', async () => {
      const result = await doc.addNamedRange('testRange', {
        sheetId: sheet.sheetId,
        startRowIndex: 0,
        endRowIndex: 5,
        startColumnIndex: 0,
        endColumnIndex: 3,
      });
      expect(result).toBeTruthy();
      const namedRangeId = result.namedRange?.namedRangeId;
      expect(namedRangeId).toBeTruthy();

      // clean up
      await doc.deleteNamedRange(namedRangeId);
    });
  });

  describe('permissions', () => {
    let newDoc: GoogleSpreadsheet;

    beforeAll(async () => {
      newDoc = await GoogleSpreadsheet.createNewSpreadsheetDocument(
        testServiceAccountAuth,
        { title: `Permission test ${+new Date()}` }
      );
    });
    afterAll(async () => {
      await newDoc.delete();
    });

    it('can delete a permission', async () => {
      // make doc public so we have a permission to delete
      await newDoc.setPublicAccessLevel('reader');

      const permissions = await newDoc.listPermissions();
      const publicPerm = permissions.find((p) => p.type === 'anyone');
      expect(publicPerm).toBeTruthy();

      await newDoc.deletePermission(publicPerm!.id);

      // verify it's gone
      const permissionsAfter = await newDoc.listPermissions();
      const found = permissionsAfter.find((p) => p.type === 'anyone');
      expect(found).toBeFalsy();
    });
  });

  describe('protected ranges', () => {
    let sheet: GoogleSpreadsheetWorksheet;
    let protectedRangeId: number;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Protected range test ${+new Date()}`,
      });
    });
    afterAll(async () => {
      await sheet.delete();
    });

    it('throws when adding without range or namedRangeId', async () => {
      await expect(sheet.addProtectedRange({
        description: 'should fail',
      })).rejects.toThrow('No range specified');
    });

    it('can add a protected range', async () => {
      const result = await sheet.addProtectedRange({
        range: {
          sheetId: sheet.sheetId,
          startRowIndex: 0,
          endRowIndex: 5,
          startColumnIndex: 0,
          endColumnIndex: 3,
        },
        description: 'test protected range',
        warningOnly: true,
      });
      expect(result).toBeTruthy();
      protectedRangeId = result.protectedRange.protectedRangeId;
      expect(protectedRangeId).toBeTruthy();
    });

    it('can update a protected range', async () => {
      await sheet.updateProtectedRange(protectedRangeId, {
        description: 'updated description',
      });
    });

    it('can delete a protected range', async () => {
      await sheet.deleteProtectedRange(protectedRangeId);
    });
  });
});
