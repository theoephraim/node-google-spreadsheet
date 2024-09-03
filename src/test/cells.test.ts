import 'dmno/auto-inject-globals';
import {
  describe, expect, it, beforeAll, beforeEach, afterAll, afterEach,
} from 'vitest';
import delay from 'delay';
import * as _ from '../lib/lodash';

import {
  GoogleSpreadsheet, GoogleSpreadsheetWorksheet, GoogleSpreadsheetCell, GoogleSpreadsheetCellErrorValue,
} from '..';

import { DOC_IDS, testServiceAccountAuth } from './auth/docs-and-auth';

const doc = new GoogleSpreadsheet(DOC_IDS.private, testServiceAccountAuth);

let sheet: GoogleSpreadsheetWorksheet;

const NUM_ROWS = 10;
const NUM_COLS = 10;
const TOTAL_CELLS = NUM_ROWS * NUM_COLS;

describe('Cell-based operations', () => {
  beforeAll(async () => {
    sheet = await doc.addSheet({
      gridProperties: {
        rowCount: NUM_ROWS,
        columnCount: NUM_COLS,
      },
      headerValues: ['col1', 'col2', 'col3'],
    });
  });
  afterAll(async () => {
    await sheet.delete();
  });
  // hitting rate limits when running tests on ci - so we add a short delay
  if (DMNO_CONFIG.TEST_DELAY) afterEach(async () => delay(DMNO_CONFIG.TEST_DELAY));

  describe('loading cells', () => {
    afterEach(() => {
      sheet.resetLocalCache(true);
    });

    it('fetches all cells if no range given', async () => {
      await sheet.loadCells();
      expect(sheet.cellStats).toEqual({
        nonEmpty: 3,
        loaded: TOTAL_CELLS,
        total: TOTAL_CELLS,
      });
    });

    it('can fetch a specific A1 range by passing a string', async () => {
      await sheet.loadCells('B1:D3');
      expect(sheet.cellStats).toMatchObject({
        nonEmpty: 2,
        loaded: 9,
      });
    });

    it('can load multiple ranges', async () => {
      await sheet.loadCells(['A1:A3', 'C1:C3']);
      expect(sheet.cellStats).toMatchObject({
        nonEmpty: 2,
        loaded: 6,
      });
    });

    it('can fetch a range that overlaps the sheet but goes out of bounds', async () => {
      await sheet.loadCells('A10:B11');
      expect(sheet.cellStats).toMatchObject({ loaded: 2 });
    });

    it('can fetch a range using a GridRange style object', async () => {
      // start is inclusive, end is exclusive
      await sheet.loadCells({
        startRowIndex: 0,
        endRowIndex: 3,
        startColumnIndex: 2,
        endColumnIndex: 5,
      });
      expect(sheet.cellStats).toMatchObject({
        nonEmpty: 1,
        loaded: 9,
      });
    });

    it('should throw if a cell is not loaded yet', async () => {
      expect(() => { sheet.getCell(0, 0); }).toThrow();
      expect(() => { sheet.getCellByA1('A1'); }).toThrow();
    });

    it('can load a cell multiple times (this was a bug)', async () => {
      await sheet.loadCells('J10');
      expect(sheet.getCellByA1('J10').value).toBeNull();
      await sheet.loadCells('J10');
      expect(sheet.getCellByA1('J10').value).toBeNull();
    });

    describe('invalid filters', () => {
      _.each({
        'invalid A1 range': 'NOT-A-RANGE',
        'A1 range out of bounds': 'A20:B21',
        'gridrange sheetId mismatch': { sheetId: '0' },
        'gridrange range out of bounds': { startRowIndex: 20 },
        'not a string or object': 5,
      }, (badFilter, description) => {
        it(`throws for ${description}`, async () => {
          await expect(sheet.loadCells(badFilter as any)).rejects.toThrow();
        });
      });
    });
  });

  describe('basic cell functionality', () => {
    let c1: GoogleSpreadsheetCell;
    let c2: GoogleSpreadsheetCell;
    let c3: GoogleSpreadsheetCell;
    beforeEach(async () => {
      sheet.resetLocalCache(true);
      await sheet.loadCells('A1:C1');
      c1 = sheet.getCell(0, 0);
      c2 = sheet.getCell(0, 1);
      c3 = sheet.getCell(0, 2);
    });

    it('can select a cell by A1 address or row/col index', async () => {
      // c2 is `sheet.getCell(0, 1);`
      expect(c2.rowIndex).toBe(0);
      expect(c2.columnIndex).toBe(1);
      expect(c2.a1Address).toBe('B1');
      expect(c2).toEqual(sheet.getCellByA1('B1'));
    });

    it('can update cells and save them', async () => {
      c1.value = 1.2345;
      c2.value = 2.3456;
      c3.formula = '=A1 + B1';
      await sheet.saveUpdatedCells();
      expect(c3.value).toBe(c1.value + c2.value);
    });

    it('can save a single cell using cell.save()', async () => {
      c1.value = 9.8765;
      await c1.save();
    });

    it('can set cell value formatting', async () => {
      c3.numberFormat = { type: 'NUMBER', pattern: '#.00' };
      await sheet.saveUpdatedCells();
      if (!_.isNumber(c1.value) || !_.isNumber(c2.value) || !_.isNumber(c3.value)) {
        throw new Error('expected cell values to be numeric');
      }
      expect(c3.numberValue).toBe(c1.value + c2.value);
      expect(c3.formattedValue!).toBe(c3.value.toFixed(2));
      expect(c3.formula).toBe('=A1 + B1');
    });

    it('can update a cells note', async () => {
      c1.note = 'This is a note!';
      await sheet.saveUpdatedCells();
      sheet.resetLocalCache(true);
      await sheet.loadCells('A1');
      expect(sheet.getCell(0, 0).note).toBe(c1.note);
    });

    it('can update multiple cell properties at once', async () => {
      c1.note = null;
      c1.value = 567.89;
      c1.textFormat = { bold: true };
      await sheet.saveUpdatedCells();
    });

    it('can clear cell value using null, undefined, empty string', async () => {
      _.each([c1, c2, c3], (cell) => { cell.value = 'something'; });
      await sheet.saveUpdatedCells();
      c1.value = null;
      c2.value = undefined;
      c3.value = '';
      await sheet.saveUpdatedCells();
      _.each([c1, c2, c3], (cell) => { expect(cell.value).toBeNull(); });
    });

    it('cannot set a cell value to an object', async () => {
      expect(() => { (c1.value as any) = { foo: 1 }; }).toThrow();
    });

    describe('calling saveCells directly', () => {
      it('can save an array of cells', async () => {
        _.each([c1, c2, c3], (cell) => { cell.value = 'calling saveCells'; });
        await sheet.saveCells([c1, c2, c3]);
      });

      it('can save a mix of dirty and non-dirty', async () => {
        c2.value = 'saveCells again';
        await sheet.saveCells([c1, c2, c3]);
      });

      it('will throw an error if no cells are dirty', async () => {
        await expect(sheet.saveCells([c1, c2, c3])).rejects.toThrow();
      });
    });

    describe('cell formulas', () => {
      it('can update a cell with a formula via .value', async () => {
        c1.value = '=2';
        await sheet.saveUpdatedCells();
        expect(c1.value).toBe(2);
        expect(c1.formula).toBe('=2');
      });

      it('can update a cell with a formula via .formula', async () => {
        c1.formula = '=1';
        await sheet.saveUpdatedCells();
        expect(c1.value).toBe(1);
        expect(c1.formula).toBe('=1');
      });

      it('can only set .formula with a string starting with "="', async () => {
        expect(() => { c1.formula = '123'; }).toThrow();
      });

      it('cannot set a formula to a non-string', async () => {
        expect(() => { (c1.formula as any) = 123; }).toThrow();
      });

      it('handles formula errors correctly', async () => {
        c1.formula = '=NOTAFORMULA';
        await sheet.saveUpdatedCells();
        expect(c1.value).toBeInstanceOf(GoogleSpreadsheetCellErrorValue);
        expect(c1.value).toEqual(c1.errorValue);
      });
    });

    describe('value type handling', () => {
      _.each({
        string: { value: 'string', valueType: 'stringValue' },
        number: { value: 123.45, valueType: 'numberValue' },
        boolean: { value: true, valueType: 'boolValue' },
        'formula number': { value: '=123', valueType: 'numberValue' },
        'formula boolean': { value: '=TRUE', valueType: 'boolValue' },
        'formula string': { value: '="ASDF"', valueType: 'stringValue' },
        'formula error': { value: '=BADFFORMULA', valueType: 'errorValue' },
      }, (spec, type) => {
        it(`can set a value with type - ${type}`, async () => {
          c1.value = spec.value;
          await sheet.saveUpdatedCells();
          expect(c1.valueType).toBe(spec.valueType);
        });
      });
    });
  });

  describe.todo('cell formatting', () => {
    // TODO: add tests!
    // - set the background color twice, conflicts b/w backgroundColor and backgroundColorStyle
  });
});
