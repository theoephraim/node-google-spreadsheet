import Axios, {
  AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig,
} from 'axios';

import { Stream } from 'stream';
import * as _ from './lodash';
import { GoogleSpreadsheetWorksheet } from './GoogleSpreadsheetWorksheet';
import { axiosParamsSerializer, getFieldMask } from './utils';
import {
  DataFilter, GridRange, NamedRangeId, SpreadsheetId, SpreadsheetProperties, WorksheetId, WorksheetProperties,
} from './types/sheets-types';
import { PermissionRoles, PermissionsList, PublicPermissionRoles } from './types/drive-types';
import { RecursivePartial } from './types/util-types';
import { AUTH_MODES, GoogleApiAuth } from './types/auth-types';


const SHEETS_API_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

const EXPORT_CONFIG: Record<string, { singleWorksheet?: boolean }> = {
  html: {},
  zip: {},
  xlsx: {},
  ods: {},
  csv: { singleWorksheet: true },
  tsv: { singleWorksheet: true },
  pdf: { singleWorksheet: true },
};
type ExportFileTypes = keyof typeof EXPORT_CONFIG;




function getAuthMode(auth: GoogleApiAuth) {
  if ('getRequestHeaders' in auth) return AUTH_MODES.GOOGLE_AUTH_CLIENT;
  if ('token' in auth && auth.token) return AUTH_MODES.RAW_ACCESS_TOKEN;
  // google-auth-library now has an empty `apiKey` property
  if ('apiKey' in auth && auth.apiKey) return AUTH_MODES.API_KEY;
  throw new Error('Invalid auth');
}

async function getRequestAuthConfig(auth: GoogleApiAuth) {
  // google-auth-libary methods all can call this method to get the right headers
  // JWT | OAuth2Client | GoogleAuth | Impersonate | AuthClient
  if ('getRequestHeaders' in auth) {
    const headers = await auth.getRequestHeaders();
    return { headers };
  }

  // API key only access passes through the api key as a query param
  // (note this can only provide read-only access)
  if ('apiKey' in auth && auth.apiKey) {
    return { params: { key: auth.apiKey } };
  }

  // RAW ACCESS TOKEN
  if ('token' in auth && auth.token) {
    return { headers: { Authorization: `Bearer ${auth.token}` } };
  }

  throw new Error('Invalid auth');
}

/**
 * Google Sheets document
 *
 * @description
 * **This class represents an entire google spreadsheet document**
 * Provides methods to interact with document metadata/settings, formatting, manage sheets, and acts as the main gateway to interacting with sheets and data that the document contains.q
 *
 */
export class GoogleSpreadsheet {
  readonly spreadsheetId: string;

  public auth: GoogleApiAuth;
  get authMode() {
    return getAuthMode(this.auth);
  }

  private _rawSheets: any;
  private _rawProperties = null as SpreadsheetProperties | null;
  private _spreadsheetUrl = null as string | null;
  private _deleted = false;

  /**
   * Sheets API [axios](https://axios-http.com) instance
   * authentication is automatically attached
   * can be used if unsupported sheets calls need to be made
   * @see https://developers.google.com/sheets/api/reference/rest
   * */
  readonly sheetsApi: AxiosInstance;

  /**
   * Drive API [axios](https://axios-http.com) instance
   * authentication automatically attached
   * can be used if unsupported drive calls need to be made
   * @topic permissions
   * @see https://developers.google.com/drive/api/v3/reference
   * */
  readonly driveApi: AxiosInstance;


