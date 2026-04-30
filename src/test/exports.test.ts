import {
  describe, expect, it, beforeAll, afterAll, afterEach,
} from 'vitest';
import { setTimeout as delay } from 'timers/promises';
import { ENV } from 'varlock/env';

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from '..';

import { DOC_IDS, testServiceAccountAuth } from './auth/docs-and-auth';

const doc = new GoogleSpreadsheet(DOC_IDS.private, testServiceAccountAuth);
let sheet: GoogleSpreadsheetWorksheet;

describe('Export/download methods', () => {
  beforeAll(async () => {
    await doc.loadInfo();
    sheet = await doc.addSheet({
      title: `Export test ${+new Date()}`,
      headerValues: ['name', 'value'],
    });
    await sheet.addRows([
      { name: 'Alice', value: '100' },
      { name: 'Bob', value: '200' },
      { name: 'Charlie', value: '300' },
    ]);
  });

  afterAll(async () => {
    await sheet.delete();
  });

  // hitting rate limits when running tests on ci - so we add a short delay
  if (ENV.TEST_DELAY) afterEach(async () => delay(ENV.TEST_DELAY));

  describe('document-level exports', () => {
    it('can download as XLSX', async () => {
      const buffer = await doc.downloadAsXLSX();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('can download as XLSX stream', async () => {
      const stream = await doc.downloadAsXLSX(true);
      expect(stream).toBeTruthy();
      // ReadableStream should have a getReader method
      expect(typeof (stream as ReadableStream).getReader).toBe('function');
    });

    it('can download as ODS', async () => {
      const buffer = await doc.downloadAsODS();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('can download as zipped HTML', async () => {
      const buffer = await doc.downloadAsZippedHTML();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('worksheet-level exports', () => {
    it('can download as CSV and verify content', async () => {
      const buffer = await sheet.downloadAsCSV();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);

      const csvText = new TextDecoder().decode(buffer);
      const lines = csvText.trim().split('\n');

      // header row
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('value');

      // data rows
      expect(lines[1]).toContain('Alice');
      expect(lines[1]).toContain('100');
      expect(lines[2]).toContain('Bob');
      expect(lines[2]).toContain('200');
      expect(lines[3]).toContain('Charlie');
      expect(lines[3]).toContain('300');
    });

    it('can download as CSV stream', async () => {
      const stream = await sheet.downloadAsCSV(true);
      expect(stream).toBeTruthy();
      expect(typeof (stream as ReadableStream).getReader).toBe('function');
    });

    it('can download as TSV', async () => {
      const buffer = await sheet.downloadAsTSV();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);

      const tsvText = new TextDecoder().decode(buffer);
      // TSV uses tabs
      expect(tsvText).toContain('\t');
      expect(tsvText).toContain('Alice');
    });

    it('can download as PDF', async () => {
      const buffer = await sheet.downloadAsPDF();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });
});
