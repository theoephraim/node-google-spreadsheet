declare module 'google-spreadsheet' {
  // #region API definitions
  interface Border {
    style: Style
    width: number
    color: Color
    colorStyle: ColorStyle
  }

  interface Borders extends Record<direction, Border> { }

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

  interface Color extends Record<'red' | 'green' | 'blue' | 'alpha', number> { }


  interface ColorStyle {
    rgbColor: Color
    themeColor: ThemeColorType
  }

  interface DeveloperMetadata {
    metadataId: number
    metadataKey: string
    metadataValue: string
    location: DeveloperMetadataLocation
    visibility: DeveloperMetadataVisibility
  }

  interface DeveloperMetadataLocation {
    locationType: DeveloperMetadataLocationType
    spreadsheet: boolean
    sheetId: number
    dimensionRange: DimensionRange
  }

  enum DeveloperMetadataLocationType {
    DEVELOPER_METADATA_LOCATION_TYPE_UNSPECIFIED,
    ROW,
    COLUMN,
    SHEET,
    SPREADSHEET
  }

  enum DeveloperMetadataVisibility {
    DEVELOPER_METADATA_VISIBILITY_UNSPECIFIED,
    DOCUMENT,
    PROJECT
  }

  enum Dimension {
    DIMENSION_UNSPECIFIED,
    ROWS,
    COLUMNS
  }

  interface DimensionProperties {
    hiddenByFilter: boolean
    hiddenByUser: boolean
    pixelSize: number
    developerMetadata: DeveloperMetadata[]
  }

  interface DimensionRange {
    sheetId: number
    dimension: Dimension
    startIndex: number
    endIndex: number
  }

  type direction = 'top' | 'bottom' | 'left' | 'right'

  interface GridProperties {
    rowCount: number
    columnCount: number
    frozenRowCount: number
    frozenColumnCount: number
    hideGridlines: boolean
    rowGroupControlAfter: boolean
    columnGroupControlAfter: boolean
  }

  interface GridRange extends Record<'sheetId' | 'startRowIndex' | 'endRowIndex' | 'startColumnIndex' | 'endColumnIndex', number> { }

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

  interface Padding extends Record<direction, number> { }

  enum RecalculationInterval {
    RECALCULATION_INTERVAL_UNSPECIFIED,
    ON_CHANGE,
    MINUTE,
    HOUR
  }

  enum SheetType {
    SHEET_TYPE_UNSPECIFIED,
    GRID,
    OBJECT
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
    readonly spreadsheetId: string
    readonly title: string
    readonly locale: string
    readonly timeZone: string
    readonly autoRecalc: RecalculationInterval
    readonly defaultFormat: CellFormat
    readonly spreadsheetTheme: SpreadsheetTheme
    readonly iterativeCalculationSettings: IterativeCalculationSettings

    // Worksheets
    readonly sheetsById: Record<string, GoogleSpreadsheetWorksheet>
    readonly sheetsByIndex: GoogleSpreadsheetWorksheet[]
    readonly sheetCount: number

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

  interface GoogleSpreadsheetWorksheetBase {
    title?: string
    index?: number
    gridProperties?: GridProperties
    hidden?: boolean
    tabColor?: Color
    rightToLeft?: boolean
  }
  export class GoogleSpreadsheetWorksheet implements GoogleSpreadsheetWorksheetBase {
    // Basic sheet properties
    readonly sheetId: string
    readonly sheetType: SheetType
    readonly title: string
    readonly index: number
    readonly gridProperties: GridProperties
    readonly hidden: boolean
    readonly tabColor: Color
    readonly rightToLeft: boolean

    // Sheet Dimensions & Stats
    readonly rowCount: number
    readonly columnCount: number
    readonly cellStats: {
      total: number
      nonEmpty: number
      loaded: number
    }

    constructor(parentSpreadsheet: GoogleSpreadsheet, { properties, data })

    // Working With Rows
    loadHeaderRow(): Promise<void>
    setHeaderRow(headerValues: string[]): Promise<void>
    addRow(values: object): Promise<GoogleSpreadsheetRow>
    getRows(options?: {
      offset?: number
      limit?: number
    }): Promise<GoogleSpreadsheetRow[]>

    // Working With Cells
    loadCells(filters?: any): Promise<any>
    getCell(rowIndex: number, columnIndex: number): GoogleSpreadsheetCell
    getCellByA1(a1Address: string): GoogleSpreadsheetCell
    saveUpdatedCells(): Promise<void>
    saveCells(cells: GoogleSpreadsheetCell[]): Promise<void>
    resetLocalCache(dataOnly?: boolean): void

    // Updating Sheet Properties
    updateProperties(props: GoogleSpreadsheetWorksheetBase): Promise<any>
    resize(props: GoogleSpreadsheetWorksheetBase['gridProperties']): Promise<any>
    updateGridProperties(props: GoogleSpreadsheetWorksheetBase['gridProperties']): Promise<any>
    updateDimensionProperties(columnsOrRows: 'COLUMNS' | 'ROWS', props: DimensionProperties, bounds?: {
      startIndex?: number
      endIndex?: number
    }): Promise<any>

    // Other
    clear(): Promise<void>
    delete(): Promise<void>
    del(): Promise<void>
    copyToSpreadsheet(destinationSpreadsheetId: string): Promise<any>

    // "Private" methods (undocumented)
    private _makeSingleUpdateRequest(requestType, requestParams): Promise<any>
    private _ensureInfoLoaded(): void
    private _fillCellData(dataRanges): void
    private _getProp(param)
    private _setProp(param, newVal): never
    private getCellsInRange(a1Range, options): Promise<any>
    private updateNamedRange(): Promise<void>
    private addNamedRange(): Promise<void>
    private deleteNamedRange(): Promise<void>
    private repeatCell(): Promise<void>
    private autoFill(): Promise<void>
    private cutPaste(): Promise<void>
    private copyPaste(): Promise<void>
    private mergeCells(): Promise<void>
    private unmergeCells(): Promise<void>
    private updateBorders(): Promise<void>
    private addFilterView(): Promise<void>
    private appendCells(): Promise<void>
    private clearBasicFilter(): Promise<void>
    private deleteDimension(): Promise<void>
    private deleteEmbeddedObject(): Promise<void>
    private deleteFilterView(): Promise<void>
    private duplicateFilterView(): Promise<void>
    private duplicateSheet(): Promise<void>
    private findReplace(): Promise<void>
    private insertDimension(): Promise<void>
    private insertRange(): Promise<void>
    private moveDimension(): Promise<void>
    private updateEmbeddedObjectPosition(): Promise<void>
    private pasteData(): Promise<void>
    private textToColumns(): Promise<void>
    private updateFilterView(): Promise<void>
    private deleteRange(): Promise<void>
    private appendDimension(): Promise<void>
    private addConditionalFormatRule(): Promise<void>
    private updateConditionalFormatRule(): Promise<void>
    private deleteConditionalFormatRule(): Promise<void>
    private sortRange(): Promise<void>
    private setDataValidation(): Promise<void>
    private setBasicFilter(): Promise<void>
    private addProtectedRange(): Promise<void>
    private updateProtectedRange(): Promise<void>
    private deleteProtectedRange(): Promise<void>
    private autoResizeDimensions(): Promise<void>
    private addChart(): Promise<void>
    private updateChartSpec(): Promise<void>
    private updateBanding(): Promise<void>
    private addBanding(): Promise<void>
    private deleteBanding(): Promise<void>
    private createDeveloperMetadata(): Promise<void>
    private updateDeveloperMetadata(): Promise<void>
    private deleteDeveloperMetadata(): Promise<void>
    private randomizeRange(): Promise<void>
    private addDimensionGroup(): Promise<void>
    private deleteDimensionGroup(): Promise<void>
    private updateDimensionGroup(): Promise<void>
    private trimWhitespace(): Promise<void>
    private deleteDuplicates(): Promise<void>
    private addSlicer(): Promise<void>
    private updateSlicerSpec(): Promise<void>
  }

  export class GoogleSpreadsheetCell {
    // Cell Location
    readonly rowIndex: number
    readonly columnIndex: number
    readonly a1Row: number
    readonly a1Column: string
    readonly a1Address: string

    // Cell Value(s)
    value: any
    readonly valueType: string
    readonly formattedValue: any
    formula: string
    readonly formulaError: Error
    note: string
    readonly hyperlink: string

    // Cell Formatting
    readonly userEnteredFormat: CellFormat
    readonly effectiveFormat: CellFormat
    numberFormat: numberFormat
    backgroundColor: Color
    borders: Borders
    padding: Padding
    horizontalAlignment: HorizontalAlign
    verticalAlignment: VerticalAlign
    wrapStrategy: WrapStrategy
    textDirection: TextDirection
    textFormat: TextFormat
    hyperlinkDisplayType: HyperlinkDisplayType
    textRotation: TextRotation

    constructor(parentSheet: GoogleSpreadsheetWorksheet, rowIndex: number, columnIndex: number, cellData?: object)

    // Methods
    clearAllFormatting(): void
    discardUnsavedChanges(): void
    save(): Promise<void>

    // "Private" methods (undocumented)
    private _updateRawData(newData): void
    private _getFormatParam(param)
    private _setFormatParam(param, newVal): void
    private readonly _isDirty: boolean
    private _getUpdateRequest(): object
  }

  export class GoogleSpreadsheetRow implements Record<string, any> {
    readonly rowIndex: number
    readonly a1Range: string

    constructor(parentSheet: GoogleSpreadsheetWorksheet, rowNumber: number, data)

    save(): Promise<void>
    delete(): Promise<any>
    del(): Promise<any>
  }

  export class GoogleSpreadsheetFormulaError {
    type: string
    message: string

    constructor(errorInfo: {
      type?: string
      message?: string
    })
  }
}
