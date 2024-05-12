/* eslint-disable @typescript-eslint/no-unused-vars */

import { MakeOptional } from './util-types';

// some basic types which are just aliases, but they make the code a bit clearer
export type Integer = number;

export type SpreadsheetId = string;
export type WorksheetId = number;
export type DataSourceId = string;

export type WorksheetIndex = number;
export type RowOrColumnIndex = number;
export type RowIndex = number;
export type ColumnIndex = number;
export type A1Address = string;
export type ColumnAddress = string;
export type A1Range = string;

export type NamedRangeId = string;



/**
 * ISO language code
 * @example en
 * @example en_US
 * */
export type LocaleCode = string;
/**
 * timezone code, if not recognized, may be a custom time zone such as `GMT-07:00`
 * @example America/New_York
 * */
export type Timezone = string;

// ENUMS ///////////////////////////////////////////////////////////////////////////////////////////////////

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#SheetType */
export type WorksheetType =
  /** The sheet is a grid. */
  'GRID' |
  /** The sheet has no grid and instead has an object like a chart or image. */
  'OBJECT' |
  /** The sheet connects with an external DataSource and shows the preview of data. */
  'DATA_SOURCE';

export type WorksheetDimension = 'ROWS' | 'COLUMNS';

export type HyperlinkDisplayType = 'LINKED' | 'PLAIN_TEXT';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#numberformattype */
export type NumberFormatType =
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
export type CellValueErrorType =
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
export type HorizontalAlign = 'LEFT' | 'CENTER' | 'RIGHT';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#verticalalign */
export type VerticalAlign = 'TOP' | 'MIDDLE' | 'BOTTOM';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#textdirection */
export type TextDirection = 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#wrapstrategy */
export type WrapStrategy = 'OVERFLOW_CELL' | 'LEGACY_WRAP' | 'CLIP' | 'WRAP';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#themecolortype */
export type ThemeColorType = 'TEXT' | 'BACKGROUND' | 'ACCENT1' | 'ACCENT2' | 'ACCENT3' | 'ACCENT4' | 'ACCENT5' | 'ACCENT6' | 'LINK';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#recalculationinterval */
export type RecalculationInterval = 'ON_CHANGE' | 'MINUTE' | 'HOUR';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#developermetadatavisibility */
export type DeveloperMetadataVisibility =
  /** Document-visible metadata is accessible from any developer project with access to the document. */
  | 'DOCUMENT'
  /** Project-visible metadata is only visible to and accessible by the developer project that created the metadata. */
  | 'PROJECT';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#developermetadatalocationtype */
export type DeveloperMetadataLocationType = 'ROW' | 'COLUMN' | 'SHEET' | 'SPREADSHEET';



