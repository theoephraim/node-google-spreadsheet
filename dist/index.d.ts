import * as axios from 'axios';
import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Stream } from 'stream';
import { ReadableStream } from 'node:stream/web';
import { Headers } from 'google-auth-library/build/src/auth/oauth2client';

declare class GoogleSpreadsheetRow<T extends Record<string, any> = Record<string, any>> {
    /** parent GoogleSpreadsheetWorksheet instance */
    readonly _worksheet: GoogleSpreadsheetWorksheet;
    /** the A1 row (1-indexed) */
    private _rowNumber;
    /** raw underlying data for row */
    private _rawData;
    constructor(
    /** parent GoogleSpreadsheetWorksheet instance */
    _worksheet: GoogleSpreadsheetWorksheet, 
    /** the A1 row (1-indexed) */
    _rowNumber: number, 
    /** raw underlying data for row */
    _rawData: any[]);
    private _deleted;
    get deleted(): boolean;
    /** row number (matches A1 notation, ie first row is 1) */
    get rowNumber(): number;
    /**
     * @internal
     * Used internally to update row numbers after deleting rows.
     * Should not be called directly.
    */
    _updateRowNumber(newRowNumber: number): void;
    get a1Range(): string;
    /** get row's value of specific cell (by header key) */
    get(key: keyof T): any;
    /** set row's value of specific cell (by header key) */
    set<K extends keyof T>(key: K, val: T[K]): void;
    /** set multiple values in the row at once from an object */
    assign(obj: T): void;
    /** return raw object of row data */
    toObject(): Partial<T>;
    /** save row values */
    save(options?: {
        raw?: boolean;
    }): Promise<void>;
    /** delete this row */
    delete(): Promise<any>;
    /**
     * @internal
     * Used internally to clear row data after calling sheet.clearRows
     * Should not be called directly.
    */
    _clearRowData(): void;
}

type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> & Partial<Pick<Type, Key>>;
type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
};

type Integer = number;
type SpreadsheetId = string;
type WorksheetId = number;
type DataSourceId = string;
type WorksheetIndex = number;
type RowOrColumnIndex = number;
type RowIndex = number;
type ColumnIndex = number;
type A1Address = string;
type A1Range = string;
type NamedRangeId = string;
/**
 * ISO language code
 * @example en
 * @example en_US
 * */
type LocaleCode = string;
/**
 * timezone code, if not recognized, may be a custom time zone such as `GMT-07:00`
 * @example America/New_York
 * */
type Timezone = string;
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#SheetType */
type WorksheetType = 
/** The sheet is a grid. */
'GRID' | 
/** The sheet has no grid and instead has an object like a chart or image. */
'OBJECT' | 
/** The sheet connects with an external DataSource and shows the preview of data. */
'DATA_SOURCE';
type WorksheetDimension = 'ROWS' | 'COLUMNS';
type HyperlinkDisplayType = 'LINKED' | 'PLAIN_TEXT';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#numberformattype */
type NumberFormatType = 
/** Text formatting, e.g 1000.12 */
'TEXT' | 
/** Number formatting, e.g, 1,000.12 */
'NUMBER' | 
/** Percent formatting, e.g 10.12% */
'PERCENT' | 
/** Currency formatting, e.g $1,000.12 */
'CURRENCY' | 
/** Date formatting, e.g 9/26/2008 */
'DATE' | 
/** Time formatting, e.g 3:59:00 PM */
'TIME' | 
/** Date+Time formatting, e.g 9/26/08 15:59:00 */
'DATE_TIME' | 
/** Scientific number formatting, e.g 1.01E+03 */
'SCIENTIFIC';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#errortype */
type CellValueErrorType = 
/** Corresponds to the #ERROR! error */
'ERROR' | 
/** Corresponds to the #NULL! error. */
'NULL_VALUE' | 
/** Corresponds to the #DIV/0 error. */
'DIVIDE_BY_ZERO' | 
/** Corresponds to the #VALUE! error. */
'VALUE' | 
/** Corresponds to the #REF! error. */
'REF' | 
/** Corresponds to the #NAME? error. */
'NAME' | 
/** Corresponds to the #NUM! error. */
'NUM' | 
/** Corresponds to the #N/A error. */
'N_A' | 
/** Corresponds to the Loading... state. */
'LOADING';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#horizontalalign */
type HorizontalAlign = 'LEFT' | 'CENTER' | 'RIGHT';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#verticalalign */
type VerticalAlign = 'TOP' | 'MIDDLE' | 'BOTTOM';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#textdirection */
type TextDirection = 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#wrapstrategy */
type WrapStrategy = 'OVERFLOW_CELL' | 'LEGACY_WRAP' | 'CLIP' | 'WRAP';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#themecolortype */
type ThemeColorType = 'TEXT' | 'BACKGROUND' | 'ACCENT1' | 'ACCENT2' | 'ACCENT3' | 'ACCENT4' | 'ACCENT5' | 'ACCENT6' | 'LINK';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#recalculationinterval */
type RecalculationInterval = 'ON_CHANGE' | 'MINUTE' | 'HOUR';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#developermetadatavisibility */
type DeveloperMetadataVisibility = 
/** Document-visible metadata is accessible from any developer project with access to the document. */
'DOCUMENT'
/** Project-visible metadata is only visible to and accessible by the developer project that created the metadata. */
 | 'PROJECT';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#developermetadatalocationtype */