  /**
   * initialize new GoogleSpreadsheet
   * @category Initialization
   * */
  constructor(
    /** id of google spreadsheet doc */
    spreadsheetId: SpreadsheetId,
    /** authentication to use with Google Sheets API */
    auth: GoogleApiAuth
  ) {
    this.spreadsheetId = spreadsheetId;
    this.auth = auth;

    this._rawSheets = {};
    this._spreadsheetUrl = null;

    // create an axios instance with sheet root URL and interceptors to handle auth
    this.sheetsApi = Axios.create({
      baseURL: `${SHEETS_API_BASE_URL}/${spreadsheetId}`,
      paramsSerializer: axiosParamsSerializer,
      // removing limits in axios for large requests
      // https://stackoverflow.com/questions/56868023/error-request-body-larger-than-maxbodylength-limit-when-sending-base64-post-req
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    this.driveApi = Axios.create({
      baseURL: `${DRIVE_API_BASE_URL}/${spreadsheetId}`,
      paramsSerializer: axiosParamsSerializer,
    });
    // have to use bind here or the functions dont have access to `this` :(
    this.sheetsApi.interceptors.request.use(this._setAxiosRequestAuth.bind(this));
    this.sheetsApi.interceptors.response.use(
      this._handleAxiosResponse.bind(this),
      this._handleAxiosErrors.bind(this)
    );
    this.driveApi.interceptors.request.use(this._setAxiosRequestAuth.bind(this));
    this.driveApi.interceptors.response.use(
      this._handleAxiosResponse.bind(this),
      this._handleAxiosErrors.bind(this)
    );
  }


  // AUTH RELATED FUNCTIONS ////////////////////////////////////////////////////////////////////////

  // INTERNAL UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////

  /** @internal */
  async _setAxiosRequestAuth(config: InternalAxiosRequestConfig) {
    const authConfig = await getRequestAuthConfig(this.auth);
    if (authConfig.headers) {
      // google-auth-library v10 uses a Headers object
      const headers = 'entries' in authConfig.headers
        ? Object.fromEntries((authConfig.headers as any).entries())
        : authConfig.headers;

      Object.entries(headers).forEach(([key, val]) => {
        config.headers.set(key, String(val));
      });
    }

    config.params = { ...config.params, ...authConfig.params };
    return config;
  }

  /** @internal */
  async _handleAxiosResponse(response: AxiosResponse) { return response; }
  /** @internal */
  async _handleAxiosErrors(error: AxiosError) {
    // console.log(error);
    const errorData = error.response?.data as any;

    if (errorData) {
      // usually the error has a code and message, but occasionally not
      if (!errorData.error) throw error;

      const { code, message } = errorData.error;
      error.message = `Google API error - [${code}] ${message}`;
      throw error;
    }

    if (_.get(error, 'response.status') === 403) {
      if ('apiKey' in this.auth) {
        throw new Error('Sheet is private. Use authentication or make public. (see https://github.com/theoephraim/node-google-spreadsheet#a-note-on-authentication for details)');
      }
    }
    throw error;
  }

  /** @internal */
  async _makeSingleUpdateRequest(requestType: string, requestParams: any) {
    const response = await this.sheetsApi.post(':batchUpdate', {
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

  // TODO: review these types
  // currently only used in batching cell updates
  /** @internal */
  async _makeBatchUpdateRequest(requests: any[], responseRanges?: string | string[]) {
    // this is used for updating batches of cells
    const response = await this.sheetsApi.post(':batchUpdate', {
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

  /** @internal */
  _ensureInfoLoaded() {
    if (!this._rawProperties) throw new Error('You must call `doc.loadInfo()` before accessing this property');
  }

  /** @internal */
  _updateRawProperties(newProperties: SpreadsheetProperties) { this._rawProperties = newProperties; }

  /** @internal */
  _updateOrCreateSheet(sheetInfo: { properties: WorksheetProperties, data: any }) {
    const { properties, data } = sheetInfo;
    const { sheetId } = properties;
    if (!this._rawSheets[sheetId]) {
      this._rawSheets[sheetId] = new GoogleSpreadsheetWorksheet(this, properties, data);
    } else {
      this._rawSheets[sheetId].updateRawData(properties, data);
    }
  }

  // BASIC PROPS //////////////////////////////////////////////////////////////////////////////
  _getProp(param: keyof SpreadsheetProperties) {
    this._ensureInfoLoaded();
    // ideally ensureInfoLoaded would assert that _rawProperties is in fact loaded
    // but this is not currently possible in TS - see https://github.com/microsoft/TypeScript/issues/49709
    return this._rawProperties![param];
  }

  get title(): SpreadsheetProperties['title'] { return this._getProp('title'); }
  get locale(): SpreadsheetProperties['locale'] { return this._getProp('locale'); }
  get timeZone(): SpreadsheetProperties['timeZone'] { return this._getProp('timeZone'); }
  get autoRecalc(): SpreadsheetProperties['autoRecalc'] { return this._getProp('autoRecalc'); }
  get defaultFormat(): SpreadsheetProperties['defaultFormat'] { return this._getProp('defaultFormat'); }
  get spreadsheetTheme(): SpreadsheetProperties['spreadsheetTheme'] { return this._getProp('spreadsheetTheme'); }
  get iterativeCalculationSettings(): SpreadsheetProperties['iterativeCalculationSettings'] { return this._getProp('iterativeCalculationSettings'); }

  /**
   * update spreadsheet properties
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#SpreadsheetProperties
   * */
  async updateProperties(properties: Partial<SpreadsheetProperties>) {
    await this._makeSingleUpdateRequest('updateSpreadsheetProperties', {
      properties,
      fields: getFieldMask(properties),
    });
  }

  // BASIC INFO ////////////////////////////////////////////////////////////////////////////////////
  async loadInfo(includeCells = false) {
    const response = await this.sheetsApi.get('/', {
      params: {
        ...includeCells && { includeGridData: true },
      },
    });
    this._spreadsheetUrl = response.data.spreadsheetUrl;
    this._rawProperties = response.data.properties;
    _.each(response.data.sheets, (s) => this._updateOrCreateSheet(s));
  }

  resetLocalCache() {
    this._rawProperties = null;
    this._rawSheets = {};
  }

  // WORKSHEETS ////////////////////////////////////////////////////////////////////////////////////
  get sheetCount() {
    this._ensureInfoLoaded();
    return _.values(this._rawSheets).length;
  }

  get sheetsById(): Record<WorksheetId, GoogleSpreadsheetWorksheet> {
    this._ensureInfoLoaded();
    return this._rawSheets;
  }

  get sheetsByIndex(): GoogleSpreadsheetWorksheet[] {
    this._ensureInfoLoaded();
    return _.sortBy(this._rawSheets, 'index');
  }

  get sheetsByTitle(): Record<string, GoogleSpreadsheetWorksheet> {
    this._ensureInfoLoaded();
    return _.keyBy(this._rawSheets, 'title');
  }

  /**
   * Add new worksheet to document
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddSheetRequest
   * */
  async addSheet(
    properties: Partial<
    RecursivePartial<WorksheetProperties>
    & {
      headerValues: string[],
      headerRowIndex: number
    }
    > = {}
  ) {
    const response = await this._makeSingleUpdateRequest('addSheet', {
      properties: _.omit(properties, 'headerValues', 'headerRowIndex'),
    });
    // _makeSingleUpdateRequest already adds the sheet
    const newSheetId = response.properties.sheetId;
    const newSheet = this.sheetsById[newSheetId];

    if (properties.headerValues) {
      await newSheet.setHeaderRow(properties.headerValues, properties.headerRowIndex);
    }

    return newSheet;
  }

  /**
   * delete a worksheet
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteSheetRequest
   * */
  async deleteSheet(sheetId: WorksheetId) {
    await this._makeSingleUpdateRequest('deleteSheet', { sheetId });
    delete this._rawSheets[sheetId];
  }

  // NAMED RANGES //////////////////////////////////////////////////////////////////////////////////

  /**
   * create a new named range
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddNamedRangeRequest
   */
  async addNamedRange(
    /** name of new named range */
    name: string,
    /** GridRange object describing range */
    range: GridRange,
    /** id for named range (optional) */
    namedRangeId?: string
  ) {
    // TODO: add named range to local cache
    return this._makeSingleUpdateRequest('addNamedRange', {
      name,
      namedRangeId,
      range,
    });
  }

  /**
   * delete a named range
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteNamedRangeRequest
   * */
  async deleteNamedRange(
    /** id of named range to delete */
    namedRangeId: NamedRangeId
  ) {
    // TODO: remove named range from local cache
    return this._makeSingleUpdateRequest('deleteNamedRange', { namedRangeId });
  }

  // LOADING CELLS /////////////////////////////////////////////////////////////////////////////////

  /** fetch cell data into local cache */
  async loadCells(
    /**
     * single filter or array of filters
     * strings are treated as A1 ranges, objects are treated as GridRange objects
     * pass nothing to fetch all cells
     * */
    filters?: DataFilter | DataFilter[]
  ) {
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
      result = await this.sheetsApi.get('/', {
        params: {
          includeGridData: true,
          ranges: dataFilters,
        },
      });
    // otherwise we use the getByDataFilter endpoint because it is more flexible
    } else {
      result = await this.sheetsApi.post(':getByDataFilter', {
        includeGridData: true,
        dataFilters,
      });
    }

    const { sheets } = result.data;
    _.each(sheets, (sheet) => { this._updateOrCreateSheet(sheet); });
  }

  // EXPORTING /////////////////////////////////////////////////////////////

  /**
   * export/download helper, not meant to be called directly (use downloadAsX methods on spreadsheet and worksheet instead)
   * @internal
   */
  async _downloadAs(
    fileType: ExportFileTypes,
    worksheetId: WorksheetId | undefined,
    returnStreamInsteadOfBuffer?: boolean
  ) {
    // see https://stackoverflow.com/questions/11619805/using-the-google-drive-api-to-download-a-spreadsheet-in-csv-format/51235960#51235960

    if (!EXPORT_CONFIG[fileType]) throw new Error(`unsupported export fileType - ${fileType}`);
    if (EXPORT_CONFIG[fileType].singleWorksheet) {
      if (worksheetId === undefined) throw new Error(`Must specify worksheetId when exporting as ${fileType}`);
    } else if (worksheetId) throw new Error(`Cannot specify worksheetId when exporting as ${fileType}`);

    // google UI shows "html" but passes through "zip"
    if (fileType === 'html') fileType = 'zip';

    if (!this._spreadsheetUrl) throw new Error('Cannot export sheet that is not fully loaded');

    const exportUrl = this._spreadsheetUrl.replace('/edit', '/export');
    const response = await this.sheetsApi.get(exportUrl, {
      baseURL: '', // unset baseUrl since we're not hitting the normal sheets API
      params: {
        id: this.spreadsheetId,
        format: fileType,
        // worksheetId can be 0
        ...worksheetId !== undefined && { gid: worksheetId },
      },
      responseType: returnStreamInsteadOfBuffer ? 'stream' : 'arraybuffer',
    });
    return response.data;
  }

  /**
   * exports entire document as html file (zipped)
   * @topic export
   * */
  async downloadAsZippedHTML(): Promise<ArrayBuffer>;
  async downloadAsZippedHTML(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsZippedHTML(returnStreamInsteadOfBuffer: true): Promise<Stream>;
  async downloadAsZippedHTML(returnStreamInsteadOfBuffer?: boolean) {
    return this._downloadAs('html', undefined, returnStreamInsteadOfBuffer);
  }

  /**
   * @deprecated
   * use `doc.downloadAsZippedHTML()` instead
   * */
  async downloadAsHTML(returnStreamInsteadOfBuffer?: boolean) {
    return this._downloadAs('html', undefined, returnStreamInsteadOfBuffer);
  }

  /**
   * exports entire document as xlsx spreadsheet (Microsoft Office Excel)
   * @topic export
   * */
  async downloadAsXLSX(): Promise<ArrayBuffer>;
  async downloadAsXLSX(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsXLSX(returnStreamInsteadOfBuffer: true): Promise<Stream>;
  async downloadAsXLSX(returnStreamInsteadOfBuffer = false) {
    return this._downloadAs('xlsx', undefined, returnStreamInsteadOfBuffer);
  }
  /**
   * exports entire document as ods spreadsheet (Open Office)
   * @topic export
  */
  async downloadAsODS(): Promise<ArrayBuffer>;
  async downloadAsODS(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsODS(returnStreamInsteadOfBuffer: true): Promise<Stream>;
  async downloadAsODS(returnStreamInsteadOfBuffer = false) {
    return this._downloadAs('ods', undefined, returnStreamInsteadOfBuffer);
  }


  async delete() {
    const response = await this.driveApi.delete('');
    this._deleted = true;
    return response.data;
  }

  // PERMISSIONS ///////////////////////////////////////////////////////////////////////////////////

  /**
   * list all permissions entries for doc
   */
  async listPermissions(): Promise<PermissionsList> {
    const listReq = await this.driveApi.request({
      method: 'GET',
      url: '/permissions',
      params: {
        fields: 'permissions(id,type,emailAddress,domain,role,displayName,photoLink,deleted)',
      },
    });
    return listReq.data.permissions as PermissionsList;
  }

  async setPublicAccessLevel(role: PublicPermissionRoles | false) {
    const permissions = await this.listPermissions();
    const existingPublicPermission = _.find(permissions, (p) => p.type === 'anyone');

    if (role === false) {
      if (!existingPublicPermission) {
        // doc is already not public... could throw an error or just do nothing
        return;
      }
      await this.driveApi.request({
        method: 'DELETE',
        url: `/permissions/${existingPublicPermission.id}`,
      });
    } else {
      const _shareReq = await this.driveApi.request({
        method: 'POST',
        url: '/permissions',
        params: {
        },
        data: {
          role: role || 'viewer',
          type: 'anyone',
        },
      });
    }
  }

  /** share document to email or domain */
  async share(emailAddressOrDomain: string, opts?: {
    /** set role level, defaults to owner */
    role?: PermissionRoles,

    /** set to true if email is for a group */
    isGroup?: boolean,

    /** set to string to include a custom message, set to false to skip sending a notification altogether */
    emailMessage?: string | false,

    // moveToNewOwnersRoot?: string,
    // /** send a notification email (default = true) */
    // sendNotificationEmail?: boolean,
    // /** support My Drives and shared drives (default = false) */
    // supportsAllDrives?: boolean,

    // /** Issue the request as a domain administrator */
    // useDomainAdminAccess?: boolean,
  }) {
    let emailAddress: string | undefined;
    let domain: string | undefined;
    if (emailAddressOrDomain.includes('@')) {
      emailAddress = emailAddressOrDomain;
    } else {
      domain = emailAddressOrDomain;
    }


    const shareReq = await this.driveApi.request({
      method: 'POST',
      url: '/permissions',
      params: {
        ...opts?.emailMessage === false && { sendNotificationEmail: false },
        ..._.isString(opts?.emailMessage) && { emailMessage: opts?.emailMessage },
        ...opts?.role === 'owner' && { transferOwnership: true },
      },
      data: {
        role: opts?.role || 'writer',
        ...emailAddress && {
          type: opts?.isGroup ? 'group' : 'user',
          emailAddress,
        },
        ...domain && {
          type: 'domain',
          domain,
        },
      },
    });

    return shareReq.data;
  }

  //
  // CREATE NEW DOC ////////////////////////////////////////////////////////////////////////////////
  static async createNewSpreadsheetDocument(auth: GoogleApiAuth, properties?: Partial<SpreadsheetProperties>) {
    // see updateProperties for more info about available properties

    if (getAuthMode(auth) === AUTH_MODES.API_KEY) {
      throw new Error('Cannot use api key only to create a new spreadsheet - it is only usable for read-only access of public docs');
    }

    // TODO: handle injecting default credentials if running on google infra

    const authConfig = await getRequestAuthConfig(auth);

    const response = await Axios.request({
      method: 'POST',
      url: SHEETS_API_BASE_URL,
      paramsSerializer: axiosParamsSerializer,
      ...authConfig, // has the auth header
      data: {
        properties,
      },
    });

    const newSpreadsheet = new GoogleSpreadsheet(response.data.spreadsheetId, auth);

    // TODO ideally these things aren't public, might want to refactor anyway
    newSpreadsheet._spreadsheetUrl = response.data.spreadsheetUrl;
    newSpreadsheet._rawProperties = response.data.properties;
    _.each(response.data.sheets, (s) => newSpreadsheet._updateOrCreateSheet(s));

    return newSpreadsheet;
  }
}
