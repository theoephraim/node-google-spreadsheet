import { type ReadableStream } from 'stream/web';
import * as _ from './toolkit';

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
  DataValidationRule,
  ProtectedRange, Integer, GridCoordinateWithOptionalWorksheetId, PasteType, DelimiterType, PasteOrientation,
  SortSpec, SourceAndDestination, DimensionRange,
  FilterView, ConditionalFormatRule, BandedRange, DeveloperMetadata, DataFilterObject,
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
  private _protectedRanges: ProtectedRange[] | null = null;

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
    rawCellData?: CellDataRange[],
    protectedRanges?: ProtectedRange[]
  ) {
    this._headerRowIndex = 1;

    // basic properties
    this._rawProperties = rawProperties;

    this._cells = []; // we will use a 2d sparse array to store cells;

    this._rowMetadata = []; // 1d sparse array
    this._columnMetadata = [];
    if (protectedRanges) this._protectedRanges = protectedRanges;

    if (rawCellData) this._fillCellData(rawCellData);
  }

  // INTERNAL UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////

  updateRawData(properties: WorksheetProperties, rawCellData: CellDataRange[], protectedRanges?: ProtectedRange[]) {
    this._rawProperties = properties;
    this._fillCellData(rawCellData);
    if (protectedRanges) this._protectedRanges = protectedRanges;
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

  /**
   * clear local cache of sheet data/properties
   */
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
  get protectedRanges() { return this._protectedRanges; }
  private get _headerRange() {
    return `A${this._headerRowIndex}:${this.lastColumnLetter}${this._headerRowIndex}`;
  }

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
        // pass through developer metadata filters without adding sheetId
        if ('developerMetadataLookup' in filter) {
          return filter;
        }

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
    const rows = await this.getCellsInRange(this._headerRange);
    this._processHeaderRow(rows);
  }

  private _processHeaderRow(rows: any[]) {
    if (!rows) {
      throw new Error('No values in the header row - fill the first row with header values before trying to interact with rows');
    }
    this._headerValues = _.map(rows[0], (header) => header?.trim());
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
    const trimmedHeaderValues = _.map(headerValues, (h) => h?.trim());
    checkForDuplicateHeaders(trimmedHeaderValues);

    if (!_.compact(trimmedHeaderValues).length) {
      throw new Error('All your header cells are blank -');
    }

    if (headerRowIndex) this._headerRowIndex = headerRowIndex;

    const response = await this._spreadsheet.sheetsApi.put(
      `values/${this.encodedA1SheetName}!${this._headerRowIndex}:${this._headerRowIndex}`,
      {
        searchParams: {
          valueInputOption: 'USER_ENTERED', // other option is RAW
          includeValuesInResponse: true,
        },
        json: {
          range: `${this.a1SheetName}!${this._headerRowIndex}:${this._headerRowIndex}`,
          majorDimension: 'ROWS',
          values: [[
            ...trimmedHeaderValues,
            // pad the rest of the row with empty values to clear them all out
            ..._.times(this.columnCount - trimmedHeaderValues.length, () => ''),
          ]],
        },
      }
    );
    const data = await response.json<any>();
    this._headerValues = data.updatedData.values[0];
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

    const response = await this._spreadsheet.sheetsApi.post(
      `values/${this.encodedA1SheetName}!A${this._headerRowIndex}:append`,
      {
        searchParams: {
          valueInputOption: options.raw ? 'RAW' : 'USER_ENTERED',
          insertDataOption: options.insert ? 'INSERT_ROWS' : 'OVERWRITE',
          includeValuesInResponse: true,
        },
        json: {
          values: rowsAsArrays,
        },
      }
    );

    // extract the new row number from the A1-notation data range in the response
    // ex: in "'Sheet8!A2:C2" -- we want the `2`
    const data = await response.json<any>();
    const { updatedRange } = data.updates;
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

    return _.map(data.updates.updatedData.values, (rowValues) => {
      const row = new GoogleSpreadsheetRow(this, rowNumber++, rowValues);
      return row;
    });
  }

  /**
   * add a single row - see addRows for more info
   */
  async addRow(
    rowValues: RawRowData,
    options?: AddRowOptions
  ) {
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

    const firstRow = 1 + this._headerRowIndex + offset;
    const lastRow = firstRow + limit - 1; // inclusive so we subtract 1

    let rawRows;
    if (this._headerValues) {
      const lastColumn = columnToLetter(this.headerValues.length);
      rawRows = await this.getCellsInRange(
        `A${firstRow}:${lastColumn}${lastRow}`
      );
    } else {
      const result = await this.batchGetCellsInRange([this._headerRange,
        `A${firstRow}:${this.lastColumnLetter}${lastRow}`]);
      this._processHeaderRow(result[0]);
      rawRows = result[1];
    }

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

  /**
   * @internal
   * Used internally to update row numbers after deleting multiple rows.
   * Should not be called directly.
   * */
  _shiftRowCacheBulk(startIndex: number, endIndex: number) {
    const numDeleted = endIndex - startIndex;
    // Convert from 0-based indices to 1-based row numbers
    const startRow = startIndex + 1;
    const endRow = endIndex;

    // Mark rows in the deleted range as deleted, then remove from cache
    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const row = this._rowCache[rowNum];
      if (row) {
        row._markDeleted(); // Mark as deleted
      }
      delete this._rowCache[rowNum];
    }

    // Shift rows after the deleted range
    this._rowCache.forEach((row) => {
      if (row.rowNumber > endRow) {
        row._updateRowNumber(row.rowNumber - numDeleted);
      }
    });
  }

  /**
   * @internal
   * Used internally to shift cell cache after deleting rows.
   * Should not be called directly.
   * */
  _shiftCellCacheRows(startIndex: number, endIndex: number) {
    const numDeleted = endIndex - startIndex;

    // Mark cells in the deleted row range as deleted, then remove from cache
    for (let rowIndex = startIndex; rowIndex < endIndex; rowIndex++) {
      const row = this._cells[rowIndex];
      if (row) {
        row.forEach((cell) => {
          if (cell) cell._markDeleted();
        });
      }
      delete this._cells[rowIndex];
    }

    // Collect rows that need to be shifted
    const rowsToShift: Array<{ oldRowIndex: number, cells: any[] }> = [];
    for (let rowIndex = endIndex; rowIndex < this._cells.length; rowIndex++) {
      if (this._cells[rowIndex]) {
        rowsToShift.push({ oldRowIndex: rowIndex, cells: this._cells[rowIndex] });
      }
    }

    // Clear old positions and update to new positions
    rowsToShift.forEach(({ oldRowIndex, cells }) => {
      delete this._cells[oldRowIndex];
      const newRowIndex = oldRowIndex - numDeleted;
      this._cells[newRowIndex] = cells;
      // Update each cell's internal row index
      cells.forEach((cell, colIndex) => {
        if (cell) cell._updateIndices(newRowIndex, colIndex);
      });
    });
  }

  /**
   * @internal
   * Used internally to shift cell cache after deleting columns.
   * Should not be called directly.
   * */
  _shiftCellCacheColumns(startIndex: number, endIndex: number) {
    const numDeleted = endIndex - startIndex;

    // For each row, delete cells in the deleted column range and shift remaining
    this._cells.forEach((row, rowIndex) => {
      if (!row) return;

      // Mark cells in the deleted column range as deleted, then remove from cache
      for (let colIndex = startIndex; colIndex < endIndex; colIndex++) {
        const cell = row[colIndex];
        if (cell) cell._markDeleted();
        delete row[colIndex];
      }

      // Collect cells that need to be shifted
      const cellsToShift: Array<{ oldColIndex: number, cell: any }> = [];
      for (let colIndex = endIndex; colIndex < row.length; colIndex++) {
        if (row[colIndex]) {
          cellsToShift.push({ oldColIndex: colIndex, cell: row[colIndex] });
        }
      }

      // Clear old positions and update to new positions
      cellsToShift.forEach(({ oldColIndex, cell }) => {
        delete row[oldColIndex];
        const newColIndex = oldColIndex - numDeleted;
        row[newColIndex] = cell;
        // Update cell's internal column index
        cell._updateIndices(rowIndex, newColIndex);
      });
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
    await this._spreadsheet.sheetsApi.post(`values/${this.encodedA1SheetName}!${startRowIndex}:${endRowIndex}:clear`);
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
  async updateGridProperties(
    gridProperties: Partial<WorksheetGridProperties>
  ) {
    return this.updateProperties({ gridProperties: gridProperties as WorksheetGridProperties });
  }

  /**
   * resize, internally just calls updateGridProperties
   */
  async resize(
    gridProperties: Pick<WorksheetGridProperties, 'rowCount' | 'columnCount'>
  ) {
    return this.updateGridProperties(gridProperties);
  }

  /**
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#updatedimensionpropertiesrequest
   */
  async updateDimensionProperties(
    columnsOrRows: WorksheetDimension,
    properties: Partial<WorksheetDimensionProperties>,
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
    const response = await this._spreadsheet.sheetsApi.get(`values/${this.encodedA1SheetName}!${a1Range}`, {
      searchParams: options,
    });
    const data = await response.json<any>();
    return data.values;
  }

  async batchGetCellsInRange(a1Ranges: A1Range[], options?: GetValuesRequestOptions) {
    const ranges = a1Ranges.map((r) => `ranges=${this.encodedA1SheetName}!${r}`).join('&');
    const response = await this._spreadsheet.sheetsApi.get(`values:batchGet?${ranges}`, {
      searchParams: options,
    });
    const data = await response.json<any>();
    return data.valueRanges.map((r: any) => r.values);
  }

  /**
   * Updates an existing named range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateNamedRangeRequest
   */
  async updateNamedRange(
    /** ID of the named range to update */
    namedRangeId: string,
    /** The named range properties to update */
    namedRange: Partial<{ name: string, range: GridRangeWithOptionalWorksheetId }>,
    /** Field mask specifying which properties to update */
    fields: string
  ) {
    return this._makeSingleUpdateRequest('updateNamedRange', {
      namedRange: {
        namedRangeId,
        ...namedRange.name && { name: namedRange.name },
        ...namedRange.range && { range: this._addSheetIdToRange(namedRange.range) },
      },
      fields,
    });
  }

  /**
   * Creates a new named range in this worksheet (convenience method that auto-fills sheetId)
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddNamedRangeRequest
   */
  async addNamedRange(
    /** Name of the new named range */
    name: string,
    /** GridRange describing the range (sheetId optional, will be auto-filled) */
    range: GridRangeWithOptionalWorksheetId,
    /** Optional ID for the named range */
    namedRangeId?: string
  ) {
    return this._spreadsheet.addNamedRange(
      name,
      this._addSheetIdToRange(range),
      namedRangeId
    );
  }

  /**
   * Deletes a named range (convenience wrapper)
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteNamedRangeRequest
   */
  async deleteNamedRange(
    /** ID of the named range to delete */
    namedRangeId: string
  ) {
    return this._spreadsheet.deleteNamedRange(namedRangeId);
  }

  /**
   * Updates all cells in a range with the same cell data
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#RepeatCellRequest
   */
  async repeatCell(
    /** The range to update (sheetId optional) */
    range: GridRangeWithOptionalWorksheetId,
    /** The cell data to repeat across the range */
    cell: any,
    /** Which fields to update (use "*" for all fields) */
    fields: string
  ) {
    await this._makeSingleUpdateRequest('repeatCell', {
      range: this._addSheetIdToRange(range),
      cell,
      fields,
    });
  }

  /**
   * Auto-fills cells with data following a pattern (like dragging the fill handle)
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AutoFillRequest
   */
  async autoFill(
    /** The range to autofill (detects source location automatically, sheetId optional) or explicit source and destination specification */
    rangeOrSource: GridRangeWithOptionalWorksheetId | SourceAndDestination,
    /** Whether to generate data with the alternate series */
    useAlternateSeries?: boolean
  ) {
    // Check if it's a SourceAndDestination by looking for the 'dimension' property
    const isSourceAndDestination = 'dimension' in rangeOrSource;

    await this._makeSingleUpdateRequest('autoFill', {
      ...isSourceAndDestination
        ? {
          sourceAndDestination: {
            ...rangeOrSource,
            source: this._addSheetIdToRange((rangeOrSource as SourceAndDestination).source),
          },
        }
        : { range: this._addSheetIdToRange(rangeOrSource as GridRangeWithOptionalWorksheetId) },
      ...useAlternateSeries !== undefined && { useAlternateSeries },
    });
  }

  /**
   * Cuts data from a source range and pastes it to a destination coordinate
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CutPasteRequest
   */
  async cutPaste(
    /** The source range to cut from (sheetId optional) */
    source: GridRangeWithOptionalWorksheetId,
    /** The top-left coordinate where data should be pasted (sheetId optional) */
    destination: GridCoordinateWithOptionalWorksheetId,
    /** What kind of data to paste (defaults to PASTE_NORMAL) */
    pasteType: PasteType = 'PASTE_NORMAL'
  ) {
    await this._makeSingleUpdateRequest('cutPaste', {
      source: this._addSheetIdToRange(source),
      destination: {
        sheetId: this.sheetId,
        rowIndex: destination.rowIndex,
        columnIndex: destination.columnIndex,
      },
      pasteType,
    });
  }

  /**
   * Copies data from a source range and pastes it to a destination range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CopyPasteRequest
   */
  async copyPaste(
    /** The source range to copy from (sheetId optional) */
    source: GridRangeWithOptionalWorksheetId,
    /** The destination range to paste to (sheetId optional) */
    destination: GridRangeWithOptionalWorksheetId,
    /** What kind of data to paste (defaults to PASTE_NORMAL) */
    pasteType: PasteType = 'PASTE_NORMAL',
    /** How data should be oriented (defaults to NORMAL) */
    pasteOrientation: PasteOrientation = 'NORMAL'
  ) {
    await this._makeSingleUpdateRequest('copyPaste', {
      source: this._addSheetIdToRange(source),
      destination: this._addSheetIdToRange(destination),
      pasteType,
      pasteOrientation,
    });
  }

  // TODO: check types on these ranges

  /**
   * Merges all cells in the range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MergeCellsRequest
   */
  async mergeCells(
    range: GridRangeWithOptionalWorksheetId,
    mergeType = 'MERGE_ALL'
  ) {
    await this._makeSingleUpdateRequest('mergeCells', {
      mergeType,
      range: this._addSheetIdToRange(range),
    });
  }

  /**
   * Unmerges cells in the given range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UnmergeCellsRequest
   */
  async unmergeCells(
    range: GridRangeWithOptionalWorksheetId
  ) {
    await this._makeSingleUpdateRequest('unmergeCells', {
      range: this._addSheetIdToRange(range),
    });
  }

  /**
   * Updates borders for a range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateBordersRequest
   */
  async updateBorders(
    /** The range whose borders should be updated (sheetId optional) */
    range: GridRangeWithOptionalWorksheetId,
    /** Border styles for top, bottom, left, right, innerHorizontal, innerVertical */
    borders: {
      top?: any,
      bottom?: any,
      left?: any,
      right?: any,
      innerHorizontal?: any,
      innerVertical?: any
    }
  ) {
    await this._makeSingleUpdateRequest('updateBorders', {
      range: this._addSheetIdToRange(range),
      ...borders,
    });
  }

  /**
   * Adds a filter view to the sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddFilterViewRequest
   */
  async addFilterView(
    /** The filter view to add (filterViewId is optional and will be auto-generated if not provided) */
    filter: FilterView
  ) {
    return this._makeSingleUpdateRequest('addFilterView', {
      filter,
    });
  }

  /**
   * Appends cells after the last row with data in a sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AppendCellsRequest
   */
  async appendCells(
    /** The row data to append */
    rows: any[],
    /** Which fields to update (use "*" for all fields) */
    fields: string
  ) {
    await this._makeSingleUpdateRequest('appendCells', {
      sheetId: this.sheetId,
      rows,
      fields,
    });
  }

  /**
   * Clears the basic filter on this sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#ClearBasicFilterRequest
   */
  async clearBasicFilter() {
    await this._makeSingleUpdateRequest('clearBasicFilter', {
      sheetId: this.sheetId,
    });
  }

  /**
   * Delete rows or columns in a given range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDimensionRequest
   */
  async deleteDimension(
    columnsOrRows: WorksheetDimension,
    rangeIndexes: DimensionRangeIndexes
  ) {
    if (!columnsOrRows) throw new Error('You need to specify a dimension. i.e. COLUMNS|ROWS');
    if (!_.isObject(rangeIndexes)) throw new Error('`range` must be an object containing `startIndex` and `endIndex`');
    if (!_.isInteger(rangeIndexes.startIndex) || rangeIndexes.startIndex < 0) throw new Error('range.startIndex must be an integer >=0');
    if (!_.isInteger(rangeIndexes.endIndex) || rangeIndexes.endIndex < 0) throw new Error('range.endIndex must be an integer >=0');
    if (rangeIndexes.endIndex <= rangeIndexes.startIndex) throw new Error('range.endIndex must be greater than range.startIndex');

    const result = await this._makeSingleUpdateRequest('deleteDimension', {
      range: {
        sheetId: this.sheetId,
        dimension: columnsOrRows,
        startIndex: rangeIndexes.startIndex,
        endIndex: rangeIndexes.endIndex,
      },
    });

    // Update cached rows and cells
    if (columnsOrRows === 'ROWS') {
      this._shiftRowCacheBulk(rangeIndexes.startIndex, rangeIndexes.endIndex);
      this._shiftCellCacheRows(rangeIndexes.startIndex, rangeIndexes.endIndex);
    } else {
      this._shiftCellCacheColumns(rangeIndexes.startIndex, rangeIndexes.endIndex);
    }

    return result;
  }

  /**
   * Delete rows by index
   */
  async deleteRows(
    /** the start row index (inclusive, 0-based) */
    startIndex: number,
    /** the end row index (exclusive) */
    endIndex: number
  ) {
    return this.deleteDimension('ROWS', { startIndex, endIndex });
  }

  /**
   * Delete columns by index
   */
  async deleteColumns(
    /** the start column index (inclusive, 0-based) */
    startIndex: number,
    /** the end column index (exclusive) */
    endIndex: number
  ) {
    return this.deleteDimension('COLUMNS', { startIndex, endIndex });
  }

  async deleteEmbeddedObject() {
    // Request type = `deleteEmbeddedObject`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteEmbeddedObjectRequest
    throw new Error('Not implemented yet');
  }

  /**
   * Deletes a filter view from the sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteFilterViewRequest
   */
  async deleteFilterView(
    /** The ID of the filter view to delete */
    filterId: Integer
  ) {
    await this._makeSingleUpdateRequest('deleteFilterView', {
      filterId,
    });
  }

  /**
   * Duplicates a filter view
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DuplicateFilterViewRequest
   */
  async duplicateFilterView(
    /** The ID of the filter view to duplicate */
    filterId: Integer
  ) {
    await this._makeSingleUpdateRequest('duplicateFilterView', {
      filterId,
    });
  }

  /**
   * Duplicate worksheet within the document
   *
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

  /**
   * Finds and replaces text in cells
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#FindReplaceRequest
   */
  async findReplace(
    /** The value to search for */
    find: string,
    /** The value to use as replacement */
    replacement: string,
    /** Search options (matchCase, matchEntireCell, searchByRegex, includeFormulas) */
    options?: {
      matchCase?: boolean,
      matchEntireCell?: boolean,
      searchByRegex?: boolean,
      includeFormulas?: boolean
    },
    /** Optional range to search in (defaults to entire sheet, sheetId optional) */
    range?: GridRangeWithOptionalWorksheetId
  ) {
    await this._makeSingleUpdateRequest('findReplace', {
      find,
      replacement,
      ...options,
      ...range
        ? { range: this._addSheetIdToRange(range) }
        : { sheetId: this.sheetId },
    });
  }

  /**
   * Inserts rows or columns at a particular index
   *
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

  /**
   * insert empty cells in a range, shifting existing cells in the specified direction
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#InsertRangeRequest
   */
  async insertRange(
    /** the range to insert new cells into */
    range: GridRangeWithOptionalWorksheetId,
    /** which direction to shift existing cells - ROWS (shift down) or COLUMNS (shift right) */
    shiftDimension: WorksheetDimension
  ) {
    await this._makeSingleUpdateRequest('insertRange', {
      range: this._addSheetIdToRange(range),
      shiftDimension,
    });
  }

  /**
   * Moves rows or columns to a different position within the sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MoveDimensionRequest
   */
  async moveDimension(
    /** Whether to move rows or columns */
    dimension: WorksheetDimension,
    /** The indexes of rows/columns to move */
    source: DimensionRangeIndexes,
    /** Where to move them (calculated before removal) */
    destinationIndex: number
  ) {
    await this._makeSingleUpdateRequest('moveDimension', {
      source: {
        sheetId: this.sheetId,
        dimension,
        startIndex: source.startIndex,
        endIndex: source.endIndex,
      },
      destinationIndex,
    });
  }

  async updateEmbeddedObjectPosition() {
    // Request type = `updateEmbeddedObjectPosition`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateEmbeddedObjectPositionRequest
    throw new Error('Not implemented yet');
  }

  /**
   * Inserts data into the spreadsheet starting at the specified coordinate
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#PasteDataRequest
   */
  async pasteData(
    /** The coordinate at which the data should start being inserted (sheetId optional) */
    coordinate: GridCoordinateWithOptionalWorksheetId,
    /** The data to insert */
    data: string,
    /** The delimiter in the data */
    delimiter: string,
    /** How the data should be pasted (defaults to PASTE_NORMAL) */
    type: PasteType = 'PASTE_NORMAL'
  ) {
    await this._makeSingleUpdateRequest('pasteData', {
      coordinate: {
        sheetId: this.sheetId,
        rowIndex: coordinate.rowIndex,
        columnIndex: coordinate.columnIndex,
      },
      data,
      delimiter,
      type,
    });
  }

  /**
   * Splits a column of text into multiple columns based on a delimiter
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#TextToColumnsRequest
   */
  async textToColumns(
    /** The column to split (must span exactly one column) */
    source: GridRangeWithOptionalWorksheetId,
    /** Type of delimiter to use */
    delimiterType: DelimiterType,
    /** Custom delimiter character (only used when delimiterType is CUSTOM) */
    delimiter?: string
  ) {
    await this._makeSingleUpdateRequest('textToColumns', {
      source: this._addSheetIdToRange(source),
      delimiterType,
      ...delimiter && { delimiter },
    });
  }

  /**
   * Updates properties of a filter view
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateFilterViewRequest
   */
  async updateFilterView(
    /** The new properties of the filter view */
    filter: FilterView,
    /** The fields that should be updated (use "*" to update all fields) */
    fields: string
  ) {
    await this._makeSingleUpdateRequest('updateFilterView', {
      filter,
      fields,
    });
  }

  /**
   * Deletes a range of cells and shifts remaining cells
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteRangeRequest
   */
  async deleteRange(
    /** The range of cells to delete (sheetId optional) */
    range: GridRangeWithOptionalWorksheetId,
    /** How remaining cells should shift (ROWS = up, COLUMNS = left) */
    shiftDimension: WorksheetDimension
  ) {
    await this._makeSingleUpdateRequest('deleteRange', {
      range: this._addSheetIdToRange(range),
      shiftDimension,
    });
  }

  /**
   * Appends rows or columns to the end of a sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AppendDimensionRequest
   */
  async appendDimension(
    /** Whether rows or columns should be appended */
    dimension: WorksheetDimension,
    /** The number of rows or columns to append */
    length: number
  ) {
    await this._makeSingleUpdateRequest('appendDimension', {
      sheetId: this.sheetId,
      dimension,
      length,
    });
  }

  /**
   * Adds a new conditional formatting rule at the given index
   * All subsequent rules' indexes are incremented
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddConditionalFormatRuleRequest
   */
  async addConditionalFormatRule(
    /** The rule to add */
    rule: ConditionalFormatRule,
    /** The zero-based index where the rule should be inserted */
    index: Integer
  ) {
    await this._makeSingleUpdateRequest('addConditionalFormatRule', {
      rule,
      index,
    });
  }

  /**
   * Updates a conditional format rule at the given index, or moves a conditional format rule to another index
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateConditionalFormatRuleRequest
   */
  async updateConditionalFormatRule(
    /** Either provide `rule` to replace the rule, or `newIndex` and `sheetId` to move it */
    options: {
      /** The zero-based index of the rule */
      index: Integer;
      /** The rule that should replace the rule at the given index (mutually exclusive with newIndex) */
      rule?: ConditionalFormatRule;
      /** The zero-based new index the rule should end up at (mutually exclusive with rule, requires sheetId) */
      newIndex?: Integer;
      /** The sheet of the rule to move (required if newIndex is set) */
      sheetId?: WorksheetId;
    }
  ) {
    await this._makeSingleUpdateRequest('updateConditionalFormatRule', options);
  }

  /**
   * Deletes a conditional format rule at the given index
   * All subsequent rules' indexes are decremented
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteConditionalFormatRuleRequest
   */
  async deleteConditionalFormatRule(
    /** The zero-based index of the rule to be deleted */
    index: Integer,
    /** The sheet the rule is being deleted from (defaults to this sheet) */
    sheetId?: WorksheetId
  ) {
    await this._makeSingleUpdateRequest('deleteConditionalFormatRule', {
      index,
      sheetId: sheetId ?? this.sheetId,
    });
  }

  /**
   * Sorts data in rows based on sort order per column
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SortRangeRequest
   */
  async sortRange(
    /** The range to sort (sheetId optional) */
    range: GridRangeWithOptionalWorksheetId,
    /** Array of sort specifications (later specs used when values are equal) */
    sortSpecs: SortSpec[]
  ) {
    await this._makeSingleUpdateRequest('sortRange', {
      range: this._addSheetIdToRange(range),
      sortSpecs,
    });
  }

  /**
   * Sets (or unsets) a data validation rule to every cell in the range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SetDataValidationRequest
   */
  async setDataValidation(
    range: GridRangeWithOptionalWorksheetId,
    /** data validation rule object, or set to false to clear an existing rule */
    rule: DataValidationRule | false
  ) {
    return this._makeSingleUpdateRequest('setDataValidation', {
      range: {
        sheetId: this.sheetId,
        ...range,
      },
      ...rule && { rule },
    });
  }

  /**
   * Sets the basic filter on this sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SetBasicFilterRequest
   */
  async setBasicFilter(
    /** The basic filter configuration (range will auto-fill sheetId if not provided) */
    filter: {
      range?: GridRangeWithOptionalWorksheetId,
      sortSpecs?: SortSpec[],
      filterSpecs?: any[]
    }
  ) {
    await this._makeSingleUpdateRequest('setBasicFilter', {
      filter: {
        ...filter,
        ...filter.range && { range: this._addSheetIdToRange(filter.range) },
      },
    });
  }

  /**
   * add a new protected range to the sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddProtectedRangeRequest
   */
  async addProtectedRange(
    protectedRange: ProtectedRange
  ) {
    if (!protectedRange.range && !protectedRange.namedRangeId) {
      throw new Error('No range specified: either range or namedRangeId is required');
    }
    return this._makeSingleUpdateRequest('addProtectedRange', {
      protectedRange,
    });
  }

  /**
   * update an existing protected range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateProtectedRangeRequest
   */
  async updateProtectedRange(
    protectedRangeId: Integer,
    protectedRange: Partial<ProtectedRange>
  ) {
    return this._makeSingleUpdateRequest('updateProtectedRange', {
      protectedRange: { protectedRangeId, ...protectedRange },
      fields: getFieldMask(protectedRange as Record<string, unknown>),
    });
  }

  /**
   * delete a protected range by ID
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteProtectedRangeRequest
   */
  async deleteProtectedRange(
    protectedRangeId: Integer
  ) {
    return this._makeSingleUpdateRequest('deleteProtectedRange', {
      protectedRangeId,
    });
  }

  /**
   * auto-resize rows or columns to fit their contents
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AutoResizeDimensionsRequest
   */
  async autoResizeDimensions(
    /** which dimension to auto-resize */
    columnsOrRows: WorksheetDimension,
    /** start and end indexes (optional, defaults to all) */
    rangeIndexes?: DimensionRangeIndexes
  ) {
    return this._makeSingleUpdateRequest('autoResizeDimensions', {
      dimensions: {
        sheetId: this.sheetId,
        dimension: columnsOrRows,
        ...rangeIndexes,
      },
    });
  }

  async addChart() {
    // Request type = `addChart`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddChartRequest
    throw new Error('Not implemented yet');
  }

  async updateChartSpec() {
    // Request type = `updateChartSpec`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateChartSpecRequest
    throw new Error('Not implemented yet');
  }

  /**
   * Updates properties of a banded range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateBandingRequest
   */
  async updateBanding(
    /** The banded range to update with the new properties */
    bandedRange: BandedRange,
    /** The fields that should be updated (use "*" to update all fields) */
    fields: string
  ) {
    await this._makeSingleUpdateRequest('updateBanding', {
      bandedRange,
      fields,
    });
  }

  /**
   * Adds a new banded range to the sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddBandingRequest
   */
  async addBanding(
    /** The banded range to add (bandedRangeId is optional and will be auto-generated if not provided) */
    bandedRange: BandedRange
  ) {
    return this._makeSingleUpdateRequest('addBanding', {
      bandedRange,
    });
  }

  /**
   * Deletes a banded range from the sheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteBandingRequest
   */
  async deleteBanding(
    /** The ID of the banded range to delete */
    bandedRangeId: Integer
  ) {
    await this._makeSingleUpdateRequest('deleteBanding', {
      bandedRangeId,
    });
  }

  /**
   * Creates developer metadata
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CreateDeveloperMetadataRequest
   */
  async createDeveloperMetadata(
    /** The developer metadata to create */
    developerMetadata: DeveloperMetadata
  ) {
    return this._makeSingleUpdateRequest('createDeveloperMetadata', {
      developerMetadata,
    });
  }

  /**
   * Updates developer metadata that matches the specified filters
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateDeveloperMetadataRequest
   */
  async updateDeveloperMetadata(
    /** The filters matching the developer metadata entries to update */
    dataFilters: DataFilterObject[],
    /** The value that all metadata matched by the filters will be updated to */
    developerMetadata: DeveloperMetadata,
    /** The fields that should be updated (use "*" to update all fields) */
    fields: string
  ) {
    await this._makeSingleUpdateRequest('updateDeveloperMetadata', {
      dataFilters,
      developerMetadata,
      fields,
    });
  }

  /**
   * Deletes developer metadata that matches the specified filter
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDeveloperMetadataRequest
   */
  async deleteDeveloperMetadata(
    /** The filter describing the criteria used to select which developer metadata to delete */
    dataFilter: DataFilterObject
  ) {
    await this._makeSingleUpdateRequest('deleteDeveloperMetadata', {
      dataFilter,
    });
  }

  /**
   * Randomizes the order of rows in a range
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#RandomizeRangeRequest
   */
  async randomizeRange(
    /** The range to randomize (sheetId optional) */
    range: GridRangeWithOptionalWorksheetId
  ) {
    await this._makeSingleUpdateRequest('randomizeRange', {
      range: this._addSheetIdToRange(range),
    });
  }

  async addDimensionGroup() {
    // Request type = `addDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddDimensionGroupRequest
    throw new Error('Not implemented yet');
  }

  async deleteDimensionGroup() {
    // Request type = `deleteDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDimensionGroupRequest
    throw new Error('Not implemented yet');
  }

  async updateDimensionGroup() {
    // Request type = `updateDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateDimensionGroupRequest
    throw new Error('Not implemented yet');
  }

  /**
   * Trims whitespace from the start and end of each cell's text
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#TrimWhitespaceRequest
   */
  async trimWhitespace(
    /** The range whose cells to trim (sheetId optional) */
    range: GridRangeWithOptionalWorksheetId
  ) {
    await this._makeSingleUpdateRequest('trimWhitespace', {
      range: this._addSheetIdToRange(range),
    });
  }

  /**
   * Removes duplicate rows from a range based on specified columns
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDuplicatesRequest
   */
  async deleteDuplicates(
    /** The range to remove duplicates from (sheetId optional) */
    range: GridRangeWithOptionalWorksheetId,
    /** Columns to check for duplicates (if empty, all columns are used) */
    comparisonColumns?: DimensionRange[]
  ) {
    await this._makeSingleUpdateRequest('deleteDuplicates', {
      range: this._addSheetIdToRange(range),
      ...comparisonColumns && { comparisonColumns },
    });
  }

  async addSlicer() {
    // Request type = `addSlicer`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddSlicerRequest
    throw new Error('Not implemented yet');
  }

  async updateSlicerSpec() {
    // Request type = `updateSlicerSpec`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateSlicerSpecRequest
    throw new Error('Not implemented yet');
  }

  /**
   * delete this worksheet
   */
  async delete() {
    return this._spreadsheet.deleteSheet(this.sheetId);
  }

  /**
   * copies this worksheet into another document/spreadsheet
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.sheets/copyTo
   */
  async copyToSpreadsheet(
    destinationSpreadsheetId: SpreadsheetId
  ) {
    const req = this._spreadsheet.sheetsApi.post(`sheets/${this.sheetId}:copyTo`, {
      json: {
        destinationSpreadsheetId,
      },
    });
    const data = await req.json<any>();
    return data;
  }

  /**
   * clear data in the sheet - either the entire sheet or a specific range
   */
  async clear(
    /** optional A1 range to clear - defaults to entire sheet  */
    a1Range?: A1Range
  ) {
    const range = a1Range ? `!${a1Range}` : '';
    // sheet name without ie 'sheet1' rather than 'sheet1'!A1:B5 is all cells
    await this._spreadsheet.sheetsApi.post(`values/${this.encodedA1SheetName}${range}:clear`);
    this.resetLocalCache(true);
  }

  /**
   * exports worksheet as CSV file (comma-separated values)
   */
  async downloadAsCSV(): Promise<ArrayBuffer>;
  async downloadAsCSV(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsCSV(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
  async downloadAsCSV(returnStreamInsteadOfBuffer = false) {
    return this._spreadsheet._downloadAs('csv', this.sheetId, returnStreamInsteadOfBuffer);
  }
  /**
   * exports worksheet as TSC file (tab-separated values)
   */
  async downloadAsTSV(): Promise<ArrayBuffer>;
  async downloadAsTSV(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsTSV(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
  async downloadAsTSV(returnStreamInsteadOfBuffer = false) {
    return this._spreadsheet._downloadAs('tsv', this.sheetId, returnStreamInsteadOfBuffer);
  }
  /**
   * exports worksheet as PDF
   */
  async downloadAsPDF(): Promise<ArrayBuffer>;
  async downloadAsPDF(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
  async downloadAsPDF(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
  async downloadAsPDF(returnStreamInsteadOfBuffer = false) {
    return this._spreadsheet._downloadAs('pdf', this.sheetId, returnStreamInsteadOfBuffer);
  }
}