// formatting types
export type TextFormat = {
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
export type CellBorderLineStyle = 'NONE' | 'DOTTED' | 'DASHED' | 'SOLID' | 'SOLID_MEDIUM' | 'SOLID_THICK' | 'DOUBLE';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Border */
export type CellBorder = {
  style: CellBorderLineStyle;
  width: number;
  color: Color;
  colorStyle: ColorStyle;
};

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Borders */
export type CellBorders = {
  top: CellBorder;
  bottom: CellBorder;
  left: CellBorder;
  right: CellBorder;
};

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Padding */
export type CellPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type TextRotation = {
  angle: number;
  vertical: boolean;
};

export type ThemeColorPair = {
  color: ColorStyle;
  colorType: ThemeColorType;
};

export type SpreadsheetTheme = {
  primaryFontFamily: string;
  themeColors: ThemeColorPair[];
};

// ---------------------------------

export type PaginationOptions = {
  limit: number;
  offset: number;
};

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#iterativecalculationsettings
 */
export type IterativeCalculationSetting = {
  maxIterations: number;
  convergenceThreshold: number;
};


export type DimensionRangeIndexes = {
  startIndex: RowOrColumnIndex;
  endIndex: RowOrColumnIndex;
};


/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#DeveloperMetadata.DeveloperMetadataLocation */
export interface DeveloperMetadataLocation {
  sheetId: number;
  spreadsheet: boolean;
  dimensionRange: DimensionRange;
  locationType: DeveloperMetadataLocationType;
}

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata#DeveloperMetadata.DeveloperMetadataLocation */
export interface DeveloperMetadata {
  metadataId: number;
  metadataKey: string;
  metadataValue: string;
  location: DeveloperMetadataLocation;
  visibility: DeveloperMetadataVisibility;
}

export interface WorksheetDimensionProperties {
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
  reference: DataSourceColumnReference,
  formula: string
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
  'state': DataExecutionState,
  'errorCode': DataExecutionErrorCode,
  'errorMessage': string,
  'lastRefreshTime': string
};

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#DataSourceSheetProperties */
export type DataSourceSheetProperties = {
  'dataSourceId': DataSourceId
  'columns': DataSourceColumn[],
  'dataExecutionStatus': DataExecutionStatus,
};


// Spreadsheet types /////////////////////

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#SpreadsheetProperties */
export type SpreadsheetProperties = {
  /** title of the spreadsheet */
  title: string,
  /** locale of the spreadsheet (note - not all locales are supported) */
  locale: LocaleCode,
  /** amount of time to wait before volatile functions are recalculated */
  autoRecalc: RecalculationInterval,
  /** timezone of the sheet */
  timeZone: Timezone;

  // TODO
  defaultFormat: any
  iterativeCalculationSettings: any,
  spreadsheetTheme: any
};



/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#SheetProperties */
export type WorksheetProperties = {
  'sheetId': WorksheetId,
  'title': string,
  'index': WorksheetIndex,
  'sheetType': WorksheetType,
  'gridProperties': WorksheetGridProperties,
  'hidden': boolean,
  'tabColor': Color,
  'tabColorStyle': ColorStyle,
  'rightToLeft': boolean,
  'dataSourceSheetProperties': DataSourceSheetProperties
};
export type WorksheetPropertiesPartial = {

};

// Spreadsheet Cell types ///////////////////
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat */
export type CellFormat = {
  /** format describing how number values should be represented to the user */
  numberFormat: NumberFormat,
  /** @deprecated use backgroundColorStyle */
  backgroundColor: Color,
  backgroundColorStyle: ColorStyle,
  borders: CellBorders,
  padding: CellPadding,
  horizontalAlignment: HorizontalAlign,
  verticalAlignment: VerticalAlign,
  wrapStrategy: WrapStrategy,
  textDirection: TextDirection,
  textFormat: TextFormat
  hyperlinkDisplayType: HyperlinkDisplayType,
  textRotation: TextRotation,
};


/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#numberformat */
export type NumberFormat = {
  type: NumberFormatType;
  /**
   * pattern string used for formatting
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#numberformat
   * */
  pattern: string;
};

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#GridProperties */
export type WorksheetGridProperties = {
  rowCount: number;
  columnCount: number;
  frozenRowCount?: number;
  frozenColumnCount?: number;
  hideGridlines?: boolean;
  rowGroupControlAfter?: boolean;
  columnGroupControlAfter?: boolean;
};

//

/**
 *
 * @see https://developers.google.com/sheets/api/reference/rest/v4/DimensionRange
 */
export type DimensionRange = {
  sheetId: WorksheetId,
  dimension: WorksheetDimension,
  startIndex?: Integer,
  endIndex?: Integer,
};
export type DimensionRangeWithoutWorksheetId = Omit<DimensionRange, 'sheetId'>;

/**
 * object describing a range in a sheet
 * see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange
 * */
export type GridRange = {
  /** The sheet this range is on */
  sheetId: WorksheetId,
  /** The start row (inclusive) of the range, or not set if unbounded. */
  startRowIndex?: Integer,
  /** The end row (exclusive) of the range, or not set if unbounded. */
  endRowIndex?: Integer,
  /** The start column (inclusive) of the range, or not set if unbounded. */
  startColumnIndex?: Integer,
  /** The end column (exclusive) of the range, or not set if unbounded. */
  endColumnIndex?: Integer
};
export type GridRangeWithoutWorksheetId = Omit<GridRange, 'sheetId'>;
export type GridRangeWithOptionalWorksheetId = MakeOptional<GridRange, 'sheetId'>;
export type DataFilter = A1Range | GridRange;
export type DataFilterWithoutWorksheetId = A1Range | GridRangeWithoutWorksheetId;


/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#colorstyle */
export type ColorStyle = { rgbColor: Color } | { themeColor: ThemeColorType };
/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Color */
export type Color = {
  red: number,
  green: number,
  blue: number,
  /** docs say alpha is not generally supported? */
  alpha?: number
};


/** @see https://developers.google.com/sheets/api/reference/rest/v4/ValueRenderOption */
type ValueRenderOption =
/** Values will be calculated & formatted in the reply according to the cell's formatting. Formatting is based on the spreadsheet's locale, not the requesting user's locale. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "$1.23". */
'FORMATTED_VALUE' |
/** Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23. */
'UNFORMATTED_VALUE' |
/** Values will not be calculated. The reply will include the formulas. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "=A1". */
'FORMULA';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/DateTimeRenderOption */
type DateTimeRenderOption =
/** Instructs date, time, datetime, and duration fields to be output as doubles in "serial number" format, as popularized by Lotus 1-2-3. The whole number portion of the value (left of the decimal) counts the days since December 30th 1899. The fractional portion (right of the decimal) counts the time as a fraction of the day. For example, January 1st 1900 at noon would be 2.5, 2 because it's 2 days after December 30th 1899, and .5 because noon is half a day. February 1st 1900 at 3pm would be 33.625. This correctly treats the year 1900 as not a leap year. */
'SERIAL_NUMBER' |
/** Instructs date, time, datetime, and duration fields to be output as strings in their given number format (which depends on the spreadsheet locale). */
'FORMATTED_STRING';

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get#query-parameters */
export type GetValuesRequestOptions = {
  majorDimension?: WorksheetDimension,
  valueRenderOption?: ValueRenderOption
};




/**
 * Info about an error in a cell
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#errortype
 */
export type ErrorValue = {
  type: CellValueErrorType,
  message: string
};

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ExtendedValue */
export type ExtendedValue =
  { numberValue: number } |
  { stringValue: string } |
  { boolValue: boolean } |
  { formulaValue: string } |
  { errorValue: ErrorValue };
export type CellValueType = 'boolValue' | 'stringValue' | 'numberValue' | 'errorValue';

//------------------------------------

/** @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells */
export type CellData = {
  /** The value the user entered in the cell. e.g., 1234, 'Hello', or =NOW() Note: Dates, Times and DateTimes are represented as doubles in serial number format. */
  userEnteredValue: ExtendedValue,
  /** The effective value of the cell. For cells with formulas, this is the calculated value. For cells with literals, this is the same as the userEnteredValue. This field is read-only. */
  effectiveValue: ExtendedValue,
  /** The formatted value of the cell. This is the value as it's shown to the user. This field is read-only. */
  formattedValue: string,

  /** The format the user entered for the cell. */
  userEnteredFormat: CellFormat,
  /** The effective format being used by the cell. This includes the results of applying any conditional formatting and, if the cell contains a formula, the computed number format. If the effective format is the default format, effective format will not be written. This field is read-only. */
  effectiveFormat: CellFormat,
  /** hyperlink in the cell if any */
  hyperlink?: string,
  /** note on the cell */
  note?: string,
  // textFormatRuns: [
  //   {
  //     object (TextFormatRun)
  //   }
  // ],
  // dataValidation: {
  //   object (DataValidationRule)
  // },
  // pivotTable: {
  //   object (PivotTable)
  // },
  // dataSourceTable: {
  //   object (DataSourceTable)
  // },
  // dataSourceFormula: {
  //   object (DataSourceFormula)
  // }
};

/** shape of the cell data sent back when fetching the sheet */
export type CellDataRange = {
  startRow?: RowIndex,
  startColumn?: ColumnIndex,
  // TODO: fix these types
  rowMetadata: any[],
  columnMetadata: any[],
  rowData: {
    values: any[]
  }[]
};

export type AddRowOptions = {

  /** set to true to use raw mode rather than user entered */
  raw?: boolean,
  /** set to true to insert new rows in the sheet while adding this data */
  insert?: boolean,
};

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ConditionType
 */
export type ConditionType =
  | 'NUMBER_GREATER'
  | 'NUMBER_GREATER_THAN_EQ'
  | 'NUMBER_LESS'
  | 'NUMBER_LESS_THAN_EQ'
  | 'NUMBER_EQ'
  | 'NUMBER_NOT_EQ'
  | 'NUMBER_BETWEEN'
  | 'NUMBER_NOT_BETWEEN'
  | 'TEXT_CONTAINS'
  | 'TEXT_NOT_CONTAINS'
  | 'TEXT_STARTS_WITH'
  | 'TEXT_ENDS_WITH'
  | 'TEXT_EQ'
  | 'TEXT_IS_EMAIL'
  | 'TEXT_IS_URL'
  | 'DATE_EQ'
  | 'DATE_BEFORE'
  | 'DATE_AFTER'
  | 'DATE_ON_OR_BEFORE'
  | 'DATE_ON_OR_AFTER'
  | 'DATE_BETWEEN'
  | 'DATE_NOT_BETWEEN'
  | 'DATE_IS_VALID'
  | 'ONE_OF_RANGE'
  | 'ONE_OF_LIST'
  | 'BLANK'
  | 'NOT_BLANK'
  | 'CUSTOM_FORMULA'
  | 'BOOLEAN'
  | 'TEXT_NOT_EQ'
  | 'DATE_NOT_EQ'
  | 'FILTER_EXPRESSION';

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#relativedate
 */
export type RelativeDate =
  | 'PAST_YEAR'
  | 'PAST_MONTH'
  | 'PAST_WEEK'
  | 'YESTERDAY'
  | 'TODAY'
  | 'TOMORROW';

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ConditionValue
 */
export type ConditionValue =
  | { relativeDate: RelativeDate, userEnteredValue?: undefined }
  | { relativeDate?: undefined, userEnteredValue: string };

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#BooleanCondition
 */
export type BooleanCondition = {
  /** The type of condition. */
  type: ConditionType;
  /**
   * The values of the condition.
   * The number of supported values depends on the condition type. Some support zero values, others one or two values, and ConditionType.ONE_OF_LIST supports an arbitrary number of values.
   */
  values: ConditionValue[];
};

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#DataValidationRule
 *
 * example:
 * - https://stackoverflow.com/a/43442775/3068233
 */
export type DataValidationRule = {
  /** The condition that data in the cell must match. */
  condition: BooleanCondition;
  /** A message to show the user when adding data to the cell. */
  inputMessage?: string;
  /** True if invalid data should be rejected. */
  strict: boolean;
  /** True if the UI should be customized based on the kind of condition. If true, "List" conditions will show a dropdown. */
  showCustomUi: boolean;
};
