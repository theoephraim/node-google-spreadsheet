const _ = require('lodash');

const GoogleSpreadsheetRow = require('./GoogleSpreadsheetRow');
const GoogleSpreadsheetCell = require('./GoogleSpreadsheetCell');

const { getFieldMask, columnToLetter, letterToColumn } = require('./utils');

function checkForDuplicateHeaders(headers) {
  // check for duplicate headers
  const checkForDupes = _.groupBy(headers); // { c1: ['c1'], c2: ['c2', 'c2' ]}
  _.each(checkForDupes, (grouped, header) => {
    if (!header) return; // empty columns are skipped, so multiple is ok
    if (grouped.length > 1) {
      throw new Error(`Duplicate header detected: "${header}". Please make sure all non-empty headers are unique`);
    }
  });
}

class GoogleSpreadsheetWorksheet {
  constructor(parentSpreadsheet, { properties, data }) {
    this._spreadsheet = parentSpreadsheet; // the parent GoogleSpreadsheet instance

    // basic properties
    this._rawProperties = properties;

    this._cells = []; // we will use a 2d sparse array to store cells;

    this._rowMetadata = []; // 1d sparse array
    this._columnMetadata = [];

    if (data) this._fillCellData(data);

    return this;
  }

  // INTERNAL UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////
  async _makeSingleUpdateRequest(requestType, requestParams) {
    // pass the call up to the parent
    return this._spreadsheet._makeSingleUpdateRequest(requestType, {
      // sheetId: this.sheetId,
      ...requestParams,
    });
  }

  _ensureInfoLoaded() {
    if (!this._rawProperties) {
      throw new Error('You must call `doc.loadInfo()` again before accessing this property');
    }
  }

  resetLocalCache(dataOnly) {
    if (!dataOnly) this._rawProperties = null;
    this.headerValues = null;
    this._cells = [];
  }

