// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as TraceBounds from '../../../../services/trace_bounds/trace_bounds.js';
import { Directives, html, nothing, render } from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import * as ThemeSupport from '../../theme_support/theme_support.js';
import { OverviewGrid } from './OverviewGrid.js';
import { TimelineOverviewCalculator } from './TimelineOverviewCalculator.js';
import timelineOverviewInfoStyles from './timelineOverviewInfo.css.js';
const { ref, styleMap } = Directives;
const BRACKET_TRIANGLE_SIZE = 5;
function bracketPoints({ left, right }) {
    const size = BRACKET_TRIANGLE_SIZE;
    return `${left},0 ${left},${size} ${left + size - 1},1 ${right - size - 1},1 ${right},${size} ${right},0`;
}
const renderOverviewGridView = (input, output, target) => {
    const onPointerDown = (event) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        event.target.setPointerCapture(event.pointerId);
        input.onPointerDown();
    };
    const onPointerUp = (event) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        // The browser releases the capture before it dispatches `pointercancel`.
        if (event.target.hasPointerCapture(event.pointerId)) {
            event.target.releasePointerCapture(event.pointerId);
        }
        input.onPointerUp();
    };
    const onPointerMove = (event) => {
        if (!(event.target instanceof Element) || !(event.currentTarget instanceof Element)) {
            return;
        }
        const offsetLeftRelativeToCursorArea = event.target.getBoundingClientRect().left - event.currentTarget.getBoundingClientRect().left;
        input.onCursorMove(event.offsetX + offsetLeftRelativeToCursorArea);
    };
    // clang-format off
    render(html `
    <div
      class="overview-grid-cursor-area"
      @pointerdown=${onPointerDown}
      @pointerup=${onPointerUp}
      @pointercancel=${onPointerUp}
      @pointermove=${onPointerMove}
      @pointerleave=${input.onCursorLeave}
      ${ref(element => {
        output.cursorAreaLeft = element instanceof HTMLElement ?
            () => element.getBoundingClientRect().left : undefined;
    })}></div>
    <div
      class="overview-grid-cursor-position"
      style=${styleMap({
        left: `${input.cursorPosition}px`,
        visibility: input.cursorVisible ? 'visible' : 'hidden',
    })}
      ${ref(element => {
        output.cursorAnchorBox = element instanceof HTMLElement ? () => element.boxInWindow() : undefined;
    })}></div>
  `, target, {
        container: {
            attributes: {
                jslog: `${VisualLogging.timeline(`${input.prefix}-overview`).track({ click: true, drag: true, hover: true })}`,
            },
        },
    });
    // clang-format on
};
export const DEFAULT_VIEW = (input, output, target) => {
    const { highlight } = input;
    const overviewGridElement = input.overviewGrid.element;
    // clang-format off
    render(html `
    ${overviewGridElement}
    <svg class="timeline-minimap-dim-highlight-svg" ?hidden=${!highlight}>
      <defs>
        <mask id="${input.prefix}-dim-highlight-cutouts">
          <rect width="100%" height="100%" fill="hsl(0deg 0% 95%)"></rect>
          <rect class="punch" x=${highlight?.left ?? nothing} y="0"
              width=${highlight ? highlight.right - highlight.left : nothing} height="100%" fill="black"></rect>
        </mask>
      </defs>
      <rect class="background" width="100%" height="100%" fill=${input.highlightBackgroundColor}
          mask="url(#${input.prefix}-dim-highlight-cutouts)" style="mix-blend-mode: saturation"></rect>
      <polygon ?hidden=${!highlight?.withBracket} fill=${input.highlightBracketColor}
          points=${highlight?.withBracket ? bracketPoints(highlight) : nothing}></polygon>
    </svg>
  `, target, {
        container: {
            attributes: { id: `${input.prefix}-overview-pane` },
        },
    });
    // clang-format on
    renderOverviewGridView(input, output, overviewGridElement);
    renderOverviewInfoView(input, output, input.overviewInfo.contentRoot);
};
const renderOverviewInfoView = (input, _output, target) => {
    render(html `<div class="overview-info">${input.overviewInfoElements}</div>`, target);
};
const TimelineOverviewPaneBase = Common.ObjectWrapper.eventMixin(UI.Widget.VBox);
export class TimelineOverviewPane extends TimelineOverviewPaneBase {
    overviewCalculator;
    overviewGrid;
    overviewControls = [];
    markers = new Map();
    overviewInfo;
    updateThrottler = new Common.Throttler.Throttler(100);
    cursorEnabled = false;
    cursorPosition = 0;
    lastWidth = 0;
    windowStartTime = Trace.Types.Timing.Milli(0);
    windowEndTime = Trace.Types.Timing.Milli(Infinity);
    muteOnWindowChanged = false;
    hasPointer = false;
    #prefix;
    #view;
    #viewOutput = {};
    #cursorVisible = false;
    #overviewInfoVisible = false;
    #overviewInfoElements = [];
    #highlight = null;
    #boundOnThemeChanged = this.#onThemeChanged.bind(this);
    #onPointerDownBound = this.#onPointerDown.bind(this);
    #onPointerUpBound = this.#onPointerUp.bind(this);
    #onCursorMoveBound = this.#onCursorMove.bind(this);
    #onCursorLeaveBound = this.hideCursor.bind(this);
    constructor(prefixOrElement = 'timeline', view = DEFAULT_VIEW) {
        super(prefixOrElement instanceof HTMLElement ? prefixOrElement : undefined);
        this.#prefix = typeof prefixOrElement === 'string' ? prefixOrElement : 'timeline';
        this.#view = view;
        this.overviewCalculator = new TimelineOverviewCalculator();
        this.overviewGrid = new OverviewGrid(this.#prefix, this.overviewCalculator);
        this.overviewGrid.setResizeEnabled(false);
        this.overviewGrid.addEventListener("WindowChangedWithPosition" /* OverviewGridEvents.WINDOW_CHANGED_WITH_POSITION */, this.onWindowChanged, this);
        this.overviewGrid.addEventListener("BreadcrumbAdded" /* OverviewGridEvents.BREADCRUMB_ADDED */, this.onBreadcrumbAdded, this);
        this.overviewGrid.setClickHandler(this.onClick.bind(this));
        this.overviewInfo = new OverviewInfo();
        // Render synchronously, so that the overview grid is attached before
        // `update()` measures it in `wasShown()`, and before subclasses and callers
        // show the overview controls in it.
        this.#render();
    }
    performUpdate() {
        this.#render();
    }
    #render() {
        const themeSupport = ThemeSupport.ThemeSupport.instance();
        this.#view({
            prefix: this.#prefix,
            overviewGrid: this.overviewGrid,
            overviewInfo: this.overviewInfo,
            overviewInfoElements: this.#overviewInfoElements,
            cursorPosition: this.cursorPosition,
            cursorVisible: this.#cursorVisible,
            highlight: this.#highlight,
            highlightBackgroundColor: themeSupport.getComputedValue('--color-background'),
            highlightBracketColor: themeSupport.getComputedValue('--sys-color-state-on-header-hover'),
            onPointerDown: this.#onPointerDownBound,
            onPointerUp: this.#onPointerUpBound,
            onCursorMove: this.#onCursorMoveBound,
            onCursorLeave: this.#onCursorLeaveBound,
        }, this.#viewOutput, this.contentElement);
    }
    enableCreateBreadcrumbsButton() {
        const breadcrumbsElement = this.overviewGrid.enableCreateBreadcrumbsButton();
        breadcrumbsElement.addEventListener('pointerdown', this.onMouseDown.bind(this), true);
        breadcrumbsElement.addEventListener('pointerup', this.onMouseCancel.bind(this), true);
        breadcrumbsElement.addEventListener('pointercancel', this.onMouseCancel.bind(this), true);
        breadcrumbsElement.addEventListener('pointermove', this.onMouseMove.bind(this), true);
        breadcrumbsElement.addEventListener('pointerleave', this.hideCursor.bind(this), true);
    }
    onMouseDown(event) {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        event.target.setPointerCapture(event.pointerId);
        this.#onPointerDown();
    }
    onMouseCancel(event) {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        if (event.target.hasPointerCapture(event.pointerId)) {
            event.target.releasePointerCapture(event.pointerId);
        }
        this.#onPointerUp();
    }
    onMouseMove(event) {
        if (!(event.target instanceof Element)) {
            return;
        }
        const cursorAreaLeft = this.#viewOutput.cursorAreaLeft?.() ?? 0;
        const offsetLeftRelativeToCursorArea = event.target.getBoundingClientRect().left - cursorAreaLeft;
        this.#onCursorMove(event.offsetX + offsetLeftRelativeToCursorArea);
    }
    #onPointerDown() {
        this.#overviewInfoVisible = false;
        this.overviewInfo.hide();
        this.hasPointer = true;
    }
    #onPointerUp() {
        this.#overviewInfoVisible = true;
        this.overviewInfo.show(this.#viewOutput.cursorAnchorBox?.() ?? null);
        this.hasPointer = false;
    }
    #onCursorMove(position) {
        if (!this.cursorEnabled) {
            return;
        }
        this.cursorPosition = position;
        this.#cursorVisible = true;
        this.requestUpdate();
        // Dispatch an event to notify the flame chart to show a timestamp marker for the current timestamp if it's visible
        // in the flame chart.
        const timeInMilliSeconds = this.overviewCalculator.positionToTime(this.cursorPosition);
        const timeWindow = this.overviewGrid.calculateWindowValue();
        if (Trace.Types.Timing.Milli(timeWindow.rawStartValue) <= timeInMilliSeconds &&
            timeInMilliSeconds <= Trace.Types.Timing.Milli(timeWindow.rawEndValue)) {
            const timeInMicroSeconds = Trace.Helpers.Timing.milliToMicro(timeInMilliSeconds);
            this.dispatchEventToListeners("OverviewPaneMouseMove" /* Events.OVERVIEW_PANE_MOUSE_MOVE */, { timeInMicroSeconds });
        }
        else {
            this.dispatchEventToListeners("OverviewPaneMouseLeave" /* Events.OVERVIEW_PANE_MOUSE_LEAVE */);
        }
        if (!this.hasPointer) {
            void this.updateOverviewInfo();
        }
    }
    async updateOverviewInfo() {
        this.#overviewInfoVisible = true;
        const x = this.cursorPosition;
        const elements = await Promise.all(this.overviewControls.map(control => control.overviewInfoPromise(x)));
        if (!this.#overviewInfoVisible) {
            return;
        }
        this.#overviewInfoElements = elements.filter(element => element !== null);
        this.requestUpdate();
        // The overview info is anchored to the cursor marker, so wait until it is
        // rendered at the new position.
        await this.updateComplete;
        if (!this.#overviewInfoVisible) {
            return;
        }
        this.overviewInfo.show(this.#viewOutput.cursorAnchorBox?.() ?? null);
    }
    hideCursor() {
        this.#cursorVisible = false;
        this.#overviewInfoVisible = false;
        this.#overviewInfoElements = [];
        this.requestUpdate();
        this.dispatchEventToListeners("OverviewPaneMouseLeave" /* Events.OVERVIEW_PANE_MOUSE_LEAVE */);
        this.overviewInfo.hide();
    }
    #onThemeChanged() {
        this.scheduleUpdate();
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        const start = TraceBounds.TraceBounds.BoundsManager.instance().state()?.milli.minimapTraceBounds.min;
        const end = TraceBounds.TraceBounds.BoundsManager.instance().state()?.milli.minimapTraceBounds.max;
        this.update(start, end);
        ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, this.#boundOnThemeChanged);
        this.requestUpdate();
    }
    willHide() {
        ThemeSupport.ThemeSupport.instance().removeEventListener(ThemeSupport.ThemeChangeEvent.eventName, this.#boundOnThemeChanged);
        this.#overviewInfoVisible = false;
        this.overviewInfo.hide();
        super.willHide();
    }
    onResize() {
        const width = this.element.offsetWidth;
        if (width === this.lastWidth) {
            return;
        }
        this.lastWidth = width;
        this.scheduleUpdate();
    }
    setOverviewControls(overviewControls) {
        for (let i = 0; i < this.overviewControls.length; ++i) {
            this.overviewControls[i].dispose();
        }
        for (let i = 0; i < overviewControls.length; ++i) {
            overviewControls[i].setCalculator(this.overviewCalculator);
            overviewControls[i].show(this.overviewGrid.element);
        }
        this.overviewControls = overviewControls;
        this.update();
    }
    set showingScreenshots(isShowing) {
        this.overviewGrid.showingScreenshots = isShowing;
    }
    setBounds(minimumBoundary, maximumBoundary) {
        if (minimumBoundary === this.overviewCalculator.minimumBoundary() &&
            maximumBoundary === this.overviewCalculator.maximumBoundary()) {
            return;
        }
        this.overviewCalculator.setBounds(minimumBoundary, maximumBoundary);
        this.overviewGrid.setResizeEnabled(true);
        this.cursorEnabled = true;
        this.scheduleUpdate(minimumBoundary, maximumBoundary);
    }
    setNavStartTimes(navStartTimes) {
        this.overviewCalculator.setNavStartTimes(navStartTimes);
    }
    scheduleUpdate(start, end) {
        void this.updateThrottler.schedule(async () => {
            this.update(start, end);
        });
    }
    update(start, end) {
        if (!this.isShowing()) {
            return;
        }
        this.overviewCalculator.setDisplayWidth(this.overviewGrid.clientWidth());
        for (let i = 0; i < this.overviewControls.length; ++i) {
            this.overviewControls[i].update(start, end);
        }
        this.overviewGrid.updateDividers(this.overviewCalculator);
        this.updateMarkers();
        this.updateWindow();
    }
    setMarkers(markers) {
        this.markers = markers;
    }
    /**
     * Dim the time marker outside the highlight time bounds.
     *
     * @param highlightBounds the time bounds to highlight, if it is empty, it means to highlight everything.
     */
    #dimMarkers(highlightBounds) {
        for (const time of this.markers.keys()) {
            const marker = this.markers.get(time);
            if (!marker) {
                continue;
            }
            const timeInMicroSeconds = Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(time));
            const dim = highlightBounds && !Trace.Helpers.Timing.timestampIsInBounds(highlightBounds, timeInMicroSeconds);
            // `filter: grayscale(1)`  will make the element fully completely grayscale.
            marker.style.filter = `grayscale(${dim ? 1 : 0})`;
        }
    }
    updateMarkers() {
        const filteredMarkers = new Map();
        for (const time of this.markers.keys()) {
            const marker = this.markers.get(time);
            const position = Math.round(this.overviewCalculator.computePosition(Trace.Types.Timing.Milli(time)));
            // Limit the number of markers to one per pixel.
            if (filteredMarkers.has(position)) {
                continue;
            }
            filteredMarkers.set(position, marker);
            marker.style.left = position + 'px';
        }
        this.overviewGrid.removeEventDividers();
        this.overviewGrid.addEventDividers([...filteredMarkers.values()]);
    }
    reset() {
        this.windowStartTime = Trace.Types.Timing.Milli(0);
        this.windowEndTime = Trace.Types.Timing.Milli(Infinity);
        this.overviewCalculator.reset();
        this.overviewGrid.reset();
        this.overviewGrid.setResizeEnabled(false);
        this.cursorEnabled = false;
        this.hideCursor();
        this.markers = new Map();
        for (const control of this.overviewControls) {
            control.reset();
        }
        this.#overviewInfoVisible = false;
        this.#overviewInfoElements = [];
        this.overviewInfo.hide();
        this.scheduleUpdate();
    }
    onClick(event) {
        return this.overviewControls.some(control => control.onClick(event));
    }
    onBreadcrumbAdded() {
        this.dispatchEventToListeners("OverviewPaneBreadcrumbAdded" /* Events.OVERVIEW_PANE_BREADCRUMB_ADDED */, {
            startTime: Trace.Types.Timing.Milli(this.windowStartTime),
            endTime: Trace.Types.Timing.Milli(this.windowEndTime),
        });
    }
    onWindowChanged(event) {
        if (this.muteOnWindowChanged) {
            return;
        }
        // Always use first control as a time converter.
        if (!this.overviewControls.length) {
            return;
        }
        this.windowStartTime = Trace.Types.Timing.Milli(event.data.rawStartValue === this.overviewCalculator.minimumBoundary() ? 0 : event.data.rawStartValue);
        this.windowEndTime = Trace.Types.Timing.Milli(event.data.rawEndValue === this.overviewCalculator.maximumBoundary() ? Infinity : event.data.rawEndValue);
        const windowTimes = {
            startTime: Trace.Types.Timing.Milli(this.windowStartTime),
            endTime: Trace.Types.Timing.Milli(this.windowEndTime),
        };
        this.dispatchEventToListeners("OverviewPaneWindowChanged" /* Events.OVERVIEW_PANE_WINDOW_CHANGED */, windowTimes);
    }
    setWindowTimes(startTime, endTime) {
        if (startTime === this.windowStartTime && endTime === this.windowEndTime) {
            return;
        }
        this.windowStartTime = startTime;
        this.windowEndTime = endTime;
        this.updateWindow();
    }
    updateWindow() {
        if (!this.overviewControls.length) {
            return;
        }
        const absoluteMin = this.overviewCalculator.minimumBoundary();
        const timeSpan = this.overviewCalculator.maximumBoundary() - absoluteMin;
        const haveRecords = absoluteMin > 0;
        const left = haveRecords && this.windowStartTime ? Math.min((this.windowStartTime - absoluteMin) / timeSpan, 1) : 0;
        const right = haveRecords && this.windowEndTime < Infinity ? (this.windowEndTime - absoluteMin) / timeSpan : 1;
        this.muteOnWindowChanged = true;
        this.overviewGrid.setWindowRatio(left, right);
        this.muteOnWindowChanged = false;
    }
    /**
     * Desaturates the overview outside of the given time bounds.
     *
     * @param bounds the time bounds to keep saturated.
     * @param withBracket whether to draw a bracket above the time bounds.
     */
    highlightBounds(bounds, withBracket) {
        this.#dimMarkers(bounds);
        this.#highlight = {
            left: this.overviewCalculator.computePosition(Trace.Helpers.Timing.microToMilli(bounds.min)),
            right: this.overviewCalculator.computePosition(Trace.Helpers.Timing.microToMilli(bounds.max)),
            withBracket,
        };
        this.requestUpdate();
    }
    clearBoundsHighlight() {
        this.#dimMarkers();
        this.#highlight = null;
        this.requestUpdate();
    }
}
export var Events;
(function (Events) {
    Events["OVERVIEW_PANE_WINDOW_CHANGED"] = "OverviewPaneWindowChanged";
    Events["OVERVIEW_PANE_BREADCRUMB_ADDED"] = "OverviewPaneBreadcrumbAdded";
    Events["OVERVIEW_PANE_MOUSE_MOVE"] = "OverviewPaneMouseMove";
    Events["OVERVIEW_PANE_MOUSE_LEAVE"] = "OverviewPaneMouseLeave";
})(Events || (Events = {}));
export class TimelineOverviewBase extends UI.Widget.VBox {
    #calculator;
    canvas;
    #context;
    constructor(elementOrOptions, options) {
        if (elementOrOptions instanceof HTMLElement) {
            super(elementOrOptions, options);
        }
        else {
            super(elementOrOptions ?? options);
        }
        this.#calculator = null;
        // Subclasses (such as `TimelineEventOverview`) render their own Lit content
        // into `this.element`, so the base class cannot render the canvas with Lit.
        // eslint-disable-next-line @devtools/no-imperative-dom-api
        this.canvas = this.element.createChild('canvas', 'fill');
        this.#context = this.canvas.getContext('2d');
    }
    width() {
        return this.canvas.width;
    }
    height() {
        return this.canvas.height;
    }
    context() {
        if (!this.#context) {
            throw new Error('Unable to retrieve canvas context');
        }
        return this.#context;
    }
    calculator() {
        return this.#calculator;
    }
    update() {
        throw new Error('Not implemented');
    }
    dispose() {
        this.detach();
    }
    reset() {
    }
    async overviewInfoPromise(_x) {
        return null;
    }
    setCalculator(calculator) {
        this.#calculator = calculator;
    }
    onClick(_event) {
        return false;
    }
    resetCanvas() {
        if (this.element.clientWidth) {
            this.setCanvasSize(this.element.clientWidth, this.element.clientHeight);
        }
    }
    setCanvasSize(width, height) {
        this.canvas.width = width * window.devicePixelRatio;
        this.canvas.height = height * window.devicePixelRatio;
    }
}
export class OverviewInfo {
    #glassPane;
    contentRoot;
    constructor() {
        this.#glassPane = new UI.GlassPane.GlassPane();
        this.#glassPane.setPointerEventsBehavior("PierceContents" /* UI.GlassPane.PointerEventsBehavior.PIERCE_CONTENTS */);
        this.#glassPane.setMarginBehavior("DefaultMargin" /* UI.GlassPane.MarginBehavior.DEFAULT_MARGIN */);
        this.#glassPane.setSizeBehavior("MeasureContent" /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */);
        this.contentRoot = UI.UIUtils.createShadowRootWithCoreStyles(this.#glassPane.contentElement, { cssFile: timelineOverviewInfoStyles });
    }
    show(anchorBox) {
        this.#glassPane.setContentAnchorBox(anchorBox);
        if (!this.#glassPane.isShowing()) {
            this.#glassPane.show(window.document);
        }
    }
    hide() {
        this.#glassPane.hide();
    }
}
//# sourceMappingURL=TimelineOverviewPane.js.map