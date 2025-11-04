// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
const UIStrings = {
    /**
     * @description Short for Network. Label for the network requests section of the Performance panel.
     */
    net: 'NET',
    /**
     * @description Text in Timeline Event Overview of the Performance panel
     */
    cpu: 'CPU',
    /**
     * @description Text in Timeline Event Overview of the Performance panel
     */
    heap: 'HEAP',
    /**
     * @description Heap size label text content in Timeline Event Overview of the Performance panel
     * @example {10 MB} PH1
     * @example {30 MB} PH2
     */
    sSDash: '{PH1} – {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineEventOverview.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineEventOverview extends PerfUI.TimelineOverviewPane.TimelineOverviewBase {
    constructor(id, title) {
        super();
        this.element.id = 'timeline-overview-' + id;
        this.element.classList.add('overview-strip');
        if (title) {
            this.element.createChild('div', 'timeline-overview-strip-title').textContent = title;
        }
    }
    renderBar(begin, end, position, height, color) {
        const x = begin;
        const width = end - begin;
        const ctx = this.context();
        ctx.fillStyle = color;
        ctx.fillRect(x, position, width, height);
    }
}
export class TimelineEventOverviewNetwork extends TimelineEventOverview {
    #parsedTrace;
    constructor(parsedTrace) {
        super('network', i18nString(UIStrings.net));
        this.#parsedTrace = parsedTrace;
    }
    update(start, end) {
        this.resetCanvas();
        this.#renderWithParsedTrace(start, end);
    }
    #renderWithParsedTrace(start, end) {
        if (!this.#parsedTrace) {
            return;
        }
        // Because the UI is in milliseconds, we work with milliseconds through
        // this function to get the right scale and sizing
        const traceBoundsMilli = (start && end) ?
            {
                min: start,
                max: end,
                range: end - start,
            } :
            Trace.Helpers.Timing.traceWindowMilliSeconds(this.#parsedTrace.data.Meta.traceBounds);
        // We draw two paths, so each can take up half the height
        const pathHeight = this.height() / 2;
        const canvasWidth = this.width();
        const scale = canvasWidth / traceBoundsMilli.range;
        // We draw network requests in two chunks:
        // Requests with a priority of Medium or higher go onto the first path
        // Other requests go onto the second path.
        const highPath = new Path2D();
        const lowPath = new Path2D();
        for (const request of this.#parsedTrace.data.NetworkRequests.byTime) {
            const path = Trace.Helpers.Network.isSyntheticNetworkRequestHighPriority(request) ? highPath : lowPath;
            const { startTime, endTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(request);
            const rectStart = Math.max(Math.floor((startTime - traceBoundsMilli.min) * scale), 0);
            const rectEnd = Math.min(Math.ceil((endTime - traceBoundsMilli.min) * scale + 1), canvasWidth);
            path.rect(rectStart, 0, rectEnd - rectStart, pathHeight - 1);
        }
        const ctx = this.context();
        ctx.save();
        // Draw the high path onto the canvas.
        ctx.fillStyle = 'hsl(214, 60%, 60%)';
        ctx.fill(highPath);
        // Now jump down by the height of the high path, and then draw the low path.
        ctx.translate(0, pathHeight);
        ctx.fillStyle = 'hsl(214, 80%, 80%)';
        ctx.fill(lowPath);
        ctx.restore();
    }
}
const categoryToIndex = new WeakMap();
export class TimelineEventOverviewCPUActivity extends TimelineEventOverview {
    backgroundCanvas;
    #parsedTrace;
    #drawn = false;
    #start;
    #end;
    constructor(parsedTrace) {
        // During the sync tracks migration this component can use either legacy
        // Performance Model data or the new engine's data. Once the migration is
        // complete this will be updated to only use the new engine and mentions of
        // the PerformanceModel will be removed.
        super('cpu-activity', i18nString(UIStrings.cpu));
        this.#parsedTrace = parsedTrace;
        this.backgroundCanvas = this.element.createChild('canvas', 'fill background');
        this.#start = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.data.Meta.traceBounds).min;
        this.#end = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.data.Meta.traceBounds).max;
    }
    #entryCategory(entry) {
        // Special case: in CPU Profiles we get a lot of ProfileCalls that
        // represent Idle time. We typically represent ProfileCalls in the
        // Scripting Category, but if they represent idle time, we do not want
        // that.
        if (Trace.Types.Events.isProfileCall(entry) && entry.callFrame.functionName === '(idle)') {
            return Trace.Styles.EventCategory.IDLE;
        }
        if (Trace.Types.Events.isProfileCall(entry) && entry.callFrame.functionName === '(program)') {
            return Trace.Styles.EventCategory.OTHER;
        }
        const eventStyle = Trace.Styles.getEventStyle(entry.name)?.category ||
            Trace.Styles.getCategoryStyles().other;
        const categoryName = eventStyle.name;
        return categoryName;
    }
    resetCanvas() {
        super.resetCanvas();
        this.#drawn = false;
        this.backgroundCanvas.width = this.element.clientWidth * window.devicePixelRatio;
        this.backgroundCanvas.height = this.element.clientHeight * window.devicePixelRatio;
    }
    #draw(parsedTrace) {
        const quantSizePx = 4 * window.devicePixelRatio;
        const width = this.width();
        const height = this.height();
        const baseLine = height;
        const timeRange = this.#end - this.#start;
        const scale = width / timeRange;
        const quantTime = quantSizePx / scale;
        const categories = Trace.Styles.getCategoryStyles();
        const categoryOrder = Trace.Styles.getTimelineMainEventCategories();
        const otherIndex = categoryOrder.indexOf(Trace.Styles.EventCategory.OTHER);
        const idleIndex = 0;
        console.assert(idleIndex === categoryOrder.indexOf(Trace.Styles.EventCategory.IDLE));
        for (let i = 0; i < categoryOrder.length; ++i) {
            categoryToIndex.set(categories[categoryOrder[i]], i);
        }
        const drawThreadEntries = (context, threadData) => {
            const quantizer = new Quantizer(this.#start, quantTime, drawSample);
            let x = 0;
            const categoryIndexStack = [];
            const paths = [];
            const lastY = [];
            for (let i = 0; i < categoryOrder.length; ++i) {
                paths[i] = new Path2D();
                paths[i].moveTo(0, height);
                lastY[i] = height;
            }
            function drawSample(counters) {
                let y = baseLine;
                for (let i = idleIndex + 1; i < categoryOrder.length; ++i) {
                    const h = (counters[i] || 0) / quantTime * height;
                    y -= h;
                    paths[i].bezierCurveTo(x, lastY[i], x, y, x + quantSizePx / 2, y);
                    lastY[i] = y;
                }
                x += quantSizePx;
            }
            const onEntryStart = (entry) => {
                const category = this.#entryCategory(entry);
                if (!category || category === 'idle') {
                    // Idle event won't show in CPU activity, so just skip them.
                    return;
                }
                const startTimeMilli = Trace.Helpers.Timing.microToMilli(entry.ts);
                const index = categoryIndexStack.length ? categoryIndexStack[categoryIndexStack.length - 1] : idleIndex;
                quantizer.appendInterval(startTimeMilli, index);
                const categoryIndex = categoryOrder.indexOf(category);
                categoryIndexStack.push(categoryIndex || otherIndex);
            };
            function onEntryEnd(entry) {
                const endTimeMilli = Trace.Helpers.Timing.microToMilli(entry.ts) +
                    Trace.Helpers.Timing.microToMilli(Trace.Types.Timing.Micro(entry.dur || 0));
                const lastCategoryIndex = categoryIndexStack.pop();
                if (endTimeMilli !== undefined && lastCategoryIndex) {
                    quantizer.appendInterval(endTimeMilli, lastCategoryIndex);
                }
            }
            const startMicro = Trace.Helpers.Timing.milliToMicro(this.#start);
            const endMicro = Trace.Helpers.Timing.milliToMicro(this.#end);
            const bounds = {
                min: startMicro,
                max: endMicro,
                range: Trace.Types.Timing.Micro(endMicro - startMicro),
            };
            // Filter out tiny events - they don't make a visual impact to the
            // canvas as they are so small, but they do impact the time it takes
            // to walk the tree and render the events.
            // However, if the entire range we are showing is 200ms or less, then show all events.
            const minDuration = Trace.Types.Timing.Micro(bounds.range > 200_000 ? 16_000 : 0);
            Trace.Helpers.TreeHelpers.walkEntireTree(threadData.entryToNode, threadData.tree, onEntryStart, onEntryEnd, bounds, minDuration);
            quantizer.appendInterval(this.#start + timeRange + quantTime, idleIndex); // Kick drawing the last bucket.
            for (let i = categoryOrder.length - 1; i > 0; --i) {
                paths[i].lineTo(width, height);
                const computedColorValue = ThemeSupport.ThemeSupport.instance().getComputedValue(categories[categoryOrder[i]].cssVariable);
                context.fillStyle = computedColorValue;
                context.fill(paths[i]);
                context.strokeStyle = 'white';
                context.lineWidth = 1;
                context.stroke(paths[i]);
            }
        };
        const backgroundContext = (this.backgroundCanvas.getContext('2d'));
        if (!backgroundContext) {
            throw new Error('Could not find 2d canvas');
        }
        const threads = Trace.Handlers.Threads.threadsInTrace(parsedTrace.data);
        const mainThreadContext = this.context();
        for (const thread of threads) {
            // We treat CPU_PROFILE as main thread because in a CPU Profile trace there is only ever one thread.
            const isMainThread = thread.type === "MAIN_THREAD" /* Trace.Handlers.Threads.ThreadType.MAIN_THREAD */ ||
                thread.type === "CPU_PROFILE" /* Trace.Handlers.Threads.ThreadType.CPU_PROFILE */;
            if (isMainThread) {
                drawThreadEntries(mainThreadContext, thread);
            }
            else {
                drawThreadEntries(backgroundContext, thread);
            }
        }
        function applyPattern(ctx) {
            const step = 4 * window.devicePixelRatio;
            ctx.save();
            ctx.lineWidth = step / Math.sqrt(8);
            for (let x = 0.5; x < width + height; x += step) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x - height, height);
            }
            ctx.globalCompositeOperation = 'destination-out';
            ctx.stroke();
            ctx.restore();
        }
        applyPattern(backgroundContext);
    }
    update() {
        const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
        const bounds = traceBoundsState?.milli.minimapTraceBounds;
        if (!bounds) {
            return;
        }
        if (bounds.min === this.#start && bounds.max === this.#end && this.#drawn) {
            return;
        }
        this.#start = bounds.min;
        this.#end = bounds.max;
        // Order matters here, resetCanvas will set this.#drawn to false.
        this.resetCanvas();
        this.#drawn = true;
        this.#draw(this.#parsedTrace);
    }
}
export class TimelineEventOverviewResponsiveness extends TimelineEventOverview {
    #parsedTrace;
    constructor(parsedTrace) {
        super('responsiveness', null);
        this.#parsedTrace = parsedTrace;
    }
    #gatherEventsWithRelevantWarnings() {
        const { topLevelRendererIds } = this.#parsedTrace.data.Meta;
        // All the warnings that we care about regarding responsiveness and want to represent on the overview.
        const warningsForResponsiveness = new Set([
            'LONG_TASK',
            'FORCED_REFLOW',
            'IDLE_CALLBACK_OVER_TIME',
        ]);
        const allWarningEvents = new Set();
        for (const warning of warningsForResponsiveness) {
            const eventsForWarning = this.#parsedTrace.data.Warnings.perWarning.get(warning);
            if (!eventsForWarning) {
                continue;
            }
            for (const event of eventsForWarning) {
                // Only keep events whose PID is a top level renderer, which means it
                // was on the main thread. This avoids showing issues from iframes or
                // other sub-frames in the minimap overview.
                if (topLevelRendererIds.has(event.pid)) {
                    allWarningEvents.add(event);
                }
            }
        }
        return allWarningEvents;
    }
    update(start, end) {
        this.resetCanvas();
        const height = this.height();
        const visibleTimeWindow = !(start && end) ? this.#parsedTrace.data.Meta.traceBounds : {
            min: Trace.Helpers.Timing.milliToMicro(start),
            max: Trace.Helpers.Timing.milliToMicro(end),
            range: Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(end - start)),
        };
        const timeSpan = visibleTimeWindow.range;
        const scale = this.width() / timeSpan;
        const ctx = this.context();
        const fillPath = new Path2D();
        const markersPath = new Path2D();
        const eventsWithWarning = this.#gatherEventsWithRelevantWarnings();
        for (const event of eventsWithWarning) {
            paintWarningDecoration(event);
        }
        ctx.fillStyle = 'hsl(0, 80%, 90%)';
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2 * window.devicePixelRatio;
        ctx.fill(fillPath);
        ctx.stroke(markersPath);
        function paintWarningDecoration(event) {
            const { startTime, duration } = Trace.Helpers.Timing.eventTimingsMicroSeconds(event);
            const x = Math.round(scale * (startTime - visibleTimeWindow.min));
            const width = Math.round(scale * duration);
            fillPath.rect(x, 0, width, height);
            markersPath.moveTo(x + width, 0);
            markersPath.lineTo(x + width, height);
        }
    }
}
export class TimelineFilmStripOverview extends TimelineEventOverview {
    frameToImagePromise;
    lastFrame = null;
    lastElement;
    drawGeneration;
    emptyImage;
    #filmStrip = null;
    constructor(filmStrip) {
        super('filmstrip', null);
        this.element.setAttribute('jslog', `${VisualLogging.section('film-strip')}`);
        this.frameToImagePromise = new Map();
        this.#filmStrip = filmStrip;
        this.lastFrame = null;
        this.lastElement = null;
        this.reset();
    }
    update(customStartTime, customEndTime) {
        this.resetCanvas();
        const frames = this.#filmStrip ? this.#filmStrip.frames : [];
        if (!frames.length) {
            return;
        }
        if (this.height() === 0) {
            // Height of 0 causes the maths below to get off and generate very large
            // negative numbers that cause an extremely long loop when attempting to
            // draw images by frame. Rather than that, let's warn and exist early.
            console.warn('TimelineFilmStrip could not be drawn as its canvas height is 0');
            return;
        }
        const drawGeneration = Symbol('drawGeneration');
        this.drawGeneration = drawGeneration;
        void this.imageByFrame(frames[0]).then(image => {
            if (this.drawGeneration !== drawGeneration) {
                return;
            }
            if (!image?.naturalWidth || !image.naturalHeight) {
                return;
            }
            const imageHeight = this.height() - 2 * TimelineFilmStripOverview.Padding;
            const imageWidth = Math.ceil(imageHeight * image.naturalWidth / image.naturalHeight);
            const popoverScale = Math.min(200 / image.naturalWidth, 1);
            this.emptyImage = new Image(image.naturalWidth * popoverScale, image.naturalHeight * popoverScale);
            this.drawFrames(imageWidth, imageHeight, customStartTime, customEndTime);
        });
    }
    async imageByFrame(frame) {
        let imagePromise = this.frameToImagePromise.get(frame);
        if (!imagePromise) {
            // TODO(paulirish): Adopt Util.ImageCache
            const uri = Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(frame.screenshotEvent);
            imagePromise = UI.UIUtils.loadImage(uri);
            this.frameToImagePromise.set(frame, imagePromise);
        }
        return await imagePromise;
    }
    drawFrames(imageWidth, imageHeight, customStartTime, customEndTime) {
        if (!imageWidth) {
            return;
        }
        if (!this.#filmStrip || this.#filmStrip.frames.length < 1) {
            return;
        }
        const padding = TimelineFilmStripOverview.Padding;
        const width = this.width();
        const zeroTime = customStartTime ?? Trace.Helpers.Timing.microToMilli(this.#filmStrip.zeroTime);
        const spanTime = customEndTime ? customEndTime - zeroTime : Trace.Helpers.Timing.microToMilli(this.#filmStrip.spanTime);
        const scale = spanTime / width;
        const context = this.context();
        const drawGeneration = this.drawGeneration;
        context.beginPath();
        for (let x = padding; x < width; x += imageWidth + 2 * padding) {
            const time = Trace.Types.Timing.Milli(zeroTime + (x + imageWidth / 2) * scale);
            const timeMicroSeconds = Trace.Helpers.Timing.milliToMicro(time);
            const frame = Trace.Extras.FilmStrip.frameClosestToTimestamp(this.#filmStrip, timeMicroSeconds);
            if (!frame) {
                continue;
            }
            context.rect(x - 0.5, 0.5, imageWidth + 1, imageHeight + 1);
            void this.imageByFrame(frame).then(drawFrameImage.bind(this, x));
        }
        context.strokeStyle = '#ddd';
        context.stroke();
        function drawFrameImage(x, image) {
            // Ignore draws deferred from a previous update call.
            if (this.drawGeneration !== drawGeneration || !image) {
                return;
            }
            context.drawImage(image, x, 1, imageWidth, imageHeight);
        }
    }
    async overviewInfoPromise(x) {
        if (!this.#filmStrip || this.#filmStrip.frames.length === 0) {
            return null;
        }
        const calculator = this.calculator();
        if (!calculator) {
            return null;
        }
        const timeMilliSeconds = calculator.positionToTime(x);
        const timeMicroSeconds = Trace.Helpers.Timing.milliToMicro(timeMilliSeconds);
        const frame = Trace.Extras.FilmStrip.frameClosestToTimestamp(this.#filmStrip, timeMicroSeconds);
        if (frame === this.lastFrame) {
            return this.lastElement;
        }
        const imagePromise = frame ? this.imageByFrame(frame) : Promise.resolve(this.emptyImage);
        const image = await imagePromise;
        const element = document.createElement('div');
        element.classList.add('frame');
        if (image) {
            element.createChild('div', 'thumbnail').appendChild(image);
        }
        this.lastFrame = frame;
        this.lastElement = element;
        return element;
    }
    reset() {
        this.lastFrame = null;
        this.lastElement = null;
        this.frameToImagePromise = new Map();
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static Padding = 2;
}
export class TimelineEventOverviewMemory extends TimelineEventOverview {
    heapSizeLabel;
    #parsedTrace;
    constructor(parsedTrace) {
        super('memory', i18nString(UIStrings.heap));
        this.heapSizeLabel = this.element.createChild('div', 'memory-graph-label');
        this.#parsedTrace = parsedTrace;
    }
    resetHeapSizeLabels() {
        this.heapSizeLabel.textContent = '';
    }
    update(start, end) {
        this.resetCanvas();
        const ratio = window.devicePixelRatio;
        if (this.#parsedTrace.data.Memory.updateCountersByProcess.size === 0) {
            this.resetHeapSizeLabels();
            return;
        }
        const mainRendererIds = Array.from(this.#parsedTrace.data.Meta.topLevelRendererIds);
        const counterEventsPerTrack = mainRendererIds.map(pid => this.#parsedTrace.data.Memory.updateCountersByProcess.get(pid) || [])
            .filter(eventsPerRenderer => eventsPerRenderer.length > 0);
        const lowerOffset = 3 * ratio;
        let maxUsedHeapSize = 0;
        let minUsedHeapSize = 100000000000;
        const boundsMs = (start && end) ?
            {
                min: start,
                max: end,
                range: end - start,
            } :
            Trace.Helpers.Timing.traceWindowMilliSeconds(this.#parsedTrace.data.Meta.traceBounds);
        const minTime = boundsMs.min;
        const maxTime = boundsMs.max;
        function calculateMinMaxSizes(event) {
            const counters = event.args.data;
            if (!counters || !counters.jsHeapSizeUsed) {
                return;
            }
            maxUsedHeapSize = Math.max(maxUsedHeapSize, counters.jsHeapSizeUsed);
            minUsedHeapSize = Math.min(minUsedHeapSize, counters.jsHeapSizeUsed);
        }
        for (let i = 0; i < counterEventsPerTrack.length; i++) {
            counterEventsPerTrack[i].forEach(calculateMinMaxSizes);
        }
        minUsedHeapSize = Math.min(minUsedHeapSize, maxUsedHeapSize);
        const lineWidth = 1;
        const width = this.width();
        const height = this.height() - lowerOffset;
        const xFactor = width / (maxTime - minTime);
        const yFactor = (height - lineWidth) / Math.max(maxUsedHeapSize - minUsedHeapSize, 1);
        const histogram = new Array(width);
        function buildHistogram(event) {
            const counters = event.args.data;
            if (!counters || !counters.jsHeapSizeUsed) {
                return;
            }
            const { startTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
            const x = Math.round((startTime - minTime) * xFactor);
            const y = Math.round((counters.jsHeapSizeUsed - minUsedHeapSize) * yFactor);
            histogram[x] = Math.max(histogram[x] || 0, y);
        }
        for (let i = 0; i < counterEventsPerTrack.length; i++) {
            counterEventsPerTrack[i].forEach(buildHistogram);
        }
        const ctx = this.context();
        const heightBeyondView = height + lowerOffset + lineWidth;
        ctx.translate(0.5, 0.5);
        ctx.beginPath();
        ctx.moveTo(-lineWidth, heightBeyondView);
        let y = 0;
        let isFirstPoint = true;
        let lastX = 0;
        for (let x = 0; x < histogram.length; x++) {
            if (typeof histogram[x] === 'undefined') {
                continue;
            }
            if (isFirstPoint) {
                isFirstPoint = false;
                y = histogram[x];
                ctx.lineTo(-lineWidth, height - y);
            }
            const nextY = histogram[x];
            if (Math.abs(nextY - y) > 2 && Math.abs(x - lastX) > 1) {
                ctx.lineTo(x, height - y);
            }
            y = nextY;
            ctx.lineTo(x, height - y);
            lastX = x;
        }
        ctx.lineTo(width + lineWidth, height - y);
        ctx.lineTo(width + lineWidth, heightBeyondView);
        ctx.closePath();
        ctx.fillStyle = 'hsla(220, 90%, 70%, 0.2)';
        ctx.fill();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = 'hsl(220, 90%, 70%)';
        ctx.stroke();
        this.heapSizeLabel.textContent = i18nString(UIStrings.sSDash, {
            PH1: i18n.ByteUtilities.bytesToString(minUsedHeapSize),
            PH2: i18n.ByteUtilities.bytesToString(maxUsedHeapSize),
        });
    }
}
export class Quantizer {
    lastTime;
    quantDuration;
    callback;
    counters;
    remainder;
    constructor(startTime, quantDuration, callback) {
        this.lastTime = startTime;
        this.quantDuration = quantDuration;
        this.callback = callback;
        this.counters = [];
        this.remainder = quantDuration;
    }
    appendInterval(time, group) {
        let interval = time - this.lastTime;
        if (interval <= this.remainder) {
            this.counters[group] = (this.counters[group] || 0) + interval;
            this.remainder -= interval;
            this.lastTime = time;
            return;
        }
        this.counters[group] = (this.counters[group] || 0) + this.remainder;
        this.callback(this.counters);
        interval -= this.remainder;
        while (interval >= this.quantDuration) {
            const counters = [];
            counters[group] = this.quantDuration;
            this.callback(counters);
            interval -= this.quantDuration;
        }
        this.counters = [];
        this.counters[group] = interval;
        this.lastTime = time;
        this.remainder = this.quantDuration - interval;
    }
}
//# sourceMappingURL=TimelineEventOverview.js.map