  _fillCellData(dataRanges) {
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


  // PROPERTY GETTERS //////////////////////////////////////////////////////////////////////////////
  _getProp(param) {
    this._ensureInfoLoaded();
    return this._rawProperties[param];
  }
  _setProp(param, newVal) { // eslint-disable-line no-unused-vars
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

  set sheetId(newVal) { return this._setProp('sheetId', newVal); }
  set title(newVal) { return this._setProp('title', newVal); }
  set index(newVal) { return this._setProp('index', newVal); }
  set sheetType(newVal) { return this._setProp('sheetType', newVal); }
  set gridProperties(newVal) { return this._setProp('gridProperties', newVal); }
  set hidden(newVal) { return this._setProp('hidden', newVal); }
  set tabColor(newVal) { return this._setProp('tabColor', newVal); }
  set rightToLeft(newVal) { return this._setProp('rightToLeft', newVal); }

  get rowCount() {
    this._ensureInfoLoaded();
    return this.gridProperties.rowCount;
  }
  get columnCount() {
    this._ensureInfoLoaded();
    return this.gridProperties.columnCount;
  }
  get colCount() { throw new Error('`colCount` is deprecated - please use `columnCount` instead.'); }
  set rowCount(newVal) { throw new Error('Do not update directly. Use resize()'); }
  set columnCount(newVal) { throw new Error('Do not update directly. Use resize()'); }

  get a1SheetName() { return `'${this.title.replace(/'/g, "''")}'`; }
  get encodedA1SheetName() { return encodeURIComponent(this.a1SheetName); }
  get lastColumnLetter() { return columnToLetter(this.columnCount); }


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

  getCellByA1(a1Address) {
    const split = a1Address.match(/([A-Z]+)([0-9]+)/);
    const columnIndex = letterToColumn(split[1]);
    const rowIndex = parseInt(split[2]);
    return this.getCell(rowIndex - 1, columnIndex - 1);
  }

  getCell(rowIndex, columnIndex) {
    if (rowIndex < 0 || columnIndex < 0) throw new Error('Min coordinate is 0, 0');
    if (rowIndex >= this.rowCount || columnIndex >= this.columnCount) {
      throw new Error(`Out of bounds, sheet is ${this.rowCount} by ${this.columnCount}`);
    }

    if (!_.get(this._cells, `[${rowIndex}][${columnIndex}]`)) {
      throw new Error('This cell has not been loaded yet');
    }
    return this._cells[rowIndex][columnIndex];
  }


  async loadCells(sheetFilters) {
    // load the whole sheet
    if (!sheetFilters) return this._spreadsheet.loadCells(this.a1SheetName);

    let filtersArray = _.isArray(sheetFilters) ? sheetFilters : [sheetFilters];
    filtersArray = _.map(filtersArray, (filter) => {
      // add sheet name to A1 ranges
      if (_.isString(filter)) {
        if (filter.startsWith(this.a1SheetName)) return filter;
        return `${this.a1SheetName}!${filter}`;
      }
      if (_.isObject(filter)) {
        // TODO: detect and support DeveloperMetadata filters
        if (!filter.sheetId) {
          return { sheetId: this.sheetId, ...filter };
        }
        if (filter.sheetId !== this.sheetId) {
          throw new Error('Leave sheet ID blank or set to matching ID of this sheet');
        } else {
          return filter;
        }
      } else {
        throw new Error('Each filter must be a A1 range string or gridrange object');
      }
    });
    return this._spreadsheet.loadCells(filtersArray);
  }

  async saveUpdatedCells() {
    const cellsToSave = _.filter(_.flatten(this._cells), { _isDirty: true });
    if (cellsToSave.length) {
      await this.saveCells(cellsToSave);
    }
    // TODO: do we want to return stats? or the cells that got updated?
  }

  async saveCells(cellsToUpdate) {
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

  async loadHeaderRow() {
    const rows = await this.getCellsInRange(`A1:${this.lastColumnLetter}1`);
    if (!rows) {
      throw new Error('No values in the header row - fill the first row with header values before trying to interact with rows');
    }
    this.headerValues = _.map(rows[0], (header) => header.trim());
    if (!_.compact(this.headerValues).length) {
      throw new Error('All your header cells are blank - fill the first row with header values before trying to interact with rows');
    }
    checkForDuplicateHeaders(this.headerValues);
  }

  async setHeaderRow(headerValues) {
    if (!headerValues) return;
    if (headerValues.length > this.columnCount) {
      throw new Error(`Sheet is not large enough to fit ${headerValues.length} columns. Resize the sheet first.`);
    }
    const trimmedHeaderValues = _.map(headerValues, (h) => h.trim());
    checkForDuplicateHeaders(trimmedHeaderValues);

    if (!_.compact(trimmedHeaderValues).length) {
      throw new Error('All your header cells are blank -');
    }

    const response = await this._spreadsheet.axios.request({
      method: 'put',
      url: `/values/${this.encodedA1SheetName}!1:1`,
      params: {
        valueInputOption: 'USER_ENTERED', // other option is RAW
        includeValuesInResponse: true,
      },
      data: {
        range: `${this.a1SheetName}!1:1`,
        majorDimension: 'ROWS',
        values: [[
          ...trimmedHeaderValues,
          // pad the rest of the row with empty values to clear them all out
          ..._.times(this.columnCount - trimmedHeaderValues.length, () => ''),
        ]],
      },
    });
    this.headerValues = response.data.updatedData.values[0];
  }

  async addRows(rows, options = {}) {
    // adds multiple rows in one API interaction using the append endpoint

    // each row can be an array or object
    // an array is just cells
    // ex: ['column 1', 'column 2', 'column 3']
    // an object must use the header row values as keys
    // ex: { col1: 'column 1', col2: 'column 2', col3: 'column 3' }

    // google bug that does not handle colons in names
    // see https://issuetracker.google.com/issues/150373119
    if (this.title.includes(':')) {
      throw new Error('Please remove the ":" from your sheet title. There is a bug with the google API which breaks appending rows if any colons are in the sheet title.');
    }

    if (!_.isArray(rows)) throw new Error('You must pass in an array of row values to append');

    if (!this.headerValues) await this.loadHeaderRow();

    // convert each row into an array of cell values rather than the key/value object
    const rowsAsArrays = [];
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

    const response = await this._spreadsheet.axios.request({
      method: 'post',
      url: `/values/${this.encodedA1SheetName}!A1:append`,
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

    // if new rows were added, we need update sheet.rowRount
    if (options.insert) {
      this._rawProperties.gridProperties.rowCount += rows.length;
    } else if (rowNumber + rows.length > this.rowCount) {
      // have to subtract 1 since one row was inserted at rowNumber
      this._rawProperties.gridProperties.rowCount = rowNumber + rows.length - 1;
    }

    return _.map(response.data.updates.updatedData.values, (rowValues) => {
      const row = new GoogleSpreadsheetRow(this, rowNumber++, rowValues);
      return row;
    });
  }

  async addRow(rowValues, options) {
    const rows = await this.addRows([rowValues], options);
    return rows[0];
  }

  async getRows(options = {}) {
    // https://developers.google.com/sheets/api/guides/migration
    // v4 API does not have equivalents for the row-order query parameters provided
    // Reverse-order is trivial; simply process the returned values array in reverse order.
    // Order by column is not supported for reads, but it is possible to sort the data then read

    // v4 API does not currently have a direct equivalent for the Sheets API v3 structured queries
    // However, you can retrieve the relevant data and sort through it as needed in your application

    // options
    // - offset
    // - limit

    options.offset = options.offset || 0;
    options.limit = options.limit || this.rowCount - 1;

    if (!this.headerValues) await this.loadHeaderRow();

    const firstRow = 2 + options.offset; // skip first row AND not zero indexed
    const lastRow = firstRow + options.limit - 1; // inclusive so we subtract 1
    const lastColumn = columnToLetter(this.headerValues.length);
    const rawRows = await this.getCellsInRange(
      `A${firstRow}:${lastColumn}${lastRow}`
    );

    if (!rawRows) return [];

    const rows = [];
    let rowNum = firstRow;
    for (let i = 0; i < rawRows.length; i++) {
      rows.push(new GoogleSpreadsheetRow(this, rowNum++, rawRows[i]));
    }
    return rows;
  }

  // BASIC PROPS ///////////////////////////////////////////////////////////////////////////////////
  async updateProperties(properties) {
    // Request type = `updateSheetProperties`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateSheetPropertiesRequest

    // properties
    // - title (string)
    // - index (number)
    // - gridProperties ({ object (GridProperties) } - https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#gridproperties
    // - hidden (boolean)
    // - tabColor ({ object (Color) } - https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Color
    // - rightToLeft (boolean)

    return this._makeSingleUpdateRequest('updateSheetProperties', {
      properties: {
        sheetId: this.sheetId,
        ...properties,
      },
      fields: getFieldMask(properties),
    });
  }

  async updateGridProperties(gridProperties) {
    // just passes the call through to update gridProperties
    // see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#GridProperties

    // gridProperties
    // - rowCount
    // - columnCount
    // - frozenRowCount
    // - frozenColumnCount
    // - hideGridLines
    return this.updateProperties({ gridProperties });
  }

  // just a shortcut because resize makes more sense to change rowCount / columnCount
  async resize(gridProperties) {
    return this.updateGridProperties(gridProperties);
  }

  async updateDimensionProperties(columnsOrRows, properties, bounds) {
    // Request type = `updateDimensionProperties`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#updatedimensionpropertiesrequest

    // columnsOrRows = COLUMNS|ROWS
    // properties
    // - pixelSize
    // - hiddenByUser
    // - developerMetadata
    // bounds
    // - startIndex
    // - endIndex

    return this._makeSingleUpdateRequest('updateDimensionProperties', {
      range: {
        sheetId: this.sheetId,
        dimension: columnsOrRows,
        ...bounds && {
          startIndex: bounds.startIndex,
          endIndex: bounds.endIndex,
        },
      },
      properties,
      fields: getFieldMask(properties),
    });
  }

  // OTHER /////////////////////////////////////////////////////////////////////////////////////////

  // this uses the "values" getter and does not give all the info about the cell contents
  // it is used internally when loading header cells
  async getCellsInRange(a1Range, options) {
    const response = await this._spreadsheet.axios.get(`/values/${this.encodedA1SheetName}!${a1Range}`, {
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

  async mergeCells(range, mergeType = 'MERGE_ALL') {
    // Request type = `mergeCells`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MergeCellsRequest
    if (range.sheetId && range.sheetId !== this.sheetId) {
      throw new Error('Leave sheet ID blank or set to matching ID of this sheet');
    }
    await this._makeSingleUpdateRequest('mergeCells', {
      mergeType,
      range: {
        ...range,
        sheetId: this.sheetId,
      },
    });
  }

  async unmergeCells(range) {
    // Request type = `unmergeCells`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UnmergeCellsRequest
    if (range.sheetId && range.sheetId !== this.sheetId) {
      throw new Error('Leave sheet ID blank or set to matching ID of this sheet');
    }
    await this._makeSingleUpdateRequest('unmergeCells', {
      range: {
        ...range,
        sheetId: this.sheetId,
      },
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

  async duplicateSheet() {
    // Request type = `duplicateSheet`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DuplicateSheetRequest
  }

  async findReplace() {
    // Request type = `findReplace`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#FindReplaceRequest
  }

  async insertDimension() {
    // Request type = `insertDimension`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#InsertDimensionRequest
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

  // delete this worksheet
  async delete() {
    return this._spreadsheet.deleteSheet(this.sheetId);
  }
  async del() { return this.delete(); } // alias to mimic old interface

  // copies this worksheet into another document/spreadsheet
  async copyToSpreadsheet(destinationSpreadsheetId) {
    return this._spreadsheet.axios.post(`/sheets/${this.sheetId}:copyTo`, {
      destinationSpreadsheetId,
    });
  }

  async clear() {
    // clears all the data in the sheet
    // sheet name without ie 'sheet1' rather than 'sheet1'!A1:B5 is all cells
    await this._spreadsheet.axios.post(`/values/${this.encodedA1SheetName}:clear`);
    this.resetLocalCache(true);
  }
}

module.exports = GoogleSpreadsheetWorksheet;
