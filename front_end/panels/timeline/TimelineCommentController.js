// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Trace from '../../models/trace/trace.js';
import * as Comments from '../../ui/comments/comments.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Overlays from './overlays/overlays.js';
import { agentContextForEntry } from './TimelineCommentContext.js';
/**
 * Prefix for keys of entries that EventsSerializer cannot key. The full key is
 * `fc-<chartLocation>-<entryIndex>`.
 */
const SYNTHETIC_KEY_PREFIX = 'fc-';
function entryStartTimeMicro(timelineData, entryIndex) {
    return Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(timelineData.entryStartTimes[entryIndex]));
}
/**
 * Returns the entry's duration, or undefined for instant entries.
 */
function entryDurationMicro(timelineData, entryIndex) {
    const totalTime = timelineData.entryTotalTimes[entryIndex];
    return !Number.isNaN(totalTime) && totalTime > 0 ?
        Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(totalTime)) :
        undefined;
}
/**
 * Connects the Performance panel flame charts to the shared comments system.
 *
 * The shared comments overlay draws the pin, highlight and popup for every
 * comment, so Performance panel comments behave like comments in other
 * panels. This controller supplies the parts that are specific to the
 * flame chart canvas:
 * - It registers a CustomAnchorResolver that maps a pointer position on a
 *   flame chart canvas to a timeline anchor.
 * - It keeps one COMMENT_PIN overlay for each thread on the current trace
 *   whose entry it finds. Overlays positions each COMMENT_PIN element over its
 *   entry, and the resolver returns that element from getAnchorElement() so
 *   the shared overlay can draw the pin on it.
 * - It requests repositioning after every Overlays update, because panning or
 *   zooming the flame chart moves the COMMENT_PIN elements without any DOM
 *   scroll or resize.
 */
