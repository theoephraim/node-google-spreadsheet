import {
  describe, expect, it, beforeAll, afterAll, afterEach,
} from 'vitest';
import { setTimeout as delay } from 'timers/promises';
import { ENV } from 'varlock/env';
import * as _ from '../lib/toolkit';

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from '..';

import { DOC_IDS, testServiceAccountAuth } from './auth/docs-and-auth';

const doc = new GoogleSpreadsheet(DOC_IDS.private, testServiceAccountAuth);

describe('Data operations - rows, columns, and ranges', () => {
  // hitting rate limits when running tests on ci - so we add a short delay
  if (ENV.TEST_DELAY) afterEach(async () => delay(ENV.TEST_DELAY));

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

  describe('deleteDimension - cache updates after deletion', () => {
    let sheet: GoogleSpreadsheetWorksheet;

    beforeAll(async () => {
      sheet = await doc.addSheet({
        title: `Delete cache test ${+new Date()}`,
        headerValues: ['col1', 'col2', 'col3', 'col4', 'col5'],
      });
      await sheet.addRows([
        {
          col1: 'r1c1', col2: 'r1c2', col3: 'r1c3', col4: 'r1c4', col5: 'r1c5',
        },
        {
          col1: 'r2c1', col2: 'r2c2', col3: 'r2c3', col4: 'r2c4', col5: 'r2c5',
        },
        {
          col1: 'r3c1', col2: 'r3c2', col3: 'r3c3', col4: 'r3c4', col5: 'r3c5',
        },
        {
          col1: 'r4c1', col2: 'r4c2', col3: 'r4c3', col4: 'r4c4', col5: 'r4c5',
        },
      ]);
    });

    afterAll(async () => {
      await sheet.delete();
    });

    it('should update cached rows after deleting rows', async () => {
      // Load and cache rows
      const rowsBefore = await sheet.getRows<Record<string, string>>();
      expect(rowsBefore.length).toEqual(4);
      expect(rowsBefore[1].get('col1')).toEqual('r2c1');
      expect(rowsBefore[1].rowNumber).toEqual(3); // row 3 in A1 notation (header is row 1, data starts at row 2)
      expect(rowsBefore[3].get('col1')).toEqual('r4c1');
      expect(rowsBefore[3].rowNumber).toEqual(5);

      // Delete row 3 (index 2, which is the second data row r2c1)
      await sheet.deleteRows(2, 3);

      // Cached rows should be updated
      expect(rowsBefore[1].deleted).toBeTruthy(); // the deleted row
      expect(rowsBefore[2].get('col1')).toEqual('r3c1');
      expect(rowsBefore[2].rowNumber).toEqual(3); // shifted down from row 4 to row 3
      expect(rowsBefore[3].get('col1')).toEqual('r4c1');
      expect(rowsBefore[3].rowNumber).toEqual(4); // shifted down from row 5 to row 4
    });

    it('should update cached cells after deleting rows', async () => {
      // Load and cache cells
      // Note: previous test deleted r2, so sheet now has: r1(idx1), r3(idx2), r4(idx3)
      await sheet.loadCells('A1:E5');
      const cellBefore = sheet.getCell(2, 0); // row index 2, column A
      expect(cellBefore.value).toEqual('r3c1'); // r3 is at row index 2
      expect(cellBefore.rowIndex).toEqual(2);

      // Delete row 1 (index 1, which is r1)
      await sheet.deleteRows(1, 2);

      // The cell that was at row 2 should now be at row 1
      expect(cellBefore.rowIndex).toEqual(1);
      expect(cellBefore.value).toEqual('r3c1');

      // Getting the cell at the new position should return the same cell object
      const cellAfter = sheet.getCell(1, 0);
      expect(cellAfter).toBe(cellBefore);
    });

    it('should update cached cells after deleting columns', async () => {
      // Reload cells
      // Note: previous tests deleted r2, r1, so sheet now has: r3(idx1), r4(idx2)
      await sheet.loadCells('A1:E5');
      const cellBefore = sheet.getCell(1, 2); // row index 1, column C (index 2)
      // Row index 1 now contains r3 data
      expect(cellBefore.value).toEqual('r3c3');
      expect(cellBefore.columnIndex).toEqual(2);

      // Delete column B (index 1)
      await sheet.deleteColumns(1, 2);

      // The cell that was at column 2 should now be at column 1
      expect(cellBefore.columnIndex).toEqual(1);
      expect(cellBefore.value).toEqual('r3c3');

      // Getting the cell at the new position should return the same cell object
      const cellAfter = sheet.getCell(1, 1);
      expect(cellAfter).toBe(cellBefore);
    });

    it('should mark deleted rows as deleted', async () => {
      // Get cached rows from previous test
      const rows = await sheet.getRows<Record<string, string>>();
      const firstRow = rows[0];
      expect(firstRow.deleted).toBeFalsy();

      // Delete the first row (index 1 since header is row 0)
      await sheet.deleteRows(1, 2);

      // The row should now be marked as deleted
      expect(firstRow.deleted).toBeTruthy();

      // Trying to save the deleted row should throw an error
      await expect(firstRow.save()).rejects.toThrow('This row has been deleted');
    });

    it('should mark deleted cells as deleted', async () => {
      // Load cells
      await sheet.loadCells('A1:E5');
      const cell = sheet.getCell(1, 0); // row 1, column A
      expect(cell.deleted).toBeFalsy();

      // Delete the row containing this cell
      await sheet.deleteRows(1, 2);

      // The cell should now be marked as deleted
      expect(cell.deleted).toBeTruthy();

      // Trying to set value on deleted cell should throw an error
      expect(() => { cell.value = 'test'; }).toThrow('This cell has been deleted');
    });

    it('should mark deleted cells in deleted columns as deleted', async () => {
      // Reload cells
      await sheet.loadCells('A1:E5');
      const cell = sheet.getCell(1, 0); // row 1, column A (index 0)
      expect(cell.deleted).toBeFalsy();

      // Delete column A (index 0)
      await sheet.deleteColumns(0, 1);

      // The cell should now be marked as deleted
      expect(cell.deleted).toBeTruthy();

      // Trying to set value on deleted cell should throw an error
      expect(() => { cell.value = 'test'; }).toThrow('This cell has been deleted');
    });
  });
});
