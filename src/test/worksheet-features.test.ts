import {
  describe, expect, it, beforeAll, afterAll, afterEach,
} from 'vitest';
import { setTimeout as delay } from 'timers/promises';
import { ENV } from 'varlock/env';

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from '..';

import { DOC_IDS, testServiceAccountAuth } from './auth/docs-and-auth';

const doc = new GoogleSpreadsheet(DOC_IDS.private, testServiceAccountAuth);

describe('Worksheet features', () => {
  // hitting rate limits when running tests on ci - so we add a short delay
  if (ENV.TEST_DELAY) afterEach(async () => delay(ENV.TEST_DELAY));

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
      const result = await sheet.addFilterView({
        title: 'Test Filter',
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 4,
          startColumnIndex: 0,
          endColumnIndex: 3,
        },
      });
      filterViewId = result.filter.filterViewId;
      expect(filterViewId).toBeTruthy();
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
      const result = await sheet.addBanding({
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
      bandedRangeId = result.bandedRange.bandedRangeId;
      expect(bandedRangeId).toBeTruthy();
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
      const result = await sheet.createDeveloperMetadata({
        metadataKey: 'test-key',
        metadataValue: 'test-value',
        location: {
          sheetId: sheet.sheetId,
        },
        visibility: 'DOCUMENT',
      });
      expect(result).toBeTruthy();
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
          },
          visibility: 'DOCUMENT',
        },
        'metadataValue'
      );
    });

    it('can search developer metadata', async () => {
      // create a metadata entry to search for
      await sheet.createDeveloperMetadata({
        metadataKey: 'search-test-key',
        metadataValue: 'search-test-value',
        location: { sheetId: sheet.sheetId },
        visibility: 'DOCUMENT',
      });

      const results = await doc.searchDeveloperMetadata([
        { developerMetadataLookup: { metadataKey: 'search-test-key' } },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].metadataKey).toBe('search-test-key');
      expect(results[0].metadataValue).toBe('search-test-value');

      // clean up
      await sheet.deleteDeveloperMetadata({
        developerMetadataLookup: { metadataKey: 'search-test-key' },
      });
    });

    it('can load cells using a developer metadata filter', async () => {
      // create row-level metadata on row 0
      await sheet.createDeveloperMetadata({
        metadataKey: 'row-meta-key',
        metadataValue: 'row-meta-value',
        location: {
          dimensionRange: {
            sheetId: sheet.sheetId,
            dimension: 'ROWS',
            startIndex: 0,
            endIndex: 1,
          },
        },
        visibility: 'DOCUMENT',
      });

      // load cells using developer metadata filter on doc
      await doc.loadCells({
        developerMetadataLookup: { metadataKey: 'row-meta-key' },
      });

      // load cells using developer metadata filter on sheet
      sheet.resetLocalCache(true);
      await sheet.loadCells({
        developerMetadataLookup: { metadataKey: 'row-meta-key' },
      });

      // verify cells were loaded (row 0 should be accessible)
      const cell = sheet.getCell(0, 0);
      expect(cell).toBeTruthy();

      // clean up
      await sheet.deleteDeveloperMetadata({
        developerMetadataLookup: { metadataKey: 'row-meta-key' },
      });
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
