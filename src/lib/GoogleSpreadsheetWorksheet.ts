import * as _ from 'lodash-es';

import { ReadableStream } from 'node:stream/web';
import { GoogleSpreadsheetRow } from './GoogleSpreadsheetRow';
import { GoogleSpreadsheetCell } from './GoogleSpreadsheetCell';

import {
  getFieldMask, columnToLetter, letterToColumn, checkForDuplicateHeaders,
} from './utils';
import { GoogleSpreadsheet } from './GoogleSpreadsheet';
import {
  A1Range, SpreadsheetId, DimensionRangeIndexes, WorksheetDimension, WorksheetId, WorksheetProperties, A1Address,
  RowIndex, ColumnIndex, DataFilterWithoutWorksheetId, DataFilter, GetValuesRequestOptions, WorksheetGridProperties,
  WorksheetDimensionProperties, CellDataRange, AddRowOptions, GridRangeWithOptionalWorksheetId,
} from './types/sheets-types';


// types of cell data accepted when using row based api
type RowCellData = string | number | boolean | Date;
// raw row data can be passed in as an array or an object using header values as keys
type RawRowData = RowCellData[] | Record<string, RowCellData>;

export class GoogleSpreadsheetWorksheet {
  // assume "header row" (for row-based calls) is in first row, can be adjusted later
  private _headerRowIndex = 1;

  private _rawProperties: WorksheetProperties | null = null;
  private _cells: GoogleSpreadsheetCell[][] = [];
  private _rowMetadata: any[] = [];
  private _columnMetadata: any[] = [];

  private _headerValues: string[] | undefined;
  get headerValues() {
    if (!this._headerValues) {
      throw new Error('Header values are not yet loaded');
    }
    return this._headerValues!;
  }

  constructor(
    /** parent GoogleSpreadsheet instance */
    readonly _spreadsheet: GoogleSpreadsheet,
    rawProperties: WorksheetProperties,
    rawCellData?: CellDataRange[]
  ) {
    this._headerRowIndex = 1;

    // basic properties
    this._rawProperties = rawProperties;

    this._cells = []; // we will use a 2d sparse array to store cells;

    this._rowMetadata = []; // 1d sparse array
    this._columnMetadata = [];

    if (rawCellData) this._fillCellData(rawCellData);
  }

  // INTERNAL UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////

  updateRawData(properties: WorksheetProperties, rawCellData: CellDataRange[]) {
    this._rawProperties = properties;
    this._fillCellData(rawCellData);
  }

  async _makeSingleUpdateRequest(requestType: string, requestParams: any) {
    // pass the call up to the parent
    return this._spreadsheet._makeSingleUpdateRequest(requestType, {
      ...requestParams,
    });
  }

  private _ensureInfoLoaded() {
    if (!this._rawProperties) {
      throw new Error('You must call `doc.loadInfo()` again before accessing this property');
    }
  }

  /** clear local cache of sheet data/properties */
  resetLocalCache(
    /** set to true to clear data only, leaving sheet metadata/propeties intact */
    dataOnly?: boolean
  ) {
    if (!dataOnly) this._rawProperties = null;
    this._headerValues = undefined;
    this._headerRowIndex = 1;
    this._cells = [];
  }

  private _fillCellData(
    dataRanges: CellDataRange[]
  ) {
    _.each(dataRanges, (range) => {
      const startRow = range.startRow || 0;
      const startColumn = range.startColumn || 0;
      const numRows = range.rowMetadata.length;
      const numColumns = range.columnMetadata.length;

      // update cell data for entire range
      for (let i = 0; i < numRows; i++) {
        const actualRow = startRow + i;
        for (let j = 0; j < numColumns; j++) {
          const actualColumn = startColumn + j;

          // if the row has not been initialized yet, do it
          if (!this._cells[actualRow]) this._cells[actualRow] = [];

          // see if the response includes some info for the cell
          const cellData = _.get(range, `rowData[${i}].values[${j}]`);

          // update the cell object or create it
          if (this._cells[actualRow][actualColumn]) {
            this._cells[actualRow][actualColumn]._updateRawData(cellData);
          } else {
            this._cells[actualRow][actualColumn] = new GoogleSpreadsheetCell(
              this,
              actualRow,
              actualColumn,
              cellData
            );
          }
        }
      }

      // update row metadata
      for (let i = 0; i < range.rowMetadata.length; i++) {
        this._rowMetadata[startRow + i] = range.rowMetadata[i];
      }
      // update column metadata
      for (let i = 0; i < range.columnMetadata.length; i++) {
        this._columnMetadata[startColumn + i] = range.columnMetadata[i];
      }
    });
  }

