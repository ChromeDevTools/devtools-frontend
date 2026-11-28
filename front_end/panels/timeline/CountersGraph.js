// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as SettingUIRegistration from '../../ui/settings/settings.js';
const { bindToSetting } = UI.UIUtils;
const { ref, styleMap } = Directives;
const UIStrings = {
    /**
     * @description Label for the JS heap counter in the counters graph of the Performance panel.
     */
    jsHeap: 'JS heap',
    /**
     * @description Label for the documents counter in the counters graph of the Performance panel.
     */
    documents: 'Documents',
    /**
     * @description Label for the DOM nodes counter in the counters graph of the Performance panel.
     */
    nodes: 'Nodes',
    /**
     * @description Label for the event listeners counter in the counters graph of the Performance panel.
     */
    listeners: 'Listeners',
    /**
     * @description Label for the GPU memory counter in the counters graph of the Performance panel.
     */
    gpuMemory: 'GPU memory',
    /**
     * @description Label for a counter checkbox with its min-max value range in the Performance panel.
     * @example {JS heap} PH1
     * @example {704 kB} PH2
     * @example {5.5 MB} PH3
     */
    counterRange: '{PH1} [{PH2} – {PH3}]',
    /**
     * @description Current value text for a counter at the hovered timestamp in the Performance panel.
     * @example {JS heap} PH1
     * @example {1.5 MB} PH2
     */
    counterCurrentValue: '{PH1}: {PH2}',
    /**
     * @description Message displayed when no memory usage data is found in the counters graph of the Performance panel.
     */
    noEventsFound: 'No memory usage data found within selected events',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/CountersGraph.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const DEFAULT_CANVAS_WIDTH = 300;
const DEFAULT_CANVAS_HEIGHT = 150;
export class CountersGraph extends UI.Widget.VBox {
    delegate;
    #headerElement;
    #canvas;
    calculator;
    counters;
    counterUI;
    countersByName;
    #parsedTrace = null;
    #events = null;
    markerXPosition;
    #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
    #showNoEventsMessage = false;
    #needsResize = false;
    #needsCanvasRedraw = true;
    #dividerPositions = [];
    #defaultNumberFormatter;
    constructor(delegateOrElement) {
        super(delegateOrElement instanceof HTMLElement ? delegateOrElement : undefined);
        this.#defaultNumberFormatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale);
        if (delegateOrElement && !(delegateOrElement instanceof HTMLElement)) {
            this.delegate = delegateOrElement;
        }
        this.calculator = new Calculator();
        this.counters = [];
        this.counterUI = [];
        this.countersByName = new Map();
        this.countersByName.set('jsHeapSizeUsed', this.createCounter(i18nString(UIStrings.jsHeap), Common.Settings.Settings.instance().resolve(SettingUIRegistration.TimelineSettings.timelineCountersGraphJsHeapSizeUsedSettingDescriptor), 'hsl(220, 90%, 43%)', i18n.ByteUtilities.bytesToString));
        this.countersByName.set('documents', this.createCounter(i18nString(UIStrings.documents), Common.Settings.Settings.instance().resolve(SettingUIRegistration.TimelineSettings.timelineCountersGraphDocumentsSettingDescriptor), 'hsl(0, 90%, 43%)'));
        this.countersByName.set('nodes', this.createCounter(i18nString(UIStrings.nodes), Common.Settings.Settings.instance().resolve(SettingUIRegistration.TimelineSettings.timelineCountersGraphNodesSettingDescriptor), 'hsl(120, 90%, 43%)'));
        this.countersByName.set('jsEventListeners', this.createCounter(i18nString(UIStrings.listeners), Common.Settings.Settings.instance().resolve(SettingUIRegistration.TimelineSettings.timelineCountersGraphJsEventListenersSettingDescriptor), 'hsl(38, 90%, 43%)'));
        this.countersByName.set('gpuMemoryUsedKB', this.createCounter(i18nString(UIStrings.gpuMemory), Common.Settings.Settings.instance().resolve(SettingUIRegistration.TimelineSettings.timelineCountersGraphGpuMemoryUsedKbSettingDescriptor), 'hsl(300, 90%, 43%)', i18n.ByteUtilities.bytesToString));
        TraceBounds.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
    }
    wasShown() {
        super.wasShown();
        this.#needsCanvasRedraw = true;
        this.requestUpdate();
    }
    onResize() {
        this.#resize();
    }
    #onTraceBoundsChange(event) {
        if (event.updateType === 'RESET' || event.updateType === 'VISIBLE_WINDOW') {
            const newWindow = event.state.milli.timelineTraceWindow;
            this.calculator.setWindow(newWindow.min, newWindow.max);
            this.refresh();
        }
    }
    set model(data) {
        if (this.#parsedTrace === data.parsedTrace && this.#events === data.events) {
            return;
        }
        this.setModel(data.parsedTrace, data.events);
    }
    setModel(parsedTrace, events) {
        this.#parsedTrace = parsedTrace;
        this.#events = events;
        if (!events || !parsedTrace) {
            return;
        }
        const minTime = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.data.Meta.traceBounds).min;
        this.calculator.setZeroTime(minTime);
        for (let i = 0; i < this.counters.length; ++i) {
            this.counters[i].reset();
            this.counterUI[i].reset();
        }
        this.refresh();
        let counterEventsFound = 0;
        for (let i = 0; i < events.length; ++i) {
            const event = events[i];
            if (!Trace.Types.Events.isUpdateCounters(event)) {
                continue;
            }
            counterEventsFound++;
            const counters = event.args.data;
            if (!counters) {
                return;
            }
            const { startTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
            const counterKeys = ['jsHeapSizeUsed', 'documents', 'nodes', 'jsEventListeners'];
            for (const name of counterKeys) {
                const counter = this.countersByName.get(name);
                const value = counters[name];
                if (counter && typeof value === 'number') {
                    counter.appendSample(startTime, value);
                }
            }
        }
        this.#showNoEventsMessage = counterEventsFound === 0;
        this.refresh();
    }
    createCounter(uiName, setting, color, formatter) {
        const counter = new Counter();
        this.counters.push(counter);
        this.counterUI.push(new CounterUI(uiName, setting, color, counter, formatter ?? this.#defaultNumberFormatter.format));
        return counter;
    }
    resizerElement() {
        if (!this.#headerElement) {
            // TimelineFlameChartView installs the split-widget resizer synchronously
            // after constructing CountersGraph, before wasShown() runs.
            this.performUpdate();
        }
        return this.#headerElement;
    }
    #updateCanvasSize() {
        const canvas = this.#canvas;
        const parentElement = canvas?.parentElement;
        if (!canvas || !parentElement) {
            return;
        }
        canvas.width = parentElement.clientWidth * window.devicePixelRatio;
        canvas.height = parentElement.clientHeight * window.devicePixelRatio;
        this.calculator.setDisplayWidth(canvas.width);
        this.#needsResize = false;
        this.#needsCanvasRedraw = true;
    }
    #resize() {
        if (!this.#canvas) {
            this.#needsResize = true;
            return;
        }
        this.#updateCanvasSize();
        this.refresh();
    }
    #calculateDividerPositions() {
        const clientWidth = this.calculator.computePosition(this.calculator.maximumBoundary());
        if (!clientWidth || !Number.isFinite(clientWidth)) {
            return [];
        }
        const { offsets } = PerfUI.TimelineGrid.TimelineGrid.calculateGridOffsets(this.calculator);
        return offsets.map(offset => 100 * offset.position / clientWidth);
    }
    #recalculateGraphData() {
        const canvasWidth = this.#canvas?.width || DEFAULT_CANVAS_WIDTH * window.devicePixelRatio;
        const canvasHeight = this.#canvas?.height || DEFAULT_CANVAS_HEIGHT * window.devicePixelRatio;
        for (const counter of this.counters) {
            counter.calculateVisibleIndexes(this.calculator);
            counter.calculateXValues(canvasWidth);
        }
        for (const counterUI of this.counterUI) {
            counterUI.calculateYValues(canvasHeight);
        }
        this.#dividerPositions = this.#calculateDividerPositions();
    }
    #renderContent() {
        const handleMouseMove = (e) => this.onMouseMove(e.x - e.currentTarget.getBoundingClientRect().left);
        const handleClick = (e) => this.onClick(e.x - e.currentTarget.getBoundingClientRect().left);
        // clang-format off
        render(html `
      <div class="hbox timeline-memory-header"
          ${ref(el => { this.#headerElement = el instanceof HTMLElement ? el : undefined; })}>
        <devtools-toolbar class="timeline-memory-toolbar">
          ${this.counterUI.map(c => html `
            <devtools-checkbox title=${c.label} aria-label=${c.label}
                style=${styleMap({ backgroundColor: c.filterColor ?? undefined, borderColor: c.filterColor ? 'transparent' : undefined })}
                ${bindToSetting(c.setting)} @change=${() => this.refresh()}>${c.label}</devtools-checkbox>`)}
        </devtools-toolbar>
      </div>
      <div class="vbox flex-auto">
        <div id="memory-graphs-canvas-container" class="vbox flex-auto"
            @mouseover=${handleMouseMove} @mousemove=${handleMouseMove}
            @mouseleave=${() => this.onMouseLeave()} @click=${handleClick}>
          <canvas id="memory-counters-graph"
              ${ref(el => { this.#canvas = el instanceof HTMLCanvasElement ? el : undefined; })}></canvas>
          <div class="no-events-found" ?hidden=${!this.#showNoEventsMessage}>
            <p>${i18nString(UIStrings.noEventsFound)}</p>
          </div>
          <div class="resources-dividers">
            ${this.#dividerPositions.map(pos => html `
              <div class="resources-divider" style=${styleMap({ left: `${pos}%` })}></div>`)}
          </div>
          ${this.counterUI.map(c => html `
            <div class="memory-counter-marker" ?hidden=${!c.markerPosition}
                style=${styleMap({ backgroundColor: c.graphColor,
            left: c.markerPosition ? `${c.markerPosition.x}px` : undefined,
            top: c.markerPosition ? `${c.markerPosition.y}px` : undefined })}></div>`)}
        </div>
        <div id="counter-values-bar">
          ${this.counterUI.map(c => html `
            <span class="memory-counter-value" ?hidden=${!c.visible()}
                style=${styleMap({ color: c.graphColor })}>${c.currentValueText}</span>`)}
        </div>
      </div>`, this.contentElement, { container: { attributes: { id: 'memory-graphs-container' } } });
        // clang-format on
    }
    performUpdate() {
        if (this.#needsResize && this.#canvas) {
            this.#updateCanvasSize();
        }
        const shouldRedraw = this.#needsCanvasRedraw;
        if (shouldRedraw) {
            this.#needsCanvasRedraw = false;
            this.#recalculateGraphData();
        }
        this.refreshCurrentValues();
        this.#renderContent();
        if (this.#needsResize && this.#canvas) {
            this.#updateCanvasSize();
            this.#needsCanvasRedraw = false;
            this.#recalculateGraphData();
            this.refreshCurrentValues();
            this.#renderContent();
            this.draw();
            return;
        }
        if (shouldRedraw) {
            this.draw();
        }
    }
    draw() {
        const canvas = this.#canvas;
        if (!canvas) {
            return;
        }
        this.clear();
        for (const counterUI of this.counterUI) {
            counterUI.drawGraph(canvas);
        }
    }
    onClick(x) {
        let minDistance = Infinity;
        let bestTime;
        for (const counterUI of this.counterUI) {
            if (!counterUI.counter.times.length) {
                continue;
            }
            const index = counterUI.recordIndexAt(x);
            const distance = Math.abs(x * window.devicePixelRatio - counterUI.counter.x[index]);
            if (distance < minDistance) {
                minDistance = distance;
                bestTime = counterUI.counter.times[index];
            }
        }
        if (bestTime !== undefined && this.#events) {
            this.delegate?.selectEntryAtTime(this.#events, bestTime);
        }
    }
    onMouseLeave() {
        this.markerXPosition = undefined;
        this.clearCurrentValueAndMarker();
        this.requestUpdate();
    }
    clearCurrentValueAndMarker() {
        for (let i = 0; i < this.counterUI.length; i++) {
            this.counterUI[i].clearCurrentValueAndMarker();
        }
    }
    onMouseMove(x) {
        this.markerXPosition = x;
        this.requestUpdate();
    }
    refreshCurrentValues() {
        if (this.markerXPosition === undefined) {
            return;
        }
        for (let i = 0; i < this.counterUI.length; ++i) {
            this.counterUI[i].updateCurrentValue(this.markerXPosition);
        }
    }
    refresh() {
        this.#needsCanvasRedraw = true;
        this.requestUpdate();
    }
    clear() {
        const canvas = this.#canvas;
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Unable to get canvas context');
        }
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
}
export class Counter {
    times;
    values;
    x;
    minimumIndex;
    maximumIndex;
    #maxTime;
    #minTime;
    limitValue;
    constructor() {
        this.times = [];
        this.values = [];
        this.x = [];
        this.minimumIndex = 0;
        this.maximumIndex = 0;
        this.#maxTime = 0;
        this.#minTime = 0;
    }
    appendSample(time, value) {
        if (this.values.length && this.values[this.values.length - 1] === value) {
            return;
        }
        this.times.push(time);
        this.values.push(value);
    }
    reset() {
        this.times = [];
        this.values = [];
    }
    setLimit(value) {
        this.limitValue = value;
    }
    calculateBounds() {
        let maxValue;
        let minValue;
        for (let i = this.minimumIndex; i <= this.maximumIndex; i++) {
            const value = this.values[i];
            if (minValue === undefined || value < minValue) {
                minValue = value;
            }
            if (maxValue === undefined || value > maxValue) {
                maxValue = value;
            }
        }
        minValue = minValue || 0;
        maxValue = maxValue || 1;
        if (this.limitValue) {
            if (maxValue > this.limitValue * 0.5) {
                maxValue = Math.max(maxValue, this.limitValue);
            }
            minValue = Math.min(minValue, this.limitValue);
        }
        return { min: minValue, max: maxValue };
    }
    calculateVisibleIndexes(calculator) {
        const start = calculator.minimumBoundary();
        const end = calculator.maximumBoundary();
        // Maximum index of element whose time <= start.
        this.minimumIndex = Platform.NumberUtilities.clamp(Platform.ArrayUtilities.upperBound(this.times, start, Platform.ArrayUtilities.DEFAULT_COMPARATOR) - 1, 0, this.times.length - 1);
        // Minimum index of element whose time >= end.
        this.maximumIndex = Platform.NumberUtilities.clamp(Platform.ArrayUtilities.lowerBound(this.times, end, Platform.ArrayUtilities.DEFAULT_COMPARATOR), 0, this.times.length - 1);
        // Current window bounds.
        this.#minTime = start;
        this.#maxTime = end;
    }
    calculateXValues(width) {
        if (!this.values.length) {
            return;
        }
        const xFactor = width / (this.#maxTime - this.#minTime);
        this.x = new Array(this.values.length);
        for (let i = this.minimumIndex + 1; i <= this.maximumIndex; i++) {
            this.x[i] = xFactor * (this.times[i] - this.#minTime);
        }
    }
}
export class CounterUI {
    counter;
    formatter;
    setting;
    graphColor;
    limitColor;
    filterColor;
    graphYValues;
    #scale = null;
    verticalPadding;
    counterName;
    label;
    currentValueText = '';
    markerPosition = null;
    constructor(title, setting, graphColor, counter, formatter) {
        this.counter = counter;
        this.formatter = formatter;
        this.setting = setting;
        const parsedColor = Common.Color.parse(graphColor);
        if (parsedColor) {
            this.filterColor = parsedColor.setAlpha(0.5).asString("rgba" /* Common.Color.Format.RGBA */);
            this.limitColor = parsedColor.setAlpha(0.3).asString("rgba" /* Common.Color.Format.RGBA */);
        }
        this.graphColor = graphColor;
        this.graphYValues = [];
        this.verticalPadding = 10;
        this.counterName = title;
        this.label = title;
        this.clearCurrentValueAndMarker();
    }
    reset() {
        this.label = this.counterName;
        this.graphYValues = [];
        this.#scale = null;
        this.clearCurrentValueAndMarker();
    }
    setRange(minValue, maxValue) {
        const min = this.formatter(minValue);
        const max = this.formatter(maxValue);
        this.label = i18nString(UIStrings.counterRange, { PH1: this.counterName, PH2: min, PH3: max });
    }
    calculateYValues(canvasHeight) {
        const height = canvasHeight - 2 * this.verticalPadding;
        if (height <= 0) {
            this.graphYValues = [];
            this.#scale = null;
            return null;
        }
        const counter = this.counter;
        const values = counter.values;
        if (!values.length) {
            this.graphYValues = [];
            this.#scale = null;
            return null;
        }
        const bounds = counter.calculateBounds();
        const minValue = bounds.min;
        const maxValue = bounds.max;
        this.setRange(minValue, maxValue);
        if (!this.visible()) {
            this.graphYValues = [];
            this.#scale = null;
            return null;
        }
        const originY = this.verticalPadding;
        const yValues = this.graphYValues;
        const maxYRange = maxValue - minValue;
        const yFactor = maxYRange ? height / maxYRange : 1;
        let value = values[counter.minimumIndex];
        let i = counter.minimumIndex;
        for (; i <= counter.maximumIndex; i++) {
            const currentValue = values[i];
            if (typeof currentValue !== 'undefined') {
                value = currentValue;
            }
            yValues[i] = Math.round(originY + height - (value - minValue) * yFactor);
        }
        yValues.length = i;
        this.#scale = { minValue, yFactor };
        return this.#scale;
    }
    recordIndexAt(x) {
        return Platform.ArrayUtilities.upperBound(this.counter.x, x * window.devicePixelRatio, Platform.ArrayUtilities.DEFAULT_COMPARATOR, this.counter.minimumIndex + 1, this.counter.maximumIndex + 1) -
            1;
    }
    updateCurrentValue(x) {
        if (!this.visible() || !this.counter.values.length || !this.counter.x) {
            this.clearCurrentValueAndMarker();
            return;
        }
        const index = this.recordIndexAt(x);
        const value = this.formatter(this.counter.values[index]);
        this.currentValueText = i18nString(UIStrings.counterCurrentValue, { PH1: this.counterName, PH2: value });
        const y = this.graphYValues[index] / window.devicePixelRatio;
        this.markerPosition = { x, y };
    }
    clearCurrentValueAndMarker() {
        this.currentValueText = '';
        this.markerPosition = null;
    }
    drawGraph(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Unable to get canvas context');
        }
        const scale = this.#scale;
        const counter = this.counter;
        const yValues = this.graphYValues;
        if (!scale || !yValues.length) {
            return;
        }
        const width = canvas.width;
        const height = canvas.height - 2 * this.verticalPadding;
        const originY = this.verticalPadding;
        const { minValue, yFactor } = scale;
        ctx.save();
        ctx.lineWidth = window.devicePixelRatio;
        if (ctx.lineWidth % 2) {
            ctx.translate(0.5, 0.5);
        }
        ctx.beginPath();
        let currentY = yValues[counter.minimumIndex];
        ctx.moveTo(0, currentY);
        for (let i = counter.minimumIndex; i <= counter.maximumIndex; i++) {
            const x = Math.round(counter.x[i]);
            ctx.lineTo(x, currentY);
            currentY = yValues[i];
            ctx.lineTo(x, currentY);
        }
        ctx.lineTo(width, currentY);
        ctx.strokeStyle = this.graphColor;
        ctx.stroke();
        if (counter.limitValue) {
            const limitLineY = Math.round(originY + height - (counter.limitValue - minValue) * yFactor);
            ctx.moveTo(0, limitLineY);
            ctx.lineTo(width, limitLineY);
            if (this.limitColor) {
                ctx.strokeStyle = this.limitColor;
            }
            ctx.stroke();
        }
        ctx.closePath();
        ctx.restore();
    }
    visible() {
        return this.setting.get();
    }
}
export class Calculator {
    #minimumBoundary = 0;
    #maximumBoundary = 0;
    #workingArea = 0;
    #zeroTime = 0;
    setZeroTime(time) {
        this.#zeroTime = time;
    }
    computePosition(time) {
        return (time - this.#minimumBoundary) / this.boundarySpan() * this.#workingArea;
    }
    setWindow(minimumBoundary, maximumBoundary) {
        this.#minimumBoundary = minimumBoundary;
        this.#maximumBoundary = maximumBoundary;
    }
    setDisplayWidth(clientWidth) {
        this.#workingArea = clientWidth;
    }
    formatValue(value, precision) {
        return i18n.TimeUtilities.preciseMillisToString(value - this.zeroTime(), precision);
    }
    maximumBoundary() {
        return this.#maximumBoundary;
    }
    minimumBoundary() {
        return this.#minimumBoundary;
    }
    zeroTime() {
        return this.#zeroTime;
    }
    boundarySpan() {
        return this.#maximumBoundary - this.#minimumBoundary;
    }
}
//# sourceMappingURL=CountersGraph.js.map