export class TimelineCommentController {
    #delegate;
    #commentManager;
    #parsedTrace = null;
    /**
     * Whether COMMENT_PIN overlays existed at the last OverlaysUpdated event or
     * when the view was last shown, whichever was later. One more notification
     * is sent after the last overlay is removed, so the shared overlay removes
     * its pin.
     */
    #notifiedWithCommentPins = false;
    #onCommentThreadsChanged = () => {
        this.#syncCommentOverlays();
    };
    /**
     * The main flame chart rebuilds its entries when entries are hidden or
     * shown from the context menu, or the ignore list changes. Threads with a
     * synthetic key whose entry was missing can then be pinned.
     */
    #onMainDataChanged = () => {
        this.#syncCommentOverlays();
    };
    // Overlays updates on every pan and zoom, so the notification is skipped
    // while there are no COMMENT_PIN overlays.
    #onOverlaysUpdated = () => {
        const hasCommentPins = this.#delegate.overlays.overlaysOfType('COMMENT_PIN').length > 0;
        if (hasCommentPins || this.#notifiedWithCommentPins) {
            Comments.CommentAnchorResolver.notifyCustomAnchorsMoved();
        }
        this.#notifiedWithCommentPins = hasCommentPins;
    };
    #customAnchorResolver = {
        matches: (element) => {
            return element === this.#delegate.mainFlameChart.getCanvas() ||
                element === this.#delegate.networkFlameChart.getCanvas();
        },
        resolve: (element, options) => {
            return this.#resolveTimelineAnchor(element, options);
        },
        getAnchorElement: (anchor) => {
            return this.#anchorElementFor(anchor);
        },
    };
    constructor(delegate, commentManager) {
        this.#delegate = delegate;
        this.#commentManager = commentManager;
    }
    /**
     * Sets the active trace and updates the COMMENT_PIN overlays to match its
     * threads.
     */
    setParsedTrace(parsedTrace) {
        this.#parsedTrace = parsedTrace;
        this.#syncCommentOverlays();
    }
    /**
     * Starts listening for thread, overlay and flame chart data changes,
     * registers the anchor resolver and shows pins for existing threads.
     */
    wasShown() {
        this.#commentManager.addEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onCommentThreadsChanged);
        this.#delegate.overlays.addEventListener(Overlays.Overlays.OverlaysUpdated.eventName, this.#onOverlaysUpdated);
        this.#delegate.mainDataProvider.addEventListener("DataChanged" /* TimelineFlameChartDataProviderEvents.DATA_CHANGED */, this.#onMainDataChanged);
        Comments.CommentAnchorResolver.registerCustomAnchorResolver(this.#customAnchorResolver);
        this.#syncCommentOverlays();
        // COMMENT_PIN overlays that survived while the view was hidden need their
        // shared pins drawn again.
        Comments.CommentAnchorResolver.notifyCustomAnchorsMoved();
        this.#notifiedWithCommentPins =
            this.#delegate.overlays.overlaysOfType('COMMENT_PIN').length > 0;
    }
    /**
     * Stops listening for thread, overlay and flame chart data changes and
     * unregisters the anchor resolver. The final notification removes the shared
     * pins, because the resolver no longer supplies their anchor elements.
     */
    willHide() {
        this.#commentManager.removeEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onCommentThreadsChanged);
        this.#delegate.overlays.removeEventListener(Overlays.Overlays.OverlaysUpdated.eventName, this.#onOverlaysUpdated);
        this.#delegate.mainDataProvider.removeEventListener("DataChanged" /* TimelineFlameChartDataProviderEvents.DATA_CHANGED */, this.#onMainDataChanged);
        Comments.CommentAnchorResolver.unregisterCustomAnchorResolver(this.#customAnchorResolver);
        Comments.CommentAnchorResolver.notifyCustomAnchorsMoved();
        this.#notifiedWithCommentPins = false;
    }
    /**
     * Returns the COMMENT_PIN overlay element for the thread whose anchor is
     * `anchor`. Overlays sizes the element to the entry and hides it when the
     * entry is not visible.
     */
    #anchorElementFor(anchor) {
        if (!anchor.timeline) {
            return null;
        }
        for (const overlay of this.#delegate.overlays.overlaysOfType('COMMENT_PIN')) {
            if (this.#commentManager.getCommentThread(overlay.commentThreadId)?.anchor === anchor) {
                return this.#delegate.overlays.elementForOverlay(overlay);
            }
        }
        return null;
    }
    /**
     * Returns an identifier for the active trace, or null if no trace is active.
     *
     * The identifier is derived from the trace bounds, which are fixed for a
     * recording: they do not change when the trace is zoomed or breadcrumbs are
     * added, and they are the same when the trace file is loaded again. Threads
     * therefore survive switching between traces in the history dropdown, and
     * threads from one recording should not show on another.
     */
    #traceId() {
        if (!this.#parsedTrace) {
            return null;
        }
        const { min, max } = this.#parsedTrace.data.Meta.traceBounds;
        return `trace-${min}-${max}`;
    }
    #dataProviderFor(chartLocation) {
        return chartLocation === 'network' ? this.#delegate.networkDataProvider : this.#delegate.mainDataProvider;
    }
    /**
     * Returns the event for a thread's timeline anchor, or null if the anchor
     * has a synthetic key and no flame chart entry matches it.
     */
    #eventForTimelineAnchor(anchor, parsedTrace) {
        if (!anchor.traceEventKey.startsWith(SYNTHETIC_KEY_PREFIX)) {
            // The key was created by EventsSerializer for this trace, because the
            // thread's traceId matches.
            return this.#delegate.eventsSerializer.eventForKey(anchor.traceEventKey, parsedTrace);
        }
        const entryIndex = this.#findEntryIndexForSyntheticKey(anchor);
        if (entryIndex === -1) {
            return null;
        }
        return this.#dataProviderFor(anchor.chartLocation).eventByIndex(entryIndex);
    }
    /**
     * Returns the index of the flame chart entry with the anchor's start time,
     * duration and title, or -1 if there is none. Duration separates nested
     * entries that share a start time and title, such as recursive calls.
     *
     * Entry indexes change when the flame chart rebuilds its entries, for
     * example after entries are hidden from the context menu. The index encoded
     * in the synthetic key is therefore checked first and used only if that
     * entry still matches. Otherwise every entry is scanned, because
     * `entryStartTimes` concatenates all tracks and is not sorted.
     */
    #findEntryIndexForSyntheticKey(anchor) {
        const dataProvider = this.#dataProviderFor(anchor.chartLocation);
        const timelineData = dataProvider.timelineData();
        const entryCount = timelineData.entryStartTimes.length;
        const matchesAnchor = (index) => {
            // The anchor's times were computed by entryStartTimeMicro() and
            // entryDurationMicro() from the same trace, so exact comparisons are
            // safe.
            return entryStartTimeMicro(timelineData, index) === anchor.startTimeMicro &&
                entryDurationMicro(timelineData, index) === anchor.durationMicro &&
                (dataProvider.entryTitle(index) ?? '') === anchor.entryName;
        };
        const encodedIndex = Number(anchor.traceEventKey.slice(`${SYNTHETIC_KEY_PREFIX}${anchor.chartLocation}-`.length));
        if (Number.isInteger(encodedIndex) && encodedIndex >= 0 && encodedIndex < entryCount &&
            matchesAnchor(encodedIndex)) {
            return encodedIndex;
        }
        for (let index = 0; index < entryCount; index++) {
            if (matchesAnchor(index)) {
                return index;
            }
        }
        return -1;
    }
    #syncCommentOverlays() {
        const existingOverlays = this.#delegate.overlays.overlaysOfType('COMMENT_PIN');
        const currentTraceId = this.#traceId();
        const parsedTrace = this.#parsedTrace;
        // Before the first trace is set, no thread matches the active trace and
        // no COMMENT_PIN overlays exist.
        if (!currentTraceId || !parsedTrace) {
            return;
        }
        let mutationsMade = false;
        const validThreadIds = new Set();
        for (const thread of this.#commentManager.getCommentThreads()) {
            // Generated comments do not render pins, matching CommentOverlayManager.
            if (thread.isGeneratedComment || !thread.anchor.timeline) {
                continue;
            }
            if (thread.anchor.timeline.traceId !== currentTraceId) {
                continue;
            }
            validThreadIds.add(thread.id);
            if (existingOverlays.some(overlay => overlay.commentThreadId === thread.id)) {
                continue;
            }
            const event = this.#eventForTimelineAnchor(thread.anchor.timeline, parsedTrace);
            // The entry of a synthetic key can be missing from the flame chart, for
            // example after it is hidden from the context menu. The thread then has
            // no pin until #onMainDataChanged() syncs again and finds the entry.
            if (!event) {
                continue;
            }
            this.#delegate.overlays.add({
                type: 'COMMENT_PIN',
                entry: event,
                commentThreadId: thread.id,
            });
            mutationsMade = true;
        }
        for (const overlay of existingOverlays) {
            if (!validThreadIds.has(overlay.commentThreadId)) {
                this.#delegate.overlays.remove(overlay);
                mutationsMade = true;
            }
        }
        if (mutationsMade) {
            void this.#delegate.overlays.update();
        }
        else {
            // Overlays#reset() clears previous overlays before setParsedTrace() runs.
            // Run #onOverlaysUpdated() so notifyCustomAnchorsMoved() still fires when
            // the new trace adds no comment pins of its own.
            this.#onOverlaysUpdated();
        }
    }
    #resolveEntryAtCoordinates(element, clientX, clientY) {
        const isNetwork = element === this.#delegate.networkFlameChart.getCanvas();
        const flameChart = isNetwork ? this.#delegate.networkFlameChart : this.#delegate.mainFlameChart;
        const dataProvider = isNetwork ? this.#delegate.networkDataProvider : this.#delegate.mainDataProvider;
        const chartLocation = isNetwork ? 'network' : 'main';
        const canvas = flameChart.getCanvas();
        const canvasRect = canvas.getBoundingClientRect();
        let entryIndex = -1;
        // coordinatesToEntryIndex throws if the flame chart has not completed its
        // first layout pass, for example while a new trace is loading. No entry is
        // commentable until that pass completes.
        try {
            entryIndex = flameChart.coordinatesToEntryIndex(clientX - canvasRect.left, clientY - canvasRect.top);
        }
        catch {
            return null;
        }
        if (entryIndex === -1) {
            return null;
        }
        // Entries without a trace event, such as screenshots, cannot render a
        // COMMENT_PIN overlay, so they are not commentable.
        const event = dataProvider.eventByIndex(entryIndex);
        if (!event) {
            return null;
        }
        const dims = flameChart.getEntryDimensions(entryIndex);
        if (!dims?.visible) {
            return null;
        }
        return {
            flameChart,
            dataProvider,
            chartLocation,
            canvas,
            entryIndex,
            event,
            highlightRect: {
                top: window.scrollY + canvasRect.top + dims.y,
                left: window.scrollX + canvasRect.left + dims.x,
                width: dims.width,
                height: dims.height,
                visible: true,
            },
        };
    }
    /**
     * Maps a pointer position on a flame chart canvas to a timeline anchor.
     *
     * Hover requests only need the highlight rect, so they skip the title
     * lookup, visual logging path and event serialization.
     */
    #resolveTimelineAnchor(element, options) {
        if (!options) {
            return null;
        }
        const entry = this.#resolveEntryAtCoordinates(element, options.clientX, options.clientY);
        if (!entry) {
            return null;
        }
        if (options.forHover) {
            return {
                anchor: { vePath: '', textSignature: '' },
                anchorElement: entry.canvas,
                highlightRect: entry.highlightRect,
            };
        }
        const traceId = this.#traceId();
        if (!traceId) {
            return null;
        }
        const { flameChart, dataProvider, chartLocation, canvas, entryIndex, event, highlightRect } = entry;
        // Events that EventsSerializer cannot key, such as JS samples, get a
        // synthetic key that encodes the chart and the entry index.
        // #findEntryIndexForSyntheticKey() uses the stored start time, duration
        // and title to find the entry again if the index has changed.
        const traceEventKey = this.#delegate.eventsSerializer.keyForEvent(event) ?? `${SYNTHETIC_KEY_PREFIX}${chartLocation}-${entryIndex}`;
        const timelineData = flameChart.timelineData();
        if (!timelineData) {
            throw new Error('Flame chart resolved an entry index without timeline data.');
        }
        // Store the raw title, even when it is empty. #findEntryIndexForSyntheticKey()
        // compares against it, and the UI applies its own display fallback for
        // untitled entries.
        const entryName = dataProvider.entryTitle(entryIndex) ?? '';
        const startTimeMicro = entryStartTimeMicro(timelineData, entryIndex);
        const durationMicro = entryDurationMicro(timelineData, entryIndex);
        return {
            anchor: {
                vePath: VisualLogging.getVePath(element),
                textSignature: entryName,
                timeline: {
                    traceId,
                    traceEventKey,
                    entryName,
                    startTimeMicro,
                    durationMicro,
                    chartLocation,
                },
                agentContext: this.#agentContextFor(entry),
            },
            anchorElement: canvas,
            highlightRect,
        };
    }
    /**
     * Returns the lines that describe the entry to the AI agent, or undefined
     * if no trace is active.
     */
    #agentContextFor(entry) {
        if (!this.#parsedTrace) {
            return undefined;
        }
        return agentContextForEntry(entry.event, this.#trackNameFor(entry), this.#parsedTrace);
    }
    /**
     * Returns the name of the track that contains the entry. Groups are stored
     * in level order and nested groups follow their parent, so the entry's
     * track is the last group that starts at or above the entry's level. The
     * data provider's groupForEvent() is not used because it only knows tracks
     * built by track appenders, and not, for example, the Frames track.
     */
    #trackNameFor(entry) {
        const timelineData = entry.flameChart.timelineData();
        if (!timelineData) {
            return null;
        }
        const level = timelineData.entryLevels[entry.entryIndex];
        let trackName = null;
        for (const group of timelineData.groups) {
            if (group.startLevel > level) {
                break;
            }
            trackName = group.name;
        }
        return trackName;
    }
}
//# sourceMappingURL=TimelineCommentController.js.map