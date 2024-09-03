import 'dmno/auto-inject-globals';
import {
  describe, expect, it, beforeAll, afterAll, afterEach,
} from 'vitest';
import delay from 'delay';
import * as _ from '../lib/lodash';

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet, GoogleSpreadsheetRow } from '..';

import { DOC_IDS, testServiceAccountAuth } from './auth/docs-and-auth';

const doc = new GoogleSpreadsheet(DOC_IDS.private, testServiceAccountAuth);

let sheet: GoogleSpreadsheetWorksheet;

// having some issues caused by blank headers, so we add one here
const HEADERS = ['numbers', 'letters', '', 'col1', 'col2', 'col3'];
const INITIAL_ROW_COUNT = 15;
const INITIAL_DATA = [
  ['0', 'A'],
  ['1', 'B'],
  ['2', 'C'],
  ['3', 'D'],
  ['4', 'E'],
];

describe('Row-based operations', () => {
  beforeAll(async () => {
    sheet = await doc.addSheet({
      headerValues: HEADERS,
      title: `Spécial CнArs ${+new Date()}`, // some urls have sheet title in them
      gridProperties: { rowCount: INITIAL_ROW_COUNT },
    });
    await sheet.addRows(INITIAL_DATA);
  });
  afterAll(async () => {
    await sheet.delete();
  });
  // hitting rate limits when running tests on ci - so we add a short delay
  if (DMNO_CONFIG.TEST_DELAY) afterEach(async () => delay(DMNO_CONFIG.TEST_DELAY));

  describe('fetching rows', () => {
    let rows: GoogleSpreadsheetRow[];
    it('can fetch multiple rows', async () => {
      rows = await sheet.getRows();
      expect(rows.length).toEqual(INITIAL_DATA.length);
    });

    it('a row has properties with keys from the headers', () => {
      expect(rows[0].get('numbers')).toEqual(INITIAL_DATA[0][0]);
      expect(rows[0].get('letters')).toEqual(INITIAL_DATA[0][1]);
    });

    it('supports `offset` option', async () => {
      rows = await sheet.getRows({ offset: 2 });
      expect(rows.length).toEqual(3);
      expect(rows[0].get('numbers')).toEqual(INITIAL_DATA[2][0]);
    });

    it('supports `limit` option', async () => {
      rows = await sheet.getRows({ limit: 3 });
      expect(rows.length).toEqual(3);
      expect(rows[0].get('numbers')).toEqual(INITIAL_DATA[0][0]);
    });

    it('supports combined `limit` and `offset`', async () => {
      rows = await sheet.getRows({ offset: 2, limit: 2 });
      expect(rows.length).toEqual(2);
      expect(rows[0].get('numbers')).toEqual(INITIAL_DATA[2][0]);
    });

    it('it will fetch the same row content when the header is not populated', async () => {
      sheet.resetLocalCache(true); // forget the header values
      expect(() => sheet.headerValues).toThrowError('Header values are not yet loaded');
      const rowsWithoutPrefetchHeaders = await sheet.getRows();

      expect(sheet.headerValues).toBeDefined();
      const rowsWithFetchedHeaders = await sheet.getRows();

      expect(rowsWithoutPrefetchHeaders).toEqual(rowsWithFetchedHeaders);
    });
  });

  describe('adding rows', () => {
    let rows: GoogleSpreadsheetRow[];
    let row: GoogleSpreadsheetRow;
    it('can add a row with an array of values', async () => {
      const newRowData = ['5', 'F'];
      row = await sheet.addRow(newRowData);
      expect(row.get('numbers')).toEqual(newRowData[0]);
      expect(row.get('letters')).toEqual(newRowData[1]);
      expect(row.get('dates')).toEqual(newRowData[2]);
    });

    it('persisted the row', async () => {
      rows = await sheet.getRows();
      expect(rows.length).toEqual(INITIAL_DATA.length + 1);
      const newRowIndex = INITIAL_DATA.length;
      expect(rows[newRowIndex].get('numbers')).toEqual(row.get('numbers'));
      expect(rows[newRowIndex].get('letters')).toEqual(row.get('letters'));
      expect(rows[newRowIndex].get('dates')).toEqual(row.get('dates'));
    });

    it('can add a row with keyed object data', async () => {
      const newRowData = {
        numbers: '6',
        letters: 'G',
      };
      row = await sheet.addRow(newRowData);
      expect(row.get('numbers')).toEqual(newRowData.numbers);
      expect(row.get('letters')).toEqual(newRowData.letters);
    });

    it('can add multiple rows', async () => {
      const newRows = await sheet.addRows([
        { numbers: '7', letters: 'H' },
        ['8', 'I'],
      ]);
      expect(newRows[0].get('numbers')).toEqual('7');
      expect(newRows[1].get('numbers')).toEqual('8');
    });

    it('can add rows with options.insert', async () => {
      // we should still have some empty rows left for this test to be valid
      rows = await sheet.getRows();
      expect(rows.length).toBeLessThan(INITIAL_ROW_COUNT);
      const oldRowCount = sheet.rowCount;
      await sheet.addRows([
        { numbers: '101', letters: 'XX' },
      ], { insert: true });
      expect(sheet.rowCount).toEqual(oldRowCount + 1);
    });

    it('will update sheet.rowCount if new rows are added (while not in insert mode)', async () => {
      const oldRowCount = sheet.rowCount;
      const dataForMoreRowsThanFit = _.times(INITIAL_ROW_COUNT, () => ({
        numbers: '999', letters: 'ZZZ',
      }));
      const newRows = await sheet.addRows(dataForMoreRowsThanFit);
      const updatedRowCount = sheet.rowCount;
      await doc.loadInfo(); // actually reload to make sure the logic is correct
      expect(sheet.rowCount).toEqual(updatedRowCount);
      expect(sheet.rowCount).toBeGreaterThan(oldRowCount);
      expect(newRows[newRows.length - 1].rowNumber).toEqual(sheet.rowCount);
    });

    it('can add rows with options.raw', async () => {
      const rawValue = 'true';
      const regularRow = await sheet.addRow({ col1: rawValue });
      const rawRow = await sheet.addRow({ col1: rawValue }, { raw: true });

      expect(regularRow.get('col1')).toEqual('TRUE'); // internally its treating as a boolean
      expect(rawRow.get('col1')).toEqual(rawValue);
    });
  });

  describe('deleting rows', () => {
    let rows: GoogleSpreadsheetRow[];
    let row: GoogleSpreadsheetRow;
    it('can delete a row', async () => {
      rows = await sheet.getRows();

      const numRows = rows.length;

      // delete the row at index 1 (which has "1" in numbers col)
      row = rows[1];
      await row.delete();

      // make sure we have 1 less row
      rows = await sheet.getRows();
      expect(rows.length).toEqual(numRows - 1);

      // make sure we deleted the correct row
      expect(rows[0].get('numbers')).toEqual('0');
      expect(rows[1].get('numbers')).toEqual('2');
    });

    it('cannot delete a row twice', async () => {
      await expect(row.delete()).rejects.toThrow();
    });

    it('cannot update a deleted row', async () => {
      row.set('col1', 'new value');
      await expect(row.save()).rejects.toThrow();
    });
  });

  describe('updating rows', () => {
    let rows: GoogleSpreadsheetRow[];
    let row: GoogleSpreadsheetRow;
    it('can update a row', async () => {
      rows = await sheet.getRows();
      row = rows[0];

      row.set('numbers', '999');
      row.set('letters', 'Z');
      await row.save();
      expect(row.get('numbers')).toBe('999');
      expect(row.get('letters')).toBe('Z');
    });

    it('persisted the row update', async () => {
      rows = await sheet.getRows();
      expect(rows[0].get('numbers')).toEqual(row.get('numbers'));
      expect(rows[0].get('letters')).toEqual(row.get('letters'));
    });

    it('can write a formula', async () => {
      row.set('col1', 1);
      row.set('col2', 2);
      row.set('col3', '=D2+E2'); // col1 is column C
      await row.save();
      expect(row.get('col1')).toEqual('1'); // it converts to strings
      expect(row.get('col2')).toEqual('2');
      expect(row.get('col3')).toEqual('3'); // it evaluates the formula and formats as a string
    });

    describe('encoding and odd characters', () => {
      _.each(
        {
          'new lines': 'new\n\nlines\n',
          'special chars': '∑πécial <> chårs = !\t',
        },
        (value, description) => {
          it(`supports ${description}`, async () => {
            row.set('col1', value);
            await row.save();

            rows = await sheet.getRows();
            expect(rows[0].get('col1')).toEqual(value);
          });
        }
      );
    });
  });

  // TODO: Move to cells.test.js because mergeCells and unmergeCells are really cell operations
  // but they were implemented using the existing data we have here in the rows tests
  // so we'll leave them here for now
  describe('merge and unmerge operations', () => {
    beforeAll(async () => {
      await sheet.loadCells('A1:H2');
    });

    const range = {
      startColumnIndex: 0,
      endColumnIndex: 2,
    };

    it('merges all cells', async () => {
      await sheet.mergeCells({
        startRowIndex: 2,
        endRowIndex: 4,
        ...range,
      });
      const mergedRows = await sheet.getRows();
      expect(mergedRows[1].get('numbers')).toBe('2');
      expect(mergedRows[1].get('letters')).toBe(undefined);
      expect(mergedRows[2].get('numbers')).toBe(undefined);
      expect(mergedRows[2].get('letters')).toBe(undefined);
    });

    it('merges all cells in column direction', async () => {
      await sheet.mergeCells({
        startRowIndex: 4,
        endRowIndex: 6,
        ...range,
      }, 'MERGE_COLUMNS');
      const mergedRows = await sheet.getRows();
      expect(mergedRows[3].get('numbers')).toBe('4');
      expect(mergedRows[3].get('letters')).toBe('E');
      expect(mergedRows[4].get('numbers')).toBe(undefined);
      expect(mergedRows[4].get('letters')).toBe(undefined);
    });

    it('merges all cells in row direction', async () => {
      await sheet.mergeCells({
        startRowIndex: 6,
        endRowIndex: 8,
        ...range,
      }, 'MERGE_ROWS');
      const mergedRows = await sheet.getRows();
      expect(mergedRows[5].get('numbers')).toBe('6');
      expect(mergedRows[5].get('letters')).toBe(undefined);
      expect(mergedRows[6].get('numbers')).toBe('7');
      expect(mergedRows[6].get('letters')).toBe(undefined);
    });

    it('unmerges cells', async () => {
      await sheet.mergeCells({
        startRowIndex: 8,
        endRowIndex: 9,
        ...range,
      });
      const mergedRows = await sheet.getRows();
      expect(mergedRows[7].get('numbers')).toBe('8');
      expect(mergedRows[7].get('letters')).toBe(undefined);
      mergedRows[7].set('letters', 'Z');
      await mergedRows[7].save();
      expect(mergedRows[7].get('numbers')).toBe('8');
      expect(mergedRows[7].get('letters')).toBe(undefined);
      await sheet.unmergeCells({
        startRowIndex: 8,
        endRowIndex: 9,
        ...range,
      });
      mergedRows[7].set('letters', 'Z');
      await mergedRows[7].save();
      expect(mergedRows[7].get('numbers')).toBe('8');
      expect(mergedRows[7].get('letters')).toBe('Z');
    });
  });

  describe('header validation and cleanup', () => {
    let rows: GoogleSpreadsheetRow[];
    beforeAll(async () => {
      sheet.loadCells('A1:E1');
    });

    it('clears the entire header row when setting new values', async () => {
      await sheet.setHeaderRow(['col1', 'col2', 'col3', 'col4', 'col5', 'col6', 'col7', 'col8']);
      await sheet.setHeaderRow(['new1', 'new2']);
      sheet.resetLocalCache(true);
      await sheet.loadHeaderRow();
      expect(sheet.headerValues.length).toBe(2);
    });

    it('allows empty headers', async () => {
      await sheet.setHeaderRow(['', 'col1', '', 'col2']);
      rows = await sheet.getRows();
      const rowProps = _.keys(rows[0].toObject());
      expect(rowProps).not.toContain('');
      expect(rowProps).toContain('col1');
    });

    it('trims each header', async () => {
      await sheet.setHeaderRow([' col1 ', ' something with spaces ']);
      rows = await sheet.getRows();
      expect(rows[0].toObject()).toHaveProperty('col1');
      expect(rows[0].toObject()).toHaveProperty(['something with spaces']);
    });

    it('throws an error if setting duplicate headers', async () => {
      await expect(sheet.setHeaderRow(['col1', 'col1'])).rejects.toThrow();
    });
    it('throws an error if setting empty headers', async () => {
      await expect(sheet.setHeaderRow([])).rejects.toThrow();
    });
    it('throws an error if setting empty headers after trimming', async () => {
      await expect(sheet.setHeaderRow(['  '])).rejects.toThrow();
    });

    it('throws an error if duplicate headers already exist', async () => {
      await sheet.loadCells('A1:C1');
      sheet.getCellByA1('A1').value = 'col1';
      sheet.getCellByA1('B1').value = 'col1';
      sheet.getCellByA1('C1').value = 'col2';
      await sheet.saveUpdatedCells();
      sheet.resetLocalCache(true); // forget the header values
      await expect(sheet.getRows()).rejects.toThrow();
    });

    it('throws if headers are all blank', async () => {
      await sheet.loadCells('A1:C1');
      sheet.getCellByA1('A1').value = '';
      sheet.getCellByA1('B1').value = '';
      sheet.getCellByA1('C1').value = '';
      await sheet.saveUpdatedCells();
      sheet.resetLocalCache(true); // forget the header values
      await expect(sheet.getRows()).rejects.toThrow();
    });

    it('throws if headers are all blank after trimming spaces', async () => {
      await sheet.loadCells('A1:C1');
      sheet.getCellByA1('A1').value = '';
      sheet.getCellByA1('B1').value = '  ';
      sheet.getCellByA1('C1').value = '';
      await sheet.saveUpdatedCells();
      sheet.resetLocalCache(true); // forget the header values
      await expect(sheet.getRows()).rejects.toThrow();
    });
  });

  describe('custom header row index', () => {
    const CUSTOM_HEADER_ROW_INDEX = 3;
    let newSheet: GoogleSpreadsheetWorksheet;

    afterAll(async () => {
      await newSheet.delete();
    });

    it('can set custom header row index while adding a sheet', async () => {
      newSheet = await doc.addSheet({
        headerValues: ['a', 'b', 'c'],
        headerRowIndex: CUSTOM_HEADER_ROW_INDEX,
        title: `custom header index sheet ${+new Date()}`,
        gridProperties: { rowCount: INITIAL_ROW_COUNT },
      });
      await newSheet.loadCells();
      const aHeaderCell = newSheet.getCell(CUSTOM_HEADER_ROW_INDEX - 1, 0);
      expect(aHeaderCell.value).toEqual('a');
    });

    it('can load existing header row from custom index', async () => {
      newSheet.resetLocalCache(true);

      // first row is empty so this should fail
      await expect(newSheet.getRows()).rejects.toThrow();

      // load header row from custom index
      await newSheet.loadHeaderRow(CUSTOM_HEADER_ROW_INDEX);
      expect(newSheet.headerValues[0]).toEqual('a');

      await newSheet.addRows([
        { a: 'a1', b: 'b1' },
        { a: 'a2', b: 'b2' },
      ]);

      const rows = await newSheet.getRows();
      expect(rows[0].get('a')).toEqual('a1');

      await newSheet.loadCells();
      // now verify header and data are in the right place, using the cell-based methods
      const aDataCell = newSheet.getCell(CUSTOM_HEADER_ROW_INDEX, 0);
      expect(aDataCell.value).toEqual('a1');
    });

    it('can clear rows properly when custom header index is used', async () => {
      await newSheet.clearRows();

      await newSheet.loadCells();
      // now verify header is still there and data is cleared
      const aHeaderCell = newSheet.getCell(CUSTOM_HEADER_ROW_INDEX - 1, 0);
      expect(aHeaderCell.value).toEqual('a');
      const aDataCell = newSheet.getCell(CUSTOM_HEADER_ROW_INDEX, 0);
      expect(aDataCell.value).toEqual(null);
    });
  });
});
