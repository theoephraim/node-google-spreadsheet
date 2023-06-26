const _ = require('lodash');
const delay = require('delay');

const GoogleSpreadsheetCell = require('../lib/GoogleSpreadsheetCell');

const docs = require('./load-test-docs')();
const creds = require('./service-account-creds.json');
const apiKey = require('./api-key');

function checkDocAccess(docType, spec) {
  const doc = docs[docType];
  let sheet;

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
  if (process.env.NODE_ENV === 'ci') afterEach(async () => delay(500));

  describe('without setting auth', () => {
    it('loadInfo should fail on any doc', async () => {
      await expect(docs.public.loadInfo()).rejects.toThrow(
        'initialize some kind of auth'
      );
    });
  });

  describe('using an API key', () => {
    it('*set up auth for all docs*', async () => {
      await docs.private.useApiKey(apiKey);
      await docs.public.useApiKey(apiKey);
      await docs.publicReadOnly.useApiKey(apiKey);
    });

    checkDocAccess('private', {
      canRead: false,
      canWrite: false,
      readError: '[403]',
    });
    checkDocAccess('public', {
      canRead: true,
      canWrite: false,
      writeError: '[401]',
    }); // requires auth to write
    checkDocAccess('publicReadOnly', {
      canRead: true,
      canWrite: false,
      writeError: '[401]',
    });
  });

  describe('using service account creds', () => {
    it('can initialize service account auth', async () => {
      await docs.private.useServiceAccountAuth(creds);
    });

    describe('initializing auth with bad creds', () => {
      _.each(
        {
          null: null,
          'empty object': {},
          'bad email': { ...creds, client_email: 'not-the-email@gmail.com' },
          'bad token': {
            ...creds,
            private_key: creds.private_key.replace(/a/g, 'b'),
          },
        },
        (badCreds, description) => {
          it(`should fail for bad creds - ${description}`, async () => {
            await expect(
              docs.private.useServiceAccountAuth(badCreds)
            ).rejects.toThrow();
          });
        }
      );
    });

    it('*set up auth for all docs*', async () => {
      await docs.private.useServiceAccountAuth(creds);
      await docs.public.useServiceAccountAuth(creds);
      await docs.publicReadOnly.useServiceAccountAuth(creds);
      await docs.privateReadOnly.useServiceAccountAuth(creds);
    });

    checkDocAccess('private', { canRead: true, canWrite: true });
    checkDocAccess('public', { canRead: true, canWrite: true });
    checkDocAccess('publicReadOnly', {
      canRead: true,
      canWrite: false,
      writeError: '[403]',
    });
    checkDocAccess('privateReadOnly', {
      canRead: true,
      canWrite: false,
      writeError: '[403]',
    });
  });
});
