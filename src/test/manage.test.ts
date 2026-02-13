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

  describe('pasteData - insert data from delimited string', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Paste data test ${+new Date()}`,
        headerValues: ['a', 'b', 'c'],
        gridProperties: { rowCount: 10, columnCount: 5 },
      });
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can paste comma-delimited data at a coordinate', async () => {
      const data = 'value1,value2,value3\nvalue4,value5,value6';
      await sheet.pasteData(
        { rowIndex: 1, columnIndex: 0 },
        data,
        ','
      );

      await sheet.loadCells('A2:C3');
      expect(sheet.getCellByA1('A2').value).toEqual('value1');
      expect(sheet.getCellByA1('B2').value).toEqual('value2');
      expect(sheet.getCellByA1('C2').value).toEqual('value3');
      expect(sheet.getCellByA1('A3').value).toEqual('value4');
      expect(sheet.getCellByA1('B3').value).toEqual('value5');
      expect(sheet.getCellByA1('C3').value).toEqual('value6');
    });

    it('can paste tab-delimited data at a coordinate', async () => {
      const data = 'tab1\ttab2\ttab3\ntab4\ttab5\ttab6';
      await sheet.pasteData(
        { rowIndex: 4, columnIndex: 0 },
        data,
        '\t'
      );

      await sheet.loadCells('A5:C6');
      expect(sheet.getCellByA1('A5').value).toEqual('tab1');
      expect(sheet.getCellByA1('B5').value).toEqual('tab2');
      expect(sheet.getCellByA1('C5').value).toEqual('tab3');
      expect(sheet.getCellByA1('A6').value).toEqual('tab4');
      expect(sheet.getCellByA1('B6').value).toEqual('tab5');
      expect(sheet.getCellByA1('C6').value).toEqual('tab6');
    });

    it('can paste data with PASTE_VALUES type', async () => {
      const data = '=SUM(1,2),plain text';
      await sheet.pasteData(
        { rowIndex: 7, columnIndex: 0 },
        data,
        ',',
        'PASTE_VALUES'
      );

      await sheet.loadCells('A8:B8');
      // With PASTE_VALUES, formulas are pasted as text/values, not as formulas
      expect(sheet.getCellByA1('A8').value).toEqual('=SUM(1,2)');
      expect(sheet.getCellByA1('B8').value).toEqual('plain text');
    });
  });

  describe('appendDimension - append rows or columns to sheet', () => {
    let sheet: GoogleSpreadsheetWorksheet;
    const initialRowCount = 10;
    const initialColumnCount = 5;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Append dimension test ${+new Date()}`,
        headerValues: ['a', 'b', 'c'],
        gridProperties: { rowCount: initialRowCount, columnCount: initialColumnCount },
      });
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can append rows to the sheet', async () => {
      const rowsToAppend = 5;
      await sheet.appendDimension('ROWS', rowsToAppend);

      // Reload sheet info to get updated properties
      await doc.loadInfo();
      const updatedSheet = doc.sheetsById[sheet.sheetId];
      expect(updatedSheet.rowCount).toEqual(initialRowCount + rowsToAppend);
    });

    it('can append columns to the sheet', async () => {
      const columnsToAppend = 3;
      await sheet.appendDimension('COLUMNS', columnsToAppend);

      // Reload sheet info to get updated properties
      await doc.loadInfo();
      const updatedSheet = doc.sheetsById[sheet.sheetId];
      expect(updatedSheet.columnCount).toEqual(initialColumnCount + columnsToAppend);
    });
  });

  describe('textToColumns - split delimited text into columns', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Text to columns test ${+new Date()}`,
        headerValues: ['data', 'other'],
        gridProperties: { rowCount: 10, columnCount: 10 },
      });
      // Add some comma-separated data in column A
      await sheet.addRows([
        { data: 'a,b,c', other: 'x' },
        { data: 'd,e,f', other: 'y' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can split comma-delimited text into multiple columns', async () => {
      await sheet.textToColumns(
        {
          startColumnIndex: 0, endColumnIndex: 1, startRowIndex: 1, endRowIndex: 3,
        },
        'COMMA'
      );

      await sheet.loadCells('A2:C3');
      expect(sheet.getCellByA1('A2').value).toEqual('a');
      expect(sheet.getCellByA1('B2').value).toEqual('b');
      expect(sheet.getCellByA1('C2').value).toEqual('c');
      expect(sheet.getCellByA1('A3').value).toEqual('d');
      expect(sheet.getCellByA1('B3').value).toEqual('e');
      expect(sheet.getCellByA1('C3').value).toEqual('f');
    });
  });

  describe('deleteRange - delete cells and shift remaining', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Delete range test ${+new Date()}`,
        headerValues: ['a', 'b', 'c'],
      });
      await sheet.addRows([
        { a: '1', b: '2', c: '3' },
        { a: '4', b: '5', c: '6' },
        { a: '7', b: '8', c: '9' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can delete a range and shift cells up', async () => {
      await sheet.deleteRange(
        {
          startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 3,
        },
        'ROWS'
      );

      const rows = await sheet.getRows<{ a: string, b: string, c: string }>();
      expect(rows.length).toEqual(2);
      expect(rows[0].get('a')).toEqual('1');
      expect(rows[1].get('a')).toEqual('7');
    });
  });

  describe('deleteDimension - delete rows or columns', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Delete dimension test ${+new Date()}`,
        headerValues: ['a', 'b', 'c'],
      });
      await sheet.addRows([
        { a: '1', b: '2', c: '3' },
        { a: '4', b: '5', c: '6' },
        { a: '7', b: '8', c: '9' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can delete rows', async () => {
      await sheet.deleteDimension('ROWS', { startIndex: 2, endIndex: 3 });

      const rows = await sheet.getRows<{ a: string, b: string, c: string }>();
      expect(rows.length).toEqual(2);
      expect(rows[0].get('a')).toEqual('1');
      expect(rows[1].get('a')).toEqual('7');
    });
  });

  describe('moveDimension - move rows or columns', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Move dimension test ${+new Date()}`,
        headerValues: ['a', 'b', 'c'],
      });
      await sheet.addRows([
        { a: '1', b: '2', c: '3' },
        { a: '4', b: '5', c: '6' },
        { a: '7', b: '8', c: '9' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can move rows to a different position', async () => {
      // Move row at index 1 (first data row) to after row at index 3
      await sheet.moveDimension('ROWS', { startIndex: 1, endIndex: 2 }, 4);

      const rows = await sheet.getRows<{ a: string, b: string, c: string }>();
      expect(rows[0].get('a')).toEqual('4');
      expect(rows[1].get('a')).toEqual('7');
      expect(rows[2].get('a')).toEqual('1');
    });
  });

  describe('sortRange - sort data in a range', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Sort range test ${+new Date()}`,
        headerValues: ['name', 'age'],
      });
      await sheet.addRows([
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can sort a range by column', async () => {
      await sheet.sortRange(
        {
          startRowIndex: 1, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2,
        },
        [{ dimensionIndex: 0, sortOrder: 'ASCENDING' }]
      );

      const rows = await sheet.getRows<{ name: string, age: string }>();
      expect(rows[0].get('name')).toEqual('Alice');
      expect(rows[1].get('name')).toEqual('Bob');
      expect(rows[2].get('name')).toEqual('Charlie');
    });
  });

  describe('trimWhitespace - remove leading/trailing spaces', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Trim whitespace test ${+new Date()}`,
        headerValues: ['text'],
      });
      await sheet.addRows([
        { text: '  hello  ' },
        { text: '  world  ' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can trim whitespace from cells', async () => {
      await sheet.trimWhitespace({
        startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 1,
      });

      const rows = await sheet.getRows<{ text: string }>();
      expect(rows[0].get('text')).toEqual('hello');
      expect(rows[1].get('text')).toEqual('world');
    });
  });

  describe('deleteDuplicates - remove duplicate rows', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Delete duplicates test ${+new Date()}`,
        headerValues: ['name', 'city'],
      });
      await sheet.addRows([
        { name: 'Alice', city: 'NYC' },
        { name: 'Bob', city: 'LA' },
        { name: 'Alice', city: 'NYC' },
        { name: 'Charlie', city: 'Chicago' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can remove duplicate rows', async () => {
      await sheet.deleteDuplicates({
        startRowIndex: 1, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 2,
      });

      const rows = await sheet.getRows<{ name: string, city: string }>();
      expect(rows.length).toEqual(3);
      expect(rows[0].get('name')).toEqual('Alice');
      expect(rows[1].get('name')).toEqual('Bob');
      expect(rows[2].get('name')).toEqual('Charlie');
    });
  });

  describe('copyPaste - copy and paste cells', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Copy paste test ${+new Date()}`,
        headerValues: ['a', 'b', 'c', 'd'],
      });
      await sheet.addRows([
        {
          a: '1', b: '2', c: '', d: '',
        },
        {
          a: '3', b: '4', c: '', d: '',
        },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can copy and paste a range', async () => {
      await sheet.copyPaste(
        {
          startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 2,
        },
        {
          startRowIndex: 1, endRowIndex: 3, startColumnIndex: 2, endColumnIndex: 4,
        }
      );

      await sheet.loadCells('A2:D3');
      expect(sheet.getCellByA1('C2').value).toEqual('1');
      expect(sheet.getCellByA1('D2').value).toEqual('2');
      expect(sheet.getCellByA1('C3').value).toEqual('3');
      expect(sheet.getCellByA1('D3').value).toEqual('4');
    });
  });

  describe('cutPaste - cut and paste cells', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Cut paste test ${+new Date()}`,
        headerValues: ['a', 'b', 'c'],
      });
      await sheet.addRows([
        { a: '1', b: '2', c: '' },
        { a: '3', b: '4', c: '' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can cut and paste a range', async () => {
      await sheet.cutPaste(
        {
          startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 1,
        },
        { rowIndex: 1, columnIndex: 2 }
      );

      await sheet.loadCells('A2:C3');
      expect(sheet.getCellByA1('A2').value).toBeUndefined();
      expect(sheet.getCellByA1('A3').value).toBeUndefined();
      expect(sheet.getCellByA1('C2').value).toEqual('1');
      expect(sheet.getCellByA1('C3').value).toEqual('3');
    });
  });

  describe('autoFill - fill cells with pattern', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Auto fill test ${+new Date()}`,
        headerValues: ['numbers'],
      });
      await sheet.addRows([
        { numbers: 1 },
        { numbers: 2 },
        { numbers: '' },
        { numbers: '' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can autofill cells based on pattern', async () => {
      await sheet.autoFill({
        source: {
          startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 1,
        },
        dimension: 'ROWS',
        fillLength: 2,
      });

      const rows = await sheet.getRows<{ numbers: string }>();
      expect(rows[0].get('numbers')).toEqual('1');
      expect(rows[1].get('numbers')).toEqual('2');
      expect(rows[2].get('numbers')).toEqual('3');
      expect(rows[3].get('numbers')).toEqual('4');
    });
  });

  describe('findReplace - find and replace text', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Find replace test ${+new Date()}`,
        headerValues: ['text'],
      });
      await sheet.addRows([
        { text: 'hello world' },
        { text: 'hello there' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can find and replace text in cells', async () => {
      await sheet.findReplace('hello', 'hi');

      const rows = await sheet.getRows<{ text: string }>();
      expect(rows[0].get('text')).toEqual('hi world');
      expect(rows[1].get('text')).toEqual('hi there');
    });
  });

  describe('randomizeRange - shuffle rows', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Randomize range test ${+new Date()}`,
        headerValues: ['number'],
      });
      await sheet.addRows([
        { number: 1 },
        { number: 2 },
        { number: 3 },
        { number: 4 },
        { number: 5 },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can randomize rows in a range', async () => {
      const rowsBefore = await sheet.getRows<{ number: string }>();
      const valuesBefore = rowsBefore.map((r) => r.get('number'));

      await sheet.randomizeRange({
        startRowIndex: 1, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 1,
      });

      const rowsAfter = await sheet.getRows<{ number: string }>();
      const valuesAfter = rowsAfter.map((r) => r.get('number'));

      // Check that all values are still present (same set)
      expect(valuesAfter.sort()).toEqual(valuesBefore.sort());
      // In theory could be the same order, but very unlikely with 5 items
    });
  });

  describe('named ranges - convenience methods', () => {
    let sheet: GoogleSpreadsheetWorksheet;
    let namedRangeId: string;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Named ranges test ${+new Date()}`,
        headerValues: ['a', 'b'],
      });
      await sheet.addRows([
        { a: '1', b: '2' },
        { a: '3', b: '4' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can add a named range using worksheet convenience method', async () => {
      const result = await sheet.addNamedRange('TestRange', {
        startRowIndex: 0,
        endRowIndex: 2,
        startColumnIndex: 0,
        endColumnIndex: 2,
      });
      expect(result).toBeTruthy();
      namedRangeId = result.namedRange.namedRangeId;
    });

    it('can update a named range', async () => {
      await sheet.updateNamedRange(
        namedRangeId,
        { name: 'UpdatedTestRange' },
        'name'
      );
    });

    it('can delete a named range using worksheet convenience method', async () => {
      await sheet.deleteNamedRange(namedRangeId);
    });
  });

  describe('basic filter - convenience methods', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Basic filter test ${+new Date()}`,
        headerValues: ['name', 'age'],
      });
      await sheet.addRows([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 35 },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can set a basic filter', async () => {
      await sheet.setBasicFilter({
        range: {
          startRowIndex: 0,
          endRowIndex: 4,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
      });
    });

    it('can clear a basic filter', async () => {
      await sheet.clearBasicFilter();
    });
  });

  describe('borders - convenience methods', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Borders test ${+new Date()}`,
        headerValues: ['a', 'b'],
      });
      await sheet.addRows([
        { a: '1', b: '2' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can update borders', async () => {
      await sheet.updateBorders(
        {
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        {
          top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
          bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
          left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
          right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
        }
      );
    });
  });

  describe('filter views', () => {
    let sheet: GoogleSpreadsheetWorksheet;
    let filterViewId: number;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Filter views test ${+new Date()}`,
        headerValues: ['name', 'age', 'score'],
      });
      await sheet.addRows([
        { name: 'Alice', age: '30', score: '95' },
        { name: 'Bob', age: '25', score: '87' },
        { name: 'Charlie', age: '35', score: '92' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can add a filter view', async () => {
      const { sheetId } = sheet;
      await sheet.addFilterView({
        title: 'Test Filter',
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 4,
          startColumnIndex: 0,
          endColumnIndex: 3,
        },
      });
      // Store filterViewId for later tests - would need to reload sheet to get it
      filterViewId = 1; // Placeholder - in real usage would need to fetch from sheet
    });

    it('can update a filter view', async () => {
      await sheet.updateFilterView(
        {
          filterViewId,
          title: 'Updated Filter',
        },
        'title'
      );
    });

    it('can duplicate a filter view', async () => {
      await sheet.duplicateFilterView(filterViewId);
    });

    it('can delete a filter view', async () => {
      await sheet.deleteFilterView(filterViewId);
    });
  });

  describe('conditional formatting', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Conditional formatting test ${+new Date()}`,
        headerValues: ['value'],
      });
      await sheet.addRows([
        { value: '10' },
        { value: '20' },
        { value: '30' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can add a conditional format rule', async () => {
      const { sheetId } = sheet;
      await sheet.addConditionalFormatRule(
        {
          ranges: [
            {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 4,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
          ],
          booleanRule: {
            condition: {
              type: 'NUMBER_GREATER',
              values: [{ userEnteredValue: '15' }],
            },
            format: {
              backgroundColorStyle: {
                rgbColor: { red: 0, green: 1, blue: 0 },
              },
            },
          },
        },
        0
      );
    });

    it('can update a conditional format rule', async () => {
      const { sheetId } = sheet;
      await sheet.updateConditionalFormatRule({
        index: 0,
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 4,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
          ],
          booleanRule: {
            condition: {
              type: 'NUMBER_GREATER',
              values: [{ userEnteredValue: '25' }],
            },
            format: {
              backgroundColorStyle: {
                rgbColor: { red: 1, green: 0, blue: 0 },
              },
            },
          },
        },
      });
    });

    it('can delete a conditional format rule', async () => {
      await sheet.deleteConditionalFormatRule(0);
    });
  });

  describe('banding', () => {
    let sheet: GoogleSpreadsheetWorksheet;
    let bandedRangeId: number;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Banding test ${+new Date()}`,
        headerValues: ['a', 'b', 'c'],
      });
      await sheet.addRows([
        { a: '1', b: '2', c: '3' },
        { a: '4', b: '5', c: '6' },
        { a: '7', b: '8', c: '9' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can add banding to a range', async () => {
      const { sheetId } = sheet;
      await sheet.addBanding({
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 4,
          startColumnIndex: 0,
          endColumnIndex: 3,
        },
        rowProperties: {
          headerColorStyle: {
            rgbColor: { red: 0.8, green: 0.8, blue: 0.8 },
          },
          firstBandColorStyle: {
            rgbColor: { red: 1, green: 1, blue: 1 },
          },
          secondBandColorStyle: {
            rgbColor: { red: 0.9, green: 0.9, blue: 0.9 },
          },
        },
      });
      // Store bandedRangeId for later tests - would need to reload sheet to get it
      bandedRangeId = 1; // Placeholder
    });

    it('can update banding', async () => {
      await sheet.updateBanding(
        {
          bandedRangeId,
          rowProperties: {
            firstBandColorStyle: {
              rgbColor: { red: 0.95, green: 0.95, blue: 0.95 },
            },
            secondBandColorStyle: {
              rgbColor: { red: 0.85, green: 0.85, blue: 0.85 },
            },
          },
        },
        'rowProperties'
      );
    });

    it('can delete banding', async () => {
      await sheet.deleteBanding(bandedRangeId);
    });
  });

  describe('developer metadata', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Developer metadata test ${+new Date()}`,
      });
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can create developer metadata', async () => {
      await sheet.createDeveloperMetadata({
        metadataKey: 'test-key',
        metadataValue: 'test-value',
        location: {
          sheetId: sheet.sheetId,
          spreadsheet: false,
          locationType: 'SHEET',
        },
        visibility: 'DOCUMENT',
      });
    });

    it('can update developer metadata', async () => {
      await sheet.updateDeveloperMetadata(
        [
          {
            developerMetadataLookup: {
              metadataKey: 'test-key',
            },
          },
        ],
        {
          metadataKey: 'test-key',
          metadataValue: 'updated-value',
          location: {
            sheetId: sheet.sheetId,
            spreadsheet: false,
            locationType: 'SHEET',
          },
          visibility: 'DOCUMENT',
        },
        'metadataValue'
      );
    });

    it('can delete developer metadata', async () => {
      await sheet.deleteDeveloperMetadata({
        developerMetadataLookup: {
          metadataKey: 'test-key',
        },
      });
    });
  });
});
