import {
  describe, expect, it, beforeAll, afterAll, afterEach,
} from 'vitest';
import { setTimeout as delay } from 'timers/promises';

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

  // export endpoint has tight rate limits
  afterEach(async () => delay(3000));

  it('can download document as XLSX', async () => {
    const buffer = await doc.downloadAsXLSX();
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('can download worksheet as CSV and verify content', async () => {
    const buffer = await sheet.downloadAsCSV();
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const csvText = new TextDecoder().decode(buffer);
    const lines = csvText.trim().split('\n');

    expect(lines[0]).toContain('name');
    expect(lines[0]).toContain('value');
    expect(lines[1]).toContain('Alice');
    expect(lines[2]).toContain('Bob');
    expect(lines[3]).toContain('Charlie');
  });

  it('can download worksheet as TSV', async () => {
    const buffer = await sheet.downloadAsTSV();
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const tsvText = new TextDecoder().decode(buffer);
    expect(tsvText).toContain('\t');
    expect(tsvText).toContain('Alice');
  });

  it('can download worksheet as PDF', async () => {
    const buffer = await sheet.downloadAsPDF();
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
