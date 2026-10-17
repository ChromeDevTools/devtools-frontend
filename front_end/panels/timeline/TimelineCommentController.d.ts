import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Trace from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Overlays from './overlays/overlays.js';
import type { TimelineFlameChartDataProvider } from './TimelineFlameChartDataProvider.js';
import type { TimelineFlameChartNetworkDataProvider } from './TimelineFlameChartNetworkDataProvider.js';
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
export declare class TimelineCommentController {
    #private;
    constructor(delegate: TimelineCommentControllerDelegate, commentManager: CommentManager.CommentManager.CommentManager);
    /**
     * Sets the active trace and updates the COMMENT_PIN overlays to match its
     * threads.
     */
    setParsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace): void;
    /**
     * Starts listening for thread and overlay changes, registers the anchor
     * resolver and shows pins for existing threads.
     */
    wasShown(): void;
    /**
     * Stops listening for thread and overlay changes and unregisters the anchor
     * resolver. The final notification removes the shared pins, because the
     * resolver no longer supplies their anchor elements.
     */
    willHide(): void;
}
