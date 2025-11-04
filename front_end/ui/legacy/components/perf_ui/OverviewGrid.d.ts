import * as Common from '../../../../core/common/common.js';
import type * as NetworkTimeCalculator from '../../../../models/network_time_calculator/network_time_calculator.js';
export declare class OverviewGrid {
    element: HTMLDivElement;
    private readonly grid;
    private readonly window;
    constructor(prefix: string, calculator?: NetworkTimeCalculator.Calculator);
    enableCreateBreadcrumbsButton(): HTMLElement;
    set showingScreenshots(isShowing: boolean);
    clientWidth(): number;
    updateDividers(calculator: NetworkTimeCalculator.Calculator): void;
    addEventDividers(dividers: Element[]): void;
    removeEventDividers(): void;
    reset(): void;
    windowLeftRatio(): number;
    windowRightRatio(): number;
    /**
     * This function will return the raw value of the slider window.
     * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
     *
     * @returns the pair of start/end value of the slider window in milliseconds or bytes
     */
    calculateWindowValue(): {
        rawStartValue: number;
        rawEndValue: number;
    };
    setWindowRatio(leftRatio: number, rightRatio: number): void;
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: Common.EventTarget.EventListener<EventTypes, T>, thisObject?: Object): Common.EventTarget.EventDescriptor;
    setClickHandler(clickHandler: ((arg0: Event) => boolean) | null): void;
    zoom(zoomFactor: number, referencePoint: number): void;
    setResizeEnabled(enabled: boolean): void;
}
export declare class Window extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private parentElement;
    private calculator;
    private leftResizeElement;
    private rightResizeElement;
    private leftCurtainElement;
    private rightCurtainElement;
    private breadcrumbButtonContainerElement;
    private createBreadcrumbButton;
    private curtainsRange?;
    private breadcrumbZoomIcon?;
    private overviewWindowSelector;
    private offsetLeft;
    private dragStartPointPixel;
    private dragStartLeftRatio;
    private dragStartRightRatio;
    windowLeftRatio: number;
    windowRightRatio: number;
    private resizeEnabled?;
    private clickHandler?;
    private resizerParentOffsetLeft?;
    constructor(parentElement: HTMLElement, dividersLabelBarElement?: Element, calculator?: NetworkTimeCalculator.Calculator);
    enableCreateBreadcrumbsButton(): HTMLElement;
    set showingScreenshots(isShowing: boolean);
    private onResizerClicked;
    private onRightResizeElementFocused;
    reset(): void;
    setResizeEnabled(resizeEnabled: boolean): void;
    setClickHandler(clickHandler: ((arg0: Event) => boolean) | null): void;
    private resizerElementStartDragging;
    private leftResizeElementDragging;
    private rightResizeElementDragging;
    private handleKeyboardResizing;
    private getNewResizerPosition;
    private startWindowSelectorDragging;
    private windowSelectorDragging;
    private endWindowSelectorDragging;
    private startWindowDragging;
    private windowDragging;
    private resizeWindowLeft;
    private resizeWindowRight;
    private resizeWindowMaximum;
    /**
     * This function will return the raw value of the give slider.
     * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
     * @param leftSlider if this slider is the left one
     * @returns the value in milliseconds or bytes
     */
    private getRawSliderValue;
    private updateResizeElementAriaValue;
    private updateResizeElementPositionLabels;
    private updateResizeElementPercentageLabels;
    /**
     * This function will return the raw value of the slider window.
     * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
     *
     * @returns the pair of start/end value of the slider window in milliseconds or bytes
     */
    calculateWindowValue(): {
        rawStartValue: number;
        rawEndValue: number;
    };
    setWindowRatio(windowLeftRatio: number, windowRightRatio: number): void;
    private updateCurtains;
    private toggleBreadcrumbZoomButtonDisplay;
    private getWindowRange;
    private setWindowPosition;
    private onMouseWheel;
    zoom(factor: number, reference: number): void;
}
export declare const enum Events {
    WINDOW_CHANGED = "WindowChanged",
    WINDOW_CHANGED_WITH_POSITION = "WindowChangedWithPosition",
    BREADCRUMB_ADDED = "BreadcrumbAdded"
}
export interface WindowChangedWithPositionEvent {
    rawStartValue: number;
    rawEndValue: number;
}
export interface EventTypes {
    [Events.WINDOW_CHANGED]: void;
    [Events.BREADCRUMB_ADDED]: WindowChangedWithPositionEvent;
    [Events.WINDOW_CHANGED_WITH_POSITION]: WindowChangedWithPositionEvent;
}
export declare class WindowSelector {
    private startPosition;
    private width;
    private windowSelector;
    constructor(parent: Element, position: number);
    close(position: number): {
        start: number;
        end: number;
    };
    updatePosition(position: number): void;
}
