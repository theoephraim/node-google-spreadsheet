const _ = require('lodash');

const { columnToLetter } = require('./utils');

const { GoogleSpreadsheetFormulaError } = require('./errors');

class GoogleSpreadsheetCell {
  constructor(parentSheet, rowIndex, columnIndex, cellData) {
    this._sheet = parentSheet; // the parent GoogleSpreadsheetWorksheet instance
    this._row = rowIndex;
    this._column = columnIndex;

    this._updateRawData(cellData);
    return this;
  }

  // newData can be undefined/null if the cell is totally empty and unformatted
  _updateRawData(newData = {}) {
    this._rawData = newData;
    this._draftData = {}; // stuff to save
    this._error = null;
    if (_.get(this._rawData, 'effectiveValue.errorValue')) {
      this._error = new GoogleSpreadsheetFormulaError(this._rawData.effectiveValue.errorValue);
    }
  }

  // CELL LOCATION/ADDRESS /////////////////////////////////////////////////////////////////////////
  get rowIndex() { return this._row; }
  get columnIndex() { return this._column; }
  get a1Column() { return columnToLetter(this._column + 1); }
  get a1Row() { return this._row + 1; } // a1 row numbers start at 1 instead of 0
  get a1Address() { return `${this.a1Column}${this.a1Row}`; }

  // CELL CONTENTS - VALUE/FORMULA/NOTES ///////////////////////////////////////////////////////////
  get value() {
    // const typeKey = _.keys(this._rawData.effectiveValue)[0];
    if (this._draftData.value !== undefined) throw new Error('Value has been changed');
    if (this._error) return this._error;
    if (!this._rawData.effectiveValue) return null;
    return _.values(this._rawData.effectiveValue)[0];
  }

  set value(newValue) {
    if (_.isBoolean(newValue)) {
      this._draftData.valueType = 'boolValue';
    } else if (_.isString(newValue)) {
      if (newValue.substr(0, 1) === '=') this._draftData.valueType = 'formulaValue';
      else this._draftData.valueType = 'stringValue';
    } else if (_.isFinite(newValue)) {
      this._draftData.valueType = 'numberValue';
    } else if (_.isNil(newValue)) {
      // null or undefined
      this._draftData.valueType = 'stringValue';
      newValue = '';
    } else {
      throw new Error('Set value to boolean, string, or number');
    }
    this._draftData.value = newValue;
  }

  get valueType() {
    // an error only happens with a formula
    if (this._error) return 'errorValue';
    if (!this._rawData.effectiveValue) return null;
    return _.keys(this._rawData.effectiveValue)[0];
  }

  get formattedValue() { return this._rawData.formattedValue || null; }
  set formattedValue(newVal) {
    throw new Error('You cannot modify the formatted value directly');
  }

  get formula() { return _.get(this._rawData, 'userEnteredValue.formulaValue', null); }
  set formula(newValue) {
    if (newValue.substr(0, 1) !== '=') throw new Error('formula must begin with "="');
    this.value = newValue; // use existing value setter
  }
  get formulaError() { return this._error; }

  get hyperlink() {
    if (this._draftData.value) throw new Error('Save cell to be able to read hyperlink');
    return this._rawData.hyperlink;
  }
  set hyperlink(val) {
    throw new Error('Do not set hyperlink directly. Instead set cell.formula, for example `cell.formula = \'=HYPERLINK("http://google.com", "Google")\'`');
  }

  get note() {
    return this._draftData.note !== undefined ? this._draftData.note : this._rawData.note;
  }

  set note(newVal) {
    if (newVal === null || newVal === undefined) newVal = '';
    if (!_.isString(newVal)) throw new Error('Note must be a string');
    if (newVal === this._rawData.note) delete this._draftData.note;
    else this._draftData.note = newVal;
  }

  // CELL FORMATTING ///////////////////////////////////////////////////////////////////////////////
  get userEnteredFormat() { return this._rawData.userEnteredFormat; }
  get effectiveFormat() { return this._rawData.effectiveFormat; }
  set userEnteredFormat(newVal) { throw new Error('Do not modify directly, instead use format properties'); }
  set effectiveFormat(newVal) { throw new Error('Read-only'); }

  _getFormatParam(param) {
    // we freeze the object so users don't change nested props accidentally
    // TODO: figure out something that would throw an error if you try to update it?
    if (_.get(this._draftData, `userEnteredFormat.${param}`)) {
      throw new Error('User format is unsaved - save the cell to be able to read it again');
    }
    return Object.freeze(this._rawData.userEnteredFormat[param]);
  }

  _setFormatParam(param, newVal) {
    if (_.isEqual(newVal, _.get(this._rawData, `userEnteredFormat.${param}`))) {
      _.unset(this._draftData, `userEnteredFormat.${param}`);
    } else {
      _.set(this._draftData, `userEnteredFormat.${param}`, newVal);
      this._draftData.clearFormat = false;
    }
  }

