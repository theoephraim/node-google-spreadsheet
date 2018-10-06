declare module 'google-spreadsheet' {
    export interface GoogleSpreadsheetOptions {
        readonly visibility?: string;
        readonly projection?: string;
    }

    export interface AccountInfo {
        readonly private_key: string;
        readonly client_email: string;
    }

    export interface AddWorksheet {
        readonly colCount: number;
        readonly rowCount: number;
    }

    export interface Author {
        readonly name: string;
        readonly email: string;
    }

    export interface GetInfo {
        readonly id: string;
        readonly title: string;
        readonly author: Author;
        readonly updated: string;
        readonly worksheets: SpreadsheetWorksheet[];
    }

    export interface GetCells {
        readonly 'min-row'?: number;
        readonly 'max-row'?: number;
        readonly 'min-col'?: number;
        readonly 'max-col'?: number;
        readonly 'return-empty'?: boolean;
    }

    export interface GetRows {
        readonly limit?: number;
        readonly query?: string;
        readonly offset?: number;
        readonly orderby?: string;
        readonly reverse?: boolean;
    }

    export interface Resize {
        readonly colCount: number;
        readonly rowCount: number;
    }

    /**
     * The main class that represents an entire spreadsheet.
     */
    class GoogleSpreadsheet {
        /**
         * Create a new google spreadsheet object.
         * 
         * @param sheet_id The ID of the spreadsheet (from its URL)
         * @param auth An existing auth token
         * @param options Spreadsheet options
         */
        constructor(sheet_id: string, auth?: string, options?: GoogleSpreadsheetOptions);

        /**
         * Uses a service account email and public/private key to create a token to use to authenticated requests.
         * Normally you would just pass in the result of requiring the json file that google generates for you when you create a service account.
         *
         * @param account_info Configuration to be sent
         * @param callback Default callback of the request
         */
        public useServiceAccountAuth(account_info: AccountInfo, callback: (err: Error) => void): void;

        /**
         * Use an already created auth token for all future requests.
         * 
         * @param id The new ID
         */
        public setAuthToken(id: string): void;

        /**
         * Get information about the spreadsheet
         * 
         * @param callback Default callback containing requested the info
         */
        public getInfo(callback: (err: Error, info: GetInfo) => void): void;

        /**
         * Get an array of row objects from the sheet.
         * 
         * @param worksheet_id The index of the sheet to read from (index starts at 1)
         * @param options Rows options
         * @param callback Default callback containing array of SpreadsheetRow object
         */
        public getRows(worksheet_id: number, options: GetRows, callback: (err: Error, rows: SpreadsheetRow[]) => void): void;

        /**
         * Get an array of row objects from the sheet.
         *
         * @param options Rows options
         * @param callback Default callback containing array of SpreadsheetRow object
         */
        public getRows(options: GetRows, callback: (err: Error, rows: SpreadsheetRow[]) => void): void;

        /**
         * Add a single row to the sheet
         * 
         * @param worksheet_id The index of the sheet to add to (index starts at 1)
         * @param new_row Key-value object to add - keys must match the header row on your sheet
         * @param callback Default callback containing array of SpreadsheetRow object
         */
        public addRow(worksheet_id: number, new_row, callback: (err: Error, row: SpreadsheetRow[]) => void): void;

        /**
         * Get an array of cell objects
         * 
         * @param worksheet_id The index of the sheet to add to (index starts at 1)
         * @param options Cells options
         * @param callback Default callback containing array of SpreadsheetCell object
         */
        public getCells(worksheet_id: number, options: GetCells, callback: (err: Error, cells: SpreadsheetCell[]) => void): void;

        /**
         * Get an array of cell objects
         *
         * @param worksheet_id The index of the sheet to add to (index starts at 1)
         * @param callback Default callback containing array of SpreadsheetCell object
         */
        public getCells(worksheet_id: number, callback: (err: Error, cells: SpreadsheetCell[]) => void): void;

        /**
         * Add a new worksheet to the doc
         * 
         * @param options Worksheet options
         * @param callback Default callback containing array of SpreadsheetWorksheet object
         */
        public addWorksheet(options: AddWorksheet, callback: (err: Error, sheet: SpreadsheetWorksheet) => void): void;

        /**
         * Add a new worksheet to the doc
         *
         * @param callback Default callback containing array of SpreadsheetWorksheet object
         */
        public addWorksheet(callback: (err: Error, sheet: SpreadsheetWorksheet) => void): void;

        /**
         * Remove a worksheet from the doc
         * 
         * @param sheet 
         * @param callback 
         */
        public removeWorksheet(sheet: number | string | SpreadsheetWorksheet, callback): void;

        /**
         * Do a bulk update on cells
         * 
         * @param cells an array of SpreadsheetCell objects to save
         * @param callback 
         */
        public bulkUpdateCells(cells: SpreadsheetCell[], callback: (err: Error) => void): void;
    }

    /**
     * Represents a single "sheet" from the spreadsheet. These are the different tabs/pages visible at the bottom of the Google Sheets interface.
     */
    class SpreadsheetWorksheet {
        public id: number;
        public url: string;
        public title: string;
        public colCount: number;
        public rowCount: number;

        /**
         * Get an array of row objects from the sheet.
         * 
         * @param worksheet_id The index of the sheet to read from (index starts at 1)
         * @param options Rows options
         * @param callback Default callback containing array of SpreadsheetRow object
         */
        public getRows(worksheet_id: number, options: GetRows, callback: (err: Error, rows: SpreadsheetRow[]) => void): void;

        /**
         * Get an array of row objects from the sheet.
         *
         * @param options Rows options
         * @param callback Default callback containing array of SpreadsheetRow object
         */
        public getRows(options: GetRows, callback: (err: Error, rows: SpreadsheetRow[]) => void): void;

        /**
         * Get an array of cell objects
         * 
         * @param worksheet_id The index of the sheet to add to (index starts at 1)
         * @param options Cells options
         * @param callback Default callback containing array of SpreadsheetCell object
         */
        public getCells(worksheet_id: number, options: GetCells, callback: (err: Error, cells: SpreadsheetCell[]) => void): void;

        /**
         * Get an array of cell objects
         *
         * @param worksheet_id The index of the sheet to add to (index starts at 1)
         * @param callback Default callback containing array of SpreadsheetCell object
         */
        public getCells(worksheet_id: number, callback: (err: Error, cells: SpreadsheetCell[]) => void): void;

        /**
         * Add a single row to the sheet
         * 
         * @param worksheet_id The index of the sheet to add to (index starts at 1)
         * @param new_row Key-value object to add - keys must match the header row on your sheet
         * @param callback Default callback containing array of SpreadsheetRow object
         */
        public addRow(worksheet_id: number, new_row, callback: (err: Error, row: SpreadsheetRow[]) => void): void;

        /**
         * Remove this sheet from the doc
         * 
         * @param callback Default callback
         */
        public del(callback: (err: Error) => void): void;

        /**
         * Set the first row of the sheet
         * 
         * @param values Values to put in the first row of the sheet
         * @param callback Default callback
         */
        public setHeaderRow(values: string[], callback): void;

        /**
         * Clears the entire sheet's contents
         * 
         * @param callback Default callback
         */
        public clear(callback: (err: Error) => void): void;

        /**
         * Set the dimensions of the sheet
         * 
         * @param options Resize configurations
         * @param callback Default callback
         */
        public resize(options: Resize, callback: (err: Error) => void): void;

        /**
         * Set the title of the sheet
         * 
         * @param title New title for the worksheet
         * @param callback Default callback
         */
        public setTitle(title: string, callback: (err: Error) => void): void;
    }

    /**
     * Represents a single row from a sheet
     */
    class SpreadsheetRow {
        /**
         * Saves any changes made to the row's values
         * 
         * @param callback Default callback
         */
        public save(callback: (err: Error) => void): void;

        /**
         * Deletes the row from the sheet
         * 
         * @param callback Default callback
         */
        public del(callback: (err: Error) => void): void;
    }

    /**
     * Represents a single cell from the sheet.
     * Using cells is the only way to read and modify the formulas in your sheet.
     */
    class SpreadsheetCell {
        public id: number;
        public row: number;
        public col: number;
        public value: string;
        public formula?: string;
        public numericValue?: number;

        /**
         * Saves the current value or formula
         * 
         * @param callback Default callback
         */
        public save(callback: (err: Error) => void): void;

        /**
         * Clear the cell
         * 
         * @param callback Default callback
         */
        public del(callback: (err: Error) => void): void;

        /**
         * Sets the value and saves it
         * 
         * @param new_value The value to be set
         * @param callback Default callback
         */
        public setValue(new_value: string | number, callback): void;
    }

    export default GoogleSpreadsheet;
}
