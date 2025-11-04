import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import { type LastTimestampByLevel } from './AppenderUtils.js';
import { type TrackAppender, type TrackAppenderName } from './CompatibilityTracksAppender.js';
export type NetworkTrackEvent = Trace.Types.Events.SyntheticNetworkRequest | Trace.Types.Events.WebSocketEvent;
export declare class NetworkTrackAppender implements TrackAppender {
    #private;
    readonly appenderName: TrackAppenderName;
    webSocketIdToLevel: Map<number, number>;
    constructor(flameChartData: PerfUI.FlameChart.FlameChartTimelineData, events: NetworkTrackEvent[]);
    group(): PerfUI.FlameChart.Group | undefined;
    font(): string;
    /**
     * Appends into the flame chart data the data corresponding to the
     * Network track.
     * @param trackStartLevel the horizontal level of the flame chart events where
     * the track's events will start being appended.
     * @param expanded whether the track should be rendered expanded.
     * @returns the first available level to append more data after having
     * appended the track's events.
     */
    appendTrackAtLevel(trackStartLevel: number, expanded?: boolean | undefined): number;
    /**
     * Update the flame chart data.
     * When users zoom in the flamechart, we only want to show them the network
     * requests between minTime and maxTime. This function will append those
     * invisible events to the last level, and hide them.
     * @returns the number of levels used by this track
     */
    relayoutEntriesWithinBounds(events: NetworkTrackEvent[], minTime: Trace.Types.Timing.Milli, maxTime: Trace.Types.Timing.Milli): number;
    getWebSocketLevel(event: Trace.Types.Events.WebSocketEvent, lastTimestampByLevel: LastTimestampByLevel): number;
    /**
     * Gets the color an event added by this appender should be rendered with.
     */
    colorForEvent(event: Trace.Types.Events.Event): string;
}
