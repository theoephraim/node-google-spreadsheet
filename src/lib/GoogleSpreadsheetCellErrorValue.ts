import { CellValueErrorType, ErrorValue } from './types/sheets-types';

/**
 * Cell error
 *
 * not a js "error" that gets thrown, but a value that holds an error code and message for a cell
 * it's useful to use a class so we can check `instanceof`

 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ErrorType
 */
export class GoogleSpreadsheetCellErrorValue {
  /**
   * type of the error
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ErrorType
   * */
  readonly type: CellValueErrorType;

  /** A message with more information about the error (in the spreadsheet's locale) */
  readonly message: string;

  constructor(rawError: ErrorValue) {
    this.type = rawError.type;
    this.message = rawError.message;
  }
}
