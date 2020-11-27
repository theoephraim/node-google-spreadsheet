const _ = require('lodash');
const { JWT } = require('google-auth-library');
const Axios = require('axios');

const GoogleSpreadsheetWorksheet = require('./GoogleSpreadsheetWorksheet');
const { getFieldMask } = require('./utils');

const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',

  // the list from the sheets v4 auth for spreadsheets.get
  // 'https://www.googleapis.com/auth/drive',
  // 'https://www.googleapis.com/auth/drive.readonly',
  // 'https://www.googleapis.com/auth/drive.file',
  // 'https://www.googleapis.com/auth/spreadsheets',
  // 'https://www.googleapis.com/auth/spreadsheets.readonly',
];

const AUTH_MODES = {
  JWT: 'JWT',
  API_KEY: 'API_KEY',
  RAW_ACCESS_TOKEN: 'RAW_ACCESS_TOKEN',
};

class GoogleSpreadsheet {
  constructor(sheetId) {
    this.spreadsheetId = sheetId;
    this.authMode = null;
    this._rawSheets = {};
    this._rawProperties = null;

    // create an axios instance with sheet root URL and interceptors to handle auth
    this.axios = Axios.create({
      baseURL: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId || ''}`,
      // send arrays in params with duplicate keys - ie `?thing=1&thing=2` vs `?thing[]=1...`
      // solution taken from https://github.com/axios/axios/issues/604
      paramsSerializer(params) {
        let options = '';
        _.keys(params).forEach((key) => {
          const isParamTypeObject = typeof params[key] === 'object';
          const isParamTypeArray = isParamTypeObject && (params[key].length >= 0);
          if (!isParamTypeObject) options += `${key}=${encodeURIComponent(params[key])}&`;
          if (isParamTypeObject && isParamTypeArray) {
            _.each(params[key], (val) => {
              options += `${key}=${encodeURIComponent(val)}&`;
            });
          }
        });
        return options ? options.slice(0, -1) : options;
      },
    });
    // have to use bind here or the functions dont have access to `this` :(
    this.axios.interceptors.request.use(this._setAxiosRequestAuth.bind(this));
    this.axios.interceptors.response.use(
      this._handleAxiosResponse.bind(this),
      this._handleAxiosErrors.bind(this)
    );

    return this;
  }

  // CREATE NEW DOC ////////////////////////////////////////////////////////////////////////////////
  async createNewSpreadsheetDocument(properties) {
    // see updateProperties for more info about available properties

    if (this.spreadsheetId) {
      throw new Error('Only call `createNewSpreadsheetDocument()` on a GoogleSpreadsheet object that has no spreadsheetId set');
    }
    const response = await this.axios.post(this.url, {
      properties,
    });
    this.spreadsheetId = response.data.spreadsheetId;
    this.axios.defaults.baseURL += this.spreadsheetId;

    this._rawProperties = response.data.properties;
    _.each(response.data.sheets, (s) => this._updateOrCreateSheet(s));
  }

  // AUTH RELATED FUNCTIONS ////////////////////////////////////////////////////////////////////////
  async useApiKey(key) {
    this.authMode = AUTH_MODES.API_KEY;
    this.apiKey = key;
  }

  // token must be created and managed (refreshed) elsewhere
  async useRawAccessToken(token) {
    this.authMode = AUTH_MODES.RAW_ACCESS_TOKEN;
    this.accessToken = token;
  }

  // creds should be an object obtained by loading the json file google gives you
  // impersonateAs is an email of any user in the G Suite domain
  // (only works if service account has domain-wide delegation enabled)
  async useServiceAccountAuth(creds, impersonateAs = null) {
    this.jwtClient = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: GOOGLE_AUTH_SCOPES,
      subject: impersonateAs,
    });
    await this.renewJwtAuth();
  }

  async renewJwtAuth() {
    this.authMode = AUTH_MODES.JWT;
    await this.jwtClient.authorize();
    /*
    returned token looks like
      {
        access_token: 'secret-token...',
        token_type: 'Bearer',
        expiry_date: 1576005020000,
        id_token: undefined,
        refresh_token: 'jwt-placeholder'
      }
    */
  }

  // TODO: provide mechanism to share single JWT auth between docs?

  // INTERNAL UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////
  async _setAxiosRequestAuth(config) {
    // TODO: check auth mode, if valid, renew if expired, etc
    if (this.authMode === AUTH_MODES.JWT) {
      if (!this.jwtClient) throw new Error('JWT auth is not set up properly');
      // this seems to do the right thing and only renew the token if expired
      await this.jwtClient.authorize();
      config.headers.Authorization = `Bearer ${this.jwtClient.credentials.access_token}`;
    } else if (this.authMode === AUTH_MODES.RAW_ACCESS_TOKEN) {
      if (!this.accessToken) throw new Error('Invalid access token');
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    } else if (this.authMode === AUTH_MODES.API_KEY) {
      if (!this.apiKey) throw new Error('Please set API key');
      config.params = config.params || {};
      config.params.key = this.apiKey;
    } else {
      throw new Error('You must initialize some kind of auth before making any requests');
    }
    return config;
  }

  async _handleAxiosResponse(response) { return response; }
  async _handleAxiosErrors(error) {
    // console.log(error);
    if (error.response && error.response.data) {
      // usually the error has a code and message, but occasionally not
      if (!error.response.data.error) throw error;

      const { code, message } = error.response.data.error;
      error.message = `Google API error - [${code}] ${message}`;
      throw error;
    }

    if (_.get(error, 'response.status') === 403) {
      if (this.authMode === AUTH_MODES.API_KEY) {
        throw new Error('Sheet is private. Use authentication or make public. (see https://github.com/theoephraim/node-google-spreadsheet#a-note-on-authentication for details)');
      }
    }
    throw error;
  }

  async _makeSingleUpdateRequest(requestType, requestParams) {
    const response = await this.axios.post(':batchUpdate', {
      requests: [{ [requestType]: requestParams }],
      includeSpreadsheetInResponse: true,
      // responseRanges: [string]
      // responseIncludeGridData: true
    });

    this._updateRawProperties(response.data.updatedSpreadsheet.properties);
    _.each(response.data.updatedSpreadsheet.sheets, (s) => this._updateOrCreateSheet(s));
    // console.log('API RESPONSE', response.data.replies[0][requestType]);
    return response.data.replies[0][requestType];
  }

  async _makeBatchUpdateRequest(requests, responseRanges) {
    // this is used for updating batches of cells
    const response = await this.axios.post(':batchUpdate', {
      requests,
      includeSpreadsheetInResponse: true,
      ...responseRanges && {
        responseIncludeGridData: true,
        ...responseRanges !== '*' && { responseRanges },
      },
    });

    this._updateRawProperties(response.data.updatedSpreadsheet.properties);
    _.each(response.data.updatedSpreadsheet.sheets, (s) => this._updateOrCreateSheet(s));
  }

  _ensureInfoLoaded() {
    if (!this._rawProperties) throw new Error('You must call `doc.loadInfo()` before accessing this property');
  }

  _updateRawProperties(newProperties) { this._rawProperties = newProperties; }

  _updateOrCreateSheet({ properties, data }) {
    const { sheetId } = properties;
    if (!this._rawSheets[sheetId]) {
      this._rawSheets[sheetId] = new GoogleSpreadsheetWorksheet(this, { properties, data });
    } else {
      this._rawSheets[sheetId]._rawProperties = properties;
      this._rawSheets[sheetId]._fillCellData(data);
    }
  }

  // BASIC PROPS //////////////////////////////////////////////////////////////////////////////
  _getProp(param) {
    this._ensureInfoLoaded();
    return this._rawProperties[param];
  }
  _setProp(param, newVal) { // eslint-disable-line no-unused-vars
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  get title() { return this._getProp('title'); }
  get locale() { return this._getProp('locale'); }
  get timeZone() { return this._getProp('timeZone'); }
  get autoRecalc() { return this._getProp('autoRecalc'); }
  get defaultFormat() { return this._getProp('defaultFormat'); }
  get spreadsheetTheme() { return this._getProp('spreadsheetTheme'); }
  get iterativeCalculationSettings() { return this._getProp('iterativeCalculationSettings'); }

  set title(newVal) { this._setProp('title', newVal); }
  set locale(newVal) { this._setProp('locale', newVal); }
  set timeZone(newVal) { this._setProp('timeZone', newVal); }
  set autoRecalc(newVal) { this._setProp('autoRecalc', newVal); }
  set defaultFormat(newVal) { this._setProp('defaultFormat', newVal); }
  set spreadsheetTheme(newVal) { this._setProp('spreadsheetTheme', newVal); }
  set iterativeCalculationSettings(newVal) { this._setProp('iterativeCalculationSettings', newVal); }

  async updateProperties(properties) {
    // updateSpreadsheetProperties
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#SpreadsheetProperties

    /*
      title (string) - title of the spreadsheet
      locale (string) - ISO code
      autoRecalc (enum) - ON_CHANGE|MINUTE|HOUR
      timeZone (string) - timezone code
      iterativeCalculationSettings (object) - see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#IterativeCalculationSettings
     */

    await this._makeSingleUpdateRequest('updateSpreadsheetProperties', {
      properties,
      fields: getFieldMask(properties),
    });
  }

  // BASIC INFO ////////////////////////////////////////////////////////////////////////////////////
  async loadInfo(includeCells) {
    const response = await this.axios.get('/', {
      params: {
        ...includeCells && { includeGridData: true },
      },
    });
    this._rawProperties = response.data.properties;
    _.each(response.data.sheets, (s) => this._updateOrCreateSheet(s));
  }
  async getInfo() { return this.loadInfo(); } // alias to mimic old version

  resetLocalCache() {
    this._rawProperties = null;
    this._rawSheets = {};
  }

  // WORKSHEETS ////////////////////////////////////////////////////////////////////////////////////
  get sheetCount() {
    this._ensureInfoLoaded();
    return _.values(this._rawSheets).length;
  }

  get sheetsById() {
    this._ensureInfoLoaded();
    return this._rawSheets;
  }

  get sheetsByIndex() {
    this._ensureInfoLoaded();
    return _.sortBy(this._rawSheets, 'index');
  }

  get sheetsByTitle() {
    this._ensureInfoLoaded();
    return _.keyBy(this._rawSheets, 'title');
  }

  async addSheet(properties = {}) {
    // Request type = `addSheet`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddSheetRequest

    const response = await this._makeSingleUpdateRequest('addSheet', {
      properties: _.omit(properties, 'headers', 'headerValues'),
    });
    // _makeSingleUpdateRequest already adds the sheet
    const newSheetId = response.properties.sheetId;
    const newSheet = this.sheetsById[newSheetId];

    // allow it to work with `.headers` but `.headerValues` is the real prop
    if (properties.headerValues || properties.headers) {
      await newSheet.setHeaderRow(properties.headerValues || properties.headers);
    }

    return newSheet;
  }
  async addWorksheet(properties) { return this.addSheet(properties); } // alias to mimic old version

  async deleteSheet(sheetId) {
    // Request type = `deleteSheet`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteSheetRequest
    await this._makeSingleUpdateRequest('deleteSheet', { sheetId });
    delete this._rawSheets[sheetId];
  }

  // NAMED RANGES //////////////////////////////////////////////////////////////////////////////////
  async addNamedRange(name, range, namedRangeId) {
    // namedRangeId is optional
    return this._makeSingleUpdateRequest('addNamedRange', {
      name,
      range,
      namedRangeId,
    });
  }

  async deleteNamedRange(namedRangeId) {
    return this._makeSingleUpdateRequest('deleteNamedRange', { namedRangeId });
  }

  // LOADING CELLS /////////////////////////////////////////////////////////////////////////////////
  async loadCells(filters) {
    // you can pass in a single filter or an array of filters
    // strings are treated as a1 ranges
    // objects are treated as GridRange objects
    // TODO: make it support DeveloperMetadataLookup objects

    // TODO: switch to this mode if using a read-only auth token?
    const readOnlyMode = this.authMode === AUTH_MODES.API_KEY;

    const filtersArray = _.isArray(filters) ? filters : [filters];
    const dataFilters = _.map(filtersArray, (filter) => {
      if (_.isString(filter)) {
        return readOnlyMode ? filter : { a1Range: filter };
      }
      if (_.isObject(filter)) {
        if (readOnlyMode) {
          throw new Error('Only A1 ranges are supported when fetching cells with read-only access (using only an API key)');
        }
        // TODO: make this support Developer Metadata filters
        return { gridRange: filter };
      }
      throw new Error('Each filter must be an A1 range string or a gridrange object');
    });

    let result;
    // when using an API key only, we must use the regular get endpoint
    // because :getByDataFilter requires higher access
    if (this.authMode === AUTH_MODES.API_KEY) {
      result = await this.axios.get('/', {
        params: {
          includeGridData: true,
          ranges: dataFilters,
        },
      });
    // otherwise we use the getByDataFilter endpoint because it is more flexible
    } else {
      result = await this.axios.post(':getByDataFilter', {
        includeGridData: true,
        dataFilters,
      });
    }

    const { sheets } = result.data;
    _.each(sheets, (sheet) => { this._updateOrCreateSheet(sheet); });
  }
}

module.exports = GoogleSpreadsheet;
