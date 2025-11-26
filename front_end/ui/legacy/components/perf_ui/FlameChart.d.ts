import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import type * as NetworkTimeCalculator from '../../../../models/network_time_calculator/network_time_calculator.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../legacy.js';
import { type ChartViewportDelegate } from './ChartViewport.js';
export declare const ARROW_SIDE = 8;
/** The width of each of the edit mode icons. **/
export declare const EDIT_ICON_WIDTH = 16;
/** export for test. **/
export declare const enum HoverType {
    TRACK_CONFIG_UP_BUTTON = "TRACK_CONFIG_UP_BUTTON",
    TRACK_CONFIG_DOWN_BUTTON = "TRACK_CONFIG_DOWN_BUTTON",
    TRACK_CONFIG_HIDE_BUTTON = "TRACK_CONFIG_HIDE_BUTTON",
    TRACK_CONFIG_SHOW_BUTTON = "TRACK_CONFIG_SHOW_BUTTON",
    INSIDE_TRACK_HEADER = "INSIDE_TRACK_HEADER",
    INSIDE_TRACK = "INSIDE_TRACK",
    OUTSIDE_TRACKS = "OUTSIDE_TRACKS",
    ERROR = "ERROR"
}
export declare const enum GroupCollapsibleState {
    ALWAYS = 0,
    NEVER = 1,
    IF_MULTI_ROW = 2
}
export interface FlameChartDelegate {
    windowChanged(_startTime: number, _endTime: number, _animate: boolean): void;
    updateRangeSelection(_startTime: number, _endTime: number): void;
    updateSelectedGroup(_flameChart: FlameChart, _group: Group | null): void;
    /**
     * Returns the element that the FlameChart has been rendered into. Used to
     * provide element references for attaching to Visual Element logs.
     */
    containingElement?: () => HTMLElement;
}
interface GroupTreeNode {
    index: number;
    nestingLevel: number;
    startLevel: number;
    endLevel: number;
    children: GroupTreeNode[];
}
export interface OptionalFlameChartConfig {
    /**
     * The FlameChart will highlight the entry that is selected by default. In
     * some cases (Performance Panel) we manage this ourselves with the Overlays
     * system, so we disable the built in one.
     */
    selectedElementOutline?: boolean;
    /**
     * The element to use when populating and positioning the mouse tooltip.
     */
    tooltipElement?: HTMLElement;
    /**
     * Used to disable the cursor element in ChartViewport and instead use the new overlays system.
     */
    useOverlaysForCursorRuler?: boolean;
    /**
     * If provided, this will add a VE Logging context to the canvas to log visibility and hovers.
     */
    canvasVELogContext?: string;
}
export declare const enum FilterAction {
    MERGE_FUNCTION = "MERGE_FUNCTION",
    COLLAPSE_FUNCTION = "COLLAPSE_FUNCTION",
    COLLAPSE_REPEATING_DESCENDANTS = "COLLAPSE_REPEATING_DESCENDANTS",
    RESET_CHILDREN = "RESET_CHILDREN",
    UNDO_ALL_ACTIONS = "UNDO_ALL_ACTIONS"
}
export interface UserFilterAction {
    type: FilterAction;
    entry: Trace.Types.Events.Event;
}
/** Object used to indicate to the Context Menu if an action is possible on the selected entry. **/
export interface PossibleFilterActions {
    [FilterAction.MERGE_FUNCTION]: boolean;
    [FilterAction.COLLAPSE_FUNCTION]: boolean;
    [FilterAction.COLLAPSE_REPEATING_DESCENDANTS]: boolean;
    [FilterAction.RESET_CHILDREN]: boolean;
    [FilterAction.UNDO_ALL_ACTIONS]: boolean;
}
export interface PositionOverride {
    x: number;
    width: number;
    /** The z index of this entry. Use -1 if placing it underneath other entries. A z of 0 is assumed, otherwise, much like CSS's z-index */
    z?: number;
}
export type DrawOverride = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, timeToPosition: (time: number) => number, transformColor: (color: string) => string) => PositionOverride;
declare const FlameChart_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends keyof EventTypes>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof EventTypes): boolean;
    dispatchEventToListeners<T extends keyof EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class FlameChart extends FlameChart_base implements NetworkTimeCalculator.Calculator, ChartViewportDelegate {
    #private;
    private readonly flameChartDelegate;
    private chartViewport;
    private dataProvider;
    private candyStripePattern;
    private candyStripePatternGray;
    private contextMenu?;
    private viewportElement;
    private canvas;
    private context;
    private popoverElement;
    private readonly markerHighlighElement;
    readonly highlightElement: HTMLElement;
    readonly revealDescendantsArrowHighlightElement: HTMLElement;
    private readonly selectedElement;
    private rulerEnabled;
    private barHeight;
    private hitMarginPx;
    private textBaseline;
    private textPadding;
    private highlightedMarkerIndex;
    /**
     * The index of the entry that's hovered (typically), or focused because of searchResult or other reasons.focused via searchResults, or focused by other means.
     * Updated as the cursor moves. Meanwhile `selectedEntryIndex` is the entry that's been clicked.
     **/
    private highlightedEntryIndex;
    /**
     * Represents the index of the entry that is selected. For an entry to be
     * selected, it has to be clicked by the user (generally).
     **/
    private selectedEntryIndex;
    private rawTimelineDataLength;
    private readonly markerPositions;
    private readonly customDrawnPositions;
    private lastMouseOffsetX;
    private selectedGroupIndex;
    private keyboardFocusedGroup;
    private offsetWidth;
    private offsetHeight;
    private dragStartX;
    private dragStartY;
    private lastMouseOffsetY;
    private maxDragOffset;
    private timelineLevels?;
    private visibleLevelOffsets?;
    private visibleLevels?;
    private visibleLevelHeights?;
    private groupOffsets?;
    private rawTimelineData?;
    private forceDecorationCache?;
    private entryColorsCache?;
    private colorDimmingCache;
    private totalTime?;
    private lastPopoverState;
    private dimIndices?;
    /** When true, all undimmed entries are outlined. When an array, only those indices are outlined (if not dimmed). */
    private dimShouldOutlineUndimmedEntries;
    constructor(dataProvider: FlameChartDataProvider, flameChartDelegate: FlameChartDelegate, optionalConfig?: OptionalFlameChartConfig);
    wasShown(): void;
    willHide(): void;
    canvasBoundingClientRect(): DOMRect | null;
    verticalScrollBarVisible(): boolean;
    /**
     * In some cases we need to manually adjust the positioning of the tooltip
     * vertically to account for the fact that it might be rendered not relative
     * to just this flame chart. This is true of the main flame chart in the
     * Performance Panel where the element is rendered in a higher-stack container
     * and we need to manually adjust its Y position to correctly put the tooltip
     * in the right place.
     */
    setTooltipYPixelAdjustment(y: number): void;
    getBarHeight(): number;
    setBarHeight(value: number): void;
    setTextBaseline(value: number): void;
    setTextPadding(value: number): void;
    enableRuler(enable: boolean): void;
    alwaysShowVerticalScroll(): void;
    disableRangeSelection(): void;
    enableDimming(entryIndices: number[], inclusive: boolean, outline: boolean | number[]): void;
    disableDimming(): void;
    isDimming(): boolean;
    getColorForEntry(entryIndex: number): string;
    highlightEntry(entryIndex: number): void;
    hideHighlight(): void;
    private createCandyStripePattern;
    private resetCanvas;
    windowChanged(startTime: number, endTime: number, animate: boolean): void;
    updateRangeSelection(startTime: number, endTime: number): void;
    setSize(width: number, height: number): void;
    private startDragging;
    private dragging;
    private endDragging;
    timelineData(rebuild?: boolean): FlameChartTimelineData | null;
    revealEntryVertically(entryIndex: number): void;
    revealEntry(entryIndex: number): void;
    setWindowTimes(startTime: number, endTime: number, animate?: boolean): void;
    /**
     * Handle the mouse move event. The handle priority will be:
     *   1. Track configuration icons -> show tooltip for the icons
     *   2. Inside a track header -> mouse style will be a "pointer", indicating track can be focused
     *   3. Inside a track -> update the highlight of hovered event
     */
    private onMouseMove;
    private updateHighlight;
    private onMouseOut;
    showPopoverForSearchResult(selectedSearchResult: number | null): void;
    updatePopoverContents(popoverElement: Element): void;
    updateMouseOffset(mouseX: number, mouseY: number): void;
    private updatePopoverOffset;
    /**
     * Handle mouse click event in flame chart
     *
     * And the handle priority will be:
     * 1. Track configuration icons -> Config a track
     * 1.1 if it's edit mode ignore others.
     * 2. Inside a track header -> Select and Expand/Collapse a track
     * 3. Inside a track -> Select a track
     * 3.1 shift + click -> Select the time range of clicked event
     * 3.2 click -> update highlight (handle in other functions)
     */
    private onClick;
    setLinkSelectionAnnotationIsInProgress(inProgress: boolean): void;
    private deselectAllGroups;
    private deselectAllEntries;
    private isGroupFocused;
    private scrollGroupIntoView;
    /**
     * Toggle a group's expanded state.
     * @param groupIndex the index of this group in the timelineData.groups
     * array. Note that this is the array index, and not the startLevel of the
     * group.
     */
    toggleGroupExpand(groupIndex: number): void;
    private expandGroup;
    moveGroupUp(groupIndex: number): void;
    moveGroupDown(groupIndex: number): void;
    hideGroup(groupIndex: number): void;
    showGroup(groupIndex: number): void;
    showAllGroups(): void;
    modifyTree(treeAction: FilterAction, index: number): void;
    onContextMenu(event: MouseEvent): void;
    private onKeyDown;
    bindCanvasEvent(eventName: string, onEvent: (arg0: Event) => void): void;
    drawTrackOnCanvas(trackName: string, context: CanvasRenderingContext2D, minWidth: number): {
        top: number;
        height: number;
        visibleEntries: Set<number>;
    } | null;
    private handleKeyboardGroupNavigation;
    /**
     * Used when the user presses "enter" when a group is selected, so that we
     * move their selection into an event in the group.
     */
    private selectFirstEntryInCurrentGroup;
    private selectPreviousGroup;
    private selectNextGroup;
    private getGroupIndexToSelect;
    private selectFirstChild;
    private handleSelectionNavigation;
    /**
     * Given offset of the cursor, returns the index of the entry.
     * This function is public for test purpose.
     * @param x
     * @param y
     * @returns the index of the entry
     */
    coordinatesToEntryIndex(x: number, y: number): number;
    /**
     * Given an entry's index and an X coordinate of a mouse click, returns
     * whether the mouse is hovering over the arrow button that reveals hidden children
     */
    isMouseOverRevealChildrenArrow(x: number, index: number): boolean;
    /**
     * Given an entry's index, returns its coordinates relative to the
     * viewport.
     * This function is public for test purpose.
     */
    entryIndexToCoordinates(entryIndex: number): {
        x: number;
        y: number;
    } | null;
    /**
     * Given an entry's index, returns its title
     */
    entryTitle(entryIndex: number): string | null;
    /**
     * Returns the offset of the canvas relative to the viewport.
     */
    getCanvasOffset(): {
        x: number;
        y: number;
    };
    getCanvas(): HTMLCanvasElement;
    /**
     * Returns the y scroll of the chart viewport.
     */
    getScrollOffset(): number;
    getContextMenu(): UI.ContextMenu.ContextMenu | undefined;
    /**
     * Given offset of the cursor, returns the index of the group and the hover type of current mouse position.
     * Will return -1 for index and HoverType.OUTSIDE_TRACKS if no group is hovered/clicked.
     * And the handle priority will be:
     * 1. Track configuration icons
     * 2. Inside a track header (track label and the expansion arrow)
     * 3. Inside a track
     * 4. Outside all tracks
     *
     * This function is public for test purpose.
     * @param x
     * @param y
     * @returns the index of the group and the button user clicked. If there is no button the button type will be
     * undefined.
     */
    coordinatesToGroupIndexAndHoverType(x: number, y: number): {
        groupIndex: number;
        hoverType: HoverType;
    };
    enterTrackConfigurationMode(): void;
    private markerIndexBeforeTime;
    /**
     * Draw the whole flame chart.
     * Make sure |setWindowTimes| is called with correct time range before this function.
     */
    private draw;
    entryWidth(entryIndex: number): number;
    /**
     * Preprocess the data to be drawn to speed the rendering time.
     * Specifically:
     *  - Groups events into draw batches - same color + same outline - to help drawing performance
     *    by reducing how often `context.fillStyle` is changed.
     *  - Discards non visible events.
     *  - Gathers marker events (LCP, FCP, DCL, etc.).
     *  - Gathers event titles that should be rendered.
     */
    private getDrawBatches;
    /**
     * The function to draw the group headers. It will draw the title by default.
     * And when a group is hovered, it will add a edit button.
     * And will draw the move up/down, hide and save button if user enter the editing mode.
     * @param width
     * @param height
     * @param hoveredGroupIndex This is used to show the edit icon for hovered group. If it is undefined or -1, it means
     * there is no group being hovered.
     */
    private drawGroupHeaders;
    /**
     * Draws page load events in the Timings track (LCP, FCP, DCL, etc.)
     */
    private drawMarkers;
    /**
     * Draws the titles of trace events in the timeline. Also calls `decorateEntry` on the data
     * provider, which can do any custom drawing on the corresponding entry's area (e.g. draw screenshots
     * in the Performance Panel timeline).
     *
     * Takes in the width of the entire canvas so that we know if an event does
     * not fit into the viewport entirely, the max width we can draw is that
     * width, not the width of the event itself.
     */
    private drawEventTitles;
    /**
     * @callback GroupCallback
     * @param groupTop pixels between group top and the top of the flame chart.
     * @param groupIndex
     * @param group
     * @param isFirstGroup if the group is the first one of this nesting level.
     * @param height pixels of height of this group
     */
    /**
     * Process the pixels of start and end, and other data of each group, which are used in drawing the group.
     * @param callback
     */
    private forEachGroup;
    private forEachGroupInViewport;
    /**
     * Returns the width of the title label of the group, which include the left padding, arrow and the group header text.
     * This function is public for test reason.
     * |ICON_WIDTH|expansionArrowIndent * (nestingLevel + 1)|
     * |headerLeftPadding|EDIT  ICON|                    |Arrow|LabelXPadding|Title|LabelXPadding|
     *                              |<--                      labelWidth                      -->|
     * @param context canvas context
     * @param group
     * @returns the width of the label of the group.
     */
    labelWidthForGroup(context: CanvasRenderingContext2D, group: Group): number;
    private drawCollapsedOverviewForGroup;
    private drawFlowEvents;
    private drawCircleAroundCollapseArrow;
    /**
     * Draws the vertical dashed lines in the timeline marking where the "Marker" events
     * happened in time.
     */
    private drawMarkerLines;
    private updateMarkerHighlight;
    private processTimelineData;
    /**
     * Builds a tree for the given group array, the tree will be built based on the nesting level.
     * We will add one fake root to represent the top level parent, and the for each tree node, its children means the
     * group nested in. The order of the children matters because it represent the order of groups.
     * So for example if there are Group 0-7, Group 0, 3, 4 have nestingLevel 0, Group 1, 2, 5, 6, 7 have nestingLevel 1.
     * Then we will get a tree like this.
     *              -1(fake root to represent the top level parent)
     *             / | \
     *            /  |  \
     *           0   3   4
     *          / \    / | \
     *         1   2  5  6  7
     * This function is public for test purpose.
     * @param groups the array of all groups, it should be the one from FlameChartTimelineData
     * @returns the root of the Group tree. The root is the fake one we added, which represent the parent for all groups
     */
    buildGroupTree(groups: Group[]): GroupTreeNode;
    /**
     * Updates the tree for the given group array.
     * For a new timeline data, if the groups remains the same (the same here mean the group order inside the |groups|,
     * the start level, style and other attribute can be changed), but other parts are different.
     * For example the |entryLevels[]| or |maxStackDepth| is changed, then we should update the group tree instead of
     * re-build it.
     * So we can keep the order that user manually set.
     * To do this, we go through the tree, and update the start and end level of each group.
     * This function is public for test purpose.
     * @param groups the array of all groups, it should be the one from FlameChartTimelineData
     * @param root the root of the Group tree. The root is the fake one we added, which represent the parent for all groups
     */
    updateGroupTree(groups: Group[], root: GroupTreeNode): void;
    private updateLevelPositions;
    private isGroupCollapsible;
    groupIsLastVisibleTopLevel(groupIndex: number): boolean;
    setSelectedEntry(entryIndex: number): void;
    private entryHasDecoration;
    getCustomDrawnPositionForEntryIndex(entryIndex: number): PositionOverride | null;
    /**
     * Update position of an Element. By default, the element is treated as a full entry and it's dimensions are set to the full entry width/length/height.
     * If isDecoration parameter is set to true, the element will be positioned on the right side of the entry and have a square shape where width == height of the entry.
     */
    private updateElementPosition;
    private updateHiddenChildrenArrowHighlighPosition;
    private timeToPositionClipped;
    /**
     * Returns the amount of pixels a group is vertically offset in the flame chart.
     * Now this function is only used for tests.
     */
    groupIndexToOffsetForTest(groupIndex: number): number;
    /**
     * Set the edit mode.
     * Now this function is only used for tests.
     */
    setEditModeForTest(editMode: boolean): void;
    /**
     * Returns the visibility of a level in the.
     * flame chart.
     */
    levelIsVisible(level: number): boolean;
    /**
     * Returns the amount of pixels a level is vertically offset in the.
     * flame chart.
     */
    levelToOffset(level: number): number;
    levelHeight(level: number): number;
    private updateBoundaries;
    private updateHeight;
    /**
     * This is the total height that would be required to render the flame chart
     * with no overflows.
     */
    totalContentHeight(): number;
    onResize(): void;
    setPersistedConfig(config: PersistedGroupConfig[] | null): void;
    update(): void;
    reset(): void;
    scheduleUpdate(): void;
    private enabled;
    computePosition(time: number): number;
    formatValue(value: number, precision?: number): string;
    maximumBoundary(): Trace.Types.Timing.Milli;
    minimumBoundary(): Trace.Types.Timing.Milli;
    zeroTime(): Trace.Types.Timing.Milli;
    boundarySpan(): Trace.Types.Timing.Milli;
    getDimIndices(): Uint8Array<ArrayBufferLike> | null;
}
export declare const RulerHeight = 15;
export declare const MinimalTimeWindowMs = 0.5;
/**
 * initiatorIndex is the index of the initiator entry and
 * eventIndex is the entry initiated by it.
 * However, if isEntryHidden or isInitiatorHidden are set to true,
 * it means that the actual initiator or initiated entry is hidden
 * by some context menu action and the indexes in initiatorIndex
 * or/and eventIndex are for the entries that are the closest
 * modified by an actions ancestors to them.
 */
export interface FlameChartInitiatorData {
    initiatorIndex: number;
    eventIndex: number;
    isEntryHidden?: boolean;
    isInitiatorHidden?: boolean;
}
export declare const enum FlameChartDecorationType {
    CANDY = "CANDY",
    WARNING_TRIANGLE = "WARNING_TRIANGLE",
    HIDDEN_DESCENDANTS_ARROW = "HIDDEN_DESCENDANTS_ARROW"
}
/**
 * Represents a decoration that can be added to event. Each event can have as
 * many decorations as required.
 *
 * It is anticipated in the future that we will add to this as we want to
 * annotate events in more ways.
 *
 * This work is being tracked in crbug.com/1434297.
 **/
export type FlameChartDecoration = {
    type: FlameChartDecorationType.CANDY;
    /**
     * Relative to entry's ts. We often only want to highlight problem parts of events, so this time sets the minimum
     * time at which the candystriping will start. If you want to candystripe the entire event, set this to 0.
     */
    startAtTime: Trace.Types.Timing.Micro;
} | {
    type: FlameChartDecorationType.WARNING_TRIANGLE;
    customStartTime?: Trace.Types.Timing.Micro;
    customEndTime?: Trace.Types.Timing.Micro;
} | {
    type: FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW;
};
export declare function sortDecorationsForRenderingOrder(decorations: FlameChartDecoration[]): void;
export declare class FlameChartTimelineData {
    entryLevels: number[] | Uint16Array;
    entryTotalTimes: number[] | Float32Array;
    entryStartTimes: number[] | Float64Array;
    /**
     * An array of entry decorations, where each item in the array is an array of
     * decorations for the event at that index.
     **/
    entryDecorations: FlameChartDecoration[][];
    groups: Group[];
    /**
     * Markers are events with vertical lines that go down the entire timeline at their start time.
     * These are only used now in the Extensibility API; users can provide a
     * `marker` event
     * (https://developer.chrome.com/docs/devtools/performance/extension#inject_your_data_with_the_user_timings_api)
     * which will render with a vertical line.
     * If you are wondering what we use to draw page events like LCP, those are
     * done via the overlays system. In time, it probably makes sense to use the
     * overlays for e11y marker events too, and then we can remove markers from
     * TimelineData, rather than have two systems to build the same UI...
     */
    markers: FlameChartMarker[];
    initiatorsData: FlameChartInitiatorData[];
    selectedGroup: Group | null;
    private constructor();
    static create(data: {
        entryLevels: FlameChartTimelineData['entryLevels'];
        entryTotalTimes: FlameChartTimelineData['entryTotalTimes'];
        entryStartTimes: FlameChartTimelineData['entryStartTimes'];
        groups: FlameChartTimelineData['groups'] | null;
        entryDecorations?: FlameChartDecoration[][];
        initiatorsData?: FlameChartTimelineData['initiatorsData'];
    }): FlameChartTimelineData;
    static createEmpty(): FlameChartTimelineData;
    emptyInitiators(): void;
}
export interface DataProviderSearchResult {
    index: number;
    startTimeMilli: Trace.Types.Timing.Milli;
    provider: 'main' | 'network' | 'other';
}
export interface DataProviderSearchResult {
    index: number;
    startTimeMilli: Trace.Types.Timing.Milli;
    provider: 'main' | 'network' | 'other';
}
export interface FlameChartDataProvider {
    setPersistedGroupConfigSetting?(setting: Common.Settings.Setting<PersistedGroupConfig[] | null>): void;
    minimumBoundary(): number;
    totalTime(): number;
    formatValue(value: number, precision?: number): string;
    maxStackDepth(): number;
    /**
     * Construct the data for the FlameChart. Note that this method is called
     * multiple times. It is expected that the implementor cache the data
     * aggressively and only rebuild if the flag is passed.
     */
    timelineData(rebuild?: boolean): FlameChartTimelineData | null;
    preparePopoverElement(entryIndex: number): Element | null;
    preparePopoverForCollapsedArrow?(entryIndex: number): Element | null;
    canJumpToEntry(entryIndex: number): boolean;
    entryTitle(entryIndex: number): string | null;
    entryFont(entryIndex: number): string | null;
    entryColor(entryIndex: number): string;
    decorateEntry(entryIndex: number, context: CanvasRenderingContext2D, text: string | null, barX: number, barY: number, barWidth: number, barHeight: number, unclippedBarX: number, timeToPixelRatio: number, transformColor?: (color: string) => string): boolean;
    forceDecoration(entryIndex: number): boolean;
    forceDrawableLevel?(level: number): boolean;
    textColor(entryIndex: number): string;
    mainFrameNavigationStartEvents?(): readonly Trace.Types.Events.NavigationStart[];
    hasTrackConfigurationMode(): boolean;
    eventByIndex?(entryIndex: number): Trace.Types.Events.Event | null;
    indexForEvent?(event: Trace.Types.Events.Event | Trace.Types.Events.LegacyTimelineFrame): number | null;
    buildFlowForInitiator?(index: number): unknown;
    customizedContextMenu?(event: MouseEvent, eventIndex: number, groupIndex: number): UI.ContextMenu.ContextMenu | undefined;
    search?(visibleWindow: Trace.Types.Timing.TraceWindowMicro, filter?: Trace.Extras.TraceFilter.TraceFilter): DataProviderSearchResult[];
    modifyTree?(action: FilterAction, entryIndex: number): void;
    findPossibleContextMenuActions?(node: number): PossibleFilterActions | void;
    handleFlameChartTransformKeyboardEvent?(event: KeyboardEvent, entryIndex: number, groupIndex: number): void;
    groupForEvent?(entryIndex: number): Group | null;
    getDrawOverride?(entryIndex: number): DrawOverride | undefined;
    /**
     * Used when the user re-orders / hides / shows tracks to notify the data
     * provider. The data provider can choose to store this data in order to have
     * the user's view persisted in memory and/or to disk when the trace is saved.
     */
    handleTrackConfigurationChange?(groups: readonly Group[], indexesInVisualOrder: number[]): void;
}
export interface FlameChartMarker {
    startTime(): number;
    color(): string;
    title(): string | null;
    draw(context: CanvasRenderingContext2D, x: number, height: number, pixelsPerMillisecond: number): void;
}
export declare const enum Events {
    /**
     * Emitted when the <canvas> element of the FlameChart is focused by the user.
     **/
    CANVAS_FOCUSED = "CanvasFocused",
    /**
     * Emitted when an event is selected by either mouse click, or hitting
     * <enter> on the keyboard - e.g. the same actions that would invoke a
     * <button> element.
     *
     * Will be emitted with a number which is the index of the entry that has
     * been selected, or -1 if no entry is selected (e.g the user has clicked
     * away from any events)
     */
    ENTRY_INVOKED = "EntryInvoked",
    ENTRY_LABEL_ANNOTATION_ADDED = "EntryLabelAnnotationAdded",
    ENTRIES_LINK_ANNOTATION_CREATED = "EntriesLinkAnnotationCreated",
    /**
     * Emitted when the user enters or exits 'reorder tracks' view.
     * If the event value is 'true', the 'reorder tracks' state was entered,
     * if it's false, the reorder state was exited.
     */
    TRACKS_REORDER_STATE_CHANGED = "TracksReorderStateChange",
    /**
     * Emitted when an event is selected via keyboard navigation using the arrow
     * keys.
     *
     * Will be emitted with a number which is the index of the entry that has
     * been selected, or -1 if no entry is selected.
     */
    ENTRY_SELECTED = "EntrySelected",
    /**
     * Emitted when an event is hovered over with the mouse.
     *
     * Will be emitted with a number which is the index of the entry that has
     * been hovered on, or -1 if no entry is selected (the user has moved their
     * mouse off the event)
     */
    ENTRY_HOVERED = "EntryHovered",
    LATEST_DRAW_DIMENSIONS = "LatestDrawDimensions",
    MOUSE_MOVE = "MouseMove"
}
export interface EventTypes {
    [Events.ENTRY_LABEL_ANNOTATION_ADDED]: {
        entryIndex: number;
        withLinkCreationButton: boolean;
    };
    [Events.ENTRIES_LINK_ANNOTATION_CREATED]: {
        entryFromIndex: number;
    };
    [Events.TRACKS_REORDER_STATE_CHANGED]: boolean;
    [Events.CANVAS_FOCUSED]: number | void;
    [Events.ENTRY_INVOKED]: number;
    [Events.ENTRY_SELECTED]: number;
    [Events.ENTRY_HOVERED]: number;
    [Events.LATEST_DRAW_DIMENSIONS]: {
        chart: {
            widthPixels: number;
            heightPixels: number;
            scrollOffsetPixels: number;
            allGroupsCollapsed: boolean;
        };
        traceWindow: Trace.Types.Timing.TraceWindowMicro;
    };
    [Events.MOUSE_MOVE]: {
        mouseEvent: MouseEvent;
        timeInMicroSeconds: Trace.Types.Timing.Micro;
    };
}
export interface Group {
    name: Common.UIString.LocalizedString;
    subtitle?: Common.UIString.LocalizedString;
    startLevel: number;
    expanded?: boolean;
    hidden?: boolean;
    selectable?: boolean;
    style: GroupStyle;
    /** Should be turned on if the track supports user editable stacks. */
    showStackContextMenu?: boolean;
    jslogContext?: string;
    description?: string;
}
export interface GroupStyle {
    height: number;
    padding: number;
    collapsible: GroupCollapsibleState;
    /** The color of the group title text. */
    color: string;
    /**
     * The background color of the group title when the track is collapsed,
     * and this is usually around same length as the title text.
     */
    backgroundColor: string;
    nestingLevel: number;
    itemsHeight?: number;
    /** Allow entries to be placed on the same horizontal level as the text heading. True by default for Timeline */
    shareHeaderLine?: boolean;
    useFirstLineForOverview?: boolean;
    useDecoratorsForOverview?: boolean;
}
/**
 * Persists the configuration state of a group. When a trace is recorded /
 * imported, we see if we can match any persisted config to each track based on
 * its name, and if we can, we apply the config to it.
 */
export interface PersistedGroupConfig {
    trackName: string;
    hidden: boolean;
    expanded: boolean;
    originalIndex: number;
    visualIndex: number;
}
export {};
