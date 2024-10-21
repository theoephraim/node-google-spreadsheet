import {
  describe, expect, it,
} from 'vitest';
import nock from 'nock';
import axios from 'axios';
import { GoogleSpreadsheet } from '../lib/GoogleSpreadsheet';

axios.defaults.adapter = 'http';

const SPREADSHEET_ID = '123456';
const SPREADSHEET_URI_PART = `/${SPREADSHEET_ID}/`;
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const MOCKED_SHEET = {
  spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/`,
  properties: [],
};

const sheetRetryTests = (doc: GoogleSpreadsheet) => {
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
      .times(4)
      .reply(429, {});
    await expect(doc.loadInfo()).rejects.toHaveProperty('message', 'Request failed with status code 429');
    scope.done();
  });

  it('retries the max amount and then succeeds if no longer rate limited', async () => {
    const scope = nock(SHEETS_API)
      .get(SPREADSHEET_URI_PART)
      .times(3)
      .reply(429, {})
      .get(SPREADSHEET_URI_PART)
      .reply(200, MOCKED_SHEET);
    await doc.loadInfo();
    scope.done();
  });
};

describe('Rate limited handling configured with custom implementation', async () => {
  const doc = new GoogleSpreadsheet(
    SPREADSHEET_ID,
    {
      getRequestHeaders: async () => ({
        Authorization: 'Bearer fake-access-token',
      }),
    },
    {
      retryOnRateLimit: {
        maxRetries: 3,
        retryStrategy: () => 1000,
      },
    }
  );

  sheetRetryTests(doc);
});

describe('Rate limited handling configured with default implementation', async () => {
  const doc = new GoogleSpreadsheet(
    SPREADSHEET_ID,
    {
      getRequestHeaders: async () => ({
        Authorization: 'Bearer fake-access-token',
      }),
    },
    {
      retryOnRateLimit: true,
    }
  );

  sheetRetryTests(doc);
});

describe('Rate limited handling not enabled', async () => {
  const doc = new GoogleSpreadsheet(
    SPREADSHEET_ID,
    {
      getRequestHeaders: async () => ({
        Authorization: 'Bearer fake-access-token',
      }),
    },
    {
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
    await expect(doc.loadInfo()).rejects.toHaveProperty('message', 'Request failed with status code 429');
    scope.done();
  });
});
