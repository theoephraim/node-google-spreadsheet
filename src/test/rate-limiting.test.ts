import { describe, expect, it } from 'vitest';
import nock from 'nock';
import { GoogleSpreadsheet } from '../lib/GoogleSpreadsheet';

const SPREADSHEET_ID = '123456';
const SPREADSHEET_URI_PART = `/${SPREADSHEET_ID}/`;
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const MOCKED_SHEET = {
  spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/`,
  properties: [],
};

const sheetRetryTests = (doc: GoogleSpreadsheet, maxRetries: number = 2) => {
  it('does not affect non-rate-limited requests', async () => {
    const scope = nock(SHEETS_API)
      .get(SPREADSHEET_URI_PART)
      .reply(200, MOCKED_SHEET);
    await doc.loadInfo();
    scope.done();
  });

  it('retries the max amount and then throws if still rate limited', async () => {
    const scope = nock(SHEETS_API)
      .get(SPREADSHEET_URI_PART)
      .times(maxRetries + 1)
      .reply(429, {});
    try {
      await doc.loadInfo();
    } catch (error) {
      expect((error as Error).message).toContain('Request failed with status code 429');
    }
    scope.done();
  });

  it('retries the max amount and then succeeds if no longer rate limited', async () => {
    const scope = nock(SHEETS_API)
      .get(SPREADSHEET_URI_PART)
      .times(maxRetries)
      .reply(429, {})
      .get(SPREADSHEET_URI_PART)
      .reply(200, MOCKED_SHEET);
    await doc.loadInfo();
    scope.done();
  });
};

describe('Rate limited handling configured with custom configuration', async () => {
  const maxRetries = 4;
  const doc = new GoogleSpreadsheet(
    SPREADSHEET_ID,
    {
      getRequestHeaders: async () => ({
        Authorization: 'Bearer fake-access-token',
      }),
    },
    {
      retryConfig: {
        limit: maxRetries,
        backoffLimit: 5,
      },
    }
  );

  sheetRetryTests(doc, maxRetries);
});

describe('Rate limited handling with default implementation', async () => {
  const doc = new GoogleSpreadsheet(
    SPREADSHEET_ID,
    {
      getRequestHeaders: async () => ({
        Authorization: 'Bearer fake-access-token',
      }),
    }
  );

  // Ky defaults to 2 retries
  sheetRetryTests(doc, 2);
});

describe('Rate limited handling disabled', async () => {
  const doc = new GoogleSpreadsheet(
    SPREADSHEET_ID,
    {
      getRequestHeaders: async () => ({
        Authorization: 'Bearer fake-access-token',
      }),
    },
    {
      retryConfig: {
        limit: 0,
      },
    }
  );

  it('does not affect non-rate-limited requests', async () => {
    const scope = nock(SHEETS_API)
      .get(SPREADSHEET_URI_PART)
      .reply(200, MOCKED_SHEET);
    await doc.loadInfo();
    scope.done();
  });

  it('throws if rate limited', async () => {
    const scope = nock(SHEETS_API)
      .get(SPREADSHEET_URI_PART)
      .reply(429, {});
    try {
      await doc.loadInfo();
    } catch (error) {
      expect((error as Error).message).toContain('Request failed with status code 429');
    }
    scope.done();
  });
});
