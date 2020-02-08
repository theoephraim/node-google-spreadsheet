declare module 'google-spreadsheet' {
  // #region API definitions
  interface Border {
    style: Style
    width: number
    color: Color
    colorStyle: ColorStyle
  }

  interface Borders extends Record<direction, Border> {}
  
  interface CellFormat {
    numberFormat: numberFormat
    backgroundColor: Color
    backgroundColorStyle: ColorStyle
    borders: Borders
    padding: Padding
    horizontalAlignment: HorizontalAlign
    verticalAlignment: VerticalAlign
    wrapStrategy: WrapStrategy
    textDirection: TextDirection
    textFormat: TextFormat
    hyperlinkDisplayType: HyperlinkDisplayType
    textRotation: TextRotation
  }

  interface Color extends Record<'red' | 'green' | 'blue' | 'alpha', number> {}


  interface ColorStyle {
    rgbColor: Color
    themeColor: ThemeColorType
  }

  type direction = 'top' | 'bottom' | 'left' | 'right'

  interface GridRange extends Record<'sheetId' | 'startRowIndex' | 'endRowIndex' | 'startColumnIndex' |'endColumnIndex', number> {}

  enum HorizontalAlign {
    HORIZONTAL_ALIGN_UNSPECIFIED,
    LEFT,
    CENTER,
    RIGHT
  }

  enum HyperlinkDisplayType {
    HYPERLINK_DISPLAY_TYPE_UNSPECIFIED,
    LINKED,
    PLAIN_TEXT
  }

  interface IterativeCalculationSettings {
    maxIterations: number
    convergenceThreshold: number
  }

  interface numberFormat {
    type: NumberFormatType
    pattern: string
  }

  enum NumberFormatType {
    NUMBER_FORMAT_TYPE_UNSPECIFIED,
    TEXT,
    NUMBER,
    PERCENT,
    CURRENCY,
    DATE,
    TIME,
    DATE_TIME,
    SCIENTIFIC
  }

  interface Padding extends Record<direction, number> {}

  enum RecalculationInterval {
    RECALCULATION_INTERVAL_UNSPECIFIED,
    ON_CHANGE,
    MINUTE,
    HOUR
  }

  interface SpreadsheetTheme {
    primaryFontFamily: string
    themeColors: ThemeColorPair[]
  }

  enum Style {
    STYLE_UNSPECIFIED,
    DOTTED,
    DASHED,
    SOLID,
    SOLID_MEDIUM,
    SOLID_THICK,
    NONE,
    DOUBLE
  }

  enum TextDirection {
    TEXT_DIRECTION_UNSPECIFIED,
    LEFT_TO_RIGHT,
    RIGHT_TO_LEFT
  }

  interface TextFormat {
    foregroundColor: Color
    foregroundColorStyle: ColorStyle
    fontFamily: string
    fontSize: number
    bold: boolean
    italic: boolean
    strikethrough: boolean
    underline: boolean
  }

  interface TextRotation {
    angle: number
    vertical: boolean
  }

  interface ThemeColorPair {
    colorType: ThemeColorType
    color: ColorStyle
  }

  enum ThemeColorType {
    THEME_COLOR_TYPE_UNSPECIFIED,
    TEXT,
    BACKGROUND,
    ACCENT1,
    ACCENT2,
    ACCENT3,
    ACCENT4,
    ACCENT5,
    ACCENT6,
    LINK
  }

  enum VerticalAlign {
    VERTICAL_ALIGN_UNSPECIFIED,
    TOP,
    MIDDLE,
    BOTTOM
  }

  enum WrapStrategy {
    WRAP_STRATEGY_UNSPECIFIED,
    OVERFLOW_CELL,
    LEGACY_WRAP,
    CLIP,
    WRAP
  }
  //#endregion
  interface GoogleSpreadsheetBase {
    title?: string
    locale?: string
    timeZone?: string
    autoRecalc?: RecalculationInterval
    defaultFormat?: CellFormat
    spreadsheetTheme?: SpreadsheetTheme
    iterativeCalculationSettings?: IterativeCalculationSettings
  }
  export class GoogleSpreadsheet implements GoogleSpreadsheetBase {
    // Basic Document Properties
    spreadsheetId: string
    title: string
    locale: string
    timeZone: string
    autoRecalc: RecalculationInterval
    defaultFormat: CellFormat
    spreadsheetTheme: SpreadsheetTheme
    iterativeCalculationSettings: IterativeCalculationSettings

    // Worksheets
    sheetsById: Record<string, GoogleSpreadsheetWorksheet>
    sheetsByIndex: GoogleSpreadsheetWorksheet[]
    sheetCount: number

    constructor(spreadsheetId: string)

    // Authentication
    useServiceAccountAuth(creds: {
      client_email: string
      private_key: string
    }): Promise<void>
    useApiKey(key: string): Promise<void>

    // Basic info
    loadInfo(): Promise<void>
    updateProperties(props: GoogleSpreadsheetBase): Promise<void>
    resetLocalCache(): void

    // Managing Sheets
    addSheet(props?: {
      sheetId?: number
      headerValues?: string[]
      props?: GoogleSpreadsheetWorksheetBase
    }): Promise<GoogleSpreadsheetWorksheet>
    deleteSheet(sheetId: string): Promise<void>

    // Named Ranges
    addNamedRange(name: string, range: string | GridRange, rangeId?: string): Promise<any>
    deleteNamedRange(rangeId: string): Promise<any>

    // "Private" methods (not documented)
    private renewJwtAuth(): Promise<void>
    private _setAxiosRequestAuth<T>(config: T): Promise<T>
    private _handleAxiosResponse<T>(response: T): Promise<T>
    private _handleAxiosErrors(error): Promise<void>
    private _makeSingleUpdateRequest(requestType, requestParams): Promise<any>
    private _makeBatchUpdateRequest(requests, responseRanges): Promise<void>
    private _ensureInfoLoaded(): void
    private _updateRawProperties(newProperties): void
    private _updateOrCreateSheet({ properties, data }): void
    private _getProp(param)
    private _setProp(param, newVal): never
    private loadCells(filters): Promise<void>
  }
}