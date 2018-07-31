// Type definitions for google-spreadsheet
// Project: Simple Google Spreadsheet Access (node.js)
// Definitions by: Federico Grandi <https://github.com/EndBug>

declare module 'google-spreadsheet' {

  export class GoogleSpreadsheet {

    constructor(sheet_id: string, auth?: string, options?: { visibility?: string, projection?: string })

    public useServiceAccountAuth(account_info: { client_email: string, private_key: string } | string, callback?: (error) => void): any
    public setAuthToken(id: string): void
    public getInfo(callback?: (error: Error, data: {
      id: string,
      title: string,
      updated: string,
      author: {
        name: string,
        email: string
      },
      worksheets: Array<SpreadsheetWorksheet>
    }) => void): any
    public getRows(worksheet_id: string, options?: {
      offset?: number,
      limit?: number
      orderby?: number
      reverse?: boolean
      query?: string
    }, callback?: (error: Error, rows: Array<SpreadsheetRow>) => void): any
    public addRow(worksheet_id: string, new_row: object, callback?: (error: Error, row: SpreadsheetRow) => void): any
    public getCells(worksheet_id: string, options?: {
      "min-row"?: number,
      "max-row"?: number,
      "min-col"?: number,
      "max-col"?: number,
      "return-empty"?: boolean
    }, callback?: (error: Error, cells: Array<SpreadsheetCell>) => void): any
    public addWorksheet(options?: {
      title?: string,
      rowCount?: number,
      colCount?: number,
      headers?: Array<string>
    }, callback?: (error: Error, sheet: SpreadsheetWorksheet) => void): any
    public removeWorksheet(sheet: SpreadsheetWorksheet | string | number, callback?: (error: Error, result?: true) => void): any

    private isAuthActive(): boolean
    private makeFeedRequest(url_params, method, query_or_data, callback?: (error: Error) => void): any

  }

  export class SpreadsheetWorksheet {

    constructor(spreadsheet: GoogleSpreadsheet, data: object)

    public readonly url: string
    public readonly id: string
    public readonly title: string
    public readonly rowCount: number
    public readonly colCount: number

    public getRows(options?: {
      offset?: number,
      limit?: number
      orderby?: number
      reverse?: boolean
      query?: string
    }, callback?: (error: Error, rows: Array<SpreadsheetRow>) => void): any
    public getCells(options?: {
      "min-row"?: number,
      "max-row"?: number,
      "min-col"?: number,
      "max-col"?: number,
      "return-empty"?: boolean
    }, callback?: (error: Error, cells: Array<SpreadsheetCell>) => void): any
    public addRow(new_row: object, callback?: (error: Error, row: SpreadsheetRow) => void): any
    public bulkUpdateCells(cells: Array<SpreadsheetCell>, callback?: (error: Error) => void): any
    public del(callback?: (error: Error) => void): any
    public setHeaderRow(values: Array<string>, callback?: (error: Error) => void): any
    public clear(callback?: (error: Error) => void): any
    public resize(options: {
      rowCount: number,
      colCount: number
    }, callback?: (error: Error) => void): any
    public setTitle(title: string, callback?: (error: Error) => void): any

    private _setInfo(options: {
      title: string,
      rowCount: number,
      colCount: number
    }, callback?: (error: Error) => void): any

  }

  export class SpreadsheetRow {

    constructor(spreadsheet: GoogleSpreadsheet, data: object, xml)

    public save(callback?: (error: Error) => void): any
    public del(callback?: (error: Error) => void): any

    private _xml: any

  }

  export class SpreadsheetCell {

    constructor(spreadsheet: GoogleSpreadsheet, worksheet_id: string, data: object)

    public readonly id: string
    public readonly row: number //check
    public readonly col: number //check

    public value: string
    public formula: string
    public numericValue: number

    private batchId: string
    private _links: any
    private _formula: string
    private _numericValue: number
    private _value: string

    public save(callback?: (error: Error) => void): any
    public del(callback?: (error: Error) => void): any
    public setValue(value: string, callback?: (error: Error) => void): any

    private updateValuesFromResponseData(_data: object): void
    private _clearValue(): void

  }

}
