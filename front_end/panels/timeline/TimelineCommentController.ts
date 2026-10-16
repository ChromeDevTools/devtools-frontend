// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Trace from '../../models/trace/trace.js';
import * as Comments from '../../ui/comments/comments.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as Overlays from './overlays/overlays.js';
import type {TimelineFlameChartDataProvider} from './TimelineFlameChartDataProvider.js';
import type {TimelineFlameChartNetworkDataProvider} from './TimelineFlameChartNetworkDataProvider.js';

/**
 * Supplies the flame charts, data providers, overlays and events serializer
 * that the controller needs to resolve and pin comments.
 */
export interface TimelineCommentControllerDelegate {
  readonly mainFlameChart: PerfUI.FlameChart.FlameChart;
  readonly networkFlameChart: PerfUI.FlameChart.FlameChart;
  readonly mainDataProvider: TimelineFlameChartDataProvider;
  readonly networkDataProvider: TimelineFlameChartNetworkDataProvider;
  readonly overlays: Overlays.Overlays.Overlays;
  readonly eventsSerializer: Trace.EventsSerializer.EventsSerializer;
}

interface ResolvedEntry {
  flameChart: PerfUI.FlameChart.FlameChart;
  dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider;
  chartLocation: 'main'|'network';
  canvas: HTMLCanvasElement;
  entryIndex: number;
  event: Trace.Types.Events.Event;
  highlightRect: {top: number, left: number, width: number, height: number, visible: boolean};
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
 * - It keeps one COMMENT_PIN overlay per thread on the current trace. Overlays
 *   positions each COMMENT_PIN element over its entry, and the resolver
 *   returns that element from getAnchorElement() so the shared overlay can
 *   draw the pin on it.
 * - It requests repositioning after every Overlays update, because panning or
 *   zooming the flame chart moves the COMMENT_PIN elements without any DOM
 *   scroll or resize.
 */
export class TimelineCommentController {
  readonly #delegate: TimelineCommentControllerDelegate;
  readonly #commentManager: CommentManager.CommentManager.CommentManager;
  #parsedTrace: Trace.TraceModel.ParsedTrace|null = null;
  /**
   * Whether COMMENT_PIN overlays existed at the last OverlaysUpdated event or
   * when the view was last shown, whichever was later. One more notification
   * is sent after the last overlay is removed, so the shared overlay removes
   * its pin.
   */
  #notifiedWithCommentPins = false;

  readonly #onCommentThreadsChanged = (): void => {
    this.#syncCommentOverlays();
  };

  // Overlays updates on every pan and zoom, so the notification is skipped
  // while there are no COMMENT_PIN overlays.
  readonly #onOverlaysUpdated = (): void => {
    const hasCommentPins =
        this.#delegate.overlays.overlaysOfType<Trace.Types.Overlays.CommentPin>('COMMENT_PIN').length > 0;
    if (hasCommentPins || this.#notifiedWithCommentPins) {
      Comments.CommentAnchorResolver.notifyCustomAnchorsMoved();
    }
    this.#notifiedWithCommentPins = hasCommentPins;
  };

  readonly #customAnchorResolver: Comments.CommentAnchorResolver.CustomAnchorResolver = {
    matches: (element: Element): boolean => {
      return element === this.#delegate.mainFlameChart.getCanvas() ||
          element === this.#delegate.networkFlameChart.getCanvas();
    },
    resolve: (element: Element, options?: {clientX: number, clientY: number, forHover?: boolean}):
               Comments.CommentAnchorResolver.CustomAnchorResult|null => {
      return this.#resolveTimelineAnchor(element, options);
    },
    getAnchorElement: (anchor: CommentManager.CommentManager.CommentAnchorSignature):
        Element|null => {
          return this.#anchorElementFor(anchor);
        },
  };

  constructor(
      delegate: TimelineCommentControllerDelegate,
      commentManager: CommentManager.CommentManager.CommentManager,
  ) {
    this.#delegate = delegate;
    this.#commentManager = commentManager;
  }

  /**
   * Sets the active trace and updates the COMMENT_PIN overlays to match its
   * threads.
   */
  setParsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace): void {
    this.#parsedTrace = parsedTrace;
    this.#syncCommentOverlays();
  }

  /**
   * Starts listening for thread and overlay changes, registers the anchor
   * resolver and shows pins for existing threads.
   */
  wasShown(): void {
    this.#commentManager.addEventListener(CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
                                          this.#onCommentThreadsChanged);
    this.#delegate.overlays.addEventListener(Overlays.Overlays.OverlaysUpdated.eventName, this.#onOverlaysUpdated);
    Comments.CommentAnchorResolver.registerCustomAnchorResolver(this.#customAnchorResolver);
    this.#syncCommentOverlays();
    // COMMENT_PIN overlays that survived while the view was hidden need their
    // shared pins drawn again.
    Comments.CommentAnchorResolver.notifyCustomAnchorsMoved();
    this.#notifiedWithCommentPins =
        this.#delegate.overlays.overlaysOfType<Trace.Types.Overlays.CommentPin>('COMMENT_PIN').length > 0;
  }

  /**
   * Stops listening for thread and overlay changes and unregisters the anchor
   * resolver. The final notification removes the shared pins, because the
   * resolver no longer supplies their anchor elements.
   */
  willHide(): void {
    this.#commentManager.removeEventListener(CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
                                             this.#onCommentThreadsChanged);
    this.#delegate.overlays.removeEventListener(Overlays.Overlays.OverlaysUpdated.eventName, this.#onOverlaysUpdated);
    Comments.CommentAnchorResolver.unregisterCustomAnchorResolver(this.#customAnchorResolver);
    Comments.CommentAnchorResolver.notifyCustomAnchorsMoved();
    this.#notifiedWithCommentPins = false;
  }

  /**
   * Returns the COMMENT_PIN overlay element for the thread whose anchor is
   * `anchor`. Overlays sizes the element to the entry and hides it when the
   * entry is not visible.
   */
  #anchorElementFor(anchor: CommentManager.CommentManager.CommentAnchorSignature): Element|null {
    if (!anchor.timeline) {
      return null;
    }
    for (const overlay of this.#delegate.overlays.overlaysOfType<Trace.Types.Overlays.CommentPin>('COMMENT_PIN')) {
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
  #traceId(): string|null {
    if (!this.#parsedTrace) {
      return null;
    }
    const {min, max} = this.#parsedTrace.data.Meta.traceBounds;
    return `trace-${min}-${max}`;
  }

  #syncCommentOverlays(): void {
    const existingOverlays = this.#delegate.overlays.overlaysOfType<Trace.Types.Overlays.CommentPin>('COMMENT_PIN');
    const currentTraceId = this.#traceId();
    const parsedTrace = this.#parsedTrace;
    // Before the first trace is set, no thread matches the active trace and
    // no COMMENT_PIN overlays exist.
    if (!currentTraceId || !parsedTrace) {
      return;
    }

    let mutationsMade = false;
    const validThreadIds = new Set<string>();

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
      // The key was created by EventsSerializer for this trace, because the
      // thread's traceId matches.
      const event = this.#delegate.eventsSerializer.eventForKey(
          thread.anchor.timeline.traceEventKey as Trace.Types.File.SerializableKey, parsedTrace);
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
  }

  #resolveEntryAtCoordinates(element: Element, clientX: number, clientY: number): ResolvedEntry|null {
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
    } catch {
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
  #resolveTimelineAnchor(element: Element, options?: {clientX: number, clientY: number, forHover?: boolean}):
      Comments.CommentAnchorResolver.CustomAnchorResult|null {
    if (!options) {
      return null;
    }
    const entry = this.#resolveEntryAtCoordinates(element, options.clientX, options.clientY);
    if (!entry) {
      return null;
    }

    if (options.forHover) {
      return {
        anchor: {vePath: '', textSignature: ''},
        anchorElement: entry.canvas,
        highlightRect: entry.highlightRect,
      };
    }

    const traceId = this.#traceId();
    if (!traceId) {
      return null;
    }
    // Events that EventsSerializer cannot key, such as JS samples, cannot be
    // found again when the thread is pinned, so they are not commentable.
    const traceEventKey = this.#delegate.eventsSerializer.keyForEvent(entry.event);
    if (!traceEventKey) {
      return null;
    }

    const {flameChart, dataProvider, chartLocation, canvas, entryIndex, highlightRect} = entry;
    const timelineData = flameChart.timelineData();
    if (!timelineData) {
      throw new Error('Flame chart resolved an entry index without timeline data.');
    }
    // Store the raw title, even when it is empty. The UI applies its own
    // display fallback for untitled entries.
    const entryName = dataProvider.entryTitle(entryIndex) ?? '';
    const startTimeMicro =
        Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(timelineData.entryStartTimes[entryIndex]));
    const totalTime = timelineData.entryTotalTimes[entryIndex];
    const durationMicro = !Number.isNaN(totalTime) && totalTime > 0 ?
        Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(totalTime)) :
        undefined;

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
      },
      anchorElement: canvas,
      highlightRect,
    };
  }
}
