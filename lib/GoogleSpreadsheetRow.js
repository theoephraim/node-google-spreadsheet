const { columnToLetter } = require('./utils');

class GoogleSpreadsheetRow {
  constructor(parentSheet, rowNumber, data) {
    this._sheet = parentSheet; // the parent GoogleSpreadsheetWorksheet instance
    this._rowNumber = rowNumber; // the A1 row (1-indexed)
    this._rawData = data;

    for (let i = 0; i < this._sheet.headerValues.length; i++) {
      const propName = this._sheet.headerValues[i];
      if (!propName) continue; // skip empty header
      Object.defineProperty(this, propName, {
        get: () => this._rawData[i],
        set: (newVal) => { this._rawData[i] = newVal; },
        enumerable: true,
      });
    }

    return this;
  }

  get rowNumber() { return this._rowNumber; }
  // TODO: deprecate rowIndex - the name implies it should be zero indexed :(
  get rowIndex() { return this._rowNumber; }
  get a1Range() {
    return [
      this._sheet.a1SheetName,
      '!',
      `A${this._rowNumber}`,
      ':',
      `${columnToLetter(this._sheet.headerValues.length)}${this._rowNumber}`,
    ].join('');
  }

  async save(options = {}) {
    if (this._deleted) throw new Error('This row has been deleted - call getRows again before making updates.');

    const response = await this._sheet._spreadsheet.axios.request({
      method: 'put',
      url: `/values/${encodeURIComponent(this.a1Range)}`,
      params: {
        valueInputOption: options.raw ? 'RAW' : 'USER_ENTERED',
        includeValuesInResponse: true,
      },
      data: {
        range: this.a1Range,
        majorDimension: 'ROWS',
        values: [this._rawData],
      },
    });
    this._rawData = response.data.updatedData.values[0];
  }

  // delete this row
  async delete() {
    if (this._deleted) throw new Error('This row has been deleted - call getRows again before making updates.');

    const result = await this._sheet._makeSingleUpdateRequest('deleteRange', {
      range: {
        sheetId: this._sheet.sheetId,
        startRowIndex: this._rowNumber - 1, // this format is zero indexed, because of course...
        endRowIndex: this._rowNumber,
      },
      shiftDimension: 'ROWS',
    });
    this._deleted = true;
    return result;
  }
  async del() { return this.delete(); } // alias to mimic old version of this module
}

module.exports = GoogleSpreadsheetRow;