  // TODO: make this handle A1 ranges as well?
  private _addSheetIdToRange(range: GridRangeWithOptionalWorksheetId) {
    if (range.sheetId && range.sheetId !== this.sheetId) {
      throw new Error('Leave sheet ID blank or set to matching ID of this sheet');
    }
    return {
      ...range,
      sheetId: this.sheetId,
    };
  }


  // PROPERTY GETTERS //////////////////////////////////////////////////////////////////////////////

  private _getProp<T extends keyof WorksheetProperties>(param: T): WorksheetProperties[T] {
    this._ensureInfoLoaded();
    // see note about asserting info loaded on GoogleSpreasheet
    return this._rawProperties![param];
  }
  // eslint-disable-line no-unused-vars
  private _setProp<T extends keyof WorksheetProperties>(_param: T, _newVal: WorksheetProperties[T]) {
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  get sheetId() { return this._getProp('sheetId'); }
  get title() { return this._getProp('title'); }
  get index() { return this._getProp('index'); }
  get sheetType() { return this._getProp('sheetType'); }
  get gridProperties() { return this._getProp('gridProperties'); }
  get hidden() { return this._getProp('hidden'); }
  get tabColor() { return this._getProp('tabColor'); }
  get rightToLeft() { return this._getProp('rightToLeft'); }

  set sheetId(newVal: WorksheetProperties['sheetId']) { this._setProp('sheetId', newVal); }
  set title(newVal: WorksheetProperties['title']) { this._setProp('title', newVal); }
  set index(newVal: WorksheetProperties['index']) { this._setProp('index', newVal); }
  set sheetType(newVal: WorksheetProperties['sheetType']) { this._setProp('sheetType', newVal); }
  set gridProperties(newVal: WorksheetProperties['gridProperties']) { this._setProp('gridProperties', newVal); }
  set hidden(newVal: WorksheetProperties['hidden']) { this._setProp('hidden', newVal); }
  set tabColor(newVal: WorksheetProperties['tabColor']) { this._setProp('tabColor', newVal); }
  set rightToLeft(newVal: WorksheetProperties['rightToLeft']) { this._setProp('rightToLeft', newVal); }

  get rowCount() {
    this._ensureInfoLoaded();
    return this.gridProperties.rowCount;
  }
  get columnCount() {
    this._ensureInfoLoaded();
    return this.gridProperties.columnCount;
  }

  get a1SheetName() { return `'${this.title.replace(/'/g, "''")}'`; }
  get encodedA1SheetName() { return encodeURIComponent(this.a1SheetName); }
  get lastColumnLetter() {
    // TODO: double check behaviour if data not loaded
    return this.columnCount ? columnToLetter(this.columnCount) : '';
  }


  // CELLS-BASED INTERACTIONS //////////////////////////////////////////////////////////////////////

  get cellStats() {
    let allCells = _.flatten(this._cells);
    allCells = _.compact(allCells);
    return {
      nonEmpty: _.filter(allCells, (c) => c.value).length,
      loaded: allCells.length,
      total: this.rowCount * this.columnCount,
    };
  }

  getCellByA1(a1Address: A1Address) {
    const split = a1Address.match(/([A-Z]+)([0-9]+)/);
    if (!split) throw new Error(`Cell address "${a1Address}" not valid`);
    const columnIndex = letterToColumn(split[1]);
    const rowIndex = parseInt(split[2]);
    return this.getCell(rowIndex - 1, columnIndex - 1);
  }

  getCell(rowIndex: RowIndex, columnIndex: ColumnIndex) {
    if (rowIndex < 0 || columnIndex < 0) throw new Error('Min coordinate is 0, 0');
    if (rowIndex >= this.rowCount || columnIndex >= this.columnCount) {
      throw new Error(`Out of bounds, sheet is ${this.rowCount} by ${this.columnCount}`);
    }

    if (!_.get(this._cells, `[${rowIndex}][${columnIndex}]`)) {
      throw new Error('This cell has not been loaded yet');
    }
    return this._cells[rowIndex][columnIndex];
  }

  async loadCells(sheetFilters?: DataFilterWithoutWorksheetId | DataFilterWithoutWorksheetId[]) {
    // load the whole sheet
    if (!sheetFilters) return this._spreadsheet.loadCells(this.a1SheetName);

    const filtersArray = _.isArray(sheetFilters) ? sheetFilters : [sheetFilters];
    const filtersArrayWithSheetId: DataFilter[] = _.map(filtersArray, (filter) => {
      // add sheet name to A1 ranges
      if (_.isString(filter)) {
        if (filter.startsWith(this.a1SheetName)) return filter;
        return `${this.a1SheetName}!${filter}`;
      }
      if (_.isObject(filter)) {
        // TODO: detect and support DeveloperMetadata filters

        // check if the user passed in a sheet id
        const filterAny = filter as any;
        if (filterAny.sheetId && filterAny.sheetId !== this.sheetId) {
          throw new Error('Leave sheet ID blank or set to matching ID of this sheet');
        }

        return { sheetId: this.sheetId, ...filter };
      }
      throw new Error('Each filter must be a A1 range string or gridrange object');
    });
    return this._spreadsheet.loadCells(filtersArrayWithSheetId);
  }

  async saveUpdatedCells() {
    const cellsToSave = _.filter(_.flatten(this._cells), { _isDirty: true });
    if (cellsToSave.length) {
      await this.saveCells(cellsToSave);
    }
    // TODO: do we want to return stats? or the cells that got updated?
  }

  async saveCells(cellsToUpdate: GoogleSpreadsheetCell[]) {
    // we send an individual "updateCells" request for each cell
    // because the fields that are udpated for each group are the same
    // and we dont want to accidentally overwrite something
    const requests = _.map(cellsToUpdate, (cell) => cell._getUpdateRequest());
    const responseRanges = _.map(cellsToUpdate, (c) => `${this.a1SheetName}!${c.a1Address}`);

    // if nothing is being updated the request returned is just `null`
    // so we make sure at least 1 request is valid - otherwise google throws a 400
    if (!_.compact(requests).length) {
      throw new Error('At least one cell must have something to update');
    }

    await this._spreadsheet._makeBatchUpdateRequest(requests, responseRanges);
  }

  // SAVING THIS FOR FUTURE USE
  // puts the cells that need updating into batches
  // async updateCellsByBatches() {
  //   // saving this code, but it's problematic because each group must have the same update fields
  //   const cellsByRow = _.groupBy(cellsToUpdate, 'rowIndex');
  //   const groupsToSave = [];
  //   _.each(cellsByRow, (cells, rowIndex) => {
  //     let cellGroup = [];
  //     _.each(cells, (c) => {
  //       if (!cellGroup.length) {
  //         cellGroup.push(c);
  //       } else if (
  //         cellGroup[cellGroup.length - 1].columnIndex ===
  //         c.columnIndex - 1
  //       ) {
  //         cellGroup.push(c);
  //       } else {
  //         groupsToSave.push(cellGroup);
  //         cellGroup = [];
  //       }
  //     });
  //     groupsToSave.push(cellGroup);
  //   });
  //   const requests = _.map(groupsToSave, (cellGroup) => ({
  //     updateCells: {
  //       rows: [
  //         {
  //           values: _.map(cellGroup, (cell) => ({
  //             ...cell._draftData.value && {
  //               userEnteredValue: { [cell._draftData.valueType]: cell._draftData.value },
  //             },
  //             ...cell._draftData.note !== undefined && {
  //               note: cell._draftData.note ,
  //             },
  //             ...cell._draftData.userEnteredFormat && {
  //               userEnteredValue: cell._draftData.userEnteredFormat,
  //             },
  //           })),
  //         },
  //       ],
  //       fields: 'userEnteredValue,note,userEnteredFormat',
  //       start: {
  //         sheetId: this.sheetId,
  //         rowIndex: cellGroup[0].rowIndex,
  //         columnIndex: cellGroup[0].columnIndex,
  //       },
  //     },
  //   }));
  //   const responseRanges = _.map(groupsToSave, (cellGroup) => {
  //     let a1Range = cellGroup[0].a1Address;
  //     if (cellGroup.length > 1)
  //       a1Range += `:${cellGroup[cellGroup.length - 1].a1Address}`;
  //     return `${cellGroup[0]._sheet.a1SheetName}!${a1Range}`;
  //   });
  // }

  // ROW BASED FUNCTIONS ///////////////////////////////////////////////////////////////////////////

  async _ensureHeaderRowLoaded() {
    if (!this._headerValues) {
      await this.loadHeaderRow();
    }
  }

  async loadHeaderRow(headerRowIndex?: number) {
    if (headerRowIndex !== undefined) this._headerRowIndex = headerRowIndex;
    const rows = await this.getCellsInRange(`A${this._headerRowIndex}:${this.lastColumnLetter}${this._headerRowIndex}`);
    if (!rows) {
      throw new Error('No values in the header row - fill the first row with header values before trying to interact with rows');
    }
    this._headerValues = _.map(rows[0], (header) => header.trim());
    if (!_.compact(this.headerValues).length) {
      throw new Error('All your header cells are blank - fill the first row with header values before trying to interact with rows');
    }
    checkForDuplicateHeaders(this.headerValues);
  }

  async setHeaderRow(headerValues: string[], headerRowIndex?: number) {
    if (!headerValues) return;
    if (headerValues.length > this.columnCount) {
      throw new Error(`Sheet is not large enough to fit ${headerValues.length} columns. Resize the sheet first.`);
    }
    const trimmedHeaderValues = _.map(headerValues, (h) => h.trim());
    checkForDuplicateHeaders(trimmedHeaderValues);

    if (!_.compact(trimmedHeaderValues).length) {
      throw new Error('All your header cells are blank -');
    }

    if (headerRowIndex) this._headerRowIndex = headerRowIndex;

    const response = await this._spreadsheet.sheetsApi.request({
      method: 'put',
      url: `/values/${this.encodedA1SheetName}!${this._headerRowIndex}:${this._headerRowIndex}`,
      params: {
        valueInputOption: 'USER_ENTERED', // other option is RAW
        includeValuesInResponse: true,
      },
      data: {
        range: `${this.a1SheetName}!${this._headerRowIndex}:${this._headerRowIndex}`,
        majorDimension: 'ROWS',
        values: [[
          ...trimmedHeaderValues,
          // pad the rest of the row with empty values to clear them all out
          ..._.times(this.columnCount - trimmedHeaderValues.length, () => ''),
        ]],
      },
    });
    this._headerValues = response.data.updatedData.values[0];
  }

  // TODO: look at these types
  async addRows(
    rows: RawRowData[],
    options: AddRowOptions = {}
  ) {
    // adds multiple rows in one API interaction using the append endpoint

    // each row can be an array or object
    // an array is just cells
    // ex: ['column 1', 'column 2', 'column 3']
    // an object must use the header row values as keys
    // ex: { col1: 'column 1', col2: 'column 2', col3: 'column 3' }

    // google bug that does not handle colons in sheet names
    // see https://issuetracker.google.com/issues/150373119
    if (this.title.includes(':')) {
      throw new Error('Please remove the ":" from your sheet title. There is a bug with the google API which breaks appending rows if any colons are in the sheet title.');
    }

    if (!_.isArray(rows)) throw new Error('You must pass in an array of row values to append');

    await this._ensureHeaderRowLoaded();

    // convert each row into an array of cell values rather than the key/value object
    const rowsAsArrays: RawRowData[] = [];
    _.each(rows, (row) => {
      let rowAsArray;
      if (_.isArray(row)) {
        rowAsArray = row;
      } else if (_.isObject(row)) {
        rowAsArray = [];
        for (let i = 0; i < this.headerValues.length; i++) {
          const propName = this.headerValues[i];
          rowAsArray[i] = row[propName];
        }
      } else {
        throw new Error('Each row must be an object or an array');
      }
      rowsAsArrays.push(rowAsArray);
    });

    const response = await this._spreadsheet.sheetsApi.request({
      method: 'post',
      url: `/values/${this.encodedA1SheetName}!A${this._headerRowIndex}:append`,
      params: {
        valueInputOption: options.raw ? 'RAW' : 'USER_ENTERED',
        insertDataOption: options.insert ? 'INSERT_ROWS' : 'OVERWRITE',
        includeValuesInResponse: true,
      },
      data: {
        values: rowsAsArrays,
      },
    });

    // extract the new row number from the A1-notation data range in the response
    // ex: in "'Sheet8!A2:C2" -- we want the `2`
    const { updatedRange } = response.data.updates;
    let rowNumber = updatedRange.match(/![A-Z]+([0-9]+):?/)[1];
    rowNumber = parseInt(rowNumber);


    this._ensureInfoLoaded();
    // if new rows were added, we need update sheet.rowRount
    if (options.insert) {
      this._rawProperties!.gridProperties.rowCount += rows.length;
    } else if (rowNumber + rows.length > this.rowCount) {
      // have to subtract 1 since one row was inserted at rowNumber
      this._rawProperties!.gridProperties.rowCount = rowNumber + rows.length - 1;
    }

    return _.map(response.data.updates.updatedData.values, (rowValues) => {
      const row = new GoogleSpreadsheetRow(this, rowNumber++, rowValues);
      return row;
    });
  }

  /** add a single row - see addRows for more info */
  async addRow(rowValues: RawRowData, options?: AddRowOptions) {
    const rows = await this.addRows([rowValues], options);
    return rows[0];
  }


  private _rowCache: GoogleSpreadsheetRow[] = [];
  async getRows<T extends Record<string, any>>(
    options?: {
      /** skip first N rows */
      offset?: number,
      /** limit number of rows fetched */
      limit?: number,
    }
  ) {
    // https://developers.google.com/sheets/api/guides/migration
    // v4 API does not have equivalents for the row-order query parameters provided
    // Reverse-order is trivial; simply process the returned values array in reverse order.
    // Order by column is not supported for reads, but it is possible to sort the data then read

    // v4 API does not currently have a direct equivalent for the Sheets API v3 structured queries
    // However, you can retrieve the relevant data and sort through it as needed in your application
    const offset = options?.offset || 0;
    const limit = options?.limit || this.rowCount - 1;

    await this._ensureHeaderRowLoaded();

    const firstRow = 1 + this._headerRowIndex + offset;
    const lastRow = firstRow + limit - 1; // inclusive so we subtract 1
    const lastColumn = columnToLetter(this.headerValues.length);
    const rawRows = await this.getCellsInRange(
      `A${firstRow}:${lastColumn}${lastRow}`
    );

    if (!rawRows) return [];

    const rows = [];
    let rowNum = firstRow;
    for (let i = 0; i < rawRows.length; i++) {
      const row = new GoogleSpreadsheetRow<T>(this, rowNum++, rawRows[i]);
      this._rowCache[row.rowNumber] = row;
      rows.push(row);
    }
    return rows;
  }

  /**
   * @internal
   * Used internally to update row numbers after deleting rows.
   * Should not be called directly.
   * */
  _shiftRowCache(deletedRowNumber: number) {
    delete this._rowCache[deletedRowNumber];
    this._rowCache.forEach((row) => {
      if (row.rowNumber > deletedRowNumber) {
        row._updateRowNumber(row.rowNumber - 1);
      }
    });
  }

  async clearRows(
    options?: {
      start?: number,
      end?: number,
    }
  ) {
    // default to first row after header
    const startRowIndex = options?.start || this._headerRowIndex + 1;
    const endRowIndex = options?.end || this.rowCount;
    await this._spreadsheet.sheetsApi.post(`/values/${this.encodedA1SheetName}!${startRowIndex}:${endRowIndex}:clear`);
    this._rowCache.forEach((row) => {
      if (row.rowNumber >= startRowIndex && row.rowNumber <= endRowIndex) row._clearRowData();
    });
  }

  // BASIC PROPS ///////////////////////////////////////////////////////////////////////////////////
  /** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateSheetPropertiesRequest */
  async updateProperties(properties: Partial<Omit<WorksheetProperties, 'sheetId'>>) {
    // Request type = `updateSheetProperties`

    return this._makeSingleUpdateRequest('updateSheetProperties', {
      properties: {
        sheetId: this.sheetId,
        ...properties,
      },
      fields: getFieldMask(properties),
    });
  }

  /**
   * passes through the call to updateProperties to update only the gridProperties object
   */
  async updateGridProperties(gridProperties: WorksheetGridProperties) {
    return this.updateProperties({ gridProperties });
  }

  /** resize, internally just calls updateGridProperties */
  async resize(gridProperties: Pick<WorksheetGridProperties, 'rowCount' | 'columnCount'>) {
    return this.updateGridProperties(gridProperties);
  }

  /**
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#updatedimensionpropertiesrequest
   */
  async updateDimensionProperties(
    columnsOrRows: WorksheetDimension,
    properties: WorksheetDimensionProperties,
    bounds: Partial<DimensionRangeIndexes>
  ) {
    // Request type = `updateDimensionProperties`

    Object.keys(properties);

    return this._makeSingleUpdateRequest('updateDimensionProperties', {
      range: {
        sheetId: this.sheetId,
        dimension: columnsOrRows,
        ...bounds,
      },
      properties,
      fields: getFieldMask(properties as any),
    });
  }

  // OTHER /////////////////////////////////////////////////////////////////////////////////////////

  // this uses the "values" getter and does not give all the info about the cell contents
  // it is used internally when loading header cells
  async getCellsInRange(a1Range: A1Range, options?: GetValuesRequestOptions) {
    const response = await this._spreadsheet.sheetsApi.get(`/values/${this.encodedA1SheetName}!${a1Range}`, {
      params: options,
    });
    return response.data.values;
  }

  async updateNamedRange() {
    // Request type = `updateNamedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateNamedRangeRequest
  }

  async addNamedRange() {
    // Request type = `addNamedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddNamedRangeRequest
  }

  async deleteNamedRange() {
    // Request type = `deleteNamedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteNamedRangeRequest
  }

  async repeatCell() {
    // Request type = `repeatCell`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#RepeatCellRequest
  }

  async autoFill() {
    // Request type = `autoFill`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AutoFillRequest
  }

  async cutPaste() {
    // Request type = `cutPaste`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CutPasteRequest
  }

  async copyPaste() {
    // Request type = `copyPaste`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CopyPasteRequest
  }

  // TODO: check types on these ranges

  /**
   * Merges all cells in the range
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MergeCellsRequest
   */
  async mergeCells(range: GridRangeWithOptionalWorksheetId, mergeType = 'MERGE_ALL') {
    await this._makeSingleUpdateRequest('mergeCells', {
      mergeType,
      range: this._addSheetIdToRange(range),
    });
  }

  /**
   * Unmerges cells in the given range
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UnmergeCellsRequest
   */
  async unmergeCells(range: GridRangeWithOptionalWorksheetId) {
    await this._makeSingleUpdateRequest('unmergeCells', {
      range: this._addSheetIdToRange(range),
    });
  }

  async updateBorders() {
    // Request type = `updateBorders`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateBordersRequest
  }

  async addFilterView() {
    // Request type = `addFilterView`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddFilterViewRequest
  }

  async appendCells() {
    // Request type = `appendCells`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AppendCellsRequest
  }

  async clearBasicFilter() {
    // Request type = `clearBasicFilter`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#ClearBasicFilterRequest
  }

  async deleteDimension() {
    // Request type = `deleteDimension`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDimensionRequest
  }

  async deleteEmbeddedObject() {
    // Request type = `deleteEmbeddedObject`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteEmbeddedObjectRequest
  }

  async deleteFilterView() {
    // Request type = `deleteFilterView`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteFilterViewRequest
  }

  async duplicateFilterView() {
    // Request type = `duplicateFilterView`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DuplicateFilterViewRequest
  }

  /**
   * Duplicate worksheet within the document
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DuplicateSheetRequest
   */
  async duplicate(
    options?: {
      id?: WorksheetId,
      title?: string,
      index?: number,
    }
  ) {
    const response = await this._makeSingleUpdateRequest('duplicateSheet', {
      sourceSheetId: this.sheetId,
      ...options?.index !== undefined && { insertSheetIndex: options.index },
      ...options?.id && { newSheetId: options.id },
      ...options?.title && { newSheetName: options.title },
    });
    const newSheetId = response.properties.sheetId;
    return this._spreadsheet.sheetsById[newSheetId];
  }

  async findReplace() {
    // Request type = `findReplace`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#FindReplaceRequest
  }

  /**
   * Inserts rows or columns at a particular index
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#InsertDimensionRequest
   */
  async insertDimension(
    columnsOrRows: WorksheetDimension,
    rangeIndexes: DimensionRangeIndexes,
    inheritFromBefore?: boolean
  ) {
    if (!columnsOrRows) throw new Error('You need to specify a dimension. i.e. COLUMNS|ROWS');
    if (!_.isObject(rangeIndexes)) throw new Error('`range` must be an object containing `startIndex` and `endIndex`');
    if (!_.isInteger(rangeIndexes.startIndex) || rangeIndexes.startIndex < 0) throw new Error('range.startIndex must be an integer >=0');
    if (!_.isInteger(rangeIndexes.endIndex) || rangeIndexes.endIndex < 0) throw new Error('range.endIndex must be an integer >=0');
    if (rangeIndexes.endIndex <= rangeIndexes.startIndex) throw new Error('range.endIndex must be greater than range.startIndex');

    // default inheritFromBefore to true - unless inserting in the first row/column
    if (inheritFromBefore === undefined) {
      inheritFromBefore = rangeIndexes.startIndex > 0;
    }

    // do not allow inheritFromBefore if inserting at first row/column
    if (inheritFromBefore && rangeIndexes.startIndex === 0) {
      throw new Error('Cannot set inheritFromBefore to true if inserting in first row/column');
    }

    return this._makeSingleUpdateRequest('insertDimension', {
      range: {
        sheetId: this.sheetId,
        dimension: columnsOrRows,
        startIndex: rangeIndexes.startIndex,
        endIndex: rangeIndexes.endIndex,
      },
      inheritFromBefore,
    });
  }

  async insertRange() {
    // Request type = `insertRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#InsertRangeRequest
  }

  async moveDimension() {
    // Request type = `moveDimension`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MoveDimensionRequest
  }

  async updateEmbeddedObjectPosition() {
    // Request type = `updateEmbeddedObjectPosition`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateEmbeddedObjectPositionRequest
  }

  async pasteData() {
    // Request type = `pasteData`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#PasteDataRequest
  }

  async textToColumns() {
    // Request type = `textToColumns`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#TextToColumnsRequest
  }

  async updateFilterView() {
    // Request type = `updateFilterView`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateFilterViewRequest
  }

  async deleteRange() {
    // Request type = `deleteRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteRangeRequest
  }

  async appendDimension() {
    // Request type = `appendDimension`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AppendDimensionRequest
  }

  async addConditionalFormatRule() {
    // Request type = `addConditionalFormatRule`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddConditionalFormatRuleRequest
  }

  async updateConditionalFormatRule() {
    // Request type = `updateConditionalFormatRule`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateConditionalFormatRuleRequest
  }

  async deleteConditionalFormatRule() {
    // Request type = `deleteConditionalFormatRule`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteConditionalFormatRuleRequest
  }

  async sortRange() {
    // Request type = `sortRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SortRangeRequest
  }

  async setDataValidation() {
    // Request type = `setDataValidation`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SetDataValidationRequest
  }

  async setBasicFilter() {
    // Request type = `setBasicFilter`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SetBasicFilterRequest
  }

  async addProtectedRange() {
    // Request type = `addProtectedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddProtectedRangeRequest
  }

  async updateProtectedRange() {
    // Request type = `updateProtectedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateProtectedRangeRequest
  }

  async deleteProtectedRange() {
    // Request type = `deleteProtectedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteProtectedRangeRequest
  }

  async autoResizeDimensions() {
    // Request type = `autoResizeDimensions`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AutoResizeDimensionsRequest
  }

  async addChart() {
    // Request type = `addChart`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddChartRequest
  }

  async updateChartSpec() {
    // Request type = `updateChartSpec`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateChartSpecRequest
  }

  async updateBanding() {
    // Request type = `updateBanding`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateBandingRequest
  }

  async addBanding() {
    // Request type = `addBanding`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddBandingRequest
  }

  async deleteBanding() {
    // Request type = `deleteBanding`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteBandingRequest
  }

  async createDeveloperMetadata() {
    // Request type = `createDeveloperMetadata`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CreateDeveloperMetadataRequest
  }

  async updateDeveloperMetadata() {
    // Request type = `updateDeveloperMetadata`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateDeveloperMetadataRequest
  }

  async deleteDeveloperMetadata() {
    // Request type = `deleteDeveloperMetadata`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDeveloperMetadataRequest
  }

  async randomizeRange() {
    // Request type = `randomizeRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#RandomizeRangeRequest
  }

  async addDimensionGroup() {
    // Request type = `addDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddDimensionGroupRequest
  }

  async deleteDimensionGroup() {
    // Request type = `deleteDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDimensionGroupRequest
  }

  async updateDimensionGroup() {
    // Request type = `updateDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateDimensionGroupRequest
  }

  async trimWhitespace() {
    // Request type = `trimWhitespace`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#TrimWhitespaceRequest
  }

  async deleteDuplicates() {
    // Request type = `deleteDuplicates`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDuplicatesRequest
  }

  async addSlicer() {
    // Request type = `addSlicer`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddSlicerRequest
  }

  async updateSlicerSpec() {
    // Request type = `updateSlicerSpec`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateSlicerSpecRequest
  }

  /** delete this worksheet */
  async delete() {
    return this._spreadsheet.deleteSheet(this.sheetId);
  }

  /**
   * copies this worksheet into another document/spreadsheet
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.sheets/copyTo
   * */
  async copyToSpreadsheet(destinationSpreadsheetId: SpreadsheetId) {
    return this._spreadsheet.sheetsApi.post(`/sheets/${this.sheetId}:copyTo`, {
      destinationSpreadsheetId,
    });
  }

  /** clear data in the sheet - either the entire sheet or a specific range */
  async clear(
    /** optional A1 range to clear - defaults to entire sheet  */
    a1Range?: A1Range
  ) {
    const range = a1Range ? `!${a1Range}` : '';
    // sheet name without ie 'sheet1' rather than 'sheet1'!A1:B5 is all cells
    await this._spreadsheet.sheetsApi.post(`/values/${this.encodedA1SheetName}${range}:clear`);
    this.resetLocalCache(true);
  }

  /** exports worksheet as CSV file (comma-separated values) */
  async downloadAsCSV(): Promise<ArrayBuffer>;
  async downloadAsCSV(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsCSV(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
  async downloadAsCSV(returnStreamInsteadOfBuffer = false) {
    return this._spreadsheet._downloadAs('csv', this.sheetId, returnStreamInsteadOfBuffer);
  }
  /** exports worksheet as TSC file (tab-separated values) */
  async downloadAsTSV(): Promise<ArrayBuffer>;
  async downloadAsTSV(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsTSV(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
  async downloadAsTSV(returnStreamInsteadOfBuffer = false) {
    return this._spreadsheet._downloadAs('tsv', this.sheetId, returnStreamInsteadOfBuffer);
  }
  /** exports worksheet as PDF */
  async downloadAsPDF(): Promise<ArrayBuffer>;
  async downloadAsPDF(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsPDF(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
  async downloadAsPDF(returnStreamInsteadOfBuffer = false) {
    return this._spreadsheet._downloadAs('pdf', this.sheetId, returnStreamInsteadOfBuffer);
  }
}
