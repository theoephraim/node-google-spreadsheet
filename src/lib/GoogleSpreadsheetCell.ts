/* eslint-disable max-classes-per-file */
import * as _ from './toolkit';

import { columnToLetter } from './utils';

import { GoogleSpreadsheetWorksheet } from './GoogleSpreadsheetWorksheet';
import { GoogleSpreadsheetCellErrorValue } from './GoogleSpreadsheetCellErrorValue';

import {
  CellData,
  CellFormat, CellValueType, ColumnIndex, RowIndex,
} from './types/sheets-types';

export class GoogleSpreadsheetCell {
  private _rawData?: CellData;
  private _draftData: any = {};
  private _error?: GoogleSpreadsheetCellErrorValue;

  constructor(
    readonly _sheet: GoogleSpreadsheetWorksheet,
    private _rowIndex: RowIndex,
    private _columnIndex: ColumnIndex,
    rawCellData: CellData
  ) {
    this._updateRawData(rawCellData);
    this._rawData = rawCellData; // so TS does not complain
  }

  // TODO: figure out how to deal with empty rawData
  // newData can be undefined/null if the cell is totally empty and unformatted
  /**
   * update cell using raw CellData coming back from sheets API
   * @internal
   */
  _updateRawData(newData: CellData) {
    this._rawData = newData;
    this._draftData = {};
    if (this._rawData?.effectiveValue && 'errorValue' in this._rawData.effectiveValue) {
      this._error = new GoogleSpreadsheetCellErrorValue(this._rawData.effectiveValue.errorValue);
    } else {
      this._error = undefined;
    }
  }

  // CELL LOCATION/ADDRESS /////////////////////////////////////////////////////////////////////////
  get rowIndex() { return this._rowIndex; }
  get columnIndex() { return this._columnIndex; }
  get a1Column() { return columnToLetter(this._columnIndex + 1); }
  get a1Row() { return this._rowIndex + 1; } // a1 row numbers start at 1 instead of 0
  get a1Address() { return `${this.a1Column}${this.a1Row}`; }

  // CELL CONTENTS - VALUE/FORMULA/NOTES ///////////////////////////////////////////////////////////
  get value(): number | boolean | string | null | GoogleSpreadsheetCellErrorValue {
    // const typeKey = _.keys(this._rawData.effectiveValue)[0];
    if (this._draftData.value !== undefined) throw new Error('Value has been changed');
    if (this._error) return this._error;
    if (!this._rawData?.effectiveValue) return null;
    return _.values(this._rawData.effectiveValue)[0];
  }


