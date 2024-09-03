import 'dmno/auto-inject-globals';
import {
  describe, expect, it, afterEach,
} from 'vitest';
import delay from 'delay';

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet, GoogleSpreadsheetCell } from '..';

import { DOC_IDS, testServiceAccountAuth } from './auth/docs-and-auth';
import { GoogleApiAuth } from '../lib/types/auth-types';

function checkDocAccess(
  docType: keyof typeof DOC_IDS,
  auth: GoogleApiAuth,
  spec: {
    canRead?: boolean,
    canWrite?: boolean,
    readError?: string,
    writeError?: string,
  }
) {
  const doc = new GoogleSpreadsheet(DOC_IDS[docType], auth);
  let sheet: GoogleSpreadsheetWorksheet;

  describe(`Doc type = ${docType}`, () => {
    if (spec.canRead) {
      it('reading info should succeed', async () => {
        await doc.loadInfo();
        expect(doc.title).toBeTruthy();
        sheet = doc.sheetsByIndex[0];
      });
      it('reading row data should succeed', async () => {
        const rows = await sheet.getRows();
        expect(rows).toBeInstanceOf(Array);
      });
      it('reading cell data should succeed', async () => {
        await sheet.loadCells('A1');
        expect(sheet.getCell(0, 0)).toBeInstanceOf(GoogleSpreadsheetCell);
      });
    } else {
      it('reading info should fail', async () => {
        await expect(doc.loadInfo()).rejects.toThrow(spec.readError);
      });
    }

    if (spec.canWrite) {
      it('writing should succeed', async () => {
        if (!sheet) return;
        await sheet.addRow([1, 2, 3]);
      });
    } else {
      it('writing should fail', async () => {
        if (!sheet) return;
        await expect(sheet.addRow([1, 2, 3])).rejects.toThrow(spec.writeError);
      });
    }
  });
}

describe('Authentication', () => {
  // hitting rate limits when running tests on ci - so we add a short delay
  if (DMNO_CONFIG.TEST_DELAY) afterEach(async () => delay(DMNO_CONFIG.TEST_DELAY));

  const apiKeyAuth = { apiKey: process.env.GOOGLE_API_KEY! };

  describe('api key', () => {
    checkDocAccess('private', apiKeyAuth, {
      canRead: false,
      canWrite: false,
      readError: '[403]',
    });
    checkDocAccess('public', apiKeyAuth, {
      canRead: true,
      canWrite: false, // requires auth to write
      writeError: '[401]',
    });

    checkDocAccess('publicReadOnly', apiKeyAuth, {
      canRead: true,
      canWrite: false,
      writeError: '[401]',
    });
  });

  describe('service account', () => {
    checkDocAccess('private', testServiceAccountAuth, {
      canRead: true,
      canWrite: true,
    });
    checkDocAccess('public', testServiceAccountAuth, {
      canRead: true,
      canWrite: true,
    });
    checkDocAccess('publicReadOnly', testServiceAccountAuth, {
      canRead: true,
      canWrite: false,
      writeError: '[403]',
    });
    checkDocAccess('privateReadOnly', testServiceAccountAuth, {
      canRead: true,
      canWrite: false,
      writeError: '[403]',
    });
  });

  // describe('oauth')
});
