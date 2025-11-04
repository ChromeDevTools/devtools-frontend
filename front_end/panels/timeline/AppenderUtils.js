import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
const UIStrings = {
    /**
     * @description Text in the Performance panel to show how long was spent in a particular part of the code.
     * The first placeholder is the total time taken for this node and all children, the second is the self time
     * (time taken in this node, without children included).
     * @example {10ms} PH1
     * @example {10ms} PH2
     */
    sSelfS: '{PH1} (self {PH2})',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/AppenderUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * Builds the style for the group.
 * Each group has a predefined style and a reference to the definition of the legacy track (which should be removed in the future).
 * @param extra the customized fields with value.
 * @returns the built GroupStyle
 */
export function buildGroupStyle(extra) {
    const defaultGroupStyle = {
        padding: 4,
        height: 17,
        collapsible: 0 /* PerfUI.FlameChart.GroupCollapsibleState.ALWAYS */,
        color: ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface'),
        backgroundColor: ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container'),
        nestingLevel: 0,
        shareHeaderLine: true,
    };
    return Object.assign(defaultGroupStyle, extra);
}
/**
 * Builds the header corresponding to the track. A header is added in the shape of a group in the flame chart data.
 * @param jslogContext the text that will be set as the logging context
 *                          for the Visual Elements logging framework. Pass
 *                          `null` to not set a context and consequently
 *                          cause this group not to be logged.
 * @param startLevel the flame chart level at which the track header is appended.
 * @param name the display name of the track.
 * @param style the GroupStyle for the track header.
 * @param selectable if the track is selectable.
 * @param expanded if the track is expanded.
 * @param track this is set only when `selectable` is true, and it is used for selecting a track in the details panel.
 * @param showStackContextMenu whether menu with options to merge/collapse entries in track is shown.
 * @returns the group that built from the give data
 */
export function buildTrackHeader(jslogContext, startLevel, name, style, selectable, expanded, showStackContextMenu) {
    const group = {
        startLevel,
        name: name,
        style,
        selectable,
        expanded,
        showStackContextMenu,
    };
    if (jslogContext !== null) {
        group.jslogContext = jslogContext;
    }
    return group;
}
/**
 * Returns the time info shown when an event is hovered in the timeline.
 * @param totalTime the total time of the hovered event.
 * @param selfTime the self time of the hovered event.
 * @returns the formatted time string for popoverInfo
 */
export function getDurationString(totalTime, selfTime) {
    if (!totalTime) {
        return '';
    }
    const totalMs = Trace.Helpers.Timing.microToMilli(totalTime);
    if (selfTime === undefined) {
        return i18n.TimeUtilities.millisToString(totalMs, true);
    }
    const selfMs = Trace.Helpers.Timing.microToMilli(selfTime);
    // This minSelfTimeSignificance is 0.001µs, aka 1 nanosecond.
    // TODO(paulirish): change to 0.09ms, aka 90 microseconds and revise logic below.
    const minSelfTimeSignificance = Trace.Types.Timing.Milli(0.000001);
    const formattedTime = Math.abs(totalMs - selfMs) > minSelfTimeSignificance && selfMs > minSelfTimeSignificance ?
        i18nString(UIStrings.sSelfS, {
            PH1: i18n.TimeUtilities.millisToString(totalMs, true),
            PH2: i18n.TimeUtilities.millisToString(selfMs, true),
        }) :
        i18n.TimeUtilities.millisToString(totalMs, true);
    return formattedTime;
}
/**
 * Returns the first level that is available for an event.
 * Important: if you are walking through an array of events and calling this,
 * the events MUST be sorted.
 */
export function getEventLevel(event, lastTimestampByLevel) {
    let level = 0;
    const startTime = event.ts;
    const endTime = event.ts + (event.dur || 0);
    // Look vertically for the first level where this event fits,
    // that is, where it wouldn't overlap with other events.
    while (level < lastTimestampByLevel.length && startTime < lastTimestampByLevel[level]) {
        // For each event, we look each level from top, and see if start timestamp of this
        // event is used by current level already. If yes, we will go to check next level.
        ++level;
    }
    lastTimestampByLevel[level] = endTime;
    return level;
}
export function addDecorationToEvent(timelineData, eventIndex, decoration) {
    const decorationsForEvent = timelineData.entryDecorations[eventIndex] || [];
    decorationsForEvent.push(decoration);
    timelineData.entryDecorations[eventIndex] = decorationsForEvent;
}
//# sourceMappingURL=AppenderUtils.js.map