  set value(newValue: number | boolean | Date | string | null | undefined | GoogleSpreadsheetCellErrorValue) {
    // had to include the GoogleSpreadsheetCellErrorValue in the type to make TS happy
    if (newValue instanceof GoogleSpreadsheetCellErrorValue) {
      throw new Error("You can't manually set a value to an error");
    }

    if (_.isBoolean(newValue)) {
      this._draftData.valueType = 'boolValue';
    } else if (_.isString(newValue)) {
      if (newValue.substring(0, 1) === '=') this._draftData.valueType = 'formulaValue';
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

  get valueType(): CellValueType | null {
    // an error only happens with a formula (as far as I know)
    if (this._error) return 'errorValue';
    if (!this._rawData?.effectiveValue) return null;
    return _.keys(this._rawData.effectiveValue)[0] as CellValueType;
  }

  /** The formatted value of the cell - this is the value as it's shown to the user */
  get formattedValue(): string | null { return this._rawData?.formattedValue || null; }

  get formula() { return _.get(this._rawData, 'userEnteredValue.formulaValue', null); }
  set formula(newValue: string | null) {
    if (!newValue) throw new Error('To clear a formula, set `cell.value = null`');
    if (newValue.substring(0, 1) !== '=') throw new Error('formula must begin with "="');
    this.value = newValue; // use existing value setter
  }
  /**
   * @deprecated use `cell.errorValue` instead
   */
  get formulaError() { return this._error; }
  /**
   * error contained in the cell, which can happen with a bad formula (maybe some other weird cases?)
   */
  get errorValue() { return this._error; }

  get numberValue(): number | undefined {
    if (this.valueType !== 'numberValue') return undefined;
    return this.value as number;
  }
  set numberValue(val: number | undefined) {
    this.value = val;
  }

  get boolValue(): boolean | undefined {
    if (this.valueType !== 'boolValue') return undefined;
    return this.value as boolean;
  }
  set boolValue(val: boolean | undefined) {
    this.value = val;
  }

  get stringValue(): string | undefined {
    if (this.valueType !== 'stringValue') return undefined;
    return this.value as string;
  }
  set stringValue(val: string | undefined) {
    if (val?.startsWith('=')) {
      throw new Error('Use cell.formula to set formula values');
    }
    this.value = val;
  }

  /**
   * Hyperlink contained within the cell.
   *
   * To modify, do not set directly. Instead set cell.formula, for example `cell.formula = \'=HYPERLINK("http://google.com", "Google")\'`
   */
  get hyperlink() {
    if (this._draftData.value) throw new Error('Save cell to be able to read hyperlink');
    return this._rawData?.hyperlink;
  }

  /** a note attached to the cell */
  get note(): string {
    return this._draftData.note !== undefined ? this._draftData.note : this._rawData?.note || '';
  }
  set note(newVal: string | null | undefined | false) {
    if (newVal === null || newVal === undefined || newVal === false) newVal = '';
    if (!_.isString(newVal)) throw new Error('Note must be a string');
    if (newVal === this._rawData?.note) delete this._draftData.note;
    else this._draftData.note = newVal;
  }

  // CELL FORMATTING ///////////////////////////////////////////////////////////////////////////////
  get userEnteredFormat() { return Object.freeze(this._rawData?.userEnteredFormat); }
  get effectiveFormat() { return Object.freeze(this._rawData?.effectiveFormat); }

  private _getFormatParam<T extends keyof CellFormat>(param: T): Readonly<CellFormat[T]> {
    // we freeze the object so users don't change nested props accidentally
    // TODO: figure out something that would throw an error if you try to update it?
    if (_.get(this._draftData, `userEnteredFormat.${param}`)) {
      throw new Error('User format is unsaved - save the cell to be able to read it again');
    }
    // TODO: figure out how to deal with possible empty rawData
    // if (!this._rawData?.userEnteredFormat?.[param]) {
    //   return undefined;
    // }
    return Object.freeze(this._rawData!.userEnteredFormat[param]);
  }

  private _setFormatParam<T extends keyof CellFormat>(param: T, newVal: CellFormat[T]) {
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
  get backgroundColorStyle() { return this._getFormatParam('backgroundColorStyle'); }
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
  set numberFormat(newVal: CellFormat['numberFormat']) { this._setFormatParam('numberFormat', newVal); }
  set backgroundColor(newVal: CellFormat['backgroundColor']) { this._setFormatParam('backgroundColor', newVal); }
  set backgroundColorStyle(newVal: CellFormat['backgroundColorStyle']) { this._setFormatParam('backgroundColorStyle', newVal); }
  set borders(newVal: CellFormat['borders']) { this._setFormatParam('borders', newVal); }
  set padding(newVal: CellFormat['padding']) { this._setFormatParam('padding', newVal); }
  set horizontalAlignment(newVal: CellFormat['horizontalAlignment']) { this._setFormatParam('horizontalAlignment', newVal); }
  set verticalAlignment(newVal: CellFormat['verticalAlignment']) { this._setFormatParam('verticalAlignment', newVal); }
  set wrapStrategy(newVal: CellFormat['wrapStrategy']) { this._setFormatParam('wrapStrategy', newVal); }
  set textDirection(newVal: CellFormat['textDirection']) { this._setFormatParam('textDirection', newVal); }
  set textFormat(newVal: CellFormat['textFormat']) { this._setFormatParam('textFormat', newVal); }
  set hyperlinkDisplayType(newVal: CellFormat['hyperlinkDisplayType']) { this._setFormatParam('hyperlinkDisplayType', newVal); }
  set textRotation(newVal: CellFormat['textRotation']) { this._setFormatParam('textRotation', newVal); }

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

  /**
   * saves updates for single cell
   * usually it's better to make changes and call sheet.saveUpdatedCells
   * */
  async save() {
    await this._sheet.saveCells([this]);
  }

  /**
   * used by worksheet when saving cells
   * returns an individual batchUpdate request to update the cell
   * @internal
   */
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
      ...this._rawData?.userEnteredFormat,
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