type DeveloperMetadataLocationType = 'ROW' | 'COLUMN' | 'SHEET' | 'SPREADSHEET';
type TextFormat = {
    foregroundColor?: Color;
    foregroundColorStyle?: ColorStyle;
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Style */
type CellBorderLineStyle = 'NONE' | 'DOTTED' | 'DASHED' | 'SOLID' | 'SOLID_MEDIUM' | 'SOLID_THICK' | 'DOUBLE';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Border */
type CellBorder = {
    style: CellBorderLineStyle;
    width: number;
    color: Color;
    colorStyle: ColorStyle;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Borders */
type CellBorders = {
    top: CellBorder;
    bottom: CellBorder;
    left: CellBorder;
    right: CellBorder;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Padding */
type CellPadding = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};
type TextRotation = {
    angle: number;
    vertical: boolean;
};
type DimensionRangeIndexes = {
    startIndex: RowOrColumnIndex;
    endIndex: RowOrColumnIndex;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#DeveloperMetadata.DeveloperMetadataLocation */
interface DeveloperMetadataLocation {
    sheetId: number;
    spreadsheet: boolean;
    dimensionRange: DimensionRange;
    locationType: DeveloperMetadataLocationType;
}
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#DeveloperMetadata.DeveloperMetadataLocation */
interface DeveloperMetadata {
    metadataId: number;
    metadataKey: string;
    metadataValue: string;
    location: DeveloperMetadataLocation;
    visibility: DeveloperMetadataVisibility;
}
interface WorksheetDimensionProperties {
    pixelSize: number;
    hiddenByUser: boolean;
    hiddenByFilter: boolean;
    /**
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#DeveloperMetadata
     */
    developerMetadata: DeveloperMetadata[];
}
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#DataSourceColumnReference */
type DataSourceColumnReference = {
    name: string;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#DataSourceColumn */
type DataSourceColumn = {
    reference: DataSourceColumnReference;
    formula: string;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#DataExecutionState */
type DataExecutionState = 
/** The data execution has not started. */
'NOT_STARTED' | 
/** The data execution has started and is running. */
'RUNNING' | 
/** The data execution has completed successfully. */
'SUCCEEDED' | 
/** The data execution has completed with errors. */
'FAILED';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#DataExecutionState */
type DataExecutionErrorCode = 
/** Default value, do not use. */
'DATA_EXECUTION_ERROR_CODE_UNSPECIFIED' | 
/** The data execution timed out. */
'TIMED_OUT' | 
/** The data execution returns more rows than the limit. */
'TOO_MANY_ROWS' | 
/** The data execution returns more columns than the limit. */
'TOO_MANY_COLUMNS' | 
/** The data execution returns more cells than the limit. */
'TOO_MANY_CELLS' | 
/** Error is received from the backend data execution engine (e.g. BigQuery). Check errorMessage for details. */
'ENGINE' | 
/** One or some of the provided data source parameters are invalid. */
'PARAMETER_INVALID' | 
/** The data execution returns an unsupported data type. */
'UNSUPPORTED_DATA_TYPE' | 
/** The data execution returns duplicate column names or aliases. */
'DUPLICATE_COLUMN_NAMES' | 
/** The data execution is interrupted. Please refresh later. */
'INTERRUPTED' | 
/** The data execution is currently in progress, can not be refreshed until it completes. */
'CONCURRENT_QUERY' | 
/** Other errors. */
'OTHER' | 
/** The data execution returns values that exceed the maximum characters allowed in a single cell. */
'TOO_MANY_CHARS_PER_CELL' | 
/** The database referenced by the data source is not found. */
'DATA_NOT_FOUND' | 
/** The user does not have access to the database referenced by the data source. */
'PERMISSION_DENIED' | 
/** The data execution returns columns with missing aliases. */
'MISSING_COLUMN_ALIAS' | 
/** The data source object does not exist. */
'OBJECT_NOT_FOUND' | 
/** The data source object is currently in error state. To force refresh, set force in RefreshDataSourceRequest . */
'OBJECT_IN_ERROR_STATE' | 
/** The data source object specification is invalid. */
'OBJECT_SPEC_INVALID';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#DataExecutionStatus */
type DataExecutionStatus = {
    'state': DataExecutionState;
    'errorCode': DataExecutionErrorCode;
    'errorMessage': string;
    'lastRefreshTime': string;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#DataSourceSheetProperties */
type DataSourceSheetProperties = {
    'dataSourceId': DataSourceId;
    'columns': DataSourceColumn[];
    'dataExecutionStatus': DataExecutionStatus;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#SpreadsheetProperties */
type SpreadsheetProperties = {
    /** title of the spreadsheet */
    title: string;
    /** locale of the spreadsheet (note - not all locales are supported) */
    locale: LocaleCode;
    /** amount of time to wait before volatile functions are recalculated */
    autoRecalc: RecalculationInterval;
    /** timezone of the sheet */
    timeZone: Timezone;
    defaultFormat: any;
    iterativeCalculationSettings: any;
    spreadsheetTheme: any;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#SheetProperties */
type WorksheetProperties = {
    'sheetId': WorksheetId;
    'title': string;
    'index': WorksheetIndex;
    'sheetType': WorksheetType;
    'gridProperties': WorksheetGridProperties;
    'hidden': boolean;
    'tabColor': Color;
    'tabColorStyle': ColorStyle;
    'rightToLeft': boolean;
    'dataSourceSheetProperties': DataSourceSheetProperties;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat */
type CellFormat = {
    /** format describing how number values should be represented to the user */
    numberFormat: NumberFormat;
    /** @deprecated use backgroundColorStyle */
    backgroundColor: Color;
    backgroundColorStyle: ColorStyle;
    borders: CellBorders;
    padding: CellPadding;
    horizontalAlignment: HorizontalAlign;
    verticalAlignment: VerticalAlign;
    wrapStrategy: WrapStrategy;
    textDirection: TextDirection;
    textFormat: TextFormat;
    hyperlinkDisplayType: HyperlinkDisplayType;
    textRotation: TextRotation;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#numberformat */
type NumberFormat = {
    type: NumberFormatType;
    /**
     * pattern string used for formatting
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#numberformat
     * */
    pattern: string;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#GridProperties */
type WorksheetGridProperties = {
    rowCount: number;
    columnCount: number;
    frozenRowCount?: number;
    frozenColumnCount?: number;
    hideGridlines?: boolean;
    rowGroupControlAfter?: boolean;
    columnGroupControlAfter?: boolean;
};
/**
 *
 * @see https://developers.google.com/sheets/api/reference/rest/v4/DimensionRange
 */
type DimensionRange = {
    sheetId: WorksheetId;
    dimension: WorksheetDimension;
    startIndex?: Integer;
    endIndex?: Integer;
};
/**
 * object describing a range in a sheet
 * see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange
 * */
type GridRange = {
    /** The sheet this range is on */
    sheetId: WorksheetId;
    /** The start row (inclusive) of the range, or not set if unbounded. */
    startRowIndex?: Integer;
    /** The end row (exclusive) of the range, or not set if unbounded. */
    endRowIndex?: Integer;
    /** The start column (inclusive) of the range, or not set if unbounded. */
    startColumnIndex?: Integer;
    /** The end column (exclusive) of the range, or not set if unbounded. */
    endColumnIndex?: Integer;
};
type GridRangeWithoutWorksheetId = Omit<GridRange, 'sheetId'>;
type GridRangeWithOptionalWorksheetId = MakeOptional<GridRange, 'sheetId'>;
type DataFilter = A1Range | GridRange;
type DataFilterWithoutWorksheetId = A1Range | GridRangeWithoutWorksheetId;
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#colorstyle */
type ColorStyle = {
    Color: Color;
} | {
    themeColor: ThemeColorType;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Color */
type Color = {
    red: number;
    green: number;
    blue: number;
    /** docs say alpha is not generally supported? */
    alpha?: number;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/ValueRenderOption */
type ValueRenderOption = 
/** Values will be calculated & formatted in the reply according to the cell's formatting. Formatting is based on the spreadsheet's locale, not the requesting user's locale. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "$1.23". */
'FORMATTED_VALUE' | 
/** Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23. */
'UNFORMATTED_VALUE' | 
/** Values will not be calculated. The reply will include the formulas. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "=A1". */
'FORMULA';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get#query-parameters */
type GetValuesRequestOptions = {
    majorDimension?: WorksheetDimension;
    valueRenderOption?: ValueRenderOption;
};
/**
 * Info about an error in a cell
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#errortype
 */
type ErrorValue = {
    type: CellValueErrorType;
    message: string;
};
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ExtendedValue */
type ExtendedValue = {
    numberValue: number;
} | {
    stringValue: string;
} | {
    boolValue: boolean;
} | {
    formulaValue: string;
} | {
    errorValue: ErrorValue;
};
type CellValueType = 'boolValue' | 'stringValue' | 'numberValue' | 'errorValue';
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells */
type CellData = {
    /** The value the user entered in the cell. e.g., 1234, 'Hello', or =NOW() Note: Dates, Times and DateTimes are represented as doubles in serial number format. */
    userEnteredValue: ExtendedValue;
    /** The effective value of the cell. For cells with formulas, this is the calculated value. For cells with literals, this is the same as the userEnteredValue. This field is read-only. */
    effectiveValue: ExtendedValue;
    /** The formatted value of the cell. This is the value as it's shown to the user. This field is read-only. */
    formattedValue: string;
    /** The format the user entered for the cell. */
    userEnteredFormat: CellFormat;
    /** The effective format being used by the cell. This includes the results of applying any conditional formatting and, if the cell contains a formula, the computed number format. If the effective format is the default format, effective format will not be written. This field is read-only. */
    effectiveFormat: CellFormat;
    /** hyperlink in the cell if any */
    hyperlink?: string;
    /** note on the cell */
    note?: string;
};
/** shape of the cell data sent back when fetching the sheet */
type CellDataRange = {
    startRow?: RowIndex;
    startColumn?: ColumnIndex;
    rowMetadata: any[];
    columnMetadata: any[];
    rowData: {
        values: any[];
    }[];
};
type AddRowOptions = {
    /** set to true to use raw mode rather than user entered */
    raw?: boolean;
    /** set to true to insert new rows in the sheet while adding this data */
    insert?: boolean;
};

/**
 * Cell error
 *
 * not a js "error" that gets thrown, but a value that holds an error code and message for a cell
 * it's useful to use a class so we can check `instanceof`

 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ErrorType
 */
declare class GoogleSpreadsheetCellErrorValue {
    /**
     * type of the error
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ErrorType
     * */
    readonly type: CellValueErrorType;
    /** A message with more information about the error (in the spreadsheet's locale) */
    readonly message: string;
    constructor(rawError: ErrorValue);
}

declare class GoogleSpreadsheetCell {
    readonly _sheet: GoogleSpreadsheetWorksheet;
    private _rowIndex;
    private _columnIndex;
    private _rawData?;
    private _draftData;
    private _error?;
    constructor(_sheet: GoogleSpreadsheetWorksheet, _rowIndex: RowIndex, _columnIndex: ColumnIndex, rawCellData: CellData);
    /**
     * update cell using raw CellData coming back from sheets API
     * @internal
     */
    _updateRawData(newData: CellData): void;
    get rowIndex(): number;
    get columnIndex(): number;
    get a1Column(): string;
    get a1Row(): number;
    get a1Address(): string;
    get value(): number | boolean | string | null | GoogleSpreadsheetCellErrorValue;
    set value(newValue: number | boolean | Date | string | null | undefined | GoogleSpreadsheetCellErrorValue);
    get valueType(): CellValueType | null;
    /** The formatted value of the cell - this is the value as it's shown to the user */
    get formattedValue(): string | null;
    get formula(): string | null;
    set formula(newValue: string | null);
    /**
     * @deprecated use `cell.errorValue` instead
     */
    get formulaError(): GoogleSpreadsheetCellErrorValue | undefined;
    /**
     * error contained in the cell, which can happen with a bad formula (maybe some other weird cases?)
     */
    get errorValue(): GoogleSpreadsheetCellErrorValue | undefined;
    get numberValue(): number | undefined;
    set numberValue(val: number | undefined);
    get boolValue(): boolean | undefined;
    set boolValue(val: boolean | undefined);
    get stringValue(): string | undefined;
    set stringValue(val: string | undefined);
    /**
     * Hyperlink contained within the cell.
     *
     * To modify, do not set directly. Instead set cell.formula, for example `cell.formula = \'=HYPERLINK("http://google.com", "Google")\'`
     */
    get hyperlink(): string | undefined;
    /** a note attached to the cell */
    get note(): string;
    set note(newVal: string | null | undefined | false);
    get userEnteredFormat(): Readonly<CellFormat | undefined>;
    get effectiveFormat(): Readonly<CellFormat | undefined>;
    private _getFormatParam;
    private _setFormatParam;
    get numberFormat(): CellFormat['numberFormat'];
    get backgroundColor(): CellFormat['backgroundColor'];
    get backgroundColorStyle(): CellFormat['backgroundColorStyle'];
    get borders(): CellFormat['borders'];
    get padding(): CellFormat['padding'];
    get horizontalAlignment(): CellFormat['horizontalAlignment'];
    get verticalAlignment(): CellFormat['verticalAlignment'];
    get wrapStrategy(): CellFormat['wrapStrategy'];
    get textDirection(): CellFormat['textDirection'];
    get textFormat(): CellFormat['textFormat'];
    get hyperlinkDisplayType(): CellFormat['hyperlinkDisplayType'];
    get textRotation(): CellFormat['textRotation'];
    set numberFormat(newVal: CellFormat['numberFormat']);
    set backgroundColor(newVal: CellFormat['backgroundColor']);
    set backgroundColorStyle(newVal: CellFormat['backgroundColorStyle']);
    set borders(newVal: CellFormat['borders']);
    set padding(newVal: CellFormat['padding']);
    set horizontalAlignment(newVal: CellFormat['horizontalAlignment']);
    set verticalAlignment(newVal: CellFormat['verticalAlignment']);
    set wrapStrategy(newVal: CellFormat['wrapStrategy']);
    set textDirection(newVal: CellFormat['textDirection']);
    set textFormat(newVal: CellFormat['textFormat']);
    set hyperlinkDisplayType(newVal: CellFormat['hyperlinkDisplayType']);
    set textRotation(newVal: CellFormat['textRotation']);
    clearAllFormatting(): void;
    get _isDirty(): boolean;
    discardUnsavedChanges(): void;
    /**
     * saves updates for single cell
     * usually it's better to make changes and call sheet.saveUpdatedCells
     * */
    save(): Promise<void>;
    /**
     * used by worksheet when saving cells
     * returns an individual batchUpdate request to update the cell
     * @internal
     */
    _getUpdateRequest(): {
        updateCells: {
            rows: {
                values: any[];
            }[];
            fields: string;
            start: {
                sheetId: number;
                rowIndex: number;
                columnIndex: number;
            };
        };
    } | null;
}

type RowCellData = string | number | boolean | Date;
type RawRowData = RowCellData[] | Record<string, RowCellData>;
declare class GoogleSpreadsheetWorksheet {
    /** parent GoogleSpreadsheet instance */
    readonly _spreadsheet: GoogleSpreadsheet;
    private _headerRowIndex;
    private _rawProperties;
    private _cells;
    private _rowMetadata;
    private _columnMetadata;
    private _headerValues;
    get headerValues(): string[];
    constructor(
    /** parent GoogleSpreadsheet instance */
    _spreadsheet: GoogleSpreadsheet, rawProperties: WorksheetProperties, rawCellData?: CellDataRange[]);
    updateRawData(properties: WorksheetProperties, rawCellData: CellDataRange[]): void;
    _makeSingleUpdateRequest(requestType: string, requestParams: any): Promise<any>;
    private _ensureInfoLoaded;
    /** clear local cache of sheet data/properties */
    resetLocalCache(
    /** set to true to clear data only, leaving sheet metadata/propeties intact */
    dataOnly?: boolean): void;
    private _fillCellData;
    private _addSheetIdToRange;
    private _getProp;
    private _setProp;
    get sheetId(): WorksheetProperties['sheetId'];
    get title(): WorksheetProperties['title'];
    get index(): WorksheetProperties['index'];
    get sheetType(): WorksheetProperties['sheetType'];
    get gridProperties(): WorksheetProperties['gridProperties'];
    get hidden(): WorksheetProperties['hidden'];
    get tabColor(): WorksheetProperties['tabColor'];
    get rightToLeft(): WorksheetProperties['rightToLeft'];
    set sheetId(newVal: WorksheetProperties['sheetId']);
    set title(newVal: WorksheetProperties['title']);
    set index(newVal: WorksheetProperties['index']);
    set sheetType(newVal: WorksheetProperties['sheetType']);
    set gridProperties(newVal: WorksheetProperties['gridProperties']);
    set hidden(newVal: WorksheetProperties['hidden']);
    set tabColor(newVal: WorksheetProperties['tabColor']);
    set rightToLeft(newVal: WorksheetProperties['rightToLeft']);
    get rowCount(): number;
    get columnCount(): number;
    get a1SheetName(): string;
    get encodedA1SheetName(): string;
    get lastColumnLetter(): string;
    get cellStats(): {
        nonEmpty: number;
        loaded: number;
        total: number;
    };
    getCellByA1(a1Address: A1Address): GoogleSpreadsheetCell;
    getCell(rowIndex: RowIndex, columnIndex: ColumnIndex): GoogleSpreadsheetCell;
    loadCells(sheetFilters?: DataFilterWithoutWorksheetId | DataFilterWithoutWorksheetId[]): Promise<void>;
    saveUpdatedCells(): Promise<void>;
    saveCells(cellsToUpdate: GoogleSpreadsheetCell[]): Promise<void>;
    _ensureHeaderRowLoaded(): Promise<void>;
    loadHeaderRow(headerRowIndex?: number): Promise<void>;
    setHeaderRow(headerValues: string[], headerRowIndex?: number): Promise<void>;
    addRows(rows: RawRowData[], options?: AddRowOptions): Promise<GoogleSpreadsheetRow<Record<string, any>>[]>;
    /** add a single row - see addRows for more info */
    addRow(rowValues: RawRowData, options?: AddRowOptions): Promise<GoogleSpreadsheetRow<Record<string, any>>>;
    private _rowCache;
    getRows<T extends Record<string, any>>(options?: {
        /** skip first N rows */
        offset?: number;
        /** limit number of rows fetched */
        limit?: number;
    }, googleSheetQueryParameters?: GetValuesRequestOptions): Promise<GoogleSpreadsheetRow<T>[]>;
    /**
     * @internal
     * Used internally to update row numbers after deleting rows.
     * Should not be called directly.
     * */
    _shiftRowCache(deletedRowNumber: number): void;
    clearRows(options?: {
        start?: number;
        end?: number;
    }): Promise<void>;
    /** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateSheetPropertiesRequest */
    updateProperties(properties: Partial<Omit<WorksheetProperties, 'sheetId'>>): Promise<any>;
    /**
     * passes through the call to updateProperties to update only the gridProperties object
     */
    updateGridProperties(gridProperties: WorksheetGridProperties): Promise<any>;
    /** resize, internally just calls updateGridProperties */
    resize(gridProperties: Pick<WorksheetGridProperties, 'rowCount' | 'columnCount'>): Promise<any>;
    /**
     *
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#updatedimensionpropertiesrequest
     */
    updateDimensionProperties(columnsOrRows: WorksheetDimension, properties: WorksheetDimensionProperties, bounds: Partial<DimensionRangeIndexes>): Promise<any>;
    getCellsInRange(a1Range: A1Range, options?: GetValuesRequestOptions): Promise<any>;
    updateNamedRange(): Promise<void>;
    addNamedRange(): Promise<void>;
    deleteNamedRange(): Promise<void>;
    repeatCell(): Promise<void>;
    autoFill(): Promise<void>;
    cutPaste(): Promise<void>;
    copyPaste(): Promise<void>;
    /**
     * Merges all cells in the range
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MergeCellsRequest
     */
    mergeCells(range: GridRangeWithOptionalWorksheetId, mergeType?: string): Promise<void>;
    /**
     * Unmerges cells in the given range
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UnmergeCellsRequest
     */
    unmergeCells(range: GridRangeWithOptionalWorksheetId): Promise<void>;
    updateBorders(): Promise<void>;
    addFilterView(): Promise<void>;
    appendCells(): Promise<void>;
    clearBasicFilter(): Promise<void>;
    deleteDimension(): Promise<void>;
    deleteEmbeddedObject(): Promise<void>;
    deleteFilterView(): Promise<void>;
    duplicateFilterView(): Promise<void>;
    /**
     * Duplicate worksheet within the document
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DuplicateSheetRequest
     */
    duplicate(options?: {
        id?: WorksheetId;
        title?: string;
        index?: number;
    }): Promise<GoogleSpreadsheetWorksheet>;
    findReplace(): Promise<void>;
    /**
     * Inserts rows or columns at a particular index
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#InsertDimensionRequest
     */
    insertDimension(columnsOrRows: WorksheetDimension, rangeIndexes: DimensionRangeIndexes, inheritFromBefore?: boolean): Promise<any>;
    insertRange(): Promise<void>;
    moveDimension(): Promise<void>;
    updateEmbeddedObjectPosition(): Promise<void>;
    pasteData(): Promise<void>;
    textToColumns(): Promise<void>;
    updateFilterView(): Promise<void>;
    deleteRange(): Promise<void>;
    appendDimension(): Promise<void>;
    addConditionalFormatRule(): Promise<void>;
    updateConditionalFormatRule(): Promise<void>;
    deleteConditionalFormatRule(): Promise<void>;
    sortRange(): Promise<void>;
    setDataValidation(): Promise<void>;
    setBasicFilter(): Promise<void>;
    addProtectedRange(): Promise<void>;
    updateProtectedRange(): Promise<void>;
    deleteProtectedRange(): Promise<void>;
    autoResizeDimensions(): Promise<void>;
    addChart(): Promise<void>;
    updateChartSpec(): Promise<void>;
    updateBanding(): Promise<void>;
    addBanding(): Promise<void>;
    deleteBanding(): Promise<void>;
    createDeveloperMetadata(): Promise<void>;
    updateDeveloperMetadata(): Promise<void>;
    deleteDeveloperMetadata(): Promise<void>;
    randomizeRange(): Promise<void>;
    addDimensionGroup(): Promise<void>;
    deleteDimensionGroup(): Promise<void>;
    updateDimensionGroup(): Promise<void>;
    trimWhitespace(): Promise<void>;
    deleteDuplicates(): Promise<void>;
    addSlicer(): Promise<void>;
    updateSlicerSpec(): Promise<void>;
    /** delete this worksheet */
    delete(): Promise<void>;
    /**
     * copies this worksheet into another document/spreadsheet
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.sheets/copyTo
     * */
    copyToSpreadsheet(destinationSpreadsheetId: SpreadsheetId): Promise<axios.AxiosResponse<any, any>>;
    /** clear data in the sheet - either the entire sheet or a specific range */
    clear(
    /** optional A1 range to clear - defaults to entire sheet  */
    a1Range?: A1Range): Promise<void>;
    /** exports worksheet as CSV file (comma-separated values) */
    downloadAsCSV(): Promise<ArrayBuffer>;
    downloadAsCSV(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
    downloadAsCSV(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
    /** exports worksheet as TSC file (tab-separated values) */
    downloadAsTSV(): Promise<ArrayBuffer>;
    downloadAsTSV(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
    downloadAsTSV(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
    /** exports worksheet as PDF */
    downloadAsPDF(): Promise<ArrayBuffer>;
    downloadAsPDF(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
    downloadAsPDF(returnStreamInsteadOfBuffer: true): Promise<ReadableStream>;
}

type PermissionRoles = 'owner' | 'writer' | 'commenter' | 'reader';
type PublicPermissionRoles = Exclude<PermissionRoles, 'owner'>;
type PublicPermissionListEntry = {
    id: 'anyoneWithLink';
    type: 'anyone';
    role: PublicPermissionRoles;
};
type UserOrGroupPermissionListEntry = {
    id: string;
    displayName: string;
    type: 'user' | 'group';
    photoLink?: string;
    emailAddress: string;
    role: PermissionRoles;
    deleted: boolean;
};
type DomainPermissionListEntry = {
    id: string;
    displayName: string;
    type: 'domain';
    domain: string;
    role: PublicPermissionRoles;
    photoLink?: string;
};
type PermissionsList = (PublicPermissionListEntry | UserOrGroupPermissionListEntry | DomainPermissionListEntry)[];

/** single type to handle all valid auth types */
type GoogleApiAuth = {
    getRequestHeaders: () => Promise<Headers>;
} | {
    apiKey: string;
} | {
    token: string;
};
declare enum AUTH_MODES {
    GOOGLE_AUTH_CLIENT = "google_auth",
    RAW_ACCESS_TOKEN = "raw_access_token",
    API_KEY = "api_key"
}

declare const EXPORT_CONFIG: Record<string, {
    singleWorksheet?: boolean;
}>;
type ExportFileTypes = keyof typeof EXPORT_CONFIG;
/**
 * Google Sheets document
 *
 * @description
 * **This class represents an entire google spreadsheet document**
 * Provides methods to interact with document metadata/settings, formatting, manage sheets, and acts as the main gateway to interacting with sheets and data that the document contains.q
 *
 */
declare class GoogleSpreadsheet {
    readonly spreadsheetId: string;
    auth: GoogleApiAuth;
    get authMode(): AUTH_MODES;
    private _rawSheets;
    private _rawProperties;
    private _spreadsheetUrl;
    private _deleted;
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
    auth: GoogleApiAuth);
    /** @internal */
    _setAxiosRequestAuth(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig<any>>;
    /** @internal */
    _handleAxiosResponse(response: AxiosResponse): Promise<AxiosResponse<any, any>>;
    /** @internal */
    _handleAxiosErrors(error: AxiosError): Promise<void>;
    /** @internal */
    _makeSingleUpdateRequest(requestType: string, requestParams: any): Promise<any>;
    /** @internal */
    _makeBatchUpdateRequest(requests: any[], responseRanges?: string | string[]): Promise<void>;
    /** @internal */
    _ensureInfoLoaded(): void;
    /** @internal */
    _updateRawProperties(newProperties: SpreadsheetProperties): void;
    /** @internal */
    _updateOrCreateSheet(sheetInfo: {
        properties: WorksheetProperties;
        data: any;
    }): void;
    _getProp(param: keyof SpreadsheetProperties): any;
    get title(): SpreadsheetProperties['title'];
    get locale(): SpreadsheetProperties['locale'];
    get timeZone(): SpreadsheetProperties['timeZone'];
    get autoRecalc(): SpreadsheetProperties['autoRecalc'];
    get defaultFormat(): SpreadsheetProperties['defaultFormat'];
    get spreadsheetTheme(): SpreadsheetProperties['spreadsheetTheme'];
    get iterativeCalculationSettings(): SpreadsheetProperties['iterativeCalculationSettings'];
    /**
     * update spreadsheet properties
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#SpreadsheetProperties
     * */
    updateProperties(properties: Partial<SpreadsheetProperties>): Promise<void>;
    loadInfo(includeCells?: boolean): Promise<void>;
    resetLocalCache(): void;
    get sheetCount(): number;
    get sheetsById(): Record<WorksheetId, GoogleSpreadsheetWorksheet>;
    get sheetsByIndex(): GoogleSpreadsheetWorksheet[];
    get sheetsByTitle(): Record<string, GoogleSpreadsheetWorksheet>;
    /**
     * Add new worksheet to document
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddSheetRequest
     * */
    addSheet(properties?: Partial<RecursivePartial<WorksheetProperties> & {
        headerValues: string[];
        headerRowIndex: number;
    }>): Promise<GoogleSpreadsheetWorksheet>;
    /**
     * delete a worksheet
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteSheetRequest
     * */
    deleteSheet(sheetId: WorksheetId): Promise<void>;
    /**
     * create a new named range
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddNamedRangeRequest
     */
    addNamedRange(
    /** name of new named range */
    name: string, 
    /** GridRange object describing range */
    range: GridRange, 
    /** id for named range (optional) */
    namedRangeId?: string): Promise<any>;
    /**
     * delete a named range
     * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteNamedRangeRequest
     * */
    deleteNamedRange(
    /** id of named range to delete */
    namedRangeId: NamedRangeId): Promise<any>;
    /** fetch cell data into local cache */
    loadCells(
    /**
     * single filter or array of filters
     * strings are treated as A1 ranges, objects are treated as GridRange objects
     * pass nothing to fetch all cells
     * */
    filters?: DataFilter | DataFilter[]): Promise<void>;
    /**
     * export/download helper, not meant to be called directly (use downloadAsX methods on spreadsheet and worksheet instead)
     * @internal
     */
    _downloadAs(fileType: ExportFileTypes, worksheetId: WorksheetId | undefined, returnStreamInsteadOfBuffer?: boolean): Promise<any>;
    /**
     * exports entire document as html file (zipped)
     * @topic export
     * */
    downloadAsZippedHTML(): Promise<ArrayBuffer>;
    downloadAsZippedHTML(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
    downloadAsZippedHTML(returnStreamInsteadOfBuffer: true): Promise<Stream>;
    /**
     * @deprecated
     * use `doc.downloadAsZippedHTML()` instead
     * */
    downloadAsHTML(returnStreamInsteadOfBuffer?: boolean): Promise<any>;
    /**
     * exports entire document as xlsx spreadsheet (Microsoft Office Excel)
     * @topic export
     * */
    downloadAsXLSX(): Promise<ArrayBuffer>;
    downloadAsXLSX(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
    downloadAsXLSX(returnStreamInsteadOfBuffer: true): Promise<Stream>;
    /**
     * exports entire document as ods spreadsheet (Open Office)
     * @topic export
    */
    downloadAsODS(): Promise<ArrayBuffer>;
    downloadAsODS(returnStreamInsteadOfBuffer: false): Promise<ArrayBuffer>;
    downloadAsODS(returnStreamInsteadOfBuffer: true): Promise<Stream>;
    delete(): Promise<any>;
    /**
     * list all permissions entries for doc
     */
    listPermissions(): Promise<PermissionsList>;
    setPublicAccessLevel(role: PublicPermissionRoles | false): Promise<void>;
    /** share document to email or domain */
    share(emailAddressOrDomain: string, opts?: {
        /** set role level, defaults to owner */
        role?: PermissionRoles;
        /** set to true if email is for a group */
        isGroup?: boolean;
        /** set to string to include a custom message, set to false to skip sending a notification altogether */
        emailMessage?: string | false;
    }): Promise<any>;
    static createNewSpreadsheetDocument(auth: GoogleApiAuth, properties?: Partial<SpreadsheetProperties>): Promise<GoogleSpreadsheet>;
}

export { GoogleSpreadsheet, GoogleSpreadsheetCell, GoogleSpreadsheetCellErrorValue, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet };
