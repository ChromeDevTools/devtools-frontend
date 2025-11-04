import * as UI from '../../legacy.js';
export interface ChartViewportDelegate {
    windowChanged(startTime: number, endTime: number, animate: boolean): void;
    updateRangeSelection(startTime: number, endTime: number): void;
    setSize(width: number, height: number): void;
    update(): void;
}
export interface Config {
    /**
     * Configures if the Chart should show a vertical line at the position of the
     * mouse cursor when the user holds the `Shift` key.
     * The reason this is configurable is because within the Performance Panel
     * we use our own overlays system for UI like this, so we do not need the
     * ChartViewport to manage it.
     */
    enableCursorElement: boolean;
}
export declare class ChartViewport extends UI.Widget.VBox {
    #private;
    private readonly delegate;
    viewportElement: HTMLElement;
    private rangeSelectionEnabled;
    private vScrollElement;
    private vScrollContent;
    private readonly selectionOverlay;
    private cursorElement;
    private totalHeight;
    private offsetHeight;
    private scrollTop;
    private rangeSelectionStart;
    private rangeSelectionEnd;
    private dragStartPointX;
    private dragStartPointY;
    private dragStartScrollTop;
    private visibleLeftTime;
    private visibleRightTime;
    private offsetWidth;
    private targetLeftTime;
    private targetRightTime;
    private selectionOffsetShiftX;
    private selectionStartX;
    private lastMouseOffsetX?;
    private minimumBoundary;
    private totalTime;
    private isUpdateScheduled?;
    private cancelWindowTimesAnimation?;
    constructor(delegate: ChartViewportDelegate, config: Config);
    alwaysShowVerticalScroll(): void;
    disableRangeSelection(): void;
    isDragging(): boolean;
    elementsToRestoreScrollPositionsFor(): Element[];
    verticalScrollBarVisible(): boolean;
    private updateScrollBar;
    onResize(): void;
    reset(): void;
    private updateContentElementSize;
    setContentHeight(totalHeight: number): void;
    /**
     * @param centered If true, scrolls offset to where it is centered on the chart,
     * based on current the this.offsetHeight value.
     */
    setScrollOffset(offset: number, height?: number, centered?: boolean): void;
    scrollOffset(): number;
    chartHeight(): number;
    setBoundaries(zeroTime: number, totalTime: number): void;
    /**
     * The mouse wheel can results in flamechart zoom, scroll and pan actions, depending on the scroll deltas and the selected navigation:
     *
     * Classic navigation:
     * 1. Mouse Wheel --> Zoom
     * 2. Mouse Wheel + Shift --> Scroll
     * 3. Trackpad: Mouse Wheel AND horizontal scroll (deltaX > deltaY): --> Pan left/right
     *
     * Modern navigation:
     * 1. Mouse Wheel -> Scroll
     * 2. Mouse Wheel + Shift -> Pan left/right
     * 3. Mouse Wheel + Ctrl/Cmd -> Zoom
     * 4. Trackpad: Mouse Wheel AND horizontal scroll (deltaX > deltaY): --> Zoom
     */
    private onMouseWheel;
    private startDragging;
    private dragging;
    private endDragging;
    private startRangeSelection;
    private endRangeSelection;
    hideRangeSelection(): void;
    /**
     * @param startTime the start time of the selection in MilliSeconds
     * @param endTime the end time of the selection in MilliSeconds
     * TODO(crbug.com/346312365): update the type definitions in ChartViewport.ts
     */
    setRangeSelection(startTime: number, endTime: number): void;
    onClick(event: MouseEvent): void;
    private rangeSelectionDragging;
    private onScroll;
    private onMouseOut;
    private updateCursorPosition;
    pixelToTime(x: number): number;
    pixelToTimeOffset(x: number): number;
    timeToPosition(time: number): number;
    timeToPixel(): number;
    private showCursor;
    private onChartKeyDown;
    private onChartKeyUp;
    private handleZoomPanScrollKeys;
    private handleZoomGesture;
    private handleHorizontalPanGesture;
    private requestWindowTimes;
    scheduleUpdate(): void;
    update(): void;
    willHide(): void;
    setWindowTimes(startTime: number, endTime: number, animate?: boolean): void;
    windowLeftTime(): number;
    windowRightTime(): number;
}
