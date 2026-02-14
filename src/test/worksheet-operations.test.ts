import {
  describe, expect, it, beforeAll, afterAll, afterEach,
} from 'vitest';
import { setTimeout as delay } from 'timers/promises';
import { ENV } from 'varlock/env';

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from '..';

import { DOC_IDS, testServiceAccountAuth } from './auth/docs-and-auth';

const doc = new GoogleSpreadsheet(DOC_IDS.private, testServiceAccountAuth);

describe('Worksheet data operations', () => {
  // hitting rate limits when running tests on ci - so we add a short delay
  if (ENV.TEST_DELAY) afterEach(async () => delay(ENV.TEST_DELAY));

  describe('repeatCell - fill range with same cell data', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Repeat cell test ${+new Date()}`,
        gridProperties: { rowCount: 5, columnCount: 5 },
      });
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can fill a range with the same value', async () => {
      await sheet.repeatCell(
        {
          startRowIndex: 0, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 2,
        },
        {
          userEnteredValue: { stringValue: 'filled' },
        },
        'userEnteredValue'
      );

      await sheet.loadCells('A1:B3');
      expect(sheet.getCellByA1('A1').value).toBe('filled');
      expect(sheet.getCellByA1('B1').value).toBe('filled');
      expect(sheet.getCellByA1('A2').value).toBe('filled');
      expect(sheet.getCellByA1('B2').value).toBe('filled');
      expect(sheet.getCellByA1('A3').value).toBe('filled');
      expect(sheet.getCellByA1('B3').value).toBe('filled');
    });

    it('can fill a range with formatting', async () => {
      await sheet.repeatCell(
        {
          startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 2,
        },
        {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 0, blue: 0 },
          },
        },
        'userEnteredFormat.backgroundColor'
      );

      await sheet.loadCells('A1:B2');
      const cell = sheet.getCellByA1('A1');
      expect(cell.backgroundColor).toBeTruthy();
      expect(cell.backgroundColor!.red).toBe(1);
    });
  });

  describe('appendCells - append rows after last data', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Append cells test ${+new Date()}`,
        headerValues: ['a', 'b'],
      });
      await sheet.addRows([
        { a: 'existing1', b: 'existing2' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can append cells after existing data', async () => {
      await sheet.appendCells(
        [
          { values: [{ userEnteredValue: { stringValue: 'appended1' } }, { userEnteredValue: { stringValue: 'appended2' } }] },
          { values: [{ userEnteredValue: { stringValue: 'appended3' } }, { userEnteredValue: { stringValue: 'appended4' } }] },
        ],
        'userEnteredValue'
      );

      await sheet.loadCells('A3:B4');
      expect(sheet.getCellByA1('A3').value).toBe('appended1');
      expect(sheet.getCellByA1('B3').value).toBe('appended2');
      expect(sheet.getCellByA1('A4').value).toBe('appended3');
      expect(sheet.getCellByA1('B4').value).toBe('appended4');
    });
  });

  describe('updateDimensionProperties - set row/column size and visibility', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Dimension props test ${+new Date()}`,
        gridProperties: { rowCount: 10, columnCount: 5 },
      });
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can set column pixel size', async () => {
      await sheet.updateDimensionProperties(
        'COLUMNS',
        { pixelSize: 200 },
        { startIndex: 0, endIndex: 2 }
      );
      // if it doesn't throw, the API accepted it
    });

    it('can set row pixel size', async () => {
      await sheet.updateDimensionProperties(
        'ROWS',
        { pixelSize: 50 },
        { startIndex: 0, endIndex: 3 }
      );
    });

    it('can hide rows', async () => {
      await sheet.updateDimensionProperties(
        'ROWS',
        { hiddenByUser: true },
        { startIndex: 5, endIndex: 7 }
      );
    });
  });

  describe('getCellsInRange - read cell values by A1 range', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Get cells in range test ${+new Date()}`,
        headerValues: ['col1', 'col2', 'col3'],
      });
      await sheet.addRows([
        { col1: 'a', col2: 'b', col3: 'c' },
        { col1: 'd', col2: 'e', col3: 'f' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can get cells in a range', async () => {
      const values = await sheet.getCellsInRange('A1:C3');
      expect(values).toBeTruthy();
      expect(values.length).toBe(3); // 3 rows (header + 2 data)
      expect(values[0]).toEqual(['col1', 'col2', 'col3']);
      expect(values[1]).toEqual(['a', 'b', 'c']);
      expect(values[2]).toEqual(['d', 'e', 'f']);
    });

    it('can get a single row', async () => {
      const values = await sheet.getCellsInRange('A2:C2');
      expect(values).toBeTruthy();
      expect(values.length).toBe(1);
      expect(values[0]).toEqual(['a', 'b', 'c']);
    });
  });

  describe('batchGetCellsInRange - read multiple ranges at once', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Batch get cells test ${+new Date()}`,
        headerValues: ['x', 'y', 'z'],
      });
      await sheet.addRows([
        { x: '1', y: '2', z: '3' },
        { x: '4', y: '5', z: '6' },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('can get multiple ranges at once', async () => {
      const results = await sheet.batchGetCellsInRange(['A1:A3', 'C1:C3']);
      expect(results).toBeTruthy();
      expect(results.length).toBe(2);

      // first range: column A
      expect(results[0].length).toBe(3);
      expect(results[0][0]).toEqual(['x']);
      expect(results[0][1]).toEqual(['1']);
      expect(results[0][2]).toEqual(['4']);

      // second range: column C
      expect(results[1].length).toBe(3);
      expect(results[1][0]).toEqual(['z']);
      expect(results[1][1]).toEqual(['3']);
      expect(results[1][2]).toEqual(['6']);
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
      const data = 'numeric123,plain text';
      await sheet.pasteData(
        { rowIndex: 7, columnIndex: 0 },
        data,
        ',',
        'PASTE_VALUES'
      );

      await sheet.loadCells('A8:B8');
      // With PASTE_VALUES, values are pasted as-is
      expect(sheet.getCellByA1('A8').value).toEqual('numeric123');
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
      expect(sheet.getCellByA1('C2').value).toEqual(1);
      expect(sheet.getCellByA1('D2').value).toEqual(2);
      expect(sheet.getCellByA1('C3').value).toEqual(3);
      expect(sheet.getCellByA1('D3').value).toEqual(4);
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
      expect(sheet.getCellByA1('A2').value).toBeNull();
      expect(sheet.getCellByA1('A3').value).toBeNull();
      expect(sheet.getCellByA1('C2').value).toEqual(1);
      expect(sheet.getCellByA1('C3').value).toEqual(3);
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
});
