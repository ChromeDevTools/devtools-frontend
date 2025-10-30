interface TrackConfig {
    click?: boolean;
    dblclick?: boolean;
    hover?: boolean;
    drag?: boolean;
    change?: boolean;
    keydown?: boolean | string;
    resize?: boolean;
}
export interface LoggingConfig {
    ve: number;
    track?: TrackConfig;
    context?: string;
    parent?: string;
}
export declare function needsLogging(element: Element): boolean;
export declare function getLoggingConfig(element: Element): LoggingConfig;
export declare enum VisualElements {
    TreeItem = 1,
    Close = 2,
    Counter = 3,
    Drawer = 4,
    Resizer = 5,
    Toggle = 6,
    Tree = 7,
    TextField = 8,
    AnimationClip = 9,
    Section = 10,
    SectionHeader = 11,
    Timeline = 12,
    CSSRuleHeader = 13,
    Expand = 14,
    ToggleSubpane = 15,
    ControlPoint = 16,
    Toolbar = 17,
    Popover = 18,
    BreakpointMarker = 19,
    DropDown = 20,
    Adorner = 21,
    Gutter = 22,
    MetricsBox = 23,
    MetricsBoxPart = 24,
    Badge = 25,
    DOMBreakpoint = 26,
    Action = 29,
    FilterDropdown = 30,
    Dialog = 31,
    BezierCurveEditor = 32,
    BezierPresetCategory = 34,
    Preview = 35,
    Canvas = 36,
    ColorEyeDropper = 37,
    Link = 44,
    Item = 46,
    PaletteColorShades = 47,
    Panel = 48,
    ShowStyleEditor = 50,
    Slider = 51,
    CssColorMix = 52,
    Value = 53,
    Key = 54,
    PieChart = 59,
    PieChartSlice = 60,
    PieChartTotal = 61,
    ElementsBreadcrumbs = 62,
    PanelTabHeader = 66,
    Menu = 67,
    TableRow = 68,
    TableHeader = 69,
    TableCell = 70,
    Pane = 72,
    ResponsivePresets = 73,
    DeviceModeRuler = 74,
    MediaInspectorView = 75
}
export type VisualElementName = keyof typeof VisualElements;
export declare function parseJsLog(jslog: string): LoggingConfig;
export interface ConfigStringBuilder {
    /**
     * Specifies an optional context for the visual element. For string contexts
     * the convention is to use kebap case (e.g. `foo-bar`).
     *
     * @param value Optional context, which can be either a string or a number.
     * @returns The builder itself.
     */
    context: (value: string | number | undefined) => ConfigStringBuilder;
    /**
     * Speficies the name of a `ParentProvider` used to lookup the parent visual element.
     *
     * @param value The name of a previously registered `ParentProvider`.
     * @returns The builder itself.
     */
    parent: (value: string) => ConfigStringBuilder;
    /**
     * Specifies which DOM events to track for this visual element.
     *
     * @param options The set of DOM events to track.
     * @returns The builder itself.
     */
    track: (options: TrackConfig) => ConfigStringBuilder;
    /**
     * Serializes the configuration into a `jslog` string.
     *
     * @returns The serialized string value to put on a DOM element via the `jslog` attribute.
     */
    toString: () => string;
}
export declare function makeConfigStringBuilder(veName: VisualElementName, context?: string): ConfigStringBuilder;
export {};