  // format getters
  get numberFormat() { return this._getFormatParam('numberFormat'); }
  get backgroundColor() { return this._getFormatParam('backgroundColor'); }
  get borders() { return this._getFormatParam('borders'); }
  get padding() { return this._getFormatParam('padding'); }
  get horizontalAlignment() { return this._getFormatParam('horizontalAlignment'); }
  get verticalAlignment() { return this._getFormatParam('verticalAlignment'); }
  get wrapStrategy() { return this._getFormatParam('wrapStrategy'); }
  get textDirection() { return this._getFormatParam('textDirection'); }
  get textFormat() { return this._getFormatParam('textFormat'); }
  get hyperlinkDisplayType() { return this._getFormatParam('hyperlinkDisplayType'); }
  get textRotation() { return this._getFormatParam('textRotation'); }

  // format setters
  set numberFormat(newVal) { return this._setFormatParam('numberFormat', newVal); }
  set backgroundColor(newVal) { return this._setFormatParam('backgroundColor', newVal); }
  set borders(newVal) { return this._setFormatParam('borders', newVal); }
  set padding(newVal) { return this._setFormatParam('padding', newVal); }
  set horizontalAlignment(newVal) { return this._setFormatParam('horizontalAlignment', newVal); }
  set verticalAlignment(newVal) { return this._setFormatParam('verticalAlignment', newVal); }
  set wrapStrategy(newVal) { return this._setFormatParam('wrapStrategy', newVal); }
  set textDirection(newVal) { return this._setFormatParam('textDirection', newVal); }
  set textFormat(newVal) { return this._setFormatParam('textFormat', newVal); }
  set hyperlinkDisplayType(newVal) { return this._setFormatParam('hyperlinkDisplayType', newVal); }
  set textRotation(newVal) { return this._setFormatParam('textRotation', newVal); }

  clearAllFormatting() {
    // need to track this separately since by setting/unsetting things, we may end up with
    // this._draftData.userEnteredFormat as an empty object, but not an intent to clear it
    this._draftData.clearFormat = true;
    delete this._draftData.userEnteredFormat;
  }

  // SAVING + UTILS ////////////////////////////////////////////////////////////////////////////////

  // returns true if there are any updates that have not been saved yet
  get _isDirty() {
    // have to be careful about checking undefined rather than falsy
    // in case a new value is empty string or 0 or false
    if (this._draftData.note !== undefined) return true;
    if (_.keys(this._draftData.userEnteredFormat).length) return true;
    if (this._draftData.clearFormat) return true;
    if (this._draftData.value !== undefined) return true;
    return false;
  }

  discardUnsavedChanges() {
    this._draftData = {};
  }

  async save() {
    await this._sheet.saveUpdatedCells([this]);
  }

  // used by worksheet when saving cells
  // returns an individual batchUpdate request to update the cell
  _getUpdateRequest() {
    // this logic should match the _isDirty logic above
    // but we need it broken up to build the request below
    const isValueUpdated = this._draftData.value !== undefined;
    const isNoteUpdated = this._draftData.note !== undefined;
    const isFormatUpdated = !!_.keys(this._draftData.userEnteredFormat || {}).length;
    const isFormatCleared = this._draftData.clearFormat;

    // if no updates, we return null, which we can filter out later before sending requests
    if (!_.some([isValueUpdated, isNoteUpdated, isFormatUpdated, isFormatCleared])) {
      return null;
    }

    // build up the formatting object, which has some quirks...
    const format = {
      // have to pass the whole object or it will clear existing properties
      ...this._rawData.userEnteredFormat,
      ...this._draftData.userEnteredFormat,
    };
    // if background color already set, cell has backgroundColor and backgroundColorStyle
    // but backgroundColorStyle takes precendence so we must remove to set the color
    // see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat
    if (_.get(this._draftData, 'userEnteredFormat.backgroundColor')) {
      delete (format.backgroundColorStyle);
    }

    return {
      updateCells: {
        rows: [{
          values: [{
            ...isValueUpdated && {
              userEnteredValue: { [this._draftData.valueType]: this._draftData.value },
            },
            ...isNoteUpdated && {
              note: this._draftData.note,
            },
            ...isFormatUpdated && {
              userEnteredFormat: format,
            },
            ...isFormatCleared && {
              userEnteredFormat: {},
            },
          }],
        }],
        // turns into a string of which fields to update ex "note,userEnteredFormat"
        fields: _.keys(_.pickBy({
          userEnteredValue: isValueUpdated,
          note: isNoteUpdated,
          userEnteredFormat: isFormatUpdated || isFormatCleared,
        })).join(','),
        start: {
          sheetId: this._sheet.sheetId,
          rowIndex: this.rowIndex,
          columnIndex: this.columnIndex,
        },
      },
    };
  }
}

module.exports = GoogleSpreadsheetCell;
