var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/timeline/AnimationsTrackAppender.js
var AnimationsTrackAppender_exports = {};
__export(AnimationsTrackAppender_exports, {
  AnimationsTrackAppender: () => AnimationsTrackAppender
});
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Trace2 from "./../../models/trace/trace.js";
import * as PerfUI2 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as ThemeSupport3 from "./../../ui/legacy/theme_support/theme_support.js";

// gen/front_end/panels/timeline/AppenderUtils.js
var AppenderUtils_exports = {};
__export(AppenderUtils_exports, {
  addDecorationToEvent: () => addDecorationToEvent,
  buildGroupStyle: () => buildGroupStyle,
  buildTrackHeader: () => buildTrackHeader,
  getDurationString: () => getDurationString,
  getEventLevel: () => getEventLevel
});
import * as i18n from "./../../core/i18n/i18n.js";
import * as Trace from "./../../models/trace/trace.js";
import * as PerfUI from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as ThemeSupport from "./../../ui/legacy/theme_support/theme_support.js";
var UIStrings = {
  /**
   * @description Text in the Performance panel to show how long was spent in a particular part of the code.
   * The first placeholder is the total time taken for this node and all children, the second is the self time
   * (time taken in this node, without children included).
   * @example {10ms} PH1
   * @example {10ms} PH2
   */
  sSelfS: "{PH1} (self {PH2})"
};
var str_ = i18n.i18n.registerUIStrings("panels/timeline/AppenderUtils.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function buildGroupStyle(extra) {
  const defaultGroupStyle = {
    padding: 4,
    height: 17,
    collapsible: 0,
    color: ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-on-surface"),
    backgroundColor: ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container"),
    nestingLevel: 0,
    shareHeaderLine: true
  };
  return Object.assign(defaultGroupStyle, extra);
}
function buildTrackHeader(jslogContext, startLevel, name, style, selectable, expanded, showStackContextMenu) {
  const group = {
    startLevel,
    name,
    style,
    selectable,
    expanded,
    showStackContextMenu
  };
  if (jslogContext !== null) {
    group.jslogContext = jslogContext;
  }
  return group;
}
function getDurationString(totalTime, selfTime) {
  if (!totalTime) {
    return "";
  }
  const totalMs = Trace.Helpers.Timing.microToMilli(totalTime);
  if (selfTime === void 0) {
    return i18n.TimeUtilities.millisToString(totalMs, true);
  }
  const selfMs = Trace.Helpers.Timing.microToMilli(selfTime);
  const minSelfTimeSignificance = Trace.Types.Timing.Milli(1e-6);
  const formattedTime = Math.abs(totalMs - selfMs) > minSelfTimeSignificance && selfMs > minSelfTimeSignificance ? i18nString(UIStrings.sSelfS, {
    PH1: i18n.TimeUtilities.millisToString(totalMs, true),
    PH2: i18n.TimeUtilities.millisToString(selfMs, true)
  }) : i18n.TimeUtilities.millisToString(totalMs, true);
  return formattedTime;
}
function getEventLevel(event, lastTimestampByLevel) {
  let level = 0;
  const startTime = event.ts;
  const endTime = event.ts + (event.dur || 0);
  while (level < lastTimestampByLevel.length && startTime < lastTimestampByLevel[level]) {
    ++level;
  }
  lastTimestampByLevel[level] = endTime;
  return level;
}
function addDecorationToEvent(timelineData, eventIndex, decoration) {
  const decorationsForEvent = timelineData.entryDecorations[eventIndex] || [];
  decorationsForEvent.push(decoration);
  timelineData.entryDecorations[eventIndex] = decorationsForEvent;
}

// gen/front_end/panels/timeline/AnimationsTrackAppender.js
var UIStrings2 = {
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  animations: "Animations"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/timeline/AnimationsTrackAppender.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var AnimationsTrackAppender = class {
  appenderName = "Animations";
  #compatibilityBuilder;
  #parsedTrace;
  #eventAppendedCallback = this.#eventAppendedCallbackFunction.bind(this);
  constructor(compatibilityBuilder, parsedTrace) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#parsedTrace = parsedTrace;
  }
  appendTrackAtLevel(trackStartLevel, expanded) {
    const animations = this.#parsedTrace.data.Animations.animations;
    if (animations.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#compatibilityBuilder.appendEventsAtLevel(animations, trackStartLevel, this, this.#eventAppendedCallback);
  }
  #appendTrackHeaderAtLevel(currentLevel, expanded) {
    const style = buildGroupStyle({ useFirstLineForOverview: false });
    const group = buildTrackHeader(
      "animations",
      currentLevel,
      i18nString2(UIStrings2.animations),
      style,
      /* selectable= */
      true,
      expanded
    );
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  #eventAppendedCallbackFunction(event, index) {
    if (event && Trace2.Types.Events.isSyntheticAnimation(event)) {
      const failures = Trace2.Insights.Models.CLSCulprits.getNonCompositedFailure(event);
      if (failures.length) {
        addDecorationToEvent(this.#compatibilityBuilder.getFlameChartTimelineData(), index, {
          type: "WARNING_TRIANGLE"
        });
      }
    }
  }
  colorForEvent() {
    return ThemeSupport3.ThemeSupport.instance().getComputedValue("--app-color-rendering");
  }
};

// gen/front_end/panels/timeline/AnnotationHelpers.js
var AnnotationHelpers_exports = {};
__export(AnnotationHelpers_exports, {
  ariaAnnouncementForModifiedEvent: () => ariaAnnouncementForModifiedEvent,
  ariaDescriptionForOverlay: () => ariaDescriptionForOverlay,
  getAnnotationEntries: () => getAnnotationEntries,
  getAnnotationWindow: () => getAnnotationWindow,
  isEntriesLink: () => isEntriesLink,
  isEntryLabel: () => isEntryLabel,
  isTimeRangeLabel: () => isTimeRangeLabel
});
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as Trace3 from "./../../models/trace/trace.js";
import * as TraceBounds from "./../../services/trace_bounds/trace_bounds.js";
var UIStrings3 = {
  /**
   * @description text used to announce to a screen reader that they have entered the mode to edit the label
   */
  srEnterLabelEditMode: "Editing the annotation label text",
  /**
   * @description text used to announce to a screen reader that the entry label text has been updated
   * @example {Hello world} PH1
   */
  srLabelTextUpdated: "Label updated to {PH1}",
  /**
   * @description text used to announce to a screen reader that the bounds of a time range annotation have been upodated
   * @example {13ms} PH1
   * @example {20ms} PH2
   */
  srTimeRangeBoundsUpdated: "Time range updated, starting at {PH1} and ending at {PH2}",
  /**
   * @description label for a time range overlay
   */
  timeRange: "time range",
  /**
   * @description label for a entry label overlay
   */
  entryLabel: "entry label",
  /**
   * @description label for a connected entries overlay
   */
  entriesLink: "connected entries",
  /**
   * @description screen reader text to announce that an annotation has been removed
   * @example {Entry Label} PH1
   */
  srAnnotationRemoved: "The {PH1} annotation has been removed",
  /**
   * @description screen reader text to announce that an annotation has been added
   * @example {Entry Label} PH1
   */
  srAnnotationAdded: "The {PH1} annotation has been added",
  /**
   * @description screen reader text to announce the two events that the connected entries annotation links to
   * @example {Paint} PH1
   * @example {Function call} PH2
   */
  srEntriesLinked: "The connected entries annotation now links from {PH1} to {PH2}"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/timeline/AnnotationHelpers.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
function getAnnotationEntries(annotation) {
  const entries = [];
  switch (annotation.type) {
    case "ENTRY_LABEL":
      entries.push(annotation.entry);
      break;
    case "TIME_RANGE":
      break;
    case "ENTRIES_LINK":
      entries.push(annotation.entryFrom);
      if (annotation.entryTo) {
        entries.push(annotation.entryTo);
      }
      break;
    default:
      Platform.assertNever(annotation, "Unsupported annotation type");
  }
  return entries;
}
function getAnnotationWindow(annotation) {
  let annotationWindow = null;
  const minVisibleEntryDuration = Trace3.Types.Timing.Milli(1);
  switch (annotation.type) {
    case "ENTRY_LABEL": {
      const eventDuration = annotation.entry.dur ?? Trace3.Helpers.Timing.milliToMicro(minVisibleEntryDuration);
      annotationWindow = Trace3.Helpers.Timing.traceWindowFromMicroSeconds(annotation.entry.ts, Trace3.Types.Timing.Micro(annotation.entry.ts + eventDuration));
      break;
    }
    case "TIME_RANGE": {
      annotationWindow = annotation.bounds;
      break;
    }
    case "ENTRIES_LINK": {
      if (!annotation.entryTo) {
        break;
      }
      const fromEventDuration = annotation.entryFrom.dur ?? minVisibleEntryDuration;
      const toEventDuration = annotation.entryTo.dur ?? minVisibleEntryDuration;
      const fromEntryEndTS = annotation.entryFrom.ts + fromEventDuration;
      const toEntryEndTS = annotation.entryTo.ts + toEventDuration;
      const maxTimestamp = Math.max(fromEntryEndTS, toEntryEndTS);
      annotationWindow = Trace3.Helpers.Timing.traceWindowFromMicroSeconds(annotation.entryFrom.ts, Trace3.Types.Timing.Micro(maxTimestamp));
      break;
    }
    default:
      Platform.assertNever(annotation, "Unsupported annotation type");
  }
  return annotationWindow;
}
function isTimeRangeLabel(overlay) {
  return overlay.type === "TIME_RANGE";
}
function isEntriesLink(overlay) {
  return overlay.type === "ENTRIES_LINK";
}
function isEntryLabel(overlay) {
  return overlay.type === "ENTRY_LABEL";
}
function labelForOverlay(overlay) {
  if (isTimeRangeLabel(overlay) || isEntryLabel(overlay)) {
    return overlay.label;
  }
  return null;
}
function ariaDescriptionForOverlay(overlay) {
  if (isTimeRangeLabel(overlay)) {
    return i18nString3(UIStrings3.timeRange);
  }
  if (isEntriesLink(overlay)) {
    return i18nString3(UIStrings3.entriesLink);
  }
  if (isEntryLabel(overlay)) {
    return overlay.label.length > 0 ? i18nString3(UIStrings3.entryLabel) : null;
  }
  return null;
}
function ariaAnnouncementForModifiedEvent(event) {
  if (event.muteAriaNotifications) {
    return null;
  }
  const { overlay, action: action2 } = event;
  switch (action2) {
    case "Remove": {
      const text = ariaDescriptionForOverlay(overlay);
      if (text) {
        return i18nString3(UIStrings3.srAnnotationRemoved, { PH1: text });
      }
      break;
    }
    case "Add": {
      const text = ariaDescriptionForOverlay(overlay);
      if (text) {
        return i18nString3(UIStrings3.srAnnotationAdded, { PH1: text });
      }
      break;
    }
    case "UpdateLabel": {
      const label = labelForOverlay(overlay);
      if (label) {
        return i18nString3(UIStrings3.srLabelTextUpdated, { PH1: label });
      }
      break;
    }
    case "UpdateTimeRange": {
      if (overlay.type !== "TIME_RANGE") {
        return "";
      }
      const traceBounds = TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.entireTraceBounds;
      if (!traceBounds) {
        return "";
      }
      const { min, max } = overlay.bounds;
      const minText = i18n5.TimeUtilities.formatMicroSecondsAsMillisFixed(Trace3.Types.Timing.Micro(min - traceBounds.min));
      const maxText = i18n5.TimeUtilities.formatMicroSecondsAsMillisFixed(Trace3.Types.Timing.Micro(max - traceBounds.min));
      return i18nString3(UIStrings3.srTimeRangeBoundsUpdated, {
        PH1: minText,
        PH2: maxText
      });
    }
    case "UpdateLinkToEntry": {
      if (isEntriesLink(overlay) && overlay.entryFrom && overlay.entryTo) {
        const from = Trace3.Name.forEntry(overlay.entryFrom);
        const to = Trace3.Name.forEntry(overlay.entryTo);
        return i18nString3(UIStrings3.srEntriesLinked, { PH1: from, PH2: to });
      }
      break;
    }
    case "EnterLabelEditState": {
      return i18nString3(UIStrings3.srEnterLabelEditMode);
    }
    case "LabelBringForward": {
      break;
    }
    default:
      Platform.assertNever(action2, "Unsupported action for AnnotationModifiedEvent");
  }
  return null;
}

// gen/front_end/panels/timeline/BenchmarkEvents.js
var BenchmarkEvents_exports = {};
__export(BenchmarkEvents_exports, {
  TraceLoadEvent: () => TraceLoadEvent
});
var TraceLoadEvent = class _TraceLoadEvent extends Event {
  duration;
  static eventName = "traceload";
  constructor(duration) {
    super(_TraceLoadEvent.eventName, { bubbles: true, composed: true });
    this.duration = duration;
  }
};

// gen/front_end/panels/timeline/CompatibilityTracksAppender.js
var CompatibilityTracksAppender_exports = {};
__export(CompatibilityTracksAppender_exports, {
  CompatibilityTracksAppender: () => CompatibilityTracksAppender,
  TrackNames: () => TrackNames,
  entryIsVisibleInTimeline: () => entryIsVisibleInTimeline
});
import * as Common17 from "./../../core/common/common.js";
import * as Platform16 from "./../../core/platform/platform.js";
import * as Root7 from "./../../core/root/root.js";
import * as Trace35 from "./../../models/trace/trace.js";
import * as SourceMapsResolver7 from "./../../models/trace_source_maps_resolver/trace_source_maps_resolver.js";
import * as ThemeSupport27 from "./../../ui/legacy/theme_support/theme_support.js";
import * as TimelineComponents7 from "./components/components.js";

// gen/front_end/panels/timeline/ExtensionTrackAppender.js
var ExtensionTrackAppender_exports = {};
__export(ExtensionTrackAppender_exports, {
  ExtensionTrackAppender: () => ExtensionTrackAppender
});
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Trace4 from "./../../models/trace/trace.js";
import * as PerfUI3 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as ThemeSupport5 from "./../../ui/legacy/theme_support/theme_support.js";
import * as Extensions from "./extensions/extensions.js";
var UIStrings4 = {
  /**
   * @description The subtitle to show (by the side of the track name).
   */
  customTrackSubtitle: "\u2014 Custom"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/timeline/ExtensionTrackAppender.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var ExtensionTrackAppender = class {
  appenderName = "Extension";
  #extensionTopLevelTrack;
  #compatibilityBuilder;
  constructor(compatibilityBuilder, extensionTracks) {
    this.#extensionTopLevelTrack = extensionTracks;
    this.#compatibilityBuilder = compatibilityBuilder;
  }
  appendTrackAtLevel(trackStartLevel, expanded) {
    const totalEntryCount = Object.values(this.#extensionTopLevelTrack.entriesByTrack).reduce((prev, current) => current.length + prev, 0);
    if (totalEntryCount === 0) {
      return trackStartLevel;
    }
    const compact = !this.#extensionTopLevelTrack.isTrackGroup && totalEntryCount < 2;
    this.#appendTopLevelHeaderAtLevel(trackStartLevel, compact, expanded);
    return this.#appendExtensionTrackData(trackStartLevel);
  }
  /**
   * Appends the top level header for a track. Extension entries can be
   * added to tracks or sub-tracks. In the former case, the top level
   * header corresponds to the track name, in the latter it corresponds
   * to the track group name.
   */
  #appendTopLevelHeaderAtLevel(currentLevel, compact, expanded) {
    const style = compact ? buildGroupStyle({
      shareHeaderLine: true,
      collapsible: 1
      /* PerfUI.FlameChart.GroupCollapsibleState.NEVER */
    }) : buildGroupStyle({
      shareHeaderLine: false,
      collapsible: 0
      /* PerfUI.FlameChart.GroupCollapsibleState.ALWAYS */
    });
    const headerTitle = this.#extensionTopLevelTrack.name;
    const jsLogContext = this.#extensionTopLevelTrack.name === "\u{1F170}\uFE0F Angular" ? "angular-track" : "extension";
    const group = buildTrackHeader(
      jsLogContext,
      currentLevel,
      headerTitle,
      style,
      /* selectable= */
      true,
      expanded
    );
    group.subtitle = i18nString4(UIStrings4.customTrackSubtitle);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  /**
   * Appends the second level header for a grouped track, which
   * corresponds to the track name itself, instead of the track name.
   */
  #appendSecondLevelHeader(trackStartLevel, headerTitle) {
    const style = buildGroupStyle({
      shareHeaderLine: false,
      padding: 2,
      nestingLevel: 1,
      collapsible: 0
      /* PerfUI.FlameChart.GroupCollapsibleState.ALWAYS */
    });
    const group = buildTrackHeader(
      "extension",
      trackStartLevel,
      headerTitle,
      style,
      /* selectable= */
      true
    );
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  #appendExtensionTrackData(trackStartLevel) {
    let currentStartLevel = trackStartLevel;
    for (const [trackName, entries] of Object.entries(this.#extensionTopLevelTrack.entriesByTrack)) {
      if (this.#extensionTopLevelTrack.isTrackGroup) {
        this.#appendSecondLevelHeader(currentStartLevel, trackName);
      }
      currentStartLevel = this.#compatibilityBuilder.appendEventsAtLevel(entries, currentStartLevel, this);
    }
    return currentStartLevel;
  }
  colorForEvent(event) {
    const defaultColor = ThemeSupport5.ThemeSupport.instance().getComputedValue("--app-color-rendering");
    if (!Trace4.Types.Extensions.isSyntheticExtensionEntry(event)) {
      return defaultColor;
    }
    return Extensions.ExtensionUI.extensionEntryColor(event);
  }
  titleForEvent(event) {
    return event.name;
  }
  setPopoverInfo(event, info) {
    info.title = Trace4.Types.Extensions.isSyntheticExtensionEntry(event) && event.devtoolsObj.tooltipText ? event.devtoolsObj.tooltipText : this.titleForEvent(event);
    info.formattedTime = getDurationString(event.dur);
  }
};

// gen/front_end/panels/timeline/GPUTrackAppender.js
var GPUTrackAppender_exports = {};
__export(GPUTrackAppender_exports, {
  GPUTrackAppender: () => GPUTrackAppender
});
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Trace5 from "./../../models/trace/trace.js";
import * as PerfUI4 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as ThemeSupport7 from "./../../ui/legacy/theme_support/theme_support.js";
var UIStrings5 = {
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  gpu: "GPU"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/timeline/GPUTrackAppender.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var GPUTrackAppender = class {
  appenderName = "GPU";
  #compatibilityBuilder;
  #parsedTrace;
  constructor(compatibilityBuilder, parsedTrace) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#parsedTrace = parsedTrace;
  }
  /**
   * Appends into the flame chart data the data corresponding to the
   * GPU track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded whether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel, expanded) {
    const gpuEvents = this.#parsedTrace.data.GPU.mainGPUThreadTasks;
    if (gpuEvents.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#compatibilityBuilder.appendEventsAtLevel(gpuEvents, trackStartLevel, this);
  }
  /**
   * Adds into the flame chart data the header corresponding to the
   * GPU track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   * @param expanded whether the track should be rendered expanded.
   */
  #appendTrackHeaderAtLevel(currentLevel, expanded) {
    const style = buildGroupStyle({
      collapsible: 1
      /* PerfUI.FlameChart.GroupCollapsibleState.NEVER */
    });
    const group = buildTrackHeader(
      "gpu",
      currentLevel,
      i18nString5(UIStrings5.gpu),
      style,
      /* selectable= */
      true,
      expanded
    );
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */
  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event) {
    if (!Trace5.Types.Events.isGPUTask(event)) {
      throw new Error(`Unexpected GPU Task: The event's type is '${event.name}'`);
    }
    return ThemeSupport7.ThemeSupport.instance().getComputedValue("--app-color-painting");
  }
};

// gen/front_end/panels/timeline/InteractionsTrackAppender.js
var InteractionsTrackAppender_exports = {};
__export(InteractionsTrackAppender_exports, {
  InteractionsTrackAppender: () => InteractionsTrackAppender
});
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as Trace6 from "./../../models/trace/trace.js";
import * as PerfUI5 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Components from "./components/components.js";
var UIStrings6 = {
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  interactions: "Interactions"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/timeline/InteractionsTrackAppender.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var InteractionsTrackAppender = class {
  appenderName = "Interactions";
  #colorGenerator;
  #compatibilityBuilder;
  #parsedTrace;
  constructor(compatibilityBuilder, parsedTrace, colorGenerator2) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = colorGenerator2;
    this.#parsedTrace = parsedTrace;
  }
  /**
   * Appends into the flame chart data the data corresponding to the
   * interactions track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded whether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel, expanded) {
    if (this.#parsedTrace.data.UserInteractions.interactionEvents.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendInteractionsAtLevel(trackStartLevel);
  }
  /**
   * Adds into the flame chart data the header corresponding to the
   * interactions track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel, expanded) {
    const trackIsCollapsible = this.#parsedTrace.data.UserInteractions.interactionEvents.length > 0;
    const style = buildGroupStyle({
      collapsible: trackIsCollapsible ? 0 : 1,
      useDecoratorsForOverview: true
    });
    const group = buildTrackHeader(
      "interactions",
      currentLevel,
      i18nString6(UIStrings6.interactions),
      style,
      /* selectable= */
      true,
      expanded
    );
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  /**
   * Adds into the flame chart data the trace events dispatched by the
   * performance.measure API. These events are taken from the UserInteractions
   * handler.
   * @param currentLevel the flame chart level from which interactions will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * interactions (the first available level to append more data).
   */
  #appendInteractionsAtLevel(trackStartLevel) {
    const { interactionEventsWithNoNesting, interactionsOverThreshold } = this.#parsedTrace.data.UserInteractions;
    const addCandyStripeToLongInteraction = (event, index) => {
      const overThreshold = interactionsOverThreshold.has(event);
      if (!overThreshold) {
        return;
      }
      if (index !== void 0) {
        this.#addCandyStripeAndWarningForLongInteraction(event, index);
      }
    };
    const newLevel = this.#compatibilityBuilder.appendEventsAtLevel(interactionEventsWithNoNesting, trackStartLevel, this, addCandyStripeToLongInteraction);
    return newLevel;
  }
  #addCandyStripeAndWarningForLongInteraction(entry, eventIndex) {
    const decorationsForEvent = this.#compatibilityBuilder.getFlameChartTimelineData().entryDecorations[eventIndex] || [];
    decorationsForEvent.push({
      type: "CANDY",
      // Where the striping starts is hard. The problem is the whole interaction, isolating the part of it *responsible* for
      // making the interaction 200ms is hard and our decoration won't do it perfectly. To simplify we just flag all the overage.
      // AKA the first 200ms of the interaction aren't flagged. A downside is we often flag a lot of render delay.
      // It'd be fair to shift the candystriping segment earlier in the interaction... Let's see what the feedback is like.
      startAtTime: Trace6.Handlers.ModelHandlers.UserInteractions.LONG_INTERACTION_THRESHOLD
    }, {
      type: "WARNING_TRIANGLE",
      customEndTime: entry.processingEnd
    });
    this.#compatibilityBuilder.getFlameChartTimelineData().entryDecorations[eventIndex] = decorationsForEvent;
  }
  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */
  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event) {
    let idForColorGeneration = Trace6.Name.forEntry(event, this.#parsedTrace);
    if (Trace6.Types.Events.isSyntheticInteraction(event)) {
      idForColorGeneration += event.interactionId;
    }
    return this.#colorGenerator.colorForID(idForColorGeneration);
  }
  setPopoverInfo(event, info) {
    if (Trace6.Types.Events.isSyntheticInteraction(event)) {
      const breakdown = new Components.InteractionBreakdown.InteractionBreakdown();
      breakdown.entry = event;
      info.additionalElements.push(breakdown);
    }
  }
};

// gen/front_end/panels/timeline/LayoutShiftsTrackAppender.js
var LayoutShiftsTrackAppender_exports = {};
__export(LayoutShiftsTrackAppender_exports, {
  LAYOUT_SHIFT_SYNTHETIC_DURATION: () => LAYOUT_SHIFT_SYNTHETIC_DURATION,
  LayoutShiftsTrackAppender: () => LayoutShiftsTrackAppender
});
import * as Common from "./../../core/common/common.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as Trace7 from "./../../models/trace/trace.js";
import * as ComponentHelpers from "./../../ui/components/helpers/helpers.js";
import * as PerfUI6 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as ThemeSupport9 from "./../../ui/legacy/theme_support/theme_support.js";
import * as Utils from "./utils/utils.js";
var UIStrings7 = {
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  layoutShifts: "Layout shifts",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  layoutShiftCluster: "Layout shift cluster",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  layoutShift: "Layout shift"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/timeline/LayoutShiftsTrackAppender.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var LAYOUT_SHIFT_SYNTHETIC_DURATION = Trace7.Types.Timing.Micro(5e3);
var LayoutShiftsTrackAppender = class _LayoutShiftsTrackAppender {
  appenderName = "LayoutShifts";
  #compatibilityBuilder;
  #parsedTrace;
  constructor(compatibilityBuilder, parsedTrace) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#parsedTrace = parsedTrace;
  }
  /**
   * Appends into the flame chart data the data corresponding to the
   * layout shifts track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded whether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel, expanded) {
    if (this.#parsedTrace.data.LayoutShifts.clusters.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendLayoutShiftsAtLevel(trackStartLevel);
  }
  /**
   * Adds into the flame chart data the header corresponding to the
   * layout shifts track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel, expanded) {
    const style = buildGroupStyle({
      collapsible: 1
      /* PerfUI.FlameChart.GroupCollapsibleState.NEVER */
    });
    const group = buildTrackHeader(
      "layout-shifts",
      currentLevel,
      i18nString7(UIStrings7.layoutShifts),
      style,
      /* selectable= */
      true,
      expanded
    );
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  /**
   * Adds into the flame chart data all the layout shifts. These are taken from
   * the clusters that are collected in the LayoutShiftsHandler.
   * @param currentLevel the flame chart level from which layout shifts will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * layout shifts (the first available level to append more data).
   */
  #appendLayoutShiftsAtLevel(currentLevel) {
    const allClusters = this.#parsedTrace.data.LayoutShifts.clusters;
    this.#compatibilityBuilder.appendEventsAtLevel(allClusters, currentLevel, this);
    const allLayoutShifts = this.#parsedTrace.data.LayoutShifts.clusters.flatMap((cluster) => cluster.events);
    void this.preloadScreenshots(allLayoutShifts);
    return this.#compatibilityBuilder.appendEventsAtLevel(allLayoutShifts, currentLevel, this);
  }
  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */
  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event) {
    const renderingColor = ThemeSupport9.ThemeSupport.instance().getComputedValue("--app-color-rendering");
    if (Trace7.Types.Events.isSyntheticLayoutShiftCluster(event)) {
      const parsedColor = Common.Color.parse(renderingColor);
      if (parsedColor) {
        const colorWithAlpha = parsedColor.setAlpha(0.5).asString(
          "rgba"
          /* Common.Color.Format.RGBA */
        );
        return colorWithAlpha;
      }
    }
    return renderingColor;
  }
  setPopoverInfo(event, info) {
    const score = Trace7.Types.Events.isSyntheticLayoutShift(event) ? event.args.data?.weighted_score_delta ?? 0 : Trace7.Types.Events.isSyntheticLayoutShiftCluster(event) ? event.clusterCumulativeScore : -1;
    info.formattedTime = score.toFixed(4);
    info.title = Trace7.Types.Events.isSyntheticLayoutShift(event) ? i18nString7(UIStrings7.layoutShift) : Trace7.Types.Events.isSyntheticLayoutShiftCluster(event) ? i18nString7(UIStrings7.layoutShiftCluster) : event.name;
    if (Trace7.Types.Events.isSyntheticLayoutShift(event)) {
      const maxSize = new Geometry.Size(510, 400);
      const vizElem = _LayoutShiftsTrackAppender.createShiftViz(event, this.#parsedTrace, maxSize);
      if (vizElem) {
        info.additionalElements.push(vizElem);
      }
    }
  }
  getDrawOverride(event) {
    if (Trace7.Types.Events.isSyntheticLayoutShift(event)) {
      const score = event.args.data?.weighted_score_delta || 0;
      const bufferScale = 1 - Math.min(score / 0.1, 1);
      return (context, x, y, _width, levelHeight, _, transformColor) => {
        const maxBuffer = levelHeight / 3;
        const buffer = bufferScale * maxBuffer;
        const boxSize = levelHeight;
        const halfSize = boxSize / 2;
        context.save();
        context.beginPath();
        context.moveTo(x, y + buffer);
        context.lineTo(x + halfSize - buffer, y + halfSize);
        context.lineTo(x, y + levelHeight - buffer);
        context.lineTo(x - halfSize + buffer, y + halfSize);
        context.closePath();
        context.fillStyle = transformColor(this.colorForEvent(event));
        context.fill();
        context.restore();
        return {
          x: x - halfSize,
          width: boxSize
        };
      };
    }
    if (Trace7.Types.Events.isSyntheticLayoutShiftCluster(event)) {
      return (context, x, y, width, levelHeight, _, transformColor) => {
        const barHeight = levelHeight * 0.2;
        const barY = y + (levelHeight - barHeight) / 2 + 0.5;
        context.fillStyle = transformColor(this.colorForEvent(event));
        context.fillRect(x, barY, width - 0.5, barHeight - 1);
        return { x, width, z: -1 };
      };
    }
    return;
  }
  preloadScreenshots(events) {
    const screenshotsToLoad = /* @__PURE__ */ new Set();
    for (const event of events) {
      const shots = event.parsedData.screenshots;
      shots.before && screenshotsToLoad.add(shots.before);
      shots.after && screenshotsToLoad.add(shots.after);
    }
    const screenshots = Array.from(screenshotsToLoad);
    return Utils.ImageCache.preload(screenshots);
  }
  titleForEvent(_event) {
    return "";
  }
  static createShiftViz(event, parsedTrace, maxSize) {
    const screenshots = event.parsedData.screenshots;
    const { viewportRect, devicePixelRatio: dpr } = parsedTrace.data.Meta;
    const vizContainer = document.createElement("div");
    vizContainer.classList.add("layout-shift-viz");
    const beforeImg = screenshots.before && Utils.ImageCache.getOrQueue(screenshots.before);
    const afterImg = screenshots.after && Utils.ImageCache.getOrQueue(screenshots.after);
    if (!beforeImg || !afterImg || !viewportRect || dpr === void 0) {
      return;
    }
    const toCssPixelRect = (rect) => {
      return new DOMRect(rect[0] / dpr, rect[1] / dpr, rect[2] / dpr, rect[3] / dpr);
    };
    const screenshotImageScaleFactor = Math.min(beforeImg.naturalWidth / viewportRect.width, beforeImg.naturalHeight / viewportRect.height, 1);
    const maxSizeScaleFactor = Math.min(maxSize.width / beforeImg.naturalWidth, maxSize.height / beforeImg.naturalHeight, 1);
    for (const elem of [vizContainer, afterImg, beforeImg]) {
      elem.style.width = `${beforeImg.naturalWidth * maxSizeScaleFactor}px`;
      elem.style.height = `${beforeImg.naturalHeight * maxSizeScaleFactor}px`;
    }
    const beforeRects = event.args.data?.impacted_nodes?.map((node) => toCssPixelRect(node.old_rect)) ?? [];
    const afterRects = event.args.data?.impacted_nodes?.map((node) => toCssPixelRect(node.new_rect)) ?? [];
    function startVizAnimation() {
      if (!beforeImg || !afterImg) {
        return;
      }
      [beforeImg, afterImg].flatMap((img) => img.getAnimations()).forEach((a) => a.cancel());
      const easing = "ease-out";
      const vizAnimOpts = {
        duration: 3e3,
        iterations: Infinity,
        fill: "forwards",
        easing
      };
      afterImg.animate({ opacity: [0, 0, 1, 1, 1], easing }, vizAnimOpts);
      const getRectPosition = (rect) => ({
        left: `${rect.x * maxSizeScaleFactor * screenshotImageScaleFactor}px`,
        top: `${rect.y * maxSizeScaleFactor * screenshotImageScaleFactor}px`,
        width: `${rect.width * maxSizeScaleFactor * screenshotImageScaleFactor}px`,
        height: `${rect.height * maxSizeScaleFactor * screenshotImageScaleFactor}px`,
        opacity: 0.7,
        outlineWidth: "1px",
        easing
      });
      beforeRects.forEach((beforeRect, i) => {
        const afterRect = afterRects[i];
        const rectEl = document.createElement("div");
        rectEl.classList.add("layout-shift-viz-rect");
        vizContainer.appendChild(rectEl);
        let beforePos = getRectPosition(beforeRect);
        let afterPos = getRectPosition(afterRect);
        afterPos.opacity = 0.4;
        if ([beforeRect.width, beforeRect.height, beforeRect.x, beforeRect.y].every((v) => v === 0)) {
          beforePos = { ...afterPos };
          beforePos.opacity = "0";
        }
        if ([afterRect.width, afterRect.height, afterRect.x, afterRect.y].every((v) => v === 0)) {
          afterPos = { ...beforePos };
          afterPos.opacity = "0";
        }
        rectEl.animate([beforePos, beforePos, { ...afterPos, outlineWidth: "4px" }, afterPos, afterPos], vizAnimOpts);
      });
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(vizContainer, () => startVizAnimation());
    vizContainer.append(beforeImg, afterImg);
    return vizContainer;
  }
};

// gen/front_end/panels/timeline/ThreadAppender.js
var ThreadAppender_exports = {};
__export(ThreadAppender_exports, {
  ThreadAppender: () => ThreadAppender
});
import * as Common3 from "./../../core/common/common.js";
import * as i18n15 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Trace10 from "./../../models/trace/trace.js";
import * as PerfUI8 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as ThemeSupport11 from "./../../ui/legacy/theme_support/theme_support.js";

// gen/front_end/panels/timeline/ModificationsManager.js
var ModificationsManager_exports = {};
__export(ModificationsManager_exports, {
  AnnotationModifiedEvent: () => AnnotationModifiedEvent,
  ModificationsManager: () => ModificationsManager
});
import * as Common2 from "./../../core/common/common.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as Trace9 from "./../../models/trace/trace.js";
import * as TimelineComponents from "./components/components.js";

// gen/front_end/panels/timeline/EntriesFilter.js
var EntriesFilter_exports = {};
__export(EntriesFilter_exports, {
  EntriesFilter: () => EntriesFilter
});
import * as Platform2 from "./../../core/platform/platform.js";
import * as Trace8 from "./../../models/trace/trace.js";
import * as PerfUI7 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
var EntriesFilter = class {
  #parsedTrace;
  // Track the set of invisible entries.
  #invisibleEntries = [];
  // List of entries whose children are hidden. This list is used to
  // keep track of entries that should be identified in the UI as "expandable",
  // since they can be clicked to reveal their hidden children.
  #expandableEntries = [];
  // Cache for descendants of entry that have already been gathered. The descendants
  // will never change so we can avoid running the potentially expensive search again.
  #entryToDescendantsMap = /* @__PURE__ */ new Map();
  constructor(parsedTrace) {
    this.#parsedTrace = parsedTrace;
  }
  #getEntryNode(entry) {
    return this.#parsedTrace.data.Samples.entryToNode.get(entry) ?? this.#parsedTrace.data.Renderer.entryToNode.get(entry);
  }
  /**
   * Checks which actions can be applied on an entry. This allows us to only show possible actions in the Context Menu.
   * For example, if an entry has no children, COLLAPSE_FUNCTION will not change the FlameChart, therefore there is no need to show this action as an option.
   */
  findPossibleActions(entry) {
    const entryNode = this.#getEntryNode(entry);
    if (!entryNode) {
      return {
        [
          "MERGE_FUNCTION"
          /* PerfUI.FlameChart.FilterAction.MERGE_FUNCTION */
        ]: false,
        [
          "COLLAPSE_FUNCTION"
          /* PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION */
        ]: false,
        [
          "COLLAPSE_REPEATING_DESCENDANTS"
          /* PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS */
        ]: false,
        [
          "RESET_CHILDREN"
          /* PerfUI.FlameChart.FilterAction.RESET_CHILDREN */
        ]: false,
        [
          "UNDO_ALL_ACTIONS"
          /* PerfUI.FlameChart.FilterAction.UNDO_ALL_ACTIONS */
        ]: false
      };
    }
    const entryParent = entryNode.parent;
    const allVisibleDescendants = this.#findAllDescendantsOfNode(entryNode).filter((descendant) => !this.#invisibleEntries.includes(descendant));
    const allVisibleRepeatingDescendants = this.#findAllRepeatingDescendantsOfNext(entryNode).filter((descendant) => !this.#invisibleEntries.includes(descendant));
    const allInVisibleDescendants = this.#findAllDescendantsOfNode(entryNode).filter((descendant) => this.#invisibleEntries.includes(descendant));
    const possibleActions = {
      [
        "MERGE_FUNCTION"
        /* PerfUI.FlameChart.FilterAction.MERGE_FUNCTION */
      ]: entryParent !== null,
      [
        "COLLAPSE_FUNCTION"
        /* PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION */
      ]: allVisibleDescendants.length > 0,
      [
        "COLLAPSE_REPEATING_DESCENDANTS"
        /* PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS */
      ]: allVisibleRepeatingDescendants.length > 0,
      [
        "RESET_CHILDREN"
        /* PerfUI.FlameChart.FilterAction.RESET_CHILDREN */
      ]: allInVisibleDescendants.length > 0,
      [
        "UNDO_ALL_ACTIONS"
        /* PerfUI.FlameChart.FilterAction.UNDO_ALL_ACTIONS */
      ]: this.#invisibleEntries.length > 0
    };
    return possibleActions;
  }
  /**
   * Returns the amount of entry descendants that belong to the hidden entries array.
   * */
  findHiddenDescendantsAmount(entry) {
    const entryNode = this.#getEntryNode(entry);
    if (!entryNode) {
      return 0;
    }
    const allDescendants = this.#findAllDescendantsOfNode(entryNode);
    return allDescendants.filter((descendant) => this.invisibleEntries().includes(descendant)).length;
  }
  /**
   * Returns the set of entries that are invisible given the set of applied actions.
   */
  invisibleEntries() {
    return this.#invisibleEntries;
  }
  /**
   * Sets hidden and expandable. Called when a trace with modifications is loaded and some entries are set as hidden and expandable.
   * Both arrays are set together because if there is one, the other must be present too.
   */
  setHiddenAndExpandableEntries(invisibleEntries, expandableEntries) {
    this.#invisibleEntries.push(...invisibleEntries);
    this.#expandableEntries.push(...expandableEntries);
  }
  entryIsInvisible(entry) {
    return this.#invisibleEntries.includes(entry);
  }
  /**
   * Returns the array of entries that have a sign indicating that entries below are hidden,
   * and so that they can be "expanded" to reveal their hidden children.
   */
  expandableEntries() {
    return this.#expandableEntries;
  }
  /**
   * Applies an action to hide entries or removes entries
   * from hidden entries array depending on the action.
   */
  applyFilterAction(action2) {
    const entriesToHide = /* @__PURE__ */ new Set();
    switch (action2.type) {
      case "MERGE_FUNCTION": {
        entriesToHide.add(action2.entry);
        const actionNode = this.#getEntryNode(action2.entry) || null;
        const parentNode = actionNode && this.#firstVisibleParentNodeForEntryNode(actionNode);
        if (parentNode) {
          this.#addExpandableEntry(parentNode.entry);
        }
        break;
      }
      case "COLLAPSE_FUNCTION": {
        const entryNode = this.#getEntryNode(action2.entry);
        if (!entryNode) {
          break;
        }
        const allDescendants = this.#findAllDescendantsOfNode(entryNode);
        allDescendants.forEach((descendant) => entriesToHide.add(descendant));
        this.#addExpandableEntry(action2.entry);
        break;
      }
      case "COLLAPSE_REPEATING_DESCENDANTS": {
        const entryNode = this.#getEntryNode(action2.entry);
        if (!entryNode) {
          break;
        }
        const allRepeatingDescendants = this.#findAllRepeatingDescendantsOfNext(entryNode);
        allRepeatingDescendants.forEach((descendant) => entriesToHide.add(descendant));
        if (entriesToHide.size > 0) {
          this.#addExpandableEntry(action2.entry);
        }
        break;
      }
      case "UNDO_ALL_ACTIONS": {
        this.#invisibleEntries = [];
        this.#expandableEntries = [];
        break;
      }
      case "RESET_CHILDREN": {
        this.#makeEntryChildrenVisible(action2.entry);
        break;
      }
      default:
        Platform2.assertNever(action2.type, `Unknown EntriesFilter action: ${action2.type}`);
    }
    this.#invisibleEntries.push(...entriesToHide);
    return this.#invisibleEntries;
  }
  /**
   * Add an entry to the array of entries that have a sign indicating that entries below are hidden.
   * Also, remove all of the child entries of the new expandable entry from the expandable array. Do that because
   * to draw the initiator from the closest visible entry, we need to get the closest entry that is
   * marked as expandable and we do not want to get some that are hidden.
   */
  #addExpandableEntry(entry) {
    this.#expandableEntries.push(entry);
    const entryNode = this.#getEntryNode(entry);
    if (!entryNode) {
      return;
    }
    const allDescendants = this.#findAllDescendantsOfNode(entryNode);
    if (allDescendants.length > 0) {
      this.#expandableEntries = this.#expandableEntries.filter((entry2) => {
        return !allDescendants.includes(entry2);
      });
    }
  }
  firstVisibleParentEntryForEntry(entry) {
    const node = this.#getEntryNode(entry);
    if (!node) {
      return null;
    }
    const parent = this.#firstVisibleParentNodeForEntryNode(node);
    return parent ? parent.entry : null;
  }
  // The direct parent might be hidden by other actions, therefore we look for the next visible parent.
  #firstVisibleParentNodeForEntryNode(node) {
    let parent = node.parent;
    while (parent && this.#invisibleEntries.includes(parent.entry) || parent && !entryIsVisibleInTimeline(parent.entry)) {
      parent = parent.parent;
    }
    return parent;
  }
  #findAllDescendantsOfNode(root) {
    const cachedDescendants = this.#entryToDescendantsMap.get(root);
    if (cachedDescendants) {
      return cachedDescendants;
    }
    const descendants = [];
    const children = [...root.children];
    while (children.length > 0) {
      const childNode = children.shift();
      if (childNode) {
        descendants.push(childNode.entry);
        const childNodeCachedDescendants = this.#entryToDescendantsMap.get(childNode);
        if (childNodeCachedDescendants) {
          descendants.push(...childNodeCachedDescendants);
        } else {
          children.push(...childNode.children);
        }
      }
    }
    this.#entryToDescendantsMap.set(root, descendants);
    return descendants;
  }
  #findAllRepeatingDescendantsOfNext(root) {
    const children = [...root.children];
    const repeatingNodes = [];
    const rootIsProfileCall = Trace8.Types.Events.isProfileCall(root.entry);
    while (children.length > 0) {
      const childNode = children.shift();
      if (childNode) {
        const childIsProfileCall = Trace8.Types.Events.isProfileCall(childNode.entry);
        if (
          /* Handle SyntheticProfileCalls */
          rootIsProfileCall && childIsProfileCall
        ) {
          const rootNodeEntry = root.entry;
          const childNodeEntry = childNode.entry;
          if (Trace8.Helpers.SamplesIntegrator.SamplesIntegrator.framesAreEqual(rootNodeEntry.callFrame, childNodeEntry.callFrame)) {
            repeatingNodes.push(childNode.entry);
          }
        } else if (!rootIsProfileCall && !childIsProfileCall) {
          if (root.entry.name === childNode.entry.name) {
            repeatingNodes.push(childNode.entry);
          }
        }
        children.push(...childNode.children);
      }
    }
    return repeatingNodes;
  }
  /**
   * If an entry was selected from a link instead of clicking on it,
   * it might be in the invisible entries array.
   * If it is, reveal it by resetting clidren the closest expandable entry,
   */
  revealEntry(entry) {
    const entryNode = this.#getEntryNode(entry);
    if (!entryNode) {
      return;
    }
    let closestExpandableParent = entryNode;
    while (closestExpandableParent.parent && !this.#expandableEntries.includes(closestExpandableParent.entry)) {
      closestExpandableParent = closestExpandableParent.parent;
    }
    this.#makeEntryChildrenVisible(closestExpandableParent.entry);
  }
  /**
   * Removes all of the entry children from the
   * invisible entries array to make them visible.
   */
  #makeEntryChildrenVisible(entry) {
    const entryNode = this.#getEntryNode(entry);
    if (!entryNode) {
      return;
    }
    const descendants = this.#findAllDescendantsOfNode(entryNode);
    this.#invisibleEntries = this.#invisibleEntries.filter((entry2) => {
      if (descendants.includes(entry2)) {
        return false;
      }
      return true;
    });
    this.#expandableEntries = this.#expandableEntries.filter((iterEntry) => {
      if (descendants.includes(iterEntry) || iterEntry === entry) {
        return false;
      }
      return true;
    });
  }
  isEntryExpandable(event) {
    return this.#expandableEntries.includes(event);
  }
};

// gen/front_end/panels/timeline/ModificationsManager.js
var modificationsManagerByTraceIndex = [];
var activeManager;
var AnnotationModifiedEvent = class _AnnotationModifiedEvent extends Event {
  overlay;
  action;
  muteAriaNotifications;
  static eventName = "annotationmodifiedevent";
  constructor(overlay, action2, muteAriaNotifications = false) {
    super(_AnnotationModifiedEvent.eventName);
    this.overlay = overlay;
    this.action = action2;
    this.muteAriaNotifications = muteAriaNotifications;
  }
};
var ModificationsManager = class _ModificationsManager extends EventTarget {
  #entriesFilter;
  #timelineBreadcrumbs;
  #modifications = null;
  #parsedTrace;
  #eventsSerializer;
  #overlayForAnnotation;
  #annotationsHiddenSetting;
  /**
   * Gets the ModificationsManager instance corresponding to a trace
   * given its index used in Model#traces. If no index is passed gets
   * the manager instance for the last trace. If no instance is found,
   * throws.
   */
  static activeManager() {
    return activeManager;
  }
  static reset() {
    modificationsManagerByTraceIndex.length = 0;
    activeManager = null;
  }
  /**
   * Initializes a ModificationsManager instance for a parsed trace or changes the active manager for an existing one.
   * This needs to be called if and a trace has been parsed or switched to.
   */
  static initAndActivateModificationsManager(traceModel, traceIndex) {
    if (modificationsManagerByTraceIndex[traceIndex]) {
      if (activeManager === modificationsManagerByTraceIndex[traceIndex]) {
        return activeManager;
      }
      activeManager = modificationsManagerByTraceIndex[traceIndex];
      _ModificationsManager.activeManager()?.applyModificationsIfPresent();
    }
    const parsedTrace = traceModel.parsedTrace(traceIndex);
    if (!parsedTrace) {
      throw new Error("ModificationsManager was initialized without a corresponding trace data");
    }
    const traceBounds = parsedTrace.data.Meta.traceBounds;
    const newModificationsManager = new _ModificationsManager({
      parsedTrace,
      traceBounds,
      rawTraceEvents: parsedTrace.traceEvents,
      modifications: parsedTrace.metadata.modifications,
      syntheticEvents: parsedTrace.syntheticEventsManager.getSyntheticTraces()
    });
    modificationsManagerByTraceIndex[traceIndex] = newModificationsManager;
    activeManager = newModificationsManager;
    _ModificationsManager.activeManager()?.applyModificationsIfPresent();
    return this.activeManager();
  }
  constructor({ parsedTrace, traceBounds, modifications }) {
    super();
    this.#entriesFilter = new EntriesFilter(parsedTrace);
    this.#timelineBreadcrumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(traceBounds);
    this.#modifications = modifications || null;
    this.#parsedTrace = parsedTrace;
    this.#eventsSerializer = new Trace9.EventsSerializer.EventsSerializer();
    this.#annotationsHiddenSetting = Common2.Settings.Settings.instance().moduleSetting("annotations-hidden");
    this.#overlayForAnnotation = /* @__PURE__ */ new Map();
  }
  getEntriesFilter() {
    return this.#entriesFilter;
  }
  getTimelineBreadcrumbs() {
    return this.#timelineBreadcrumbs;
  }
  deleteEmptyRangeAnnotations() {
    for (const annotation of this.#overlayForAnnotation.keys()) {
      if (annotation.type === "TIME_RANGE" && annotation.label.length === 0) {
        this.removeAnnotation(annotation);
      }
    }
  }
  /**
   * Stores the annotation and creates its overlay.
   * @returns the Overlay that gets created and associated with this annotation.
   */
  createAnnotation(newAnnotation, opts) {
    if (newAnnotation.type === "ENTRY_LABEL") {
      const overlay = this.#findLabelOverlayForEntry(newAnnotation.entry);
      if (overlay) {
        this.dispatchEvent(new AnnotationModifiedEvent(overlay, "EnterLabelEditState"));
        return overlay;
      }
    }
    if (!opts.loadedFromFile) {
      if (newAnnotation.type !== "TIME_RANGE") {
        this.#annotationsHiddenSetting.set(false);
      }
    }
    const newOverlay = this.#createOverlayFromAnnotation(newAnnotation);
    this.#overlayForAnnotation.set(newAnnotation, newOverlay);
    this.dispatchEvent(new AnnotationModifiedEvent(newOverlay, "Add", opts.muteAriaNotifications));
    return newOverlay;
  }
  linkAnnotationBetweenEntriesExists(entryFrom, entryTo) {
    for (const annotation of this.#overlayForAnnotation.keys()) {
      if (annotation.type === "ENTRIES_LINK" && (annotation.entryFrom === entryFrom && annotation.entryTo === entryTo || annotation.entryFrom === entryTo && annotation.entryTo === entryFrom)) {
        return true;
      }
    }
    return false;
  }
  #findLabelOverlayForEntry(entry) {
    for (const [annotation, overlay] of this.#overlayForAnnotation.entries()) {
      if (annotation.type === "ENTRY_LABEL" && annotation.entry === entry) {
        return overlay;
      }
    }
    return null;
  }
  bringEntryLabelForwardIfExists(entry) {
    const overlay = this.#findLabelOverlayForEntry(entry);
    if (overlay?.type === "ENTRY_LABEL") {
      this.dispatchEvent(new AnnotationModifiedEvent(overlay, "LabelBringForward"));
    }
  }
  #createOverlayFromAnnotation(annotation) {
    switch (annotation.type) {
      case "ENTRY_LABEL":
        return {
          type: "ENTRY_LABEL",
          entry: annotation.entry,
          label: annotation.label
        };
      case "TIME_RANGE":
        return {
          type: "TIME_RANGE",
          label: annotation.label,
          showDuration: true,
          bounds: annotation.bounds
        };
      case "ENTRIES_LINK":
        return {
          type: "ENTRIES_LINK",
          state: annotation.state,
          entryFrom: annotation.entryFrom,
          entryTo: annotation.entryTo
        };
      default:
        Platform3.assertNever(annotation, "Overlay for provided annotation cannot be created");
    }
  }
  removeAnnotation(removedAnnotation) {
    const overlayToRemove = this.#overlayForAnnotation.get(removedAnnotation);
    if (!overlayToRemove) {
      console.warn("Overlay for deleted Annotation does not exist", removedAnnotation);
      return;
    }
    this.#overlayForAnnotation.delete(removedAnnotation);
    this.dispatchEvent(new AnnotationModifiedEvent(overlayToRemove, "Remove"));
  }
  removeAnnotationOverlay(removedOverlay) {
    const annotationForRemovedOverlay = this.getAnnotationByOverlay(removedOverlay);
    if (!annotationForRemovedOverlay) {
      console.warn("Annotation for deleted Overlay does not exist", removedOverlay);
      return;
    }
    this.removeAnnotation(annotationForRemovedOverlay);
  }
  updateAnnotation(updatedAnnotation) {
    const overlay = this.#overlayForAnnotation.get(updatedAnnotation);
    if (overlay && isTimeRangeLabel(overlay) && Trace9.Types.File.isTimeRangeAnnotation(updatedAnnotation)) {
      overlay.label = updatedAnnotation.label;
      overlay.bounds = updatedAnnotation.bounds;
      this.dispatchEvent(new AnnotationModifiedEvent(overlay, "UpdateTimeRange"));
    } else if (overlay && isEntriesLink(overlay) && Trace9.Types.File.isEntriesLinkAnnotation(updatedAnnotation)) {
      overlay.state = updatedAnnotation.state;
      overlay.entryFrom = updatedAnnotation.entryFrom;
      overlay.entryTo = updatedAnnotation.entryTo;
      this.dispatchEvent(new AnnotationModifiedEvent(overlay, "UpdateLinkToEntry"));
    } else {
      console.error("Annotation could not be updated");
    }
  }
  updateAnnotationOverlay(updatedOverlay) {
    const annotationForUpdatedOverlay = this.getAnnotationByOverlay(updatedOverlay);
    if (!annotationForUpdatedOverlay) {
      console.warn("Annotation for updated Overlay does not exist");
      return;
    }
    if (updatedOverlay.type === "ENTRY_LABEL" && annotationForUpdatedOverlay.type === "ENTRY_LABEL" || updatedOverlay.type === "TIME_RANGE" && annotationForUpdatedOverlay.type === "TIME_RANGE") {
      this.#annotationsHiddenSetting.set(false);
      annotationForUpdatedOverlay.label = updatedOverlay.label;
      this.dispatchEvent(new AnnotationModifiedEvent(updatedOverlay, "UpdateLabel"));
    }
    if (updatedOverlay.type === "ENTRIES_LINK" && annotationForUpdatedOverlay.type === "ENTRIES_LINK") {
      this.#annotationsHiddenSetting.set(false);
      annotationForUpdatedOverlay.state = updatedOverlay.state;
    }
  }
  getAnnotationByOverlay(overlay) {
    for (const [annotation, currOverlay] of this.#overlayForAnnotation.entries()) {
      if (currOverlay === overlay) {
        return annotation;
      }
    }
    return null;
  }
  getOverlaybyAnnotation(annotation) {
    return this.#overlayForAnnotation.get(annotation) || null;
  }
  getAnnotations() {
    return [...this.#overlayForAnnotation.keys()];
  }
  getOverlays() {
    return [...this.#overlayForAnnotation.values()];
  }
  applyAnnotationsFromCache(opts) {
    this.#modifications = this.toJSON();
    this.#overlayForAnnotation.clear();
    this.#applyStoredAnnotations(this.#modifications.annotations, opts);
  }
  /**
   * Builds all modifications into a serializable object written into
   * the 'modifications' trace file metadata field.
   */
  toJSON() {
    const hiddenEntries = this.#entriesFilter.invisibleEntries().map((entry) => this.#eventsSerializer.keyForEvent(entry)).filter((entry) => entry !== null);
    const expandableEntries = this.#entriesFilter.expandableEntries().map((entry) => this.#eventsSerializer.keyForEvent(entry)).filter((entry) => entry !== null);
    this.#modifications = {
      entriesModifications: {
        hiddenEntries,
        expandableEntries
      },
      initialBreadcrumb: this.#timelineBreadcrumbs.initialBreadcrumb,
      annotations: this.#annotationsJSON()
    };
    return this.#modifications;
  }
  #annotationsJSON() {
    const annotations = this.getAnnotations();
    const entryLabelsSerialized = [];
    const labelledTimeRangesSerialized = [];
    const linksBetweenEntriesSerialized = [];
    for (let i = 0; i < annotations.length; i++) {
      const currAnnotation = annotations[i];
      if (Trace9.Types.File.isEntryLabelAnnotation(currAnnotation)) {
        const serializedEvent = this.#eventsSerializer.keyForEvent(currAnnotation.entry);
        if (serializedEvent) {
          entryLabelsSerialized.push({
            entry: serializedEvent,
            label: currAnnotation.label
          });
        }
      } else if (Trace9.Types.File.isTimeRangeAnnotation(currAnnotation)) {
        labelledTimeRangesSerialized.push({
          bounds: currAnnotation.bounds,
          label: currAnnotation.label
        });
      } else if (Trace9.Types.File.isEntriesLinkAnnotation(currAnnotation)) {
        if (currAnnotation.entryTo) {
          const serializedFromEvent = this.#eventsSerializer.keyForEvent(currAnnotation.entryFrom);
          const serializedToEvent = this.#eventsSerializer.keyForEvent(currAnnotation.entryTo);
          if (serializedFromEvent && serializedToEvent) {
            linksBetweenEntriesSerialized.push({
              entryFrom: serializedFromEvent,
              entryTo: serializedToEvent
            });
          }
        }
      }
    }
    return {
      entryLabels: entryLabelsSerialized,
      labelledTimeRanges: labelledTimeRangesSerialized,
      linksBetweenEntries: linksBetweenEntriesSerialized
    };
  }
  applyModificationsIfPresent() {
    if (!this.#modifications || !this.#modifications.annotations) {
      return;
    }
    const hiddenEntries = this.#modifications.entriesModifications.hiddenEntries;
    const expandableEntries = this.#modifications.entriesModifications.expandableEntries;
    this.#timelineBreadcrumbs.setInitialBreadcrumbFromLoadedModifications(this.#modifications.initialBreadcrumb);
    this.#applyEntriesFilterModifications(hiddenEntries, expandableEntries);
    this.#applyStoredAnnotations(this.#modifications.annotations, {
      muteAriaNotifications: false
    });
  }
  #applyStoredAnnotations(annotations, opts) {
    try {
      const entryLabels = annotations.entryLabels ?? [];
      entryLabels.forEach((entryLabel) => {
        this.createAnnotation({
          type: "ENTRY_LABEL",
          entry: this.#eventsSerializer.eventForKey(entryLabel.entry, this.#parsedTrace),
          label: entryLabel.label
        }, {
          loadedFromFile: true,
          muteAriaNotifications: opts.muteAriaNotifications
        });
      });
      const timeRanges = annotations.labelledTimeRanges ?? [];
      timeRanges.forEach((timeRange) => {
        this.createAnnotation({
          type: "TIME_RANGE",
          bounds: timeRange.bounds,
          label: timeRange.label
        }, {
          loadedFromFile: true,
          muteAriaNotifications: opts.muteAriaNotifications
        });
      });
      const linksBetweenEntries = annotations.linksBetweenEntries ?? [];
      linksBetweenEntries.forEach((linkBetweenEntries) => {
        this.createAnnotation({
          type: "ENTRIES_LINK",
          state: "connected",
          entryFrom: this.#eventsSerializer.eventForKey(linkBetweenEntries.entryFrom, this.#parsedTrace),
          entryTo: this.#eventsSerializer.eventForKey(linkBetweenEntries.entryTo, this.#parsedTrace)
        }, {
          loadedFromFile: true,
          muteAriaNotifications: opts.muteAriaNotifications
        });
      });
    } catch (err) {
      console.warn("Failed to apply stored annotations", err);
    }
  }
  #applyEntriesFilterModifications(hiddenEntriesKeys, expandableEntriesKeys) {
    try {
      const hiddenEntries = hiddenEntriesKeys.map((key) => this.#eventsSerializer.eventForKey(key, this.#parsedTrace));
      const expandableEntries = expandableEntriesKeys.map((key) => this.#eventsSerializer.eventForKey(key, this.#parsedTrace));
      this.#entriesFilter.setHiddenAndExpandableEntries(hiddenEntries, expandableEntries);
    } catch (err) {
      console.warn("Failed to apply entriesFilter modifications", err);
      this.#entriesFilter.setHiddenAndExpandableEntries([], []);
    }
  }
};

// gen/front_end/panels/timeline/ThreadAppender.js
import * as Utils2 from "./utils/utils.js";
var UIStrings8 = {
  /**
   * @description Text shown for an entry in the flame chart that is ignored because it matches
   * a predefined ignore list.
   * @example {/analytics\.js$} rule
   */
  onIgnoreList: "On ignore list ({rule})",
  /**
   * @description Refers to the "Main frame", meaning the top level frame. See https://www.w3.org/TR/html401/present/frames.html
   * @example {example.com} PH1
   */
  mainS: "Main \u2014 {PH1}",
  /**
   * @description Refers to the main thread of execution of a program. See https://developer.mozilla.org/en-US/docs/Glossary/Main_thread
   */
  main: "Main",
  /**
   * @description Refers to any frame in the page. See https://www.w3.org/TR/html401/present/frames.html
   * @example {https://example.com} PH1
   */
  frameS: "Frame \u2014 {PH1}",
  /**
   * @description A web worker in the page. See https://developer.mozilla.org/en-US/docs/Web/API/Worker
   * @example {https://google.com} PH1
   */
  workerS: "`Worker` \u2014 {PH1}",
  /**
   * @description A web worker in the page. See https://developer.mozilla.org/en-US/docs/Web/API/Worker
   * @example {FormatterWorker} PH1
   * @example {https://google.com} PH2
   */
  workerSS: "`Worker`: {PH1} \u2014 {PH2}",
  /**
   * @description Label for a web worker exclusively allocated for a purpose.
   */
  dedicatedWorker: "Dedicated `Worker`",
  /**
   * @description A generic name given for a thread running in the browser (sequence of programmed instructions).
   * The placeholder is an enumeration given to the thread.
   * @example {1} PH1
   */
  threadS: "Thread {PH1}",
  /**
   * @description Rasterization in computer graphics.
   */
  raster: "Raster",
  /**
   * @description Threads used for background tasks.
   */
  threadPool: "Thread pool",
  /**
   * @description Name for a thread that rasterizes graphics in a website.
   * @example {2} PH1
   */
  rasterizerThreadS: "Rasterizer thread {PH1}",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   * @example {2} PH1
   */
  threadPoolThreadS: "Thread pool worker {PH1}",
  /**
   * @description Title of a bidder auction worklet with known URL in the timeline flame chart of the Performance panel
   * @example {https://google.com} PH1
   */
  bidderWorkletS: "Bidder Worklet \u2014 {PH1}",
  /**
   * @description Title of a bidder auction worklet in the timeline flame chart of the Performance panel with an unknown URL
   */
  bidderWorklet: "Bidder Worklet",
  /**
   * @description Title of a seller auction worklet in the timeline flame chart of the Performance panel with an unknown URL
   */
  sellerWorklet: "Seller Worklet",
  /**
   * @description Title of an auction worklet in the timeline flame chart of the Performance panel with an unknown URL
   */
  unknownWorklet: "Auction Worklet",
  /**
   * @description Title of control thread of a service process for an auction worklet in the timeline flame chart of the Performance panel with an unknown URL
   */
  workletService: "Auction Worklet service",
  /**
   * @description Title of a seller auction worklet with known URL in the timeline flame chart of the Performance panel
   * @example {https://google.com} PH1
   */
  sellerWorkletS: "Seller Worklet \u2014 {PH1}",
  /**
   * @description Title of an auction worklet with known URL in the timeline flame chart of the Performance panel
   * @example {https://google.com} PH1
   */
  unknownWorkletS: "Auction Worklet \u2014 {PH1}",
  /**
   * @description Title of control thread of a service process for an auction worklet with known URL in the timeline flame chart of the Performance panel
   * @example {https://google.com} PH1
   */
  workletServiceS: "Auction Worklet service \u2014 {PH1}"
};
var str_8 = i18n15.i18n.registerUIStrings("panels/timeline/ThreadAppender.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var ThreadAppender = class {
  appenderName = "Thread";
  #colorGenerator;
  #compatibilityBuilder;
  #parsedTrace;
  #entries = [];
  #tree;
  #processId;
  #threadId;
  #threadDefaultName;
  #expanded = false;
  #headerAppended = false;
  threadType = "MAIN_THREAD";
  isOnMainFrame;
  #showAllEventsEnabled = Root.Runtime.experiments.isEnabled("timeline-show-all-events");
  #url = "";
  #headerNestingLevel = null;
  constructor(compatibilityBuilder, parsedTrace, processId, threadId, threadName, type, entries, tree) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = new Common3.Color.Generator({ min: 30, max: 330, count: void 0 }, { min: 50, max: 80, count: 3 }, 85);
    this.#colorGenerator.setColorForID("", "#f2ecdc");
    this.#parsedTrace = parsedTrace;
    this.#processId = processId;
    this.#threadId = threadId;
    if (!entries || !tree) {
      throw new Error(`Could not find data for thread with id ${threadId} in process with id ${processId}`);
    }
    this.#entries = entries;
    this.#tree = tree;
    this.#threadDefaultName = threadName || i18nString8(UIStrings8.threadS, { PH1: threadId });
    this.isOnMainFrame = Boolean(this.#parsedTrace.data.Renderer?.processes.get(processId)?.isOnMainFrame);
    this.threadType = type;
    if (this.#parsedTrace.data.AuctionWorklets.worklets.has(processId)) {
      this.appenderName = "Thread_AuctionWorklet";
    }
    this.#url = this.#parsedTrace.data.Renderer?.processes.get(this.#processId)?.url || "";
  }
  processId() {
    return this.#processId;
  }
  threadId() {
    return this.#threadId;
  }
  /**
   * Appends into the flame chart data the data corresponding to the
   * this thread.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded whether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel, expanded = false) {
    if (this.#entries.length === 0) {
      return trackStartLevel;
    }
    this.#expanded = expanded;
    return this.#appendTreeAtLevel(trackStartLevel);
  }
  setHeaderNestingLevel(level) {
    this.#headerNestingLevel = level;
  }
  /**
   * Track header is appended only if there are events visible on it.
   * Otherwise we don't append any track. So, instead of preemptively
   * appending a track before appending its events, we only do so once
   * we have detected that the track contains an event that is visible.
   */
  #ensureTrackHeaderAppended(trackStartLevel) {
    if (this.#headerAppended) {
      return;
    }
    if (this.threadType === "RASTERIZER" || this.threadType === "THREAD_POOL") {
      this.#appendGroupedTrackHeaderAndTitle(trackStartLevel, this.threadType);
    } else {
      this.#appendTrackHeaderAtLevel(trackStartLevel);
    }
    this.#headerAppended = true;
  }
  setHeaderAppended(headerAppended) {
    this.#headerAppended = headerAppended;
  }
  headerAppended() {
    return this.#headerAppended;
  }
  /**
   * Adds into the flame chart data the header corresponding to this
   * thread. A header is added in the shape of a group in the flame
   * chart data. A group has a predefined style and a reference to the
   * definition of the legacy track (which should be removed in the
   * future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel) {
    const trackIsCollapsible = this.#entries.length > 0;
    const style = buildGroupStyle({
      shareHeaderLine: false,
      collapsible: trackIsCollapsible ? 0 : 1
    });
    if (this.#headerNestingLevel !== null) {
      style.nestingLevel = this.#headerNestingLevel;
    }
    const visualLoggingName = this.#visualLoggingNameForThread();
    const group = buildTrackHeader(
      visualLoggingName,
      currentLevel,
      this.trackName(),
      style,
      /* selectable= */
      true,
      this.#expanded,
      /* showStackContextMenu= */
      true
    );
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  #visualLoggingNameForThread() {
    switch (this.threadType) {
      case "MAIN_THREAD":
        return this.isOnMainFrame ? "thread.main" : "thread.frame";
      case "WORKER":
        return "thread.worker";
      case "RASTERIZER":
        return "thread.rasterizer";
      case "AUCTION_WORKLET":
        return "thread.auction-worklet";
      case "OTHER":
        return "thread.other";
      case "CPU_PROFILE":
        return "thread.cpu-profile";
      case "THREAD_POOL":
        return "thread.pool";
      default:
        return null;
    }
  }
  /**
   * Raster threads are rendered under a single header in the
   * flamechart. However, each thread has a unique title which needs to
   * be added to the flamechart data.
   */
  #appendGroupedTrackHeaderAndTitle(trackStartLevel, threadType) {
    const currentTrackCount = this.#compatibilityBuilder.getCurrentTrackCountForThreadType(threadType);
    if (currentTrackCount === 0) {
      const trackIsCollapsible = this.#entries.length > 0;
      const headerStyle = buildGroupStyle({
        shareHeaderLine: false,
        collapsible: trackIsCollapsible ? 0 : 1
      });
      const headerGroup = buildTrackHeader(
        null,
        trackStartLevel,
        this.trackName(),
        headerStyle,
        /* selectable= */
        false,
        this.#expanded
      );
      this.#compatibilityBuilder.getFlameChartTimelineData().groups.push(headerGroup);
    }
    const titleStyle = buildGroupStyle({
      padding: 2,
      nestingLevel: 1,
      collapsible: 1
      /* PerfUI.FlameChart.GroupCollapsibleState.NEVER */
    });
    const rasterizerTitle = this.threadType === "RASTERIZER" ? i18nString8(UIStrings8.rasterizerThreadS, { PH1: currentTrackCount + 1 }) : i18nString8(UIStrings8.threadPoolThreadS, { PH1: currentTrackCount + 1 });
    const visualLoggingName = this.#visualLoggingNameForThread();
    const titleGroup = buildTrackHeader(
      visualLoggingName,
      trackStartLevel,
      rasterizerTitle,
      titleStyle,
      /* selectable= */
      true,
      this.#expanded
    );
    this.#compatibilityBuilder.registerTrackForGroup(titleGroup, this);
  }
  trackName() {
    let threadTypeLabel = null;
    switch (this.threadType) {
      case "MAIN_THREAD":
        threadTypeLabel = this.isOnMainFrame ? i18nString8(UIStrings8.mainS, { PH1: this.#url }) : i18nString8(UIStrings8.frameS, { PH1: this.#url });
        break;
      case "CPU_PROFILE":
        threadTypeLabel = i18nString8(UIStrings8.main);
        break;
      case "WORKER":
        threadTypeLabel = this.#buildNameForWorker();
        break;
      case "RASTERIZER":
        threadTypeLabel = i18nString8(UIStrings8.raster);
        break;
      case "THREAD_POOL":
        threadTypeLabel = i18nString8(UIStrings8.threadPool);
        break;
      case "OTHER":
        break;
      case "AUCTION_WORKLET":
        threadTypeLabel = this.#buildNameForAuctionWorklet();
        break;
      default:
        return Platform4.assertNever(this.threadType, `Unknown thread type: ${this.threadType}`);
    }
    let suffix = "";
    if (this.#parsedTrace.data.Meta.traceIsGeneric) {
      suffix = suffix + ` (${this.threadId()})`;
    }
    return (threadTypeLabel || this.#threadDefaultName) + suffix;
  }
  getUrl() {
    return this.#url;
  }
  getEntries() {
    return this.#entries;
  }
  #buildNameForAuctionWorklet() {
    const workletMetadataEvent = this.#parsedTrace.data.AuctionWorklets.worklets.get(this.#processId);
    if (!workletMetadataEvent) {
      return i18nString8(UIStrings8.unknownWorklet);
    }
    const host = workletMetadataEvent.host ? `https://${workletMetadataEvent.host}` : "";
    const shouldAddHost = host.length > 0;
    const isUtilityThread = workletMetadataEvent.args.data.utilityThread.tid === this.#threadId;
    const isBidderOrSeller = workletMetadataEvent.args.data.v8HelperThread.tid === this.#threadId;
    if (isUtilityThread) {
      return shouldAddHost ? i18nString8(UIStrings8.workletServiceS, { PH1: host }) : i18nString8(UIStrings8.workletService);
    }
    if (isBidderOrSeller) {
      switch (workletMetadataEvent.type) {
        case "seller":
          return shouldAddHost ? i18nString8(UIStrings8.sellerWorkletS, { PH1: host }) : i18nString8(UIStrings8.sellerWorklet);
        case "bidder":
          return shouldAddHost ? i18nString8(UIStrings8.bidderWorkletS, { PH1: host }) : i18nString8(UIStrings8.bidderWorklet);
        case "unknown":
          return shouldAddHost ? i18nString8(UIStrings8.unknownWorkletS, { PH1: host }) : i18nString8(UIStrings8.unknownWorklet);
        default:
          Platform4.assertNever(workletMetadataEvent.type, `Unexpected Auction Worklet Type ${workletMetadataEvent.type}`);
      }
    }
    return shouldAddHost ? i18nString8(UIStrings8.unknownWorkletS, { PH1: host }) : i18nString8(UIStrings8.unknownWorklet);
  }
  #buildNameForWorker() {
    const url = this.#parsedTrace.data.Renderer?.processes.get(this.#processId)?.url || "";
    const workerId = this.#parsedTrace.data.Workers.workerIdByThread.get(this.#threadId);
    const workerURL = workerId ? this.#parsedTrace.data.Workers.workerURLById.get(workerId) : url;
    let workerName = workerURL ? i18nString8(UIStrings8.workerS, { PH1: workerURL }) : i18nString8(UIStrings8.dedicatedWorker);
    const workerTarget = workerId !== void 0 && SDK.TargetManager.TargetManager.instance().targetById(workerId);
    if (workerTarget) {
      workerName = i18nString8(UIStrings8.workerSS, { PH1: workerTarget.name(), PH2: url });
    }
    return workerName;
  }
  /**
   * Adds into the flame chart data the entries of this thread, which
   * includes trace events and JS calls.
   * @param currentLevel the flame chart level from which entries will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * entries (the first available level to append more data).
   */
  #appendTreeAtLevel(trackStartLevel) {
    return this.#appendNodesAtLevel(this.#tree.roots, trackStartLevel);
  }
  /**
   * Traverses the trees formed by the provided nodes in breadth first
   * fashion and appends each node's entry on each iteration. As each
   * entry is handled, a check for the its visibility or if it's ignore
   * listed is done before appending.
   */
  #appendNodesAtLevel(nodes, startingLevel, parentIsIgnoredListed = false) {
    const invisibleEntries = ModificationsManager.activeManager()?.getEntriesFilter().invisibleEntries() ?? [];
    let maxDepthInTree = startingLevel;
    for (const node of nodes) {
      let nextLevel = startingLevel;
      const entry = node.entry;
      const entryIsIgnoreListed = Utils2.IgnoreList.isIgnoreListedEntry(entry);
      const entryIsVisible = !invisibleEntries.includes(entry) && (entryIsVisibleInTimeline(entry, this.#parsedTrace) || this.#showAllEventsEnabled);
      const skipEventDueToIgnoreListing = entryIsIgnoreListed && parentIsIgnoredListed;
      if (entryIsVisible && !skipEventDueToIgnoreListing) {
        this.#appendEntryAtLevel(entry, startingLevel);
        nextLevel++;
      }
      const depthInChildTree = this.#appendNodesAtLevel(node.children, nextLevel, entryIsIgnoreListed);
      maxDepthInTree = Math.max(depthInChildTree, maxDepthInTree);
    }
    return maxDepthInTree;
  }
  #appendEntryAtLevel(entry, level) {
    this.#ensureTrackHeaderAppended(level);
    const index = this.#compatibilityBuilder.appendEventAtLevel(entry, level, this);
    this.#addDecorationsToEntry(entry, index);
  }
  #addDecorationsToEntry(entry, index) {
    const flameChartData = this.#compatibilityBuilder.getFlameChartTimelineData();
    if (ModificationsManager.activeManager()?.getEntriesFilter().isEntryExpandable(entry)) {
      addDecorationToEvent(flameChartData, index, {
        type: "HIDDEN_DESCENDANTS_ARROW"
        /* PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW */
      });
    }
    const warnings = this.#parsedTrace.data.Warnings.perEvent.get(entry);
    if (!warnings) {
      return;
    }
    addDecorationToEvent(flameChartData, index, {
      type: "WARNING_TRIANGLE"
      /* PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE */
    });
    if (!warnings.includes("LONG_TASK")) {
      return;
    }
    addDecorationToEvent(flameChartData, index, {
      type: "CANDY",
      startAtTime: Trace10.Handlers.ModelHandlers.Warnings.LONG_MAIN_THREAD_TASK_THRESHOLD
    });
  }
  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */
  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event) {
    if (this.#parsedTrace.data.Meta.traceIsGeneric) {
      return event.name ? `hsl(${Platform4.StringUtilities.hashCode(event.name) % 300 + 30}, 40%, 70%)` : "#ccc";
    }
    if (Trace10.Types.Events.isProfileCall(event)) {
      if (event.callFrame.functionName === "(idle)") {
        return categoryColorValue(Trace10.Styles.getCategoryStyles().idle);
      }
      if (event.callFrame.functionName === "(program)") {
        return categoryColorValue(Trace10.Styles.getCategoryStyles().other);
      }
      if (event.callFrame.scriptId === "0") {
        return categoryColorValue(Trace10.Styles.getCategoryStyles().scripting);
      }
      return this.#colorGenerator.colorForID(event.callFrame.url);
    }
    const eventStyles = Trace10.Styles.getEventStyle(event.name);
    if (eventStyles) {
      return categoryColorValue(eventStyles.category);
    }
    return categoryColorValue(Trace10.Styles.getCategoryStyles().other);
  }
  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(entry) {
    if (Utils2.IgnoreList.isIgnoreListedEntry(entry)) {
      const rule = Utils2.IgnoreList.getIgnoredReasonString(entry);
      return i18nString8(UIStrings8.onIgnoreList, { rule });
    }
    return Trace10.Name.forEntry(entry, this.#parsedTrace);
  }
  setPopoverInfo(event, info) {
    if (Trace10.Types.Events.isParseHTML(event)) {
      const startLine = event.args["beginData"]["startLine"];
      const endLine = event.args["endData"]?.["endLine"];
      const eventURL = event.args["beginData"]["url"];
      const url = Bindings.ResourceUtils.displayNameForURL(eventURL);
      const range = endLine !== -1 || endLine === startLine ? `${startLine}...${endLine}` : startLine;
      info.title += ` - ${url} [${range}]`;
    }
    const selfTime = this.#parsedTrace.data.Renderer.entryToNode.get(event)?.selfTime;
    info.formattedTime = getDurationString(event.dur, selfTime);
  }
};
function categoryColorValue(category) {
  return ThemeSupport11.ThemeSupport.instance().getComputedValue(category.cssVariable);
}

// gen/front_end/panels/timeline/TimelineFlameChartDataProvider.js
var TimelineFlameChartDataProvider_exports = {};
__export(TimelineFlameChartDataProvider_exports, {
  InstantEventVisibleDurationMs: () => InstantEventVisibleDurationMs,
  TimelineFlameChartDataProvider: () => TimelineFlameChartDataProvider
});
import * as Common16 from "./../../core/common/common.js";
import * as i18n54 from "./../../core/i18n/i18n.js";
import * as Root6 from "./../../core/root/root.js";
import * as AIAssistance2 from "./../../models/ai_assistance/ai_assistance.js";
import * as Trace33 from "./../../models/trace/trace.js";
import * as SourceMapsResolver5 from "./../../models/trace_source_maps_resolver/trace_source_maps_resolver.js";
import * as Workspace4 from "./../../models/workspace/workspace.js";
import * as PerfUI17 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI19 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport25 from "./../../ui/legacy/theme_support/theme_support.js";

// gen/front_end/panels/timeline/Initiators.js
var Initiators_exports = {};
__export(Initiators_exports, {
  initiatorsDataToDraw: () => initiatorsDataToDraw,
  initiatorsDataToDrawForNetwork: () => initiatorsDataToDrawForNetwork
});
var MAX_PREDECESSOR_INITIATOR_LIMIT = 10;
function initiatorsDataToDraw(parsedTrace, selectedEvent, hiddenEntries, expandableEntries) {
  const initiatorsData = [
    ...findInitiatorDataPredecessors(parsedTrace, selectedEvent, parsedTrace.data.Initiators.eventToInitiator),
    ...findInitiatorDataDirectSuccessors(selectedEvent, parsedTrace.data.Initiators.initiatorToEvents)
  ];
  initiatorsData.forEach((initiatorData) => getClosestVisibleInitiatorEntriesAncestors(initiatorData, expandableEntries, hiddenEntries, parsedTrace));
  return initiatorsData;
}
function initiatorsDataToDrawForNetwork(parsedTrace, selectedEvent) {
  return findInitiatorDataPredecessors(parsedTrace, selectedEvent, parsedTrace.data.NetworkRequests.eventToInitiator);
}
function findInitiatorDataPredecessors(parsedTrace, selectedEvent, eventToInitiator) {
  const initiatorsData = [];
  let currentEvent = selectedEvent;
  const visited = /* @__PURE__ */ new Set();
  visited.add(currentEvent);
  while (currentEvent && initiatorsData.length < MAX_PREDECESSOR_INITIATOR_LIMIT) {
    const currentInitiator = eventToInitiator.get(currentEvent);
    if (currentInitiator) {
      if (visited.has(currentInitiator)) {
        break;
      }
      initiatorsData.push({ event: currentEvent, initiator: currentInitiator });
      currentEvent = currentInitiator;
      visited.add(currentEvent);
      continue;
    }
    const nodeForCurrentEvent = parsedTrace.data.Renderer.entryToNode.get(currentEvent);
    if (!nodeForCurrentEvent) {
      currentEvent = null;
      break;
    }
    currentEvent = nodeForCurrentEvent.parent?.entry || null;
  }
  return initiatorsData;
}
function findInitiatorDataDirectSuccessors(selectedEvent, initiatorToEvents) {
  const initiatorsData = [];
  const eventsInitiatedByCurrent = initiatorToEvents.get(selectedEvent);
  if (eventsInitiatedByCurrent) {
    eventsInitiatedByCurrent.forEach((event) => {
      initiatorsData.push({ event, initiator: selectedEvent });
    });
  }
  return initiatorsData;
}
function getClosestVisibleInitiatorEntriesAncestors(initiatorData, expandableEntries, hiddenEntries, parsedTrace) {
  if (hiddenEntries.includes(initiatorData.event)) {
    let nextParent = parsedTrace.data.Renderer.entryToNode.get(initiatorData.event)?.parent;
    while (nextParent?.entry && !expandableEntries.includes(nextParent?.entry)) {
      nextParent = nextParent.parent ?? void 0;
    }
    initiatorData.event = nextParent?.entry ?? initiatorData.event;
    initiatorData.isEntryHidden = true;
  }
  if (hiddenEntries.includes(initiatorData.initiator)) {
    let nextParent = parsedTrace.data.Renderer.entryToNode.get(initiatorData.initiator)?.parent;
    while (nextParent?.entry && !expandableEntries.includes(nextParent?.entry)) {
      nextParent = nextParent.parent ?? void 0;
    }
    initiatorData.initiator = nextParent?.entry ?? initiatorData.initiator;
    initiatorData.isInitiatorHidden = true;
  }
  return initiatorData;
}

// gen/front_end/panels/timeline/timelineFlamechartPopover.css.js
var timelineFlamechartPopover_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.timeline-flamechart-popover {
  overflow: hidden;
  /* extend padding into the parent element to avoid clipping the focus-visible outline. */
  padding: 4px;
  margin: -4px;
}

.timeline-flamechart-popover devtools-interaction-breakdown {
  margin-top: 10px;
}

.timeline-flamechart-popover span {
  margin-right: 5px;
}

.timeline-flamechart-popover span.popoverinfo-network-time {
  color: var(--sys-color-primary);
}

.timeline-flamechart-popover span.popoverinfo-time {
  color: var(--sys-color-green);
}

.timeline-flamechart-popover span.popoverinfo-warning {
  color: var(--sys-color-error);
}

.timeline-flamechart-popover span.popoverinfo-url-path,
.timeline-flamechart-popover span.popoverinfo-url-origin {
  color: var(--sys-color-token-subtle);
  font-size: 11px;
}

.timeline-flamechart-popover span.popoverinfo-url-origin {
  font-style: italic;
}

.timeline-flamechart-popover span.popoverinfo-warning * {
  color: inherit;
}

.layout-shift-viz {
  position: relative;
  margin: var(--sys-size-8) var(--sys-size-5);
  outline: 1px solid var(--sys-color-divider);
}

.layout-shift-viz-rect {
  outline: 1px solid color-mix(in srgb, var(--color-background-inverted) 20%, var(--app-color-rendering));
  background-color: color-mix(in srgb, var(--color-background-inverted-opacity-0) 50%, var(--app-color-rendering-children));
  position: absolute;
  z-index: 100;
}

.layout-shift-viz > img {
  position: absolute;
  top: 0;
  left: 0;
}

/*# sourceURL=${import.meta.resolve("./timelineFlamechartPopover.css")} */`;

// gen/front_end/panels/timeline/TimelineFlameChartView.js
var TimelineFlameChartView_exports = {};
__export(TimelineFlameChartView_exports, {
  FlameChartStyle: () => FlameChartStyle,
  SORT_ORDER_PAGE_LOAD_MARKERS: () => SORT_ORDER_PAGE_LOAD_MARKERS,
  Selection: () => Selection,
  TimelineFlameChartMarker: () => TimelineFlameChartMarker,
  TimelineFlameChartView: () => TimelineFlameChartView,
  groupForLevel: () => groupForLevel
});
import * as Common15 from "./../../core/common/common.js";
import * as i18n52 from "./../../core/i18n/i18n.js";
import * as Platform15 from "./../../core/platform/platform.js";
import * as SDK14 from "./../../core/sdk/sdk.js";
import * as AIAssistance from "./../../models/ai_assistance/ai_assistance.js";
import * as CrUXManager5 from "./../../models/crux-manager/crux-manager.js";
import * as Trace32 from "./../../models/trace/trace.js";
import * as Workspace3 from "./../../models/workspace/workspace.js";
import * as TraceBounds15 from "./../../services/trace_bounds/trace_bounds.js";
import * as PerfUI16 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI18 from "./../../ui/legacy/legacy.js";
import * as VisualLogging10 from "./../../ui/visual_logging/visual_logging.js";
import * as TimelineInsights2 from "./components/insights/insights.js";

// gen/front_end/panels/timeline/CountersGraph.js
var CountersGraph_exports = {};
__export(CountersGraph_exports, {
  Calculator: () => Calculator,
  Counter: () => Counter,
  CounterUI: () => CounterUI,
  CountersGraph: () => CountersGraph
});
import "./../../ui/legacy/legacy.js";
import * as Common4 from "./../../core/common/common.js";
import * as i18n17 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as Trace11 from "./../../models/trace/trace.js";
import * as TraceBounds3 from "./../../services/trace_bounds/trace_bounds.js";
import * as PerfUI9 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings9 = {
  /**
   * @description Text for a heap profile type
   */
  jsHeap: "JS heap",
  /**
   * @description Text for documents, a type of resources
   */
  documents: "Documents",
  /**
   * @description Text in Counters Graph of the Performance panel
   */
  nodes: "Nodes",
  /**
   * @description Text in Counters Graph of the Performance panel
   */
  listeners: "Listeners",
  /**
   * @description Text in Counters Graph of the Performance panel
   */
  gpuMemory: "GPU memory",
  /**
   * @description Range text content in Counters Graph of the Performance panel
   * @example {2} PH1
   * @example {10} PH2
   */
  ss: "[{PH1}\xA0\u2013\xA0{PH2}]",
  /**
   * @description text shown when no counter events are found and the graph is empty
   */
  noEventsFound: "No memory usage data found within selected events."
};
var str_9 = i18n17.i18n.registerUIStrings("panels/timeline/CountersGraph.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var CountersGraph = class extends UI.Widget.VBox {
  delegate;
  calculator;
  header;
  toolbar;
  graphsContainer;
  canvasContainer;
  canvas;
  timelineGrid;
  counters;
  counterUI;
  countersByName;
  gpuMemoryCounter;
  #events = null;
  currentValuesBar;
  markerXPosition;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  #noEventsFoundMessage = document.createElement("div");
  #showNoEventsMessage = false;
  #defaultNumberFormatter;
  constructor(delegate) {
    super();
    this.#defaultNumberFormatter = new Intl.NumberFormat(i18n17.DevToolsLocale.DevToolsLocale.instance().locale);
    this.element.id = "memory-graphs-container";
    this.delegate = delegate;
    this.calculator = new Calculator();
    this.header = new UI.Widget.HBox();
    this.header.element.classList.add("timeline-memory-header");
    this.header.show(this.element);
    this.toolbar = this.header.element.createChild("devtools-toolbar", "timeline-memory-toolbar");
    this.graphsContainer = new UI.Widget.VBox();
    this.graphsContainer.show(this.element);
    const canvasWidget = new UI.Widget.VBoxWithResizeCallback(this.resize.bind(this));
    canvasWidget.show(this.graphsContainer.element);
    this.createCurrentValuesBar();
    this.canvasContainer = canvasWidget.element;
    this.canvasContainer.id = "memory-graphs-canvas-container";
    this.canvas = document.createElement("canvas");
    this.canvasContainer.appendChild(this.canvas);
    this.canvas.id = "memory-counters-graph";
    const noEventsFound = document.createElement("p");
    noEventsFound.innerText = i18nString9(UIStrings9.noEventsFound);
    this.#noEventsFoundMessage.classList.add("no-events-found");
    this.#noEventsFoundMessage.setAttribute("hidden", "hidden");
    this.#noEventsFoundMessage.appendChild(noEventsFound);
    this.canvasContainer.appendChild(this.#noEventsFoundMessage);
    this.canvasContainer.addEventListener("mouseover", this.onMouseMove.bind(this), true);
    this.canvasContainer.addEventListener("mousemove", this.onMouseMove.bind(this), true);
    this.canvasContainer.addEventListener("mouseleave", this.onMouseLeave.bind(this), true);
    this.canvasContainer.addEventListener("click", this.onClick.bind(this), true);
    this.timelineGrid = new PerfUI9.TimelineGrid.TimelineGrid();
    this.canvasContainer.appendChild(this.timelineGrid.dividersElement);
    this.counters = [];
    this.counterUI = [];
    this.countersByName = /* @__PURE__ */ new Map();
    this.countersByName.set("jsHeapSizeUsed", this.createCounter(i18nString9(UIStrings9.jsHeap), "js-heap-size-used", "hsl(220, 90%, 43%)", i18n17.ByteUtilities.bytesToString));
    this.countersByName.set("documents", this.createCounter(i18nString9(UIStrings9.documents), "documents", "hsl(0, 90%, 43%)"));
    this.countersByName.set("nodes", this.createCounter(i18nString9(UIStrings9.nodes), "nodes", "hsl(120, 90%, 43%)"));
    this.countersByName.set("jsEventListeners", this.createCounter(i18nString9(UIStrings9.listeners), "js-event-listeners", "hsl(38, 90%, 43%)"));
    this.gpuMemoryCounter = this.createCounter(i18nString9(UIStrings9.gpuMemory), "gpu-memory-used-kb", "hsl(300, 90%, 43%)", i18n17.ByteUtilities.bytesToString);
    this.countersByName.set("gpuMemoryUsedKB", this.gpuMemoryCounter);
    TraceBounds3.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
  }
  #onTraceBoundsChange(event) {
    if (event.updateType === "RESET" || event.updateType === "VISIBLE_WINDOW") {
      const newWindow = event.state.milli.timelineTraceWindow;
      this.calculator.setWindow(newWindow.min, newWindow.max);
      this.requestUpdate();
    }
  }
  setModel(parsedTrace, events) {
    this.#events = events;
    if (!events || !parsedTrace) {
      return;
    }
    const minTime = Trace11.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.data.Meta.traceBounds).min;
    this.calculator.setZeroTime(minTime);
    for (let i = 0; i < this.counters.length; ++i) {
      this.counters[i].reset();
      this.counterUI[i].reset();
    }
    this.requestUpdate();
    let counterEventsFound = 0;
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      if (!Trace11.Types.Events.isUpdateCounters(event)) {
        continue;
      }
      counterEventsFound++;
      const counters = event.args.data;
      if (!counters) {
        return;
      }
      for (const name in counters) {
        const counter = this.countersByName.get(name);
        if (counter) {
          const { startTime } = Trace11.Helpers.Timing.eventTimingsMilliSeconds(event);
          counter.appendSample(startTime, counters[name]);
        }
      }
      if (typeof counters.gpuMemoryLimitKB !== "undefined") {
        this.gpuMemoryCounter.setLimit(counters.gpuMemoryLimitKB);
      }
    }
    this.#showNoEventsMessage = counterEventsFound === 0;
    this.requestUpdate();
  }
  createCurrentValuesBar() {
    this.currentValuesBar = this.graphsContainer.element.createChild("div");
    this.currentValuesBar.id = "counter-values-bar";
  }
  createCounter(uiName, settingsKey, color, formatter) {
    const counter = new Counter();
    this.counters.push(counter);
    this.counterUI.push(new CounterUI(this, uiName, settingsKey, color, counter, formatter ?? this.#defaultNumberFormatter.format));
    return counter;
  }
  resizerElement() {
    return this.header.element;
  }
  resize() {
    const parentElement = this.canvas.parentElement;
    this.canvas.width = parentElement.clientWidth * window.devicePixelRatio;
    this.canvas.height = parentElement.clientHeight * window.devicePixelRatio;
    this.calculator.setDisplayWidth(this.canvas.width);
    this.refresh();
  }
  performUpdate() {
    this.refresh();
  }
  draw() {
    this.clear();
    if (this.#showNoEventsMessage) {
      this.#noEventsFoundMessage.removeAttribute("hidden");
    } else {
      this.#noEventsFoundMessage.setAttribute("hidden", "hidden");
    }
    for (const counter of this.counters) {
      counter.calculateVisibleIndexes(this.calculator);
      counter.calculateXValues(this.canvas.width);
    }
    for (const counterUI of this.counterUI) {
      counterUI.drawGraph(this.canvas);
    }
  }
  onClick(event) {
    const x = event.x - this.canvasContainer.getBoundingClientRect().left;
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
    if (bestTime !== void 0 && this.#events) {
      this.delegate.selectEntryAtTime(this.#events, bestTime);
    }
  }
  onMouseLeave(_event) {
    delete this.markerXPosition;
    this.clearCurrentValueAndMarker();
  }
  clearCurrentValueAndMarker() {
    for (let i = 0; i < this.counterUI.length; i++) {
      this.counterUI[i].clearCurrentValueAndMarker();
    }
  }
  onMouseMove(event) {
    const x = event.x - this.canvasContainer.getBoundingClientRect().left;
    this.markerXPosition = x;
    this.refreshCurrentValues();
  }
  refreshCurrentValues() {
    if (this.markerXPosition === void 0) {
      return;
    }
    for (let i = 0; i < this.counterUI.length; ++i) {
      this.counterUI[i].updateCurrentValue(this.markerXPosition);
    }
  }
  refresh() {
    this.timelineGrid.updateDividers(this.calculator);
    this.draw();
    this.refreshCurrentValues();
  }
  clear() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to get canvas context");
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
};
var Counter = class {
  times;
  values;
  x;
  minimumIndex;
  maximumIndex;
  maxTime;
  minTime;
  limitValue;
  constructor() {
    this.times = [];
    this.values = [];
    this.x = [];
    this.minimumIndex = 0;
    this.maximumIndex = 0;
    this.maxTime = 0;
    this.minTime = 0;
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
      if (minValue === void 0 || value < minValue) {
        minValue = value;
      }
      if (maxValue === void 0 || value > maxValue) {
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
    this.minimumIndex = Platform5.NumberUtilities.clamp(Platform5.ArrayUtilities.upperBound(this.times, start, Platform5.ArrayUtilities.DEFAULT_COMPARATOR) - 1, 0, this.times.length - 1);
    this.maximumIndex = Platform5.NumberUtilities.clamp(Platform5.ArrayUtilities.lowerBound(this.times, end, Platform5.ArrayUtilities.DEFAULT_COMPARATOR), 0, this.times.length - 1);
    this.minTime = start;
    this.maxTime = end;
  }
  calculateXValues(width) {
    if (!this.values.length) {
      return;
    }
    const xFactor = width / (this.maxTime - this.minTime);
    this.x = new Array(this.values.length);
    for (let i = this.minimumIndex + 1; i <= this.maximumIndex; i++) {
      this.x[i] = xFactor * (this.times[i] - this.minTime);
    }
  }
};
var CounterUI = class {
  countersPane;
  counter;
  formatter;
  setting;
  filter;
  value;
  graphColor;
  limitColor;
  graphYValues;
  verticalPadding;
  counterName;
  marker;
  constructor(countersPane, title, settingsKey, graphColor, counter, formatter) {
    this.countersPane = countersPane;
    this.counter = counter;
    this.formatter = formatter;
    this.setting = Common4.Settings.Settings.instance().createSetting("timeline-counters-graph-" + settingsKey, true);
    this.setting.setTitle(title);
    this.filter = new UI.Toolbar.ToolbarSettingCheckbox(this.setting, title);
    const parsedColor = Common4.Color.parse(graphColor);
    if (parsedColor) {
      const colorWithAlpha = parsedColor.setAlpha(0.5).asString(
        "rgba"
        /* Common.Color.Format.RGBA */
      );
      const htmlElement = this.filter.element;
      if (colorWithAlpha) {
        htmlElement.style.backgroundColor = colorWithAlpha;
      }
      htmlElement.style.borderColor = "transparent";
    }
    this.filter.element.addEventListener("click", this.toggleCounterGraph.bind(this));
    countersPane.toolbar.appendToolbarItem(this.filter);
    this.value = countersPane.currentValuesBar.createChild("span", "memory-counter-value");
    this.value.style.color = graphColor;
    this.graphColor = graphColor;
    if (parsedColor) {
      this.limitColor = parsedColor.setAlpha(0.3).asString(
        "rgba"
        /* Common.Color.Format.RGBA */
      );
    }
    this.graphYValues = [];
    this.verticalPadding = 10;
    this.counterName = title;
    this.marker = countersPane.canvasContainer.createChild("div", "memory-counter-marker");
    this.marker.style.backgroundColor = graphColor;
    this.clearCurrentValueAndMarker();
  }
  /**
   * Updates both the user visible text and the title & aria-label for the
   * checkbox label shown in the toolbar
   */
  #updateFilterLabel(text) {
    this.filter.setLabelText(text);
    this.filter.setTitle(text);
  }
  reset() {
    this.#updateFilterLabel(this.counterName);
  }
  setRange(minValue, maxValue) {
    const min = this.formatter(minValue);
    const max = this.formatter(maxValue);
    const rangeText = i18nString9(UIStrings9.ss, { PH1: min, PH2: max });
    const newLabelText = `${this.counterName} ${rangeText}`;
    this.#updateFilterLabel(newLabelText);
  }
  toggleCounterGraph() {
    this.value.classList.toggle("hidden", !this.filter.checked());
    this.countersPane.refresh();
  }
  recordIndexAt(x) {
    return Platform5.ArrayUtilities.upperBound(this.counter.x, x * window.devicePixelRatio, Platform5.ArrayUtilities.DEFAULT_COMPARATOR, this.counter.minimumIndex + 1, this.counter.maximumIndex + 1) - 1;
  }
  updateCurrentValue(x) {
    if (!this.visible() || !this.counter.values.length || !this.counter.x) {
      return;
    }
    const index = this.recordIndexAt(x);
    const value = this.formatter(this.counter.values[index]);
    this.value.textContent = `${this.counterName}: ${value}`;
    const y = this.graphYValues[index] / window.devicePixelRatio;
    this.marker.style.left = x + "px";
    this.marker.style.top = y + "px";
    this.marker.classList.remove("hidden");
  }
  clearCurrentValueAndMarker() {
    this.value.textContent = "";
    this.marker.classList.add("hidden");
  }
  drawGraph(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to get canvas context");
    }
    const width = canvas.width;
    const height = canvas.height - 2 * this.verticalPadding;
    if (height <= 0) {
      this.graphYValues = [];
      return;
    }
    const originY = this.verticalPadding;
    const counter = this.counter;
    const values = counter.values;
    if (!values.length) {
      return;
    }
    const bounds = counter.calculateBounds();
    const minValue = bounds.min;
    const maxValue = bounds.max;
    this.setRange(minValue, maxValue);
    if (!this.visible()) {
      return;
    }
    const yValues = this.graphYValues;
    const maxYRange = maxValue - minValue;
    const yFactor = maxYRange ? height / maxYRange : 1;
    ctx.save();
    ctx.lineWidth = window.devicePixelRatio;
    if (ctx.lineWidth % 2) {
      ctx.translate(0.5, 0.5);
    }
    ctx.beginPath();
    let value = values[counter.minimumIndex];
    let currentY = Math.round(originY + height - (value - minValue) * yFactor);
    ctx.moveTo(0, currentY);
    let i = counter.minimumIndex;
    for (; i <= counter.maximumIndex; i++) {
      const x = Math.round(counter.x[i]);
      ctx.lineTo(x, currentY);
      const currentValue = values[i];
      if (typeof currentValue !== "undefined") {
        value = currentValue;
      }
      currentY = Math.round(originY + height - (value - minValue) * yFactor);
      ctx.lineTo(x, currentY);
      yValues[i] = currentY;
    }
    yValues.length = i;
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
    return this.filter.checked();
  }
};
var Calculator = class {
  #minimumBoundary;
  #maximumBoundary;
  workingArea;
  #zeroTime;
  constructor() {
    this.#minimumBoundary = 0;
    this.#maximumBoundary = 0;
    this.workingArea = 0;
    this.#zeroTime = 0;
  }
  setZeroTime(time) {
    this.#zeroTime = time;
  }
  computePosition(time) {
    return (time - this.#minimumBoundary) / this.boundarySpan() * this.workingArea;
  }
  setWindow(minimumBoundary, maximumBoundary) {
    this.#minimumBoundary = minimumBoundary;
    this.#maximumBoundary = maximumBoundary;
  }
  setDisplayWidth(clientWidth) {
    this.workingArea = clientWidth;
  }
  formatValue(value, precision) {
    return i18n17.TimeUtilities.preciseMillisToString(value - this.zeroTime(), precision);
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
};

// gen/front_end/panels/timeline/EasterEgg.js
var SHOULD_SHOW_EASTER_EGG = false;

// gen/front_end/panels/timeline/TimelineFlameChartView.js
import * as OverlayComponents from "./overlays/components/components.js";
import * as Overlays3 from "./overlays/overlays.js";

// gen/front_end/panels/timeline/TargetForEvent.js
var TargetForEvent_exports = {};
__export(TargetForEvent_exports, {
  targetForEvent: () => targetForEvent
});
import * as SDK2 from "./../../core/sdk/sdk.js";
function targetForEvent(parsedTrace, event) {
  const targetManager = SDK2.TargetManager.TargetManager.instance();
  const workerId = parsedTrace.data.Workers.workerIdByThread.get(event.tid);
  if (workerId) {
    return targetManager.targetById(workerId);
  }
  return targetManager.primaryPageTarget();
}

// gen/front_end/panels/timeline/TimelineDetailsView.js
var TimelineDetailsView_exports = {};
__export(TimelineDetailsView_exports, {
  Tab: () => Tab,
  TimelineDetailsPane: () => TimelineDetailsPane
});
import * as Common14 from "./../../core/common/common.js";
import * as i18n47 from "./../../core/i18n/i18n.js";
import * as Platform13 from "./../../core/platform/platform.js";
import * as SDK12 from "./../../core/sdk/sdk.js";
import * as Trace29 from "./../../models/trace/trace.js";
import * as TraceBounds13 from "./../../services/trace_bounds/trace_bounds.js";
import * as Tracing5 from "./../../services/tracing/tracing.js";
import * as Components3 from "./../../ui/legacy/components/utils/utils.js";
import * as UI16 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html3, nothing, render as render3 } from "./../../ui/lit/lit.js";
import * as VisualLogging9 from "./../../ui/visual_logging/visual_logging.js";
import * as TimelineComponents5 from "./components/components.js";

// gen/front_end/panels/timeline/EventsTimelineTreeView.js
var EventsTimelineTreeView_exports = {};
__export(EventsTimelineTreeView_exports, {
  EventsTimelineTreeView: () => EventsTimelineTreeView,
  Filters: () => Filters
});
import * as Common12 from "./../../core/common/common.js";
import * as i18n43 from "./../../core/i18n/i18n.js";
import * as Trace26 from "./../../models/trace/trace.js";
import * as DataGrid5 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI12 from "./../../ui/legacy/legacy.js";
import * as VisualLogging7 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/TimelineFilters.js
var TimelineFilters_exports = {};
__export(TimelineFilters_exports, {
  Category: () => Category,
  IsLong: () => IsLong,
  TimelineRegExp: () => TimelineRegExp
});
import * as Trace25 from "./../../models/trace/trace.js";

// gen/front_end/panels/timeline/TimelineUIUtils.js
var TimelineUIUtils_exports = {};
__export(TimelineUIUtils_exports, {
  EventDispatchTypeDescriptor: () => EventDispatchTypeDescriptor,
  TimelineDetailsContentHelper: () => TimelineDetailsContentHelper,
  TimelineUIUtils: () => TimelineUIUtils,
  URL_REGEX: () => URL_REGEX,
  aggregatedStatsKey: () => aggregatedStatsKey,
  categoryBreakdownCacheSymbol: () => categoryBreakdownCacheSymbol,
  isMarkerEvent: () => isMarkerEvent,
  previewElementSymbol: () => previewElementSymbol,
  timeStampForEventAdjustedForClosestNavigationIfPossible: () => timeStampForEventAdjustedForClosestNavigationIfPossible
});
import * as Common11 from "./../../core/common/common.js";
import * as i18n41 from "./../../core/i18n/i18n.js";
import * as Platform12 from "./../../core/platform/platform.js";
import * as Root5 from "./../../core/root/root.js";
import * as SDK8 from "./../../core/sdk/sdk.js";
import * as Bindings2 from "./../../models/bindings/bindings.js";
import * as TextUtils3 from "./../../models/text_utils/text_utils.js";
import * as Trace24 from "./../../models/trace/trace.js";
import * as SourceMapsResolver3 from "./../../models/trace_source_maps_resolver/trace_source_maps_resolver.js";
import * as TraceBounds11 from "./../../services/trace_bounds/trace_bounds.js";
import * as Tracing4 from "./../../services/tracing/tracing.js";
import * as CodeHighlighter from "./../../ui/components/code_highlighter/code_highlighter.js";

// gen/front_end/ui/components/code_highlighter/codeHighlighter.css.js
var codeHighlighter_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.token-variable {
  color: var(--sys-color-token-variable);
}

.token-property {
  color: var(--sys-color-token-property);
}

.token-type {
  color: var(--sys-color-token-type);
}

.token-variable-special {
  color: var(--sys-color-token-variable-special);
}

.token-definition {
  color: var(--sys-color-token-definition);
}

.token-builtin {
  color: var(--sys-color-token-builtin);
}

.token-number {
  color: var(--sys-color-token-number);
}

.token-string {
  color: var(--sys-color-token-string);
}

.token-string-special {
  color: var(--sys-color-token-string-special);
}

.token-atom {
  color: var(--sys-color-token-atom);
}

.token-keyword {
  color: var(--sys-color-token-keyword);
}

.token-comment {
  color: var(--sys-color-token-comment);
}

.token-meta {
  color: var(--sys-color-token-meta);
}

.token-invalid {
  color: var(--sys-color-error);
}

.token-tag {
  color: var(--sys-color-token-tag);
}

.token-attribute {
  color: var(--sys-color-token-attribute);
}

.token-attribute-value {
  color: var(--sys-color-token-attribute-value);
}

.token-inserted {
  color: var(--sys-color-token-inserted);
}

.token-deleted {
  color: var(--sys-color-token-deleted);
}

.token-heading {
  color: var(--sys-color-token-variable-special);
  font-weight: bold;
}

.token-link {
  color: var(--sys-color-token-variable-special);
  text-decoration: underline;
}

.token-strikethrough {
  text-decoration: line-through;
}

.token-strong {
  font-weight: bold;
}

.token-emphasis {
  font-style: italic;
}

/*# sourceURL=${import.meta.resolve("./codeHighlighter.css")} */`;

// gen/front_end/panels/timeline/TimelineUIUtils.js
import * as uiI18n from "./../../ui/i18n/i18n.js";
import * as PerfUI13 from "./../../ui/legacy/components/perf_ui/perf_ui.js";

// gen/front_end/ui/legacy/components/utils/imagePreview.css.js
var imagePreview_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.image-preview-container {
  background: transparent;
  text-align: center;
  border-spacing: 0;
}

.image-preview-container img {
  margin: 6px 0;
  max-width: 100px;
  max-height: 100px;
  background-image: var(--image-file-checker);
  user-select: text;
  vertical-align: top;
  -webkit-user-drag: auto;
}

.image-container {
  padding: 0;
}

.image-container > div {
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.image-container > div.start {
  justify-content: start;
}

.image-preview-container .row {
  line-height: 1.2;
  vertical-align: baseline;
}

.image-preview-container .title {
  padding-right: 0.5em;
  color: var(--sys-color-token-subtle);
  white-space: nowrap;

  &.start {
    text-align: start;
  }

  &.center {
    text-align: end;
  }
}

.image-preview-container .description {
  white-space: nowrap;
  text-align: left;
  color: var(--sys-color-on-surface);
}

.image-preview-container .description-link {
  max-width: 20em;
}

.image-preview-container .source-link {
  white-space: normal;
  word-break: break-all;
  color: var(--sys-color-primary);
  cursor: pointer;
}

/*# sourceURL=${import.meta.resolve("./imagePreview.css")} */`;

// gen/front_end/panels/timeline/TimelineUIUtils.js
import * as LegacyComponents from "./../../ui/legacy/components/utils/utils.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport19 from "./../../ui/legacy/theme_support/theme_support.js";
import * as PanelsCommon from "./../common/common.js";
import * as TimelineComponents4 from "./components/components.js";
import * as Extensions3 from "./extensions/extensions.js";

// gen/front_end/panels/timeline/ThirdPartyTreeView.js
var ThirdPartyTreeView_exports = {};
__export(ThirdPartyTreeView_exports, {
  ThirdPartyTreeElement: () => ThirdPartyTreeElement,
  ThirdPartyTreeViewWidget: () => ThirdPartyTreeViewWidget
});
import * as i18n21 from "./../../core/i18n/i18n.js";
import * as Trace14 from "./../../models/trace/trace.js";
import * as DataGrid3 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/thirdPartyTreeView.css.js
var thirdPartyTreeView_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.empty-table {
  display: none;
}

/*# sourceURL=${import.meta.resolve("./thirdPartyTreeView.css")} */`;

// gen/front_end/panels/timeline/TimelineTreeView.js
var TimelineTreeView_exports = {};
__export(TimelineTreeView_exports, {
  AggregatedTimelineTreeView: () => AggregatedTimelineTreeView,
  BottomUpTimelineTreeView: () => BottomUpTimelineTreeView,
  CallTreeTimelineTreeView: () => CallTreeTimelineTreeView,
  GridNode: () => GridNode,
  TimelineStackView: () => TimelineStackView,
  TimelineTreeView: () => TimelineTreeView,
  TreeGridNode: () => TreeGridNode
});
import "./../../ui/legacy/legacy.js";
import * as Common5 from "./../../core/common/common.js";
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as Trace13 from "./../../models/trace/trace.js";
import * as Tracing from "./../../services/tracing/tracing.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as DataGrid from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as Components2 from "./../../ui/legacy/components/utils/utils.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport13 from "./../../ui/legacy/theme_support/theme_support.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/ActiveFilters.js
var instance = null;
var ActiveFilters = class _ActiveFilters {
  static instance(opts = { forceNew: null }) {
    const forceNew = Boolean(opts.forceNew);
    if (!instance || forceNew) {
      instance = new _ActiveFilters();
    }
    return instance;
  }
  static removeInstance() {
    instance = null;
  }
  #activeFilters = [];
  activeFilters() {
    return this.#activeFilters;
  }
  setFilters(newFilters) {
    this.#activeFilters = newFilters;
  }
  isVisible(event) {
    return this.#activeFilters.every((f) => f.accept(event));
  }
};

// gen/front_end/panels/timeline/TimelineTreeView.js
import * as Extensions2 from "./extensions/extensions.js";

// gen/front_end/panels/timeline/TimelineSelection.js
var TimelineSelection_exports = {};
__export(TimelineSelection_exports, {
  rangeForSelection: () => rangeForSelection,
  selectionFromEvent: () => selectionFromEvent,
  selectionFromRangeMicroSeconds: () => selectionFromRangeMicroSeconds,
  selectionFromRangeMilliSeconds: () => selectionFromRangeMilliSeconds,
  selectionIsEvent: () => selectionIsEvent,
  selectionIsRange: () => selectionIsRange,
  selectionsEqual: () => selectionsEqual
});
import * as Platform6 from "./../../core/platform/platform.js";
import * as Trace12 from "./../../models/trace/trace.js";
function selectionFromEvent(event) {
  return {
    event
  };
}
function selectionFromRangeMicroSeconds(min, max) {
  return {
    bounds: Trace12.Helpers.Timing.traceWindowFromMicroSeconds(min, max)
  };
}
function selectionFromRangeMilliSeconds(min, max) {
  return {
    bounds: Trace12.Helpers.Timing.traceWindowFromMilliSeconds(min, max)
  };
}
function selectionIsEvent(selection) {
  return Boolean(selection && "event" in selection);
}
function selectionIsRange(selection) {
  return Boolean(selection && "bounds" in selection);
}
function rangeForSelection(selection) {
  if (selectionIsRange(selection)) {
    return selection.bounds;
  }
  if (selectionIsEvent(selection)) {
    const timings = Trace12.Helpers.Timing.eventTimingsMicroSeconds(selection.event);
    return Trace12.Helpers.Timing.traceWindowFromMicroSeconds(timings.startTime, timings.endTime);
  }
  Platform6.assertNever(selection, "Unknown selection type");
}
function selectionsEqual(s1, s2) {
  if (selectionIsEvent(s1) && selectionIsEvent(s2)) {
    return s1.event === s2.event;
  }
  if (selectionIsRange(s1) && selectionIsRange(s2)) {
    return Trace12.Helpers.Timing.windowsEqual(s1.bounds, s2.bounds);
  }
  return false;
}

// gen/front_end/panels/timeline/timelineTreeView.css.js
var timelineTreeView_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.timeline-tree-view {
  display: flex;
  overflow: hidden;
}

.timeline-tree-view devtools-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
}

.timeline-tree-view .data-grid {
  flex: auto;
}

.timeline-tree-view .data-grid .data-container {
  overflow-y: scroll;
}

.timeline-tree-view .data-grid.data-grid-fits-viewport .corner {
  display: table-cell;
}

.timeline-tree-view .data-grid table.data {
  background: var(--sys-color-cdt-base-container);
}

.timeline-tree-view .data-grid .odd {
  background-color: var(--sys-color-surface1);
}

.timeline-tree-view .data-grid tr:hover td:not(.bottom-filler-td) {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.timeline-tree-view .data-grid td.numeric-column {
  text-align: right;
  position: relative;
}

.timeline-tree-view .data-grid td.activity-column {
  padding-left: 0;

  &::before {
    mask-position: center;
    mask-repeat: no-repeat;
    width: var(--sys-size-9);
    height: 18px;
    margin: 0 calc(-1 * var(--sys-size-2)) 0 0;
    top: 0;
  }
}

.timeline-tree-view .data-grid div.background-bar-text {
  position: relative;
  z-index: 1;
}

.timeline-tree-view .data-grid span.percent-column {
  color: var(--sys-color-token-subtle);
  width: 45px;
  display: inline-block;
}

.timeline-tree-view .data-grid tr.selected span {
  color: inherit;
}

.timeline-tree-view .data-grid tr.selected {
  background-color: var(--sys-color-tonal-container);
}

.timeline-tree-view .data-grid .name-container {
  display: flex;
  align-items: center;
}

.timeline-tree-view .data-grid .name-container .activity-icon {
  width: 12px;
  height: 12px;
  border: 1px solid var(--divider-line);
  margin: 3px 0;
}

.timeline-tree-view .data-grid .name-container .activity-icon-container {
  margin-right: 3px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  overflow: hidden;
}

.timeline-tree-view .data-grid .name-container .activity-warning::after {
  content: "[deopt]";
  margin: 0 4px;
  line-height: 12px;
  font-size: 10px;
  color: var(--sys-color-state-disabled);
}

.timeline-tree-view .data-grid tr.selected .name-container .activity-warning::after {
  color: var(--sys-color-on-tonal-container);
}

.timeline-tree-view .data-grid .name-container .activity-link {
  flex: auto;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 5px;
}

.timeline-tree-view .data-grid .background-bar-container {
  position: absolute;
  /* Small gap on the left side so the first row (which has a 100% width bar, has a distinguishable bar */
  inset: 0 0 0 2px;
}

.timeline-tree-view .data-grid .background-bar {
  height: 18px;
  background-color: var(--sys-color-surface-yellow);
  border-bottom: 1px solid var(--sys-color-yellow-outline);
  position: absolute;
  right: 0;
}

.timeline-tree-view .data-grid .selected .background-bar {
  background-color: var(--app-color-selected-progress-bar);
  border-bottom: 1px solid var(--app-border-selected-progress-bar);
}

.timeline-tree-view .data-grid thead {
  height: 21px;
  /* so the header is always above any body rows that the user has scrolled past */
  z-index: 2;
}

@media (forced-colors: active) {
  .timeline-tree-view .data-grid .name-container .activity-icon {
    forced-color-adjust: none;
  }

  .timeline-tree-view .data-grid tr.selected span.percent-column,
  .timeline-tree-view .data-grid tr.selected div.background-bar-text span,
  .timeline-tree-view .data-grid tr.selected .name-container .activity-link .devtools-link .timeline-link {
    color: HighlightText;
  }

  .timeline-tree-view .data-grid .background-bar,
  .timeline-tree-view .data-grid tr:hover td:not(.bottom-filler-td) {
    background-color: transparent;
  }

  .timeline-tree-view .data-grid tr.selected .background-bar {
    background-color: transparent;
    border-bottom-color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./timelineTreeView.css")} */`;

// gen/front_end/panels/timeline/TimelineTreeView.js
var UIStrings10 = {
  /**
   * @description Text for the performance of something
   */
  performance: "Performance",
  /**
   * @description Time of a single activity, as opposed to the total time
   */
  selfTime: "Self time",
  /**
   * @description Text for the total time of something
   */
  totalTime: "Total time",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  activity: "Activity",
  /**
   * @description Text of a DOM element in Timeline Tree View of the Performance panel
   */
  selectItemForDetails: "Select item for details.",
  /**
   * @description Number followed by percent sign
   * @example {20} PH1
   */
  percentPlaceholder: "{PH1}\xA0%",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  chromeExtensionsOverhead: "[`Chrome` extensions overhead]",
  /**
   * @description Text in Timeline Tree View of the Performance panel. The text is presented
   * when developers investigate the performance of a page. 'V8 Runtime' labels the time
   * spent in (i.e. runtime) the V8 JavaScript engine.
   */
  vRuntime: "[`V8` Runtime]",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  unattributed: "[unattributed]",
  /**
   * @description Text that refers to one or a group of webpages
   */
  page: "Page",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  noGrouping: "No grouping",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByActivity: "Group by activity",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByCategory: "Group by category",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByDomain: "Group by domain",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByFrame: "Group by frame",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupBySubdomain: "Group by subdomain",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByUrl: "Group by URL",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByThirdParties: "Group by Third Parties",
  /**
   * @description Aria-label for grouping combo box in Timeline Details View
   */
  groupBy: "Group by",
  /**
   * @description Title of the sidebar pane in the Performance panel which shows the stack (call
   * stack) where the program spent the most time (out of all the call stacks) while executing.
   */
  heaviestStack: "Heaviest stack",
  /**
   * @description Tooltip for the the Heaviest stack sidebar toggle in the Timeline Tree View of the
   * Performance panel. Command to open/show the sidebar.
   */
  showHeaviestStack: "Show heaviest stack",
  /**
   * @description Tooltip for the the Heaviest stack sidebar toggle in the Timeline Tree View of the
   * Performance panel. Command to close/hide the sidebar.
   */
  hideHeaviestStack: "Hide heaviest stack",
  /**
   * @description Screen reader announcement when the heaviest stack sidebar is shown in the Performance panel.
   */
  heaviestStackShown: "Heaviest stack sidebar shown",
  /**
   * @description Screen reader announcement when the heaviest stack sidebar is hidden in the Performance panel.
   */
  heaviestStackHidden: "Heaviest stack sidebar hidden",
  /**
   * @description Data grid name for Timeline Stack data grids
   */
  timelineStack: "Timeline stack",
  /**
   * /*@description Text to search by matching case of the input button
   */
  matchCase: "Match case",
  /**
   * @description Text for searching with regular expression button
   */
  useRegularExpression: "Use regular expression",
  /**
   * @description Text for Match whole word button
   */
  matchWholeWord: "Match whole word",
  /**
   * @description Text for bottom up tree button
   */
  bottomUp: "Bottom-up",
  /**
   * @description Text referring to view bottom up tree
   */
  viewBottomUp: "View Bottom-up",
  /**
   * @description Text referring to a 1st party entity
   */
  firstParty: "1st party",
  /**
   * @description Text referring to an entity that is an extension
   */
  extension: "Extension"
};
var str_10 = i18n19.i18n.registerUIStrings("panels/timeline/TimelineTreeView.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var TimelineTreeView = class extends Common5.ObjectWrapper.eventMixin(UI2.Widget.VBox) {
  #selectedEvents;
  searchResults;
  linkifier;
  dataGrid;
  lastHoveredProfileNode;
  textFilterInternal;
  taskFilter;
  startTime;
  endTime;
  splitWidget;
  detailsView;
  searchableView;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentThreadSetting;
  lastSelectedNodeInternal;
  root;
  currentResult;
  textFilterUI;
  caseSensitiveButton;
  regexButton;
  matchWholeWord;
  #parsedTrace = null;
  #entityMapper = null;
  #lastHighlightedEvent = null;
  eventToTreeNode = /* @__PURE__ */ new WeakMap();
  /**
   * Determines if the first child in the data grid will be selected
   * by default when refreshTree() gets called.
   */
  autoSelectFirstChildOnRefresh = true;
  constructor() {
    super();
    this.#selectedEvents = null;
    this.element.classList.add("timeline-tree-view");
    this.registerRequiredCSS(timelineTreeView_css_default);
    this.searchResults = [];
  }
  #eventNameForSorting(event) {
    const name = TimelineUIUtils.eventTitle(event) || event.name;
    if (!this.#parsedTrace) {
      return name;
    }
    return name + ":@" + Trace13.Handlers.Helpers.getNonResolvedURL(event, this.#parsedTrace.data);
  }
  setSearchableView(searchableView) {
    this.searchableView = searchableView;
  }
  setModelWithEvents(selectedEvents, parsedTrace = null, entityMappings = null) {
    this.#parsedTrace = parsedTrace;
    this.#selectedEvents = selectedEvents;
    this.#entityMapper = entityMappings;
    this.refreshTree();
  }
  entityMapper() {
    return this.#entityMapper;
  }
  parsedTrace() {
    return this.#parsedTrace;
  }
  init() {
    this.linkifier = new Components2.Linkifier.Linkifier();
    this.taskFilter = new Trace13.Extras.TraceFilter.ExclusiveNameFilter([
      "RunTask"
    ]);
    this.textFilterInternal = new TimelineRegExp();
    this.currentThreadSetting = Common5.Settings.Settings.instance().createSetting("timeline-tree-current-thread", 0);
    this.currentThreadSetting.addChangeListener(this.refreshTree, this);
    const columns = [];
    this.populateColumns(columns);
    this.splitWidget = new UI2.SplitWidget.SplitWidget(true, true, "timeline-tree-view-details-split-widget");
    const mainView = new UI2.Widget.VBox();
    const toolbar4 = mainView.element.createChild("devtools-toolbar");
    toolbar4.setAttribute("jslog", `${VisualLogging.toolbar()}`);
    toolbar4.wrappable = true;
    this.populateToolbar(toolbar4);
    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString10(UIStrings10.performance),
      columns,
      refreshCallback: void 0,
      deleteCallback: void 0
    });
    this.dataGrid.addEventListener("SortingChanged", this.sortingChanged, this);
    this.dataGrid.element.addEventListener("mousemove", this.onMouseMove.bind(this), true);
    this.dataGrid.element.addEventListener("mouseleave", () => this.dispatchEventToListeners("TreeRowHovered", { node: null }));
    this.dataGrid.addEventListener("OpenedNode", this.onGridNodeOpened, this);
    this.dataGrid.setResizeMethod(
      "last"
      /* DataGrid.DataGrid.ResizeMethod.LAST */
    );
    this.dataGrid.setRowContextMenuCallback(this.onContextMenu.bind(this));
    this.dataGrid.asWidget().show(mainView.element);
    this.dataGrid.addEventListener("SelectedNode", this.updateDetailsForSelection, this);
    this.detailsView = new UI2.Widget.VBox();
    this.detailsView.element.classList.add("timeline-details-view", "timeline-details-view-body");
    this.splitWidget.setMainWidget(mainView);
    this.splitWidget.setSidebarWidget(this.detailsView);
    this.splitWidget.hideSidebar();
    this.splitWidget.show(this.element);
    this.splitWidget.addEventListener("ShowModeChanged", this.onShowModeChanged, this);
  }
  lastSelectedNode() {
    return this.lastSelectedNodeInternal;
  }
  updateContents(selection) {
    const timings = rangeForSelection(selection);
    const timingMilli = Trace13.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds(timings);
    this.setRange(timingMilli.min, timingMilli.max);
  }
  setRange(startTime, endTime) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.refreshTree();
  }
  highlightEventInTree(event) {
    const dataGridElem = event && this.dataGridElementForEvent(event);
    if (!event || dataGridElem && dataGridElem !== this.#lastHighlightedEvent) {
      this.#lastHighlightedEvent?.style.setProperty("background-color", "");
    }
    if (event) {
      const rowElem = dataGridElem;
      if (rowElem) {
        this.#lastHighlightedEvent = rowElem;
        this.#lastHighlightedEvent.style.backgroundColor = "var(--sys-color-yellow-container)";
      }
    }
  }
  filters() {
    return [this.taskFilter, this.textFilterInternal, ...ActiveFilters.instance().activeFilters()];
  }
  filtersWithoutTextFilter() {
    return [this.taskFilter, ...ActiveFilters.instance().activeFilters()];
  }
  textFilter() {
    return this.textFilterInternal;
  }
  exposePercentages() {
    return false;
  }
  populateToolbar(toolbar4) {
    this.caseSensitiveButton = new UI2.Toolbar.ToolbarToggle(i18nString10(UIStrings10.matchCase), "match-case", void 0, "match-case");
    this.caseSensitiveButton.addEventListener("Click", () => {
      this.#filterChanged();
    }, this);
    toolbar4.appendToolbarItem(this.caseSensitiveButton);
    this.regexButton = new UI2.Toolbar.ToolbarToggle(i18nString10(UIStrings10.useRegularExpression), "regular-expression", void 0, "regular-expression");
    this.regexButton.addEventListener("Click", () => {
      this.#filterChanged();
    }, this);
    toolbar4.appendToolbarItem(this.regexButton);
    this.matchWholeWord = new UI2.Toolbar.ToolbarToggle(i18nString10(UIStrings10.matchWholeWord), "match-whole-word", void 0, "match-whole-word");
    this.matchWholeWord.addEventListener("Click", () => {
      this.#filterChanged();
    }, this);
    toolbar4.appendToolbarItem(this.matchWholeWord);
    const textFilterUI = new UI2.Toolbar.ToolbarFilter();
    this.textFilterUI = textFilterUI;
    textFilterUI.addEventListener("TextChanged", this.#filterChanged, this);
    toolbar4.appendToolbarItem(textFilterUI);
  }
  selectedEvents() {
    return this.#selectedEvents || [];
  }
  appendContextMenuItems(_contextMenu, _node) {
  }
  //  TODO(paulirish): rename profileNode to treeNode
  selectProfileNode(treeNode, suppressSelectedEvent) {
    const pathToRoot = [];
    let node = treeNode;
    for (; node; node = node.parent) {
      pathToRoot.push(node);
    }
    for (let i = pathToRoot.length - 1; i > 0; --i) {
      const gridNode2 = this.dataGridNodeForTreeNode(pathToRoot[i]);
      if (gridNode2?.dataGrid) {
        gridNode2.expand();
      }
    }
    const gridNode = this.dataGridNodeForTreeNode(treeNode);
    if (gridNode?.dataGrid) {
      gridNode.reveal();
      gridNode.select(suppressSelectedEvent);
    }
  }
  refreshTree() {
    if (!this.element.parentElement) {
      return;
    }
    this.linkifier.reset();
    this.dataGrid.rootNode().removeChildren();
    if (!this.#parsedTrace) {
      this.updateDetailsForSelection();
      return;
    }
    this.root = this.buildTree();
    const children = this.root.children();
    let maxSelfTime = 0;
    let maxTotalTime = 0;
    const totalUsedTime = this.root.totalTime - this.root.selfTime;
    for (const child of children.values()) {
      maxSelfTime = Math.max(maxSelfTime, child.selfTime);
      maxTotalTime = Math.max(maxTotalTime, child.totalTime);
    }
    for (const child of children.values()) {
      const gridNode = new TreeGridNode(child, totalUsedTime, maxSelfTime, maxTotalTime, this);
      for (const e of child.events) {
        this.eventToTreeNode.set(e, child);
      }
      this.dataGrid.insertChild(gridNode);
    }
    this.sortingChanged();
    this.updateDetailsForSelection();
    if (this.searchableView) {
      this.searchableView.refreshSearch();
    }
    const rootNode = this.dataGrid.rootNode();
    if (this.autoSelectFirstChildOnRefresh && rootNode.children.length > 0) {
      rootNode.children[0].select(
        /* supressSelectedEvent */
        true
      );
    }
  }
  buildTree() {
    throw new Error("Not Implemented");
  }
  buildTopDownTree(doNotAggregate, eventGroupIdCallback) {
    return new Trace13.Extras.TraceTree.TopDownRootNode(this.selectedEvents(), {
      filters: this.filters(),
      startTime: this.startTime,
      endTime: this.endTime,
      doNotAggregate,
      eventGroupIdCallback
    });
  }
  populateColumns(columns) {
    columns.push({ id: "self", title: i18nString10(UIStrings10.selfTime), width: "120px", fixedWidth: true, sortable: true });
    columns.push({ id: "total", title: i18nString10(UIStrings10.totalTime), width: "120px", fixedWidth: true, sortable: true });
    columns.push({ id: "activity", title: i18nString10(UIStrings10.activity), disclosure: true, sortable: true });
  }
  sortingChanged() {
    const columnId = this.dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    const sortFunction = this.getSortingFunction(columnId);
    if (sortFunction) {
      this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());
    }
  }
  // Gets the sorting function for the tree view nodes.
  getSortingFunction(columnId) {
    const compareNameSortFn = (a, b) => {
      const nodeA = a;
      const nodeB = b;
      const eventA = nodeA.profileNode.event;
      const eventB = nodeB.profileNode.event;
      if (!eventA || !eventB) {
        return 0;
      }
      const nameA = this.#eventNameForSorting(eventA);
      const nameB = this.#eventNameForSorting(eventB);
      return nameA.localeCompare(nameB);
    };
    switch (columnId) {
      case "start-time":
        return compareStartTime;
      case "self":
        return compareSelfTime;
      case "total":
        return compareTotalTime;
      case "activity":
      case "site":
        return compareNameSortFn;
      default:
        console.assert(false, "Unknown sort field: " + columnId);
        return null;
    }
    function compareSelfTime(a, b) {
      const nodeA = a;
      const nodeB = b;
      return nodeA.profileNode.selfTime - nodeB.profileNode.selfTime;
    }
    function compareStartTime(a, b) {
      const nodeA = a;
      const nodeB = b;
      const eventA = nodeA.profileNode.event;
      const eventB = nodeB.profileNode.event;
      if (!eventA || !eventB) {
        return 0;
      }
      return eventA.ts - eventB.ts;
    }
    function compareTotalTime(a, b) {
      const nodeA = a;
      const nodeB = b;
      return nodeA.profileNode.totalTime - nodeB.profileNode.totalTime;
    }
  }
  #filterChanged() {
    const searchQuery = this.textFilterUI?.value();
    const caseSensitive = this.caseSensitiveButton?.isToggled() ?? false;
    const isRegex = this.regexButton?.isToggled() ?? false;
    const matchWholeWord = this.matchWholeWord?.isToggled() ?? false;
    this.textFilterInternal.setRegExp(searchQuery ? Platform7.StringUtilities.createSearchRegex(searchQuery, caseSensitive, isRegex, matchWholeWord) : null);
    this.refreshTree();
  }
  onShowModeChanged() {
    if (this.splitWidget.showMode() === "OnlyMain") {
      return;
    }
    this.lastSelectedNodeInternal = void 0;
    this.updateDetailsForSelection();
  }
  updateDetailsForSelection() {
    const selectedNode = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.profileNode : null;
    if (selectedNode === this.lastSelectedNodeInternal) {
      return;
    }
    if (this.splitWidget.showMode() === "OnlyMain") {
      return;
    }
    this.detailsView.detachChildWidgets();
    this.detailsView.element.removeChildren();
    this.lastSelectedNodeInternal = selectedNode;
    if (selectedNode && this.showDetailsForNode(selectedNode)) {
      return;
    }
    const banner = this.detailsView.element.createChild("div", "empty-state");
    UI2.UIUtils.createTextChild(banner, i18nString10(UIStrings10.selectItemForDetails));
  }
  showDetailsForNode(_node) {
    return false;
  }
  onMouseMove(event) {
    const gridNode = event.target && event.target instanceof Node ? this.dataGrid.dataGridNodeFromNode(event.target) : null;
    const profileNode = gridNode?.profileNode;
    if (profileNode === this.lastHoveredProfileNode) {
      return;
    }
    this.lastHoveredProfileNode = profileNode;
    this.onHover(profileNode);
  }
  onHover(node) {
    this.dispatchEventToListeners("TreeRowHovered", { node });
  }
  onClick(node) {
    this.dispatchEventToListeners("TreeRowClicked", { node });
  }
  wasShown() {
    super.wasShown();
    this.dataGrid.addEventListener("SelectedNode", this.#onDataGridSelectionChange, this);
    this.dataGrid.addEventListener("DeselectedNode", this.#onDataGridDeselection, this);
  }
  childWasDetached(_widget) {
    this.dataGrid.removeEventListener("SelectedNode", this.#onDataGridSelectionChange);
    this.dataGrid.removeEventListener("DeselectedNode", this.#onDataGridDeselection);
  }
  /**
   * This event fires when the user selects a row in the grid, either by
   * clicking or by using the arrow keys. We want to have the same effect as
   * when the user hover overs a row.
   */
  #onDataGridSelectionChange(event) {
    this.onClick(event.data.profileNode);
    this.onHover(event.data.profileNode);
  }
  /**
   * Called when the user deselects a row.
   * This can either be because they have selected a new row
   * (you should expect a SELECTED_NODE event after this one)
   * or because they have deselected without a new selection.
   */
  #onDataGridDeselection() {
    this.onClick(null);
    this.onHover(null);
  }
  onGridNodeOpened() {
    const gridNode = this.dataGrid.selectedNode;
    this.onHover(gridNode.profileNode);
    this.updateDetailsForSelection();
  }
  onContextMenu(contextMenu, eventGridNode) {
    const gridNode = eventGridNode;
    if (gridNode.linkElement) {
      contextMenu.appendApplicableItems(gridNode.linkElement);
    }
    const profileNode = gridNode.profileNode;
    if (profileNode) {
      this.appendContextMenuItems(contextMenu, profileNode);
    }
  }
  dataGridElementForEvent(event) {
    if (!event) {
      return null;
    }
    const treeNode = this.eventToTreeNode.get(event);
    return (treeNode && this.dataGridNodeForTreeNode(treeNode)?.element()) ?? null;
  }
  dataGridNodeForTreeNode(treeNode) {
    return treeNodeToGridNode.get(treeNode) || null;
  }
  // UI.SearchableView.Searchable implementation
  onSearchCanceled() {
    this.searchResults = [];
    this.currentResult = 0;
  }
  performSearch(searchConfig, _shouldJump, _jumpBackwards) {
    this.searchResults = [];
    this.currentResult = 0;
    if (!this.root) {
      return;
    }
    const searchRegex = searchConfig.toSearchRegex();
    this.searchResults = this.root.searchTree((event) => TimelineUIUtils.testContentMatching(event, searchRegex.regex, this.#parsedTrace?.data || void 0));
    this.searchableView.updateSearchMatchesCount(this.searchResults.length);
  }
  jumpToNextSearchResult() {
    if (!this.searchResults.length || this.currentResult === void 0) {
      return;
    }
    this.selectProfileNode(this.searchResults[this.currentResult], false);
    this.currentResult = Platform7.NumberUtilities.mod(this.currentResult + 1, this.searchResults.length);
  }
  jumpToPreviousSearchResult() {
    if (!this.searchResults.length || this.currentResult === void 0) {
      return;
    }
    this.selectProfileNode(this.searchResults[this.currentResult], false);
    this.currentResult = Platform7.NumberUtilities.mod(this.currentResult - 1, this.searchResults.length);
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return true;
  }
  supportsRegexSearch() {
    return true;
  }
};
var GridNode = class extends DataGrid.SortableDataGrid.SortableDataGridNode {
  populated;
  profileNode;
  treeView;
  grandTotalTime;
  maxSelfTime;
  maxTotalTime;
  linkElement;
  constructor(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView) {
    super(null, false);
    this.populated = false;
    this.profileNode = profileNode;
    this.treeView = treeView;
    this.grandTotalTime = grandTotalTime;
    this.maxSelfTime = maxSelfTime;
    this.maxTotalTime = maxTotalTime;
    this.linkElement = null;
  }
  createCell(columnId) {
    if (columnId === "activity" || columnId === "site") {
      return this.createNameCell(columnId);
    }
    return this.createValueCell(columnId) || super.createCell(columnId);
  }
  createNameCell(columnId) {
    const cell = this.createTD(columnId);
    const container = cell.createChild("div", "name-container");
    const iconContainer = container.createChild("div", "activity-icon-container");
    const icon = iconContainer.createChild("div", "activity-icon");
    const name = container.createChild("div", "activity-name");
    const event = this.profileNode.event;
    if (this.profileNode.isGroupNode()) {
      const treeView = this.treeView;
      const info = treeView.displayInfoForGroupNode(this.profileNode);
      name.textContent = info.name;
      icon.style.backgroundColor = info.color;
      if (info.icon) {
        iconContainer.insertBefore(info.icon, icon);
      }
      if (columnId === "site" && this.treeView instanceof ThirdPartyTreeViewWidget) {
        const thirdPartyTree = this.treeView;
        let badgeText = "";
        if (thirdPartyTree.nodeIsFirstParty(this.profileNode)) {
          badgeText = i18nString10(UIStrings10.firstParty);
        } else if (thirdPartyTree.nodeIsExtension(this.profileNode)) {
          badgeText = i18nString10(UIStrings10.extension);
        }
        if (badgeText) {
          const badge = container.createChild("div", "entity-badge");
          badge.textContent = badgeText;
          UI2.ARIAUtils.setLabel(badge, badgeText);
        }
      }
    } else if (event) {
      name.textContent = TimelineUIUtils.eventTitle(event);
      const parsedTrace = this.treeView.parsedTrace();
      const target = parsedTrace ? targetForEvent(parsedTrace, event) : null;
      const linkifier = this.treeView.linkifier;
      const isFreshOrEnhanced = Boolean(parsedTrace && Tracing.FreshRecording.Tracker.instance().recordingIsFreshOrEnhanced(parsedTrace));
      this.linkElement = TimelineUIUtils.linkifyTopCallFrame(event, target, linkifier, isFreshOrEnhanced);
      if (this.linkElement) {
        container.createChild("div", "activity-link").appendChild(this.linkElement);
      }
      UI2.ARIAUtils.setLabel(icon, TimelineUIUtils.eventStyle(event).category.title);
      icon.style.backgroundColor = TimelineUIUtils.eventColor(event);
      if (Trace13.Types.Extensions.isSyntheticExtensionEntry(event)) {
        icon.style.backgroundColor = Extensions2.ExtensionUI.extensionEntryColor(event);
      }
    }
    return cell;
  }
  createValueCell(columnId) {
    if (columnId !== "self" && columnId !== "total" && columnId !== "start-time" && columnId !== "transfer-size") {
      return null;
    }
    let showPercents = false;
    let value;
    let maxTime;
    let event;
    let isSize = false;
    let showBottomUpButton = false;
    const thirdPartyView = this.treeView;
    switch (columnId) {
      case "start-time":
        {
          event = this.profileNode.event;
          const parsedTrace = this.treeView.parsedTrace();
          if (!parsedTrace) {
            throw new Error("Unable to load trace data for tree view");
          }
          const timings = event && Trace13.Helpers.Timing.eventTimingsMilliSeconds(event);
          const startTime = timings?.startTime ?? 0;
          value = startTime - Trace13.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
        }
        break;
      case "self":
        value = this.profileNode.selfTime;
        maxTime = this.maxSelfTime;
        showPercents = true;
        showBottomUpButton = thirdPartyView instanceof ThirdPartyTreeViewWidget;
        break;
      case "total":
        value = this.profileNode.totalTime;
        maxTime = this.maxTotalTime;
        showPercents = true;
        break;
      case "transfer-size":
        value = this.profileNode.transferSize;
        isSize = true;
        break;
      default:
        return null;
    }
    const cell = this.createTD(columnId);
    cell.className = "numeric-column";
    let textDiv;
    if (!isSize) {
      cell.setAttribute("title", i18n19.TimeUtilities.preciseMillisToString(value, 4));
      textDiv = cell.createChild("div");
      textDiv.createChild("span").textContent = i18n19.TimeUtilities.preciseMillisToString(value, 1);
    } else {
      cell.setAttribute("title", i18n19.ByteUtilities.formatBytesToKb(value));
      textDiv = cell.createChild("div");
      textDiv.createChild("span").textContent = i18n19.ByteUtilities.formatBytesToKb(value);
    }
    if (showPercents && this.treeView.exposePercentages()) {
      textDiv.createChild("span", "percent-column").textContent = i18nString10(UIStrings10.percentPlaceholder, { PH1: (value / this.grandTotalTime * 100).toFixed(1) });
    }
    if (maxTime) {
      textDiv.classList.add("background-bar-text");
      cell.createChild("div", "background-bar-container").createChild("div", "background-bar").style.width = (value * 100 / maxTime).toFixed(1) + "%";
    }
    if (showBottomUpButton) {
      this.generateBottomUpButton(textDiv);
    }
    return cell;
  }
  // Generates bottom up tree hover button and appends it to the provided cell element.
  generateBottomUpButton(textDiv) {
    const button = new Buttons.Button.Button();
    button.data = {
      variant: "icon",
      iconName: "account-tree",
      size: "SMALL",
      toggledIconName: i18nString10(UIStrings10.bottomUp)
    };
    UI2.ARIAUtils.setLabel(button, i18nString10(UIStrings10.viewBottomUp));
    button.addEventListener("click", () => this.#bottomUpButtonClicked());
    UI2.Tooltip.Tooltip.install(button, i18nString10(UIStrings10.bottomUp));
    textDiv.appendChild(button);
  }
  #bottomUpButtonClicked() {
    this.treeView.dispatchEventToListeners("TreeRowHovered", { node: null });
    this.treeView.dispatchEventToListeners("BottomUpButtonClicked", this.profileNode);
  }
};
var TreeGridNode = class _TreeGridNode extends GridNode {
  constructor(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView) {
    super(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView);
    this.setHasChildren(this.profileNode.hasChildren());
    treeNodeToGridNode.set(profileNode, this);
  }
  populate() {
    if (this.populated) {
      return;
    }
    this.populated = true;
    if (!this.profileNode.children) {
      return;
    }
    for (const node of this.profileNode.children().values()) {
      const gridNode = new _TreeGridNode(node, this.grandTotalTime, this.maxSelfTime, this.maxTotalTime, this.treeView);
      for (const e of node.events) {
        this.treeView.eventToTreeNode.set(e, node);
      }
      this.insertChildOrdered(gridNode);
    }
  }
};
var treeNodeToGridNode = /* @__PURE__ */ new WeakMap();
var AggregatedTimelineTreeView = class _AggregatedTimelineTreeView extends TimelineTreeView {
  groupBySetting;
  stackView;
  constructor() {
    super();
    this.groupBySetting = Common5.Settings.Settings.instance().createSetting("timeline-tree-group-by", _AggregatedTimelineTreeView.GroupBy.None);
    this.groupBySetting.addChangeListener(this.refreshTree.bind(this));
    this.init();
    this.stackView = new TimelineStackView(this);
    this.stackView.addEventListener("SelectionChanged", this.onStackViewSelectionChanged, this);
  }
  setGroupBySetting(groupBy) {
    this.groupBySetting.set(groupBy);
  }
  updateContents(selection) {
    super.updateContents(selection);
    const rootNode = this.dataGrid.rootNode();
    if (rootNode.children.length) {
      rootNode.children[0].select(
        /* suppressSelectedEvent */
        true
      );
    }
    this.updateDetailsForSelection();
  }
  beautifyDomainName(name, node) {
    if (_AggregatedTimelineTreeView.isExtensionInternalURL(name)) {
      name = i18nString10(UIStrings10.chromeExtensionsOverhead);
    } else if (_AggregatedTimelineTreeView.isV8NativeURL(name)) {
      name = i18nString10(UIStrings10.vRuntime);
    } else if (name.startsWith("chrome-extension")) {
      name = this.entityMapper()?.entityForEvent(node.event)?.name || name;
    }
    return name;
  }
  displayInfoForGroupNode(node) {
    const categories2 = Trace13.Styles.getCategoryStyles();
    const color = TimelineUIUtils.eventColor(node.event);
    const unattributed = i18nString10(UIStrings10.unattributed);
    const id = typeof node.id === "symbol" ? void 0 : node.id;
    switch (this.groupBySetting.get()) {
      case _AggregatedTimelineTreeView.GroupBy.Category: {
        const idIsValid = id && Trace13.Styles.stringIsEventCategory(id);
        const category = idIsValid ? categories2[id] || categories2["other"] : { title: unattributed, color: unattributed };
        const color2 = category instanceof Trace13.Styles.TimelineCategory ? ThemeSupport13.ThemeSupport.instance().getComputedValue(category.cssVariable) : category.color;
        return { name: category.title, color: color2, icon: void 0 };
      }
      case _AggregatedTimelineTreeView.GroupBy.Domain:
      case _AggregatedTimelineTreeView.GroupBy.Subdomain:
      case _AggregatedTimelineTreeView.GroupBy.ThirdParties: {
        const domainName = id ? this.beautifyDomainName(id, node) : void 0;
        return { name: domainName || unattributed, color, icon: void 0 };
      }
      case _AggregatedTimelineTreeView.GroupBy.EventName: {
        if (!node.event) {
          throw new Error("Unable to find event for group by operation");
        }
        const name = TimelineUIUtils.eventTitle(node.event);
        return {
          name,
          color,
          icon: void 0
        };
      }
      case _AggregatedTimelineTreeView.GroupBy.URL:
        break;
      case _AggregatedTimelineTreeView.GroupBy.Frame: {
        const frame = id ? this.parsedTrace()?.data.PageFrames.frames.get(id) : void 0;
        const frameName = frame ? TimelineUIUtils.displayNameForFrame(frame) : i18nString10(UIStrings10.page);
        return { name: frameName, color, icon: void 0 };
      }
      default:
        console.assert(false, "Unexpected grouping type");
    }
    return { name: id || unattributed, color, icon: void 0 };
  }
  populateToolbar(toolbar4) {
    super.populateToolbar(toolbar4);
    const groupBy = _AggregatedTimelineTreeView.GroupBy;
    const options = [
      { label: i18nString10(UIStrings10.noGrouping), value: groupBy.None },
      { label: i18nString10(UIStrings10.groupByActivity), value: groupBy.EventName },
      { label: i18nString10(UIStrings10.groupByCategory), value: groupBy.Category },
      { label: i18nString10(UIStrings10.groupByDomain), value: groupBy.Domain },
      { label: i18nString10(UIStrings10.groupByFrame), value: groupBy.Frame },
      { label: i18nString10(UIStrings10.groupBySubdomain), value: groupBy.Subdomain },
      { label: i18nString10(UIStrings10.groupByUrl), value: groupBy.URL },
      { label: i18nString10(UIStrings10.groupByThirdParties), value: groupBy.ThirdParties }
    ];
    toolbar4.appendToolbarItem(new UI2.Toolbar.ToolbarSettingComboBox(options, this.groupBySetting, i18nString10(UIStrings10.groupBy)));
    toolbar4.appendSpacer();
    toolbar4.appendToolbarItem(this.splitWidget.createShowHideSidebarButton(i18nString10(UIStrings10.showHeaviestStack), i18nString10(UIStrings10.hideHeaviestStack), i18nString10(UIStrings10.heaviestStackShown), i18nString10(UIStrings10.heaviestStackHidden)));
  }
  buildHeaviestStack(treeNode) {
    console.assert(Boolean(treeNode.parent), "Attempt to build stack for tree root");
    let result = [];
    for (let node = treeNode; node?.parent; node = node.parent) {
      result.push(node);
    }
    result = result.reverse();
    for (let node = treeNode; node?.children()?.size; ) {
      const children = Array.from(node.children().values());
      node = children.reduce((a, b) => a.totalTime > b.totalTime ? a : b);
      result.push(node);
    }
    return result;
  }
  exposePercentages() {
    return true;
  }
  onStackViewSelectionChanged() {
    const treeNode = this.stackView.selectedTreeNode();
    if (treeNode) {
      this.selectProfileNode(treeNode, true);
    }
  }
  showDetailsForNode(node) {
    const stack = this.buildHeaviestStack(node);
    this.stackView.setStack(stack, node);
    this.stackView.show(this.detailsView.element);
    return true;
  }
  groupingFunction(groupBy) {
    const GroupBy = _AggregatedTimelineTreeView.GroupBy;
    switch (groupBy) {
      case GroupBy.None:
        return null;
      case GroupBy.EventName:
        return (event) => TimelineUIUtils.eventStyle(event).title;
      case GroupBy.Category:
        return (event) => TimelineUIUtils.eventStyle(event).category.name;
      case GroupBy.Subdomain:
      case GroupBy.Domain:
      case GroupBy.ThirdParties:
        return this.domainByEvent.bind(this, groupBy);
      case GroupBy.URL:
        return (event) => {
          const parsedTrace = this.parsedTrace();
          return parsedTrace ? Trace13.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data) ?? "" : "";
        };
      case GroupBy.Frame:
        return (event) => {
          const frameId = Trace13.Helpers.Trace.frameIDForEvent(event);
          return frameId || this.parsedTrace()?.data.Meta.mainFrameId || "";
        };
      default:
        console.assert(false, `Unexpected aggregation setting: ${groupBy}`);
        return null;
    }
  }
  // This is our groupingFunction that returns the eventId in Domain, Subdomain, and ThirdParty groupBy scenarios.
  // The eventid == the identity of a node that we expect in a bottomUp tree (either without grouping or with the groupBy grouping)
  // A "top node" (in `ungroupedTopNodes`) is aggregated by this. (But so are all the other nodes, except the `GroupNode`s)
  domainByEvent(groupBy, event) {
    const parsedTrace = this.parsedTrace();
    if (!parsedTrace) {
      return "";
    }
    const url = Trace13.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data);
    if (!url) {
      const entity = this.entityMapper()?.entityForEvent(event);
      if (groupBy === _AggregatedTimelineTreeView.GroupBy.ThirdParties && entity) {
        if (!entity) {
          return "";
        }
        const firstDomain = entity.domains[0];
        const parsedURL2 = Common5.ParsedURL.ParsedURL.fromString(firstDomain);
        if (parsedURL2?.scheme === "chrome-extension") {
          return `${parsedURL2.scheme}://${parsedURL2.host}`;
        }
        return entity.name;
      }
      return "";
    }
    if (_AggregatedTimelineTreeView.isExtensionInternalURL(url)) {
      return _AggregatedTimelineTreeView.extensionInternalPrefix;
    }
    if (_AggregatedTimelineTreeView.isV8NativeURL(url)) {
      return _AggregatedTimelineTreeView.v8NativePrefix;
    }
    const parsedURL = Common5.ParsedURL.ParsedURL.fromString(url);
    if (!parsedURL) {
      return "";
    }
    if (parsedURL.scheme === "chrome-extension") {
      return parsedURL.scheme + "://" + parsedURL.host;
    }
    if (groupBy === _AggregatedTimelineTreeView.GroupBy.ThirdParties) {
      const entity = this.entityMapper()?.entityForEvent(event);
      if (!entity) {
        return "";
      }
      return entity.name;
    }
    if (groupBy === _AggregatedTimelineTreeView.GroupBy.Subdomain) {
      return parsedURL.host;
    }
    if (/^[.0-9]+$/.test(parsedURL.host)) {
      return parsedURL.host;
    }
    const domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
    return domainMatch?.[0] || "";
  }
  static isExtensionInternalURL(url) {
    return url.startsWith(_AggregatedTimelineTreeView.extensionInternalPrefix);
  }
  static isV8NativeURL(url) {
    return url.startsWith(_AggregatedTimelineTreeView.v8NativePrefix);
  }
  static extensionInternalPrefix = "extensions::";
  static v8NativePrefix = "native ";
  onHover(node) {
    if (node !== null && this.groupBySetting.get() === _AggregatedTimelineTreeView.GroupBy.ThirdParties) {
      const events = this.#getThirdPartyEventsForNode(node);
      this.dispatchEventToListeners("TreeRowHovered", { node, events });
      return;
    }
    this.dispatchEventToListeners("TreeRowHovered", { node });
  }
  onClick(node) {
    if (node !== null && this.groupBySetting.get() === _AggregatedTimelineTreeView.GroupBy.ThirdParties) {
      const events = this.#getThirdPartyEventsForNode(node);
      this.dispatchEventToListeners("TreeRowClicked", { node, events });
      return;
    }
    this.dispatchEventToListeners("TreeRowClicked", { node });
  }
  #getThirdPartyEventsForNode(node) {
    if (!node.event) {
      return;
    }
    const entity = this.entityMapper()?.entityForEvent(node.event);
    if (!entity) {
      return node.events;
    }
    const events = this.entityMapper()?.eventsForEntity(entity);
    return events;
  }
};
(function(AggregatedTimelineTreeView2) {
  let GroupBy;
  (function(GroupBy2) {
    GroupBy2["None"] = "None";
    GroupBy2["EventName"] = "EventName";
    GroupBy2["Category"] = "Category";
    GroupBy2["Domain"] = "Domain";
    GroupBy2["Subdomain"] = "Subdomain";
    GroupBy2["URL"] = "URL";
    GroupBy2["Frame"] = "Frame";
    GroupBy2["ThirdParties"] = "ThirdParties";
  })(GroupBy = AggregatedTimelineTreeView2.GroupBy || (AggregatedTimelineTreeView2.GroupBy = {}));
})(AggregatedTimelineTreeView || (AggregatedTimelineTreeView = {}));
var CallTreeTimelineTreeView = class extends AggregatedTimelineTreeView {
  constructor() {
    super();
    this.element.setAttribute("jslog", `${VisualLogging.pane("call-tree").track({ resize: true })}`);
    this.dataGrid.markColumnAsSortedBy("total", DataGrid.DataGrid.Order.Descending);
  }
  buildTree() {
    const grouping = this.groupBySetting.get();
    return this.buildTopDownTree(false, this.groupingFunction(grouping));
  }
};
var BottomUpTimelineTreeView = class extends AggregatedTimelineTreeView {
  constructor() {
    super();
    this.element.setAttribute("jslog", `${VisualLogging.pane("bottom-up").track({ resize: true })}`);
    this.dataGrid.markColumnAsSortedBy("self", DataGrid.DataGrid.Order.Descending);
  }
  buildTree() {
    return new Trace13.Extras.TraceTree.BottomUpRootNode(this.selectedEvents(), {
      textFilter: this.textFilter(),
      filters: this.filtersWithoutTextFilter(),
      startTime: this.startTime,
      endTime: this.endTime,
      eventGroupIdCallback: this.groupingFunction(this.groupBySetting.get()),
      // To include instant events. When this is set to true, instant events are
      // considered (to calculate transfer size). This then includes these events in tree nodes.
      calculateTransferSize: true,
      // We should forceGroupIdCallback if filtering by 3P for correct 3P grouping.
      forceGroupIdCallback: this.groupBySetting.get() === AggregatedTimelineTreeView.GroupBy.ThirdParties
    });
  }
};
var TimelineStackView = class extends Common5.ObjectWrapper.eventMixin(UI2.Widget.VBox) {
  treeView;
  dataGrid;
  constructor(treeView) {
    super();
    const header = this.element.createChild("div", "timeline-stack-view-header");
    header.textContent = i18nString10(UIStrings10.heaviestStack);
    this.treeView = treeView;
    const columns = [
      { id: "total", title: i18nString10(UIStrings10.totalTime), fixedWidth: true, width: "110px" },
      { id: "activity", title: i18nString10(UIStrings10.activity) }
    ];
    this.dataGrid = new DataGrid.ViewportDataGrid.ViewportDataGrid({
      displayName: i18nString10(UIStrings10.timelineStack),
      columns,
      deleteCallback: void 0,
      refreshCallback: void 0
    });
    this.dataGrid.setResizeMethod(
      "last"
      /* DataGrid.DataGrid.ResizeMethod.LAST */
    );
    this.dataGrid.addEventListener("SelectedNode", this.onSelectionChanged, this);
    this.dataGrid.element.addEventListener("mouseenter", this.onMouseMove.bind(this), true);
    this.dataGrid.element.addEventListener("mouseleave", () => this.dispatchEventToListeners("TreeRowHovered", null));
    this.dataGrid.asWidget().show(this.element);
  }
  setStack(stack, selectedNode) {
    const rootNode = this.dataGrid.rootNode();
    rootNode.removeChildren();
    let nodeToReveal = null;
    const totalTime = Math.max.apply(Math, stack.map((node) => node.totalTime));
    for (const node of stack) {
      const gridNode = new GridNode(node, totalTime, totalTime, totalTime, this.treeView);
      rootNode.appendChild(gridNode);
      if (node === selectedNode) {
        nodeToReveal = gridNode;
      }
    }
    if (nodeToReveal) {
      nodeToReveal.revealAndSelect();
    }
  }
  onMouseMove(event) {
    const gridNode = event.target && event.target instanceof Node ? this.dataGrid.dataGridNodeFromNode(event.target) : null;
    const profileNode = gridNode?.profileNode;
    this.dispatchEventToListeners("TreeRowHovered", profileNode);
  }
  selectedTreeNode() {
    const selectedNode = this.dataGrid.selectedNode;
    return selectedNode && selectedNode.profileNode;
  }
  onSelectionChanged() {
    this.dispatchEventToListeners(
      "SelectionChanged"
      /* TimelineStackView.Events.SELECTION_CHANGED */
    );
  }
};

// gen/front_end/panels/timeline/ThirdPartyTreeView.js
var UIStrings11 = {
  /**
   * @description Unattributed text for an unattributed entity.
   */
  unattributed: "[unattributed]",
  /**
   * @description Title for the name of either 1st or 3rd Party entities.
   */
  firstOrThirdPartyName: "1st / 3rd party",
  /**
   * @description Title referencing transfer size.
   */
  transferSize: "Transfer size",
  /**
   * @description Title referencing main thread time.
   */
  mainThreadTime: "Main thread time"
};
var str_11 = i18n21.i18n.registerUIStrings("panels/timeline/ThirdPartyTreeView.ts", UIStrings11);
var i18nString11 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
var ThirdPartyTreeViewWidget = class extends TimelineTreeView {
  // By default the TimelineTreeView will auto-select the first row
  // when the grid is refreshed but for the ThirdParty view we only
  // want to do this when the user hovers.
  autoSelectFirstChildOnRefresh = false;
  constructor() {
    super();
    this.element.setAttribute("jslog", `${VisualLogging2.pane("third-party-tree").track({ hover: true })}`);
    this.init();
    this.dataGrid.markColumnAsSortedBy("self", DataGrid3.DataGrid.Order.Descending);
    this.dataGrid.setResizeMethod(
      "nearest"
      /* DataGrid.DataGrid.ResizeMethod.NEAREST */
    );
    this.dataGrid.expandNodesWhenArrowing = false;
  }
  wasShown() {
    super.wasShown();
    this.registerRequiredCSS(thirdPartyTreeView_css_default);
  }
  setModelWithEvents(selectedEvents, parsedTrace, entityMappings) {
    super.setModelWithEvents(selectedEvents, parsedTrace, entityMappings);
    const hasEvents = Boolean(selectedEvents && selectedEvents.length > 0);
    this.element.classList.toggle("empty-table", !hasEvents);
  }
  buildTree() {
    const parsedTrace = this.parsedTrace();
    const entityMapper = this.entityMapper();
    if (!parsedTrace || !entityMapper) {
      return new Trace14.Extras.TraceTree.BottomUpRootNode([], {
        textFilter: this.textFilter(),
        filters: this.filtersWithoutTextFilter(),
        startTime: this.startTime,
        endTime: this.endTime,
        eventGroupIdCallback: this.groupingFunction.bind(this)
      });
    }
    const relatedEvents = this.selectedEvents().sort(Trace14.Helpers.Trace.eventTimeComparator);
    const filter = new Trace14.Extras.TraceFilter.VisibleEventsFilter(Trace14.Styles.visibleTypes().concat([
      "SyntheticNetworkRequest"
      /* Trace.Types.Events.Name.SYNTHETIC_NETWORK_REQUEST */
    ]));
    const node = new Trace14.Extras.TraceTree.BottomUpRootNode(relatedEvents, {
      textFilter: this.textFilter(),
      filters: [filter],
      startTime: this.startTime,
      endTime: this.endTime,
      eventGroupIdCallback: this.groupingFunction.bind(this),
      calculateTransferSize: true,
      // Ensure we group by 3P alongside eventID for correct 3P grouping.
      forceGroupIdCallback: true
    });
    return node;
  }
  /**
   * Third party tree view doesn't require the select feature, as this expands the node.
   */
  selectProfileNode() {
    return;
  }
  groupingFunction(event) {
    const entity = this.entityMapper()?.entityForEvent(event);
    if (!entity) {
      return "";
    }
    return entity.name;
  }
  populateColumns(columns) {
    columns.push({
      id: "site",
      title: i18nString11(UIStrings11.firstOrThirdPartyName),
      // It's important that this width is the `.widget.vbox.timeline-tree-view` max-width (550)
      // minus the two fixed sizes below. (550-100-105) == 345
      width: "345px",
      // And with this column not-fixed-width and resizingMethod NEAREST, the name-column will appropriately flex.
      sortable: true
    }, {
      id: "transfer-size",
      title: i18nString11(UIStrings11.transferSize),
      width: "100px",
      // Mostly so there's room for the header plus sorting triangle
      fixedWidth: true,
      sortable: true
    }, {
      id: "self",
      title: i18nString11(UIStrings11.mainThreadTime),
      width: "120px",
      // Mostly to fit large self-time/main thread time plus devtools-button
      fixedWidth: true,
      sortable: true
    });
  }
  populateToolbar() {
    return;
  }
  compareTransferSize(a, b) {
    const nodeA = a;
    const nodeB = b;
    const transferA = nodeA.profileNode.transferSize ?? 0;
    const transferB = nodeB.profileNode.transferSize ?? 0;
    return transferA - transferB;
  }
  sortingChanged() {
    const columnId = this.dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    let sortFunction;
    switch (columnId) {
      case "transfer-size":
        sortFunction = this.compareTransferSize.bind(this);
        break;
      default:
        sortFunction = super.getSortingFunction(columnId);
        break;
    }
    if (sortFunction) {
      this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());
    }
  }
  onHover(node) {
    if (!node) {
      this.dispatchEventToListeners("TreeRowHovered", { node: null });
      return;
    }
    this.#getEventsForEventDispatch(node);
    const events = this.#getEventsForEventDispatch(node);
    this.dispatchEventToListeners("TreeRowHovered", { node, events: events && events.length > 0 ? events : void 0 });
  }
  onClick(node) {
    if (!node) {
      this.dispatchEventToListeners("TreeRowClicked", { node: null });
      return;
    }
    const events = this.#getEventsForEventDispatch(node);
    this.dispatchEventToListeners("TreeRowClicked", { node, events: events && events.length > 0 ? events : void 0 });
  }
  // For ThirdPartyTree, we should include everything in our entity mapper for full coverage.
  #getEventsForEventDispatch(node) {
    const mapper = this.entityMapper();
    if (!mapper) {
      return null;
    }
    const entity = mapper.entityForEvent(node.event);
    return entity ? mapper.eventsForEntity(entity) ?? [] : [];
  }
  displayInfoForGroupNode(node) {
    const color = "gray";
    const unattributed = i18nString11(UIStrings11.unattributed);
    const id = typeof node.id === "symbol" ? void 0 : node.id;
    const domainName = id ? this.entityMapper()?.entityForEvent(node.event)?.name || id : void 0;
    return { name: domainName || unattributed, color, icon: void 0 };
  }
  nodeIsFirstParty(node) {
    const mapper = this.entityMapper();
    if (!mapper) {
      return false;
    }
    const firstParty = mapper.firstPartyEntity();
    return firstParty === mapper.entityForEvent(node.event);
  }
  nodeIsExtension(node) {
    const mapper = this.entityMapper();
    if (!mapper) {
      return false;
    }
    const entity = mapper.entityForEvent(node.event);
    return Boolean(entity) && entity?.category === "Chrome Extension";
  }
};
var ThirdPartyTreeElement = class extends UI3.Widget.WidgetElement {
  #treeView;
  set treeView(treeView) {
    this.#treeView = treeView;
  }
  constructor() {
    super();
    this.style.display = "contents";
  }
  createWidget() {
    const containerWidget = new UI3.Widget.Widget(this);
    containerWidget.contentElement.style.display = "contents";
    if (this.#treeView) {
      this.#treeView.show(containerWidget.contentElement);
    }
    return containerWidget;
  }
};
customElements.define("devtools-performance-third-party-tree-view", ThirdPartyTreeElement);

// gen/front_end/panels/timeline/TimelinePanel.js
var TimelinePanel_exports = {};
__export(TimelinePanel_exports, {
  ActionDelegate: () => ActionDelegate,
  EventRevealer: () => EventRevealer,
  InsightRevealer: () => InsightRevealer,
  SelectedInsight: () => SelectedInsight,
  TimelinePanel: () => TimelinePanel,
  TraceRevealer: () => TraceRevealer,
  headerHeight: () => headerHeight,
  rowHeight: () => rowHeight
});
import "./../../ui/legacy/legacy.js";
import * as Common10 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n39 from "./../../core/i18n/i18n.js";
import * as Platform11 from "./../../core/platform/platform.js";
import * as Root4 from "./../../core/root/root.js";
import * as SDK7 from "./../../core/sdk/sdk.js";
import * as AiAssistanceModel from "./../../models/ai_assistance/ai_assistance.js";
import * as Badges from "./../../models/badges/badges.js";
import * as CrUXManager3 from "./../../models/crux-manager/crux-manager.js";
import * as TextUtils2 from "./../../models/text_utils/text_utils.js";
import * as Trace23 from "./../../models/trace/trace.js";
import * as SourceMapsResolver from "./../../models/trace_source_maps_resolver/trace_source_maps_resolver.js";
import * as Workspace2 from "./../../models/workspace/workspace.js";
import * as TraceBounds9 from "./../../services/trace_bounds/trace_bounds.js";
import * as Tracing3 from "./../../services/tracing/tracing.js";
import * as Adorners from "./../../ui/components/adorners/adorners.js";
import * as Dialogs from "./../../ui/components/dialogs/dialogs.js";
import * as LegacyWrapper from "./../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as Snackbars from "./../../ui/components/snackbars/snackbars.js";
import * as PerfUI12 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI10 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport17 from "./../../ui/legacy/theme_support/theme_support.js";
import * as VisualLogging6 from "./../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling from "./../mobile_throttling/mobile_throttling.js";
import * as TimelineComponents3 from "./components/components.js";
import * as TimelineInsights from "./components/insights/insights.js";

// gen/front_end/panels/timeline/IsolateSelector.js
import * as Common6 from "./../../core/common/common.js";
import * as i18n23 from "./../../core/i18n/i18n.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as Menus from "./../../ui/components/menus/menus.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
var UIStrings12 = {
  /**
   * @description Text to show an item is empty
   */
  empty: "(empty)",
  /**
   * @description Text in isolate selector in Performance panel
   */
  selectJavascriptVmInstance: "Select JavaScript VM instance"
};
var str_12 = i18n23.i18n.registerUIStrings("panels/timeline/IsolateSelector.ts", UIStrings12);
var i18nString12 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
var IsolateSelector = class extends UI4.Toolbar.ToolbarItem {
  menu;
  options;
  items;
  itemByIsolate = /* @__PURE__ */ new Map();
  constructor() {
    const menu = new Menus.SelectMenu.SelectMenu();
    super(menu);
    this.menu = menu;
    menu.buttonTitle = i18nString12(UIStrings12.selectJavascriptVmInstance);
    menu.showArrow = true;
    menu.style.whiteSpace = "normal";
    menu.addEventListener("selectmenuselected", this.#onSelectMenuSelected.bind(this));
    SDK3.IsolateManager.IsolateManager.instance().observeIsolates(this);
    SDK3.TargetManager.TargetManager.instance().addEventListener("NameChanged", this.targetChanged, this);
    SDK3.TargetManager.TargetManager.instance().addEventListener("InspectedURLChanged", this.targetChanged, this);
  }
  #updateIsolateItem(isolate, itemForIsolate) {
    const modelCountByName = /* @__PURE__ */ new Map();
    for (const model of isolate.models()) {
      const target = model.target();
      const name = SDK3.TargetManager.TargetManager.instance().rootTarget() !== target ? target.name() : "";
      const parsedURL = new Common6.ParsedURL.ParsedURL(target.inspectedURL());
      const domain = parsedURL.isValid ? parsedURL.domain() : "";
      const title = target.decorateLabel(domain && name ? `${domain}: ${name}` : name || domain || i18nString12(UIStrings12.empty));
      modelCountByName.set(title, (modelCountByName.get(title) || 0) + 1);
    }
    itemForIsolate.removeChildren();
    for (const [name, count] of modelCountByName) {
      const modelTitle = count > 1 ? `${name} (${count})` : name;
      const modelItem = itemForIsolate.createChild("div");
      modelItem.textContent = modelTitle;
    }
  }
  #onSelectMenuSelected(event) {
    this.itemByIsolate.forEach((item, isolate) => {
      item.selected = item.value === event.itemValue;
      if (item.selected) {
        const selectedIsolateTitle = item.textContent?.slice(0, 29);
        this.menu.buttonTitle = selectedIsolateTitle || i18nString12(UIStrings12.empty);
        const model = isolate.runtimeModel();
        UI4.Context.Context.instance().setFlavor(SDK3.CPUProfilerModel.CPUProfilerModel, model?.target().model(SDK3.CPUProfilerModel.CPUProfilerModel) ?? null);
      }
    });
  }
  isolateAdded(isolate) {
    const isolateItem = new Menus.Menu.MenuItem();
    this.menu.appendChild(isolateItem);
    isolateItem.value = isolate.id();
    this.itemByIsolate.set(isolate, isolateItem);
    this.#updateIsolateItem(isolate, isolateItem);
  }
  isolateRemoved(isolate) {
    const isolateItem = this.itemByIsolate.get(isolate);
    if (isolateItem) {
      if (isolateItem.selected) {
        this.menu.buttonTitle = i18nString12(UIStrings12.selectJavascriptVmInstance);
        UI4.Context.Context.instance().setFlavor(SDK3.CPUProfilerModel.CPUProfilerModel, null);
      }
      this.menu.removeChild(isolateItem);
    }
  }
  isolateChanged(isolate) {
    const isolateItem = this.itemByIsolate.get(isolate);
    if (isolateItem) {
      this.#updateIsolateItem(isolate, isolateItem);
    }
  }
  targetChanged(event) {
    const target = event.data;
    const model = target.model(SDK3.RuntimeModel.RuntimeModel);
    if (!model) {
      return;
    }
    const isolate = SDK3.IsolateManager.IsolateManager.instance().isolateByModel(model);
    if (isolate) {
      this.isolateChanged(isolate);
    }
  }
};

// gen/front_end/panels/timeline/TimelinePanel.js
import * as Overlays from "./overlays/overlays.js";

// gen/front_end/panels/timeline/SaveFileFormatter.js
var SaveFileFormatter_exports = {};
__export(SaveFileFormatter_exports, {
  arrayOfObjectsJsonGenerator: () => arrayOfObjectsJsonGenerator,
  traceJsonGenerator: () => traceJsonGenerator
});
function* arrayOfObjectsJsonGenerator(arrayOfObjects) {
  const ITEMS_PER_ITERATION = 1e4;
  yield "[\n";
  if (arrayOfObjects.length > 0) {
    const itemsIterator = arrayOfObjects[Symbol.iterator]();
    const firstItem = itemsIterator.next().value;
    yield `  ${JSON.stringify(firstItem)}`;
    let itemsRemaining = ITEMS_PER_ITERATION;
    let itemsJSON = "";
    for (const item of itemsIterator) {
      itemsJSON += `,
  ${JSON.stringify(item)}`;
      itemsRemaining--;
      if (itemsRemaining === 0) {
        yield itemsJSON;
        itemsRemaining = ITEMS_PER_ITERATION;
        itemsJSON = "";
      }
    }
    yield itemsJSON;
  }
  yield "\n]";
}
function* traceJsonGenerator(traceEvents, metadata) {
  if (metadata?.enhancedTraceVersion) {
    metadata = {
      enhancedTraceVersion: metadata.enhancedTraceVersion,
      ...metadata
    };
  }
  yield `{"metadata": ${JSON.stringify(metadata || {}, null, 2)}`;
  yield ',\n"traceEvents": ';
  yield* arrayOfObjectsJsonGenerator(traceEvents);
  yield "}\n";
}

// gen/front_end/panels/timeline/StatusDialog.js
import "./../../ui/legacy/legacy.js";
import * as i18n25 from "./../../core/i18n/i18n.js";
import * as Platform8 from "./../../core/platform/platform.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/timelineStatusDialog.css.js
var timelineStatusDialog_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.timeline-status-dialog {
  display: flex;
  flex-direction: column;
  padding: 16px 16px 12px;
  align-self: center;
  background-color: var(--sys-color-cdt-base-container);
  box-shadow: var(--drop-shadow);
  border-radius: 10px;
}

.status-dialog-line {
  margin: 2px;
  height: 14px;
  min-height: auto;
  display: flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
}

.status-dialog-line .label {
  display: inline-block;
  width: 80px;
  text-align: right;
  color: var(--sys-color-on-surface);
  margin-right: 10px;
}

.timeline-status-dialog .progress .indicator-container {
  display: inline-block;
  width: 200px;
  height: 8px;
  background-color: var(--sys-color-surface5);
}

.timeline-status-dialog .progress .indicator {
  background-color: var(--sys-color-primary);
  height: 100%;
  width: 0;
  margin: 0;
}

.timeline-status-dialog .stop-button {
  margin-top: 8px;
  height: 100%;
  align-self: flex-end;
}

.timeline-status-dialog .stop-button button {
  border-radius: 12px;
}

@media (forced-colors: active) {
  .timeline-status-dialog {
    border: 1px solid canvastext;
  }

  .timeline-status-dialog .progress .indicator-container {
    border: 1px solid ButtonText;
    background-color: ButtonFace;
  }

  .timeline-status-dialog .progress .indicator {
    forced-color-adjust: none;
    background-color: ButtonText;
  }
}

:host {
  container-type: inline-size;
}

/* 326 is the widths above (200 + 80) + a bunch of padding. calc() can't be used here sadly */
@container (max-width: 326px) {
  .timeline-status-dialog {
    box-shadow: none;

    .stop-button {
      align-self: center;
    }
  }

  .status-dialog-line {
    flex-direction: column;

    .label {
      display: none;
    }
  }
}

/*# sourceURL=${import.meta.resolve("./timelineStatusDialog.css")} */`;

// gen/front_end/panels/timeline/StatusDialog.js
var UIStrings13 = {
  /**
   * @description Text to download the trace file after an error
   */
  downloadAfterError: "Download trace",
  /**
   * @description Text for the status of something
   */
  status: "Status",
  /**
   * @description Text that refers to the time
   */
  time: "Time",
  /**
   * @description Text for the description of something
   */
  description: "Description",
  /**
   * @description Text of an item that stops the running task
   */
  stop: "Stop"
};
var str_13 = i18n25.i18n.registerUIStrings("panels/timeline/StatusDialog.ts", UIStrings13);
var i18nString13 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var StatusDialog = class extends UI5.Widget.VBox {
  status;
  time;
  progressLabel;
  progressBar;
  description;
  button;
  downloadTraceButton;
  startTime;
  timeUpdateTimer;
  #rawEvents;
  constructor(options, onButtonClickCallback) {
    super({
      jslog: `${VisualLogging3.dialog("timeline-status").track({ resize: true })}`,
      useShadowDom: true
    });
    this.contentElement.classList.add("timeline-status-dialog");
    const statusLine = this.contentElement.createChild("div", "status-dialog-line status");
    statusLine.createChild("div", "label").textContent = i18nString13(UIStrings13.status);
    this.status = statusLine.createChild("div", "content");
    UI5.ARIAUtils.markAsStatus(this.status);
    if (options.showTimer) {
      const timeLine = this.contentElement.createChild("div", "status-dialog-line time");
      timeLine.createChild("div", "label").textContent = i18nString13(UIStrings13.time);
      this.time = timeLine.createChild("div", "content");
    }
    if (options.showProgress) {
      const progressBarContainer = this.contentElement.createChild("div", "status-dialog-line progress");
      this.progressLabel = progressBarContainer.createChild("div", "label");
      this.progressBar = progressBarContainer.createChild("div", "indicator-container").createChild("div", "indicator");
      UI5.ARIAUtils.markAsProgressBar(this.progressBar);
    }
    if (typeof options.description === "string") {
      const descriptionLine = this.contentElement.createChild("div", "status-dialog-line description");
      descriptionLine.createChild("div", "label").textContent = i18nString13(UIStrings13.description);
      this.description = descriptionLine.createChild("div", "content");
      this.description.innerText = options.description;
    }
    const buttonContainer = this.contentElement.createChild("div", "stop-button");
    this.downloadTraceButton = UI5.UIUtils.createTextButton(i18nString13(UIStrings13.downloadAfterError), () => {
      void this.#downloadRawTraceAfterError();
    }, { jslogContext: "timeline.download-after-error" });
    this.downloadTraceButton.disabled = true;
    this.downloadTraceButton.classList.add("hidden");
    const buttonText = options.buttonText || i18nString13(UIStrings13.stop);
    this.button = UI5.UIUtils.createTextButton(buttonText, onButtonClickCallback, {
      jslogContext: "timeline.stop-recording"
    });
    this.button.classList.toggle("hidden", options.hideStopButton);
    buttonContainer.append(this.downloadTraceButton);
    buttonContainer.append(this.button);
  }
  finish() {
    this.stopTimer();
    this.button.classList.add("hidden");
  }
  async #downloadRawTraceAfterError() {
    if (!this.#rawEvents || this.#rawEvents.length === 0) {
      return;
    }
    const traceStart = Platform8.DateUtilities.toISO8601Compact(/* @__PURE__ */ new Date());
    const fileName = `Trace-Load-Error-${traceStart}.json`;
    const formattedTraceIter = traceJsonGenerator(this.#rawEvents, {});
    const traceAsString = Array.from(formattedTraceIter).join("");
    await Workspace.FileManager.FileManager.instance().save(
      fileName,
      new TextUtils.ContentData.ContentData(
        traceAsString,
        /* isBase64=*/
        false,
        "application/json"
      ),
      /* forceSaveAs=*/
      true
    );
    Workspace.FileManager.FileManager.instance().close(fileName);
  }
  enableDownloadOfEvents(rawEvents) {
    this.#rawEvents = rawEvents;
    this.downloadTraceButton.disabled = false;
    this.downloadTraceButton.classList.remove("hidden");
  }
  remove() {
    this.element.parentNode?.classList.remove("tinted");
    this.stopTimer();
    this.element.remove();
  }
  showPane(parent) {
    this.show(parent);
    parent.classList.add("tinted");
  }
  enableAndFocusButton() {
    this.button.classList.remove("hidden");
    this.button.focus();
  }
  updateStatus(text) {
    this.status.textContent = text;
  }
  updateProgressBar(activity, percent) {
    if (this.progressLabel) {
      this.progressLabel.textContent = activity;
    }
    if (this.progressBar) {
      this.progressBar.style.width = percent.toFixed(1) + "%";
      UI5.ARIAUtils.setValueNow(this.progressBar, percent);
    }
    this.updateTimer();
  }
  startTimer() {
    this.startTime = Date.now();
    this.timeUpdateTimer = window.setInterval(this.updateTimer.bind(this), 100);
    this.updateTimer();
  }
  stopTimer() {
    if (!this.timeUpdateTimer) {
      return;
    }
    clearInterval(this.timeUpdateTimer);
    this.updateTimer();
    delete this.timeUpdateTimer;
  }
  updateTimer() {
    if (!this.timeUpdateTimer || !this.time) {
      return;
    }
    const seconds = (Date.now() - this.startTime) / 1e3;
    this.time.textContent = i18n25.TimeUtilities.preciseSecondsToString(seconds, 1);
  }
  wasShown() {
    super.wasShown();
    this.registerRequiredCSS(timelineStatusDialog_css_default);
  }
};

// gen/front_end/panels/timeline/TimelineController.js
var TimelineController_exports = {};
__export(TimelineController_exports, {
  TimelineController: () => TimelineController
});
import * as i18n27 from "./../../core/i18n/i18n.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as CrUXManager from "./../../models/crux-manager/crux-manager.js";
import * as LiveMetrics from "./../../models/live-metrics/live-metrics.js";
import * as Trace16 from "./../../models/trace/trace.js";
import * as PanelCommon from "./../common/common.js";
import * as Tracing2 from "./../../services/tracing/tracing.js";

// gen/front_end/panels/timeline/RecordingMetadata.js
var RecordingMetadata_exports = {};
__export(RecordingMetadata_exports, {
  forCPUProfile: () => forCPUProfile,
  forTrace: () => forTrace
});
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as EmulationModel from "./../../models/emulation/emulation.js";
import * as Trace15 from "./../../models/trace/trace.js";
function forCPUProfile() {
  return {
    dataOrigin: "CPUProfile"
  };
}
async function forTrace(dataFromController = {}) {
  try {
    return await innerForTraceCalculate(dataFromController);
  } catch {
    return {};
  }
}
async function innerForTraceCalculate({ recordingStartTime, cruxFieldData } = {}) {
  const deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.tryInstance();
  let emulatedDeviceTitle;
  if (deviceModeModel?.type() === EmulationModel.DeviceModeModel.Type.Device) {
    emulatedDeviceTitle = deviceModeModel.device()?.title ?? void 0;
  } else if (deviceModeModel?.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
    emulatedDeviceTitle = "Responsive";
  }
  const cpuThrottling = SDK4.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate();
  const networkConditions = SDK4.NetworkManager.MultitargetNetworkManager.instance().isThrottling() ? SDK4.NetworkManager.MultitargetNetworkManager.instance().networkConditions() : void 0;
  let networkThrottlingConditions;
  let networkTitle;
  if (networkConditions) {
    networkThrottlingConditions = {
      download: networkConditions.download,
      upload: networkConditions.upload,
      latency: networkConditions.latency,
      packetLoss: networkConditions.packetLoss,
      packetQueueLength: networkConditions.packetQueueLength,
      packetReordering: networkConditions.packetReordering,
      targetLatency: networkConditions.targetLatency,
      key: networkConditions.key
    };
    networkTitle = typeof networkConditions.title === "function" ? networkConditions.title() : networkConditions.title;
  }
  return {
    source: "DevTools",
    startTime: recordingStartTime ? new Date(recordingStartTime).toJSON() : void 0,
    // ISO-8601 timestamp
    emulatedDeviceTitle,
    cpuThrottling: cpuThrottling !== 1 ? cpuThrottling : void 0,
    networkThrottling: networkTitle,
    networkThrottlingConditions,
    dataOrigin: "TraceEvents",
    cruxFieldData: cruxFieldData ?? void 0,
    hostDPR: window.devicePixelRatio
  };
}

// gen/front_end/panels/timeline/TimelineController.js
var UIStrings14 = {
  /**
   * @description Text in Timeline Controller of the Performance panel indicating that the Performance Panel cannot
   * record a performance trace because the type of target (where possible types are page, service worker and shared
   * worker) doesn't support it.
   */
  tracingNotSupported: "Performance trace recording not supported for this type of target"
};
var str_14 = i18n27.i18n.registerUIStrings("panels/timeline/TimelineController.ts", UIStrings14);
var i18nString14 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var TimelineController = class {
  primaryPageTarget;
  rootTarget;
  tracingManager;
  #collectedEvents = [];
  #navigationUrls = [];
  #fieldData = null;
  #recordingStartTime = null;
  client;
  tracingCompletePromise = null;
  /**
   * We always need to profile against the DevTools root target, which is
   * the target that DevTools is attached to.
   *
   * In most cases, this will be the tab that DevTools is inspecting.
   * Now pre-rendering is active, tabs can have multiple pages - only one
   * of which the user is being shown. This is the "primary page" and hence
   * why in code we have "primaryPageTarget". When there's a prerendered
   * page in a background, tab target would have multiple subtargets, one
   * of them being primaryPageTarget.
   *
   * The problems with using primary page target for tracing are:
   * 1. Performance trace doesn't include information from the other pages on
   *    the tab which is probably not what the user wants as it does not
   *    reflect reality.
   * 2. Capturing trace never finishes after prerendering activation as
   *    we've started on one target and ending on another one, and
   *    tracingComplete event never gets processed.
   *
   * However, when we want to look at the URL of the current page, we need
   * to use the primaryPageTarget to ensure we get the URL of the tab and
   * the tab's page that is being shown to the user. This is because the tab
   * target (which is what rootTarget is) only exposes the Target and Tracing
   * domains. We need the Page target to navigate as it implements the Page
   * domain. That is why here we have to store both.
   **/
  constructor(rootTarget, primaryPageTarget, client) {
    this.primaryPageTarget = primaryPageTarget;
    this.rootTarget = rootTarget;
    this.tracingManager = rootTarget.model(Tracing2.TracingManager.TracingManager);
    this.client = client;
  }
  async dispose() {
    if (this.tracingManager) {
      await this.tracingManager.reset();
    }
  }
  async startRecording(options) {
    function disabledByDefault(category) {
      return "disabled-by-default-" + category;
    }
    const categoriesArray = [
      Root2.Runtime.experiments.isEnabled("timeline-show-all-events") ? "*" : "-*",
      Trace16.Types.Events.Categories.Console,
      Trace16.Types.Events.Categories.Loading,
      Trace16.Types.Events.Categories.UserTiming,
      "devtools.timeline",
      disabledByDefault("devtools.target-rundown"),
      disabledByDefault("devtools.timeline.frame"),
      disabledByDefault("devtools.timeline.stack"),
      disabledByDefault("devtools.timeline"),
      disabledByDefault("devtools.v8-source-rundown-sources"),
      disabledByDefault("devtools.v8-source-rundown"),
      disabledByDefault("layout_shift.debug"),
      // Looking for disabled-by-default-v8.compile? We disabled it: crbug.com/414330508.
      disabledByDefault("v8.inspector"),
      disabledByDefault("v8.cpu_profiler.hires"),
      disabledByDefault("lighthouse"),
      "v8.execute",
      "v8",
      "cppgc",
      "navigation,rail"
    ];
    if (Root2.Runtime.experiments.isEnabled("timeline-v8-runtime-call-stats") && options.enableJSSampling) {
      categoriesArray.push(disabledByDefault("v8.runtime_stats_sampling"));
    }
    if (options.enableJSSampling) {
      categoriesArray.push(disabledByDefault("v8.cpu_profiler"));
    }
    if (Root2.Runtime.experiments.isEnabled("timeline-invalidation-tracking")) {
      categoriesArray.push(disabledByDefault("devtools.timeline.invalidationTracking"));
    }
    if (options.capturePictures) {
      categoriesArray.push(disabledByDefault("devtools.timeline.layers"), disabledByDefault("devtools.timeline.picture"), disabledByDefault("blink.graphics_context_annotations"));
    }
    if (options.captureFilmStrip) {
      categoriesArray.push(disabledByDefault("devtools.screenshot"));
    }
    if (options.captureSelectorStats) {
      categoriesArray.push(disabledByDefault("blink.debug"));
      categoriesArray.push(disabledByDefault("devtools.timeline.invalidationTracking"));
    }
    await LiveMetrics.LiveMetrics.instance().disable();
    SDK5.TargetManager.TargetManager.instance().addModelListener(SDK5.ResourceTreeModel.ResourceTreeModel, SDK5.ResourceTreeModel.Events.FrameNavigated, this.#onFrameNavigated, this);
    this.#navigationUrls = [];
    this.#fieldData = null;
    this.#recordingStartTime = Date.now();
    const response = await this.startRecordingWithCategories(categoriesArray.join(","));
    if (response.getError()) {
      await SDK5.TargetManager.TargetManager.instance().resumeAllTargets();
    }
    return response;
  }
  async #onFrameNavigated(event) {
    if (!event.data.isPrimaryFrame()) {
      return;
    }
    this.#navigationUrls.push(event.data.url);
  }
  async stopRecording() {
    if (this.tracingManager) {
      this.tracingManager.stop();
    }
    SDK5.TargetManager.TargetManager.instance().removeModelListener(SDK5.ResourceTreeModel.ResourceTreeModel, SDK5.ResourceTreeModel.Events.FrameNavigated, this.#onFrameNavigated, this);
    const throttlingManager = SDK5.CPUThrottlingManager.CPUThrottlingManager.instance();
    const optionDuringRecording = throttlingManager.cpuThrottlingOption();
    throttlingManager.setCPUThrottlingOption(SDK5.CPUThrottlingManager.NoThrottlingOption);
    this.client.loadingStarted();
    SDK5.SourceMap.SourceMap.retainRawSourceMaps = true;
    const [fieldData] = await Promise.all([
      this.fetchFieldData(),
      // TODO(crbug.com/366072294): Report the progress of this resumption, as it can be lengthy on heavy pages.
      SDK5.TargetManager.TargetManager.instance().resumeAllTargets(),
      this.waitForTracingToStop()
    ]).catch((e) => {
      SDK5.SourceMap.SourceMap.retainRawSourceMaps = false;
      throw e;
    });
    this.#fieldData = fieldData;
    throttlingManager.setCPUThrottlingOption(optionDuringRecording);
    await this.allSourcesFinished();
    await LiveMetrics.LiveMetrics.instance().enable();
  }
  async fetchFieldData() {
    const cruxManager = CrUXManager.CrUXManager.instance();
    if (!cruxManager.isEnabled() || !navigator.onLine) {
      return null;
    }
    const urls = [...new Set(this.#navigationUrls)];
    return await Promise.all(urls.map((url) => cruxManager.getFieldDataForPage(url)));
  }
  async waitForTracingToStop() {
    if (this.tracingManager) {
      await this.tracingCompletePromise?.promise;
    }
  }
  async startRecordingWithCategories(categories2) {
    if (!this.tracingManager) {
      throw new Error(i18nString14(UIStrings14.tracingNotSupported));
    }
    await SDK5.TargetManager.TargetManager.instance().suspendAllTargets("performance-timeline");
    this.tracingCompletePromise = Promise.withResolvers();
    const response = await this.tracingManager.start(this, categories2);
    await this.warmupJsProfiler();
    PanelCommon.ExtensionServer.ExtensionServer.instance().profilingStarted();
    return response;
  }
  // CPUProfiler::StartProfiling has a non-trivial cost and we'd prefer it not happen within an
  // interaction as that complicates debugging interaction latency.
  // To trigger the StartProfiling interrupt and get the warmup cost out of the way, we send a
  // very soft invocation to V8.https://crbug.com/1358602
  async warmupJsProfiler() {
    const runtimeModel = this.primaryPageTarget.model(SDK5.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }
    await runtimeModel.agent.invoke_evaluate({
      expression: "(async function(){ await 1; })()",
      throwOnSideEffect: true
    });
  }
  traceEventsCollected(events) {
    this.#collectedEvents.push(...events);
  }
  tracingComplete() {
    if (!this.tracingCompletePromise) {
      return;
    }
    this.tracingCompletePromise.resolve(void 0);
    this.tracingCompletePromise = null;
  }
  async allSourcesFinished() {
    PanelCommon.ExtensionServer.ExtensionServer.instance().profilingStopped();
    this.client.processingStarted();
    const metadata = await forTrace({
      recordingStartTime: this.#recordingStartTime ?? void 0,
      cruxFieldData: this.#fieldData ?? void 0
    });
    await this.client.loadingComplete(
      this.#collectedEvents,
      /* exclusiveFilter= */
      null,
      metadata
    );
    this.client.loadingCompleteForTest();
    SDK5.SourceMap.SourceMap.retainRawSourceMaps = false;
  }
  tracingBufferUsage(usage) {
    this.client.recordingProgress(usage);
  }
  eventsRetrievalProgress(progress) {
    this.client.loadingProgress(progress);
  }
};

// gen/front_end/panels/timeline/TimelineHistoryManager.js
var TimelineHistoryManager_exports = {};
__export(TimelineHistoryManager_exports, {
  DropDown: () => DropDown,
  LANDING_PAGE_INDEX_DROPDOWN_CHOICE: () => LANDING_PAGE_INDEX_DROPDOWN_CHOICE,
  TimelineHistoryManager: () => TimelineHistoryManager,
  ToolbarButton: () => ToolbarButton,
  maxRecordings: () => maxRecordings,
  previewWidth: () => previewWidth
});
import * as Common7 from "./../../core/common/common.js";
import * as i18n31 from "./../../core/i18n/i18n.js";
import * as Platform9 from "./../../core/platform/platform.js";
import * as Trace18 from "./../../models/trace/trace.js";
import { createIcon } from "./../../ui/kit/kit.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/TimelineEventOverview.js
var TimelineEventOverview_exports = {};
__export(TimelineEventOverview_exports, {
  Quantizer: () => Quantizer,
  TimelineEventOverview: () => TimelineEventOverview,
  TimelineEventOverviewCPUActivity: () => TimelineEventOverviewCPUActivity,
  TimelineEventOverviewMemory: () => TimelineEventOverviewMemory,
  TimelineEventOverviewNetwork: () => TimelineEventOverviewNetwork,
  TimelineEventOverviewResponsiveness: () => TimelineEventOverviewResponsiveness,
  TimelineFilmStripOverview: () => TimelineFilmStripOverview
});
import * as i18n29 from "./../../core/i18n/i18n.js";
import * as Trace17 from "./../../models/trace/trace.js";
import * as TraceBounds5 from "./../../services/trace_bounds/trace_bounds.js";
import * as PerfUI10 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport15 from "./../../ui/legacy/theme_support/theme_support.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings15 = {
  /**
   * @description Short for Network. Label for the network requests section of the Performance panel.
   */
  net: "NET",
  /**
   * @description Text in Timeline Event Overview of the Performance panel
   */
  cpu: "CPU",
  /**
   * @description Text in Timeline Event Overview of the Performance panel
   */
  heap: "HEAP",
  /**
   * @description Heap size label text content in Timeline Event Overview of the Performance panel
   * @example {10 MB} PH1
   * @example {30 MB} PH2
   */
  sSDash: "{PH1} \u2013 {PH2}"
};
var str_15 = i18n29.i18n.registerUIStrings("panels/timeline/TimelineEventOverview.ts", UIStrings15);
var i18nString15 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var TimelineEventOverview = class extends PerfUI10.TimelineOverviewPane.TimelineOverviewBase {
  constructor(id, title) {
    super();
    this.element.id = "timeline-overview-" + id;
    this.element.classList.add("overview-strip");
    if (title) {
      this.element.createChild("div", "timeline-overview-strip-title").textContent = title;
    }
  }
  renderBar(begin, end, position, height, color) {
    const x = begin;
    const width = end - begin;
    const ctx = this.context();
    ctx.fillStyle = color;
    ctx.fillRect(x, position, width, height);
  }
};
var TimelineEventOverviewNetwork = class extends TimelineEventOverview {
  #parsedTrace;
  constructor(parsedTrace) {
    super("network", i18nString15(UIStrings15.net));
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
    const traceBoundsMilli = start && end ? {
      min: start,
      max: end,
      range: end - start
    } : Trace17.Helpers.Timing.traceWindowMilliSeconds(this.#parsedTrace.data.Meta.traceBounds);
    const pathHeight = this.height() / 2;
    const canvasWidth = this.width();
    const scale = canvasWidth / traceBoundsMilli.range;
    const highPath = new Path2D();
    const lowPath = new Path2D();
    for (const request of this.#parsedTrace.data.NetworkRequests.byTime) {
      const path = Trace17.Helpers.Network.isSyntheticNetworkRequestHighPriority(request) ? highPath : lowPath;
      const { startTime, endTime } = Trace17.Helpers.Timing.eventTimingsMilliSeconds(request);
      const rectStart = Math.max(Math.floor((startTime - traceBoundsMilli.min) * scale), 0);
      const rectEnd = Math.min(Math.ceil((endTime - traceBoundsMilli.min) * scale + 1), canvasWidth);
      path.rect(rectStart, 0, rectEnd - rectStart, pathHeight - 1);
    }
    const ctx = this.context();
    ctx.save();
    ctx.fillStyle = "hsl(214, 60%, 60%)";
    ctx.fill(highPath);
    ctx.translate(0, pathHeight);
    ctx.fillStyle = "hsl(214, 80%, 80%)";
    ctx.fill(lowPath);
    ctx.restore();
  }
};
var categoryToIndex = /* @__PURE__ */ new WeakMap();
var TimelineEventOverviewCPUActivity = class extends TimelineEventOverview {
  backgroundCanvas;
  #parsedTrace;
  #drawn = false;
  #start;
  #end;
  constructor(parsedTrace) {
    super("cpu-activity", i18nString15(UIStrings15.cpu));
    this.#parsedTrace = parsedTrace;
    this.backgroundCanvas = this.element.createChild("canvas", "fill background");
    this.#start = Trace17.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.data.Meta.traceBounds).min;
    this.#end = Trace17.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.data.Meta.traceBounds).max;
  }
  #entryCategory(entry) {
    if (Trace17.Types.Events.isProfileCall(entry) && entry.callFrame.functionName === "(idle)") {
      return Trace17.Styles.EventCategory.IDLE;
    }
    if (Trace17.Types.Events.isProfileCall(entry) && entry.callFrame.functionName === "(program)") {
      return Trace17.Styles.EventCategory.OTHER;
    }
    const eventStyle = Trace17.Styles.getEventStyle(entry.name)?.category || Trace17.Styles.getCategoryStyles().other;
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
    const categories2 = Trace17.Styles.getCategoryStyles();
    const categoryOrder = Trace17.Styles.getTimelineMainEventCategories();
    const otherIndex = categoryOrder.indexOf(Trace17.Styles.EventCategory.OTHER);
    const idleIndex = 0;
    console.assert(idleIndex === categoryOrder.indexOf(Trace17.Styles.EventCategory.IDLE));
    for (let i = 0; i < categoryOrder.length; ++i) {
      categoryToIndex.set(categories2[categoryOrder[i]], i);
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
        if (!category || category === "idle") {
          return;
        }
        const startTimeMilli = Trace17.Helpers.Timing.microToMilli(entry.ts);
        const index = categoryIndexStack.length ? categoryIndexStack[categoryIndexStack.length - 1] : idleIndex;
        quantizer.appendInterval(startTimeMilli, index);
        const categoryIndex = categoryOrder.indexOf(category);
        categoryIndexStack.push(categoryIndex || otherIndex);
      };
      function onEntryEnd(entry) {
        const endTimeMilli = Trace17.Helpers.Timing.microToMilli(entry.ts) + Trace17.Helpers.Timing.microToMilli(Trace17.Types.Timing.Micro(entry.dur || 0));
        const lastCategoryIndex = categoryIndexStack.pop();
        if (endTimeMilli !== void 0 && lastCategoryIndex) {
          quantizer.appendInterval(endTimeMilli, lastCategoryIndex);
        }
      }
      const startMicro = Trace17.Helpers.Timing.milliToMicro(this.#start);
      const endMicro = Trace17.Helpers.Timing.milliToMicro(this.#end);
      const bounds = {
        min: startMicro,
        max: endMicro,
        range: Trace17.Types.Timing.Micro(endMicro - startMicro)
      };
      const minDuration = Trace17.Types.Timing.Micro(bounds.range > 2e5 ? 16e3 : 0);
      Trace17.Helpers.TreeHelpers.walkEntireTree(threadData.entryToNode, threadData.tree, onEntryStart, onEntryEnd, bounds, minDuration);
      quantizer.appendInterval(this.#start + timeRange + quantTime, idleIndex);
      for (let i = categoryOrder.length - 1; i > 0; --i) {
        paths[i].lineTo(width, height);
        const computedColorValue = ThemeSupport15.ThemeSupport.instance().getComputedValue(categories2[categoryOrder[i]].cssVariable);
        context.fillStyle = computedColorValue;
        context.fill(paths[i]);
        context.strokeStyle = "white";
        context.lineWidth = 1;
        context.stroke(paths[i]);
      }
    };
    const backgroundContext = this.backgroundCanvas.getContext("2d");
    if (!backgroundContext) {
      throw new Error("Could not find 2d canvas");
    }
    const threads = Trace17.Handlers.Threads.threadsInTrace(parsedTrace.data);
    const mainThreadContext = this.context();
    for (const thread of threads) {
      const isMainThread = thread.type === "MAIN_THREAD" || thread.type === "CPU_PROFILE";
      if (isMainThread) {
        drawThreadEntries(mainThreadContext, thread);
      } else {
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
      ctx.globalCompositeOperation = "destination-out";
      ctx.stroke();
      ctx.restore();
    }
    applyPattern(backgroundContext);
  }
  update() {
    const traceBoundsState = TraceBounds5.TraceBounds.BoundsManager.instance().state();
    const bounds = traceBoundsState?.milli.minimapTraceBounds;
    if (!bounds) {
      return;
    }
    if (bounds.min === this.#start && bounds.max === this.#end && this.#drawn) {
      return;
    }
    this.#start = bounds.min;
    this.#end = bounds.max;
    this.resetCanvas();
    this.#drawn = true;
    this.#draw(this.#parsedTrace);
  }
};
var TimelineEventOverviewResponsiveness = class extends TimelineEventOverview {
  #parsedTrace;
  constructor(parsedTrace) {
    super("responsiveness", null);
    this.#parsedTrace = parsedTrace;
  }
  #gatherEventsWithRelevantWarnings() {
    const { topLevelRendererIds } = this.#parsedTrace.data.Meta;
    const warningsForResponsiveness = /* @__PURE__ */ new Set([
      "LONG_TASK",
      "FORCED_REFLOW",
      "IDLE_CALLBACK_OVER_TIME"
    ]);
    const allWarningEvents = /* @__PURE__ */ new Set();
    for (const warning of warningsForResponsiveness) {
      const eventsForWarning = this.#parsedTrace.data.Warnings.perWarning.get(warning);
      if (!eventsForWarning) {
        continue;
      }
      for (const event of eventsForWarning) {
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
      min: Trace17.Helpers.Timing.milliToMicro(start),
      max: Trace17.Helpers.Timing.milliToMicro(end),
      range: Trace17.Helpers.Timing.milliToMicro(Trace17.Types.Timing.Milli(end - start))
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
    ctx.fillStyle = "hsl(0, 80%, 90%)";
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.fill(fillPath);
    ctx.stroke(markersPath);
    function paintWarningDecoration(event) {
      const { startTime, duration } = Trace17.Helpers.Timing.eventTimingsMicroSeconds(event);
      const x = Math.round(scale * (startTime - visibleTimeWindow.min));
      const width = Math.round(scale * duration);
      fillPath.rect(x, 0, width, height);
      markersPath.moveTo(x + width, 0);
      markersPath.lineTo(x + width, height);
    }
  }
};
var TimelineFilmStripOverview = class _TimelineFilmStripOverview extends TimelineEventOverview {
  frameToImagePromise;
  lastFrame = null;
  lastElement;
  drawGeneration;
  emptyImage;
  #filmStrip = null;
  constructor(filmStrip) {
    super("filmstrip", null);
    this.element.setAttribute("jslog", `${VisualLogging4.section("film-strip")}`);
    this.frameToImagePromise = /* @__PURE__ */ new Map();
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
      console.warn("TimelineFilmStrip could not be drawn as its canvas height is 0");
      return;
    }
    const drawGeneration = Symbol("drawGeneration");
    this.drawGeneration = drawGeneration;
    void this.imageByFrame(frames[0]).then((image) => {
      if (this.drawGeneration !== drawGeneration) {
        return;
      }
      if (!image?.naturalWidth || !image.naturalHeight) {
        return;
      }
      const imageHeight = this.height() - 2 * _TimelineFilmStripOverview.Padding;
      const imageWidth = Math.ceil(imageHeight * image.naturalWidth / image.naturalHeight);
      const popoverScale = Math.min(200 / image.naturalWidth, 1);
      this.emptyImage = new Image(image.naturalWidth * popoverScale, image.naturalHeight * popoverScale);
      this.drawFrames(imageWidth, imageHeight, customStartTime, customEndTime);
    });
  }
  async imageByFrame(frame) {
    let imagePromise = this.frameToImagePromise.get(frame);
    if (!imagePromise) {
      const uri = Trace17.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(frame.screenshotEvent);
      imagePromise = UI6.UIUtils.loadImage(uri);
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
    const padding = _TimelineFilmStripOverview.Padding;
    const width = this.width();
    const zeroTime = customStartTime ?? Trace17.Helpers.Timing.microToMilli(this.#filmStrip.zeroTime);
    const spanTime = customEndTime ? customEndTime - zeroTime : Trace17.Helpers.Timing.microToMilli(this.#filmStrip.spanTime);
    const scale = spanTime / width;
    const context = this.context();
    const drawGeneration = this.drawGeneration;
    context.beginPath();
    for (let x = padding; x < width; x += imageWidth + 2 * padding) {
      const time = Trace17.Types.Timing.Milli(zeroTime + (x + imageWidth / 2) * scale);
      const timeMicroSeconds = Trace17.Helpers.Timing.milliToMicro(time);
      const frame = Trace17.Extras.FilmStrip.frameClosestToTimestamp(this.#filmStrip, timeMicroSeconds);
      if (!frame) {
        continue;
      }
      context.rect(x - 0.5, 0.5, imageWidth + 1, imageHeight + 1);
      void this.imageByFrame(frame).then(drawFrameImage.bind(this, x));
    }
    context.strokeStyle = "#ddd";
    context.stroke();
    function drawFrameImage(x, image) {
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
    const timeMicroSeconds = Trace17.Helpers.Timing.milliToMicro(timeMilliSeconds);
    const frame = Trace17.Extras.FilmStrip.frameClosestToTimestamp(this.#filmStrip, timeMicroSeconds);
    if (frame === this.lastFrame) {
      return this.lastElement;
    }
    const imagePromise = frame ? this.imageByFrame(frame) : Promise.resolve(this.emptyImage);
    const image = await imagePromise;
    const element = document.createElement("div");
    element.classList.add("frame");
    if (image) {
      element.createChild("div", "thumbnail").appendChild(image);
    }
    this.lastFrame = frame;
    this.lastElement = element;
    return element;
  }
  reset() {
    this.lastFrame = null;
    this.lastElement = null;
    this.frameToImagePromise = /* @__PURE__ */ new Map();
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static Padding = 2;
};
var TimelineEventOverviewMemory = class extends TimelineEventOverview {
  heapSizeLabel;
  #parsedTrace;
  constructor(parsedTrace) {
    super("memory", i18nString15(UIStrings15.heap));
    this.heapSizeLabel = this.element.createChild("div", "memory-graph-label");
    this.#parsedTrace = parsedTrace;
  }
  resetHeapSizeLabels() {
    this.heapSizeLabel.textContent = "";
  }
  update(start, end) {
    this.resetCanvas();
    const ratio = window.devicePixelRatio;
    if (this.#parsedTrace.data.Memory.updateCountersByProcess.size === 0) {
      this.resetHeapSizeLabels();
      return;
    }
    const mainRendererIds = Array.from(this.#parsedTrace.data.Meta.topLevelRendererIds);
    const counterEventsPerTrack = mainRendererIds.map((pid) => this.#parsedTrace.data.Memory.updateCountersByProcess.get(pid) || []).filter((eventsPerRenderer) => eventsPerRenderer.length > 0);
    const lowerOffset = 3 * ratio;
    let maxUsedHeapSize = 0;
    let minUsedHeapSize = 1e11;
    const boundsMs = start && end ? {
      min: start,
      max: end,
      range: end - start
    } : Trace17.Helpers.Timing.traceWindowMilliSeconds(this.#parsedTrace.data.Meta.traceBounds);
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
      const { startTime } = Trace17.Helpers.Timing.eventTimingsMilliSeconds(event);
      const x = Math.round((startTime - minTime) * xFactor);
      const y2 = Math.round((counters.jsHeapSizeUsed - minUsedHeapSize) * yFactor);
      histogram[x] = Math.max(histogram[x] || 0, y2);
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
      if (typeof histogram[x] === "undefined") {
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
    ctx.fillStyle = "hsla(220, 90%, 70%, 0.2)";
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = "hsl(220, 90%, 70%)";
    ctx.stroke();
    this.heapSizeLabel.textContent = i18nString15(UIStrings15.sSDash, {
      PH1: i18n29.ByteUtilities.bytesToString(minUsedHeapSize),
      PH2: i18n29.ByteUtilities.bytesToString(maxUsedHeapSize)
    });
  }
};
var Quantizer = class {
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
};

// gen/front_end/panels/timeline/timelineHistoryManager.css.js
var timelineHistoryManager_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.drop-down {
  box-shadow: var(--drop-shadow);
  background: var(--sys-color-cdt-base-container);
}

.preview-item {
  border-bottom: 1px solid var(--sys-color-divider);

  &:first-child {
    border-top: 1px solid var(--sys-color-divider);
  }

  padding: 6px 10px;
  position: relative;

  .metadata {
    margin-left: 3px;
  }

  /* done this way because if we have a border it
   * awkwardly merges in a diagonal with the top and
   * bottom border */
  &.selected::before {
    content: " ";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 2px;
    background-color: var(--sys-color-primary);
  }
}

.preview-item canvas {
  width: 100%;
  height: 100%;
}

.text-details {
  flex-wrap: wrap;
  justify-content: space-between;
}

.text-details > span {
  padding-left: var(--sys-size-5);
  padding-right: var(--sys-size-5);
}

.text-details .name {
  font: var(--sys-typescale-body4-medium);
}

.text-details .metadata {
  color: var(--sys-color-token-subtle);
  font: var(--sys-typescale-body4-regular);
  text-align: right;
}

.screenshot-thumb {
  display: flex;
  border: 1px solid var(--sys-color-surface3);
  margin: 2px 4px;
}

.screenshot-thumb img {
  margin: auto;
  max-width: 100%;
  max-height: 100%;
}

.landing-page-item {
  font: var(--sys-typescale-body4-regular);
  display: flex;
  align-items: center;
  gap: var(--sys-size-5);
}

.back-arrow:hover {
  background: var(--sys-color-state-hover-on-subtle);
}

/*# sourceURL=${import.meta.resolve("./timelineHistoryManager.css")} */`;

// gen/front_end/panels/timeline/TimelineHistoryManager.js
var LANDING_PAGE_INDEX_DROPDOWN_CHOICE = Infinity;
var UIStrings16 = {
  /**
   * @description Screen reader label for the Timeline History dropdown button
   * @example {example.com #3} PH1
   * @example {Show recent timeline sessions} PH2
   */
  currentSessionSS: "Current session: {PH1}. {PH2}",
  /**
   * @description the title shown when the user is viewing the landing page which is showing live performance metrics that are updated automatically.
   */
  landingPageTitle: "Live metrics",
  /**
   * @description the title shown when the user is viewing the landing page which can be used to make a new performance recording.
   */
  nodeLandingPageTitle: "New recording",
  /**
   * @description Text in Timeline History Manager of the Performance panel
   * @example {example.com} PH1
   * @example {2} PH2
   */
  sD: "{PH1} #{PH2}",
  /**
   * @description Accessible label for the timeline session selection menu
   */
  selectTimelineSession: "Select timeline session",
  /**
   * @description Text label for a menu item indicating that a specific slowdown multiplier is applied.
   * @example {2} PH1
   */
  dSlowdown: "{PH1}\xD7 slowdown",
  /**
   * @description Tooltip text that appears when hovering over the Back arrow inside the 'Select Timeline Session' dropdown in the Performance pane.
   */
  backButtonTooltip: "View live metrics page"
};
var str_16 = i18n31.i18n.registerUIStrings("panels/timeline/TimelineHistoryManager.ts", UIStrings16);
var i18nString16 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var listFormatter = /* @__PURE__ */ function defineFormatter() {
  let intlListFormat;
  return {
    format(...args) {
      if (!intlListFormat) {
        const opts = { type: "unit", style: "short" };
        intlListFormat = new Intl.ListFormat(i18n31.DevToolsLocale.DevToolsLocale.instance().locale, opts);
      }
      return intlListFormat.format(...args);
    }
  };
}();
var TimelineHistoryManager = class _TimelineHistoryManager {
  recordings;
  action;
  nextNumberByDomain;
  #button;
  allOverviews;
  totalHeight;
  enabled;
  lastActiveTrace = null;
  #minimapComponent;
  #landingPageTitle;
  constructor(minimapComponent, isNode) {
    this.recordings = [];
    this.#minimapComponent = minimapComponent;
    this.action = UI7.ActionRegistry.ActionRegistry.instance().getAction("timeline.show-history");
    this.nextNumberByDomain = /* @__PURE__ */ new Map();
    this.#button = new ToolbarButton(this.action);
    this.#landingPageTitle = isNode ? i18nString16(UIStrings16.nodeLandingPageTitle) : i18nString16(UIStrings16.landingPageTitle);
    UI7.ARIAUtils.markAsMenuButton(this.#button.element);
    this.clear();
    this.allOverviews = [
      {
        constructor: (parsedTrace) => {
          const responsivenessOverviewFromMinimap = this.#minimapComponent?.getControls().find((control) => control instanceof TimelineEventOverviewResponsiveness);
          return responsivenessOverviewFromMinimap || new TimelineEventOverviewResponsiveness(parsedTrace);
        },
        height: 3
      },
      {
        constructor: (parsedTrace) => {
          const cpuOverviewFromMinimap = this.#minimapComponent?.getControls().find((control) => control instanceof TimelineEventOverviewCPUActivity);
          if (cpuOverviewFromMinimap) {
            return cpuOverviewFromMinimap;
          }
          return new TimelineEventOverviewCPUActivity(parsedTrace);
        },
        height: 20
      },
      {
        constructor: (parsedTrace) => {
          const networkOverviewFromMinimap = this.#minimapComponent?.getControls().find((control) => control instanceof TimelineEventOverviewNetwork);
          return networkOverviewFromMinimap || new TimelineEventOverviewNetwork(parsedTrace);
        },
        height: 8
      }
    ];
    this.totalHeight = this.allOverviews.reduce((acc, entry) => acc + entry.height, 0);
    this.enabled = true;
  }
  addRecording(newInput) {
    const filmStrip = newInput.filmStripForPreview;
    this.lastActiveTrace = newInput.data;
    this.recordings.unshift(newInput.data);
    this.#buildAndStorePreviewData(newInput.data.parsedTraceIndex, newInput.parsedTrace, filmStrip);
    const modelTitle = this.title(newInput.data);
    this.#button.setText(modelTitle);
    const buttonTitle = this.action.title();
    UI7.ARIAUtils.setLabel(this.#button.element, i18nString16(UIStrings16.currentSessionSS, { PH1: modelTitle, PH2: buttonTitle }));
    this.updateState();
    if (this.recordings.length <= maxRecordings) {
      return;
    }
    const modelUsedMoreTimeAgo = this.recordings.reduce((a, b) => lastUsedTime(a.parsedTraceIndex) < lastUsedTime(b.parsedTraceIndex) ? a : b);
    this.recordings.splice(this.recordings.indexOf(modelUsedMoreTimeAgo), 1);
    function lastUsedTime(index) {
      const data = _TimelineHistoryManager.dataForTraceIndex(index);
      if (!data) {
        throw new Error("Unable to find data for model");
      }
      return data.lastUsed;
    }
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    this.updateState();
  }
  button() {
    return this.#button;
  }
  clear() {
    this.recordings = [];
    this.lastActiveTrace = null;
    this.updateState();
    this.#button.setText(this.#landingPageTitle);
    this.nextNumberByDomain.clear();
  }
  #getActiveTraceIndexForListControl() {
    if (!this.lastActiveTrace) {
      return -1;
    }
    if (this.lastActiveTrace.type === "LANDING_PAGE") {
      return LANDING_PAGE_INDEX_DROPDOWN_CHOICE;
    }
    return this.lastActiveTrace.parsedTraceIndex;
  }
  async showHistoryDropDown() {
    if (this.recordings.length < 1 || !this.enabled) {
      return null;
    }
    const activeTraceIndex = await DropDown.show(this.recordings.map((recording) => recording.parsedTraceIndex), this.#getActiveTraceIndexForListControl(), this.#button.element, this.#landingPageTitle);
    if (activeTraceIndex === null) {
      return null;
    }
    if (activeTraceIndex === LANDING_PAGE_INDEX_DROPDOWN_CHOICE) {
      this.#setActiveTrace({ type: "LANDING_PAGE" });
      return { type: "LANDING_PAGE" };
    }
    const index = this.recordings.findIndex((recording) => recording.parsedTraceIndex === activeTraceIndex);
    if (index < 0) {
      console.assert(false, "selected recording not found");
      return null;
    }
    this.#setActiveTrace(this.recordings[index]);
    return this.recordings[index];
  }
  cancelIfShowing() {
    DropDown.cancelIfShowing();
  }
  /**
   * Navigate by 1 in either direction to the next trace.
   * Navigating in this way does not include the landing page; it will loop
   * over only the traces.
   */
  navigate(direction) {
    if (!this.enabled || this.lastActiveTrace === null) {
      return null;
    }
    if (!this.lastActiveTrace || this.lastActiveTrace.type === "LANDING_PAGE") {
      return null;
    }
    const index = this.recordings.findIndex((recording) => {
      return this.lastActiveTrace?.type === "TRACE_INDEX" && recording.type === "TRACE_INDEX" && recording.parsedTraceIndex === this.lastActiveTrace.parsedTraceIndex;
    });
    if (index < 0) {
      return null;
    }
    const newIndex = Platform9.NumberUtilities.clamp(index + direction, 0, this.recordings.length - 1);
    this.#setActiveTrace(this.recordings[newIndex]);
    return this.recordings[newIndex];
  }
  navigateToLandingPage() {
    this.#setActiveTrace({ type: "LANDING_PAGE" });
  }
  #setActiveTrace(item) {
    if (item.type === "TRACE_INDEX") {
      const data = _TimelineHistoryManager.dataForTraceIndex(item.parsedTraceIndex);
      if (!data) {
        throw new Error("Unable to find data for model");
      }
      data.lastUsed = Date.now();
    }
    this.lastActiveTrace = item;
    const modelTitle = this.title(item);
    const buttonTitle = this.action.title();
    this.#button.setText(modelTitle);
    UI7.ARIAUtils.setLabel(this.#button.element, i18nString16(UIStrings16.currentSessionSS, { PH1: modelTitle, PH2: buttonTitle }));
  }
  updateState() {
    this.action.setEnabled(this.recordings.length >= 1 && this.enabled);
  }
  static previewElement(parsedTraceIndex) {
    const data = _TimelineHistoryManager.dataForTraceIndex(parsedTraceIndex);
    if (!data) {
      throw new Error("Unable to find data for model");
    }
    return data.preview;
  }
  title(item) {
    if (item.type === "LANDING_PAGE") {
      return this.#landingPageTitle;
    }
    const data = _TimelineHistoryManager.dataForTraceIndex(item.parsedTraceIndex);
    if (!data) {
      throw new Error("Unable to find data for model");
    }
    return data.title;
  }
  #buildAndStorePreviewData(parsedTraceIndex, parsedTrace, filmStrip) {
    const parsedURL = Common7.ParsedURL.ParsedURL.fromString(parsedTrace.data.Meta.mainFrameURL);
    const domain = parsedURL ? parsedURL.host : "";
    const sequenceNumber = this.nextNumberByDomain.get(domain) || 1;
    const titleWithSequenceNumber = i18nString16(UIStrings16.sD, { PH1: domain, PH2: sequenceNumber });
    this.nextNumberByDomain.set(domain, sequenceNumber + 1);
    const preview = document.createElement("div");
    preview.classList.add("preview-item");
    preview.classList.add("vbox");
    preview.setAttribute("jslog", `${VisualLogging5.dropDown("timeline.history-item").track({ click: true })}`);
    preview.style.width = `${previewWidth}px`;
    const data = {
      preview,
      title: titleWithSequenceNumber,
      lastUsed: Date.now()
    };
    parsedTraceIndexToPerformancePreviewData.set(parsedTraceIndex, data);
    preview.appendChild(this.#buildTextDetails(parsedTrace.metadata, domain));
    const screenshotAndOverview = preview.createChild("div", "hbox");
    screenshotAndOverview.appendChild(this.#buildScreenshotThumbnail(filmStrip));
    screenshotAndOverview.appendChild(this.#buildOverview(parsedTrace));
    return data.preview;
  }
  #buildTextDetails(metadata, title) {
    const container = document.createElement("div");
    container.classList.add("text-details");
    container.classList.add("hbox");
    const nameSpan = container.createChild("span", "name");
    nameSpan.textContent = title;
    UI7.ARIAUtils.setLabel(nameSpan, title);
    if (metadata) {
      const parts = [
        metadata.emulatedDeviceTitle,
        metadata.cpuThrottling ? i18nString16(UIStrings16.dSlowdown, { PH1: metadata.cpuThrottling }) : void 0,
        metadata.networkThrottling
      ].filter(Boolean);
      container.createChild("span", "metadata").textContent = listFormatter.format(parts);
    }
    return container;
  }
  #buildScreenshotThumbnail(filmStrip) {
    const container = document.createElement("div");
    container.classList.add("screenshot-thumb");
    const thumbnailAspectRatio = 3 / 2;
    container.style.width = this.totalHeight * thumbnailAspectRatio + "px";
    container.style.height = this.totalHeight + "px";
    if (!filmStrip) {
      return container;
    }
    const lastFrame = filmStrip.frames.at(-1);
    if (!lastFrame) {
      return container;
    }
    const uri = Trace18.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(lastFrame.screenshotEvent);
    void UI7.UIUtils.loadImage(uri).then((img) => {
      if (img) {
        container.appendChild(img);
      }
    });
    return container;
  }
  #buildOverview(parsedTrace) {
    const container = document.createElement("div");
    const dPR = window.devicePixelRatio;
    container.style.width = previewWidth + "px";
    container.style.height = this.totalHeight + "px";
    const canvas = container.createChild("canvas");
    canvas.width = dPR * previewWidth;
    canvas.height = dPR * this.totalHeight;
    const ctx = canvas.getContext("2d");
    let yOffset = 0;
    for (const overview of this.allOverviews) {
      const timelineOverviewComponent = overview.constructor(parsedTrace);
      timelineOverviewComponent.update();
      if (ctx) {
        ctx.drawImage(timelineOverviewComponent.context().canvas, 0, yOffset, dPR * previewWidth, overview.height * dPR);
      }
      yOffset += overview.height * dPR;
    }
    return container;
  }
  static dataForTraceIndex(index) {
    return parsedTraceIndexToPerformancePreviewData.get(index) || null;
  }
};
var maxRecordings = 5;
var previewWidth = 500;
var parsedTraceIndexToPerformancePreviewData = /* @__PURE__ */ new Map();
var DropDown = class _DropDown {
  glassPane;
  listControl;
  focusRestorer;
  selectionDone;
  #landingPageTitle;
  contentElement;
  constructor(availableparsedTraceIndexes, landingPageTitle) {
    this.#landingPageTitle = landingPageTitle;
    this.glassPane = new UI7.GlassPane.GlassPane();
    this.glassPane.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    this.glassPane.setOutsideClickCallback(() => this.close(null));
    this.glassPane.setPointerEventsBehavior(
      "BlockedByGlassPane"
      /* UI.GlassPane.PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */
    );
    this.glassPane.setAnchorBehavior(
      "PreferBottom"
      /* UI.GlassPane.AnchorBehavior.PREFER_BOTTOM */
    );
    this.glassPane.element.addEventListener("blur", () => this.close(null));
    const shadowRoot = UI7.UIUtils.createShadowRootWithCoreStyles(this.glassPane.contentElement, { cssFile: timelineHistoryManager_css_default });
    this.contentElement = shadowRoot.createChild("div", "drop-down");
    const listModel = new UI7.ListModel.ListModel();
    this.listControl = new UI7.ListControl.ListControl(listModel, this, UI7.ListControl.ListMode.NonViewport);
    this.listControl.element.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    listModel.replaceAll(availableparsedTraceIndexes);
    UI7.ARIAUtils.markAsMenu(this.listControl.element);
    UI7.ARIAUtils.setLabel(this.listControl.element, i18nString16(UIStrings16.selectTimelineSession));
    this.contentElement.appendChild(this.listControl.element);
    this.contentElement.addEventListener("keydown", this.onKeyDown.bind(this), false);
    this.contentElement.addEventListener("click", this.onClick.bind(this), false);
    this.focusRestorer = new UI7.UIUtils.ElementFocusRestorer(this.listControl.element);
    this.selectionDone = null;
  }
  static show(availableparsedTraceIndexes, activeparsedTraceIndex, anchor, landingPageTitle = i18nString16(UIStrings16.landingPageTitle)) {
    if (_DropDown.instance) {
      return Promise.resolve(null);
    }
    const availableDropdownChoices = [...availableparsedTraceIndexes];
    availableDropdownChoices.unshift(LANDING_PAGE_INDEX_DROPDOWN_CHOICE);
    const instance2 = new _DropDown(availableDropdownChoices, landingPageTitle);
    return instance2.show(anchor, activeparsedTraceIndex);
  }
  static cancelIfShowing() {
    if (!_DropDown.instance) {
      return;
    }
    _DropDown.instance.close(null);
  }
  show(anchor, activeparsedTraceIndex) {
    _DropDown.instance = this;
    this.glassPane.setContentAnchorBox(anchor.boxInWindow());
    this.glassPane.show(this.glassPane.contentElement.ownerDocument);
    this.listControl.element.focus();
    this.listControl.selectItem(activeparsedTraceIndex);
    return new Promise((fulfill) => {
      this.selectionDone = fulfill;
    });
  }
  onMouseMove(event) {
    const node = event.target.enclosingNodeOrSelfWithClass("preview-item");
    const listItem = node && this.listControl.itemForNode(node);
    if (listItem === null) {
      return;
    }
    this.listControl.selectItem(listItem);
  }
  onClick(event) {
    if (!event.target.enclosingNodeOrSelfWithClass("preview-item")) {
      return;
    }
    this.close(this.listControl.selectedItem());
  }
  onKeyDown(event) {
    switch (event.key) {
      case "Tab":
      case "Escape":
        this.close(null);
        break;
      case "Enter":
        this.close(this.listControl.selectedItem());
        break;
      default:
        return;
    }
    event.consume(true);
  }
  close(traceIndex) {
    if (this.selectionDone) {
      this.selectionDone(traceIndex);
    }
    this.focusRestorer.restore();
    this.glassPane.hide();
    _DropDown.instance = null;
  }
  createElementForItem(parsedTraceIndex) {
    if (parsedTraceIndex === LANDING_PAGE_INDEX_DROPDOWN_CHOICE) {
      return this.#createLandingPageListItem();
    }
    const element = TimelineHistoryManager.previewElement(parsedTraceIndex);
    UI7.ARIAUtils.markAsMenuItem(element);
    element.classList.remove("selected");
    return element;
  }
  #createLandingPageListItem() {
    const div = document.createElement("div");
    UI7.ARIAUtils.markAsMenuItem(div);
    div.classList.remove("selected");
    div.classList.add("preview-item");
    div.classList.add("landing-page-item");
    div.style.width = `${previewWidth}px`;
    const icon = createIcon("arrow-back");
    icon.title = i18nString16(UIStrings16.backButtonTooltip);
    icon.classList.add("back-arrow");
    div.appendChild(icon);
    const text = document.createElement("span");
    text.innerText = this.#landingPageTitle;
    div.appendChild(text);
    return div;
  }
  heightForItem(_parsedTraceIndex) {
    console.assert(false, "Should not be called");
    return 0;
  }
  isItemSelectable(_parsedTraceIndex) {
    return true;
  }
  selectedItemChanged(_from, _to, fromElement, toElement) {
    if (fromElement) {
      fromElement.classList.remove("selected");
    }
    if (toElement) {
      toElement.classList.add("selected");
    }
  }
  updateSelectedItemARIA(_fromElement, _toElement) {
    return false;
  }
  static instance = null;
};
var ToolbarButton = class extends UI7.Toolbar.ToolbarItem {
  contentElement;
  constructor(action2) {
    const element = document.createElement("button");
    element.classList.add("history-dropdown-button");
    element.setAttribute("jslog", `${VisualLogging5.dropDown("history")}`);
    super(element);
    this.contentElement = this.element.createChild("span", "content");
    this.element.addEventListener("click", () => void action2.execute(), false);
    this.setEnabled(action2.enabled());
    action2.addEventListener("Enabled", (event) => this.setEnabled(event.data));
    this.setTitle(action2.title());
  }
  setText(text) {
    this.contentElement.textContent = text;
  }
};

// gen/front_end/panels/timeline/TimelineLoader.js
var TimelineLoader_exports = {};
__export(TimelineLoader_exports, {
  TimelineLoader: () => TimelineLoader
});
import * as Common8 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n33 from "./../../core/i18n/i18n.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
import * as Trace19 from "./../../models/trace/trace.js";
var UIStrings17 = {
  /**
   * @description Text in Timeline Loader of the Performance panel
   * @example {Unknown JSON format} PH1
   */
  malformedTimelineDataS: "Malformed timeline data: {PH1}"
};
var str_17 = i18n33.i18n.registerUIStrings("panels/timeline/TimelineLoader.ts", UIStrings17);
var i18nString17 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var TimelineLoader = class _TimelineLoader {
  client;
  canceledCallback;
  filter;
  #traceIsCPUProfile;
  #collectedEvents = [];
  #metadata;
  #traceFinalizedCallbackForTest;
  #traceFinalizedPromiseForTest;
  constructor(client) {
    this.client = client;
    this.canceledCallback = null;
    this.filter = null;
    this.#traceIsCPUProfile = false;
    this.#metadata = null;
    this.#traceFinalizedPromiseForTest = new Promise((resolve) => {
      this.#traceFinalizedCallbackForTest = resolve;
    });
  }
  static loadFromParsedJsonFile(contents, client) {
    const loader = new _TimelineLoader(client);
    window.setTimeout(async () => {
      client.loadingStarted();
      try {
        loader.#processParsedFile(contents);
        await loader.close();
      } catch (e) {
        await loader.close();
        const message = e instanceof Error ? e.message : "";
        return loader.reportErrorAndCancelLoading(i18nString17(UIStrings17.malformedTimelineDataS, { PH1: message }));
      }
    });
    return loader;
  }
  static loadFromEvents(events, client) {
    const loader = new _TimelineLoader(client);
    window.setTimeout(async () => {
      void loader.addEvents(events, null);
    });
    return loader;
  }
  static loadFromTraceFile(traceFile, client) {
    const loader = new _TimelineLoader(client);
    window.setTimeout(async () => {
      void loader.addEvents(traceFile.traceEvents, traceFile.metadata);
    });
    return loader;
  }
  static loadFromCpuProfile(profile, client) {
    const loader = new _TimelineLoader(client);
    loader.#traceIsCPUProfile = true;
    try {
      const contents = Trace19.Helpers.SamplesIntegrator.SamplesIntegrator.createFakeTraceFromCpuProfile(profile, Trace19.Types.Events.ThreadID(1));
      window.setTimeout(async () => {
        void loader.addEvents(contents.traceEvents, null);
      });
    } catch (e) {
      console.error(e.stack);
    }
    return loader;
  }
  static async loadFromURL(url, client) {
    const loader = new _TimelineLoader(client);
    const stream = new Common8.StringOutputStream.StringOutputStream();
    client.loadingStarted();
    const allowRemoteFilePaths = Common8.Settings.Settings.instance().moduleSetting("network.enable-remote-file-loading").get();
    Host.ResourceLoader.loadAsStream(url, null, stream, finishedCallback, allowRemoteFilePaths);
    async function finishedCallback(success, _headers, errorDescription) {
      if (!success) {
        return loader.reportErrorAndCancelLoading(errorDescription.message);
      }
      try {
        const txt = stream.data();
        const trace = JSON.parse(txt);
        loader.#processParsedFile(trace);
        await loader.close();
      } catch (e) {
        await loader.close();
        const message = e instanceof Error ? e.message : "";
        return loader.reportErrorAndCancelLoading(i18nString17(UIStrings17.malformedTimelineDataS, { PH1: message }));
      }
    }
    return loader;
  }
  #processParsedFile(trace) {
    if ("traceEvents" in trace || Array.isArray(trace)) {
      const items = Array.isArray(trace) ? trace : trace.traceEvents;
      this.#collectEvents(items);
    } else if (trace.nodes) {
      this.#parseCPUProfileFormatFromFile(trace);
      this.#traceIsCPUProfile = true;
    } else {
      this.reportErrorAndCancelLoading(i18nString17(UIStrings17.malformedTimelineDataS));
      return;
    }
    if ("metadata" in trace) {
      this.#metadata = trace.metadata;
      if (this.#metadata.cpuThrottling === 1) {
        this.#metadata.cpuThrottling = void 0;
      }
      const noThrottlingString = typeof SDK6.NetworkManager.NoThrottlingConditions.title === "string" ? SDK6.NetworkManager.NoThrottlingConditions.title : SDK6.NetworkManager.NoThrottlingConditions.title();
      if (this.#metadata.networkThrottling === "No throttling" || this.#metadata.networkThrottling === noThrottlingString) {
        this.#metadata.networkThrottling = void 0;
      }
    }
  }
  async addEvents(events, metadata) {
    this.#metadata = metadata;
    this.client?.loadingStarted();
    const eventsPerChunk = 15e4;
    for (let i = 0; i < events.length; i += eventsPerChunk) {
      const chunk = events.slice(i, i + eventsPerChunk);
      this.#collectEvents(chunk);
      this.client?.loadingProgress((i + chunk.length) / events.length);
      await new Promise((r) => window.setTimeout(r, 0));
    }
    void this.close();
  }
  async cancel() {
    if (this.client) {
      await this.client.loadingComplete(
        /* collectedEvents */
        [],
        /* exclusiveFilter= */
        null,
        /* metadata= */
        null
      );
      this.client = null;
    }
    if (this.canceledCallback) {
      this.canceledCallback();
    }
  }
  reportErrorAndCancelLoading(message) {
    if (message) {
      Common8.Console.Console.instance().error(message);
    }
    void this.cancel();
  }
  async close() {
    if (!this.client) {
      return;
    }
    this.client.processingStarted();
    await this.finalizeTrace();
  }
  async finalizeTrace() {
    if (!this.#metadata && this.#traceIsCPUProfile) {
      this.#metadata = forCPUProfile();
    }
    await this.client.loadingComplete(this.#collectedEvents, this.filter, this.#metadata);
    this.#traceFinalizedCallbackForTest?.();
  }
  traceFinalizedForTest() {
    return this.#traceFinalizedPromiseForTest;
  }
  #parseCPUProfileFormatFromFile(parsedTrace) {
    const traceFile = Trace19.Helpers.SamplesIntegrator.SamplesIntegrator.createFakeTraceFromCpuProfile(parsedTrace, Trace19.Types.Events.ThreadID(1));
    this.#collectEvents(traceFile.traceEvents);
  }
  #collectEvents(events) {
    this.#collectedEvents = this.#collectedEvents.concat(events);
  }
};

// gen/front_end/panels/timeline/TimelineMiniMap.js
var TimelineMiniMap_exports = {};
__export(TimelineMiniMap_exports, {
  TimelineMiniMap: () => TimelineMiniMap
});
import * as Common9 from "./../../core/common/common.js";
import * as Trace20 from "./../../models/trace/trace.js";
import * as TraceBounds7 from "./../../services/trace_bounds/trace_bounds.js";
import * as PerfUI11 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI8 from "./../../ui/legacy/legacy.js";
import * as TimelineComponents2 from "./components/components.js";

// gen/front_end/panels/timeline/timelineMiniMap.css.js
var timelineMiniMap_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.timeline-minimap {
  position: relative;

  &.no-trace-active {
    display: none;
  }
}


.timeline-minimap .overview-strip {
  margin-top: 2px;
  justify-content: center;
}

.timeline-minimap .overview-strip .timeline-overview-strip-title {
  color: var(--sys-color-token-subtle);
  font-size: 10px;
  font-weight: bold;
  z-index: 100;
  background-color: var(--sys-color-cdt-base-container);
  padding: 0 4px;
  position: absolute;
  top: -2px;
  right: 0;
}

.timeline-minimap #timeline-overview-cpu-activity {
  flex-basis: 20px;
}

.timeline-minimap #timeline-overview-network {
  flex-basis: 8px;
}

.timeline-minimap #timeline-overview-filmstrip {
  flex-basis: 30px;
}

.timeline-minimap #timeline-overview-memory {
  flex-basis: 20px;
}

.timeline-minimap #timeline-overview-network::before,
.timeline-minimap #timeline-overview-cpu-activity::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-bottom: 1px solid var(--divider-line);
  z-index: -200;
}

.timeline-minimap .overview-strip .background {
  z-index: -10;
}

.timeline-minimap #timeline-overview-responsiveness {
  flex-basis: 5px;
  margin-top: 0 !important; /* stylelint-disable-line declaration-no-important */
}

.timeline-minimap #timeline-overview-input {
  flex-basis: 6px;
}

.timeline-minimap #timeline-overview-pane {
  flex: auto;
  position: relative;
  overflow: hidden;
}

.timeline-minimap #timeline-overview-container {
  display: flex;
  flex-direction: column;
  flex: none;
  position: relative;
  overflow: hidden;
}

.timeline-minimap #timeline-overview-container canvas {
  width: 100%;
  height: 100%;
}

.timeline-minimap-dim-highlight-svg {
  width: 100%;
  position: absolute;
  height: 100%;
}

.timeline-minimap .memory-graph-label {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 9px;
  color: var(--sys-color-token-subtle);
  white-space: nowrap;
  padding: 0 4px;
  background-color: var(--sys-color-cdt-base-container);
}

/*# sourceURL=${import.meta.resolve("./timelineMiniMap.css")} */`;

// gen/front_end/panels/timeline/TimelineMiniMap.js
var TimelineMiniMap = class extends Common9.ObjectWrapper.eventMixin(UI8.Widget.VBox) {
  #overviewComponent = new PerfUI11.TimelineOverviewPane.TimelineOverviewPane("timeline");
  #controls = [];
  breadcrumbs = null;
  #breadcrumbsUI;
  #data = null;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  constructor() {
    super();
    this.registerRequiredCSS(timelineMiniMap_css_default);
    this.element.classList.add("timeline-minimap", "no-trace-active");
    this.#breadcrumbsUI = new TimelineComponents2.BreadcrumbsUI.BreadcrumbsUI();
    this.element.prepend(this.#breadcrumbsUI);
    this.#overviewComponent.show(this.element);
    this.#overviewComponent.addEventListener("OverviewPaneWindowChanged", (event) => {
      this.#onOverviewPanelWindowChanged(event);
    });
    this.#overviewComponent.addEventListener("OverviewPaneBreadcrumbAdded", (event) => {
      this.addBreadcrumb(event.data);
    });
    this.#overviewComponent.addEventListener("OverviewPaneMouseMove", (event) => {
      this.dispatchEventToListeners("OverviewPaneMouseMove", event.data);
    });
    this.#overviewComponent.addEventListener("OverviewPaneMouseLeave", () => {
      this.dispatchEventToListeners(
        "OverviewPaneMouseLeave"
        /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_LEAVE */
      );
    });
    this.#breadcrumbsUI.addEventListener(TimelineComponents2.BreadcrumbsUI.BreadcrumbActivatedEvent.eventName, (event) => {
      const { breadcrumb, childBreadcrumbsRemoved } = event;
      this.#activateBreadcrumb(breadcrumb, { removeChildBreadcrumbs: Boolean(childBreadcrumbsRemoved), updateVisibleWindow: true });
    });
    this.#overviewComponent.enableCreateBreadcrumbsButton();
    TraceBounds7.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
    const state = TraceBounds7.TraceBounds.BoundsManager.instance().state();
    if (state) {
      const { timelineTraceWindow, minimapTraceBounds } = state.milli;
      this.#overviewComponent.setWindowTimes(timelineTraceWindow.min, timelineTraceWindow.max);
      this.#overviewComponent.setBounds(minimapTraceBounds.min, minimapTraceBounds.max);
    }
  }
  #onOverviewPanelWindowChanged(event) {
    const parsedTrace = this.#data?.parsedTrace;
    if (!parsedTrace) {
      return;
    }
    const traceBoundsState = TraceBounds7.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const left = event.data.startTime > 0 ? event.data.startTime : traceBoundsState.milli.entireTraceBounds.min;
    const right = Number.isFinite(event.data.endTime) ? event.data.endTime : traceBoundsState.milli.entireTraceBounds.max;
    TraceBounds7.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(Trace20.Helpers.Timing.traceWindowFromMilliSeconds(Trace20.Types.Timing.Milli(left), Trace20.Types.Timing.Milli(right)), {
      shouldAnimate: true
    });
  }
  #onTraceBoundsChange(event) {
    if (event.updateType === "RESET" || event.updateType === "VISIBLE_WINDOW") {
      this.#overviewComponent.setWindowTimes(event.state.milli.timelineTraceWindow.min, event.state.milli.timelineTraceWindow.max);
      const newWindowFitsBounds = Trace20.Helpers.Timing.windowFitsInsideBounds({
        window: event.state.micro.timelineTraceWindow,
        bounds: event.state.micro.minimapTraceBounds
      });
      if (!newWindowFitsBounds) {
        this.#updateMiniMapBoundsToFitNewWindow(event.state.micro.timelineTraceWindow);
      }
    }
    if (event.updateType === "RESET" || event.updateType === "MINIMAP_BOUNDS") {
      this.#overviewComponent.setBounds(event.state.milli.minimapTraceBounds.min, event.state.milli.minimapTraceBounds.max);
    }
  }
  #updateMiniMapBoundsToFitNewWindow(newWindow) {
    if (!this.breadcrumbs) {
      return;
    }
    let currentBreadcrumb = this.breadcrumbs.initialBreadcrumb;
    let lastBreadcrumbThatFits = this.breadcrumbs.initialBreadcrumb;
    while (currentBreadcrumb) {
      const fits = Trace20.Helpers.Timing.windowFitsInsideBounds({
        window: newWindow,
        bounds: currentBreadcrumb.window
      });
      if (fits) {
        lastBreadcrumbThatFits = currentBreadcrumb;
      } else {
        break;
      }
      currentBreadcrumb = currentBreadcrumb.child;
    }
    this.#activateBreadcrumb(lastBreadcrumbThatFits, { removeChildBreadcrumbs: false, updateVisibleWindow: false });
  }
  addBreadcrumb({ startTime, endTime }) {
    if (!this.breadcrumbs) {
      console.warn("ModificationsManager has not been created, therefore Breadcrumbs can not be added");
      return;
    }
    const traceBoundsState = TraceBounds7.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const bounds = traceBoundsState.milli.minimapTraceBounds;
    const breadcrumbTimes = {
      startTime: Trace20.Types.Timing.Milli(Math.max(startTime, bounds.min)),
      endTime: Trace20.Types.Timing.Milli(Math.min(endTime, bounds.max))
    };
    const newVisibleTraceWindow = Trace20.Helpers.Timing.traceWindowFromMilliSeconds(breadcrumbTimes.startTime, breadcrumbTimes.endTime);
    const addedBreadcrumb = this.breadcrumbs.add(newVisibleTraceWindow);
    this.#breadcrumbsUI.data = {
      initialBreadcrumb: this.breadcrumbs.initialBreadcrumb,
      activeBreadcrumb: addedBreadcrumb
    };
  }
  highlightBounds(bounds, withBracket = false) {
    this.#overviewComponent.highlightBounds(bounds, withBracket);
  }
  clearBoundsHighlight() {
    this.#overviewComponent.clearBoundsHighlight();
  }
  /**
   * Activates a given breadcrumb.
   * @param options.removeChildBreadcrumbs if true, any child breadcrumbs will be removed.
   * @param options.updateVisibleWindow if true, the visible window will be updated to match the bounds of the breadcrumb
   */
  #activateBreadcrumb(breadcrumb, options) {
    if (!this.breadcrumbs) {
      return;
    }
    this.breadcrumbs.setActiveBreadcrumb(breadcrumb, options);
    this.#breadcrumbsUI.data = {
      initialBreadcrumb: this.breadcrumbs.initialBreadcrumb,
      activeBreadcrumb: breadcrumb
    };
  }
  reset() {
    this.#data = null;
    this.#overviewComponent.reset();
  }
  #setMarkers(parsedTrace) {
    const markers = /* @__PURE__ */ new Map();
    const { Meta } = parsedTrace.data;
    const navStartEvents = Meta.mainFrameNavigations;
    const minTimeInMilliseconds = Trace20.Helpers.Timing.microToMilli(Meta.traceBounds.min);
    for (const event of navStartEvents) {
      const { startTime } = Trace20.Helpers.Timing.eventTimingsMilliSeconds(event);
      markers.set(startTime, TimelineUIUtils.createEventDivider(event, minTimeInMilliseconds));
    }
    this.#overviewComponent.setMarkers(markers);
  }
  #setNavigationStartEvents(parsedTrace) {
    this.#overviewComponent.setNavStartTimes(parsedTrace.data.Meta.mainFrameNavigations);
  }
  getControls() {
    return this.#controls;
  }
  setData(data) {
    this.element.classList.toggle("no-trace-active", data === null);
    if (data === null) {
      this.#data = null;
      this.#controls = [];
      return;
    }
    if (this.#data?.parsedTrace === data.parsedTrace) {
      return;
    }
    this.#data = data;
    this.#controls = [];
    this.#setMarkers(data.parsedTrace);
    this.#setNavigationStartEvents(data.parsedTrace);
    this.#controls.push(new TimelineEventOverviewResponsiveness(data.parsedTrace));
    this.#controls.push(new TimelineEventOverviewCPUActivity(data.parsedTrace));
    this.#controls.push(new TimelineEventOverviewNetwork(data.parsedTrace));
    if (data.settings.showScreenshots) {
      const filmStrip = Trace20.Extras.FilmStrip.fromHandlerData(data.parsedTrace.data);
      if (filmStrip.frames.length) {
        this.#controls.push(new TimelineFilmStripOverview(filmStrip));
      }
    }
    if (data.settings.showMemory) {
      this.#controls.push(new TimelineEventOverviewMemory(data.parsedTrace));
    }
    this.#overviewComponent.setOverviewControls(this.#controls);
    this.#overviewComponent.showingScreenshots = data.settings.showScreenshots;
    this.#setInitialBreadcrumb();
  }
  #setInitialBreadcrumb() {
    this.breadcrumbs = ModificationsManager.activeManager()?.getTimelineBreadcrumbs() ?? null;
    if (!this.breadcrumbs) {
      return;
    }
    let lastBreadcrumb = this.breadcrumbs.initialBreadcrumb;
    while (lastBreadcrumb.child !== null) {
      lastBreadcrumb = lastBreadcrumb.child;
    }
    this.#breadcrumbsUI.data = {
      initialBreadcrumb: this.breadcrumbs.initialBreadcrumb,
      activeBreadcrumb: lastBreadcrumb
    };
  }
};

// gen/front_end/panels/timeline/timelinePanel.css.js
var timelinePanel_css_default = `/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.timeline-toolbar-container {
  display: flex;
  align-items: flex-start;
  flex: none;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);

  & > :first-child {
    flex: 1 1 auto;
  }
}

.timeline-settings-pane {
  display: grid;
  grid-template-columns: 50% 50%;
  padding-top: var(--sys-size-3);
  row-gap: var(--sys-size-3);
  flex: none;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);

  & > div {
    margin-left: 5px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
}

#timeline-overview-panel {
  flex: none;
  position: relative;
  border-bottom: 1px solid var(--sys-color-divider);
}

#timeline-overview-grid {
  background-color: var(--sys-color-cdt-base-container);
}

#timeline-overview-grid .timeline-grid-header {
  height: 12px;
}

#timeline-overview-grid .resources-dividers-label-bar {
  pointer-events: auto;
  height: 12px;
}

#timeline-overview-grid .resources-divider-label {
  top: 1px;
}

.timeline-details-split {
  flex: auto;
}

.timeline.panel .status-pane-container {
  z-index: 1000;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.timeline.panel .status-pane-container.tinted {
  background-color: var(--sys-color-cdt-base-container);
  pointer-events: auto;
}

.timeline-landing-page.legacy > div > p {
  flex: none;
  white-space: pre-line;
  line-height: 18px;
}

.popover ul {
  margin: 0;
  padding: 0;
  list-style-type: none;
}

#memory-graphs-canvas-container {
  overflow: hidden;
  flex: auto;
  position: relative;

  .no-events-found {
    position: absolute;
    font: var(--sys-typescale-body4-regular);
    left: var(--sys-size-5);
    bottom: var(--sys-size-5);

    p {
      margin: 0;
    }
  }
}

#memory-counters-graph {
  flex: auto;
}

#memory-graphs-canvas-container .memory-counter-marker {
  position: absolute;
  border-radius: 3px;
  width: 5px;
  height: 5px;
  margin-left: -3px;
  margin-top: -2px;
}

#memory-graphs-container .timeline-memory-header {
  flex: 0 0 26px;
  background-color: var(--sys-color-surface2);
  border-bottom: 1px solid var(--sys-color-divider);
  justify-content: space-between;
}

#memory-graphs-container .timeline-memory-header::after {
  content: "";
  /* stylelint-disable-next-line custom-property-pattern */
  background-image: var(--image-file-toolbarResizerVertical);
  background-repeat: no-repeat;
  background-position: right center, center;
  flex: 20px 0 0;
  margin: 0 4px;
}

.timeline-memory-toolbar {
  flex-shrink: 1;
}

.memory-counter-value {
  margin: 8px;
}

#counter-values-bar {
  flex: 0 0 20px;
  border-top: solid 1px var(--sys-color-divider);
  width: 100%;
  overflow: hidden;
  line-height: 18px;
}

.timeline-flamechart {
  overflow: hidden;
}

.brick-game {
  background-color: var(--sys-color-neutral-container);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999; /* A high value to ensure it's on top */
}

.game-close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  position: absolute;
  right: 15px;
  top: 15px;
  border-radius: 50%;
  cursor: pointer;
}

.scorePanel {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  white-space: pre-line;
  padding: 15px;
  position: absolute;
  left: 15px;
  bottom: 15px;
  border: double 7px transparent;
  border-radius: 20px;
  background-origin: border-box;
  background-clip: content-box, border-box;
  font-weight: 200;
}

.confetti-100 {
  display: block;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.confetti-100 > .confetti-100-particle {
  opacity: 0%;
  position: fixed;
  animation: confetti-100-animation 1s none ease-out;
  font-size: 30px;
}

@keyframes confetti-100-animation {
  0% {
    opacity: 100%;
    transform: translateY(0%) translateY(0%) rotate(0deg);
  }

  100% {
    opacity: 0%;
    /* stylelint-disable-next-line custom-property-pattern */
    transform: translateY(var(--to-Y)) translateX(var(--to-X)) rotate(var(--rotation));
  }
}

@media (prefers-reduced-motion) {
  .confetti-100 > .confetti-100-particle {
    animation-name: dissolve;
  }
}

.timeline-layers-view-properties table {
  width: 100%;
  border-collapse: collapse;
}

.timeline-layers-view-properties td {
  border: 1px solid var(--sys-color-divider);
  line-height: 22px;
}

.timeline-filmstrip-preview > img {
  max-width: 500px;
  max-height: 300px;
  cursor: pointer;
  border: 1px solid var(--sys-color-divider);
}

.timeline-details .filter-input-field {
  width: 120px;
}

.timeline-stack-view-header {
  height: 27px;
  background-color: var(--sys-color-cdt-base-container);
  padding: 6px 10px;
  color: var(--sys-color-on-surface);
  white-space: nowrap;
  border-bottom: 1px solid var(--sys-color-divider);
}

.timeline-landing-page {
  position: absolute;
  background-color: var(--sys-color-cdt-base-container);
}

.timeline-landing-page.legacy {
  justify-content: center;
  align-items: center;
  overflow: auto;
  font-size: 13px;
  color: var(--sys-color-on-surface-subtle);
}

.timeline-landing-page.legacy > div {
  max-width: 450px;
  margin: 10px;
}

.timeline-paint-profiler-log-split > div:last-child {
  background-color: var(--color-background-elevation-1);
  z-index: 0;
}

.timeline-layers-view > div:last-child,
.timeline-layers-view-properties > div:last-child {
  background-color: var(--color-background-elevation-1);
}

.timeline.panel .status-pane-container > div {
  pointer-events: auto;
}

.timeline-tree-view .data-grid .name-container div {
  flex: none;
}


devtools-performance-third-party-tree-view {
  .background-bar-container {
    /* Dont need the bars in 3p table */
    display: none;
  }

   .timeline-tree-view devtools-toolbar {
    border: 0;
   }

  .timeline-tree-view .data-grid .odd {
    background: none;
  }

  .timeline-tree-view .data-grid {
    border-width: 0 !important; /* stylelint-disable-line declaration-no-important */

    th {
      background-color: var(--sys-color-cdt-base-container);
      font-weight: var(--ref-typeface-weight-medium);
      /* Center to give some gap against sorting triangle */
      text-align: center;

      &.site-column {
        text-align: left;
      }
    }

    tr .numeric-column,
    tr .site-column {
      border-left: none;
      border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
      /* Don't let devtools-button size mess with things */
      contain: strict;
      padding: 0;
      line-height: 21px;
    }

    .bottom-filler-td,
    th.sortable {
      border: none;
    }

    tr {
      height: 22px;
    }

    devtools-button {
      display: inline-flex;
      visibility: hidden;
      margin: 0 8px 0 4px;
      vertical-align: top;
    }

    tr.revealed:hover,
    tr.selected {
     devtools-button {
        visibility: visible;
      }
    }

    /* Default data-grid has this element on the edge of the rows,
      we don't need them for the 3P table. So for now set display to none. */
    .corner,
    &.data-grid-fits-viewport .corner {
      display: none;
    }

    .data-grid-resizer:hover {
        background: linear-gradient(to right, transparent, transparent 2px, var(--sys-color-divider) 2px, var(--sys-color-divider) 3px, transparent 3px) no-repeat 0 0 / 100% 100%;
    }
  }

  .widget.vbox.timeline-tree-view {
    /* See column width comments in populateColumns() */
    max-width: min(100%, 550px);
    min-width: 350px; /* Lower than this, there's not enough room for the entity name */
    padding: 0 0 0 var(--sys-size-6);
    border-left: var(--sys-size-1) solid var(--sys-color-divider);
  }

  /* While timeline treeview name-container uses flexbox to layout, it's overkill for this table's purposes.
     By not using it, we can benefit from text-overflow:ellipsis applying correctly to names and entity-badges */
 .timeline-tree-view .data-grid .name-container {
    display: block;
    padding-left: 2px;

    .activity-name {
      display: inline;
    }

    .activity-icon-container {
      display: none;
    }

    .entity-badge {
      margin-left: var(--sys-size-4);
      font-weight: var(--ref-typeface-weight-medium);
      padding: 0 var(--sys-size-2);
      background-color: var(--sys-color-tonal-container);
      border-radius: var(--sys-shape-corner-extra-small);
      height: 16px;
      line-height: 16px;
      font-size: var(--sys-typescale-body5-size);
      display: inline-block;
    }
 }
}

devtools-toolbar {
  .history-dropdown-button {
    width: var(--sys-size-23);
    height: var(--sys-size-9);
    border-radius: var(--sys-shape-corner-extra-small);
    text-align: left;
    display: flex;
    padding-right: var(--sys-size-5);

    &:hover {
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &:active {
      background-color: var(--sys-color-state-ripple-neutral-on-subtle);
    }

    &:hover:active {
      background:
        linear-gradient(var(--sys-color-state-hover-on-subtle), var(--sys-color-state-hover-on-subtle)),
        linear-gradient(var(--sys-color-state-ripple-neutral-on-subtle), var(--sys-color-state-ripple-neutral-on-subtle));
    }

    &:focus-visible {
      outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    }

    &[disabled] {
      pointer-events: none;
      color: var(--sys-color-state-disabled);
      background-color: var(--sys-color-state-disabled-container);

      .content::after {
        background-color: var(--sys-color-state-disabled);
      }
    }

    & > .content {
      margin-left: 5px;
      padding-right: 5px;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1 1;
      min-width: 35px;

      &::after {
        float: right;
        user-select: none;
        mask-image: var(--image-file-triangle-down);
        width: 14px;
        height: 14px;
        content: "";
        position: absolute;
        background-color: var(--icon-default);
        right: var(--sys-size-3);
        top: var(--sys-size-3);
      }
    }
  }

  @media (forced-colors: active) {
    .history-dropdown-button[disabled] {
      opacity: 100%;
    }

    .history-dropdown-button > .content::after {
      background-color: ButtonText;
    }

    .history-dropdown-button[disabled] > .content::after {
      background-color: GrayText;
    }
  }
}

/*# sourceURL=${import.meta.resolve("./timelinePanel.css")} */`;

// gen/front_end/panels/timeline/TrackConfigBanner.js
var TrackConfigBanner_exports = {};
__export(TrackConfigBanner_exports, {
  createHiddenTracksOverlay: () => createHiddenTracksOverlay
});
import * as i18n35 from "./../../core/i18n/i18n.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as UI9 from "./../../ui/legacy/legacy.js";
var UIStrings18 = {
  /**
   * @description Message shown in a banner when some tracks are hidden in the timeline.
   */
  someTracksAreHidden: "Some tracks are hidden in this trace. You can configure tracks by right clicking the track name.",
  /**
   * @description Text for a button to show all hidden tracks.
   */
  showAll: "Show all",
  /**
   * @description Text for a button that opens a view to configure which tracks are visible.
   */
  configureTracks: "Configure tracks"
};
var str_18 = i18n35.i18n.registerUIStrings("panels/timeline/TrackConfigBanner.ts", UIStrings18);
var i18nString18 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
var hiddenTracksInfoBarByParsedTrace = /* @__PURE__ */ new WeakMap();
function createHiddenTracksOverlay(parsedTrace, callbacks) {
  const status = hiddenTracksInfoBarByParsedTrace.get(parsedTrace);
  if (status === "DISMISSED") {
    return null;
  }
  if (status instanceof UI9.Infobar.Infobar) {
    return {
      type: "BOTTOM_INFO_BAR",
      infobar: status
    };
  }
  const infobarForTrace = new UI9.Infobar.Infobar("warning", i18nString18(UIStrings18.someTracksAreHidden), [
    {
      text: i18nString18(UIStrings18.showAll),
      delegate: callbacks.onShowAllTracks,
      dismiss: true
    },
    {
      text: i18nString18(UIStrings18.configureTracks),
      delegate: callbacks.onShowTrackConfigurationMode,
      dismiss: true,
      buttonVariant: "primary"
    }
  ]);
  infobarForTrace.setCloseCallback(() => {
    callbacks.onClose();
    hiddenTracksInfoBarByParsedTrace.set(parsedTrace, "DISMISSED");
  });
  hiddenTracksInfoBarByParsedTrace.set(parsedTrace, infobarForTrace);
  return { type: "BOTTOM_INFO_BAR", infobar: infobarForTrace };
}

// gen/front_end/panels/timeline/UIDevtoolsController.js
var UIDevtoolsController_exports = {};
__export(UIDevtoolsController_exports, {
  UIDevtoolsController: () => UIDevtoolsController
});
import * as Trace22 from "./../../models/trace/trace.js";

// gen/front_end/panels/timeline/UIDevtoolsUtils.js
var UIDevtoolsUtils_exports = {};
__export(UIDevtoolsUtils_exports, {
  RecordType: () => RecordType,
  UIDevtoolsUtils: () => UIDevtoolsUtils
});
import * as i18n37 from "./../../core/i18n/i18n.js";
import * as Root3 from "./../../core/root/root.js";
import * as Trace21 from "./../../models/trace/trace.js";
var UIStrings19 = {
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  frameStart: "Frame start",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  drawFrame: "Draw frame",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  layout: "Layout",
  /**
   * @description Text in UIDevtools Utils of the Performance panel
   */
  rasterizing: "Rasterizing",
  /**
   * @description Text in UIDevtools Utils of the Performance panel
   */
  drawing: "Drawing",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  painting: "Painting",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  system: "System",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  idle: "Idle",
  /**
   * @description Category in the Summary view of the Performance panel to indicate time spent to load resources
   */
  loading: "Loading",
  /**
   * @description Text in Timeline for the Experience title
   */
  experience: "Experience",
  /**
   * @description Category in the Summary view of the Performance panel to indicate time spent in script execution
   */
  scripting: "Scripting",
  /**
   * @description Category in the Summary view of the Performance panel to indicate time spent in rendering the web page
   */
  rendering: "Rendering",
  /**
   * @description Event category in the Performance panel for time spent in the GPU
   */
  gpu: "GPU",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  async: "Async",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  messaging: "Messaging"
};
var str_19 = i18n37.i18n.registerUIStrings("panels/timeline/UIDevtoolsUtils.ts", UIStrings19);
var i18nString19 = i18n37.i18n.getLocalizedString.bind(void 0, str_19);
var eventStylesMap = null;
var categories = null;
var UIDevtoolsUtils = class _UIDevtoolsUtils {
  static isUiDevTools() {
    return Root3.Runtime.Runtime.queryParam("uiDevTools") === "true";
  }
  static categorizeEvents() {
    if (eventStylesMap) {
      return eventStylesMap;
    }
    const type = RecordType;
    const categories2 = _UIDevtoolsUtils.categories();
    const drawing = categories2["drawing"];
    const rasterizing = categories2["rasterizing"];
    const layout = categories2["layout"];
    const painting = categories2["painting"];
    const other = categories2["other"];
    const eventStyles = {};
    const { TimelineRecordStyle } = Trace21.Styles;
    eventStyles[type.ViewPaint] = new TimelineRecordStyle("View::Paint", painting);
    eventStyles[type.ViewOnPaint] = new TimelineRecordStyle("View::OnPaint", painting);
    eventStyles[type.ViewPaintChildren] = new TimelineRecordStyle("View::PaintChildren", painting);
    eventStyles[type.ViewOnPaintBackground] = new TimelineRecordStyle("View::OnPaintBackground", painting);
    eventStyles[type.ViewOnPaintBorder] = new TimelineRecordStyle("View::OnPaintBorder", painting);
    eventStyles[type.LayerPaintContentsToDisplayList] = new TimelineRecordStyle("Layer::PaintContentsToDisplayList", painting);
    eventStyles[type.ViewLayout] = new TimelineRecordStyle("View::Layout", layout);
    eventStyles[type.ViewLayoutBoundsChanged] = new TimelineRecordStyle("View::Layout(bounds_changed)", layout);
    eventStyles[type.RasterTask] = new TimelineRecordStyle("RasterTask", rasterizing);
    eventStyles[type.RasterizerTaskImplRunOnWorkerThread] = new TimelineRecordStyle("RasterizerTaskImpl::RunOnWorkerThread", rasterizing);
    eventStyles[type.DirectRendererDrawFrame] = new TimelineRecordStyle("DirectRenderer::DrawFrame", drawing);
    eventStyles[type.BeginFrame] = new TimelineRecordStyle(i18nString19(UIStrings19.frameStart), drawing, true);
    eventStyles[type.DrawFrame] = new TimelineRecordStyle(i18nString19(UIStrings19.drawFrame), drawing, true);
    eventStyles[type.NeedsBeginFrameChanged] = new TimelineRecordStyle("NeedsBeginFrameChanged", drawing, true);
    eventStyles[type.ThreadControllerImplRunTask] = new TimelineRecordStyle("ThreadControllerImpl::RunTask", other);
    eventStylesMap = eventStyles;
    return eventStyles;
  }
  static categories() {
    if (categories) {
      return categories;
    }
    const { TimelineCategory, EventCategory } = Trace21.Styles;
    categories = {
      layout: new TimelineCategory(EventCategory.LAYOUT, i18nString19(UIStrings19.layout), true, "--app-color-loading"),
      rasterizing: new TimelineCategory(EventCategory.RASTERIZING, i18nString19(UIStrings19.rasterizing), true, "--app-color-scripting"),
      drawing: new TimelineCategory(EventCategory.DRAWING, i18nString19(UIStrings19.drawing), true, "--app-color-rendering"),
      painting: new TimelineCategory(EventCategory.PAINTING, i18nString19(UIStrings19.painting), true, "--app-color-painting"),
      other: new TimelineCategory(EventCategory.OTHER, i18nString19(UIStrings19.system), false, "--app-color-system"),
      idle: new TimelineCategory(EventCategory.IDLE, i18nString19(UIStrings19.idle), false, "--app-color-idle"),
      loading: new TimelineCategory(EventCategory.LOADING, i18nString19(UIStrings19.loading), false, "--app-color-loading"),
      experience: new TimelineCategory(EventCategory.EXPERIENCE, i18nString19(UIStrings19.experience), false, "--app-color-rendering"),
      messaging: new TimelineCategory(EventCategory.MESSAGING, i18nString19(UIStrings19.messaging), false, "--app-color-messaging"),
      scripting: new TimelineCategory(EventCategory.SCRIPTING, i18nString19(UIStrings19.scripting), false, "--app-color-scripting"),
      rendering: new TimelineCategory(EventCategory.RENDERING, i18nString19(UIStrings19.rendering), false, "--app-color-rendering"),
      gpu: new TimelineCategory(EventCategory.GPU, i18nString19(UIStrings19.gpu), false, "--app-color-painting"),
      async: new TimelineCategory(EventCategory.ASYNC, i18nString19(UIStrings19.async), false, "--app-color-async")
    };
    return categories;
  }
  static getMainCategoriesList() {
    return ["idle", "drawing", "painting", "rasterizing", "layout", "other"];
  }
};
var RecordType;
(function(RecordType2) {
  RecordType2["ViewPaint"] = "View::Paint";
  RecordType2["ViewOnPaint"] = "View::OnPaint";
  RecordType2["ViewPaintChildren"] = "View::PaintChildren";
  RecordType2["ViewOnPaintBackground"] = "View::OnPaintBackground";
  RecordType2["ViewOnPaintBorder"] = "View::OnPaintBorder";
  RecordType2["ViewLayout"] = "View::Layout";
  RecordType2["ViewLayoutBoundsChanged"] = "View::Layout(bounds_changed)";
  RecordType2["LayerPaintContentsToDisplayList"] = "Layer::PaintContentsToDisplayList";
  RecordType2["DirectRendererDrawFrame"] = "DirectRenderer::DrawFrame";
  RecordType2["RasterTask"] = "RasterTask";
  RecordType2["RasterizerTaskImplRunOnWorkerThread"] = "RasterizerTaskImpl::RunOnWorkerThread";
  RecordType2["BeginFrame"] = "BeginFrame";
  RecordType2["DrawFrame"] = "DrawFrame";
  RecordType2["NeedsBeginFrameChanged"] = "NeedsBeginFrameChanged";
  RecordType2["ThreadControllerImplRunTask"] = "ThreadControllerImpl::RunTask";
})(RecordType || (RecordType = {}));

// gen/front_end/panels/timeline/UIDevtoolsController.js
var UIDevtoolsController = class extends TimelineController {
  constructor(rootTarget, primaryPageTarget, client) {
    super(rootTarget, primaryPageTarget, client);
    Trace22.Styles.setEventStylesMap(UIDevtoolsUtils.categorizeEvents());
    Trace22.Styles.setCategories(UIDevtoolsUtils.categories());
    Trace22.Styles.setTimelineMainEventCategories(UIDevtoolsUtils.getMainCategoriesList().filter(Trace22.Styles.stringIsEventCategory));
  }
};

// gen/front_end/panels/timeline/TimelinePanel.js
import * as Utils3 from "./utils/utils.js";
var UIStrings20 = {
  /**
   * @description Text that appears when user drag and drop something (for example, a file) in Timeline Panel of the Performance panel
   */
  dropTimelineFileOrUrlHere: "Drop trace file or URL here",
  /**
   * @description Title of disable capture jsprofile setting in timeline panel of the performance panel
   */
  disableJavascriptSamples: "Disable JavaScript samples",
  /**
   *@description Title of capture layers and pictures setting in timeline panel of the performance panel
   */
  enableAdvancedPaint: "Enable advanced paint instrumentation (slow)",
  /**
   * @description Title of CSS selector stats setting in timeline panel of the performance panel
   */
  enableSelectorStats: "Enable CSS selector stats (slow)",
  /**
   * @description Title of show screenshots setting in timeline panel of the performance panel
   */
  screenshots: "Screenshots",
  /**
   * @description Text for the memory of the page
   */
  memory: "Memory",
  /**
   * @description Text to clear content
   */
  clear: "Clear",
  /**
   * @description A label for a button that fixes something.
   */
  fixMe: "Fix me",
  /**
   * @description Tooltip text that appears when hovering over the largeicon load button
   */
  loadTrace: "Load trace\u2026",
  /**
   * @description Text to take screenshots
   */
  captureScreenshots: "Capture screenshots",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  showMemoryTimeline: "Show memory timeline",
  /**
   * @description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in timeline panel of the performance panel
   */
  captureSettings: "Capture settings",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  disablesJavascriptSampling: "Disables JavaScript sampling, reduces overhead when running against mobile devices",
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  capturesAdvancedPaint: "Captures advanced paint instrumentation, introduces significant performance overhead",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  capturesSelectorStats: "Captures CSS selector statistics",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  network: "Network:",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  cpu: "CPU:",
  /**
   * @description Title of the 'Network conditions' tool in the bottom drawer
   */
  networkConditions: "Network conditions",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  CpuThrottlingIsEnabled: "- CPU throttling is enabled",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  NetworkThrottlingIsEnabled: "- Network throttling is enabled",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  SignificantOverheadDueToPaint: "- Significant overhead due to paint instrumentation",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  SelectorStatsEnabled: "- Selector stats is enabled",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  JavascriptSamplingIsDisabled: "- JavaScript sampling is disabled",
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  stoppingTimeline: "Stopping timeline\u2026",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  received: "Received",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  processed: "Processed",
  /**
   * @description Text to close something
   */
  close: "Close",
  /**
   * @description Status text to indicate the recording has failed in the Performance panel
   */
  recordingFailed: "Recording failed",
  /**
   * @description Status text to indicate that exporting the trace has failed
   */
  exportingFailed: "Exporting the trace failed",
  /**
   * @description Text to indicate the progress of a trace. Informs the user that we are currently
   * creating a performance trace.
   */
  tracing: "Tracing\u2026",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  bufferUsage: "Buffer usage",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  loadingTrace: "Loading trace\u2026",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  processingTrace: "Processing trace\u2026",
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  initializingTracing: "Initializing tracing\u2026",
  /**
   * @description Tooltip description for a checkbox that toggles the visibility of data added by extensions of this panel (Performance).
   */
  showDataAddedByExtensions: "Show data added by extensions of the Performance panel",
  /**
   * Label for a checkbox that toggles the visibility of data added by extensions of this panel (Performance).
   */
  showCustomtracks: "Show custom tracks",
  /**
   * @description Tooltip for the the sidebar toggle in the Performance panel. Command to open/show the sidebar.
   */
  showSidebar: "Show sidebar",
  /**
   * @description Tooltip for the the sidebar toggle in the Performance panel. Command to close the sidebar.
   */
  hideSidebar: "Hide sidebar",
  /**
   * @description Screen reader announcement when the sidebar is shown in the Performance panel.
   */
  sidebarShown: "Performance sidebar shown",
  /**
   * @description Screen reader announcement when the sidebar is hidden in the Performance panel.
   */
  sidebarHidden: "Performance sidebar hidden",
  /**
   * @description Screen reader announcement when the user clears their selection
   */
  selectionCleared: "Selection cleared",
  /**
   * @description Screen reader announcement when the user selects a frame.
   */
  frameSelected: "Frame selected",
  /**
   * @description Screen reader announcement when the user selects a trace event.
   * @example {Paint} PH1
   */
  eventSelected: "Event {PH1} selected",
  /**
   * @description Text of a hyperlink to documentation.
   */
  learnMore: "Learn more",
  /**
   * @description Tooltip text for a button that takes the user back to the default view which shows performance metrics that are live.
   */
  backToLiveMetrics: "Go back to the live metrics page",
  /**
   * @description Description of the Timeline zoom keyboard instructions that appear in the shortcuts dialog
   */
  timelineZoom: "Zoom",
  /**
   * @description Description of the Timeline scrolling & panning instructions that appear in the shortcuts dialog.
   */
  timelineScrollPan: "Scroll & Pan",
  /**
   * @description Title for the Dim 3rd Parties checkbox.
   */
  dimThirdParties: "Dim 3rd parties",
  /**
   * @description Description for the Dim 3rd Parties checkbox tooltip describing how 3rd parties are classified.
   */
  thirdPartiesByThirdPartyWeb: "3rd parties classified by third-party-web",
  /**
   * @description Title of the shortcuts dialog shown to the user that lists keyboard shortcuts.
   */
  shortcutsDialogTitle: "Keyboard shortcuts for flamechart",
  /**
   * @description Notification shown to the user whenever DevTools receives an external request.
   */
  externalRequestReceived: "`DevTools` received an external request"
};
var str_20 = i18n39.i18n.registerUIStrings("panels/timeline/TimelinePanel.ts", UIStrings20);
var i18nString20 = i18n39.i18n.getLocalizedString.bind(void 0, str_20);
var timelinePanelInstance;
var TimelinePanel = class _TimelinePanel extends Common10.ObjectWrapper.eventMixin(UI10.Panel.Panel) {
  dropTarget;
  recordingOptionUIControls;
  state;
  recordingPageReload;
  millisecondsToRecordAfterLoadEvent;
  toggleRecordAction;
  recordReloadAction;
  #historyManager;
  disableCaptureJSProfileSetting;
  captureLayersAndPicturesSetting;
  captureSelectorStatsSetting;
  #thirdPartyTracksSetting;
  showScreenshotsSetting;
  showMemorySetting;
  panelToolbar;
  panelRightToolbar;
  timelinePane;
  #minimapComponent = new TimelineMiniMap();
  #viewMode = { mode: "LANDING_PAGE" };
  #dimThirdPartiesSetting = null;
  #thirdPartyCheckbox = null;
  #isNode = Root4.Runtime.Runtime.isNode();
  #onAnnotationModifiedEventBound = this.#onAnnotationModifiedEvent.bind(this);
  /**
   * We get given any filters for a new trace when it is recorded/imported.
   * Because the user can then use the dropdown to navigate to another trace,
   * we store the filters by the trace index, so if the user then navigates back
   * to a previous trace we can reinstate the filters from this map.
   */
  #exclusiveFilterPerTrace = /* @__PURE__ */ new Map();
  /**
   * This widget holds the timeline sidebar which shows Insights & Annotations,
   * and the main UI which shows the timeline
   */
  #splitWidget = new UI10.SplitWidget.SplitWidget(
    true,
    // isVertical
    false,
    // secondIsSidebar
    "timeline-panel-sidebar-state",
    // settingName (to persist the open/closed state for the user)
    TimelineComponents3.Sidebar.DEFAULT_SIDEBAR_WIDTH_PX
  );
  statusPaneContainer;
  flameChart;
  #searchableView;
  showSettingsPaneButton;
  showSettingsPaneSetting;
  settingsPane;
  controller;
  cpuProfiler;
  clearButton;
  loadButton;
  saveButton;
  homeButton;
  askAiButton;
  statusDialog = null;
  landingPage;
  loader;
  showScreenshotsToolbarCheckbox;
  showMemoryToolbarCheckbox;
  networkThrottlingSelect;
  cpuThrottlingSelect;
  fileSelectorElement;
  selection = null;
  traceLoadStart;
  #traceEngineModel;
  #externalAIConversationData = null;
  #sourceMapsResolver = null;
  #entityMapper = null;
  #onSourceMapsNodeNamesResolvedBound = this.#onSourceMapsNodeNamesResolved.bind(this);
  #sidebarToggleButton = this.#splitWidget.createShowHideSidebarButton(
    i18nString20(UIStrings20.showSidebar),
    i18nString20(UIStrings20.hideSidebar),
    // These are used to announce to screen-readers and not shown visibly.
    i18nString20(UIStrings20.sidebarShown),
    i18nString20(UIStrings20.sidebarHidden),
    "timeline.sidebar"
  );
  #sideBar = new TimelineComponents3.Sidebar.SidebarWidget();
  #eventToRelatedInsights = /* @__PURE__ */ new Map();
  #shortcutsDialog = new Dialogs.ShortcutDialog.ShortcutDialog();
  /**
   * Track if the user has opened the shortcuts dialog before. We do this so that the
   * very first time the performance panel is open after the shortcuts dialog ships, we can
   * automatically pop it open to aid discovery.
   */
  #userHadShortcutsDialogOpenedOnce = Common10.Settings.Settings.instance().createSetting("timeline.user-had-shortcuts-dialog-opened-once", false);
  /**
   * Navigation radio buttons located in the shortcuts dialog.
   */
  #navigationRadioButtons = document.createElement("form");
  #modernNavRadioButton = UI10.UIUtils.createRadioButton("flamechart-selected-navigation", "Modern - normal scrolling", "timeline.select-modern-navigation");
  #classicNavRadioButton = UI10.UIUtils.createRadioButton("flamechart-selected-navigation", "Classic - scroll to zoom", "timeline.select-classic-navigation");
  #onMainEntryHovered;
  #hiddenTracksInfoBarByParsedTrace = /* @__PURE__ */ new WeakMap();
  #resourceLoader;
  constructor(resourceLoader, traceModel) {
    super("timeline");
    this.#resourceLoader = resourceLoader;
    this.registerRequiredCSS(timelinePanel_css_default);
    const adornerContent = document.createElement("span");
    adornerContent.innerHTML = `<div style="
      font-size: 12px;
      transform: scale(1.25);
      color: transparent;
      background: linear-gradient(90deg,CLICK255 0 0 / 100%) 0%, rgb(255 154 0 / 100%) 10%, rgb(208 222 33 / 100%) 20%, rgb(79 220 74 / 100%) 30%, rgb(63 218 216 / 100%) 40%, rgb(47 201 226 / 100%) 50%, rgb(28 127 238 / 100%) 60%, rgb(95 21 242 / 100%) 70%, rgb(186 12 248 / 100%) 80%, rgb(251 7 217 / 100%) 90%, rgb(255 0 0 / 100%) 100%);
      -webkit-background-clip: text;
      ">\u{1F4AB}</div>`;
    const adorner = new Adorners.Adorner.Adorner();
    adorner.classList.add("fix-perf-icon");
    adorner.data = {
      name: i18nString20(UIStrings20.fixMe),
      content: adornerContent
    };
    this.#traceEngineModel = traceModel || this.#instantiateNewModel();
    this.#listenForProcessingProgress();
    this.element.addEventListener("contextmenu", this.contextMenu.bind(this), false);
    this.dropTarget = new UI10.DropTarget.DropTarget(this.element, [UI10.DropTarget.Type.File, UI10.DropTarget.Type.URI], i18nString20(UIStrings20.dropTimelineFileOrUrlHere), this.handleDrop.bind(this));
    this.recordingOptionUIControls = [];
    this.state = "Idle";
    this.recordingPageReload = false;
    this.millisecondsToRecordAfterLoadEvent = 5e3;
    this.toggleRecordAction = UI10.ActionRegistry.ActionRegistry.instance().getAction("timeline.toggle-recording");
    this.recordReloadAction = UI10.ActionRegistry.ActionRegistry.instance().getAction("timeline.record-reload");
    this.#historyManager = new TimelineHistoryManager(this.#minimapComponent, this.#isNode);
    this.traceLoadStart = null;
    this.disableCaptureJSProfileSetting = Common10.Settings.Settings.instance().createSetting(
      "timeline-disable-js-sampling",
      false,
      "Session"
      /* Common.Settings.SettingStorageType.SESSION */
    );
    this.disableCaptureJSProfileSetting.setTitle(i18nString20(UIStrings20.disableJavascriptSamples));
    this.captureLayersAndPicturesSetting = Common10.Settings.Settings.instance().createSetting(
      "timeline-capture-layers-and-pictures",
      false,
      "Session"
      /* Common.Settings.SettingStorageType.SESSION */
    );
    this.captureLayersAndPicturesSetting.setTitle(i18nString20(UIStrings20.enableAdvancedPaint));
    this.captureSelectorStatsSetting = Common10.Settings.Settings.instance().createSetting(
      "timeline-capture-selector-stats",
      false,
      "Session"
      /* Common.Settings.SettingStorageType.SESSION */
    );
    this.captureSelectorStatsSetting.setTitle(i18nString20(UIStrings20.enableSelectorStats));
    this.showScreenshotsSetting = Common10.Settings.Settings.instance().createSetting("timeline-show-screenshots", !this.#isNode);
    this.showScreenshotsSetting.setTitle(i18nString20(UIStrings20.screenshots));
    this.showScreenshotsSetting.addChangeListener(this.updateMiniMap, this);
    this.showMemorySetting = Common10.Settings.Settings.instance().createSetting(
      "timeline-show-memory",
      false,
      "Session"
      /* Common.Settings.SettingStorageType.SESSION */
    );
    this.showMemorySetting.setTitle(i18nString20(UIStrings20.memory));
    this.showMemorySetting.addChangeListener(this.onMemoryModeChanged, this);
    this.#dimThirdPartiesSetting = Common10.Settings.Settings.instance().createSetting(
      "timeline-dim-third-parties",
      false,
      "Session"
      /* Common.Settings.SettingStorageType.SESSION */
    );
    this.#dimThirdPartiesSetting.setTitle(i18nString20(UIStrings20.dimThirdParties));
    this.#dimThirdPartiesSetting.addChangeListener(this.onDimThirdPartiesChanged, this);
    this.#thirdPartyTracksSetting = _TimelinePanel.extensionDataVisibilitySetting();
    this.#thirdPartyTracksSetting.addChangeListener(this.#extensionDataVisibilityChanged, this);
    this.#thirdPartyTracksSetting.setTitle(i18nString20(UIStrings20.showCustomtracks));
    const timelineToolbarContainer = this.element.createChild("div", "timeline-toolbar-container");
    timelineToolbarContainer.setAttribute("jslog", `${VisualLogging6.toolbar()}`);
    timelineToolbarContainer.role = "toolbar";
    this.panelToolbar = timelineToolbarContainer.createChild("devtools-toolbar", "timeline-main-toolbar");
    this.panelToolbar.role = "presentation";
    this.panelToolbar.wrappable = true;
    this.panelRightToolbar = timelineToolbarContainer.createChild("devtools-toolbar");
    this.panelRightToolbar.role = "presentation";
    if (!this.#isNode && this.canRecord()) {
      this.createSettingsPane();
      this.updateShowSettingsToolbarButton();
    }
    this.timelinePane = new UI10.Widget.VBox();
    const topPaneElement = this.timelinePane.element.createChild("div", "hbox");
    topPaneElement.id = "timeline-overview-panel";
    this.#minimapComponent.show(topPaneElement);
    this.#minimapComponent.addEventListener("OverviewPaneMouseMove", (event) => {
      this.flameChart.addTimestampMarkerOverlay(event.data.timeInMicroSeconds);
    });
    this.#minimapComponent.addEventListener("OverviewPaneMouseLeave", async () => {
      await this.flameChart.removeTimestampMarkerOverlay();
    });
    this.statusPaneContainer = this.timelinePane.element.createChild("div", "status-pane-container fill");
    this.createFileSelector();
    SDK7.TargetManager.TargetManager.instance().addModelListener(SDK7.ResourceTreeModel.ResourceTreeModel, SDK7.ResourceTreeModel.Events.Load, this.loadEventFired, this);
    this.flameChart = new TimelineFlameChartView(this);
    this.element.addEventListener("toggle-popover", (event) => this.flameChart.togglePopover(event.detail));
    this.#onMainEntryHovered = this.#onEntryHovered.bind(this, this.flameChart.getMainDataProvider());
    this.flameChart.getMainFlameChart().addEventListener("EntryHovered", this.#onMainEntryHovered);
    this.flameChart.addEventListener("EntryLabelAnnotationClicked", (event) => {
      const selection = selectionFromEvent(event.data.entry);
      this.select(selection);
    });
    this.#searchableView = new UI10.SearchableView.SearchableView(this.flameChart, null);
    this.#searchableView.setMinimumSize(0, 100);
    this.#searchableView.setMinimalSearchQuerySize(2);
    this.#searchableView.element.classList.add("searchable-view");
    this.#searchableView.show(this.timelinePane.element);
    this.flameChart.show(this.#searchableView.element);
    this.flameChart.setSearchableView(this.#searchableView);
    this.#searchableView.hideWidget();
    this.#splitWidget.setMainWidget(this.timelinePane);
    this.#splitWidget.setSidebarWidget(this.#sideBar);
    this.#splitWidget.enableShowModeSaving();
    this.#splitWidget.show(this.element);
    this.flameChart.overlays().addEventListener(Overlays.Overlays.TimeRangeMouseOverEvent.eventName, (event) => {
      const { overlay } = event;
      const overlayBounds = Overlays.Overlays.traceWindowContainingOverlays([overlay]);
      if (!overlayBounds) {
        return;
      }
      this.#minimapComponent.highlightBounds(
        overlayBounds,
        /* withBracket */
        false
      );
    });
    this.flameChart.overlays().addEventListener(Overlays.Overlays.TimeRangeMouseOutEvent.eventName, () => {
      this.#minimapComponent.clearBoundsHighlight();
    });
    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightDeactivated.eventName, () => {
      this.#setActiveInsight(null);
    });
    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightActivated.eventName, (event) => {
      const { model, insightSetKey } = event;
      this.#setActiveInsight({ model, insightSetKey });
      if (model.insightKey === "ThirdParties") {
        void window.scheduler.postTask(() => {
          this.#openSummaryTab();
        }, { priority: "background" });
      }
    });
    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightProvideOverlays.eventName, (event) => {
      const { overlays, options } = event;
      void window.scheduler.postTask(() => {
        this.flameChart.setOverlays(overlays, options);
        const overlaysBounds = Overlays.Overlays.traceWindowContainingOverlays(overlays);
        if (overlaysBounds) {
          this.#minimapComponent.highlightBounds(
            overlaysBounds,
            /* withBracket */
            true
          );
        } else {
          this.#minimapComponent.clearBoundsHighlight();
        }
      }, { priority: "user-visible" });
    });
    this.#sideBar.contentElement.addEventListener(TimelineInsights.EventRef.EventReferenceClick.eventName, (event) => {
      this.select(selectionFromEvent(event.event));
    });
    this.#sideBar.element.addEventListener(TimelineComponents3.Sidebar.RemoveAnnotation.eventName, (event) => {
      const { removedAnnotation } = event;
      ModificationsManager.activeManager()?.removeAnnotation(removedAnnotation);
    });
    this.#sideBar.element.addEventListener(TimelineComponents3.Sidebar.RevealAnnotation.eventName, (event) => {
      this.flameChart.revealAnnotation(event.annotation);
    });
    this.#sideBar.element.addEventListener(TimelineComponents3.Sidebar.HoverAnnotation.eventName, (event) => {
      this.flameChart.hoverAnnotationInSidebar(event.annotation);
    });
    this.#sideBar.element.addEventListener(TimelineComponents3.Sidebar.AnnotationHoverOut.eventName, () => {
      this.flameChart.sidebarAnnotationHoverOut();
    });
    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightSetHovered.eventName, (event) => {
      if (event.bounds) {
        this.#minimapComponent.highlightBounds(
          event.bounds,
          /* withBracket */
          true
        );
      } else {
        this.#minimapComponent.clearBoundsHighlight();
      }
    });
    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightSetZoom.eventName, (event) => {
      TraceBounds9.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(event.bounds, { ignoreMiniMapBounds: true, shouldAnimate: true });
    });
    this.onMemoryModeChanged();
    this.populateToolbar();
    this.#showLandingPage();
    this.updateTimelineControls();
    SDK7.TargetManager.TargetManager.instance().addEventListener("SuspendStateChanged", this.onSuspendStateChanged, this);
    const profilerModels = SDK7.TargetManager.TargetManager.instance().models(SDK7.CPUProfilerModel.CPUProfilerModel);
    for (const model of profilerModels) {
      for (const message of model.registeredConsoleProfileMessages) {
        this.consoleProfileFinished(message);
      }
    }
    SDK7.TargetManager.TargetManager.instance().observeModels(SDK7.CPUProfilerModel.CPUProfilerModel, {
      modelAdded: (model) => {
        model.addEventListener("ConsoleProfileFinished", (event) => this.consoleProfileFinished(event.data));
      },
      modelRemoved: (_model) => {
      }
    });
  }
  zoomEvent(event) {
    this.flameChart.zoomEvent(event);
  }
  /**
   * Activates an insight and ensures the sidebar is open too.
   * Pass `highlightInsight: true` to flash the insight with the background highlight colour.
   */
  #setActiveInsight(insight, opts = { highlightInsight: false }) {
    if (insight) {
      this.#splitWidget.showBoth();
    }
    this.#sideBar.setActiveInsight(insight, { highlight: opts.highlightInsight });
    this.flameChart.setActiveInsight(insight);
    if (insight) {
      const selectedInsight = new SelectedInsight(insight);
      UI10.Context.Context.instance().setFlavor(SelectedInsight, selectedInsight);
    } else {
      UI10.Context.Context.instance().setFlavor(SelectedInsight, null);
    }
  }
  /**
   * This disables the 3P checkbox in the toolbar.
   * If the checkbox was checked, we flip it to indeterminiate to communicate it doesn't currently apply.
   */
  set3PCheckboxDisabled(disabled) {
    this.#thirdPartyCheckbox?.applyEnabledState(!disabled);
    if (this.#dimThirdPartiesSetting?.get()) {
      this.#thirdPartyCheckbox?.setIndeterminate(disabled);
    }
  }
  static instance(opts = void 0) {
    if (opts) {
      timelinePanelInstance = new _TimelinePanel(opts.resourceLoader, opts.traceModel);
    }
    if (!timelinePanelInstance) {
      throw new Error("No TimelinePanel instance");
    }
    return timelinePanelInstance;
  }
  static removeInstance() {
    SourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();
    Trace23.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
    TraceBounds9.TraceBounds.BoundsManager.removeInstance();
    ModificationsManager.reset();
    ActiveFilters.removeInstance();
    timelinePanelInstance = void 0;
  }
  #instantiateNewModel() {
    const config = Trace23.Types.Configuration.defaults();
    config.showAllEvents = Root4.Runtime.experiments.isEnabled("timeline-show-all-events");
    config.includeRuntimeCallStats = Root4.Runtime.experiments.isEnabled("timeline-v8-runtime-call-stats");
    config.debugMode = Root4.Runtime.experiments.isEnabled(
      "timeline-debug-mode"
      /* Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE */
    );
    return Trace23.TraceModel.Model.createWithAllHandlers(config);
  }
  static extensionDataVisibilitySetting() {
    return Common10.Settings.Settings.instance().createSetting("timeline-show-extension-data", true);
  }
  searchableView() {
    return this.#searchableView;
  }
  wasShown() {
    super.wasShown();
    UI10.Context.Context.instance().setFlavor(_TimelinePanel, this);
    Host2.userMetrics.panelLoaded("timeline", "DevTools.Launch.Timeline");
    const cruxManager = CrUXManager3.CrUXManager.instance();
    cruxManager.addEventListener("field-data-changed", this.#onFieldDataChanged, this);
    this.#onFieldDataChanged();
  }
  willHide() {
    super.willHide();
    UI10.Context.Context.instance().setFlavor(_TimelinePanel, null);
    this.#historyManager.cancelIfShowing();
    const cruxManager = CrUXManager3.CrUXManager.instance();
    cruxManager.removeEventListener("field-data-changed", this.#onFieldDataChanged, this);
  }
  #onFieldDataChanged() {
    const recs = Utils3.Helpers.getThrottlingRecommendations();
    this.cpuThrottlingSelect?.updateRecommendedOption(recs.cpuOption);
    if (this.networkThrottlingSelect) {
      this.networkThrottlingSelect.recommendedConditions = recs.networkConditions;
    }
  }
  loadFromEvents(events) {
    if (this.state !== "Idle") {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromEvents(events, this);
  }
  loadFromTraceFile(traceFile) {
    if (this.state !== "Idle") {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromTraceFile(traceFile, this);
  }
  getFlameChart() {
    return this.flameChart;
  }
  /**
   * Determine if two view modes are equivalent. Useful because if
   * {@link TimelinePanel.#changeView} gets called and the new mode is identical to the current,
   * we can bail without doing any UI updates.
   */
  #viewModesEquivalent(m1, m2) {
    if (m1.mode === "LANDING_PAGE" && m2.mode === "LANDING_PAGE") {
      return true;
    }
    if (m1.mode === "STATUS_PANE_OVERLAY" && m2.mode === "STATUS_PANE_OVERLAY") {
      return true;
    }
    if (m1.mode === "VIEWING_TRACE" && m2.mode === "VIEWING_TRACE" && m1.traceIndex === m2.traceIndex) {
      return true;
    }
    return false;
  }
  #uninstallSourceMapsResolver() {
    if (this.#sourceMapsResolver) {
      SourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();
      this.#sourceMapsResolver.removeEventListener(SourceMapsResolver.SourceMappingsUpdated.eventName, this.#onSourceMapsNodeNamesResolvedBound);
      this.#sourceMapsResolver.uninstall();
      this.#sourceMapsResolver = null;
    }
  }
  #removeStatusPane() {
    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = null;
  }
  hasActiveTrace() {
    return this.#viewMode.mode === "VIEWING_TRACE";
  }
  #changeView(newMode) {
    if (this.#viewModesEquivalent(this.#viewMode, newMode)) {
      return;
    }
    if (this.#viewMode.mode === "VIEWING_TRACE") {
      this.#uninstallSourceMapsResolver();
      this.#saveModificationsForActiveTrace();
      const manager = ModificationsManager.activeManager();
      if (manager) {
        manager.removeEventListener(AnnotationModifiedEvent.eventName, this.#onAnnotationModifiedEventBound);
      }
    }
    this.#viewMode = newMode;
    this.updateTimelineControls();
    switch (newMode.mode) {
      case "LANDING_PAGE": {
        this.#removeStatusPane();
        this.#showLandingPage();
        this.updateMiniMap();
        this.dispatchEventToListeners("IsViewingTrace", false);
        this.#searchableView.hideWidget();
        return;
      }
      case "VIEWING_TRACE": {
        this.#hideLandingPage();
        this.#setModelForActiveTrace();
        this.#removeStatusPane();
        if (newMode.forceOpenSidebar) {
          this.#showSidebar();
        }
        this.flameChart.dimThirdPartiesIfRequired();
        this.dispatchEventToListeners("IsViewingTrace", true);
        return;
      }
      case "STATUS_PANE_OVERLAY": {
        this.#hideLandingPage();
        this.dispatchEventToListeners("IsViewingTrace", false);
        this.#hideSidebar();
        return;
      }
      default:
        Platform11.assertNever(newMode, "Unsupported TimelinePanel viewMode");
    }
  }
  #activeTraceIndex() {
    if (this.#viewMode.mode === "VIEWING_TRACE") {
      return this.#viewMode.traceIndex;
    }
    return null;
  }
  /**
   * Exposed for handling external requests.
   */
  get model() {
    return this.#traceEngineModel;
  }
  getOrCreateExternalAIConversationData() {
    if (!this.#externalAIConversationData) {
      const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance();
      const focus = AiAssistanceModel.AIContext.getPerformanceAgentFocusFromModel(this.model);
      if (!focus) {
        throw new Error("could not create performance agent focus");
      }
      const conversation = new AiAssistanceModel.AiConversation.AiConversation(
        "drjones-performance-full",
        [],
        void 0,
        /* isReadOnly */
        true,
        conversationHandler.aidaClient,
        void 0,
        /* isExternal */
        true
      );
      const selected = new AiAssistanceModel.PerformanceAgent.PerformanceTraceContext(focus);
      selected.external = true;
      this.#externalAIConversationData = {
        conversationHandler,
        conversation,
        selected
      };
    }
    return this.#externalAIConversationData;
  }
  invalidateExternalAIConversationData() {
    this.#externalAIConversationData = null;
  }
  /**
   * NOTE: this method only exists to enable some layout tests to be migrated to the new engine.
   * DO NOT use this method within DevTools. It is marked as deprecated so
   * within DevTools you are warned when using the method.
   * @deprecated
   **/
  getParsedTraceForLayoutTests() {
    const traceIndex = this.#activeTraceIndex();
    if (traceIndex === null) {
      throw new Error("No trace index active.");
    }
    const data = this.#traceEngineModel.parsedTrace(traceIndex)?.data;
    if (!data) {
      throw new Error("No trace engine data found.");
    }
    return data;
  }
  /**
   * NOTE: this method only exists to enable some layout tests to be migrated to the new engine.
   * DO NOT use this method within DevTools. It is marked as deprecated so
   * within DevTools you are warned when using the method.
   * @deprecated
   **/
  getTraceEngineRawTraceEventsForLayoutTests() {
    const traceIndex = this.#activeTraceIndex();
    if (traceIndex === null) {
      throw new Error("No trace index active.");
    }
    const data = this.#traceEngineModel.parsedTrace(traceIndex);
    if (!data) {
      throw new Error("No trace engine data found.");
    }
    return data.traceEvents;
  }
  #onEntryHovered(dataProvider, event) {
    const entryIndex = event.data;
    if (entryIndex === -1) {
      this.#minimapComponent.clearBoundsHighlight();
      return;
    }
    const traceEvent = dataProvider.eventByIndex(entryIndex);
    if (!traceEvent) {
      return;
    }
    const bounds = Trace23.Helpers.Timing.traceWindowFromEvent(traceEvent);
    this.#minimapComponent.highlightBounds(
      bounds,
      /* withBracket */
      false
    );
  }
  loadFromCpuProfile(profile) {
    if (this.state !== "Idle" || profile === null) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromCpuProfile(profile, this);
  }
  setState(state) {
    this.state = state;
    this.updateTimelineControls();
  }
  createSettingCheckbox(setting, tooltip) {
    const checkboxItem = new UI10.Toolbar.ToolbarSettingCheckbox(setting, tooltip);
    this.recordingOptionUIControls.push(checkboxItem);
    return checkboxItem;
  }
  #addSidebarIconToToolbar() {
    if (this.panelToolbar.hasItem(this.#sidebarToggleButton)) {
      return;
    }
    this.panelToolbar.prependToolbarItem(this.#sidebarToggleButton);
  }
  /**
   * Used when the user deletes their last trace and is taken back to the
   * landing page - we don't add this icon until there is a trace loaded.
   */
  #removeSidebarIconFromToolbar() {
    this.panelToolbar.removeToolbarItem(this.#sidebarToggleButton);
  }
  /**
   * Returns false if DevTools is in a standalone context where tracing/recording are
   * NOT available.
   */
  canRecord() {
    return !Root4.Runtime.Runtime.isTraceApp();
  }
  populateToolbar() {
    const canRecord = this.canRecord();
    if (canRecord || this.#isNode) {
      this.panelToolbar.appendToolbarItem(UI10.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    }
    if (canRecord) {
      this.panelToolbar.appendToolbarItem(UI10.Toolbar.Toolbar.createActionButton(this.recordReloadAction));
    }
    this.clearButton = new UI10.Toolbar.ToolbarButton(i18nString20(UIStrings20.clear), "clear", void 0, "timeline.clear");
    this.clearButton.addEventListener("Click", () => this.onClearButton());
    this.panelToolbar.appendToolbarItem(this.clearButton);
    this.loadButton = new UI10.Toolbar.ToolbarButton(i18nString20(UIStrings20.loadTrace), "import", void 0, "timeline.load-from-file");
    this.loadButton.addEventListener("Click", () => {
      Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.PerfPanelTraceImported);
      this.selectFileToLoad();
    });
    const exportTraceOptions = new TimelineComponents3.ExportTraceOptions.ExportTraceOptions();
    exportTraceOptions.data = {
      onExport: this.saveToFile.bind(this),
      buttonEnabled: this.state === "Idle" && this.#hasActiveTrace()
    };
    this.saveButton = new UI10.Toolbar.ToolbarItem(exportTraceOptions);
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.loadButton);
    this.panelToolbar.appendToolbarItem(this.saveButton);
    if (canRecord) {
      this.panelToolbar.appendSeparator();
      if (!this.#isNode) {
        this.homeButton = new UI10.Toolbar.ToolbarButton(i18nString20(UIStrings20.backToLiveMetrics), "home", void 0, "timeline.back-to-live-metrics");
        this.homeButton.addEventListener("Click", () => {
          this.#changeView({ mode: "LANDING_PAGE" });
          this.#historyManager.navigateToLandingPage();
        });
        this.panelToolbar.appendToolbarItem(this.homeButton);
        this.panelToolbar.appendSeparator();
      }
    }
    this.panelToolbar.appendToolbarItem(this.#historyManager.button());
    this.panelToolbar.appendSeparator();
    if (!this.#isNode) {
      this.showScreenshotsToolbarCheckbox = this.createSettingCheckbox(this.showScreenshotsSetting, i18nString20(UIStrings20.captureScreenshots));
      this.panelToolbar.appendToolbarItem(this.showScreenshotsToolbarCheckbox);
    }
    this.showMemoryToolbarCheckbox = this.createSettingCheckbox(this.showMemorySetting, i18nString20(UIStrings20.showMemoryTimeline));
    if (canRecord) {
      this.panelToolbar.appendToolbarItem(this.showMemoryToolbarCheckbox);
      this.panelToolbar.appendToolbarItem(UI10.Toolbar.Toolbar.createActionButton("components.collect-garbage"));
    }
    this.panelToolbar.appendSeparator();
    const showIgnoreListSetting = new TimelineComponents3.IgnoreListSetting.IgnoreListSetting();
    this.panelToolbar.appendToolbarItem(new UI10.Toolbar.ToolbarItem(showIgnoreListSetting));
    if (this.#dimThirdPartiesSetting) {
      const dimThirdPartiesCheckbox = this.createSettingCheckbox(this.#dimThirdPartiesSetting, i18nString20(UIStrings20.thirdPartiesByThirdPartyWeb));
      this.#thirdPartyCheckbox = dimThirdPartiesCheckbox;
      this.panelToolbar.appendToolbarItem(dimThirdPartiesCheckbox);
    }
    if (this.#isNode) {
      const isolateSelector = new IsolateSelector();
      this.panelToolbar.appendSeparator();
      this.panelToolbar.appendToolbarItem(isolateSelector);
    }
    if (!this.#isNode && canRecord) {
      this.panelRightToolbar.appendSeparator();
      this.panelRightToolbar.appendToolbarItem(this.showSettingsPaneButton);
    }
  }
  #setupNavigationSetting() {
    const currentNavSetting = Common10.Settings.moduleSetting("flamechart-selected-navigation").get();
    const hideTheDialogForTests = localStorage.getItem("hide-shortcuts-dialog-for-test");
    const userHadShortcutsDialogOpenedOnce = this.#userHadShortcutsDialogOpenedOnce.get();
    this.#shortcutsDialog.prependElement(this.#navigationRadioButtons);
    const dialogToolbarItem = new UI10.Toolbar.ToolbarItem(this.#shortcutsDialog);
    dialogToolbarItem.element.setAttribute("jslog", `${VisualLogging6.action().track({ click: true }).context("timeline.shortcuts-dialog-toggle")}`);
    this.panelRightToolbar.appendToolbarItem(dialogToolbarItem);
    this.#updateNavigationSettingSelection();
    this.#shortcutsDialog.addEventListener("click", this.#updateNavigationSettingSelection.bind(this));
    this.#shortcutsDialog.data = {
      customTitle: i18nString20(UIStrings20.shortcutsDialogTitle),
      shortcuts: this.#getShortcutsInfo(currentNavSetting === "classic"),
      open: !userHadShortcutsDialogOpenedOnce && hideTheDialogForTests !== "true" && !Host2.InspectorFrontendHost.isUnderTest()
    };
    this.#navigationRadioButtons.classList.add("nav-radio-buttons");
    UI10.ARIAUtils.markAsRadioGroup(this.#navigationRadioButtons);
    this.#modernNavRadioButton.radio.addEventListener("change", () => {
      this.#shortcutsDialog.data = { shortcuts: this.#getShortcutsInfo(
        /* isNavClassic */
        false
      ) };
      Common10.Settings.moduleSetting("flamechart-selected-navigation").set("modern");
    });
    this.#classicNavRadioButton.radio.addEventListener("change", () => {
      this.#shortcutsDialog.data = { shortcuts: this.#getShortcutsInfo(
        /* isNavClassic */
        true
      ) };
      Common10.Settings.moduleSetting("flamechart-selected-navigation").set("classic");
    });
    this.#navigationRadioButtons.appendChild(this.#modernNavRadioButton.label);
    this.#navigationRadioButtons.appendChild(this.#classicNavRadioButton.label);
    this.#userHadShortcutsDialogOpenedOnce.set(true);
    return this.#navigationRadioButtons;
  }
  #updateNavigationSettingSelection() {
    const currentNavSetting = Common10.Settings.moduleSetting("flamechart-selected-navigation").get();
    if (currentNavSetting === "classic") {
      this.#classicNavRadioButton.radio.checked = true;
      Host2.userMetrics.navigationSettingAtFirstTimelineLoad(
        2
        /* Host.UserMetrics.TimelineNavigationSetting.SWITCHED_TO_CLASSIC */
      );
    } else if (currentNavSetting === "modern") {
      this.#modernNavRadioButton.radio.checked = true;
      Host2.userMetrics.navigationSettingAtFirstTimelineLoad(
        3
        /* Host.UserMetrics.TimelineNavigationSetting.SWITCHED_TO_MODERN */
      );
    }
  }
  #getShortcutsInfo(isNavClassic) {
    const metaKey = Host2.Platform.isMac() ? "\u2318" : "Ctrl";
    if (isNavClassic) {
      return [
        {
          title: i18nString20(UIStrings20.timelineZoom),
          rows: [
            [{ key: "Scroll \u2195" }],
            [{ key: "W" }, { key: "S" }, { joinText: "or" }, { key: "+" }, { key: "-" }],
            { footnote: "hold shift for fast zoom" }
          ]
        },
        {
          title: i18nString20(UIStrings20.timelineScrollPan),
          rows: [
            [{ key: "Shift" }, { joinText: "+" }, { key: "Scroll \u2195" }],
            [{ key: "Scroll \u2194" }, { joinText: "or" }, { key: "A" }, { key: "D" }],
            [
              { key: "Drag" },
              { joinText: "or" },
              { key: "Shift" },
              { joinText: "+" },
              { key: "\u2191" },
              { key: "\u2193" },
              { key: "\u2190" },
              { key: "\u2192" }
            ]
          ]
        }
      ];
    }
    return [
      {
        title: i18nString20(UIStrings20.timelineZoom),
        rows: [
          [{ key: metaKey }, { joinText: "+" }, { key: "Scroll \u2195" }],
          [{ key: "W" }, { key: "S" }, { joinText: "or" }, { key: "+" }, { key: "-" }],
          { footnote: "" }
        ]
      },
      {
        title: i18nString20(UIStrings20.timelineScrollPan),
        rows: [
          [{ key: "Scroll \u2195" }],
          [
            { key: "Shift" },
            { joinText: "+" },
            { key: "Scroll \u2195" },
            { joinText: "or" },
            { key: "Scroll \u2194" },
            { joinText: "or" },
            { key: "A" },
            { key: "D" }
          ],
          [
            { key: "Drag" },
            { joinText: "or" },
            { key: "Shift" },
            { joinText: "+" },
            { key: "\u2191" },
            { key: "\u2193" },
            { key: "\u2190" },
            { key: "\u2192" }
          ]
        ]
      }
    ];
  }
  createSettingsPane() {
    this.showSettingsPaneSetting = Common10.Settings.Settings.instance().createSetting("timeline-show-settings-toolbar", false);
    this.showSettingsPaneButton = new UI10.Toolbar.ToolbarSettingToggle(this.showSettingsPaneSetting, "gear", i18nString20(UIStrings20.captureSettings), "gear-filled", "timeline-settings-toggle");
    SDK7.NetworkManager.MultitargetNetworkManager.instance().addEventListener("ConditionsChanged", this.updateShowSettingsToolbarButton, this);
    SDK7.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener("RateChanged", this.updateShowSettingsToolbarButton, this);
    this.disableCaptureJSProfileSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);
    this.captureLayersAndPicturesSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);
    this.captureSelectorStatsSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);
    this.settingsPane = this.element.createChild("div", "timeline-settings-pane");
    this.settingsPane.setAttribute("jslog", `${VisualLogging6.pane("timeline-settings-pane").track({ resize: true })}`);
    const cpuThrottlingPane = this.settingsPane.createChild("div");
    cpuThrottlingPane.append(i18nString20(UIStrings20.cpu));
    this.cpuThrottlingSelect = MobileThrottling.ThrottlingManager.throttlingManager().createCPUThrottlingSelector();
    cpuThrottlingPane.append(this.cpuThrottlingSelect.control.element);
    this.settingsPane.append(SettingsUI.SettingsUI.createSettingCheckbox(this.captureSelectorStatsSetting.title(), this.captureSelectorStatsSetting, i18nString20(UIStrings20.capturesSelectorStats)));
    const networkThrottlingPane = this.settingsPane.createChild("div");
    networkThrottlingPane.append(i18nString20(UIStrings20.network));
    networkThrottlingPane.append(this.createNetworkConditionsSelectToolbarItem().element);
    this.settingsPane.append(SettingsUI.SettingsUI.createSettingCheckbox(this.captureLayersAndPicturesSetting.title(), this.captureLayersAndPicturesSetting, i18nString20(UIStrings20.capturesAdvancedPaint)));
    this.settingsPane.append(SettingsUI.SettingsUI.createSettingCheckbox(this.disableCaptureJSProfileSetting.title(), this.disableCaptureJSProfileSetting, i18nString20(UIStrings20.disablesJavascriptSampling)));
    const thirdPartyCheckbox = this.createSettingCheckbox(this.#thirdPartyTracksSetting, i18nString20(UIStrings20.showDataAddedByExtensions));
    const localLink = UI10.XLink.XLink.create("https://developer.chrome.com/docs/devtools/performance/extension", i18nString20(UIStrings20.learnMore));
    localLink.style.marginLeft = "5px";
    thirdPartyCheckbox.element.shadowRoot?.appendChild(localLink);
    this.settingsPane.append(thirdPartyCheckbox.element);
    this.showSettingsPaneSetting.addChangeListener(this.updateSettingsPaneVisibility.bind(this));
    this.updateSettingsPaneVisibility();
  }
  createNetworkConditionsSelectToolbarItem() {
    const toolbarItem = new UI10.Toolbar.ToolbarItem(document.createElement("div"));
    this.networkThrottlingSelect = MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.createForGlobalConditions(toolbarItem.element, i18nString20(UIStrings20.networkConditions));
    return toolbarItem;
  }
  prepareToLoadTimeline() {
    console.assert(
      this.state === "Idle"
      /* State.IDLE */
    );
    this.setState(
      "Loading"
      /* State.LOADING */
    );
  }
  createFileSelector() {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.remove();
    }
    this.fileSelectorElement = UI10.UIUtils.createFileSelectorElement(this.loadFromFile.bind(this), ".json,.gz,.gzip,.cpuprofile");
    this.timelinePane.element.appendChild(this.fileSelectorElement);
  }
  contextMenu(event) {
    if (this.state === "StartPending" || this.state === "Recording" || this.state === "StopPending") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const mouseEvent = event;
    if (this.flameChart.getMainFlameChart().coordinatesToEntryIndex(mouseEvent.offsetX, mouseEvent.offsetY) !== -1) {
      return;
    }
    const contextMenu = new UI10.ContextMenu.ContextMenu(event);
    contextMenu.appendItemsAtLocation("timelineMenu");
    void contextMenu.show();
  }
  async saveToFile(config) {
    if (this.state !== "Idle") {
      return;
    }
    if (this.#viewMode.mode !== "VIEWING_TRACE") {
      return;
    }
    const parsedTrace = this.#traceEngineModel.parsedTrace(this.#viewMode.traceIndex);
    if (!parsedTrace) {
      return;
    }
    const mappedScriptsWithData = Trace23.Handlers.ModelHandlers.Scripts.data().scripts;
    const scriptByIdMap = /* @__PURE__ */ new Map();
    for (const mapScript of mappedScriptsWithData) {
      scriptByIdMap.set(`${mapScript.isolate}.${mapScript.scriptId}`, mapScript);
    }
    const traceEvents = parsedTrace.traceEvents.map((event) => {
      if (Trace23.Types.Events.isAnyScriptSourceEvent(event) && event.name !== "StubScriptCatchup") {
        const mappedScript = scriptByIdMap.get(`${event.args.data.isolate}.${event.args.data.scriptId}`);
        if (!config.includeResourceContent || mappedScript?.url && Trace23.Helpers.Trace.isExtensionUrl(mappedScript.url)) {
          return {
            cat: event.cat,
            name: "StubScriptCatchup",
            ts: event.ts,
            dur: event.dur,
            ph: event.ph,
            pid: event.pid,
            tid: event.tid,
            args: {
              data: { isolate: event.args.data.isolate, scriptId: event.args.data.scriptId }
            }
          };
        }
      }
      return event;
    });
    const metadata = parsedTrace.metadata;
    metadata.modifications = config.addModifications ? ModificationsManager.activeManager()?.toJSON() : void 0;
    try {
      await this.innerSaveToFile(traceEvents, metadata, {
        includeResourceContent: config.includeResourceContent,
        includeSourceMaps: config.includeSourceMaps,
        addModifications: config.addModifications,
        shouldCompress: config.shouldCompress
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(e);
      console.error(error.stack);
      if (error.name === "AbortError") {
        return;
      }
      this.#showExportTraceErrorDialog(error);
    }
  }
  async innerSaveToFile(traceEvents, metadata, config) {
    const isoDate = Platform11.DateUtilities.toISO8601Compact(metadata.startTime ? new Date(metadata.startTime) : /* @__PURE__ */ new Date());
    const isCpuProfile = metadata.dataOrigin === "CPUProfile";
    const { includeResourceContent, includeSourceMaps } = config;
    metadata.enhancedTraceVersion = includeResourceContent ? SDK7.EnhancedTracesParser.EnhancedTracesParser.enhancedTraceVersion : void 0;
    let fileName = isCpuProfile ? `CPU-${isoDate}.cpuprofile` : `Trace-${isoDate}.json`;
    let blobParts = [];
    if (isCpuProfile) {
      const profile = Trace23.Helpers.SamplesIntegrator.SamplesIntegrator.extractCpuProfileFromFakeTrace(traceEvents);
      blobParts = [JSON.stringify(profile)];
    } else {
      const filteredMetadataSourceMaps = includeResourceContent && includeSourceMaps ? this.#filterMetadataSourceMaps(metadata) : void 0;
      const filteredResources = includeResourceContent ? this.#filterMetadataResoures(metadata) : void 0;
      const formattedTraceIter = traceJsonGenerator(traceEvents, {
        ...metadata,
        sourceMaps: filteredMetadataSourceMaps,
        resources: filteredResources
      });
      blobParts = Array.from(formattedTraceIter);
    }
    if (!blobParts.length) {
      throw new Error("Trace content empty");
    }
    let blob = new Blob(blobParts, { type: "application/json" });
    if (config.shouldCompress) {
      fileName = `${fileName}.gz`;
      const gzStream = Common10.Gzip.compressStream(blob.stream());
      blob = await new Response(gzStream, {
        headers: { "Content-Type": "application/gzip" }
      }).blob();
    }
    let bytesAsB64 = null;
    try {
      bytesAsB64 = await Common10.Base64.encode(blob);
    } catch {
    }
    if (bytesAsB64?.length) {
      const contentData = new TextUtils2.ContentData.ContentData(
        bytesAsB64,
        /* isBase64=*/
        true,
        blob.type
      );
      await Workspace2.FileManager.FileManager.instance().save(
        fileName,
        contentData,
        /* forceSaveAs=*/
        true
      );
      Workspace2.FileManager.FileManager.instance().close(fileName);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
  async handleSaveToFileAction() {
    const exportTraceOptionsElement = this.saveButton.element;
    const state = exportTraceOptionsElement.state;
    await this.saveToFile({
      includeResourceContent: state.includeResourceContent,
      includeSourceMaps: state.includeSourceMaps,
      addModifications: state.includeAnnotations,
      shouldCompress: state.shouldCompress
    });
  }
  #filterMetadataSourceMaps(metadata) {
    if (!metadata.sourceMaps) {
      return void 0;
    }
    return metadata.sourceMaps.filter((value) => {
      return !Trace23.Helpers.Trace.isExtensionUrl(value.url);
    });
  }
  #filterMetadataResoures(metadata) {
    if (!metadata.resources) {
      return void 0;
    }
    return metadata.resources;
  }
  #showExportTraceErrorDialog(error) {
    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = new StatusDialog({
      description: error.message ?? error.toString(),
      buttonText: i18nString20(UIStrings20.close),
      hideStopButton: false,
      showProgress: false,
      showTimer: false
    }, async () => {
      this.statusDialog?.remove();
      this.statusDialog = null;
    });
    this.statusDialog.showPane(this.statusPaneContainer);
    this.statusDialog.updateStatus(i18nString20(UIStrings20.exportingFailed));
  }
  async showHistoryDropdown() {
    const recordingData = await this.#historyManager.showHistoryDropDown();
    if (recordingData) {
      if (recordingData.type === "LANDING_PAGE") {
        this.#changeView({ mode: "LANDING_PAGE" });
      } else {
        this.#changeView({
          mode: "VIEWING_TRACE",
          traceIndex: recordingData.parsedTraceIndex,
          forceOpenSidebar: false
        });
      }
    }
  }
  navigateHistory(direction) {
    const recordingData = this.#historyManager.navigate(direction);
    if (recordingData?.type === "TRACE_INDEX") {
      this.#changeView({
        mode: "VIEWING_TRACE",
        traceIndex: recordingData.parsedTraceIndex,
        forceOpenSidebar: false
      });
    }
    return true;
  }
  #saveModificationsForActiveTrace() {
    if (this.#viewMode.mode !== "VIEWING_TRACE") {
      return;
    }
    const newModifications = ModificationsManager.activeManager()?.toJSON();
    if (newModifications) {
      this.#traceEngineModel.overrideModifications(this.#viewMode.traceIndex, newModifications);
    }
  }
  selectFileToLoad() {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.click();
    }
  }
  async loadFromFile(file) {
    if (this.state !== "Idle") {
      return;
    }
    const content = await Common10.Gzip.fileToString(file);
    if (content.includes("enhancedTraceVersion")) {
      this.#launchRehydratedSession(content);
    } else {
      this.loader = TimelineLoader.loadFromParsedJsonFile(JSON.parse(content), this);
      this.prepareToLoadTimeline();
    }
    this.createFileSelector();
  }
  #launchRehydratedSession(traceJson) {
    let rehydratingWindow = null;
    let pathToLaunch = null;
    const url = new URL(window.location.href);
    const pathToEntrypoint = url.pathname.slice(0, url.pathname.lastIndexOf("/"));
    url.pathname = `${pathToEntrypoint}/trace_app.html`;
    url.search = "";
    pathToLaunch = url.toString();
    const hostWindow = window;
    function onMessageHandler(ev) {
      if (url && ev.data?.type === "REHYDRATING_WINDOW_READY") {
        rehydratingWindow?.postMessage({ type: "REHYDRATING_TRACE_FILE", traceJson }, url.origin);
      }
      hostWindow.removeEventListener("message", onMessageHandler);
    }
    hostWindow.addEventListener("message", onMessageHandler);
    if (this.isDocked()) {
      rehydratingWindow = hostWindow.open(
        pathToLaunch,
        /* target: */
        "_blank",
        "noopener=false,popup=false"
      );
    } else {
      rehydratingWindow = hostWindow.open(
        pathToLaunch,
        /* target: */
        void 0,
        "noopener=false,popup=true"
      );
    }
  }
  async loadFromURL(url) {
    if (this.state !== "Idle") {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = await TimelineLoader.loadFromURL(url, this);
  }
  isDocked() {
    return UI10.DockController.DockController.instance().dockSide() !== "undocked";
  }
  updateMiniMap() {
    if (this.#viewMode.mode !== "VIEWING_TRACE") {
      this.#minimapComponent.setData(null);
      return;
    }
    const parsedTrace = this.#traceEngineModel.parsedTrace(this.#viewMode.traceIndex);
    const isCpuProfile = parsedTrace?.metadata.dataOrigin === "CPUProfile";
    if (!parsedTrace) {
      return;
    }
    this.#minimapComponent.setData({
      parsedTrace,
      isCpuProfile,
      settings: {
        showScreenshots: this.showScreenshotsSetting.get(),
        showMemory: this.showMemorySetting.get()
      }
    });
  }
  onMemoryModeChanged() {
    this.flameChart.updateCountersGraphToggle(this.showMemorySetting.get());
    this.updateMiniMap();
    this.doResize();
    this.select(null);
  }
  onDimThirdPartiesChanged() {
    if (this.#viewMode.mode !== "VIEWING_TRACE") {
      return;
    }
    this.flameChart.dimThirdPartiesIfRequired();
  }
  #extensionDataVisibilityChanged() {
    this.flameChart.rebuildDataForTrace({ updateType: "REDRAW_EXISTING_TRACE" });
  }
  updateSettingsPaneVisibility() {
    if (this.#isNode || !this.canRecord()) {
      return;
    }
    if (this.showSettingsPaneSetting.get()) {
      this.showSettingsPaneButton.setToggled(true);
      this.settingsPane?.classList.remove("hidden");
    } else {
      this.showSettingsPaneButton.setToggled(false);
      this.settingsPane?.classList.add("hidden");
    }
  }
  updateShowSettingsToolbarButton() {
    const messages = [];
    if (SDK7.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate() !== 1) {
      messages.push(i18nString20(UIStrings20.CpuThrottlingIsEnabled));
    }
    if (SDK7.NetworkManager.MultitargetNetworkManager.instance().isThrottling()) {
      messages.push(i18nString20(UIStrings20.NetworkThrottlingIsEnabled));
    }
    if (this.captureLayersAndPicturesSetting.get()) {
      messages.push(i18nString20(UIStrings20.SignificantOverheadDueToPaint));
    }
    if (this.captureSelectorStatsSetting.get()) {
      messages.push(i18nString20(UIStrings20.SelectorStatsEnabled));
    }
    if (this.disableCaptureJSProfileSetting.get()) {
      messages.push(i18nString20(UIStrings20.JavascriptSamplingIsDisabled));
    }
    this.showSettingsPaneButton.setChecked(messages.length > 0);
    this.showSettingsPaneButton.element.style.setProperty("--dot-toggle-top", "16px");
    this.showSettingsPaneButton.element.style.setProperty("--dot-toggle-left", "15px");
    if (messages.length) {
      const tooltipElement = document.createElement("div");
      messages.forEach((message) => {
        tooltipElement.createChild("div").textContent = message;
      });
      this.showSettingsPaneButton.setTitle(tooltipElement.textContent || "");
    } else {
      this.showSettingsPaneButton.setTitle(i18nString20(UIStrings20.captureSettings));
    }
  }
  setUIControlsEnabled(enabled) {
    this.recordingOptionUIControls.forEach((control) => control.setEnabled(enabled));
  }
  async #evaluateInspectedURL() {
    if (!this.controller) {
      return Platform11.DevToolsPath.EmptyUrlString;
    }
    const inspectedURL = this.controller.primaryPageTarget.inspectedURL();
    const resourceTreeModel = this.controller.primaryPageTarget.model(SDK7.ResourceTreeModel.ResourceTreeModel);
    const navHistory = resourceTreeModel && await resourceTreeModel.navigationHistory();
    if (!resourceTreeModel || !navHistory) {
      return inspectedURL;
    }
    const { currentIndex, entries } = navHistory;
    const navigationEntry = entries[currentIndex];
    return navigationEntry.url;
  }
  async #navigateToAboutBlank() {
    const aboutBlankNavigationComplete = new Promise(async (resolve, reject) => {
      if (!this.controller) {
        reject("Could not find TimelineController");
        return;
      }
      const target = this.controller.primaryPageTarget;
      const resourceModel = target.model(SDK7.ResourceTreeModel.ResourceTreeModel);
      if (!resourceModel) {
        reject("Could not load resourceModel");
        return;
      }
      function waitForAboutBlank(event) {
        if (event.data.url === "about:blank") {
          resolve();
        } else {
          reject(`Unexpected navigation to ${event.data.url}`);
        }
        resourceModel?.removeEventListener(SDK7.ResourceTreeModel.Events.FrameNavigated, waitForAboutBlank);
      }
      resourceModel.addEventListener(SDK7.ResourceTreeModel.Events.FrameNavigated, waitForAboutBlank);
      await resourceModel.navigate("about:blank");
    });
    await aboutBlankNavigationComplete;
  }
  async #startCPUProfilingRecording() {
    try {
      this.cpuProfiler = UI10.Context.Context.instance().flavor(SDK7.CPUProfilerModel.CPUProfilerModel);
      if (!this.cpuProfiler) {
        const firstNodeTarget = SDK7.TargetManager.TargetManager.instance().targets().find((target) => target.type() === SDK7.Target.Type.NODE);
        if (!firstNodeTarget) {
          throw new Error("Could not load any Node target.");
        }
        if (firstNodeTarget) {
          this.cpuProfiler = firstNodeTarget.model(SDK7.CPUProfilerModel.CPUProfilerModel);
        }
      }
      this.setUIControlsEnabled(false);
      this.#changeView({ mode: "STATUS_PANE_OVERLAY" });
      if (!this.cpuProfiler) {
        throw new Error("No Node target is found.");
      }
      await SDK7.TargetManager.TargetManager.instance().suspendAllTargets("performance-timeline");
      await this.cpuProfiler.startRecording();
      this.recordingStarted();
    } catch (e) {
      await this.recordingFailed(e.message);
    }
  }
  async #startTraceRecording() {
    try {
      const rootTarget = SDK7.TargetManager.TargetManager.instance().rootTarget();
      const primaryPageTarget = SDK7.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!primaryPageTarget) {
        throw new Error("Could not load primary page target.");
      }
      if (!rootTarget) {
        throw new Error("Could not load root target.");
      }
      if (UIDevtoolsUtils.isUiDevTools()) {
        this.controller = new UIDevtoolsController(rootTarget, primaryPageTarget, this);
      } else {
        this.controller = new TimelineController(rootTarget, primaryPageTarget, this);
      }
      this.setUIControlsEnabled(false);
      this.#changeView({ mode: "STATUS_PANE_OVERLAY" });
      if (!this.controller) {
        throw new Error("Could not create Timeline controller");
      }
      const urlToTrace = await this.#evaluateInspectedURL();
      if (this.recordingPageReload) {
        await this.#navigateToAboutBlank();
      }
      const recordingOptions = {
        enableJSSampling: !this.disableCaptureJSProfileSetting.get(),
        capturePictures: this.captureLayersAndPicturesSetting.get(),
        captureFilmStrip: this.showScreenshotsSetting.get(),
        captureSelectorStats: this.captureSelectorStatsSetting.get()
      };
      const response = await this.controller.startRecording(recordingOptions);
      if (response.getError()) {
        throw new Error(response.getError());
      }
      const recordingConfig = this.recordingPageReload ? { navigateToUrl: urlToTrace } : void 0;
      this.recordingStarted(recordingConfig);
    } catch (e) {
      await this.recordingFailed(e.message);
    }
  }
  async startRecording() {
    console.assert(!this.statusDialog, "Status pane is already opened.");
    this.setState(
      "StartPending"
      /* State.START_PENDING */
    );
    this.showRecordingStarted();
    if (this.#isNode) {
      await this.#startCPUProfilingRecording();
    } else {
      await this.#startTraceRecording();
    }
    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_RECORDING_STARTED);
  }
  async stopRecording() {
    if (this.statusDialog) {
      this.statusDialog.finish();
      this.statusDialog.updateStatus(i18nString20(UIStrings20.stoppingTimeline));
      this.statusDialog.updateProgressBar(i18nString20(UIStrings20.received), 0);
    }
    this.setState(
      "StopPending"
      /* State.STOP_PENDING */
    );
    if (this.controller) {
      await this.controller.stopRecording();
      this.setUIControlsEnabled(true);
      await this.controller.dispose();
      this.controller = null;
      return;
    }
    if (this.cpuProfiler) {
      const profile = await this.cpuProfiler.stopRecording();
      this.setState(
        "Idle"
        /* State.IDLE */
      );
      this.loadFromCpuProfile(profile);
      this.setUIControlsEnabled(true);
      this.cpuProfiler = null;
      await SDK7.TargetManager.TargetManager.instance().resumeAllTargets();
    }
  }
  async recordingFailed(error, rawEvents) {
    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = new StatusDialog(
      {
        description: error,
        buttonText: i18nString20(UIStrings20.close),
        hideStopButton: true,
        showProgress: void 0,
        showTimer: void 0
      },
      // When recording failed, we should load null to go back to the landing page.
      async () => {
        this.statusDialog?.remove();
        await this.loadingComplete(
          /* no collectedEvents */
          [],
          /* exclusiveFilter= */
          null,
          /* metadata= */
          null
        );
      }
    );
    this.statusDialog.showPane(this.statusPaneContainer);
    this.statusDialog.updateStatus(i18nString20(UIStrings20.recordingFailed));
    if (rawEvents) {
      this.statusDialog.enableDownloadOfEvents(rawEvents);
    }
    this.setState(
      "RecordingFailed"
      /* State.RECORDING_FAILED */
    );
    this.traceLoadStart = null;
    this.setUIControlsEnabled(true);
    if (this.controller) {
      await this.controller.dispose();
      this.controller = null;
    }
    void SDK7.TargetManager.TargetManager.instance().resumeAllTargets();
  }
  onSuspendStateChanged() {
    this.updateTimelineControls();
  }
  consoleProfileFinished(data) {
    this.loadFromCpuProfile(data.cpuProfile);
    void UI10.InspectorView.InspectorView.instance().showPanel("timeline");
  }
  updateTimelineControls() {
    if (this.#viewMode.mode === "VIEWING_TRACE") {
      this.#addSidebarIconToToolbar();
    }
    const exportTraceOptionsElement = this.saveButton.element;
    exportTraceOptionsElement.data = {
      onExport: this.saveToFile.bind(this),
      buttonEnabled: this.state === "Idle" && this.#hasActiveTrace()
    };
    this.#historyManager.setEnabled(
      this.state === "Idle"
      /* State.IDLE */
    );
    this.clearButton.setEnabled(
      this.state === "Idle"
      /* State.IDLE */
    );
    this.dropTarget.setEnabled(
      this.state === "Idle"
      /* State.IDLE */
    );
    this.loadButton.setEnabled(
      this.state === "Idle"
      /* State.IDLE */
    );
    this.toggleRecordAction.setToggled(
      this.state === "Recording"
      /* State.RECORDING */
    );
    this.toggleRecordAction.setEnabled(
      this.state === "Recording" || this.state === "Idle"
      /* State.IDLE */
    );
    this.askAiButton?.setEnabled(this.state === "Idle" && this.#hasActiveTrace());
    this.panelToolbar.setEnabled(
      this.state !== "Loading"
      /* State.LOADING */
    );
    this.panelRightToolbar.setEnabled(
      this.state !== "Loading"
      /* State.LOADING */
    );
    if (!this.canRecord()) {
      return;
    }
    this.recordReloadAction.setEnabled(
      this.#isNode ? false : this.state === "Idle"
      /* State.IDLE */
    );
    this.homeButton?.setEnabled(this.state === "Idle" && this.#hasActiveTrace());
  }
  async toggleRecording() {
    if (this.state === "Idle") {
      this.recordingPageReload = false;
      await this.startRecording();
      Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.TimelineStarted);
    } else if (this.state === "Recording") {
      await this.stopRecording();
    }
  }
  recordReload() {
    if (this.state !== "Idle") {
      return;
    }
    this.recordingPageReload = true;
    void this.startRecording();
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.TimelinePageReloadStarted);
  }
  onClearButton() {
    this.#historyManager.clear();
    this.#traceEngineModel = this.#instantiateNewModel();
    ModificationsManager.reset();
    this.#uninstallSourceMapsResolver();
    this.flameChart.getMainDataProvider().reset();
    this.flameChart.getNetworkDataProvider().reset();
    this.flameChart.reset();
    this.#changeView({ mode: "LANDING_PAGE" });
    UI10.Context.Context.instance().setFlavor(AiAssistanceModel.AIContext.AgentFocus, null);
  }
  #hasActiveTrace() {
    return this.#viewMode.mode === "VIEWING_TRACE";
  }
  #applyActiveFilters(traceIsGeneric, exclusiveFilter = null) {
    if (traceIsGeneric || Root4.Runtime.experiments.isEnabled("timeline-show-all-events")) {
      return;
    }
    const newActiveFilters = exclusiveFilter ? [exclusiveFilter] : [
      TimelineUIUtils.visibleEventsFilter()
    ];
    ActiveFilters.instance().setFilters(newActiveFilters);
  }
  /**
   * Called when we update the active trace that is being shown to the user.
   * This is called from {@link TimelinePanel.#changeView} when we change the UI to show a
   * trace - either one the user has just recorded/imported, or one they have
   * navigated to via the dropdown.
   *
   * If you need code to execute whenever the active trace changes, this is the method to use.
   * If you need code to execute ONLY ON NEW TRACES, then use {@link TimelinePanel.loadingComplete}
   * You should not call this method directly if you want the UI to update; use
   * {@link TimelinePanel.#changeView} to control what is shown to the user.
   */
  #setModelForActiveTrace() {
    if (this.#viewMode.mode !== "VIEWING_TRACE") {
      return;
    }
    const { traceIndex } = this.#viewMode;
    const parsedTrace = this.#traceEngineModel.parsedTrace(traceIndex);
    const syntheticEventsManager = this.#traceEngineModel.syntheticTraceEventsManager(traceIndex);
    if (!parsedTrace || !syntheticEventsManager) {
      console.error(`setModelForActiveTrace was called with an invalid trace index: ${traceIndex}`);
      this.#changeView({ mode: "LANDING_PAGE" });
      return;
    }
    Trace23.Helpers.SyntheticEvents.SyntheticEventsManager.activate(syntheticEventsManager);
    this.#minimapComponent.reset();
    const data = parsedTrace.data;
    TraceBounds9.TraceBounds.BoundsManager.instance().resetWithNewBounds(data.Meta.traceBounds);
    const currentManager = ModificationsManager.initAndActivateModificationsManager(this.#traceEngineModel, traceIndex);
    if (!currentManager) {
      console.error("ModificationsManager could not be created or activated.");
    }
    this.statusDialog?.updateProgressBar(i18nString20(UIStrings20.processed), 70);
    this.flameChart.setModel(parsedTrace, this.#eventToRelatedInsights);
    this.flameChart.resizeToPreferredHeights();
    void this.flameChart.setSelectionAndReveal(null);
    this.#sideBar.setParsedTrace(parsedTrace);
    this.#searchableView.showWidget();
    const exclusiveFilter = this.#exclusiveFilterPerTrace.get(traceIndex) ?? null;
    this.#applyActiveFilters(parsedTrace.data.Meta.traceIsGeneric, exclusiveFilter);
    this.saveButton.element.updateContentVisibility({
      annotationsExist: currentManager ? currentManager.getAnnotations()?.length > 0 : false
    });
    currentManager?.addEventListener(AnnotationModifiedEvent.eventName, this.#onAnnotationModifiedEventBound);
    const topMostMainThreadAppender = this.flameChart.getMainDataProvider().compatibilityTracksAppenderInstance().threadAppenders().at(0);
    if (topMostMainThreadAppender) {
      const zoomedInBounds = Trace23.Extras.MainThreadActivity.calculateWindow(parsedTrace.data.Meta.traceBounds, topMostMainThreadAppender.getEntries());
      TraceBounds9.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(zoomedInBounds);
    }
    const currModificationManager = ModificationsManager.activeManager();
    if (currModificationManager) {
      const annotations = currModificationManager.getAnnotations();
      const annotationEntryToColorMap = this.buildColorsAnnotationsMap(annotations);
      this.#sideBar.setAnnotations(annotations, annotationEntryToColorMap);
      this.flameChart.bulkAddOverlays(currModificationManager.getOverlays());
    }
    const primaryPageTarget = SDK7.TargetManager.TargetManager.instance().primaryPageTarget();
    const cpuProfiles = Array.from(parsedTrace.data.Samples.profilesInProcess).flatMap(([_processId, threadsInProcess]) => {
      const profiles = Array.from(threadsInProcess.values()).map((profileData) => profileData.parsedProfile);
      return profiles;
    });
    PerfUI12.LineLevelProfile.Performance.instance().initialize(cpuProfiles, primaryPageTarget);
    this.#entityMapper = new Trace23.EntityMapper.EntityMapper(parsedTrace);
    this.#sourceMapsResolver = new SourceMapsResolver.SourceMapsResolver(parsedTrace, this.#entityMapper);
    this.#sourceMapsResolver.addEventListener(SourceMapsResolver.SourceMappingsUpdated.eventName, this.#onSourceMapsNodeNamesResolvedBound);
    void this.#sourceMapsResolver.install();
    this.#entityMapper = new Trace23.EntityMapper.EntityMapper(parsedTrace);
    this.statusDialog?.updateProgressBar(i18nString20(UIStrings20.processed), 80);
    this.updateMiniMap();
    this.statusDialog?.updateProgressBar(i18nString20(UIStrings20.processed), 90);
    this.updateTimelineControls();
    this.#maybeCreateHiddenTracksBanner(parsedTrace);
    this.#setActiveInsight(null);
    this.#eventToRelatedInsights.clear();
    if (parsedTrace.insights) {
      for (const [insightSetKey, insightSet] of parsedTrace.insights) {
        for (const model of Object.values(insightSet.model)) {
          let relatedEvents = model.relatedEvents;
          if (!relatedEvents) {
            relatedEvents = /* @__PURE__ */ new Map();
          } else if (Array.isArray(relatedEvents)) {
            relatedEvents = new Map(relatedEvents.map((e) => [e, []]));
          }
          for (const [event, messages] of relatedEvents.entries()) {
            const relatedInsights = this.#eventToRelatedInsights.get(event) ?? [];
            this.#eventToRelatedInsights.set(event, relatedInsights);
            relatedInsights.push({
              insightLabel: model.title,
              messages,
              activateInsight: () => {
                this.#setActiveInsight({ model, insightSetKey });
              }
            });
          }
        }
      }
    }
    if (this.#traceEngineModel.size() === 1) {
      this.#setupNavigationSetting();
      if (Common10.Settings.moduleSetting("flamechart-selected-navigation").get() === "classic") {
        Host2.userMetrics.navigationSettingAtFirstTimelineLoad(
          0
          /* Host.UserMetrics.TimelineNavigationSetting.CLASSIC_AT_SESSION_FIRST_TRACE */
        );
      } else {
        Host2.userMetrics.navigationSettingAtFirstTimelineLoad(
          1
          /* Host.UserMetrics.TimelineNavigationSetting.MODERN_AT_SESSION_FIRST_TRACE */
        );
      }
    }
    if (parsedTrace.metadata.dataOrigin !== "CPUProfile") {
      UI10.Context.Context.instance().setFlavor(AiAssistanceModel.AIContext.AgentFocus, AiAssistanceModel.AIContext.AgentFocus.fromParsedTrace(parsedTrace));
    }
  }
  #onAnnotationModifiedEvent(e) {
    const event = e;
    const announcementText = ariaAnnouncementForModifiedEvent(event);
    if (announcementText) {
      UI10.ARIAUtils.LiveAnnouncer.alert(announcementText);
    }
    const { overlay, action: action2 } = event;
    if (action2 === "Add") {
      this.flameChart.addOverlay(overlay);
    } else if (action2 === "Remove") {
      this.flameChart.removeOverlay(overlay);
    } else if (action2 === "UpdateTimeRange" && isTimeRangeLabel(overlay)) {
      this.flameChart.updateExistingOverlay(overlay, {
        bounds: overlay.bounds
      });
    } else if (action2 === "UpdateLinkToEntry" && isEntriesLink(overlay)) {
      this.flameChart.updateExistingOverlay(overlay, {
        entryTo: overlay.entryTo
      });
    } else if (action2 === "EnterLabelEditState" && isEntryLabel(overlay)) {
      this.flameChart.enterLabelEditMode(overlay);
    } else if (action2 === "LabelBringForward" && isEntryLabel(overlay)) {
      this.flameChart.bringLabelForward(overlay);
    }
    const currentManager = ModificationsManager.activeManager();
    const annotations = currentManager?.getAnnotations() ?? [];
    const annotationEntryToColorMap = this.buildColorsAnnotationsMap(annotations);
    this.#sideBar.setAnnotations(annotations, annotationEntryToColorMap);
    this.saveButton.element.updateContentVisibility({
      annotationsExist: currentManager ? currentManager.getAnnotations()?.length > 0 : false
    });
  }
  /**
   * After the user imports / records a trace, we auto-show the sidebar.
   */
  #showSidebar() {
    const disabledByLocalStorageForTests = window.localStorage.getItem("disable-auto-show-rpp-sidebar-for-test") === "true";
    if (disabledByLocalStorageForTests) {
      return;
    }
    if (!this.#splitWidget.sidebarIsShowing()) {
      this.#splitWidget.showBoth();
    }
  }
  // Build a map mapping annotated entries to the colours that are used to display them in the FlameChart.
  // We need this map to display the entries in the sidebar with the same colours.
  buildColorsAnnotationsMap(annotations) {
    const annotationEntryToColorMap = /* @__PURE__ */ new Map();
    for (const annotation of annotations) {
      if (Trace23.Types.File.isEntryLabelAnnotation(annotation)) {
        annotationEntryToColorMap.set(annotation.entry, this.getEntryColorByEntry(annotation.entry));
      } else if (Trace23.Types.File.isEntriesLinkAnnotation(annotation)) {
        annotationEntryToColorMap.set(annotation.entryFrom, this.getEntryColorByEntry(annotation.entryFrom));
        if (annotation.entryTo) {
          annotationEntryToColorMap.set(annotation.entryTo, this.getEntryColorByEntry(annotation.entryTo));
        }
      }
    }
    return annotationEntryToColorMap;
  }
  /**
   * If the user imports or records a trace and we have any hidden tracks, we
   * show a warning banner at the bottom. This can be dismissed by the user and
   * if that happens we do not want to bring it back again.
   */
  #maybeCreateHiddenTracksBanner(parsedTrace) {
    const hasHiddenTracks = this.flameChart.hasHiddenTracks();
    if (!hasHiddenTracks) {
      return;
    }
    const maybeOverlay = createHiddenTracksOverlay(parsedTrace, {
      onClose: () => {
        this.flameChart.overlays().removeOverlaysOfType("BOTTOM_INFO_BAR");
        this.#hiddenTracksInfoBarByParsedTrace.set(parsedTrace, "DISMISSED");
      },
      onShowAllTracks: () => {
        this.flameChart.showAllMainChartTracks();
      },
      onShowTrackConfigurationMode: () => {
        this.flameChart.enterMainChartTrackConfigurationMode();
      }
    });
    if (maybeOverlay) {
      this.flameChart.addOverlay(maybeOverlay);
    }
  }
  getEntryColorByEntry(entry) {
    const mainIndex = this.flameChart.getMainDataProvider().indexForEvent(entry);
    const networkIndex = this.flameChart.getNetworkDataProvider().indexForEvent(entry);
    if (mainIndex !== null) {
      const color = this.flameChart.getMainDataProvider().entryColor(mainIndex);
      if (color === "white") {
        return ThemeSupport17.ThemeSupport.instance().getComputedValue("--app-color-system");
      }
      return color;
    }
    if (networkIndex !== null) {
      const color = this.flameChart.getNetworkDataProvider().entryColor(networkIndex);
      return color;
    }
    console.warn("Could not get entry color for ", entry);
    return ThemeSupport17.ThemeSupport.instance().getComputedValue("--app-color-system");
  }
  recordingStarted(config) {
    if (config && this.recordingPageReload && this.controller) {
      const resourceModel = this.controller?.primaryPageTarget.model(SDK7.ResourceTreeModel.ResourceTreeModel);
      if (!resourceModel) {
        void this.recordingFailed("Could not navigate to original URL");
        return;
      }
      void resourceModel.navigate(config.navigateToUrl);
    }
    this.#changeView({ mode: "STATUS_PANE_OVERLAY" });
    this.setState(
      "Recording"
      /* State.RECORDING */
    );
    this.showRecordingStarted();
    if (this.statusDialog) {
      this.statusDialog.enableAndFocusButton();
      this.statusDialog.updateStatus(i18nString20(UIStrings20.tracing));
      this.statusDialog.updateProgressBar(i18nString20(UIStrings20.bufferUsage), 0);
      this.statusDialog.startTimer();
    }
  }
  recordingProgress(usage) {
    if (this.statusDialog) {
      this.statusDialog.updateProgressBar(i18nString20(UIStrings20.bufferUsage), usage * 100);
    }
  }
  /**
   * Hide the sidebar, but persist the user's state, because when they import a
   * trace we want to revert the sidebar back to what it was.
   */
  #hideSidebar() {
    if (this.#splitWidget.sidebarIsShowing()) {
      this.#splitWidget.hideSidebar();
    }
  }
  #showLandingPage() {
    this.updateSettingsPaneVisibility();
    this.#removeSidebarIconFromToolbar();
    this.#hideSidebar();
    if (this.landingPage) {
      this.landingPage.show(this.statusPaneContainer);
      return;
    }
    const liveMetrics = new TimelineComponents3.LiveMetricsView.LiveMetricsView();
    this.landingPage = LegacyWrapper.LegacyWrapper.legacyWrapper(UI10.Widget.Widget, liveMetrics);
    this.landingPage.element.classList.add("timeline-landing-page", "fill");
    this.landingPage.contentElement.classList.add("fill");
    this.landingPage.show(this.statusPaneContainer);
  }
  #hideLandingPage() {
    this.landingPage.detach();
    this.showSettingsPaneButton?.setToggled(false);
    this.settingsPane?.classList.add("hidden");
  }
  async loadingStarted() {
    this.#changeView({ mode: "STATUS_PANE_OVERLAY" });
    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = new StatusDialog({
      showProgress: true,
      showTimer: void 0,
      hideStopButton: true,
      buttonText: void 0,
      description: void 0
    }, () => this.cancelLoading());
    this.statusDialog.showPane(this.statusPaneContainer);
    this.statusDialog.updateStatus(i18nString20(UIStrings20.loadingTrace));
    if (!this.loader) {
      this.statusDialog.finish();
    }
    this.traceLoadStart = Trace23.Types.Timing.Milli(performance.now());
    await this.loadingProgress(0);
  }
  async loadingProgress(progress) {
    if (typeof progress === "number" && this.statusDialog) {
      this.statusDialog.updateProgressBar(i18nString20(UIStrings20.received), progress * 100);
    }
  }
  async processingStarted() {
    this.statusDialog?.updateStatus(i18nString20(UIStrings20.processingTrace));
  }
  #listenForProcessingProgress() {
    this.#traceEngineModel.addEventListener(Trace23.TraceModel.ModelUpdateEvent.eventName, (e) => {
      const updateEvent = e;
      const str = i18nString20(UIStrings20.processed);
      const traceParseMaxProgress = 0.7;
      if (updateEvent.data.type === "COMPLETE") {
        this.statusDialog?.updateProgressBar(str, 100 * traceParseMaxProgress);
      } else if (updateEvent.data.type === "PROGRESS_UPDATE") {
        const data = updateEvent.data.data;
        this.statusDialog?.updateProgressBar(str, data.percent * 100 * traceParseMaxProgress);
      }
    });
  }
  #onSourceMapsNodeNamesResolved() {
    this.flameChart.getMainDataProvider().timelineData(true);
    this.flameChart.getMainFlameChart().update();
  }
  /**
   * This is called with we are done loading a trace from a file, or after we
   * have recorded a fresh trace.
   *
   * IMPORTANT: All the code in here should be code that is only required when we have
   * recorded or imported from disk a brand new trace. If you need the code to
   * run when the user switches to an existing trace, please @see
   * #setModelForActiveTrace and put your code in there.
   **/
  async loadingComplete(collectedEvents, exclusiveFilter = null, metadata) {
    this.#traceEngineModel.resetProcessor();
    delete this.loader;
    const recordingIsFresh = this.state === "StopPending";
    this.setState(
      "Idle"
      /* State.IDLE */
    );
    if (collectedEvents.length === 0) {
      if (this.#traceEngineModel.size()) {
        this.#changeView({
          mode: "VIEWING_TRACE",
          traceIndex: this.#traceEngineModel.lastTraceIndex(),
          forceOpenSidebar: false
        });
      } else {
        this.#changeView({ mode: "LANDING_PAGE" });
      }
      return;
    }
    try {
      await this.#executeNewTrace(collectedEvents, recordingIsFresh, metadata);
      const traceIndex = this.#traceEngineModel.lastTraceIndex();
      if (exclusiveFilter) {
        this.#exclusiveFilterPerTrace.set(traceIndex, exclusiveFilter);
      }
      this.#changeView({
        mode: "VIEWING_TRACE",
        traceIndex,
        // This is a new trace, so we want to open the insights sidebar automatically.
        forceOpenSidebar: true
      });
      const parsedTrace = this.#traceEngineModel.parsedTrace(traceIndex);
      if (!parsedTrace) {
        throw new Error(`Could not get trace data at index ${traceIndex}`);
      }
      if (recordingIsFresh) {
        Tracing3.FreshRecording.Tracker.instance().registerFreshRecording(parsedTrace);
      }
      this.#historyManager.addRecording({
        data: {
          parsedTraceIndex: traceIndex,
          type: "TRACE_INDEX"
        },
        filmStripForPreview: Trace23.Extras.FilmStrip.fromHandlerData(parsedTrace.data),
        parsedTrace
      });
      this.dispatchEventToListeners("RecordingCompleted", {
        traceIndex
      });
    } catch (error) {
      void this.recordingFailed(error.message, collectedEvents);
      console.error(error);
      this.dispatchEventToListeners("RecordingCompleted", { errorText: error.message });
    } finally {
      this.recordTraceLoadMetric();
    }
  }
  recordTraceLoadMetric() {
    if (!this.traceLoadStart) {
      return;
    }
    const start = this.traceLoadStart;
    requestAnimationFrame(() => {
      setTimeout(() => {
        const end = Trace23.Types.Timing.Milli(performance.now());
        const measure = performance.measure("TraceLoad", { start, end });
        const duration = Trace23.Types.Timing.Milli(measure.duration);
        this.element.dispatchEvent(new TraceLoadEvent(duration));
        Host2.userMetrics.performanceTraceLoad(measure);
      }, 0);
    });
  }
  /**
   * Store source maps on trace metadata (but just the non-data url ones).
   *
   * Many raw source maps are already in memory, but there are some cases where they may
   * not be and have to be fetched here:
   *
   * 1. If the trace processor (via `#createSourceMapResolver`) never fetched it,
   *    due to `ScriptHandler` skipping the script if it could not find an associated frame.
   * 2. If the initial fetch failed (perhaps the failure was intermittent and a
   *    subsequent attempt will work).
   */
  async #retainSourceMapsForEnhancedTrace(parsedTrace, metadata) {
    const handleScript = async (script) => {
      if (script.sourceMapUrlElided) {
        if (metadata.sourceMaps?.find((m) => m.url === script.url)) {
          return;
        }
        const rawSourceMap2 = script.sourceMap?.json();
        if (rawSourceMap2 && script.url) {
          metadata.sourceMaps?.push({ url: script.url, sourceMap: rawSourceMap2 });
        }
        return;
      }
      if (!script.sourceMapUrl || script.sourceMapUrl.startsWith("data:")) {
        return;
      }
      if (metadata.sourceMaps?.find((m) => m.sourceMapUrl === script.sourceMapUrl)) {
        return;
      }
      let rawSourceMap = script.sourceMap?.json();
      if (!rawSourceMap && !script.sourceMapUrlElided) {
        const initiator = {
          target: null,
          frameId: script.frame,
          initiatorUrl: script.url
        };
        rawSourceMap = await SDK7.SourceMapManager.tryLoadSourceMap(this.#resourceLoader, script.sourceMapUrl, initiator);
      }
      if (script.url && rawSourceMap) {
        metadata.sourceMaps?.push({ url: script.url, sourceMapUrl: script.sourceMapUrl, sourceMap: rawSourceMap });
      }
    };
    metadata.sourceMaps = [];
    const promises = [];
    for (const script of parsedTrace?.data.Scripts.scripts.values() ?? []) {
      promises.push(handleScript(script));
    }
    await Promise.all(promises);
  }
  #createSourceMapResolver(isFreshRecording, metadata) {
    const debuggerModelForFrameId = /* @__PURE__ */ new Map();
    for (const target of SDK7.TargetManager.TargetManager.instance().targets()) {
      const debuggerModel = target.model(SDK7.DebuggerModel.DebuggerModel);
      if (!debuggerModel) {
        continue;
      }
      const resourceModel = target.model(SDK7.ResourceTreeModel.ResourceTreeModel);
      const activeFrameIds = (resourceModel?.frames() ?? []).map((frame) => frame.id);
      for (const frameId of activeFrameIds) {
        debuggerModelForFrameId.set(frameId, debuggerModel);
      }
    }
    async function getExistingSourceMap(frame, scriptId, scriptUrl) {
      const debuggerModel = debuggerModelForFrameId.get(frame);
      if (!debuggerModel) {
        return;
      }
      const script = debuggerModel.scriptForId(scriptId);
      if (!script || scriptUrl && scriptUrl !== script.sourceURL) {
        return;
      }
      return await debuggerModel.sourceMapManager().sourceMapForClientPromise(script);
    }
    return async function resolveSourceMap(params) {
      const { scriptId, scriptUrl, sourceUrl, sourceMapUrl, frame, cachedRawSourceMap } = params;
      if (cachedRawSourceMap) {
        return new SDK7.SourceMap.SourceMap(sourceUrl, sourceMapUrl ?? "", cachedRawSourceMap);
      }
      if (isFreshRecording) {
        const map = await getExistingSourceMap(frame, scriptId, scriptUrl);
        if (map) {
          return map;
        }
      }
      if (!sourceMapUrl) {
        return null;
      }
      const isDataUrl = sourceMapUrl.startsWith("data:");
      if (!isFreshRecording && metadata?.sourceMaps && !isDataUrl) {
        const cachedSourceMap = metadata.sourceMaps.find((m) => m.sourceMapUrl === sourceMapUrl);
        if (cachedSourceMap) {
          return new SDK7.SourceMap.SourceMap(sourceUrl, sourceMapUrl, cachedSourceMap.sourceMap);
        }
      }
      if (!isFreshRecording && !isDataUrl) {
        return null;
      }
      if (!sourceUrl) {
        return null;
      }
      const initiator = {
        target: debuggerModelForFrameId.get(frame)?.target() ?? null,
        frameId: frame,
        initiatorUrl: sourceUrl
      };
      const payload = await SDK7.SourceMapManager.tryLoadSourceMap(_TimelinePanel.instance().#resourceLoader, sourceMapUrl, initiator);
      return payload ? new SDK7.SourceMap.SourceMap(sourceUrl, sourceMapUrl, payload) : null;
    };
  }
  async #retainResourceContentsForEnhancedTrace(parsedTrace, metadata) {
    const resourceTypesToRetain = /* @__PURE__ */ new Set([
      "Document",
      "Stylesheet"
      /* Protocol.Network.ResourceType.Stylesheet */
    ]);
    for (const request of parsedTrace.data.NetworkRequests.byId.values()) {
      if (!resourceTypesToRetain.has(request.args.data.resourceType)) {
        continue;
      }
      const url = request.args.data.url;
      const resource = SDK7.ResourceTreeModel.ResourceTreeModel.resourceForURL(url);
      if (!resource) {
        continue;
      }
      const content = await resource.requestContentData();
      if ("error" in content) {
        continue;
      }
      if (!content.isTextContent) {
        continue;
      }
      if (!metadata.resources) {
        metadata.resources = [];
      }
      metadata.resources.push({
        url,
        frame: resource.frameId ?? "",
        content: content.text,
        mimeType: content.mimeType
      });
    }
  }
  async #executeNewTrace(collectedEvents, isFreshRecording, metadata) {
    const config = {
      metadata: metadata ?? void 0,
      isFreshRecording,
      resolveSourceMap: this.#createSourceMapResolver(isFreshRecording, metadata),
      isCPUProfile: metadata?.dataOrigin === "CPUProfile"
    };
    if (window.location.href.includes("devtools/bundled") || window.location.search.includes("debugFrontend")) {
      const times = {};
      config.logger = {
        start(id) {
          times[id] = performance.now();
        },
        end(id) {
          performance.measure(id, { start: times[id] });
        }
      };
    }
    await this.#traceEngineModel.parse(collectedEvents, config);
    if (isFreshRecording && metadata) {
      const traceIndex = this.#traceEngineModel.lastTraceIndex();
      const parsedTrace = this.#traceEngineModel.parsedTrace(traceIndex);
      if (parsedTrace) {
        await this.#retainSourceMapsForEnhancedTrace(parsedTrace, metadata);
        await this.#retainResourceContentsForEnhancedTrace(parsedTrace, metadata);
      }
    }
  }
  loadingCompleteForTest() {
  }
  showRecordingStarted() {
    this.#changeView({ mode: "STATUS_PANE_OVERLAY" });
    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = new StatusDialog({
      showTimer: true,
      showProgress: true,
      hideStopButton: false,
      description: void 0,
      buttonText: void 0
    }, () => this.stopRecording());
    this.statusDialog.showPane(this.statusPaneContainer);
    this.statusDialog.updateStatus(i18nString20(UIStrings20.initializingTracing));
    this.statusDialog.updateProgressBar(i18nString20(UIStrings20.bufferUsage), 0);
  }
  cancelLoading() {
    if (this.loader) {
      void this.loader.cancel();
    }
  }
  async loadEventFired(event) {
    if (this.state !== "Recording" || !this.recordingPageReload || this.controller?.primaryPageTarget !== event.data.resourceTreeModel.target()) {
      return;
    }
    const controller = this.controller;
    await new Promise((r) => window.setTimeout(r, this.millisecondsToRecordAfterLoadEvent));
    if (controller !== this.controller || this.state !== "Recording") {
      return;
    }
    void this.stopRecording();
  }
  frameForSelection(selection) {
    if (this.#viewMode.mode !== "VIEWING_TRACE") {
      return null;
    }
    if (selectionIsRange(selection)) {
      return null;
    }
    if (Trace23.Types.Events.isSyntheticNetworkRequest(selection.event)) {
      return null;
    }
    const parsedTrace = this.#traceEngineModel.parsedTrace(this.#viewMode.traceIndex);
    if (!parsedTrace) {
      return null;
    }
    const endTime = rangeForSelection(selection).max;
    const lastFrameInSelection = Trace23.Handlers.ModelHandlers.Frames.framesWithinWindow(parsedTrace.data.Frames.frames, endTime, endTime).at(0);
    return lastFrameInSelection || null;
  }
  jumpToFrame(offset) {
    if (this.#viewMode.mode !== "VIEWING_TRACE") {
      return;
    }
    const currentFrame = this.selection && this.frameForSelection(this.selection);
    if (!currentFrame) {
      return;
    }
    const parsedTrace = this.#traceEngineModel.parsedTrace(this.#viewMode.traceIndex);
    if (!parsedTrace) {
      return;
    }
    let index = parsedTrace.data.Frames.frames.indexOf(currentFrame);
    console.assert(index >= 0, "Can't find current frame in the frame list");
    index = Platform11.NumberUtilities.clamp(index + offset, 0, parsedTrace.data.Frames.frames.length - 1);
    const frame = parsedTrace.data.Frames.frames[index];
    this.#revealTimeRange(Trace23.Helpers.Timing.microToMilli(frame.startTime), Trace23.Helpers.Timing.microToMilli(frame.endTime));
    this.select(selectionFromEvent(frame));
    return true;
  }
  #announceSelectionToAria(oldSelection, newSelection) {
    if (oldSelection !== null && newSelection === null) {
      UI10.ARIAUtils.LiveAnnouncer.alert(i18nString20(UIStrings20.selectionCleared));
    }
    if (newSelection === null) {
      return;
    }
    if (oldSelection && selectionsEqual(oldSelection, newSelection)) {
      return;
    }
    if (selectionIsRange(newSelection)) {
      return;
    }
    if (Trace23.Types.Events.isLegacyTimelineFrame(newSelection.event)) {
      UI10.ARIAUtils.LiveAnnouncer.alert(i18nString20(UIStrings20.frameSelected));
      return;
    }
    const name = Trace23.Name.forEntry(newSelection.event);
    UI10.ARIAUtils.LiveAnnouncer.alert(i18nString20(UIStrings20.eventSelected, { PH1: name }));
  }
  select(selection) {
    this.#announceSelectionToAria(this.selection, selection);
    this.selection = selection;
    void this.flameChart.setSelectionAndReveal(selection);
  }
  selectEntryAtTime(events, time) {
    if (!events) {
      return;
    }
    if (events.length === 0) {
      this.select(null);
      return;
    }
    for (let index = Platform11.ArrayUtilities.upperBound(events, time, (time2, event) => time2 - event.ts) - 1; index >= 0; --index) {
      const event = events[index];
      const { endTime } = Trace23.Helpers.Timing.eventTimingsMilliSeconds(event);
      if (Trace23.Helpers.Trace.isTopLevelEvent(event) && endTime < time) {
        break;
      }
      if (ActiveFilters.instance().isVisible(event) && endTime >= time) {
        this.select(selectionFromEvent(event));
        return;
      }
    }
    this.select(null);
  }
  highlightEvent(event) {
    this.flameChart.highlightEvent(event);
  }
  #revealTimeRange(startTime, endTime) {
    const traceBoundsState = TraceBounds9.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const traceWindow = traceBoundsState.milli.timelineTraceWindow;
    let offset = 0;
    if (traceWindow.max < endTime) {
      offset = endTime - traceWindow.max;
    } else if (traceWindow.min > startTime) {
      offset = startTime - traceWindow.min;
    }
    TraceBounds9.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(Trace23.Helpers.Timing.traceWindowFromMilliSeconds(Trace23.Types.Timing.Milli(traceWindow.min + offset), Trace23.Types.Timing.Milli(traceWindow.max + offset)), {
      shouldAnimate: true
    });
  }
  handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const item = items[0];
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.PerfPanelTraceImported);
    if (item.kind === "string") {
      const url = dataTransfer.getData("text/uri-list");
      if (new Common10.ParsedURL.ParsedURL(url).isValid) {
        void this.loadFromURL(url);
      }
    } else if (item.kind === "file") {
      const file = items[0].getAsFile();
      if (!file) {
        return;
      }
      void this.loadFromFile(file);
    }
  }
  #openSummaryTab() {
    void this.flameChart.setSelectionAndReveal(null);
    this.flameChart.selectDetailsViewTab(Tab.Details, null);
  }
  /**
   * Used to reveal an insight - and is called from the AI Assistance panel when the user clicks on the Insight context button that is shown.
   * Revealing an insight should:
   * 1. Ensure the sidebar is open
   * 2. Ensure the insight is expanded
   *    (both of these should be true in the AI Assistance case)
   * 3. Flash the Insight with the highlight colour we use in other panels.
   */
  revealInsight(insightModel) {
    const insightSetKey = insightModel.navigationId ?? Trace23.Types.Events.NO_NAVIGATION;
    this.#setActiveInsight({ model: insightModel, insightSetKey }, { highlightInsight: true });
  }
  static async *handleExternalRecordRequest() {
    yield {
      type: "notification",
      message: "Recording performance trace"
    };
    _TimelinePanel.instance().invalidateExternalAIConversationData();
    void VisualLogging6.logFunctionCall("timeline.record-reload", "external");
    Snackbars.Snackbar.Snackbar.show({ message: i18nString20(UIStrings20.externalRequestReceived) });
    const panelInstance = _TimelinePanel.instance();
    await UI10.ViewManager.ViewManager.instance().showView("timeline");
    function onRecordingCompleted(eventData) {
      if ("errorText" in eventData) {
        return {
          type: "error",
          message: `Error running the trace: ${eventData.errorText}`
        };
      }
      const parsedTrace = panelInstance.model.parsedTrace(eventData.traceIndex);
      if (!parsedTrace || !parsedTrace.insights || parsedTrace.insights.size === 0) {
        return {
          type: "error",
          message: "The trace was loaded successfully but no Insights were detected."
        };
      }
      const insightSetId = Array.from(parsedTrace.insights.keys()).find((k) => k !== "NO_NAVIGATION");
      if (!insightSetId) {
        return {
          type: "error",
          message: "The trace was loaded successfully but no navigation was detected."
        };
      }
      const insightsForNav = parsedTrace.insights.get(insightSetId);
      if (!insightsForNav) {
        return {
          type: "error",
          message: "The trace was loaded successfully but no Insights were detected."
        };
      }
      let responseTextForNonPassedInsights = "";
      let responseTextForPassedInsights = "";
      for (const insight of Object.values(insightsForNav.model)) {
        const focus = AiAssistanceModel.AIContext.AgentFocus.fromParsedTrace(parsedTrace);
        const formatter = new AiAssistanceModel.PerformanceInsightFormatter.PerformanceInsightFormatter(focus, insight);
        if (!formatter.insightIsSupported()) {
          continue;
        }
        const formatted = formatter.formatInsight({ headingLevel: 3 });
        if (insight.state === "pass") {
          responseTextForPassedInsights += `${formatted}

`;
          continue;
        } else {
          responseTextForNonPassedInsights += `${formatted}

`;
        }
      }
      const finalText = `# Trace recording results

## Non-passing insights:

These insights highlight potential problems and opportunities to improve performance.
${responseTextForNonPassedInsights}

## Passing insights:

These insights are passing, which means they are not considered to highlight considerable performance problems.
${responseTextForPassedInsights}`;
      return {
        type: "answer",
        message: finalText,
        devToolsLogs: []
      };
    }
    return await new Promise((resolve) => {
      function listener(e) {
        resolve(onRecordingCompleted(e.data));
        panelInstance.removeEventListener("RecordingCompleted", listener);
      }
      panelInstance.addEventListener("RecordingCompleted", listener);
      panelInstance.recordReload();
    });
  }
  static async handleExternalAnalyzeRequest(prompt) {
    const data = _TimelinePanel.instance().getOrCreateExternalAIConversationData();
    return await data.conversationHandler.handleExternalRequest({
      conversationType: "drjones-performance-full",
      prompt,
      data
    });
  }
};
var rowHeight = 18;
var headerHeight = 20;
var TraceRevealer = class {
  async reveal(trace) {
    await UI10.ViewManager.ViewManager.instance().showView("timeline");
    TimelinePanel.instance().loadFromTraceFile(trace);
  }
};
var EventRevealer = class {
  async reveal(rEvent) {
    await UI10.ViewManager.ViewManager.instance().showView("timeline");
    TimelinePanel.instance().select(selectionFromEvent(rEvent.event));
  }
};
var InsightRevealer = class {
  async reveal(revealable) {
    await UI10.ViewManager.ViewManager.instance().showView("timeline");
    TimelinePanel.instance().revealInsight(revealable.insight);
  }
};
var ActionDelegate = class {
  handleAction(context, actionId) {
    const panel = context.flavor(TimelinePanel);
    if (panel === null) {
      return false;
    }
    switch (actionId) {
      case "timeline.toggle-recording":
        void panel.toggleRecording();
        return true;
      case "timeline.record-reload":
        panel.recordReload();
        return true;
      case "timeline.save-to-file":
        void panel.handleSaveToFileAction();
        return true;
      case "timeline.load-from-file":
        panel.selectFileToLoad();
        return true;
      case "timeline.jump-to-previous-frame":
        panel.jumpToFrame(-1);
        return true;
      case "timeline.jump-to-next-frame":
        panel.jumpToFrame(1);
        return true;
      case "timeline.show-history":
        void panel.showHistoryDropdown();
        return true;
      case "timeline.previous-recording":
        panel.navigateHistory(1);
        return true;
      case "timeline.next-recording":
        panel.navigateHistory(-1);
        return true;
    }
    return false;
  }
};
var SelectedInsight = class {
  insight;
  constructor(insight) {
    this.insight = insight;
  }
};

// gen/front_end/panels/timeline/TimelineUIUtils.js
import * as Utils4 from "./utils/utils.js";
var UIStrings21 = {
  /**
   * @description Text that only contain a placeholder
   * @example {100ms (at 200ms)} PH1
   */
  emptyPlaceholder: "{PH1}",
  // eslint-disable-line @devtools/l10n-no-locked-or-placeholder-only-phrase
  /**
   * @description Text for timestamps of items
   */
  timestamp: "Timestamp",
  /**
   * @description Text shown next to the interaction event's ID in the detail view.
   */
  interactionID: "ID",
  /**
   * @description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: "Input delay",
  /**
   * @description Text shown next to the interaction event's thread processing duration in the detail view.
   */
  processingDuration: "Processing duration",
  /**
   * @description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: "Presentation delay",
  /**
   * @description Text shown when the user has selected an event that represents script compiliation.
   */
  compile: "Compile",
  /**
   * @description Text shown when the user selects an event that represents script parsing.
   */
  parse: "Parse",
  /**
   * @description Text with two placeholders separated by a colon
   * @example {Node removed} PH1
   * @example {div#id1} PH2
   */
  sS: "{PH1}: {PH2}",
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more",
  /**
   * @description Text referring to the status of the browser's compilation cache.
   */
  compilationCacheStatus: "Compilation cache status",
  /**
   * @description Text referring to the size of the browser's compiliation cache.
   */
  compilationCacheSize: "Compilation cache size",
  /**
   * @description Text in Timeline UIUtils of the Performance panel. "Compilation
   * cache" refers to the code cache described at
   * https://v8.dev/blog/code-caching-for-devs . This label is followed by the
   * type of code cache data used, either "normal" or "full" as described in the
   * linked article.
   */
  compilationCacheKind: "Compilation cache kind",
  /**
   * @description Text used to inform the user that the script they are looking
   *             at was loaded from the browser's cache.
   */
  scriptLoadedFromCache: "script loaded from cache",
  /**
   * @description Text to inform the user that the script they are looking at
   *             was unable to be loaded from the browser's cache.
   */
  failedToLoadScriptFromCache: "failed to load script from cache",
  /**
   * @description Text to inform the user that the script they are looking at was not eligible to be loaded from the browser's cache.
   */
  scriptNotEligibleToBeLoadedFromCache: "script not eligible",
  /**
   * @description Label in the summary view in the Performance panel for a number which indicates how much managed memory has been reclaimed by performing Garbage Collection
   */
  collected: "Collected",
  /**
   * @description Text for a programming function
   */
  function: "Function",
  /**
   * @description Text for referring to the ID of a timer.
   */
  timerId: "Timer ID",
  /**
   * @description Text for referring to a timer that has timed-out and therefore is being removed.
   */
  timeout: "Timeout",
  /**
   * @description Text used to refer to a positive timeout value that schedules the idle callback once elapsed, even if no idle time is available.
   */
  requestIdleCallbackTimeout: "Timeout",
  /**
   * @description Text used to indicate that a timer is repeating (e.g. every X seconds) rather than a one off.
   */
  repeats: "Repeats",
  /**
   * @description Text for referring to the ID of a callback function installed by an event.
   */
  callbackId: "Callback ID",
  /**
   * @description Text for a module, the programming concept
   */
  module: "Module",
  /**
   * @description Label for a group of JavaScript files
   */
  script: "Script",
  /**
   * @description Text used to tell a user that a compilation trace event was streamed.
   */
  streamed: "Streamed",
  /**
   * @description Text to indicate if a compilation event was eager.
   */
  eagerCompile: "Compiling all functions eagerly",
  /**
   * @description Text to refer to the URL associated with a given event.
   */
  url: "Url",
  /**
   * @description Text to indicate to the user the size of the cache (as a filesize - e.g. 5mb).
   */
  producedCacheSize: "Produced cache size",
  /**
   * @description Text to indicate to the user the amount of the cache (as a filesize - e.g. 5mb) that has been used.
   */
  consumedCacheSize: "Consumed cache size",
  /**
   * @description Related node label in Timeline UIUtils of the Performance panel
   */
  layerRoot: "Layer root",
  /**
   * @description Related node label in Timeline UIUtils of the Performance panel
   */
  ownerElement: "Owner element",
  /**
   * @description Text used to show the user the URL of the image they are viewing.
   */
  imageUrl: "Image URL",
  /**
   * @description Text used to show the user that the URL they are viewing is loading a CSS stylesheet.
   */
  stylesheetUrl: "Stylesheet URL",
  /**
   * @description Text used next to a number to show the user how many elements were affected.
   */
  elementsAffected: "Elements affected",
  /**
   * @description Text used next to a number to show the user how many nodes required the browser to update and re-layout the page.
   */
  nodesThatNeedLayout: "Nodes that need layout",
  /**
   * @description Text used to show the amount in a subset - e.g. "2 of 10".
   * @example {2} PH1
   * @example {10} PH2
   */
  sOfS: "{PH1} of {PH2}",
  /**
   * @description Related node label in Timeline UIUtils of the Performance panel
   */
  layoutRoot: "Layout root",
  /**
   * @description Text used when viewing an event that can have a custom message attached.
   */
  message: "Message",
  /**
   * @description Text used to tell the user they are viewing an event that has a function embedded in it, which is referred to as the "callback function".
   */
  callbackFunction: "Callback function",
  /**
   * @description Text used to show the relevant range of a file - e.g. "lines 2-10".
   */
  range: "Range",
  /**
   * @description Text used to refer to the amount of time some event or code was given to complete within.
   */
  allottedTime: "Allotted time",
  /**
   * @description Text used to tell a user that a particular event or function was automatically run by a timeout.
   */
  invokedByTimeout: "Invoked by timeout",
  /**
   * @description Text that refers to some types
   */
  type: "Type",
  /**
   * @description Text for the size of something
   */
  size: "Size",
  /**
   * @description Text for the details of something
   */
  details: "Details",
  /**
   * @description Text to indicate an item is a warning
   */
  warning: "Warning",
  /**
   * @description Text that indicates a particular HTML element or node is related to what the user is viewing.
   */
  relatedNode: "Related node",
  /**
   * @description Text for previewing items
   */
  preview: "Preview",
  /**
   * @description Text used to refer to the total time summed up across multiple events.
   */
  aggregatedTime: "Aggregated time",
  /**
   * @description Text for the duration of something
   */
  duration: "Duration",
  /**
   * @description Text for the stack trace of the initiator of something. The Initiator is the event or factor that directly triggered or precipitated a subsequent action.
   */
  initiatorStackTrace: "Initiator stack trace",
  /**
   * @description Text for the event initiated by another one
   */
  initiatedBy: "Initiated by",
  /**
   * @description Text for the event that is an initiator for another one
   */
  initiatorFor: "Initiator for",
  /**
   * @description Text for the underlying data behing a specific flamechart selection. Trace events are the browser instrumentation that are emitted as JSON objects.
   */
  traceEvent: "Trace event",
  /**
   * @description Call site stack label in Timeline UIUtils of the Performance panel
   */
  timerInstalled: "Timer installed",
  /**
   * @description Call site stack label in Timeline UIUtils of the Performance panel
   */
  animationFrameRequested: "Animation frame requested",
  /**
   * @description Call site stack label in Timeline UIUtils of the Performance panel
   */
  idleCallbackRequested: "Idle callback requested",
  /**
   * @description Stack label in Timeline UIUtils of the Performance panel
   */
  recalculationForced: "Recalculation forced",
  /**
   * @description Call site stack label in Timeline UIUtils of the Performance panel
   */
  firstLayoutInvalidation: "First layout invalidation",
  /**
   * @description Stack label in Timeline UIUtils of the Performance panel
   */
  layoutForced: "Layout forced",
  /**
   * @description Label in front of CSS property (eg `opacity`) being animated or a CSS animation name (eg `layer-4-fade-in-out`)
   */
  animating: "Animating",
  /**
   * @description Label in front of reasons why a CSS animation wasn't composited (aka hardware accelerated)
   */
  compositingFailed: "Compositing failed",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to accelerated animations being disabled. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedAcceleratedAnimationsDisabled: "Accelerated animations disabled",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to DevTools suppressing the effect. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedEffectSuppressedByDevtools: "Effect suppressed by DevTools ",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the animation or effect being invalid. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedInvalidAnimationOrEffect: "Invalid animation or effect",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to an effect having unsupported timing parameters. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedEffectHasUnsupportedTimingParams: "Effect has unsupported timing parameters",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to an effect having a composite mode which is not `replace`. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedEffectHasNonReplaceCompositeMode: 'Effect has composite mode other than "replace"',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the target being in an invalid compositing state. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTargetHasInvalidCompositingState: "Target has invalid compositing state",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to another animation on the same target being incompatible. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTargetHasIncompatibleAnimations: "Target has another animation which is incompatible",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the target having a CSS offset. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTargetHasCSSOffset: "Target has CSS offset",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the animation affecting non-CSS properties. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedAnimationAffectsNonCSSProperties: "Animation affects non-CSS properties",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the transform-related property not being able to be animated on the target. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTransformRelatedPropertyCannotBeAcceleratedOnTarget: "Transform-related property cannot be accelerated on target",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to a `transform` property being dependent on the size of the element itself. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTransformDependsBoxSize: "Transform-related property depends on box size",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to a `filter` property possibly moving pixels. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedFilterRelatedPropertyMayMovePixels: "Filter-related property may move pixels",
  /**
   * @description [ICU Syntax] Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the animated CSS property not being supported on the compositor. Shown in a table with a list of other potential failure reasons.
   * @example {height, width} properties
   */
  compositingFailedUnsupportedCSSProperty: `{propertyCount, plural,
    =1 {Unsupported CSS property: {properties}}
    other {Unsupported CSS properties: {properties}}
  }`,
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to mixing keyframe value types. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedMixedKeyframeValueTypes: "Mixed keyframe value types",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the timeline source being in an invalid compositing state. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTimelineSourceHasInvalidCompositingState: "Timeline source has invalid compositing state",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the animation having no visible change. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedAnimationHasNoVisibleChange: "Animation has no visible change",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to an effect affecting an important property. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedAffectsImportantProperty: "Effect affects a property with !important",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the SVG target having an independent transfrom property. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedSVGTargetHasIndependentTransformProperty: "SVG target has independent transform property",
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to an unknown reason. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedUnknownReason: "Unknown Reason",
  /**
   * @description Text for the execution "stack trace". It is not technically a stack trace, because it points to the beginning of each function
   * and not to each call site, so we call it a function stack instead to avoid confusion.
   */
  functionStack: "Function stack",
  /**
   * @description Text used to show any invalidations for a particular event that caused the browser to have to do more work to update the page.
   * @example {2} PH1
   */
  invalidations: "Invalidations ({PH1} total)",
  /**
   * @description Text in Timeline UIUtils of the Performance panel. Phrase is followed by a number of milliseconds.
   * Some events or tasks might have been only started, but have not ended yet. Such events or tasks are considered
   * "pending".
   */
  pendingFor: "Pending for",
  /**
   * @description Noun label for a stack trace which indicates the first time some condition was invalidated.
   */
  firstInvalidated: "First invalidated",
  /**
   * @description Title of the paint profiler, old name of the performance pane
   */
  paintProfiler: "Paint profiler",
  /**
   * @description Text in Timeline Flame Chart View of the Performance panel
   * @example {Frame} PH1
   * @example {10ms} PH2
   */
  sAtS: "{PH1} at {PH2}",
  /**
   * @description Text used next to a time to indicate that the particular event took that much time itself. In context this might look like "3ms blink.console (self)"
   * @example {blink.console} PH1
   */
  sSelf: "{PH1} (self)",
  /**
   * @description Text used next to a time to indicate that the event's children took that much time. In context this might look like "3ms blink.console (children)"
   * @example {blink.console} PH1
   */
  sChildren: "{PH1} (children)",
  /**
   * @description Text used to show the user how much time the browser spent on rendering (drawing the page onto the screen).
   */
  timeSpentInRendering: "Time spent in rendering",
  /**
   * @description Text for a rendering frame
   */
  frame: "Frame",
  /**
   * @description Text used to refer to the duration of an event at a given offset - e.g. "2ms at 10ms" which can be read as "2ms starting after 10ms".
   * @example {10ms} PH1
   * @example {10ms} PH2
   */
  sAtSParentheses: "{PH1} (at {PH2})",
  /**
   * @description Text of a DOM element in Timeline UIUtils of the Performance panel
   */
  UnknownNode: "[ unknown node ]",
  /**
   * @description Text used to refer to a particular element and the file it was referred to in.
   * @example {node} PH1
   * @example {app.js} PH2
   */
  invalidationWithCallFrame: "{PH1} at {PH2}",
  /**
   * @description Text indicating that something is outside of the Performace Panel Timeline Minimap range
   */
  outsideBreadcrumbRange: "(outside of the breadcrumb range)",
  /**
   * @description Text indicating that something is hidden from the Performace Panel Timeline
   */
  entryIsHidden: "(entry is hidden)",
  /**
   * @description Title of a row in the details view for a `Recalculate Styles` event that contains more info about selector stats tracing.
   */
  selectorStatsTitle: "Selector stats",
  /**
   * @description Info text that explains to the user how to enable selector stats tracing.
   * @example {Setting Name} PH1
   */
  sSelectorStatsInfo: 'Select "{PH1}" to collect detailed CSS selector matching statistics.',
  /**
   * @description Label for a numeric value that was how long to wait before a function was run.
   */
  delay: "Delay",
  /**
   * @description Label for a string that describes the priority at which a task was scheduled, like 'background' for low-priority tasks, and 'user-blocking' for high priority.
   */
  priority: "Priority",
  /**
   * @description Label for third party table.
   */
  thirdPartyTable: "1st / 3rd party table",
  /**
   * @description Label for the a source URL.
   */
  source: "Source",
  /**
   * @description Label for a URL origin.
   */
  origin: "Origin"
};
var str_21 = i18n41.i18n.registerUIStrings("panels/timeline/TimelineUIUtils.ts", UIStrings21);
var i18nString21 = i18n41.i18n.getLocalizedString.bind(void 0, str_21);
var URL_REGEX = /(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\/\/)[^\s"]{2,}[^\s"'\)\}\],:;.!?]/u;
var eventDispatchDesciptors;
var colorGenerator;
var { SamplesIntegrator } = Trace24.Helpers.SamplesIntegrator;
var TimelineUIUtils = class _TimelineUIUtils {
  /**
   * use getGetDebugModeEnabled() to query this variable.
   */
  static debugModeEnabled = void 0;
  static getGetDebugModeEnabled() {
    if (_TimelineUIUtils.debugModeEnabled === void 0) {
      _TimelineUIUtils.debugModeEnabled = Root5.Runtime.experiments.isEnabled(
        "timeline-debug-mode"
        /* Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE */
      );
    }
    return _TimelineUIUtils.debugModeEnabled;
  }
  static frameDisplayName(frame) {
    const maybeResolvedData = SourceMapsResolver3.SourceMapsResolver.resolvedCodeLocationForCallFrame(frame);
    const functionName = maybeResolvedData?.name || frame.functionName;
    if (!SamplesIntegrator.isNativeRuntimeFrame(frame)) {
      return UI11.UIUtils.beautifyFunctionName(functionName);
    }
    const nativeGroup = SamplesIntegrator.nativeGroup(functionName);
    switch (nativeGroup) {
      case "Compile":
        return i18nString21(UIStrings21.compile);
      case "Parse":
        return i18nString21(UIStrings21.parse);
    }
    return functionName;
  }
  static testContentMatching(traceEvent, regExp, handlerData) {
    const title = _TimelineUIUtils.eventStyle(traceEvent).title;
    const tokens = [title];
    if (Trace24.Types.Events.isProfileCall(traceEvent)) {
      if (!handlerData?.Samples) {
        tokens.push(traceEvent.callFrame.functionName);
      } else {
        tokens.push(Trace24.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(handlerData.Samples, traceEvent));
      }
    }
    if (handlerData) {
      const url = Trace24.Handlers.Helpers.getNonResolvedURL(traceEvent, handlerData);
      if (url) {
        tokens.push(url);
      }
    }
    if (_TimelineUIUtils.getGetDebugModeEnabled()) {
      appendObjectProperties(traceEvent, 4);
    } else {
      appendObjectProperties(traceEvent.args, 2);
    }
    const result = tokens.join("|").match(regExp);
    return result ? result.length > 0 : false;
    function appendObjectProperties(object, depth) {
      if (!depth) {
        return;
      }
      for (const key in object) {
        const value = object[key];
        if (typeof value === "string") {
          tokens.push(value);
        } else if (typeof value === "number") {
          tokens.push(String(value));
        } else if (typeof value === "object" && value !== null) {
          appendObjectProperties(value, depth - 1);
        }
      }
    }
  }
  static eventStyle(event) {
    if (Trace24.Types.Events.isProfileCall(event) && event.callFrame.functionName === "(idle)") {
      return new Trace24.Styles.TimelineRecordStyle(event.name, Trace24.Styles.getCategoryStyles().idle);
    }
    if (event.cat === Trace24.Types.Events.Categories.Console || event.cat === Trace24.Types.Events.Categories.UserTiming) {
      return new Trace24.Styles.TimelineRecordStyle(event.name, Trace24.Styles.getCategoryStyles()["scripting"]);
    }
    return Trace24.Styles.getEventStyle(event.name) ?? new Trace24.Styles.TimelineRecordStyle(event.name, Trace24.Styles.getCategoryStyles().other);
  }
  static eventColor(event) {
    if (Trace24.Types.Events.isProfileCall(event)) {
      const frame = event.callFrame;
      if (_TimelineUIUtils.isUserFrame(frame)) {
        return _TimelineUIUtils.colorForId(frame.url);
      }
    }
    if (Trace24.Types.Extensions.isSyntheticExtensionEntry(event)) {
      return Extensions3.ExtensionUI.extensionEntryColor(event);
    }
    const themeSupport = ThemeSupport19.ThemeSupport.instance();
    let parsedColor = themeSupport.getComputedValue(_TimelineUIUtils.eventStyle(event).category.cssVariable);
    if (event.name === "v8.parseOnBackgroundWaiting") {
      parsedColor = themeSupport.getComputedValue(Trace24.Styles.getCategoryStyles().scripting.cssVariable);
      if (!parsedColor) {
        throw new Error("Unable to parse color from getCategoryStyles().scripting.color");
      }
    }
    return parsedColor;
  }
  static eventTitle(event) {
    if (Trace24.Types.Events.isProfileCall(event)) {
      const maybeResolvedData = SourceMapsResolver3.SourceMapsResolver.resolvedCodeLocationForEntry(event);
      const displayName = maybeResolvedData?.name || _TimelineUIUtils.frameDisplayName(event.callFrame);
      return displayName;
    }
    if (event.name === "EventTiming" && Trace24.Types.Events.isSyntheticInteraction(event)) {
      return Trace24.Name.forEntry(event);
    }
    const title = _TimelineUIUtils.eventStyle(event).title;
    if (Trace24.Helpers.Trace.eventHasCategory(event, Trace24.Types.Events.Categories.Console)) {
      return title;
    }
    if (Trace24.Types.Events.isConsoleTimeStamp(event) && event.args.data) {
      return i18nString21(UIStrings21.sS, { PH1: title, PH2: event.args.data.name ?? event.args.data.message });
    }
    if (Trace24.Types.Events.isAnimation(event) && event.args.data.name) {
      return i18nString21(UIStrings21.sS, { PH1: title, PH2: event.args.data.name });
    }
    if (Trace24.Types.Events.isDispatch(event)) {
      return i18nString21(UIStrings21.sS, { PH1: title, PH2: event.args.data.type });
    }
    return title;
  }
  static isUserFrame(frame) {
    return frame.scriptId !== "0" && !frame.url?.startsWith("native ");
  }
  static async buildDetailsNodeForTraceEvent(event, target, linkifier, isFreshOrEnhanced = false, parsedTrace) {
    let details = null;
    let detailsText;
    const unsafeEventArgs = event.args;
    const unsafeEventData = event.args?.data;
    switch (event.name) {
      case "PaintImage":
      case "Decode Image":
      case "Decode LazyPixelRef":
      case "XHRReadyStateChange":
      case "XHRLoad":
      case "ResourceWillSendRequest":
      case "ResourceSendRequest":
      case "ResourceReceivedData":
      case "ResourceReceiveResponse":
      case "ResourceFinish": {
        const url = Trace24.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data);
        if (url) {
          const options = {
            tabStop: true,
            showColumnNumber: false,
            inlineFrameIndex: 0
          };
          details = LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options);
        }
        break;
      }
      case "FunctionCall": {
        details = document.createElement("span");
        const callFrame = Trace24.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event)?.at(0);
        if (Trace24.Types.Events.isFunctionCall(event) && callFrame) {
          UI11.UIUtils.createTextChild(details, _TimelineUIUtils.frameDisplayName({ ...callFrame, scriptId: String(callFrame.scriptId) }));
        }
        const location = this.linkifyLocation({
          scriptId: unsafeEventData["scriptId"],
          url: unsafeEventData["url"],
          lineNumber: callFrame?.lineNumber || 0,
          columnNumber: callFrame?.columnNumber,
          target,
          isFreshOrEnhanced,
          linkifier,
          omitOrigin: true
        });
        if (location) {
          UI11.UIUtils.createTextChild(details, " @ ");
          details.appendChild(location);
        }
        break;
      }
      case "V8.CompileModule":
      case "v8.produceModuleCache": {
        details = this.linkifyLocation({
          scriptId: null,
          url: unsafeEventArgs["fileName"],
          lineNumber: 0,
          columnNumber: 0,
          target,
          isFreshOrEnhanced,
          linkifier
        });
        break;
      }
      case "v8.deserializeOnBackground":
      case "v8.parseOnBackground": {
        const url = unsafeEventData["url"];
        if (url) {
          details = this.linkifyLocation({
            scriptId: null,
            url,
            lineNumber: 0,
            columnNumber: 0,
            target,
            isFreshOrEnhanced,
            linkifier,
            omitOrigin: true
          });
        }
        break;
      }
      default: {
        if (Trace24.Helpers.Trace.eventHasCategory(event, Trace24.Types.Events.Categories.Console) || Trace24.Types.Events.isUserTiming(event) || Trace24.Types.Extensions.isSyntheticExtensionEntry(event) || Trace24.Types.Events.isProfileCall(event)) {
          detailsText = null;
        } else {
          details = this.linkifyTopCallFrame(event, target, linkifier, isFreshOrEnhanced) ?? null;
        }
        break;
      }
    }
    if (!details && detailsText) {
      details = document.createTextNode(detailsText);
    }
    return details;
  }
  static linkifyLocation(linkifyOptions) {
    const { scriptId, url, lineNumber, columnNumber, isFreshOrEnhanced, linkifier, target, omitOrigin } = linkifyOptions;
    const options = {
      lineNumber,
      columnNumber,
      showColumnNumber: true,
      inlineFrameIndex: 0,
      className: "timeline-details",
      tabStop: true,
      omitOrigin
    };
    if (isFreshOrEnhanced) {
      return linkifier.linkifyScriptLocation(target, scriptId, url, lineNumber, options);
    }
    return LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options);
  }
  static linkifyTopCallFrame(event, target, linkifier, isFreshOrEnhanced = false) {
    let frame = Trace24.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event)?.[0];
    if (Trace24.Types.Events.isProfileCall(event)) {
      frame = event.callFrame;
    }
    if (!frame) {
      return null;
    }
    const options = {
      className: "timeline-details",
      tabStop: true,
      inlineFrameIndex: 0,
      showColumnNumber: true,
      columnNumber: frame.columnNumber,
      lineNumber: frame.lineNumber
    };
    if (isFreshOrEnhanced) {
      return linkifier.maybeLinkifyConsoleCallFrame(target, frame, { showColumnNumber: true, inlineFrameIndex: 0 });
    }
    return LegacyComponents.Linkifier.Linkifier.linkifyURL(frame.url, options);
  }
  static buildDetailsNodeForMarkerEvents(event) {
    let link = "https://web.dev/user-centric-performance-metrics/";
    let name = "page performance metrics";
    switch (event.name) {
      case "largestContentfulPaint::Candidate":
        link = "https://web.dev/lcp/";
        name = "largest contentful paint";
        break;
      case "firstContentfulPaint":
        link = "https://web.dev/first-contentful-paint/";
        name = "first contentful paint";
        break;
      default:
        break;
    }
    const html4 = UI11.Fragment.html`<div>${UI11.XLink.XLink.create(link, i18nString21(UIStrings21.learnMore), void 0, void 0, "learn-more")} about ${name}.</div>`;
    return html4;
  }
  static buildConsumeCacheDetails(eventData, contentHelper) {
    if (typeof eventData.consumedCacheSize === "number") {
      contentHelper.appendTextRow(i18nString21(UIStrings21.compilationCacheStatus), i18nString21(UIStrings21.scriptLoadedFromCache));
      contentHelper.appendTextRow(i18nString21(UIStrings21.compilationCacheSize), i18n41.ByteUtilities.bytesToString(eventData.consumedCacheSize));
      const cacheKind = eventData.cacheKind;
      if (cacheKind) {
        contentHelper.appendTextRow(i18nString21(UIStrings21.compilationCacheKind), cacheKind);
      }
    } else if ("cacheRejected" in eventData && eventData["cacheRejected"]) {
      contentHelper.appendTextRow(i18nString21(UIStrings21.compilationCacheStatus), i18nString21(UIStrings21.failedToLoadScriptFromCache));
    } else {
      contentHelper.appendTextRow(i18nString21(UIStrings21.compilationCacheStatus), i18nString21(UIStrings21.scriptNotEligibleToBeLoadedFromCache));
    }
  }
  static maybeCreateLinkElement(url) {
    const parsedURL = new Common11.ParsedURL.ParsedURL(url);
    if (!parsedURL.scheme) {
      return null;
    }
    const splitResult = Common11.ParsedURL.ParsedURL.splitLineAndColumn(url);
    if (!splitResult) {
      return null;
    }
    const { url: rawURL, lineNumber, columnNumber } = splitResult;
    const options = {
      lineNumber,
      columnNumber,
      showColumnNumber: true,
      omitOrigin: true
    };
    return LegacyComponents.Linkifier.Linkifier.linkifyURL(rawURL, options);
  }
  /**
   * Takes an input string and parses it to look for links. It does this by
   * looking for URLs in the input string. The returned fragment will contain
   * the same string but with any links wrapped in clickable links. The text
   * of the link is the URL, so the visible string to the user is unchanged.
   */
  static parseStringForLinks(rawString) {
    const results = TextUtils3.TextUtils.Utils.splitStringByRegexes(rawString, [URL_REGEX]);
    const nodes = results.map((result) => {
      if (result.regexIndex === -1) {
        return result.value;
      }
      return _TimelineUIUtils.maybeCreateLinkElement(result.value) ?? result.value;
    });
    const frag = document.createDocumentFragment();
    frag.append(...nodes);
    return frag;
  }
  static async buildTraceEventDetails(parsedTrace, event, linkifier, canShowPieChart, entityMapper) {
    const maybeTarget = targetForEvent(parsedTrace, event);
    const { duration } = Trace24.Helpers.Timing.eventTimingsMicroSeconds(event);
    const selfTime = getEventSelfTime(event, parsedTrace);
    const relatedNodesMap = await Utils4.EntryNodes.relatedDOMNodesForEvent(parsedTrace, event);
    let entityAppended = false;
    if (maybeTarget) {
      if (typeof event[previewElementSymbol] === "undefined") {
        let previewElement = null;
        const url2 = Trace24.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data);
        if (url2) {
          previewElement = await LegacyComponents.ImagePreview.ImagePreview.build(url2, false, {
            imageAltText: LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(url2),
            precomputedFeatures: void 0,
            align: "start"
          });
        } else if (Trace24.Types.Events.isPaint(event)) {
          previewElement = await _TimelineUIUtils.buildPicturePreviewContent(parsedTrace, event, maybeTarget);
        }
        event[previewElementSymbol] = previewElement;
      }
    }
    let relatedNodeLabel;
    const contentHelper = new TimelineDetailsContentHelper(targetForEvent(parsedTrace, event), linkifier);
    const defaultColorForEvent = this.eventColor(event);
    const isMarker = parsedTrace && isMarkerEvent(parsedTrace, event);
    const color = isMarker ? _TimelineUIUtils.markerStyleForEvent(event).color : defaultColorForEvent;
    contentHelper.addSection(_TimelineUIUtils.eventTitle(event), color, event);
    const unsafeEventArgs = event.args;
    const unsafeEventData = event.args?.data;
    const initiator = parsedTrace.data.Initiators.eventToInitiator.get(event) ?? null;
    const initiatorFor = parsedTrace.data.Initiators.initiatorToEvents.get(event) ?? null;
    let url = null;
    if (parsedTrace) {
      const warnings = TimelineComponents4.DetailsView.buildWarningElementsForEvent(event, parsedTrace);
      for (const warning of warnings) {
        contentHelper.appendElementRow(i18nString21(UIStrings21.warning), warning, true);
      }
    }
    if (Trace24.Helpers.Trace.eventHasCategory(event, Trace24.Types.Events.Categories.UserTiming) || Trace24.Types.Extensions.isSyntheticExtensionEntry(event)) {
      const adjustedEventTimeStamp = timeStampForEventAdjustedForClosestNavigationIfPossible(event, parsedTrace);
      contentHelper.appendTextRow(i18nString21(UIStrings21.timestamp), i18n41.TimeUtilities.preciseMillisToString(adjustedEventTimeStamp, 1));
    }
    if (duration !== 0 && !Number.isNaN(duration)) {
      const timeStr = getDurationString(duration, selfTime);
      contentHelper.appendTextRow(i18nString21(UIStrings21.duration), timeStr);
    }
    if (Trace24.Types.Events.isPerformanceMark(event) && event.args.data?.detail) {
      const detailContainer = _TimelineUIUtils.renderObjectJson(JSON.parse(event.args.data?.detail));
      contentHelper.appendElementRow(i18nString21(UIStrings21.details), detailContainer);
    }
    if (Trace24.Types.Events.isSyntheticUserTiming(event) && event.args?.data?.beginEvent.args.detail) {
      const detailContainer = _TimelineUIUtils.renderObjectJson(JSON.parse(event.args?.data?.beginEvent.args.detail));
      contentHelper.appendElementRow(i18nString21(UIStrings21.details), detailContainer);
    }
    if (parsedTrace.data.Meta.traceIsGeneric) {
      _TimelineUIUtils.renderEventJson(event, contentHelper);
      return contentHelper.fragment;
    }
    if (Trace24.Types.Events.isV8Compile(event)) {
      url = event.args.data?.url;
      if (url) {
        const { lineNumber, columnNumber } = Trace24.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
        contentHelper.appendLocationRow(i18nString21(UIStrings21.script), url, lineNumber || 0, columnNumber, void 0, true);
        const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
        if (originWithEntity) {
          contentHelper.appendElementRow(i18nString21(UIStrings21.origin), originWithEntity);
        }
        entityAppended = true;
      }
      const isEager = Boolean(event.args.data?.eager);
      if (isEager) {
        contentHelper.appendTextRow(i18nString21(UIStrings21.eagerCompile), true);
      }
      const isStreamed = Boolean(event.args.data?.streamed);
      contentHelper.appendTextRow(i18nString21(UIStrings21.streamed), isStreamed + (isStreamed ? "" : `: ${event.args.data?.notStreamedReason || ""}`));
      if (event.args.data) {
        _TimelineUIUtils.buildConsumeCacheDetails(event.args.data, contentHelper);
      }
    }
    if (Trace24.Types.Extensions.isSyntheticExtensionEntry(event)) {
      const userDetail = structuredClone(event.userDetail);
      if (userDetail && Object.keys(userDetail).length) {
        const hasExclusiveLink = typeof userDetail === "object" && typeof userDetail.url === "string" && typeof userDetail.description === "string";
        if (hasExclusiveLink && Boolean(Root5.Runtime.hostConfig.devToolsDeepLinksViaExtensibilityApi?.enabled)) {
          const linkElement = this.maybeCreateLinkElement(String(userDetail.url));
          if (linkElement) {
            contentHelper.appendElementRow(String(userDetail.description), linkElement);
            delete userDetail.url;
            delete userDetail.description;
          }
        }
        if (Object.keys(userDetail).length) {
          const detailContainer = _TimelineUIUtils.renderObjectJson(userDetail);
          contentHelper.appendElementRow(i18nString21(UIStrings21.details), detailContainer);
        }
      }
      if (event.devtoolsObj.properties) {
        for (const [key, value] of event.devtoolsObj.properties || []) {
          const renderedValue = typeof value === "string" ? _TimelineUIUtils.parseStringForLinks(value) : _TimelineUIUtils.renderObjectJson(value);
          contentHelper.appendElementRow(key, renderedValue);
        }
      }
    }
    const isFreshOrEnhanced = Boolean(parsedTrace && Tracing4.FreshRecording.Tracker.instance().recordingIsFreshOrEnhanced(parsedTrace));
    switch (event.name) {
      case "GCEvent":
      case "MajorGC":
      case "MinorGC": {
        const delta = unsafeEventArgs["usedHeapSizeBefore"] - unsafeEventArgs["usedHeapSizeAfter"];
        contentHelper.appendTextRow(i18nString21(UIStrings21.collected), i18n41.ByteUtilities.bytesToString(delta));
        break;
      }
      case "ProfileCall": {
        const profileCall = event;
        const resolvedURL = SourceMapsResolver3.SourceMapsResolver.resolvedURLForEntry(parsedTrace, profileCall);
        if (!resolvedURL) {
          break;
        }
        const callFrame = profileCall.callFrame;
        contentHelper.appendLocationRow(i18nString21(UIStrings21.source), resolvedURL, callFrame.lineNumber || 0, callFrame.columnNumber, void 0, true);
        const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, profileCall);
        if (originWithEntity) {
          contentHelper.appendElementRow(i18nString21(UIStrings21.origin), originWithEntity);
        }
        entityAppended = true;
        break;
      }
      case "FunctionCall": {
        const detailsNode = await _TimelineUIUtils.buildDetailsNodeForTraceEvent(event, targetForEvent(parsedTrace, event), linkifier, isFreshOrEnhanced, parsedTrace);
        if (detailsNode) {
          contentHelper.appendElementRow(i18nString21(UIStrings21.function), detailsNode);
          const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
          if (originWithEntity) {
            contentHelper.appendElementRow(i18nString21(UIStrings21.origin), originWithEntity);
          }
          entityAppended = true;
        }
        break;
      }
      case "TimerFire":
      case "TimerInstall":
      case "TimerRemove": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.timerId), unsafeEventData.timerId);
        if (event.name === "TimerInstall") {
          contentHelper.appendTextRow(i18nString21(UIStrings21.timeout), i18n41.TimeUtilities.millisToString(unsafeEventData["timeout"]));
          contentHelper.appendTextRow(i18nString21(UIStrings21.repeats), !unsafeEventData["singleShot"]);
        }
        break;
      }
      case "SchedulePostTaskCallback":
      case "RunPostTaskCallback": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.delay), i18n41.TimeUtilities.millisToString(unsafeEventData["delay"]));
        contentHelper.appendTextRow(i18nString21(UIStrings21.priority), unsafeEventData["priority"]);
        break;
      }
      case "FireAnimationFrame": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.callbackId), unsafeEventData["id"]);
        break;
      }
      case "V8.CompileModule": {
        contentHelper.appendLocationRow(i18nString21(UIStrings21.module), unsafeEventArgs["fileName"], 0);
        break;
      }
      case "V8.CompileScript": {
        break;
      }
      case "v8.produceModuleCache": {
        url = unsafeEventData && unsafeEventData["url"];
        contentHelper.appendTextRow(i18nString21(UIStrings21.compilationCacheSize), i18n41.ByteUtilities.bytesToString(unsafeEventData["producedCacheSize"]));
        break;
      }
      case "v8.produceCache": {
        url = unsafeEventData && unsafeEventData["url"];
        if (url) {
          const { lineNumber, columnNumber } = Trace24.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
          contentHelper.appendLocationRow(i18nString21(UIStrings21.script), url, lineNumber || 0, columnNumber, void 0, true);
          const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
          if (originWithEntity) {
            contentHelper.appendElementRow(i18nString21(UIStrings21.origin), originWithEntity);
          }
          entityAppended = true;
        }
        contentHelper.appendTextRow(i18nString21(UIStrings21.compilationCacheSize), i18n41.ByteUtilities.bytesToString(unsafeEventData["producedCacheSize"]));
        break;
      }
      case "EvaluateScript": {
        url = unsafeEventData && unsafeEventData["url"];
        if (url) {
          const { lineNumber, columnNumber } = Trace24.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
          contentHelper.appendLocationRow(i18nString21(UIStrings21.script), url, lineNumber || 0, columnNumber, void 0, true);
          const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
          if (originWithEntity) {
            contentHelper.appendElementRow(i18nString21(UIStrings21.origin), originWithEntity);
          }
          entityAppended = true;
        }
        break;
      }
      case "v8.wasm.streamFromResponseCallback":
      case "v8.wasm.compiledModule":
      case "v8.wasm.cachedModule":
      case "v8.wasm.moduleCacheHit":
      case "v8.wasm.moduleCacheInvalid": {
        if (unsafeEventData) {
          url = unsafeEventArgs["url"];
          if (url) {
            contentHelper.appendTextRow(i18nString21(UIStrings21.url), url);
          }
          const producedCachedSize = unsafeEventArgs["producedCachedSize"];
          if (producedCachedSize) {
            contentHelper.appendTextRow(i18nString21(UIStrings21.producedCacheSize), producedCachedSize);
          }
          const consumedCachedSize = unsafeEventArgs["consumedCachedSize"];
          if (consumedCachedSize) {
            contentHelper.appendTextRow(i18nString21(UIStrings21.consumedCacheSize), consumedCachedSize);
          }
        }
        break;
      }
      case "Paint":
      case "PaintSetup":
      case "Rasterize":
      case "ScrollLayer": {
        relatedNodeLabel = i18nString21(UIStrings21.layerRoot);
        break;
      }
      case "PaintImage":
      case "Decode LazyPixelRef":
      case "Decode Image":
      case "Draw LazyPixelRef": {
        relatedNodeLabel = i18nString21(UIStrings21.ownerElement);
        url = Trace24.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data);
        if (url) {
          const options = {
            tabStop: true,
            showColumnNumber: false,
            inlineFrameIndex: 0
          };
          contentHelper.appendElementRow(i18nString21(UIStrings21.imageUrl), LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options));
        }
        break;
      }
      case "ParseAuthorStyleSheet": {
        url = unsafeEventData["styleSheetUrl"];
        if (url) {
          const options = {
            tabStop: true,
            showColumnNumber: false,
            inlineFrameIndex: 0
          };
          contentHelper.appendElementRow(i18nString21(UIStrings21.stylesheetUrl), LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options));
        }
        break;
      }
      case "UpdateLayoutTree": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.elementsAffected), unsafeEventArgs["elementCount"]);
        const selectorStatsSetting = Common11.Settings.Settings.instance().createSetting("timeline-capture-selector-stats", false);
        if (!selectorStatsSetting.get()) {
          const note = document.createElement("span");
          note.textContent = i18nString21(UIStrings21.sSelectorStatsInfo, { PH1: selectorStatsSetting.title() });
          contentHelper.appendElementRow(i18nString21(UIStrings21.selectorStatsTitle), note);
        }
        break;
      }
      case "Layout": {
        const beginData = unsafeEventArgs["beginData"];
        contentHelper.appendTextRow(i18nString21(UIStrings21.nodesThatNeedLayout), i18nString21(UIStrings21.sOfS, { PH1: beginData["dirtyObjects"], PH2: beginData["totalObjects"] }));
        relatedNodeLabel = i18nString21(UIStrings21.layoutRoot);
        break;
      }
      case "ConsoleTime": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.message), event.name);
        break;
      }
      case "WebSocketCreate":
      case "WebSocketSendHandshakeRequest":
      case "WebSocketReceiveHandshakeResponse":
      case "WebSocketSend":
      case "WebSocketReceive":
      case "WebSocketDestroy": {
        if (Trace24.Types.Events.isWebSocketTraceEvent(event)) {
          const rows = TimelineComponents4.DetailsView.buildRowsForWebSocketEvent(event, parsedTrace);
          for (const { key, value } of rows) {
            contentHelper.appendTextRow(key, value);
          }
        }
        break;
      }
      case "EmbedderCallback": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.callbackFunction), unsafeEventData["callbackName"]);
        break;
      }
      case "Animation": {
        if (!Trace24.Types.Events.isSyntheticAnimation(event)) {
          break;
        }
        const { displayName, nodeName } = event.args.data.beginEvent.args.data;
        displayName && contentHelper.appendTextRow(i18nString21(UIStrings21.animating), displayName);
        if (!relatedNodesMap?.size && nodeName) {
          contentHelper.appendTextRow(i18nString21(UIStrings21.relatedNode), nodeName);
        }
        const CLSInsight = Trace24.Insights.Models.CLSCulprits;
        const failures = CLSInsight.getNonCompositedFailure(event);
        if (!failures.length) {
          break;
        }
        const failureReasons = new Set(failures.map((f) => f.failureReasons).flat().filter(Boolean));
        const unsupportedProperties = new Set(failures.map((f) => f.unsupportedProperties).flat().filter(Boolean));
        if (failureReasons.size === 0) {
          contentHelper.appendElementRow(i18nString21(UIStrings21.compositingFailed), i18nString21(UIStrings21.compositingFailedUnknownReason), true);
        } else {
          for (const reason of failureReasons) {
            let str;
            switch (reason) {
              case "ACCELERATED_ANIMATIONS_DISABLED":
                str = i18nString21(UIStrings21.compositingFailedAcceleratedAnimationsDisabled);
                break;
              case "EFFECT_SUPPRESSED_BY_DEVTOOLS":
                str = i18nString21(UIStrings21.compositingFailedEffectSuppressedByDevtools);
                break;
              case "INVALID_ANIMATION_OR_EFFECT":
                str = i18nString21(UIStrings21.compositingFailedInvalidAnimationOrEffect);
                break;
              case "EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS":
                str = i18nString21(UIStrings21.compositingFailedEffectHasUnsupportedTimingParams);
                break;
              case "EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE":
                str = i18nString21(UIStrings21.compositingFailedEffectHasNonReplaceCompositeMode);
                break;
              case "TARGET_HAS_INVALID_COMPOSITING_STATE":
                str = i18nString21(UIStrings21.compositingFailedTargetHasInvalidCompositingState);
                break;
              case "TARGET_HAS_INCOMPATIBLE_ANIMATIONS":
                str = i18nString21(UIStrings21.compositingFailedTargetHasIncompatibleAnimations);
                break;
              case "TARGET_HAS_CSS_OFFSET":
                str = i18nString21(UIStrings21.compositingFailedTargetHasCSSOffset);
                break;
              case "ANIMATION_AFFECTS_NON_CSS_PROPERTIES":
                str = i18nString21(UIStrings21.compositingFailedAnimationAffectsNonCSSProperties);
                break;
              case "TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET":
                str = i18nString21(UIStrings21.compositingFailedTransformRelatedPropertyCannotBeAcceleratedOnTarget);
                break;
              case "TRANSFROM_BOX_SIZE_DEPENDENT":
                str = i18nString21(UIStrings21.compositingFailedTransformDependsBoxSize);
                break;
              case "FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS":
                str = i18nString21(UIStrings21.compositingFailedFilterRelatedPropertyMayMovePixels);
                break;
              case "UNSUPPORTED_CSS_PROPERTY":
                str = i18nString21(UIStrings21.compositingFailedUnsupportedCSSProperty, {
                  propertyCount: unsupportedProperties.size,
                  properties: new Intl.ListFormat(void 0, { style: "short", type: "conjunction" }).format(unsupportedProperties)
                });
                break;
              case "MIXED_KEYFRAME_VALUE_TYPES":
                str = i18nString21(UIStrings21.compositingFailedMixedKeyframeValueTypes);
                break;
              case "TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE":
                str = i18nString21(UIStrings21.compositingFailedTimelineSourceHasInvalidCompositingState);
                break;
              case "ANIMATION_HAS_NO_VISIBLE_CHANGE":
                str = i18nString21(UIStrings21.compositingFailedAnimationHasNoVisibleChange);
                break;
              case "AFFECTS_IMPORTANT_PROPERTY":
                str = i18nString21(UIStrings21.compositingFailedAffectsImportantProperty);
                break;
              case "SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY":
                str = i18nString21(UIStrings21.compositingFailedSVGTargetHasIndependentTransformProperty);
                break;
              default:
                str = i18nString21(UIStrings21.compositingFailedUnknownReason);
                break;
            }
            str && contentHelper.appendElementRow(i18nString21(UIStrings21.compositingFailed), str, true);
          }
        }
        break;
      }
      case "ParseHTML": {
        const beginData = unsafeEventArgs["beginData"];
        const startLine = beginData["startLine"] - 1;
        const endLine = unsafeEventArgs["endData"] ? unsafeEventArgs["endData"]["endLine"] - 1 : void 0;
        url = beginData["url"];
        if (url) {
          contentHelper.appendLocationRange(i18nString21(UIStrings21.range), url, startLine, endLine);
        }
        break;
      }
      // @ts-expect-error Fall-through intended.
      case "FireIdleCallback": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.allottedTime), i18n41.TimeUtilities.millisToString(unsafeEventData["allottedMilliseconds"]));
        contentHelper.appendTextRow(i18nString21(UIStrings21.invokedByTimeout), unsafeEventData["timedOut"]);
      }
      case "RequestIdleCallback":
      case "CancelIdleCallback": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.callbackId), unsafeEventData["id"]);
        if (Trace24.Types.Events.isRequestIdleCallback(event)) {
          contentHelper.appendTextRow(i18nString21(UIStrings21.requestIdleCallbackTimeout), i18n41.TimeUtilities.preciseMillisToString(event.args.data.timeout));
        }
        break;
      }
      case "EventDispatch": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.type), unsafeEventData["type"]);
        break;
      }
      // @ts-expect-error Fall-through intended.
      case "largestContentfulPaint::Candidate": {
        contentHelper.appendTextRow(i18nString21(UIStrings21.type), String(unsafeEventData["type"]));
        contentHelper.appendTextRow(i18nString21(UIStrings21.size), String(unsafeEventData["size"]));
      }
      case "firstPaint":
      case "firstContentfulPaint":
      case "MarkLoad":
      case "MarkDOMContent": {
        const adjustedEventTimeStamp = timeStampForEventAdjustedForClosestNavigationIfPossible(event, parsedTrace);
        contentHelper.appendTextRow(i18nString21(UIStrings21.timestamp), i18n41.TimeUtilities.preciseMillisToString(adjustedEventTimeStamp, 1));
        if (Trace24.Types.Events.isMarkerEvent(event)) {
          contentHelper.appendElementRow(i18nString21(UIStrings21.details), _TimelineUIUtils.buildDetailsNodeForMarkerEvents(event));
        }
        break;
      }
      case "EventTiming": {
        const detailsNode = await _TimelineUIUtils.buildDetailsNodeForTraceEvent(event, targetForEvent(parsedTrace, event), linkifier, isFreshOrEnhanced, parsedTrace);
        if (detailsNode) {
          contentHelper.appendElementRow(i18nString21(UIStrings21.details), detailsNode);
        }
        if (Trace24.Types.Events.isSyntheticInteraction(event)) {
          const inputDelay = i18n41.TimeUtilities.formatMicroSecondsAsMillisFixed(event.inputDelay);
          const mainThreadTime = i18n41.TimeUtilities.formatMicroSecondsAsMillisFixed(event.mainThreadHandling);
          const presentationDelay = i18n41.TimeUtilities.formatMicroSecondsAsMillisFixed(event.presentationDelay);
          contentHelper.appendTextRow(i18nString21(UIStrings21.interactionID), event.interactionId);
          contentHelper.appendTextRow(i18nString21(UIStrings21.inputDelay), inputDelay);
          contentHelper.appendTextRow(i18nString21(UIStrings21.processingDuration), mainThreadTime);
          contentHelper.appendTextRow(i18nString21(UIStrings21.presentationDelay), presentationDelay);
        }
        break;
      }
      default: {
        const detailsNode = await _TimelineUIUtils.buildDetailsNodeForTraceEvent(event, targetForEvent(parsedTrace, event), linkifier, isFreshOrEnhanced, parsedTrace);
        if (detailsNode) {
          contentHelper.appendElementRow(i18nString21(UIStrings21.details), detailsNode);
        }
        break;
      }
    }
    const relatedNodes = relatedNodesMap?.values() || [];
    for (const relatedNode of relatedNodes) {
      if (relatedNode) {
        const nodeSpan = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(relatedNode);
        contentHelper.appendElementRow(relatedNodeLabel || i18nString21(UIStrings21.relatedNode), nodeSpan);
      }
    }
    if (event[previewElementSymbol]) {
      contentHelper.addSection(i18nString21(UIStrings21.preview));
      contentHelper.appendElementRow("", event[previewElementSymbol]);
    }
    if (!entityAppended) {
      const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
      if (originWithEntity) {
        contentHelper.appendElementRow(i18nString21(UIStrings21.origin), originWithEntity);
      }
    }
    const hasStackTrace = Boolean(Trace24.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(event));
    if (Trace24.Types.Events.isUserTiming(event) || Trace24.Types.Extensions.isSyntheticExtensionEntry(event) || Trace24.Types.Events.isProfileCall(event) || initiator || initiatorFor || hasStackTrace || parsedTrace?.data.Invalidations.invalidationsForEvent.get(event)) {
      await _TimelineUIUtils.generateCauses(event, contentHelper, parsedTrace);
    }
    if (Root5.Runtime.experiments.isEnabled(
      "timeline-debug-mode"
      /* Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE */
    )) {
      _TimelineUIUtils.renderEventJson(event, contentHelper);
    }
    const stats = {};
    const showPieChart = canShowPieChart && _TimelineUIUtils.aggregatedStatsForTraceEvent(stats, parsedTrace, event);
    if (showPieChart) {
      contentHelper.addSection(i18nString21(UIStrings21.aggregatedTime));
      const pieChart = _TimelineUIUtils.generatePieChart(stats, _TimelineUIUtils.eventStyle(event).category, selfTime);
      contentHelper.appendElementRow("", pieChart);
    }
    return contentHelper.fragment;
  }
  static statsForTimeRange(events, startTime, endTime) {
    if (!events.length) {
      return { idle: endTime - startTime };
    }
    buildRangeStatsCacheIfNeeded(events);
    const aggregatedStats = subtractStats(aggregatedStatsAtTime(endTime), aggregatedStatsAtTime(startTime));
    const aggregatedTotal = Object.values(aggregatedStats).reduce((a, b) => a + b, 0);
    aggregatedStats["idle"] = Math.max(0, endTime - startTime - aggregatedTotal);
    return aggregatedStats;
    function aggregatedStatsAtTime(time) {
      const stats = {};
      const cache = events[categoryBreakdownCacheSymbol];
      for (const category in cache) {
        const categoryCache = cache[category];
        const index = Platform12.ArrayUtilities.upperBound(categoryCache.time, time, Platform12.ArrayUtilities.DEFAULT_COMPARATOR);
        let value;
        if (index === 0) {
          value = 0;
        } else if (index === categoryCache.time.length) {
          value = categoryCache.value[categoryCache.value.length - 1];
        } else {
          const t0 = categoryCache.time[index - 1];
          const t1 = categoryCache.time[index];
          const v0 = categoryCache.value[index - 1];
          const v1 = categoryCache.value[index];
          value = v0 + (v1 - v0) * (time - t0) / (t1 - t0);
        }
        stats[category] = value;
      }
      return stats;
    }
    function subtractStats(a, b) {
      const result = Object.assign({}, a);
      for (const key in b) {
        result[key] -= b[key];
      }
      return result;
    }
    function buildRangeStatsCacheIfNeeded(events2) {
      if (events2[categoryBreakdownCacheSymbol]) {
        return;
      }
      const aggregatedStats2 = {};
      const categoryStack = [];
      let lastTime = 0;
      Trace24.Helpers.Trace.forEachEvent(events2, {
        onStartEvent,
        onEndEvent
      });
      function updateCategory(category, time) {
        let statsArrays = aggregatedStats2[category];
        if (!statsArrays) {
          statsArrays = { time: [], value: [] };
          aggregatedStats2[category] = statsArrays;
        }
        if (statsArrays.time.length && statsArrays.time[statsArrays.time.length - 1] === time || lastTime > time) {
          return;
        }
        const lastValue = statsArrays.value.length > 0 ? statsArrays.value[statsArrays.value.length - 1] : 0;
        statsArrays.value.push(lastValue + time - lastTime);
        statsArrays.time.push(time);
      }
      function categoryChange(from, to, time) {
        if (from) {
          updateCategory(from, time);
        }
        lastTime = time;
        if (to) {
          updateCategory(to, time);
        }
      }
      function onStartEvent(e) {
        const { startTime: startTime2 } = Trace24.Helpers.Timing.eventTimingsMilliSeconds(e);
        const category = Trace24.Styles.getEventStyle(e.name)?.category.name || Trace24.Styles.getCategoryStyles().other.name;
        const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
        if (category !== parentCategory) {
          categoryChange(parentCategory || null, category, startTime2);
        }
        categoryStack.push(category);
      }
      function onEndEvent(e) {
        const { endTime: endTime2 } = Trace24.Helpers.Timing.eventTimingsMilliSeconds(e);
        const category = categoryStack.pop();
        const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
        if (category !== parentCategory) {
          categoryChange(category || null, parentCategory || null, endTime2 || 0);
        }
      }
      const obj = events2;
      obj[categoryBreakdownCacheSymbol] = aggregatedStats2;
    }
  }
  static renderEventJson(event, contentHelper) {
    contentHelper.addSection(i18nString21(UIStrings21.traceEvent));
    contentHelper.appendElementRow("eventKey", new Trace24.EventsSerializer.EventsSerializer().keyForEvent(event) ?? "?");
    const eventWithArgsFirst = {
      ...{ args: event.args },
      ...event
    };
    const highlightContainer = _TimelineUIUtils.renderObjectJson(eventWithArgsFirst);
    contentHelper.appendElementRow("", highlightContainer);
  }
  static renderObjectJson(obj) {
    const indentLength = Common11.Settings.Settings.instance().moduleSetting("text-editor-indent").get().length;
    const eventStr = JSON.stringify(obj, null, indentLength).slice(0, 1e4).replace(/{\n  /, "{ ");
    const highlightContainer = document.createElement("div");
    const shadowRoot = UI11.UIUtils.createShadowRootWithCoreStyles(highlightContainer, { cssFile: codeHighlighter_css_default });
    const elem = shadowRoot.createChild("div");
    elem.classList.add("monospace", "source-code");
    elem.textContent = eventStr;
    void CodeHighlighter.CodeHighlighter.highlightNode(elem, "text/javascript").then(() => {
      function* iterateTreeWalker(walker2) {
        while (walker2.nextNode()) {
          yield walker2.currentNode;
        }
      }
      const walker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT);
      for (const node of Array.from(iterateTreeWalker(walker))) {
        const frag = _TimelineUIUtils.parseStringForLinks(node.textContent || "");
        node.parentNode?.replaceChild(frag, node);
      }
    });
    return highlightContainer;
  }
  static stackTraceFromCallFrames(callFrames) {
    return { callFrames };
  }
  /** This renders a stack trace... and other cool stuff. */
  static async generateCauses(event, contentHelper, parsedTrace) {
    const { startTime } = Trace24.Helpers.Timing.eventTimingsMilliSeconds(event);
    let initiatorStackLabel = i18nString21(UIStrings21.initiatorStackTrace);
    let stackLabel = i18nString21(UIStrings21.functionStack);
    const stackTraceForEvent = Trace24.Extras.StackTraceForEvent.get(event, parsedTrace.data);
    if (stackTraceForEvent?.callFrames.length || stackTraceForEvent?.description || stackTraceForEvent?.parent) {
      contentHelper.addSection(i18nString21(UIStrings21.functionStack));
      await contentHelper.createChildStackTraceElement(stackTraceForEvent);
    } else {
      const stackTrace = Trace24.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event);
      if (stackTrace?.length) {
        contentHelper.addSection(stackLabel);
        await contentHelper.createChildStackTraceElement(_TimelineUIUtils.stackTraceFromCallFrames(stackTrace));
      }
    }
    switch (event.name) {
      case "TimerFire":
        initiatorStackLabel = i18nString21(UIStrings21.timerInstalled);
        break;
      case "FireAnimationFrame":
        initiatorStackLabel = i18nString21(UIStrings21.animationFrameRequested);
        break;
      case "FireIdleCallback":
        initiatorStackLabel = i18nString21(UIStrings21.idleCallbackRequested);
        break;
      case "UpdateLayoutTree":
        initiatorStackLabel = i18nString21(UIStrings21.firstInvalidated);
        stackLabel = i18nString21(UIStrings21.recalculationForced);
        break;
      case "Layout":
        initiatorStackLabel = i18nString21(UIStrings21.firstLayoutInvalidation);
        stackLabel = i18nString21(UIStrings21.layoutForced);
        break;
    }
    const initiator = parsedTrace.data.Initiators.eventToInitiator.get(event);
    const initiatorFor = parsedTrace.data.Initiators.initiatorToEvents.get(event);
    const invalidations = parsedTrace.data.Invalidations.invalidationsForEvent.get(event);
    if (initiator) {
      const stackTrace = Trace24.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(initiator);
      if (stackTrace) {
        contentHelper.addSection(initiatorStackLabel);
        await contentHelper.createChildStackTraceElement(_TimelineUIUtils.stackTraceFromCallFrames(stackTrace));
      }
      const link = this.createEntryLink(initiator);
      contentHelper.appendElementRow(i18nString21(UIStrings21.initiatedBy), link);
      const { startTime: initiatorStartTime } = Trace24.Helpers.Timing.eventTimingsMilliSeconds(initiator);
      const delay = startTime - initiatorStartTime;
      contentHelper.appendTextRow(i18nString21(UIStrings21.pendingFor), i18n41.TimeUtilities.preciseMillisToString(delay, 1));
    }
    if (initiatorFor) {
      const links = document.createElement("div");
      initiatorFor.map((initiator2, i) => {
        links.appendChild(this.createEntryLink(initiator2));
        if (i < initiatorFor.length - 1) {
          links.append(" ");
        }
      });
      contentHelper.appendElementRow(UIStrings21.initiatorFor, links);
    }
    if (invalidations?.length) {
      const totalInvalidations = parsedTrace.data.Invalidations.invalidationCountForEvent.get(event) ?? 0;
      contentHelper.addSection(i18nString21(UIStrings21.invalidations, { PH1: totalInvalidations }));
      await _TimelineUIUtils.generateInvalidationsList(invalidations, contentHelper);
    }
  }
  static createEntryLink(entry) {
    const link = document.createElement("span");
    const traceBoundsState = TraceBounds11.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      console.error("Tried to link to an entry without any traceBoundsState. This should never happen.");
      return link;
    }
    const isEntryOutsideBreadcrumb = traceBoundsState.micro.minimapTraceBounds.min > entry.ts + (entry.dur || 0) || traceBoundsState.micro.minimapTraceBounds.max < entry.ts;
    const isEntryHidden = ModificationsManager.activeManager()?.getEntriesFilter().entryIsInvisible(entry);
    if (!isEntryOutsideBreadcrumb) {
      link.classList.add("timeline-link");
      UI11.ARIAUtils.markAsLink(link);
      link.tabIndex = 0;
      link.addEventListener("click", () => {
        TimelinePanel.instance().select(selectionFromEvent(entry));
      });
      link.addEventListener("keydown", (event) => {
        if (event.key === Platform12.KeyboardUtilities.ENTER_KEY) {
          TimelinePanel.instance().select(selectionFromEvent(entry));
          event.consume(true);
        }
      });
    }
    if (isEntryHidden) {
      link.textContent = this.eventTitle(entry) + " " + i18nString21(UIStrings21.entryIsHidden);
    } else if (isEntryOutsideBreadcrumb) {
      link.textContent = this.eventTitle(entry) + " " + i18nString21(UIStrings21.outsideBreadcrumbRange);
    } else {
      link.textContent = this.eventTitle(entry);
    }
    return link;
  }
  static async generateInvalidationsList(invalidations, contentHelper) {
    const { groupedByReason, backendNodeIds } = TimelineComponents4.DetailsView.generateInvalidationsList(invalidations);
    let relatedNodesMap = null;
    const target = SDK8.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK8.DOMModel.DOMModel);
    if (domModel) {
      relatedNodesMap = await domModel.pushNodesByBackendIdsToFrontend(backendNodeIds);
    }
    Object.keys(groupedByReason).forEach((reason) => {
      _TimelineUIUtils.generateInvalidationsForReason(reason, groupedByReason[reason], relatedNodesMap, contentHelper);
    });
  }
  static generateInvalidationsForReason(reason, invalidations, relatedNodesMap, contentHelper) {
    function createLinkForInvalidationNode(invalidation) {
      const node = invalidation.args.data.nodeId && relatedNodesMap ? relatedNodesMap.get(invalidation.args.data.nodeId) : null;
      if (node) {
        const nodeSpan2 = document.createElement("span");
        nodeSpan2.appendChild(PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node));
        return nodeSpan2;
      }
      if (invalidation.args.data.nodeName) {
        const nodeSpan2 = document.createElement("span");
        nodeSpan2.textContent = invalidation.args.data.nodeName;
        return nodeSpan2;
      }
      const nodeSpan = document.createElement("span");
      UI11.UIUtils.createTextChild(nodeSpan, i18nString21(UIStrings21.UnknownNode));
      return nodeSpan;
    }
    const generatedItems = /* @__PURE__ */ new Set();
    for (const invalidation of invalidations) {
      const stackTrace = Trace24.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(invalidation);
      let scriptLink = null;
      const callFrame = stackTrace?.at(0);
      if (callFrame) {
        scriptLink = contentHelper.linkifier()?.maybeLinkifyScriptLocation(SDK8.TargetManager.TargetManager.instance().rootTarget(), callFrame.scriptId, callFrame.url, callFrame.lineNumber) || null;
      }
      const niceNodeLink = createLinkForInvalidationNode(invalidation);
      const text = scriptLink ? uiI18n.getFormatLocalizedString(str_21, UIStrings21.invalidationWithCallFrame, { PH1: niceNodeLink, PH2: scriptLink }) : niceNodeLink;
      const generatedText = typeof text === "string" ? text : text.innerText;
      if (generatedItems.has(generatedText)) {
        continue;
      }
      generatedItems.add(generatedText);
      contentHelper.appendElementRow(reason, text);
    }
  }
  /** Populates the passed object then returns true/false if it makes sense to show the pie chart */
  static aggregatedStatsForTraceEvent(total, parsedTrace, event) {
    const node = parsedTrace.data.Renderer.entryToNode.get(event);
    if (!node) {
      return false;
    }
    if (node.children.length === 0) {
      return false;
    }
    const childNodesToVisit = [...node.children];
    while (childNodesToVisit.length) {
      const childNode = childNodesToVisit.pop();
      if (!childNode) {
        continue;
      }
      const childSelfTime = childNode.selfTime ?? 0;
      if (childSelfTime > 0) {
        const categoryName = _TimelineUIUtils.eventStyle(childNode.entry).category.name;
        total[categoryName] = (total[categoryName] || 0) + childSelfTime;
      }
      childNodesToVisit.push(...childNode.children);
    }
    if (Trace24.Types.Events.isPhaseAsync(event.ph)) {
      let aggregatedTotal = 0;
      for (const categoryName in total) {
        aggregatedTotal += total[categoryName];
      }
      const { startTime, endTime } = Trace24.Helpers.Timing.eventTimingsMicroSeconds(event);
      const deltaInMicro = endTime - startTime;
      total["idle"] = Math.max(0, deltaInMicro - aggregatedTotal);
      return false;
    }
    for (const categoryName in total) {
      const value = total[categoryName];
      total[categoryName] = Trace24.Helpers.Timing.microToMilli(value);
    }
    return true;
  }
  static async buildPicturePreviewContent(parsedTrace, event, target) {
    const snapshotEvent = parsedTrace.data.LayerTree.paintsToSnapshots.get(event);
    if (!snapshotEvent) {
      return null;
    }
    const paintProfilerModel = target.model(SDK8.PaintProfiler.PaintProfilerModel);
    if (!paintProfilerModel) {
      return null;
    }
    const snapshot = await paintProfilerModel.loadSnapshot(snapshotEvent.args.snapshot.skp64);
    if (!snapshot) {
      return null;
    }
    const snapshotWithRect = {
      snapshot,
      rect: snapshotEvent.args.snapshot.params?.layer_rect
    };
    if (!snapshotWithRect) {
      return null;
    }
    const imageURLPromise = snapshotWithRect.snapshot.replay();
    snapshotWithRect.snapshot.release();
    const imageURL = await imageURLPromise;
    if (!imageURL) {
      return null;
    }
    const stylesContainer = document.createElement("div");
    const shadowRoot = stylesContainer.attachShadow({ mode: "open" });
    shadowRoot.createChild("style").textContent = imagePreview_css_default;
    const container = shadowRoot.createChild("div");
    container.classList.add("image-preview-container", "vbox", "link");
    const img = container.createChild("img");
    img.src = imageURL;
    img.alt = LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(imageURL);
    const paintProfilerButton = container.createChild("a");
    paintProfilerButton.textContent = i18nString21(UIStrings21.paintProfiler);
    UI11.ARIAUtils.markAsLink(container);
    container.tabIndex = 0;
    container.addEventListener("click", () => TimelinePanel.instance().select(selectionFromEvent(event)), false);
    container.addEventListener("keydown", (keyEvent) => {
      if (keyEvent.key === Platform12.KeyboardUtilities.ENTER_KEY) {
        TimelinePanel.instance().select(selectionFromEvent(event));
        keyEvent.consume(true);
      }
    });
    return stylesContainer;
  }
  static createEventDivider(event, zeroTime) {
    const eventDivider = document.createElement("div");
    eventDivider.classList.add("resources-event-divider");
    const { startTime: eventStartTime } = Trace24.Helpers.Timing.eventTimingsMilliSeconds(event);
    const startTime = i18n41.TimeUtilities.millisToString(eventStartTime - zeroTime);
    UI11.Tooltip.Tooltip.install(eventDivider, i18nString21(UIStrings21.sAtS, { PH1: _TimelineUIUtils.eventTitle(event), PH2: startTime }));
    const style = _TimelineUIUtils.markerStyleForEvent(event);
    if (style.tall) {
      eventDivider.style.backgroundColor = style.color;
    }
    return eventDivider;
  }
  static visibleEventsFilter() {
    return new Trace24.Extras.TraceFilter.VisibleEventsFilter(Trace24.Styles.visibleTypes());
  }
  // Included only for layout tests.
  // TODO(crbug.com/1386091): Fix/port layout tests and remove.
  static categories() {
    return Trace24.Styles.getCategoryStyles();
  }
  static generatePieChart(aggregatedStats, selfCategory, selfTime) {
    let total = 0;
    for (const categoryName in aggregatedStats) {
      total += aggregatedStats[categoryName];
    }
    const element = document.createElement("div");
    element.classList.add("timeline-details-view-pie-chart-wrapper");
    element.classList.add("hbox");
    const pieChart = new PerfUI13.PieChart.PieChart();
    const slices = [];
    function appendLegendRow(title, value, color) {
      if (!value) {
        return;
      }
      slices.push({ value, color, title });
    }
    if (selfCategory) {
      const selfTimeMilli = Trace24.Helpers.Timing.microToMilli(selfTime || 0);
      if (selfTime) {
        appendLegendRow(i18nString21(UIStrings21.sSelf, { PH1: selfCategory.title }), selfTimeMilli, selfCategory.getCSSValue());
      }
      const categoryTime = aggregatedStats[selfCategory.name];
      const value = categoryTime - (selfTimeMilli || 0);
      if (value > 0) {
        appendLegendRow(i18nString21(UIStrings21.sChildren, { PH1: selfCategory.title }), value, selfCategory.getCSSValue());
      }
    }
    for (const categoryName in Trace24.Styles.getCategoryStyles()) {
      const category = Trace24.Styles.getCategoryStyles()[categoryName];
      if (categoryName === selfCategory?.name) {
        continue;
      }
      appendLegendRow(category.title, aggregatedStats[category.name], category.getCSSValue());
    }
    pieChart.data = {
      chartName: i18nString21(UIStrings21.timeSpentInRendering),
      size: 110,
      formatter: (value) => i18n41.TimeUtilities.preciseMillisToString(value),
      showLegend: true,
      total,
      slices
    };
    const pieChartContainer = element.createChild("div", "vbox");
    pieChartContainer.appendChild(pieChart);
    return element;
  }
  // Generates a Summary component given a aggregated stats for categories.
  static generateSummaryDetails(aggregatedStats, rangeStart, rangeEnd, selectedEvents, thirdPartyTree) {
    const element = document.createElement("div");
    element.classList.add("timeline-details-range-summary", "hbox");
    let total = 0;
    let categories2 = [];
    for (const categoryName in aggregatedStats) {
      total += aggregatedStats[categoryName];
    }
    for (const categoryName in Trace24.Styles.getCategoryStyles()) {
      const category = Trace24.Styles.getCategoryStyles()[categoryName];
      if (category.name === Trace24.Styles.EventCategory.IDLE) {
        continue;
      }
      const value = aggregatedStats[category.name];
      if (!value) {
        continue;
      }
      const title = category.title;
      const color = category.getCSSValue();
      categories2.push({ value, color, title });
    }
    categories2 = categories2.sort((a, b) => b.value - a.value);
    const start = Trace24.Types.Timing.Milli(rangeStart);
    const end = Trace24.Types.Timing.Milli(rangeEnd);
    const categorySummaryTable = new TimelineComponents4.TimelineSummary.CategorySummary();
    categorySummaryTable.data = {
      rangeStart: start,
      rangeEnd: end,
      total,
      categories: categories2,
      selectedEvents
    };
    element.append(categorySummaryTable);
    const treeView = new ThirdPartyTreeElement();
    treeView.treeView = thirdPartyTree;
    UI11.ARIAUtils.setLabel(treeView, i18nString21(UIStrings21.thirdPartyTable));
    element.append(treeView);
    return element;
  }
  static generateDetailsContentForFrame(frame, filmStrip, filmStripFrame) {
    const contentHelper = new TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(i18nString21(UIStrings21.frame));
    const duration = _TimelineUIUtils.frameDuration(frame);
    contentHelper.appendElementRow(i18nString21(UIStrings21.duration), duration);
    if (filmStrip && filmStripFrame) {
      const filmStripPreview = document.createElement("div");
      filmStripPreview.classList.add("timeline-filmstrip-preview");
      const uri = Trace24.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(filmStripFrame.screenshotEvent);
      void UI11.UIUtils.loadImage(uri).then((image) => image && filmStripPreview.appendChild(image));
      contentHelper.appendElementRow("", filmStripPreview);
      filmStripPreview.addEventListener("click", frameClicked.bind(null, filmStrip, filmStripFrame), false);
    }
    function frameClicked(filmStrip2, filmStripFrame2) {
      PerfUI13.FilmStripView.Dialog.fromFilmStrip(filmStrip2, filmStripFrame2.index);
    }
    return contentHelper.fragment;
  }
  static frameDuration(frame) {
    const offsetMilli = Trace24.Helpers.Timing.microToMilli(frame.startTimeOffset);
    const durationMilli = Trace24.Helpers.Timing.microToMilli(Trace24.Types.Timing.Micro(frame.endTime - frame.startTime));
    const durationText = i18nString21(UIStrings21.sAtSParentheses, {
      PH1: i18n41.TimeUtilities.millisToString(durationMilli, true),
      PH2: i18n41.TimeUtilities.millisToString(offsetMilli, true)
    });
    return uiI18n.getFormatLocalizedString(str_21, UIStrings21.emptyPlaceholder, { PH1: durationText });
  }
  static quadWidth(quad) {
    return Math.round(Math.sqrt(Math.pow(quad[0] - quad[2], 2) + Math.pow(quad[1] - quad[3], 2)));
  }
  static quadHeight(quad) {
    return Math.round(Math.sqrt(Math.pow(quad[0] - quad[6], 2) + Math.pow(quad[1] - quad[7], 2)));
  }
  static eventDispatchDesciptors() {
    if (eventDispatchDesciptors) {
      return eventDispatchDesciptors;
    }
    const lightOrange = "hsl(40,100%,80%)";
    const orange = "hsl(40,100%,50%)";
    const green = "hsl(90,100%,40%)";
    const purple = "hsl(256,100%,75%)";
    eventDispatchDesciptors = [
      new EventDispatchTypeDescriptor(1, lightOrange, ["mousemove", "mouseenter", "mouseleave", "mouseout", "mouseover"]),
      new EventDispatchTypeDescriptor(1, lightOrange, ["pointerover", "pointerout", "pointerenter", "pointerleave", "pointermove"]),
      new EventDispatchTypeDescriptor(2, green, ["wheel"]),
      new EventDispatchTypeDescriptor(3, orange, ["click", "mousedown", "mouseup"]),
      new EventDispatchTypeDescriptor(3, orange, ["touchstart", "touchend", "touchmove", "touchcancel"]),
      new EventDispatchTypeDescriptor(3, orange, ["pointerdown", "pointerup", "pointercancel", "gotpointercapture", "lostpointercapture"]),
      new EventDispatchTypeDescriptor(3, purple, ["keydown", "keyup", "keypress"])
    ];
    return eventDispatchDesciptors;
  }
  static markerStyleForEvent(event) {
    const tallMarkerDashStyle = [6, 4];
    const title = _TimelineUIUtils.eventTitle(event);
    if (event.name !== "navigationStart" && (Trace24.Helpers.Trace.eventHasCategory(event, Trace24.Types.Events.Categories.Console) || Trace24.Helpers.Trace.eventHasCategory(event, Trace24.Types.Events.Categories.UserTiming))) {
      return {
        title,
        dashStyle: tallMarkerDashStyle,
        lineWidth: 0.5,
        color: Trace24.Helpers.Trace.eventHasCategory(event, Trace24.Types.Events.Categories.Console) ? "purple" : "orange",
        tall: false,
        lowPriority: false
      };
    }
    let tall = false;
    let color = "grey";
    switch (event.name) {
      case "navigationStart":
        color = "var(--color-text-primary)";
        tall = true;
        break;
      case "FrameStartedLoading":
        color = "green";
        tall = true;
        break;
      case "MarkDOMContent":
        color = "var(--color-text-disabled)";
        tall = true;
        break;
      case "MarkLoad":
        color = "var(--color-text-disabled)";
        tall = true;
        break;
      case "firstPaint":
        color = "#228847";
        tall = true;
        break;
      case "firstContentfulPaint":
        color = "var(--sys-color-green-bright)";
        tall = true;
        break;
      case "largestContentfulPaint::Candidate":
        color = "var(--sys-color-green)";
        tall = true;
        break;
      case "TimeStamp":
        color = "orange";
        break;
    }
    return {
      title,
      dashStyle: tallMarkerDashStyle,
      lineWidth: 0.5,
      color,
      tall,
      lowPriority: false
    };
  }
  static colorForId(id) {
    if (!colorGenerator) {
      colorGenerator = new Common11.Color.Generator({ min: 30, max: 330, count: void 0 }, { min: 50, max: 80, count: 3 }, 85);
      colorGenerator.setColorForID("", "#f2ecdc");
    }
    return colorGenerator.colorForID(id);
  }
  static displayNameForFrame(frame, trimAt = 80) {
    const url = frame.url;
    return Common11.ParsedURL.schemeIs(url, "about:") ? `"${Platform12.StringUtilities.trimMiddle(frame.name, trimAt)}"` : frame.url.slice(0, trimAt);
  }
  static getOriginWithEntity(entityMapper, parsedTrace, event) {
    const resolvedURL = SourceMapsResolver3.SourceMapsResolver.resolvedURLForEntry(parsedTrace, event);
    if (!resolvedURL) {
      return null;
    }
    const parsedUrl = URL.parse(resolvedURL);
    if (!parsedUrl) {
      return null;
    }
    const entity = entityMapper?.entityForEvent(event) ?? null;
    if (!entity) {
      return null;
    }
    const originWithEntity = Utils4.Helpers.formatOriginWithEntity(parsedUrl, entity, true);
    return originWithEntity;
  }
};
var aggregatedStatsKey = Symbol("aggregatedStats");
var previewElementSymbol = Symbol("previewElement");
var EventDispatchTypeDescriptor = class {
  priority;
  color;
  eventTypes;
  constructor(priority, color, eventTypes) {
    this.priority = priority;
    this.color = color;
    this.eventTypes = eventTypes;
  }
};
var TimelineDetailsContentHelper = class {
  fragment;
  #linkifier;
  target;
  element;
  tableElement;
  constructor(target, linkifier) {
    this.fragment = document.createDocumentFragment();
    this.#linkifier = linkifier;
    this.target = target;
    this.element = document.createElement("div");
    this.element.classList.add("timeline-details-view-block");
    this.tableElement = this.element.createChild("div", "vbox timeline-details-chip-body");
    this.fragment.appendChild(this.element);
  }
  addSection(title, swatchColor, event) {
    if (!this.tableElement.hasChildNodes()) {
      this.element.removeChildren();
    } else {
      this.element = document.createElement("div");
      this.element.classList.add("timeline-details-view-block");
      this.fragment.appendChild(this.element);
    }
    if (title) {
      const titleElement = this.element.createChild("div", "timeline-details-chip-title");
      if (swatchColor) {
        titleElement.createChild("div").style.backgroundColor = swatchColor;
      }
      const textChild = titleElement.createChild("span");
      textChild.textContent = title;
      if (event) {
        textChild.classList.add("timeline-details-chip-title-reveal-entry");
        textChild.addEventListener("click", function() {
          TimelinePanel.instance().zoomEvent(event);
        });
      }
    }
    this.tableElement = this.element.createChild("div", "vbox timeline-details-chip-body");
    this.fragment.appendChild(this.element);
  }
  linkifier() {
    return this.#linkifier;
  }
  appendTextRow(title, value) {
    const rowElement = this.tableElement.createChild("div", "timeline-details-view-row");
    rowElement.createChild("div", "timeline-details-view-row-title").textContent = title;
    rowElement.createChild("div", "timeline-details-view-row-value").textContent = value.toString();
  }
  appendElementRow(title, content, isWarning, isStacked) {
    const rowElement = this.tableElement.createChild("div", "timeline-details-view-row");
    rowElement.setAttribute("data-row-title", title);
    if (isWarning) {
      rowElement.classList.add("timeline-details-warning");
    }
    if (isStacked) {
      rowElement.classList.add("timeline-details-stack-values");
    }
    const titleElement = rowElement.createChild("div", "timeline-details-view-row-title");
    titleElement.textContent = title;
    const valueElement = rowElement.createChild("div", "timeline-details-view-row-value");
    if (content instanceof Node) {
      valueElement.appendChild(content);
    } else {
      UI11.UIUtils.createTextChild(valueElement, content || "");
    }
  }
  appendLocationRow(title, url, startLine, startColumn, text, omitOrigin) {
    if (!this.#linkifier) {
      return;
    }
    const options = {
      tabStop: true,
      columnNumber: startColumn,
      showColumnNumber: true,
      inlineFrameIndex: 0,
      text,
      omitOrigin
    };
    const link = this.#linkifier.maybeLinkifyScriptLocation(this.target, null, url, startLine, options);
    if (!link) {
      return;
    }
    this.appendElementRow(title, link);
  }
  appendLocationRange(title, url, startLine, endLine) {
    if (!this.#linkifier || !this.target) {
      return;
    }
    const locationContent = document.createElement("span");
    const link = this.#linkifier.maybeLinkifyScriptLocation(this.target, null, url, startLine, { tabStop: true, inlineFrameIndex: 0 });
    if (!link) {
      return;
    }
    locationContent.appendChild(link);
    UI11.UIUtils.createTextChild(locationContent, Platform12.StringUtilities.sprintf(" [%s\u2026%s]", startLine + 1, (endLine || 0) + 1 || ""));
    this.appendElementRow(title, locationContent);
  }
  async createChildStackTraceElement(runtimeStackTrace) {
    if (!this.#linkifier) {
      return;
    }
    let callFrameContents;
    if (this.target) {
      const stackTrace = await Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(runtimeStackTrace, this.target);
      callFrameContents = new LegacyComponents.JSPresentationUtils.StackTracePreviewContent(void 0, this.target ?? void 0, this.#linkifier, { tabStops: true, showColumnNumber: true });
      callFrameContents.stackTrace = stackTrace;
      await callFrameContents.updateComplete;
    } else {
      callFrameContents = new LegacyComponents.JSPresentationUtils.StackTracePreviewContent(void 0, this.target ?? void 0, this.#linkifier, { runtimeStackTrace, tabStops: true, showColumnNumber: true });
    }
    const stackTraceElement = this.tableElement.createChild("div", "timeline-details-view-row timeline-details-stack-values");
    callFrameContents.markAsRoot();
    callFrameContents.show(stackTraceElement);
  }
};
var categoryBreakdownCacheSymbol = Symbol("categoryBreakdownCache");
function timeStampForEventAdjustedForClosestNavigationIfPossible(event, parsedTrace) {
  if (!parsedTrace) {
    const { startTime } = Trace24.Helpers.Timing.eventTimingsMilliSeconds(event);
    return startTime;
  }
  const time = Trace24.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(event, parsedTrace.data.Meta.traceBounds, parsedTrace.data.Meta.navigationsByNavigationId, parsedTrace.data.Meta.navigationsByFrameId);
  return Trace24.Helpers.Timing.microToMilli(time);
}
function isMarkerEvent(parsedTrace, event) {
  const { Name: Name8 } = Trace24.Types.Events;
  if (event.name === "TimeStamp" || event.name === "navigationStart") {
    return true;
  }
  if (Trace24.Types.Events.isFirstContentfulPaint(event) || Trace24.Types.Events.isFirstPaint(event)) {
    return event.args.frame === parsedTrace.data.Meta.mainFrameId;
  }
  if (Trace24.Types.Events.isMarkDOMContent(event) || Trace24.Types.Events.isMarkLoad(event) || Trace24.Types.Events.isLargestContentfulPaintCandidate(event)) {
    if (!event.args.data) {
      return false;
    }
    const { isOutermostMainFrame, isMainFrame } = event.args.data;
    if (typeof isOutermostMainFrame !== "undefined") {
      return isOutermostMainFrame;
    }
    return Boolean(isMainFrame);
  }
  return false;
}
function getEventSelfTime(event, parsedTrace) {
  const mapToUse = Trace24.Types.Extensions.isSyntheticExtensionEntry(event) ? parsedTrace.data.ExtensionTraceData.entryToNode : parsedTrace.data.Renderer.entryToNode;
  const selfTime = mapToUse.get(event)?.selfTime;
  return selfTime ? selfTime : Trace24.Types.Timing.Micro(0);
}

// gen/front_end/panels/timeline/TimelineFilters.js
var IsLong = class extends Trace25.Extras.TraceFilter.TraceFilter {
  #minimumRecordDurationMilli = Trace25.Types.Timing.Milli(0);
  setMinimumRecordDuration(value) {
    this.#minimumRecordDurationMilli = value;
  }
  accept(event) {
    const { duration } = Trace25.Helpers.Timing.eventTimingsMilliSeconds(event);
    return duration >= this.#minimumRecordDurationMilli;
  }
};
var Category = class extends Trace25.Extras.TraceFilter.TraceFilter {
  accept(event) {
    return !TimelineUIUtils.eventStyle(event).category.hidden;
  }
};
var TimelineRegExp = class extends Trace25.Extras.TraceFilter.TraceFilter {
  #regExp;
  constructor(regExp) {
    super();
    this.setRegExp(regExp || null);
  }
  setRegExp(regExp) {
    this.#regExp = regExp;
  }
  regExp() {
    return this.#regExp;
  }
  accept(event, handlerData) {
    return !this.#regExp || TimelineUIUtils.testContentMatching(event, this.#regExp, handlerData);
  }
};

// gen/front_end/panels/timeline/EventsTimelineTreeView.js
var UIStrings22 = {
  /**
   * @description Text for the start time of an activity
   */
  startTime: "Start time",
  /**
   * @description Screen reader label for a select box that filters the Performance panel Event Log by duration.
   */
  durationFilter: "Duration filter",
  /**
   * @description Text for everything
   */
  all: "All"
};
var str_22 = i18n43.i18n.registerUIStrings("panels/timeline/EventsTimelineTreeView.ts", UIStrings22);
var i18nString22 = i18n43.i18n.getLocalizedString.bind(void 0, str_22);
var EventsTimelineTreeView = class extends TimelineTreeView {
  filtersControl;
  delegate;
  currentTree;
  constructor(delegate) {
    super();
    this.element.setAttribute("jslog", `${VisualLogging7.pane("event-log").track({ resize: true })}`);
    this.filtersControl = new Filters();
    this.filtersControl.addEventListener("FilterChanged", this.onFilterChanged, this);
    this.init();
    this.delegate = delegate;
    this.dataGrid.markColumnAsSortedBy("start-time", DataGrid5.DataGrid.Order.Ascending);
    this.splitWidget.showBoth();
  }
  filters() {
    return [...super.filters(), ...this.filtersControl.filters()];
  }
  updateContents(selection) {
    super.updateContents(selection);
    if (selectionIsEvent(selection)) {
      this.selectEvent(selection.event, true);
    }
  }
  buildTree() {
    this.currentTree = this.buildTopDownTree(true, null);
    return this.currentTree;
  }
  onFilterChanged() {
    const lastSelectedNode = this.lastSelectedNode();
    const selectedEvent = lastSelectedNode?.event;
    this.refreshTree();
    if (selectedEvent) {
      this.selectEvent(selectedEvent, false);
    }
  }
  selectEvent(event, expand) {
    const node = this.eventToTreeNode.get(event);
    if (!node) {
      return;
    }
    this.selectProfileNode(node, false);
    if (expand) {
      const dataGridNode = this.dataGridNodeForTreeNode(node);
      if (dataGridNode) {
        dataGridNode.expand();
      }
    }
  }
  populateColumns(columns) {
    columns.push({
      id: "start-time",
      title: i18nString22(UIStrings22.startTime),
      width: "80px",
      fixedWidth: true,
      sortable: true
    });
    super.populateColumns(columns);
    columns.filter((c) => c.fixedWidth).forEach((c) => {
      c.width = "80px";
    });
  }
  populateToolbar(toolbar4) {
    super.populateToolbar(toolbar4);
    this.filtersControl.populateToolbar(toolbar4);
  }
  showDetailsForNode(node) {
    const parsedTrace = this.parsedTrace();
    if (!parsedTrace) {
      return false;
    }
    const traceEvent = node.event;
    if (!traceEvent) {
      return false;
    }
    void TimelineUIUtils.buildTraceEventDetails(parsedTrace, traceEvent, this.linkifier, false, null).then((fragment) => this.detailsView.element.appendChild(fragment));
    return true;
  }
  onHover(node) {
    this.delegate.highlightEvent(node?.event ?? null);
  }
};
var Filters = class _Filters extends Common12.ObjectWrapper.ObjectWrapper {
  categoryFilter;
  durationFilter;
  #filters;
  constructor() {
    super();
    this.categoryFilter = new Category();
    this.durationFilter = new IsLong();
    this.#filters = [this.categoryFilter, this.durationFilter];
  }
  filters() {
    return this.#filters;
  }
  populateToolbar(toolbar4) {
    const durationFilterUI = new UI12.Toolbar.ToolbarComboBox(durationFilterChanged.bind(this), i18nString22(UIStrings22.durationFilter), void 0, "duration");
    for (const durationMs of _Filters.durationFilterPresetsMs) {
      durationFilterUI.addOption(durationFilterUI.createOption(durationMs ? `\u2265 ${i18n43.TimeUtilities.millisToString(durationMs)}` : i18nString22(UIStrings22.all), String(durationMs)));
    }
    toolbar4.appendToolbarItem(durationFilterUI);
    const categoryFiltersUI = /* @__PURE__ */ new Map();
    const categories2 = Trace26.Styles.getCategoryStyles();
    for (const categoryName in categories2) {
      const category = categories2[categoryName];
      if (!category.visible) {
        continue;
      }
      const checkbox = new UI12.Toolbar.ToolbarCheckbox(category.title, void 0, categoriesFilterChanged.bind(this, categoryName), categoryName);
      checkbox.setChecked(true);
      categoryFiltersUI.set(category.name, checkbox);
      toolbar4.appendToolbarItem(checkbox);
    }
    function durationFilterChanged() {
      const duration = durationFilterUI.selectedOption().value;
      const minimumRecordDuration = parseInt(duration, 10);
      this.durationFilter.setMinimumRecordDuration(Trace26.Types.Timing.Milli(minimumRecordDuration));
      this.notifyFiltersChanged();
    }
    function categoriesFilterChanged(name) {
      const categories3 = Trace26.Styles.getCategoryStyles();
      const checkBox = categoryFiltersUI.get(name);
      categories3[name].hidden = !checkBox?.checked();
      this.notifyFiltersChanged();
    }
  }
  notifyFiltersChanged() {
    this.dispatchEventToListeners(
      "FilterChanged"
      /* Events.FILTER_CHANGED */
    );
  }
  static durationFilterPresetsMs = [0, 1, 15];
};

// gen/front_end/panels/timeline/timelineDetailsView.css.js
var timelineDetailsView_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  .timeline-details {
    vertical-align: top;
  }

  .timeline-details-view {
    color: var(--sys-color-on-surface);
    overflow: hidden;
  }

  .timeline-details-view-body {
    flex: auto;
    overflow: auto;
    position: relative;
    background-color: var(--sys-color-cdt-base-container);
    user-select: text;
  }

  .timeline-details-view-block {
    flex: none;
    display: flex;
    background-color: var(--sys-color-cdt-base-container);
    flex-direction: column;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--sys-color-divider);
  }

  .timeline-details-view-row {
    padding-left: 10px;
    min-height: 20px;
    line-height: 16px; /* Vertically center text within row, important for background-color rows like .timeline-details-warning */
  }

  .timeline-details-view-block .timeline-details-stack-values {
    flex-direction: column !important; /* stylelint-disable-line declaration-no-important */
  }

  .timeline-details-chip-title {
    font-size: 12px;
    padding: 8px;
    display: flex;
    align-items: center;
  }

  .timeline-details-chip-title-reveal-entry:hover {
    background: var(--sys-color-state-hover-on-subtle);
    cursor: pointer;
  }

  .timeline-details-view-block:first-child > .timeline-details-chip-title {
    font-size: 13px;
  }

  .timeline-details-range-summary {
    padding: var(--sys-size-4) 0 0;
    height: 100%;

    & > devtools-performance-timeline-summary {
      /* The category summary can't be more narrow than this, so we'll force a horizontal scrollbar
        Also this style can't be applied on the element's :host without !important, thus its here. */
      min-width: 192px;
    }
  }

  /* This is the coloured box that shows next to the event name */
  .timeline-details-chip-title > div {
    width: 14px;
    height: 14px;
    border: 1px solid var(--sys-color-divider);
    display: inline-block;
    margin-right: 4px;
    content: " ";
  }

  .timeline-details-view-row-title:not(:empty) {
    color: var(--sys-color-token-subtle);
    overflow: hidden;
    padding-right: 10px;
    display: inline-block;
    vertical-align: top;
  }

  .timeline-details-warning {
    --override-details-warning-background-color: rgb(250 209 209 / 48%);

    background-color: var(--override-details-warning-background-color);
  }

  .theme-with-dark-background .timeline-details-warning,
  :host-context(.theme-with-dark-background) .timeline-details-warning {
    --override-details-warning-background-color: rgb(87 10 10 / 48%);
  }

  .timeline-details-warning .timeline-details-view-row-title {
    color: var(--sys-color-error);
  }

  .timeline-details-view-row-value {
    display: inline-block;
    user-select: text;
    text-overflow: ellipsis;
    overflow: visible;
  }

  .timeline-details-warning .timeline-details-view-row-value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline-details-view-pie-chart-wrapper {
    margin: 4px 0;
  }

  .timeline-details-view-pie-chart {
    margin-top: 5px;
  }
}

/*# sourceURL=${import.meta.resolve("./timelineDetailsView.css")} */`;

// gen/front_end/panels/timeline/TimelineLayersView.js
var TimelineLayersView_exports = {};
__export(TimelineLayersView_exports, {
  TimelineLayersView: () => TimelineLayersView
});
import * as UI13 from "./../../ui/legacy/legacy.js";
import * as LayerViewer from "./../layer_viewer/layer_viewer.js";
var TimelineLayersView = class extends UI13.SplitWidget.SplitWidget {
  showPaintProfilerCallback;
  rightSplitWidget;
  layerViewHost;
  layers3DView;
  frameLayerTree;
  updateWhenVisible;
  constructor(showPaintProfilerCallback) {
    super(true, false, "timeline-layers-view");
    this.showPaintProfilerCallback = showPaintProfilerCallback;
    this.element.classList.add("timeline-layers-view");
    this.rightSplitWidget = new UI13.SplitWidget.SplitWidget(true, true, "timeline-layers-view-details");
    this.rightSplitWidget.element.classList.add("timeline-layers-view-properties");
    this.setMainWidget(this.rightSplitWidget);
    const vbox = new UI13.Widget.VBox();
    this.setSidebarWidget(vbox);
    this.layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();
    const layerTreeOutline = new LayerViewer.LayerTreeOutline.LayerTreeOutline(this.layerViewHost);
    vbox.element.appendChild(layerTreeOutline.element);
    this.layers3DView = new LayerViewer.Layers3DView.Layers3DView(this.layerViewHost);
    this.layers3DView.addEventListener("PaintProfilerRequested", this.onPaintProfilerRequested, this);
    this.rightSplitWidget.setMainWidget(this.layers3DView);
    const layerDetailsView = new LayerViewer.LayerDetailsView.LayerDetailsView(this.layerViewHost);
    this.rightSplitWidget.setSidebarWidget(layerDetailsView);
    layerDetailsView.addEventListener("PaintProfilerRequested", this.onPaintProfilerRequested, this);
  }
  showLayerTree(frameLayerTree) {
    this.frameLayerTree = frameLayerTree;
    if (this.isShowing()) {
      this.update();
    } else {
      this.updateWhenVisible = true;
    }
  }
  wasShown() {
    super.wasShown();
    if (this.updateWhenVisible) {
      this.updateWhenVisible = false;
      this.update();
    }
  }
  async onPaintProfilerRequested(event) {
    const selection = event.data;
    const snapshotWithRect = await this.layers3DView.snapshotForSelection(selection);
    if (snapshotWithRect) {
      this.showPaintProfilerCallback(snapshotWithRect.snapshot);
    }
  }
  update() {
    if (this.frameLayerTree) {
      void this.frameLayerTree.layerTreePromise().then((layerTree) => this.layerViewHost.setLayerTree(layerTree));
    }
  }
};

// gen/front_end/panels/timeline/TimelinePaintProfilerView.js
var TimelinePaintProfilerView_exports = {};
__export(TimelinePaintProfilerView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  TimelinePaintImageView: () => TimelinePaintImageView,
  TimelinePaintProfilerView: () => TimelinePaintProfilerView
});
import * as SDK10 from "./../../core/sdk/sdk.js";
import * as Geometry2 from "./../../models/geometry/geometry.js";
import * as Trace27 from "./../../models/trace/trace.js";
import * as UI14 from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as LayerViewer2 from "./../layer_viewer/layer_viewer.js";

// gen/front_end/panels/timeline/timelinePaintProfiler.css.js
var timelinePaintProfiler_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.paint-profiler-image-view {
  overflow: hidden;
}

.paint-profiler-image-view .paint-profiler-image-container {
  transform-origin: 0 0;
}

.paint-profiler-image-view .paint-profiler-image-container div {
  border-color: 1px solid var(--sys-color-divider);
  border-style: solid;
  z-index: 100;
  position: absolute;
  top: 0;
  left: 0;
}

.paint-profiler-image-view img {
  border: solid 1px var(--sys-color-inverse-surface);
}

/*# sourceURL=${import.meta.resolve("./timelinePaintProfiler.css")} */`;

// gen/front_end/panels/timeline/TracingLayerTree.js
import * as Common13 from "./../../core/common/common.js";
import * as SDK9 from "./../../core/sdk/sdk.js";
var TracingLayerTree = class extends SDK9.LayerTreeBase.LayerTreeBase {
  tileById = /* @__PURE__ */ new Map();
  paintProfilerModel;
  constructor(target) {
    super(target);
    this.paintProfilerModel = target?.model(SDK9.PaintProfiler.PaintProfilerModel) ?? null;
  }
  async setLayers(root, layers, paints) {
    const idsToResolve = /* @__PURE__ */ new Set();
    if (root) {
      this.extractNodeIdsToResolve(idsToResolve, {}, root);
    } else if (layers) {
      for (let i = 0; i < layers.length; ++i) {
        this.extractNodeIdsToResolve(idsToResolve, {}, layers[i]);
      }
    }
    await this.resolveBackendNodeIds(idsToResolve);
    const oldLayersById = this.layersById;
    this.layersById = /* @__PURE__ */ new Map();
    this.setContentRoot(null);
    if (root) {
      const convertedLayers = this.#setLayers(oldLayersById, root);
      this.setRoot(convertedLayers);
    } else if (layers) {
      const processedLayers = layers.map(this.#setLayers.bind(this, oldLayersById));
      const contentRoot = this.contentRoot();
      if (!contentRoot) {
        throw new Error("Content root is not set.");
      }
      this.setRoot(contentRoot);
      for (let i = 0; i < processedLayers.length; ++i) {
        if (processedLayers[i].id() !== contentRoot.id()) {
          contentRoot.addChild(processedLayers[i]);
        }
      }
    }
    this.setPaints(paints);
  }
  setTiles(tiles) {
    this.tileById = /* @__PURE__ */ new Map();
    for (const tile of tiles) {
      this.tileById.set(tile.id, tile);
    }
  }
  pictureForRasterTile(tileId) {
    const tile = this.tileById.get("cc::Tile/" + tileId);
    if (!tile) {
      Common13.Console.Console.instance().error(`Tile ${tileId} is missing`);
      return Promise.resolve(null);
    }
    const layer = this.layerById(tile.layer_id);
    if (!layer) {
      Common13.Console.Console.instance().error(`Layer ${tile.layer_id} for tile ${tileId} is not found`);
      return Promise.resolve(null);
    }
    return layer.pictureForRect(tile.content_rect);
  }
  setPaints(paints) {
    for (let i = 0; i < paints.length; ++i) {
      const layer = this.layersById.get(paints[i].layerId());
      if (layer) {
        layer.addPaintEvent(paints[i]);
      }
    }
  }
  #setLayers(oldLayersById, payload) {
    let layer = oldLayersById.get(payload.layer_id);
    if (layer) {
      layer.reset(payload);
    } else {
      layer = new TracingLayer(this.paintProfilerModel, payload);
    }
    this.layersById.set(payload.layer_id, layer);
    if (payload.owner_node) {
      layer.setNode(this.backendNodeIdToNode().get(payload.owner_node) || null);
    }
    if (!this.contentRoot() && layer.drawsContent()) {
      this.setContentRoot(layer);
    }
    for (let i = 0; payload.children && i < payload.children.length; ++i) {
      layer.addChild(this.#setLayers(oldLayersById, payload.children[i]));
    }
    return layer;
  }
  extractNodeIdsToResolve(nodeIdsToResolve, seenNodeIds, payload) {
    const backendNodeId = payload.owner_node;
    if (backendNodeId && !this.backendNodeIdToNode().has(backendNodeId)) {
      nodeIdsToResolve.add(backendNodeId);
    }
    for (let i = 0; payload.children && i < payload.children.length; ++i) {
      this.extractNodeIdsToResolve(nodeIdsToResolve, seenNodeIds, payload.children[i]);
    }
  }
};
var TracingFrameLayerTree = class {
  #target;
  #snapshot;
  #paints = [];
  constructor(target, data) {
    this.#target = target;
    this.#snapshot = data.entry;
    this.#paints = data.paints;
  }
  async layerTreePromise() {
    const data = this.#snapshot.args.snapshot;
    const viewport = data["device_viewport_size"];
    const tiles = data["active_tiles"];
    const rootLayer = data["active_tree"]["root_layer"];
    const layers = data["active_tree"]["layers"];
    const layerTree = new TracingLayerTree(this.#target);
    layerTree.setViewportSize(viewport);
    layerTree.setTiles(tiles);
    await layerTree.setLayers(rootLayer, layers, this.#paints || []);
    return layerTree;
  }
  paints() {
    return this.#paints;
  }
};
var TracingLayer = class {
  parentLayerId;
  parentInternal;
  layerId;
  #node;
  #offsetX;
  #offsetY;
  #width;
  #height;
  #children;
  #quad;
  #scrollRects;
  #gpuMemoryUsage;
  paints;
  compositingReasons;
  compositingReasonIds;
  #drawsContent;
  paintProfilerModel;
  constructor(paintProfilerModel, payload) {
    this.parentLayerId = null;
    this.parentInternal = null;
    this.layerId = "";
    this.#node = null;
    this.#offsetX = -1;
    this.#offsetY = -1;
    this.#width = -1;
    this.#height = -1;
    this.#children = [];
    this.#quad = [];
    this.#scrollRects = [];
    this.#gpuMemoryUsage = -1;
    this.paints = [];
    this.compositingReasons = [];
    this.compositingReasonIds = [];
    this.#drawsContent = false;
    this.paintProfilerModel = paintProfilerModel;
    this.reset(payload);
  }
  reset(payload) {
    this.#node = null;
    this.layerId = String(payload.layer_id);
    this.#offsetX = payload.position[0];
    this.#offsetY = payload.position[1];
    this.#width = payload.bounds.width;
    this.#height = payload.bounds.height;
    this.#children = [];
    this.parentLayerId = null;
    this.parentInternal = null;
    this.#quad = payload.layer_quad || [];
    this.createScrollRects(payload);
    this.compositingReasons = payload.compositing_reasons || [];
    this.compositingReasonIds = payload.compositing_reason_ids || [];
    this.#drawsContent = Boolean(payload.draws_content);
    this.#gpuMemoryUsage = payload.gpu_memory_usage;
    this.paints = [];
  }
  id() {
    return this.layerId;
  }
  parentId() {
    return this.parentLayerId;
  }
  parent() {
    return this.parentInternal;
  }
  isRoot() {
    return !this.parentId();
  }
  children() {
    return this.#children;
  }
  addChild(childParam) {
    const child = childParam;
    if (child.parentInternal) {
      console.assert(false, "Child already has a parent");
    }
    this.#children.push(child);
    child.parentInternal = this;
    child.parentLayerId = this.layerId;
  }
  setNode(node) {
    this.#node = node;
  }
  node() {
    return this.#node;
  }
  nodeForSelfOrAncestor() {
    let layer = this;
    for (; layer; layer = layer.parent()) {
      if (layer.node()) {
        return layer.node();
      }
    }
    return null;
  }
  offsetX() {
    return this.#offsetX;
  }
  offsetY() {
    return this.#offsetY;
  }
  width() {
    return this.#width;
  }
  height() {
    return this.#height;
  }
  transform() {
    return null;
  }
  quad() {
    return this.#quad;
  }
  anchorPoint() {
    return [0.5, 0.5, 0];
  }
  invisible() {
    return false;
  }
  paintCount() {
    return 0;
  }
  lastPaintRect() {
    return null;
  }
  scrollRects() {
    return this.#scrollRects;
  }
  stickyPositionConstraint() {
    return null;
  }
  gpuMemoryUsage() {
    return this.#gpuMemoryUsage;
  }
  snapshots() {
    return this.paints.map(async (paint) => {
      if (!this.paintProfilerModel) {
        return null;
      }
      const snapshot = await getPaintProfilerSnapshot(this.paintProfilerModel, paint);
      if (!snapshot) {
        return null;
      }
      const rect = { x: snapshot.rect[0], y: snapshot.rect[1], width: snapshot.rect[2], height: snapshot.rect[3] };
      return { rect, snapshot: snapshot.snapshot };
    });
  }
  async pictureForRect(targetRect) {
    return await Promise.all(this.paints.map((paint) => paint.picture())).then((pictures) => {
      const filteredPictures = pictures.filter((picture) => picture && rectsOverlap(picture.rect, targetRect));
      const fragments = filteredPictures.map((picture) => ({ x: picture.rect[0], y: picture.rect[1], picture: picture.serializedPicture }));
      if (!fragments.length || !this.paintProfilerModel) {
        return null;
      }
      const x0 = fragments.reduce((min, item) => Math.min(min, item.x), Infinity);
      const y0 = fragments.reduce((min, item) => Math.min(min, item.y), Infinity);
      const rect = { x: targetRect[0] - x0, y: targetRect[1] - y0, width: targetRect[2], height: targetRect[3] };
      return this.paintProfilerModel.loadSnapshotFromFragments(fragments).then((snapshot) => snapshot ? { rect, snapshot } : null);
    });
    function segmentsOverlap(a1, a2, b1, b2) {
      console.assert(a1 <= a2 && b1 <= b2, "segments should be specified as ordered pairs");
      return a2 > b1 && a1 < b2;
    }
    function rectsOverlap(a, b) {
      return segmentsOverlap(a[0], a[0] + a[2], b[0], b[0] + b[2]) && segmentsOverlap(a[1], a[1] + a[3], b[1], b[1] + b[3]);
    }
  }
  scrollRectsFromParams(params, type) {
    return { rect: { x: params[0], y: params[1], width: params[2], height: params[3] }, type };
  }
  createScrollRects(payload) {
    const nonPayloadScrollRects = [];
    if (payload.non_fast_scrollable_region) {
      nonPayloadScrollRects.push(this.scrollRectsFromParams(payload.non_fast_scrollable_region, "NonFastScrollable"));
    }
    if (payload.touch_event_handler_region) {
      nonPayloadScrollRects.push(this.scrollRectsFromParams(
        payload.touch_event_handler_region,
        "TouchEventHandler"
        /* Protocol.LayerTree.ScrollRectType.TouchEventHandler */
      ));
    }
    if (payload.wheel_event_handler_region) {
      nonPayloadScrollRects.push(this.scrollRectsFromParams(
        payload.wheel_event_handler_region,
        "WheelEventHandler"
        /* Protocol.LayerTree.ScrollRectType.WheelEventHandler */
      ));
    }
    if (payload.scroll_event_handler_region) {
      nonPayloadScrollRects.push(this.scrollRectsFromParams(
        payload.scroll_event_handler_region,
        "RepaintsOnScroll"
        /* Protocol.LayerTree.ScrollRectType.RepaintsOnScroll */
      ));
    }
    this.#scrollRects = nonPayloadScrollRects;
  }
  addPaintEvent(paint) {
    this.paints.push(paint);
  }
  requestCompositingReasons() {
    return Promise.resolve(this.compositingReasons);
  }
  requestCompositingReasonIds() {
    return Promise.resolve(this.compositingReasonIds);
  }
  drawsContent() {
    return this.#drawsContent;
  }
};
async function getPaintProfilerSnapshot(paintProfilerModel, paint) {
  const picture = paint.picture();
  if (!picture || !paintProfilerModel) {
    return null;
  }
  const snapshot = await paintProfilerModel.loadSnapshot(picture.serializedPicture);
  return snapshot ? { rect: picture.rect, snapshot } : null;
}

// gen/front_end/panels/timeline/TimelinePaintProfilerView.js
var { html, render } = Lit;
var { createRef, ref } = Lit.Directives;
var TimelinePaintProfilerView = class extends UI14.SplitWidget.SplitWidget {
  logAndImageSplitWidget;
  imageView;
  paintProfilerView;
  logTreeView;
  needsUpdateWhenVisible;
  pendingSnapshot;
  event;
  paintProfilerModel;
  lastLoadedSnapshot;
  #parsedTrace;
  constructor(parsedTrace) {
    super(false, false);
    this.setSidebarSize(60);
    this.setResizable(false);
    this.#parsedTrace = parsedTrace;
    this.logAndImageSplitWidget = new UI14.SplitWidget.SplitWidget(true, false, "timeline-paint-profiler-log-split");
    this.setMainWidget(this.logAndImageSplitWidget);
    this.imageView = new TimelinePaintImageView();
    this.logAndImageSplitWidget.setMainWidget(this.imageView);
    this.paintProfilerView = new LayerViewer2.PaintProfilerView.PaintProfilerView(this.imageView.showImage.bind(this.imageView));
    this.paintProfilerView.addEventListener("WindowChanged", this.onWindowChanged, this);
    this.setSidebarWidget(this.paintProfilerView);
    this.logTreeView = new LayerViewer2.PaintProfilerView.PaintProfilerCommandLogView();
    this.logAndImageSplitWidget.setSidebarWidget(this.logTreeView);
    this.needsUpdateWhenVisible = false;
    this.pendingSnapshot = null;
    this.event = null;
    this.paintProfilerModel = null;
    this.lastLoadedSnapshot = null;
  }
  wasShown() {
    super.wasShown();
    if (this.needsUpdateWhenVisible) {
      this.needsUpdateWhenVisible = false;
      this.update();
    }
  }
  setSnapshot(snapshot) {
    this.releaseSnapshot();
    this.pendingSnapshot = snapshot;
    this.event = null;
    this.updateWhenVisible();
  }
  #rasterEventHasTile(event) {
    const data = event.args.tileData;
    if (!data) {
      return false;
    }
    const frame = this.#parsedTrace.data.Frames.framesById[data.sourceFrameNumber];
    if (!frame?.layerTree) {
      return false;
    }
    return true;
  }
  setEvent(paintProfilerModel, event) {
    this.releaseSnapshot();
    this.paintProfilerModel = paintProfilerModel;
    this.pendingSnapshot = null;
    this.event = event;
    this.updateWhenVisible();
    if (Trace27.Types.Events.isPaint(event)) {
      const snapshot = this.#parsedTrace.data.LayerTree.paintsToSnapshots.get(event);
      return Boolean(snapshot);
    }
    if (Trace27.Types.Events.isRasterTask(event)) {
      return this.#rasterEventHasTile(event);
    }
    return false;
  }
  updateWhenVisible() {
    if (this.isShowing()) {
      this.update();
    } else {
      this.needsUpdateWhenVisible = true;
    }
  }
  async #rasterTilePromise(rasterEvent) {
    const data = rasterEvent.args.tileData;
    if (!data) {
      return null;
    }
    if (!data.tileId.id_ref) {
      return null;
    }
    const target = SDK10.TargetManager.TargetManager.instance().rootTarget();
    if (!target) {
      return null;
    }
    const frame = this.#parsedTrace.data.Frames.framesById[data.sourceFrameNumber];
    if (!frame?.layerTree) {
      return null;
    }
    const layerTree = new TracingFrameLayerTree(target, frame.layerTree);
    const tracingLayerTree = await layerTree.layerTreePromise();
    return tracingLayerTree ? await tracingLayerTree.pictureForRasterTile(data.tileId.id_ref) : null;
  }
  update() {
    this.logTreeView.setCommandLog([]);
    void this.paintProfilerView.setSnapshotAndLog(null, [], null);
    let snapshotPromise;
    if (this.pendingSnapshot) {
      snapshotPromise = Promise.resolve({ rect: null, snapshot: this.pendingSnapshot });
    } else if (this.event && this.paintProfilerModel && Trace27.Types.Events.isPaint(this.event)) {
      const snapshotEvent = this.#parsedTrace.data.LayerTree.paintsToSnapshots.get(this.event);
      if (snapshotEvent) {
        const encodedData = snapshotEvent.args.snapshot.skp64;
        snapshotPromise = this.paintProfilerModel.loadSnapshot(encodedData).then((snapshot) => {
          return snapshot && { rect: null, snapshot };
        });
      } else {
        snapshotPromise = Promise.resolve(null);
      }
    } else if (this.event && Trace27.Types.Events.isRasterTask(this.event)) {
      snapshotPromise = this.#rasterTilePromise(this.event);
    } else {
      console.assert(false, "Unexpected event type or no snapshot");
      return;
    }
    void snapshotPromise.then((snapshotWithRect) => {
      this.releaseSnapshot();
      if (!snapshotWithRect) {
        this.imageView.showImage();
        return;
      }
      const snapshot = snapshotWithRect.snapshot;
      this.lastLoadedSnapshot = snapshot;
      this.imageView.setMask(snapshotWithRect.rect);
      void snapshot.commandLog().then((log) => onCommandLogDone.call(this, snapshot, snapshotWithRect.rect, log || []));
    });
    function onCommandLogDone(snapshot, clipRect, log) {
      this.logTreeView.setCommandLog(log || []);
      void this.paintProfilerView.setSnapshotAndLog(snapshot, log || [], clipRect);
    }
  }
  releaseSnapshot() {
    if (!this.lastLoadedSnapshot) {
      return;
    }
    this.lastLoadedSnapshot.release();
    this.lastLoadedSnapshot = null;
  }
  onWindowChanged() {
    this.logTreeView.updateWindow(this.paintProfilerView.selectionWindow());
  }
};
var DEFAULT_VIEW = (input, output, target) => {
  const imageElementRef = createRef();
  render(html`
  <div class="paint-profiler-image-view fill">
    <div class="paint-profiler-image-container" style="-webkit-transform: ${input.imageContainerWebKitTransform}">
      <img src=${input.imageURL} display=${input.imageContainerHidden ? "none" : "block"} ${ref(imageElementRef)}>
      <div style=${Lit.Directives.styleMap({
    display: input.maskElementHidden ? "none" : "block",
    ...input.maskElementStyle
  })}>
      </div>
    </div>
  </div>`, target);
  const imageElement = imageElementRef.value;
  if (!imageElement?.naturalHeight || !imageElement.naturalWidth) {
    throw new Error("ImageElement were not found in the TimelinePaintImageView.");
  }
  return { imageElementNaturalHeight: imageElement.naturalHeight, imageElementNaturalWidth: imageElement.naturalWidth };
};
var TimelinePaintImageView = class extends UI14.Widget.Widget {
  transformController;
  maskRectangle;
  #inputData = {
    maskElementHidden: true,
    imageContainerHidden: true,
    imageURL: "",
    imageContainerWebKitTransform: "",
    maskElementStyle: {}
  };
  #view;
  #imageElementDimensions;
  constructor(view = DEFAULT_VIEW) {
    super();
    this.registerRequiredCSS(timelinePaintProfiler_css_default);
    this.#view = view;
    this.transformController = new LayerViewer2.TransformController.TransformController(this.contentElement, true);
    this.transformController.addEventListener("TransformChanged", this.updateImagePosition, this);
  }
  onResize() {
    this.requestUpdate();
    this.updateImagePosition();
  }
  updateImagePosition() {
    if (!this.#imageElementDimensions) {
      return;
    }
    const width = this.#imageElementDimensions.naturalWidth;
    const height = this.#imageElementDimensions.naturalHeight;
    const clientWidth = this.contentElement.clientWidth;
    const clientHeight = this.contentElement.clientHeight;
    const paddingFraction = 0.1;
    const paddingX = clientWidth * paddingFraction;
    const scale = clientHeight / height;
    const oldMaskStyle = JSON.stringify(this.#inputData.maskElementStyle);
    let newMaskStyle = {};
    if (this.maskRectangle) {
      newMaskStyle = {
        width: width + "px",
        height: height + "px",
        borderLeftWidth: this.maskRectangle.x + "px",
        borderTopWidth: this.maskRectangle.y + "px",
        borderRightWidth: width - this.maskRectangle.x - this.maskRectangle.width + "px",
        borderBottomWidth: height - this.maskRectangle.y - this.maskRectangle.height + "px"
      };
    }
    this.#inputData.maskElementStyle = newMaskStyle;
    if (!this.transformController) {
      return;
    }
    this.transformController.setScaleConstraints(0.5, 10 / scale);
    let matrix = new WebKitCSSMatrix().scale(this.transformController.scale(), this.transformController.scale()).translate(clientWidth / 2, clientHeight / 2).scale(scale, scale).translate(-width / 2, -height / 2);
    const bounds = Geometry2.boundsForTransformedPoints(matrix, [0, 0, 0, width, height, 0]);
    this.transformController.clampOffsets(paddingX - bounds.maxX, clientWidth - paddingX - bounds.minX, 0, 0);
    matrix = new WebKitCSSMatrix().translate(this.transformController.offsetX(), this.transformController.offsetY()).multiply(matrix);
    const oldTransform = this.#inputData.imageContainerWebKitTransform;
    const newTransform = matrix.toString();
    this.#inputData.imageContainerWebKitTransform = newTransform;
    if (oldTransform !== newTransform || oldMaskStyle !== JSON.stringify(newMaskStyle)) {
      this.requestUpdate();
    }
  }
  showImage(imageURL) {
    this.#inputData.imageContainerHidden = !imageURL;
    if (imageURL) {
      this.#inputData.imageURL = imageURL;
    }
    this.requestUpdate();
  }
  setMask(maskRectangle) {
    this.maskRectangle = maskRectangle;
    this.#inputData.maskElementHidden = !maskRectangle;
    this.requestUpdate();
  }
  performUpdate() {
    const { imageElementNaturalHeight, imageElementNaturalWidth } = this.#view(this.#inputData, void 0, this.contentElement);
    this.#imageElementDimensions = { naturalHeight: imageElementNaturalHeight, naturalWidth: imageElementNaturalWidth };
    this.updateImagePosition();
  }
};

// gen/front_end/panels/timeline/TimelineSelectorStatsView.js
import "./../../ui/components/linkifier/linkifier.js";
import "./../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n45 from "./../../core/i18n/i18n.js";
import * as SDK11 from "./../../core/sdk/sdk.js";
import * as Trace28 from "./../../models/trace/trace.js";
import * as UI15 from "./../../ui/legacy/legacy.js";
import { html as html2, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging8 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/timelineSelectorStatsView.css.js
var timelineSelectorStatsView_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

devtools-data-grid {
  flex: auto;
}

/*# sourceURL=${import.meta.resolve("./timelineSelectorStatsView.css")} */`;

// gen/front_end/panels/timeline/TimelineSelectorStatsView.js
import * as Utils5 from "./utils/utils.js";
var UIStrings23 = {
  /**
   * @description Label for selector stats data table
   */
  selectorStats: "Selector stats",
  /**
   * @description Column name and time unit for elapsed time spent computing a style rule
   */
  elapsed: "Elapsed (ms)",
  /**
   * @description Tooltip description 'Elapsed (ms)'
   */
  elapsedExplanation: "Elapsed time spent matching a selector against the DOM in milliseconds.",
  /**
   * @description Column name and percentage of slow mach non-matches computing a style rule
   */
  slowPathNonMatches: "% of slow-path non-matches",
  /**
   * @description Tooltip description '% of slow-path non-matches'
   */
  slowPathNonMatchesExplanation: "The percentage of non-matching nodes (Match Attempts - Match Count) that couldn't be quickly ruled out by the bloom filter due to high selector complexity. Lower is better.",
  /**
   * @description Column name for count of elements that the engine attempted to match against a style rule
   */
  matchAttempts: "Match attempts",
  /**
   * @description Tooltip description 'Match attempts'
   */
  matchAttemptsExplanation: "Count of nodes that the engine attempted to match against a style rule.",
  /**
   * @description Column name for count of elements that matched a style rule
   */
  matchCount: "Match count",
  /**
   * @description Tooltip description 'Match count'
   */
  matchCountExplanation: "Count of nodes that matched a style rule.",
  /**
   * @description Column name for a style rule's CSS selector text
   */
  selector: "Selector",
  /**
   * @description Tooltip description 'Selector'
   */
  selectorExplanation: "CSS selector text of a style rule.",
  /**
   * @description Column name for a style rule's CSS selector text
   */
  styleSheetId: "Style Sheet",
  /**
   * @description Tooltip description 'Style Sheet'
   */
  styleSheetIdExplanation: "Links to the selector rule definition in the style sheets. Note that a selector rule could be defined in multiple places in a style sheet or defined in multiple style sheets. Selector rules from browser user-agent style sheet or dynamic style sheets don't have a link.",
  /**
   * @description A context menu item in data grids to copy entire table to clipboard
   */
  copyTable: "Copy table",
  /**
   * @description A cell value displayed in table when no source file can be traced via css style
   */
  unableToLink: "Unable to link",
  /**
   * @description Tooltip for the cell that no source file can be traced via style sheet id
   * @example {style-sheet-4} PH1
   */
  unableToLinkViaStyleSheetId: "Unable to link via {PH1}",
  /**
   * @description Text for announcing that the entire table was copied to clipboard
   */
  tableCopiedToClipboard: "Table copied to clipboard",
  /**
   * @description Text shown as the "Selectelector" cell value for one row of the Selector Stats table, however this particular row is the totals. While normally the Selector cell is values like "div.container", the parenthesis can denote this description is not an actual selector, but a general row description.
   */
  totalForAllSelectors: "(Totals for all selectors)",
  /**
   * @description Text for showing the location of a selector in the style sheet
   * @example {256} PH1
   * @example {14} PH2
   */
  lineNumber: "Line {PH1}:{PH2}",
  /**
   * @description Count of invalidation for a specific selector. Note that a node can be invalidated multiple times.
   */
  invalidationCount: "Invalidation count",
  /**
   * @description Tooltip description 'Invalidation count'
   */
  invalidationCountExplanation: "Aggregated count of invalidations on nodes and subsequently had style recalculated, all of which are matched by this selector. Note that a node can be invalidated multiple times and by multiple selectors."
};
var str_23 = i18n45.i18n.registerUIStrings("panels/timeline/TimelineSelectorStatsView.ts", UIStrings23);
var i18nString23 = i18n45.i18n.getLocalizedString.bind(void 0, str_23);
var SelectorTimingsKey = Trace28.Types.Events.SelectorTimingsKey;
var DEFAULT_VIEW2 = (input, _output, target) => {
  render2(html2`
      <devtools-data-grid striped name=${i18nString23(UIStrings23.selectorStats)}
          @contextmenu=${input.onContextMenu.bind(input)}>
        <table>
          <tr>
            <th id=${SelectorTimingsKey.Elapsed} weight="1" sortable hideable align="right">
              <span title=${i18nString23(UIStrings23.elapsedExplanation)}>
              ${i18nString23(UIStrings23.elapsed)}</span>
            </th>
            <th id=${SelectorTimingsKey.InvalidationCount} weight="1.5" sortable hideable>
              <span title=${i18nString23(UIStrings23.invalidationCountExplanation)}>${i18nString23(UIStrings23.invalidationCount)}</span>
            </th>
            <th id=${SelectorTimingsKey.MatchAttempts} weight="1" sortable hideable align="right">
              <span title=${i18nString23(UIStrings23.matchAttemptsExplanation)}>
              ${i18nString23(UIStrings23.matchAttempts)}</span>
            </th>
            <th id=${SelectorTimingsKey.MatchCount} weight="1" sortable hideable align="right">
              <span title=${i18nString23(UIStrings23.matchCountExplanation)}>
              ${i18nString23(UIStrings23.matchCount)}</span>
            </th>
            <th id=${SelectorTimingsKey.RejectPercentage} weight="1" sortable hideable align="right">
              <span title=${i18nString23(UIStrings23.slowPathNonMatchesExplanation)}>${i18nString23(UIStrings23.slowPathNonMatches)}</span>
            </th>
            <th id=${SelectorTimingsKey.Selector} weight="3" sortable hideable>
              <span title=${i18nString23(UIStrings23.selectorExplanation)}>
              ${i18nString23(UIStrings23.selector)}</span>
            </th>
            <th id=${SelectorTimingsKey.StyleSheetId} weight="1.5" sortable hideable>
              <span title=${i18nString23(UIStrings23.styleSheetIdExplanation)}>
              ${i18nString23(UIStrings23.styleSheetId)}</span>
            </th>
          </tr>
          ${input.timings.map((timing) => {
    const nonMatches = timing[SelectorTimingsKey.MatchAttempts] - timing[SelectorTimingsKey.MatchCount];
    const slowPathNonMatches = (nonMatches ? 1 - timing[SelectorTimingsKey.FastRejectCount] / nonMatches : 0) * 100;
    const styleSheetId = timing[SelectorTimingsKey.StyleSheetId];
    const locations = timing.locations;
    const locationMessage = locations ? null : locations === null ? "" : i18nString23(UIStrings23.unableToLinkViaStyleSheetId, { PH1: styleSheetId });
    return html2`<tr>
            <td data-value=${timing[SelectorTimingsKey.Elapsed]}>
              ${(timing[SelectorTimingsKey.Elapsed] / 1e3).toFixed(3)}
            </td>
            <td title=${timing[SelectorTimingsKey.InvalidationCount]}>
              ${timing[SelectorTimingsKey.InvalidationCount]}
            </td>
            <td>${timing[SelectorTimingsKey.MatchAttempts]}</td>
            <td>${timing[SelectorTimingsKey.MatchCount]}</td>
            <td data-value=${slowPathNonMatches}>
              ${slowPathNonMatches.toFixed(1)}
            </td>
            <td title=${timing[SelectorTimingsKey.Selector]}>
             ${timing[SelectorTimingsKey.Selector]}
            </td>
            <td data-value=${styleSheetId}>${locations ? html2`${locations.map((location, itemIndex) => html2`
                <devtools-linkifier .data=${location}></devtools-linkifier
                >${itemIndex !== locations.length - 1 ? "," : ""}`)}` : locationMessage}
            </td>
          </tr>`;
  })}
        </table>
      </devtools-data-grid>`, target);
};
var TimelineSelectorStatsView = class extends UI15.Widget.VBox {
  #selectorLocations;
  #parsedTrace = null;
  /**
   * We store the last event (or array of events) that we renderered. We do
   * this because as the user zooms around the panel this view is updated,
   * however if the set of events that are populating the view is the same as it
   * was the last time, we can bail without doing any re-rendering work.
   * If the user views a single event, this will be set to that single event, but if they are viewing a range of events, this will be set to an array.
   * If it's null, that means we have not rendered yet.
   */
  #lastStatsSourceEventOrEvents = null;
  #view;
  #timings = [];
  constructor(parsedTrace, view = DEFAULT_VIEW2) {
    super({ jslog: `${VisualLogging8.pane("selector-stats").track({ resize: true })}` });
    this.registerRequiredCSS(timelineSelectorStatsView_css_default);
    this.#view = view;
    this.#selectorLocations = /* @__PURE__ */ new Map();
    this.#parsedTrace = parsedTrace;
    this.performUpdate();
  }
  #onContextMenu(e) {
    const { menu } = e.detail;
    menu.defaultSection().appendItem(i18nString23(UIStrings23.copyTable), () => {
      const tableData = [];
      const columnName = [
        i18nString23(UIStrings23.elapsed),
        i18nString23(UIStrings23.matchAttempts),
        i18nString23(UIStrings23.matchCount),
        i18nString23(UIStrings23.slowPathNonMatches),
        i18nString23(UIStrings23.selector),
        i18nString23(UIStrings23.styleSheetId)
      ];
      tableData.push(columnName.join("	"));
      for (const timing of this.#timings) {
        const nonMatches = timing[SelectorTimingsKey.MatchAttempts] - timing[SelectorTimingsKey.MatchCount];
        const slowPathNonMatches = (nonMatches ? 1 - timing[SelectorTimingsKey.FastRejectCount] / nonMatches : 0) * 100;
        const styleSheetId = timing[SelectorTimingsKey.StyleSheetId];
        let linkData = "";
        const target = SDK11.TargetManager.TargetManager.instance().primaryPageTarget();
        const cssModel = target?.model(SDK11.CSSModel.CSSModel);
        if (cssModel) {
          const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
          if (styleSheetHeader) {
            linkData = styleSheetHeader.resourceURL().toString();
          }
        }
        if (!linkData) {
          linkData = i18nString23(UIStrings23.unableToLink);
        }
        tableData.push([
          timing[SelectorTimingsKey.Elapsed] / 1e3,
          timing[SelectorTimingsKey.MatchAttempts],
          timing[SelectorTimingsKey.MatchCount],
          slowPathNonMatches,
          timing[SelectorTimingsKey.Selector],
          linkData
        ].join("	"));
      }
      const data = tableData.join("\n");
      UI15.UIUtils.copyTextToClipboard(data, i18nString23(UIStrings23.tableCopiedToClipboard));
    });
  }
  performUpdate() {
    const viewInput = {
      timings: this.#timings,
      onContextMenu: (event) => {
        this.#onContextMenu(event);
      }
    };
    const viewOutput = {};
    this.#view(viewInput, viewOutput, this.contentElement);
  }
  getDescendentNodeCount(node) {
    if (!node) {
      return 0;
    }
    let numberOfDescendentNode = 1;
    const childNodes = node.children();
    if (childNodes) {
      for (const childNode of childNodes) {
        numberOfDescendentNode += this.getDescendentNodeCount(childNode);
      }
    }
    return numberOfDescendentNode;
  }
  async updateInvalidationCount(events) {
    if (!this.#parsedTrace) {
      return;
    }
    const invalidatedNodes = this.#parsedTrace.data.SelectorStats.invalidatedNodeList;
    const invalidatedNodeMap = /* @__PURE__ */ new Map();
    const frameIdBackendNodeIdsMap = /* @__PURE__ */ new Map();
    for (const { frame, backendNodeId } of invalidatedNodes) {
      if (!frameIdBackendNodeIdsMap.has(frame)) {
        frameIdBackendNodeIdsMap.set(frame, /* @__PURE__ */ new Set());
      }
      frameIdBackendNodeIdsMap.get(frame)?.add(backendNodeId);
    }
    const invalidatedNodeIdMap = /* @__PURE__ */ new Map();
    for (const [frameId, backendNodeIds] of frameIdBackendNodeIdsMap) {
      const backendNodeIdMap = await Utils5.EntryNodes.domNodesForBackendIds(frameId, backendNodeIds);
      invalidatedNodeIdMap.set(frameId, backendNodeIdMap);
    }
    for (const invalidatedNode of invalidatedNodes) {
      const invalidatedNodeDomNode = invalidatedNodeIdMap.get(invalidatedNode.frame)?.get(invalidatedNode.backendNodeId) ?? null;
      for (const selector of invalidatedNode.selectorList) {
        const key = [
          selector.selector,
          selector.styleSheetId,
          invalidatedNode.frame,
          invalidatedNode.lastRecalcStyleEventTs
        ].join("-");
        if (invalidatedNodeMap.has(key)) {
          const nodes = invalidatedNodeMap.get(key);
          nodes?.nodeList.push(invalidatedNodeDomNode);
        } else {
          invalidatedNodeMap.set(key, { subtree: invalidatedNode.subtree, nodeList: [invalidatedNodeDomNode] });
        }
      }
    }
    for (const event of events) {
      const selectorStats = event ? this.#parsedTrace.data.SelectorStats.dataForRecalcStyleEvent.get(event) : void 0;
      if (!selectorStats) {
        continue;
      }
      const frameId = event.args.beginData?.frame;
      for (const timing of selectorStats.timings) {
        timing.invalidation_count = 0;
        const key = [timing.selector, timing.style_sheet_id, frameId, event.ts].join("-");
        const nodes = invalidatedNodeMap.get(key);
        if (nodes === void 0) {
          continue;
        }
        for (const node of nodes.nodeList) {
          if (nodes.subtree) {
            timing.invalidation_count += this.getDescendentNodeCount(node);
          } else {
            timing.invalidation_count += 1;
          }
        }
      }
    }
  }
  async aggregateEvents(events) {
    if (!this.#parsedTrace) {
      return;
    }
    const timings = [];
    const selectorMap = /* @__PURE__ */ new Map();
    const sums = {
      [SelectorTimingsKey.Elapsed]: 0,
      [SelectorTimingsKey.MatchAttempts]: 0,
      [SelectorTimingsKey.MatchCount]: 0,
      [SelectorTimingsKey.FastRejectCount]: 0,
      [SelectorTimingsKey.InvalidationCount]: 0
    };
    if (Array.isArray(this.#lastStatsSourceEventOrEvents)) {
      if (this.#lastStatsSourceEventOrEvents.length === events.length && events.every((event, index) => {
        const previousEvents = this.#lastStatsSourceEventOrEvents;
        return event === previousEvents[index];
      })) {
        return;
      }
    }
    this.#lastStatsSourceEventOrEvents = events;
    await this.updateInvalidationCount(events);
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const selectorStats = event ? this.#parsedTrace.data.SelectorStats.dataForRecalcStyleEvent.get(event) : void 0;
      if (!selectorStats) {
        continue;
      }
      const data = selectorStats.timings;
      for (const timing of data) {
        const key = timing[SelectorTimingsKey.Selector] + "_" + timing[SelectorTimingsKey.StyleSheetId];
        const findTiming = selectorMap.get(key);
        if (findTiming !== void 0) {
          findTiming[SelectorTimingsKey.Elapsed] += timing[SelectorTimingsKey.Elapsed];
          findTiming[SelectorTimingsKey.FastRejectCount] += timing[SelectorTimingsKey.FastRejectCount];
          findTiming[SelectorTimingsKey.MatchAttempts] += timing[SelectorTimingsKey.MatchAttempts];
          findTiming[SelectorTimingsKey.MatchCount] += timing[SelectorTimingsKey.MatchCount];
          findTiming[SelectorTimingsKey.InvalidationCount] += timing[SelectorTimingsKey.InvalidationCount];
        } else {
          selectorMap.set(key, structuredClone(timing));
        }
        sums[SelectorTimingsKey.Elapsed] += timing[SelectorTimingsKey.Elapsed];
        sums[SelectorTimingsKey.MatchAttempts] += timing[SelectorTimingsKey.MatchAttempts];
        sums[SelectorTimingsKey.MatchCount] += timing[SelectorTimingsKey.MatchCount];
        sums[SelectorTimingsKey.FastRejectCount] += timing[SelectorTimingsKey.FastRejectCount];
        sums[SelectorTimingsKey.InvalidationCount] += timing[SelectorTimingsKey.InvalidationCount];
      }
    }
    if (selectorMap.size > 0) {
      selectorMap.forEach((timing) => {
        timings.push(timing);
      });
      selectorMap.clear();
    } else {
      this.#timings = [];
      return;
    }
    timings.unshift({
      [SelectorTimingsKey.Elapsed]: sums[SelectorTimingsKey.Elapsed],
      [SelectorTimingsKey.FastRejectCount]: sums[SelectorTimingsKey.FastRejectCount],
      [SelectorTimingsKey.MatchAttempts]: sums[SelectorTimingsKey.MatchAttempts],
      [SelectorTimingsKey.MatchCount]: sums[SelectorTimingsKey.MatchCount],
      [SelectorTimingsKey.Selector]: i18nString23(UIStrings23.totalForAllSelectors),
      [SelectorTimingsKey.StyleSheetId]: "n/a",
      [SelectorTimingsKey.InvalidationCount]: sums[SelectorTimingsKey.InvalidationCount]
    });
    this.#timings = await this.processSelectorTimings(timings);
  }
  setAggregatedEvents(events) {
    if (!this.#parsedTrace) {
      return;
    }
    void this.aggregateEvents(events).then(() => {
      this.requestUpdate();
    });
  }
  async processSelectorTimings(timings) {
    async function toSourceFileLocation(cssModel2, styleSheetId, selectorText, selectorLocations) {
      if (!cssModel2) {
        return void 0;
      }
      const styleSheetHeader = cssModel2.styleSheetHeaderForId(styleSheetId);
      if (!styleSheetHeader?.resourceURL()) {
        return void 0;
      }
      const key = JSON.stringify({ selectorText, styleSheetId });
      let ranges = selectorLocations.get(key);
      if (!ranges) {
        const result = await cssModel2.agent.invoke_getLocationForSelector({ styleSheetId, selectorText });
        if (result.getError() || !result.ranges) {
          return void 0;
        }
        ranges = result.ranges;
        selectorLocations.set(key, ranges);
      }
      const linkData = ranges.map((range) => {
        return {
          url: styleSheetHeader.resourceURL(),
          lineNumber: range.startLine,
          columnNumber: range.startColumn,
          linkText: i18nString23(UIStrings23.lineNumber, { PH1: range.startLine + 1, PH2: range.startColumn + 1 }),
          title: `${styleSheetHeader.id} line ${range.startLine + 1}:${range.startColumn + 1}`
        };
      });
      return linkData;
    }
    const target = SDK11.TargetManager.TargetManager.instance().primaryPageTarget();
    const cssModel = target?.model(SDK11.CSSModel.CSSModel);
    if (!cssModel) {
      return [];
    }
    return await Promise.all(timings.sort((a, b) => b[SelectorTimingsKey.Elapsed] - a[SelectorTimingsKey.Elapsed]).map(async (x) => {
      const styleSheetId = x[SelectorTimingsKey.StyleSheetId];
      const selectorText = x[SelectorTimingsKey.Selector].trim();
      const locations = styleSheetId === "n/a" ? null : await toSourceFileLocation(cssModel, styleSheetId, selectorText, this.#selectorLocations);
      return { ...x, locations };
    }));
  }
};

// gen/front_end/panels/timeline/TimelineDetailsView.js
var UIStrings24 = {
  /**
   * @description Text for the summary view
   */
  summary: "Summary",
  /**
   * @description Text in Timeline Details View of the Performance panel
   */
  bottomup: "Bottom-up",
  /**
   * @description Text in Timeline Details View of the Performance panel
   */
  callTree: "Call tree",
  /**
   * @description Text in Timeline Details View of the Performance panel
   */
  eventLog: "Event log",
  /**
   * @description Title of the paint profiler, old name of the performance pane
   */
  paintProfiler: "Paint profiler",
  /**
   * @description Title of the Layers tool
   */
  layers: "Layers",
  /**
   * @description Title of the selector stats tab
   */
  selectorStats: "Selector stats"
};
var str_24 = i18n47.i18n.registerUIStrings("panels/timeline/TimelineDetailsView.ts", UIStrings24);
var i18nString24 = i18n47.i18n.getLocalizedString.bind(void 0, str_24);
var TimelineDetailsPane = class extends Common14.ObjectWrapper.eventMixin(UI16.Widget.VBox) {
  detailsLinkifier;
  tabbedPane;
  defaultDetailsWidget;
  #summaryContent = new SummaryView();
  rangeDetailViews;
  #selectedEvents;
  lazyPaintProfilerView;
  lazyLayersView;
  preferredTabId;
  selection;
  updateContentsScheduled;
  lazySelectorStatsView;
  #parsedTrace = null;
  #eventToRelatedInsightsMap = null;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  #thirdPartyTree = new ThirdPartyTreeViewWidget();
  #entityMapper = null;
  constructor(delegate) {
    super();
    this.registerRequiredCSS(timelineDetailsView_css_default);
    this.element.classList.add("timeline-details");
    this.detailsLinkifier = new Components3.Linkifier.Linkifier();
    this.tabbedPane = new UI16.TabbedPane.TabbedPane();
    this.tabbedPane.show(this.element);
    this.tabbedPane.headerElement().setAttribute("jslog", `${VisualLogging9.toolbar("sidebar").track({ keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space" })}`);
    this.defaultDetailsWidget = new UI16.Widget.VBox();
    this.defaultDetailsWidget.element.classList.add("timeline-details-view");
    this.defaultDetailsWidget.element.setAttribute("jslog", `${VisualLogging9.pane("details").track({ resize: true })}`);
    this.#summaryContent.contentElement.classList.add("timeline-details-view-body");
    this.#summaryContent.show(this.defaultDetailsWidget.contentElement);
    this.appendTab(Tab.Details, i18nString24(UIStrings24.summary), this.defaultDetailsWidget);
    this.setPreferredTab(Tab.Details);
    this.rangeDetailViews = /* @__PURE__ */ new Map();
    this.updateContentsScheduled = false;
    const bottomUpView = new BottomUpTimelineTreeView();
    this.appendTab(Tab.BottomUp, i18nString24(UIStrings24.bottomup), bottomUpView);
    this.rangeDetailViews.set(Tab.BottomUp, bottomUpView);
    const callTreeView = new CallTreeTimelineTreeView();
    this.appendTab(Tab.CallTree, i18nString24(UIStrings24.callTree), callTreeView);
    this.rangeDetailViews.set(Tab.CallTree, callTreeView);
    const eventsView = new EventsTimelineTreeView(delegate);
    this.appendTab(Tab.EventLog, i18nString24(UIStrings24.eventLog), eventsView);
    this.rangeDetailViews.set(Tab.EventLog, eventsView);
    this.rangeDetailViews.values().forEach((view) => {
      view.addEventListener("TreeRowHovered", (node) => this.dispatchEventToListeners("TreeRowHovered", node.data));
      view.addEventListener("TreeRowClicked", (node) => {
        this.dispatchEventToListeners("TreeRowClicked", node.data);
      });
      if (view instanceof AggregatedTimelineTreeView) {
        view.stackView.addEventListener("TreeRowHovered", (node) => this.dispatchEventToListeners("TreeRowHovered", { node: node.data }));
      }
    });
    this.#thirdPartyTree.addEventListener("TreeRowHovered", (node) => {
      this.dispatchEventToListeners("TreeRowHovered", { node: node.data.node, events: node.data.events ?? void 0 });
    });
    this.#thirdPartyTree.addEventListener("BottomUpButtonClicked", (node) => {
      this.selectTab(Tab.BottomUp, node.data, AggregatedTimelineTreeView.GroupBy.ThirdParties);
    });
    this.#thirdPartyTree.addEventListener("TreeRowClicked", (node) => {
      this.dispatchEventToListeners("TreeRowClicked", { node: node.data.node, events: node.data.events ?? void 0 });
    });
    this.tabbedPane.addEventListener(UI16.TabbedPane.Events.TabSelected, this.tabSelected, this);
    TraceBounds13.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
    this.lazySelectorStatsView = null;
  }
  /**
   * This selects a given tabbedPane tab.
   * Additionally, if provided a node, we open that node and
   * if a groupBySetting is included, we groupBy.
   */
  selectTab(tabName, node, groupBySetting) {
    this.tabbedPane.selectTab(tabName, true, true);
    this.tabbedPane.focusSelectedTabHeader();
    switch (tabName) {
      case Tab.CallTree:
      case Tab.EventLog:
      case Tab.PaintProfiler:
      case Tab.LayerViewer:
      case Tab.SelectorStats: {
        break;
      }
      case Tab.Details: {
        this.updateContentsFromWindow();
        break;
      }
      case Tab.BottomUp: {
        if (!(this.tabbedPane.visibleView instanceof BottomUpTimelineTreeView)) {
          return;
        }
        const bottomUp = this.tabbedPane.visibleView;
        if (groupBySetting) {
          bottomUp.setGroupBySetting(groupBySetting);
          bottomUp.refreshTree();
        }
        if (!node) {
          return;
        }
        const treeNode = bottomUp.eventToTreeNode.get(node.event);
        if (!treeNode) {
          return;
        }
        bottomUp.selectProfileNode(treeNode, true);
        const gridNode = bottomUp.dataGridNodeForTreeNode(treeNode);
        if (gridNode) {
          gridNode.expand();
        }
        break;
      }
      default: {
        Platform13.assertNever(tabName, `Unknown Tab: ${tabName}. Add new case to switch.`);
      }
    }
  }
  selectorStatsView() {
    if (this.lazySelectorStatsView) {
      return this.lazySelectorStatsView;
    }
    this.lazySelectorStatsView = new TimelineSelectorStatsView(this.#parsedTrace);
    return this.lazySelectorStatsView;
  }
  getDetailsContentElementForTest() {
    return this.#summaryContent.contentElement;
  }
  revealEventInTreeView(event) {
    if (this.tabbedPane.visibleView instanceof TimelineTreeView) {
      this.tabbedPane.visibleView.highlightEventInTree(event);
    }
  }
  async #onTraceBoundsChange(event) {
    if (event.updateType === "MINIMAP_BOUNDS") {
      if (this.selection) {
        await this.setSelection(this.selection);
      }
    }
    if (event.updateType === "RESET" || event.updateType === "VISIBLE_WINDOW") {
      if (!this.selection) {
        this.scheduleUpdateContentsFromWindow();
      }
    }
  }
  async setModel(data) {
    if (this.#parsedTrace !== data.parsedTrace) {
      this.lazySelectorStatsView = null;
      this.#parsedTrace = data.parsedTrace;
    }
    if (data.parsedTrace) {
      this.#summaryContent.filmStrip = Trace29.Extras.FilmStrip.fromHandlerData(data.parsedTrace.data);
      this.#entityMapper = new Trace29.EntityMapper.EntityMapper(data.parsedTrace);
    }
    this.#selectedEvents = data.selectedEvents;
    this.#eventToRelatedInsightsMap = data.eventToRelatedInsightsMap;
    this.#summaryContent.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
    this.#summaryContent.parsedTrace = this.#parsedTrace;
    this.#summaryContent.entityMapper = this.#entityMapper;
    this.tabbedPane.closeTabs([Tab.PaintProfiler, Tab.LayerViewer], false);
    for (const view of this.rangeDetailViews.values()) {
      view.setModelWithEvents(data.selectedEvents, data.parsedTrace, data.entityMapper);
    }
    this.#thirdPartyTree.setModelWithEvents(data.selectedEvents, data.parsedTrace, data.entityMapper);
    this.#summaryContent.requestUpdate();
    this.lazyPaintProfilerView = null;
    this.lazyLayersView = null;
    await this.setSelection(null);
  }
  /**
   * Updates the UI shown in the Summary tab, and updates the UI to select the
   * summary tab.
   */
  async updateSummaryPane() {
    const allTabs = this.tabbedPane.otherTabs(Tab.Details);
    for (let i = 0; i < allTabs.length; ++i) {
      if (!this.rangeDetailViews.has(allTabs[i])) {
        this.tabbedPane.closeTab(allTabs[i]);
      }
    }
    this.#summaryContent.requestUpdate();
    await this.#summaryContent.updateComplete;
  }
  updateContents() {
    const traceBoundsState = TraceBounds13.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    const view = this.rangeDetailViews.get(this.tabbedPane.selectedTabId || "");
    if (view) {
      view.updateContents(this.selection || selectionFromRangeMilliSeconds(visibleWindow.min, visibleWindow.max));
    }
  }
  appendTab(id, tabTitle, view, isCloseable) {
    this.tabbedPane.appendTab(id, tabTitle, view, void 0, void 0, isCloseable);
    if (this.preferredTabId !== this.tabbedPane.selectedTabId) {
      this.tabbedPane.selectTab(id);
    }
  }
  headerElement() {
    return this.tabbedPane.headerElement();
  }
  setPreferredTab(tabId) {
    this.preferredTabId = tabId;
  }
  /**
   * This forces a recalculation and rerendering of the timings
   * breakdown of a track.
   * User actions like zooming or scrolling can trigger many updates in
   * short time windows, so we debounce the calls in those cases. Single
   * sporadic calls (like selecting a new track) don't need to be
   * debounced. The forceImmediateUpdate param configures the debouncing
   * behaviour.
   */
  scheduleUpdateContentsFromWindow(forceImmediateUpdate = false) {
    if (!this.#parsedTrace) {
      void this.updateSummaryPane();
      return;
    }
    if (forceImmediateUpdate) {
      this.updateContentsFromWindow();
      return;
    }
    if (!this.updateContentsScheduled) {
      this.updateContentsScheduled = true;
      setTimeout(() => {
        if (!this.updateContentsScheduled) {
          return;
        }
        this.updateContentsScheduled = false;
        this.updateContentsFromWindow();
      }, 100);
    }
  }
  updateContentsFromWindow() {
    const traceBoundsState = TraceBounds13.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    this.updateSelectedRangeStats(visibleWindow.min, visibleWindow.max);
    this.updateContents();
  }
  #addLayerTreeForSelectedFrame(frame) {
    const target = SDK12.TargetManager.TargetManager.instance().rootTarget();
    if (frame.layerTree && target) {
      const layerTreeForFrame = new TracingFrameLayerTree(target, frame.layerTree);
      const layersView = this.layersView();
      layersView.showLayerTree(layerTreeForFrame);
      if (!this.tabbedPane.hasTab(Tab.LayerViewer)) {
        this.appendTab(Tab.LayerViewer, i18nString24(UIStrings24.layers), layersView);
      }
    }
  }
  async #setSelectionForTraceEvent(event) {
    if (!this.#parsedTrace) {
      return;
    }
    this.#summaryContent.selectedRange = null;
    this.#summaryContent.selectedEvent = event;
    this.#summaryContent.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
    this.#summaryContent.linkifier = this.detailsLinkifier;
    this.#summaryContent.target = targetForEvent(this.#parsedTrace, event);
    await this.updateSummaryPane();
    this.appendExtraDetailsTabsForTraceEvent(event);
  }
  async setSelection(selection) {
    if (!this.#parsedTrace) {
      return;
    }
    this.detailsLinkifier.reset();
    this.selection = selection;
    if (!this.selection) {
      this.#summaryContent.selectedEvent = null;
      this.scheduleUpdateContentsFromWindow(
        /* forceImmediateUpdate */
        true
      );
      return;
    }
    if (selectionIsEvent(selection)) {
      this.updateContentsScheduled = false;
      if (Trace29.Types.Events.isLegacyTimelineFrame(selection.event)) {
        this.#addLayerTreeForSelectedFrame(selection.event);
      }
      await this.#setSelectionForTraceEvent(selection.event);
    } else if (selectionIsRange(selection)) {
      const timings = Trace29.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds(selection.bounds);
      this.updateSelectedRangeStats(timings.min, timings.max);
    }
    this.updateContents();
  }
  tabSelected(event) {
    if (!event.data.isUserGesture) {
      return;
    }
    this.setPreferredTab(event.data.tabId);
    this.updateContents();
  }
  layersView() {
    if (this.lazyLayersView) {
      return this.lazyLayersView;
    }
    this.lazyLayersView = new TimelineLayersView(this.showSnapshotInPaintProfiler.bind(this));
    return this.lazyLayersView;
  }
  paintProfilerView() {
    if (this.lazyPaintProfilerView) {
      return this.lazyPaintProfilerView;
    }
    if (!this.#parsedTrace) {
      return null;
    }
    this.lazyPaintProfilerView = new TimelinePaintProfilerView(this.#parsedTrace);
    return this.lazyPaintProfilerView;
  }
  showSnapshotInPaintProfiler(snapshot) {
    const paintProfilerView = this.paintProfilerView();
    if (!paintProfilerView) {
      return;
    }
    paintProfilerView.setSnapshot(snapshot);
    if (!this.tabbedPane.hasTab(Tab.PaintProfiler)) {
      this.appendTab(Tab.PaintProfiler, i18nString24(UIStrings24.paintProfiler), paintProfilerView, true);
    }
    this.tabbedPane.selectTab(Tab.PaintProfiler, true);
  }
  showSelectorStatsForIndividualEvent(event) {
    this.showAggregatedSelectorStats([event]);
  }
  showAggregatedSelectorStats(events) {
    const selectorStatsView = this.selectorStatsView();
    selectorStatsView.setAggregatedEvents(events);
    if (!this.tabbedPane.hasTab(Tab.SelectorStats)) {
      this.appendTab(Tab.SelectorStats, i18nString24(UIStrings24.selectorStats), selectorStatsView);
    }
  }
  /**
   * When some events are selected, we show extra tabs. E.g. paint events get
   * the Paint Profiler, and layout events might get CSS Selector Stats if
   * they are available in the trace.
   */
  appendExtraDetailsTabsForTraceEvent(event) {
    if (Trace29.Types.Events.isPaint(event) || Trace29.Types.Events.isRasterTask(event)) {
      this.showEventInPaintProfiler(event);
    }
    if (Trace29.Types.Events.isRecalcStyle(event)) {
      this.showSelectorStatsForIndividualEvent(event);
    }
  }
  showEventInPaintProfiler(event) {
    const paintProfilerModel = SDK12.TargetManager.TargetManager.instance().models(SDK12.PaintProfiler.PaintProfilerModel)[0];
    if (!paintProfilerModel) {
      return;
    }
    const paintProfilerView = this.paintProfilerView();
    if (!paintProfilerView) {
      return;
    }
    const hasProfileData = paintProfilerView.setEvent(paintProfilerModel, event);
    if (!hasProfileData) {
      return;
    }
    if (this.tabbedPane.hasTab(Tab.PaintProfiler)) {
      return;
    }
    this.appendTab(Tab.PaintProfiler, i18nString24(UIStrings24.paintProfiler), paintProfilerView);
  }
  updateSelectedRangeStats(startTime, endTime) {
    if (!this.#selectedEvents || !this.#parsedTrace || !this.#entityMapper) {
      return;
    }
    this.#summaryContent.selectedEvent = null;
    this.#summaryContent.selectedRange = {
      events: this.#selectedEvents,
      thirdPartyTree: this.#thirdPartyTree,
      startTime,
      endTime
    };
    void this.updateSummaryPane().then(() => {
      this.#thirdPartyTree.updateContents(this.selection || selectionFromRangeMilliSeconds(startTime, endTime));
    });
    const isSelectorStatsEnabled = Common14.Settings.Settings.instance().createSetting("timeline-capture-selector-stats", false).get();
    if (this.#selectedEvents && isSelectorStatsEnabled) {
      const eventsInRange = Trace29.Helpers.Trace.findRecalcStyleEvents(this.#selectedEvents, Trace29.Helpers.Timing.milliToMicro(startTime), Trace29.Helpers.Timing.milliToMicro(endTime));
      if (eventsInRange.length > 0) {
        this.showAggregatedSelectorStats(eventsInRange);
      }
    }
  }
};
var Tab;
(function(Tab2) {
  Tab2["Details"] = "details";
  Tab2["EventLog"] = "event-log";
  Tab2["CallTree"] = "call-tree";
  Tab2["BottomUp"] = "bottom-up";
  Tab2["PaintProfiler"] = "paint-profiler";
  Tab2["LayerViewer"] = "layer-viewer";
  Tab2["SelectorStats"] = "selector-stats";
})(Tab || (Tab = {}));
var SUMMARY_DEFAULT_VIEW = (input, _output, target) => {
  render3(html3`
        <style>${timelineDetailsView_css_default}</style>
        ${Directives2.until(renderSelectedEventDetails(input))}
        ${input.selectedRange ? generateRangeSummaryDetails(input) : nothing}
        <devtools-widget data-related-insight-chips .widgetConfig=${UI16.Widget.widgetConfig(TimelineComponents5.RelatedInsightChips.RelatedInsightChips, {
    activeEvent: input.selectedEvent,
    eventToInsightsMap: input.eventToRelatedInsightsMap
  })}></devtools-widget>
      `, target);
};
var SummaryView = class extends UI16.Widget.Widget {
  #view;
  selectedEvent = null;
  eventToRelatedInsightsMap = null;
  parsedTrace = null;
  entityMapper = null;
  target = null;
  linkifier = null;
  filmStrip = null;
  selectedRange = null;
  constructor(element, view = SUMMARY_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }
  performUpdate() {
    this.#view({
      selectedEvent: this.selectedEvent,
      eventToRelatedInsightsMap: this.eventToRelatedInsightsMap,
      parsedTrace: this.parsedTrace,
      entityMapper: this.entityMapper,
      target: this.target,
      linkifier: this.linkifier,
      filmStrip: this.filmStrip,
      selectedRange: this.selectedRange
    }, {}, this.contentElement);
  }
};
function generateRangeSummaryDetails(input) {
  const { parsedTrace, selectedRange } = input;
  if (!selectedRange || !parsedTrace) {
    return nothing;
  }
  const minBoundsMilli = Trace29.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
  const { events, startTime, endTime, thirdPartyTree } = selectedRange;
  const aggregatedStats = TimelineUIUtils.statsForTimeRange(events, startTime, endTime);
  const startOffset = startTime - minBoundsMilli;
  const endOffset = endTime - minBoundsMilli;
  const summaryDetailElem = TimelineUIUtils.generateSummaryDetails(aggregatedStats, startOffset, endOffset, events, thirdPartyTree);
  return html3`${summaryDetailElem}`;
}
async function renderSelectedEventDetails(input) {
  const { selectedEvent, parsedTrace, linkifier } = input;
  if (!selectedEvent || !parsedTrace || !linkifier) {
    return nothing;
  }
  const traceRecordingIsFresh = parsedTrace ? Tracing5.FreshRecording.Tracker.instance().recordingIsFresh(parsedTrace) : false;
  if (Trace29.Types.Events.isSyntheticLayoutShift(selectedEvent) || Trace29.Types.Events.isSyntheticLayoutShiftCluster(selectedEvent)) {
    return html3`
      <devtools-widget data-layout-shift-details .widgetConfig=${UI16.Widget.widgetConfig(TimelineComponents5.LayoutShiftDetails.LayoutShiftDetails, {
      event: selectedEvent,
      parsedTrace: input.parsedTrace,
      isFreshRecording: traceRecordingIsFresh
    })}
      ></devtools-widget>`;
  }
  if (Trace29.Types.Events.isSyntheticNetworkRequest(selectedEvent)) {
    return html3`
      <devtools-widget data-network-request-details .widgetConfig=${UI16.Widget.widgetConfig(TimelineComponents5.NetworkRequestDetails.NetworkRequestDetails, {
      request: selectedEvent,
      entityMapper: input.entityMapper,
      target: input.target,
      linkifier: input.linkifier,
      parsedTrace: input.parsedTrace
    })}
      ></devtools-widget>
    `;
  }
  if (Trace29.Types.Events.isLegacyTimelineFrame(selectedEvent) && input.filmStrip) {
    const matchedFilmStripFrame = getFilmStripFrame(input.filmStrip, selectedEvent);
    const content = TimelineUIUtils.generateDetailsContentForFrame(selectedEvent, input.filmStrip, matchedFilmStripFrame);
    return html3`${content}`;
  }
  const traceEventDetails = await TimelineUIUtils.buildTraceEventDetails(parsedTrace, selectedEvent, linkifier, true, input.entityMapper);
  return html3`${traceEventDetails}`;
}
var filmStripFrameCache = /* @__PURE__ */ new WeakMap();
function getFilmStripFrame(filmStrip, frame) {
  const fromCache = filmStripFrameCache.get(frame);
  if (typeof fromCache !== "undefined") {
    return fromCache;
  }
  const screenshotTime = frame.idle ? frame.startTime : frame.endTime;
  const filmStripFrame = Trace29.Extras.FilmStrip.frameClosestToTimestamp(filmStrip, screenshotTime);
  if (!filmStripFrame) {
    filmStripFrameCache.set(frame, null);
    return null;
  }
  const frameTimeMilliSeconds = Trace29.Helpers.Timing.microToMilli(filmStripFrame.screenshotEvent.ts);
  const frameEndTimeMilliSeconds = Trace29.Helpers.Timing.microToMilli(frame.endTime);
  if (frameTimeMilliSeconds - frameEndTimeMilliSeconds < 10) {
    filmStripFrameCache.set(frame, filmStripFrame);
    return filmStripFrame;
  }
  filmStripFrameCache.set(frame, null);
  return null;
}

// gen/front_end/panels/timeline/TimelineFlameChartNetworkDataProvider.js
var TimelineFlameChartNetworkDataProvider_exports = {};
__export(TimelineFlameChartNetworkDataProvider_exports, {
  TimelineFlameChartNetworkDataProvider: () => TimelineFlameChartNetworkDataProvider
});
import * as i18n51 from "./../../core/i18n/i18n.js";
import * as Platform14 from "./../../core/platform/platform.js";
import * as SDK13 from "./../../core/sdk/sdk.js";
import * as Trace31 from "./../../models/trace/trace.js";
import * as PerfUI15 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI17 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport23 from "./../../ui/legacy/theme_support/theme_support.js";
import * as TimelineComponents6 from "./components/components.js";

// gen/front_end/panels/timeline/NetworkTrackAppender.js
var NetworkTrackAppender_exports = {};
__export(NetworkTrackAppender_exports, {
  NetworkTrackAppender: () => NetworkTrackAppender
});
import * as i18n49 from "./../../core/i18n/i18n.js";
import * as Trace30 from "./../../models/trace/trace.js";
import * as PerfUI14 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as ThemeSupport21 from "./../../ui/legacy/theme_support/theme_support.js";
import * as Components4 from "./components/components.js";
var UIStrings25 = {
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  network: "Network"
};
var str_25 = i18n49.i18n.registerUIStrings("panels/timeline/NetworkTrackAppender.ts", UIStrings25);
var i18nString25 = i18n49.i18n.getLocalizedString.bind(void 0, str_25);
var NetworkTrackAppender = class {
  appenderName = "Network";
  #flameChartData;
  webSocketIdToLevel = /* @__PURE__ */ new Map();
  #events = [];
  #font;
  #group;
  constructor(flameChartData, events) {
    this.#flameChartData = flameChartData;
    this.#events = events;
    this.#font = `${PerfUI14.Font.DEFAULT_FONT_SIZE} ${PerfUI14.Font.getFontFamilyForCanvas()}`;
    ThemeSupport21.ThemeSupport.instance().addEventListener(ThemeSupport21.ThemeChangeEvent.eventName, () => {
      if (this.#group) {
        this.#group.style.color = ThemeSupport21.ThemeSupport.instance().getComputedValue("--sys-color-on-surface");
        this.#group.style.backgroundColor = ThemeSupport21.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container");
      }
    });
  }
  group() {
    return this.#group;
  }
  font() {
    return this.#font;
  }
  /**
   * Appends into the flame chart data the data corresponding to the
   * Network track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded whether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel, expanded) {
    if (this.#events.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendEventsAtLevel(this.#events, trackStartLevel);
  }
  /**
   * Adds into the flame chart data the header corresponding to the
   * Network track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   * @param expanded whether the track should be rendered expanded.
   */
  #appendTrackHeaderAtLevel(_currentLevel, expanded) {
    const style = buildGroupStyle({
      shareHeaderLine: false,
      useFirstLineForOverview: false,
      useDecoratorsForOverview: true
    });
    this.#group = buildTrackHeader(
      "network",
      0,
      i18nString25(UIStrings25.network),
      style,
      /* selectable= */
      true,
      expanded,
      /* showStackContextMenu= */
      false
    );
    this.#flameChartData.groups.push(this.#group);
  }
  /**
   * Adds into the flame chart data a list of trace events.
   * @param events the trace events that will be appended to the flame chart.
   * The events should be taken straight from the trace handlers. The handlers
   * should sort the events by start time, and the parent event is before the
   * child.
   * @param trackStartLevel the flame chart level from which the events will
   * be appended.
   * @returns the next level after the last occupied by the appended these
   * trace events (the first available level to append next track).
   */
  #appendEventsAtLevel(events, trackStartLevel) {
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      this.#appendEventAtLevel(event, trackStartLevel);
      if (Trace30.Types.Events.isSyntheticNetworkRequest(event) && Trace30.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(event)) {
        addDecorationToEvent(this.#flameChartData, i, {
          type: "WARNING_TRIANGLE",
          customStartTime: event.args.data.syntheticData.sendStartTime,
          customEndTime: event.args.data.syntheticData.finishTime
        });
      }
    }
    return this.relayoutEntriesWithinBounds(events, Trace30.Types.Timing.Milli(-Infinity), Trace30.Types.Timing.Milli(Infinity));
  }
  /**
   * Adds an event to the flame chart data at a defined level.
   * @param event the event to be appended,
   * @param level the level to append the event,
   * @returns the index of the event in all events to be rendered in the flamechart.
   */
  #appendEventAtLevel(event, level) {
    const index = this.#flameChartData.entryLevels.length;
    this.#flameChartData.entryLevels[index] = level;
    this.#flameChartData.entryStartTimes[index] = Trace30.Helpers.Timing.microToMilli(event.ts);
    const dur = event.dur || Trace30.Helpers.Timing.milliToMicro(InstantEventVisibleDurationMs);
    this.#flameChartData.entryTotalTimes[index] = Trace30.Helpers.Timing.microToMilli(dur);
    return level;
  }
  /**
   * Update the flame chart data.
   * When users zoom in the flamechart, we only want to show them the network
   * requests between minTime and maxTime. This function will append those
   * invisible events to the last level, and hide them.
   * @returns the number of levels used by this track
   */
  relayoutEntriesWithinBounds(events, minTime, maxTime) {
    if (!this.#flameChartData || events.length === 0) {
      return 0;
    }
    const lastTimestampByLevel = [];
    this.webSocketIdToLevel = /* @__PURE__ */ new Map();
    let maxLevel = 0;
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      const beginTime = Trace30.Helpers.Timing.microToMilli(event.ts);
      const dur = event.dur ? Trace30.Helpers.Timing.microToMilli(event.dur) : InstantEventVisibleDurationMs;
      const endTime = beginTime + dur;
      const isBetweenTimes = beginTime < maxTime && endTime > minTime;
      if (!isBetweenTimes) {
        this.#flameChartData.entryLevels[i] = -1;
        continue;
      }
      let level;
      if ("identifier" in event.args.data && Trace30.Types.Events.isWebSocketEvent(event)) {
        level = this.getWebSocketLevel(event, lastTimestampByLevel);
      } else {
        level = getEventLevel(event, lastTimestampByLevel);
      }
      this.#flameChartData.entryLevels[i] = level;
      maxLevel = Math.max(maxLevel, lastTimestampByLevel.length, level);
    }
    for (let i = 0; i < events.length; ++i) {
      if (this.#flameChartData.entryLevels[i] === -1) {
        this.#flameChartData.entryLevels[i] = maxLevel;
      }
    }
    return maxLevel;
  }
  getWebSocketLevel(event, lastTimestampByLevel) {
    const webSocketIdentifier = event.args.data.identifier;
    let level;
    if (this.webSocketIdToLevel.has(webSocketIdentifier)) {
      level = this.webSocketIdToLevel.get(webSocketIdentifier) || 0;
    } else {
      level = getEventLevel(event, lastTimestampByLevel);
      this.webSocketIdToLevel.set(webSocketIdentifier, level);
    }
    return level;
  }
  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */
  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event) {
    if (Trace30.Types.Events.isSyntheticWebSocketConnection(event)) {
      return "";
    }
    if (Trace30.Types.Events.isWebSocketTraceEvent(event)) {
      return Components4.Utils.colorForNetworkCategory(Components4.Utils.NetworkCategory.JS);
    }
    if (!Trace30.Types.Events.isSyntheticNetworkRequest(event)) {
      throw new Error(`Unexpected Network Request: The event's type is '${event.name}'`);
    }
    return Components4.Utils.colorForNetworkRequest(event);
  }
};

// gen/front_end/panels/timeline/TrackConfiguration.js
var TrackConfiguration_exports = {};
__export(TrackConfiguration_exports, {
  buildPersistedConfig: () => buildPersistedConfig,
  keyForTraceConfig: () => keyForTraceConfig
});
function buildPersistedConfig(groups, indexesInVisualOrder) {
  return groups.map((group, index) => {
    const newVisualIndex = indexesInVisualOrder.indexOf(index);
    return {
      expanded: Boolean(group.expanded),
      hidden: Boolean(group.hidden),
      originalIndex: index,
      visualIndex: newVisualIndex,
      trackName: group.name
    };
  });
}
function keyForTraceConfig(trace) {
  return trace.Meta.traceBounds.min;
}

// gen/front_end/panels/timeline/TimelineFlameChartNetworkDataProvider.js
var TimelineFlameChartNetworkDataProvider = class {
  #minimumBoundary = 0;
  #timeSpan = 0;
  #events = [];
  #maxLevel = 0;
  #networkTrackAppender = null;
  #timelineData = null;
  #lastSelection = null;
  #parsedTrace = null;
  #eventIndexByEvent = /* @__PURE__ */ new Map();
  // -1 means no entry is selected.
  #lastInitiatorEntry = -1;
  #lastInitiatorsData = [];
  #entityMapper = null;
  #persistedGroupConfigSetting = null;
  constructor() {
    this.reset();
  }
  // Reset all data other than the UI elements.
  // This should be called when
  // - initialized the data provider
  // - a new trace file is coming (when `setModel()` is called)
  // etc.
  reset() {
    this.#maxLevel = 0;
    this.#minimumBoundary = 0;
    this.#timeSpan = 0;
    this.#eventIndexByEvent.clear();
    this.#events = [];
    this.#timelineData = null;
    this.#parsedTrace = null;
    this.#networkTrackAppender = null;
  }
  setModel(parsedTrace, entityMapper) {
    this.reset();
    this.#parsedTrace = parsedTrace;
    this.#entityMapper = entityMapper;
    this.setEvents(this.#parsedTrace);
    this.#setTimingBoundsData(this.#parsedTrace);
  }
  setEvents(parsedTrace) {
    if (parsedTrace.data.NetworkRequests.webSocket) {
      parsedTrace.data.NetworkRequests.webSocket.forEach((webSocketData) => {
        if (webSocketData.syntheticConnection) {
          this.#events.push(webSocketData.syntheticConnection);
        }
        this.#events.push(...webSocketData.events);
      });
    }
    if (parsedTrace.data.NetworkRequests.byTime) {
      this.#events.push(...parsedTrace.data.NetworkRequests.byTime);
    }
  }
  isEmpty() {
    this.timelineData();
    return !this.#events.length;
  }
  maxStackDepth() {
    return this.#maxLevel;
  }
  hasTrackConfigurationMode() {
    return false;
  }
  timelineData() {
    if (this.#timelineData && this.#timelineData.entryLevels.length !== 0) {
      return this.#timelineData;
    }
    this.#timelineData = PerfUI15.FlameChart.FlameChartTimelineData.createEmpty();
    if (!this.#parsedTrace) {
      return this.#timelineData;
    }
    if (!this.#events.length) {
      this.setEvents(this.#parsedTrace);
    }
    this.#networkTrackAppender = new NetworkTrackAppender(this.#timelineData, this.#events);
    this.#maxLevel = this.#networkTrackAppender.appendTrackAtLevel(0);
    return this.#timelineData;
  }
  minimumBoundary() {
    return this.#minimumBoundary;
  }
  totalTime() {
    return this.#timeSpan;
  }
  setWindowTimes(startTime, endTime) {
    this.#updateTimelineData(startTime, endTime);
  }
  createSelection(index) {
    if (index === -1) {
      return null;
    }
    const event = this.#events[index];
    this.#lastSelection = new Selection(selectionFromEvent(event), index);
    return this.#lastSelection.timelineSelection;
  }
  customizedContextMenu(event, eventIndex, _groupIndex) {
    const networkRequest = this.eventByIndex(eventIndex);
    if (!networkRequest || !Trace31.Types.Events.isSyntheticNetworkRequest(networkRequest)) {
      return;
    }
    const timelineNetworkRequest = SDK13.TraceObject.RevealableNetworkRequest.create(networkRequest);
    const contextMenu = new UI17.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(timelineNetworkRequest);
    return contextMenu;
  }
  indexForEvent(event) {
    if (!Trace31.Types.Events.isNetworkTrackEntry(event)) {
      return null;
    }
    const fromCache = this.#eventIndexByEvent.get(event);
    if (fromCache !== void 0) {
      return fromCache;
    }
    const index = this.#events.indexOf(event);
    const result = index > -1 ? index : null;
    this.#eventIndexByEvent.set(event, result);
    return result;
  }
  eventByIndex(entryIndex) {
    return this.#events.at(entryIndex) ?? null;
  }
  entryIndexForSelection(selection) {
    if (!selection || selectionIsRange(selection)) {
      return -1;
    }
    if (this.#lastSelection && selectionsEqual(this.#lastSelection.timelineSelection, selection)) {
      return this.#lastSelection.entryIndex;
    }
    if (!Trace31.Types.Events.isNetworkTrackEntry(selection.event)) {
      return -1;
    }
    const index = this.#events.indexOf(selection.event);
    if (index !== -1) {
      this.#lastSelection = new Selection(selectionFromEvent(selection.event), index);
    }
    return index;
  }
  groupForEvent(_entryIndex) {
    const group = this.#networkTrackAppender?.group() ?? null;
    return group;
  }
  entryColor(index) {
    if (!this.#networkTrackAppender) {
      throw new Error("networkTrackAppender should not be empty");
    }
    return this.#networkTrackAppender.colorForEvent(this.#events[index]);
  }
  textColor(_index) {
    return FlameChartStyle.textColor;
  }
  entryTitle(index) {
    const event = this.#events[index];
    return Trace31.Name.forEntry(event);
  }
  entryFont(_index) {
    return this.#networkTrackAppender?.font() || null;
  }
  /**
   * Returns the pixels needed to decorate the event.
   * The pixels compare to the start of the earliest event of the request.
   *
   * Request.beginTime(), which is used in FlameChart to calculate the unclippedBarX
   * v
   *    |----------------[ (URL text)    waiting time   |   request  ]--------|
   *    ^start           ^sendStart                     ^headersEnd  ^Finish  ^end
   * @param request
   * @param unclippedBarX The start pixel of the request. It is calculated with request.beginTime() in FlameChart.
   * @param timeToPixelRatio
   * @returns the pixels to draw waiting time and left and right whiskers and url text
   */
  getDecorationPixels(event, unclippedBarX, timeToPixelRatio) {
    const beginTime = Trace31.Helpers.Timing.microToMilli(event.ts);
    const timeToPixel = (time) => unclippedBarX + (time - beginTime) * timeToPixelRatio;
    const startTime = Trace31.Helpers.Timing.microToMilli(event.ts);
    const endTime = Trace31.Helpers.Timing.microToMilli(event.ts + event.dur);
    const sendStartTime = Trace31.Helpers.Timing.microToMilli(event.args.data.syntheticData.sendStartTime);
    const headersEndTime = Trace31.Helpers.Timing.microToMilli(event.args.data.syntheticData.downloadStart);
    const sendStart = Math.max(timeToPixel(sendStartTime), unclippedBarX);
    const headersEnd = Math.max(timeToPixel(headersEndTime), sendStart);
    const finish = Math.max(timeToPixel(Trace31.Helpers.Timing.microToMilli(event.args.data.syntheticData.finishTime)), headersEnd);
    const start = timeToPixel(startTime);
    const end = Math.max(timeToPixel(endTime), finish);
    return { sendStart, headersEnd, finish, start, end };
  }
  /**
   * Decorates the entry depends on the type of the event:
   * @param index
   * @param context
   * @param barX The x pixel of the visible part request
   * @param barY The y pixel of the visible part request
   * @param barWidth The width of the visible part request
   * @param barHeight The height of the visible part request
   * @param unclippedBarX The start pixel of the request compare to the visible area. It is calculated with request.beginTime() in FlameChart.
   * @param timeToPixelRatio
   * @returns if the entry needs to be decorate, which is alway true if the request has "timing" field
   */
  decorateEntry(index, context, _text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio) {
    const event = this.#events[index];
    if (Trace31.Types.Events.isSyntheticWebSocketConnection(event)) {
      return this.#decorateSyntheticWebSocketConnection(index, context, barY, barHeight, unclippedBarX, timeToPixelRatio);
    }
    if (!Trace31.Types.Events.isSyntheticNetworkRequest(event)) {
      return false;
    }
    return this.#decorateNetworkRequest(index, context, _text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio);
  }
  /**
   * Decorates the Network Request entry with the following steps:
   *   Draw a waiting time between |sendStart| and |headersEnd|
   *     By adding a extra transparent white layer
   *   Draw a whisk between |start| and |sendStart|
   *   Draw a whisk between |finish| and |end|
   *     By draw another layer of background color to "clear" the area
   *     Then draw the whisk
   *   Draw the URL after the |sendStart|
   *
   *   |----------------[ (URL text)    waiting time   |   request  ]--------|
   *   ^start           ^sendStart                     ^headersEnd  ^Finish  ^end
   * */
  #decorateNetworkRequest(index, context, _text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio) {
    const event = this.#events[index];
    if (!Trace31.Types.Events.isSyntheticNetworkRequest(event)) {
      return false;
    }
    const { sendStart, headersEnd, finish, start, end } = this.getDecorationPixels(event, unclippedBarX, timeToPixelRatio);
    context.fillStyle = "hsla(0, 100%, 100%, 0.8)";
    context.fillRect(sendStart + 0.5, barY + 0.5, headersEnd - sendStart - 0.5, barHeight - 2);
    context.fillStyle = ThemeSupport23.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container");
    context.fillRect(barX, barY - 0.5, sendStart - barX, barHeight);
    context.fillRect(finish, barY - 0.5, barX + barWidth - finish, barHeight);
    function drawTick(begin, end2, y) {
      const tickHeightPx = 6;
      context.moveTo(begin, y - tickHeightPx / 2);
      context.lineTo(begin, y + tickHeightPx / 2);
      context.moveTo(begin, y);
      context.lineTo(end2, y);
    }
    context.beginPath();
    context.lineWidth = 1;
    context.strokeStyle = "#ccc";
    const lineY = Math.floor(barY + barHeight / 2) + 0.5;
    const leftTick = start + 0.5;
    const rightTick = end - 0.5;
    drawTick(leftTick, sendStart, lineY);
    drawTick(rightTick, finish, lineY);
    context.stroke();
    const textStart = Math.max(sendStart, 0);
    const textWidth = finish - textStart;
    const minTextWidthPx = 20;
    if (textWidth >= minTextWidthPx) {
      let title = this.entryTitle(index) || "";
      if (event.args.data.fromServiceWorker) {
        title = "\u2699 " + title;
      }
      if (title) {
        const textPadding = 4;
        const textBaseline = 5;
        const textBaseHeight = barHeight - textBaseline;
        const trimmedText = UI17.UIUtils.trimTextEnd(context, title, textWidth - 2 * textPadding);
        context.fillStyle = "#333";
        context.fillText(trimmedText, textStart + textPadding, barY + textBaseHeight);
      }
    }
    return true;
  }
  /**
   * Decorates the synthetic websocket event entry with a whisk from the start to the end.
   *   ------------------------
   *   ^start                 ^end
   * */
  #decorateSyntheticWebSocketConnection(index, context, barY, barHeight, unclippedBarX, timeToPixelRatio) {
    context.save();
    const event = this.#events[index];
    const beginTime = Trace31.Helpers.Timing.microToMilli(event.ts);
    const timeToPixel = (time) => Math.floor(unclippedBarX + (time - beginTime) * timeToPixelRatio);
    const endTime = Trace31.Helpers.Timing.microToMilli(event.ts + event.dur);
    const start = timeToPixel(beginTime) + 0.5;
    const end = timeToPixel(endTime) - 0.5;
    context.strokeStyle = ThemeSupport23.ThemeSupport.instance().getComputedValue("--app-color-rendering");
    const lineY = Math.floor(barY + barHeight / 2) + 0.5;
    context.setLineDash([3, 2]);
    context.moveTo(start, lineY - 1);
    context.lineTo(end, lineY - 1);
    context.moveTo(start, lineY + 1);
    context.lineTo(end, lineY + 1);
    context.stroke();
    context.restore();
    return true;
  }
  forceDecoration(_index) {
    return true;
  }
  /**
   *In the FlameChart.ts, when filtering through the events for a level, it starts
   * from the last event of that level and stops when it hit an event that has start
   * time greater than the filtering window.
   * For example, in this websocket level we have A(socket event), B, C, D. If C
   * event has start time greater than the window, the rest of the events (A and B)
   * wont be drawn. So if this level is the force Drawable level, we wont stop at
   * event C and will include the socket event A.
   * */
  forceDrawableLevel(levelIndex) {
    return this.#networkTrackAppender?.webSocketIdToLevel.has(levelIndex) || false;
  }
  preparePopoverElement(index) {
    const event = this.#events[index];
    if (Trace31.Types.Events.isSyntheticNetworkRequest(event)) {
      const element = document.createElement("div");
      const root = UI17.UIUtils.createShadowRootWithCoreStyles(element, { cssFile: timelineFlamechartPopover_css_default });
      const contents = root.createChild("div", "timeline-flamechart-popover");
      const infoElement = new TimelineComponents6.NetworkRequestTooltip.NetworkRequestTooltip();
      infoElement.data = { networkRequest: event, entityMapper: this.#entityMapper };
      contents.appendChild(infoElement);
      return element;
    }
    return null;
  }
  /**
   * Sets the minimum time and total time span of a trace using the
   * new engine data.
   */
  #setTimingBoundsData(newParsedTrace) {
    const { traceBounds } = newParsedTrace.data.Meta;
    const minTime = Trace31.Helpers.Timing.microToMilli(traceBounds.min);
    const maxTime = Trace31.Helpers.Timing.microToMilli(traceBounds.max);
    this.#minimumBoundary = minTime;
    this.#timeSpan = minTime === maxTime ? 1e3 : maxTime - this.#minimumBoundary;
  }
  /**
   * When users zoom in the flamechart, we only want to show them the network
   * requests between startTime and endTime. This function will call the
   * trackAppender to update the timeline data, and then force to create a new
   * PerfUI.FlameChart.FlameChartTimelineData instance to force the flamechart
   * to re-render.
   */
  #updateTimelineData(startTime, endTime) {
    if (!this.#networkTrackAppender || !this.#timelineData) {
      return;
    }
    this.#maxLevel = this.#networkTrackAppender.relayoutEntriesWithinBounds(this.#events, startTime, endTime);
    this.#timelineData = PerfUI15.FlameChart.FlameChartTimelineData.create({
      entryLevels: this.#timelineData?.entryLevels,
      entryTotalTimes: this.#timelineData?.entryTotalTimes,
      entryStartTimes: this.#timelineData?.entryStartTimes,
      groups: this.#timelineData?.groups,
      initiatorsData: this.#timelineData.initiatorsData,
      entryDecorations: this.#timelineData.entryDecorations
    });
  }
  /**
   * Note that although we use the same mechanism to track configuration
   * changes in the Network part of the timeline, we only really use it to track
   * the expanded state because the user cannot re-order or hide/show tracks in
   * here.
   */
  handleTrackConfigurationChange(groups, indexesInVisualOrder) {
    if (!this.#persistedGroupConfigSetting) {
      return;
    }
    if (!this.#parsedTrace) {
      return;
    }
    const persistedDataForTrace = buildPersistedConfig(groups, indexesInVisualOrder);
    this.#persistedGroupConfigSetting.set(persistedDataForTrace);
  }
  setPersistedGroupConfigSetting(setting) {
    this.#persistedGroupConfigSetting = setting;
  }
  preferredHeight() {
    if (!this.#networkTrackAppender || this.#maxLevel === 0) {
      return 0;
    }
    const group = this.#networkTrackAppender.group();
    if (!group) {
      return 0;
    }
    return group.style.height * (this.isExpanded() ? Platform14.NumberUtilities.clamp(this.#maxLevel + 1, 7, 8.5) : 1);
  }
  isExpanded() {
    return Boolean(this.#networkTrackAppender?.group()?.expanded);
  }
  formatValue(value, precision) {
    return i18n51.TimeUtilities.preciseMillisToString(value, precision);
  }
  canJumpToEntry(_entryIndex) {
    return false;
  }
  /**
   * searches entries within the specified time and returns a list of entry
   * indexes
   */
  search(visibleWindow, filter) {
    const results = [];
    for (let i = 0; i < this.#events.length; i++) {
      const entry = this.#events.at(i);
      if (!entry) {
        continue;
      }
      if (!Trace31.Helpers.Timing.eventIsInBounds(entry, visibleWindow)) {
        continue;
      }
      if (!filter || filter.accept(entry, this.#parsedTrace?.data ?? void 0)) {
        const startTimeMilli = Trace31.Helpers.Timing.microToMilli(entry.ts);
        results.push({ startTimeMilli, index: i, provider: "network" });
      }
    }
    return results;
  }
  /**
   * Returns a map of navigations that happened in the main frame, ignoring any
   * that happened in other frames.
   * The map's key is the frame ID.
   **/
  mainFrameNavigationStartEvents() {
    if (!this.#parsedTrace) {
      return [];
    }
    return this.#parsedTrace.data.Meta.mainFrameNavigations;
  }
  buildFlowForInitiator(entryIndex) {
    if (!this.#parsedTrace) {
      return false;
    }
    if (!this.#timelineData) {
      return false;
    }
    if (entryIndex > -1 && this.#lastInitiatorEntry === entryIndex) {
      if (this.#lastInitiatorsData) {
        this.#timelineData.initiatorsData = this.#lastInitiatorsData;
      }
      return true;
    }
    if (!this.#networkTrackAppender) {
      return false;
    }
    const previousInitiatorsDataLength = this.#timelineData.initiatorsData.length;
    if (entryIndex === -1) {
      this.#lastInitiatorEntry = entryIndex;
      if (previousInitiatorsDataLength === 0) {
        return false;
      }
      this.#timelineData.emptyInitiators();
      return true;
    }
    const event = this.#events[entryIndex];
    this.#timelineData.emptyInitiators();
    this.#lastInitiatorEntry = entryIndex;
    const initiatorsData = initiatorsDataToDrawForNetwork(this.#parsedTrace, event);
    if (previousInitiatorsDataLength === 0 && initiatorsData.length === 0) {
      return false;
    }
    for (const initiatorData of initiatorsData) {
      const eventIndex = this.indexForEvent(initiatorData.event);
      const initiatorIndex = this.indexForEvent(initiatorData.initiator);
      if (eventIndex === null || initiatorIndex === null) {
        continue;
      }
      this.#timelineData.initiatorsData.push({
        initiatorIndex,
        eventIndex
      });
    }
    this.#lastInitiatorsData = this.#timelineData.initiatorsData;
    return true;
  }
};

// gen/front_end/panels/timeline/timelineFlameChartView.css.js
var timelineFlameChartView_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.timeline-overlays-container {
  position: absolute;
  inset: 0;
  /* Ensure it appears on top of everything */
  z-index: 200;
  pointer-events: none;
}

.overlay-item {
  position: absolute;
  /* The FlameChartView will move these as the FlameChart is drawn */
  top: 0;
  left: 0;
}

.overlay-type-ENTRY_LABEL {
  /* keep these above the selected entry overline, else they can become hard to read */
  z-index: 2;
  transition: opacity 0.2s;

  /* if an overlay is being edited, keep it above the rest so the user is not obstructed */
  /* also bump the z-index if the label is being hovered, to ensure it appears above any other labels that might obstruct it */
  &:has([data-user-editing-label]),
  &:hover {
    z-index: 4;
  }

  /* Added to the selected entry label to bring it forward. Hovered entry's label will still be on top */
  &.bring-forward {
    z-index: 3;
  }
}


.overlay-type-ENTRY_SELECTED,
.overlay-type-ENTRY_OUTLINE {
  pointer-events: none;
  border: 2px solid var(--sys-color-primary);
  background-color: var(--sys-color-state-ripple-primary);

  &.cut-off-top {
    border-top: none;
  }

  &.cut-off-bottom {
    border-bottom: none;
  }

  &.cut-off-right {
    border-right: none;
  }

  &.cut-off-left {
    border-left: none;
  }
}

.overlay-type-ENTRY_SELECTED {
  /* Ensure ENTRY_SELECTED overlays are always displayed on top of ENTRY_OUTLINE overlays */
  z-index: 1;
}

.overlay-type-ENTRY_OUTLINE {
  background-color: transparent;
  border-width: 1px;
  /* Ensure ENTRY_SELECTED overlays are always displayed on top of ENTRY_OUTLINE overlays */
  z-index: 0;

  &.outline-reason-ERROR {
    border-color: var(--sys-color-error-bright);
  }

  &.outline-reason-INFO {
    border-color: var(--sys-color-primary);
  }
}

.overlay-type-CANDY_STRIPED_TIME_RANGE {
  --red-stripe-width: 2px;
  --white-stripe-width: 7px;

  background-image:
    repeating-linear-gradient(
      315deg,
      var(--sys-color-error-bright),
      var(--sys-color-error-bright) var(--red-stripe-width),
      transparent var(--red-stripe-width),
      transparent var(--white-stripe-width)
    );
  border: 1px solid var(--sys-color-error-bright);

  &.cut-off-bottom {
    border-bottom: none;
  }

  &.cut-off-top {
    border-top: none;
  }

  &.cut-off-right {
    border-right: none;
  }

  &.cut-off-left {
    border-left: none;
  }
}

.overlay-type-ENTRIES_LINK {
  height: 100%;
  width: 100%;
}

.overlay-type-TIME_RANGE {
  top: 0;
  bottom: 0;

  &.overlap-1 {
    bottom: 55px;
  }

  &.overlap-2 {
    bottom: 105px;
  }
}

.overlay-type-TIMESTAMP_MARKER {
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--sys-color-primary);
  pointer-events: none;
}

.timeline-entry-tooltip-element:not(:empty) {
  z-index: 2000;
  position: absolute;
  contain: content;
  background-color: var(--sys-color-cdt-base-container);
  pointer-events: none;
  padding: var(--sys-size-3) var(--sys-size-4);
  border-radius: var(--sys-shape-corner-extra-small);
  white-space: nowrap;
  max-width: 80%;
  box-shadow: var(--sys-elevation-level2);
}

.overlay-type-TIMESPAN_BREAKDOWN {
  /* This overlay by default is shown at the bottom of the UI, not the top */
  top: unset;
  bottom: 0;
  height: 100px;
}

.overlay-type-TIMINGS_MARKER {
  bottom: 0;
  width: 0.5px;
  pointer-events: auto;
}

.overlay-type-BOTTOM_INFO_BAR {
  top: unset;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  /* Unlike other overlays, the user can click + interact with this one */
  pointer-events: auto;
  /* Ensure this one is always on top of any others */
  z-index: 5;
}

.marker-title {
  display: flex;
  justify-content: center;
  padding: 0 var(--sys-size-3);
  font-size: var(--sys-typescale-body4-size);
  color: var(--sys-color-base);

  &:hover {
    cursor: default;
    transition: opacity 0.2s ease;
  }
}

.markers {
  position: fixed;
  display: flex;
  bottom: 0;
}

.overlay-popover span {
  margin-right: var(--sys-size-3);
}

.overlay-popover span.overlay-popover-time {
  color: var(--sys-color-green);
}

.timeline-flamechart-resizer {
  flex: 8px 0 0;
  background-color: var(--sys-color-surface2);
  border: 1px var(--sys-color-divider);
  border-style: solid none;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: center;
}

.timeline-network-resizer-disabled > .timeline-flamechart-resizer {
  display: none;
}

.timeline-flamechart-resizer::after {
  content: "...";
  font-size: 14px;
  margin-bottom: -1px;
}

/*# sourceURL=${import.meta.resolve("./timelineFlameChartView.css")} */`;

// gen/front_end/panels/timeline/TimelineFlameChartView.js
import * as Utils7 from "./utils/utils.js";
var UIStrings26 = {
  /**
   * @description Text in Timeline Flame Chart View of the Performance panel
   * @example {Frame} PH1
   * @example {10ms} PH2
   */
  sAtS: "{PH1} at {PH2}"
};
var str_26 = i18n52.i18n.registerUIStrings("panels/timeline/TimelineFlameChartView.ts", UIStrings26);
var i18nString26 = i18n52.i18n.getLocalizedString.bind(void 0, str_26);
var SORT_ORDER_PAGE_LOAD_MARKERS = {
  [
    "navigationStart"
    /* Trace.Types.Events.Name.NAVIGATION_START */
  ]: 0,
  [
    "MarkLoad"
    /* Trace.Types.Events.Name.MARK_LOAD */
  ]: 1,
  [
    "firstContentfulPaint"
    /* Trace.Types.Events.Name.MARK_FCP */
  ]: 2,
  [
    "MarkDOMContent"
    /* Trace.Types.Events.Name.MARK_DOM_CONTENT */
  ]: 3,
  [
    "largestContentfulPaint::Candidate"
    /* Trace.Types.Events.Name.MARK_LCP_CANDIDATE */
  ]: 4
};
var TIMESTAMP_THRESHOLD_MS = Trace32.Types.Timing.Micro(10);
var TimelineFlameChartView = class extends Common15.ObjectWrapper.eventMixin(UI18.Widget.VBox) {
  delegate;
  /**
   * Tracks the indexes of matched entries when the user searches the panel.
   * Defaults to undefined which indicates the user has not searched.
   */
  searchResults = void 0;
  eventListeners;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  networkSplitWidget;
  mainDataProvider;
  mainFlameChart;
  networkDataProvider;
  networkFlameChart;
  networkPane;
  splitResizer;
  chartSplitWidget;
  brickGame;
  countersView;
  detailsSplitWidget;
  detailsView;
  onMainAddEntryLabelAnnotation;
  onNetworkAddEntryLabelAnnotation;
  #onMainEntriesLinkAnnotationCreated;
  #onNetworkEntriesLinkAnnotationCreated;
  onMainEntrySelected;
  onNetworkEntrySelected;
  #boundRefreshAfterIgnoreList;
  #selectedEvents;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  groupBySetting;
  searchableView;
  needsResizeToPreferredHeights;
  selectedSearchResult;
  searchRegex;
  #parsedTrace;
  #eventToRelatedInsightsMap = null;
  #selectedGroupName = null;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  #gameKeyMatches = 0;
  #gameTimeout = setTimeout(() => ({}), 0);
  #overlaysContainer = document.createElement("div");
  #overlays;
  // Tracks the in-progress time range annotation when the user alt/option clicks + drags, or when the user uses the keyboard
  #timeRangeSelectionAnnotation = null;
  // Keep track of the link annotation that hasn't been fully selected yet.
  // We only store it here when only 'entryFrom' has been selected and
  // 'EntryTo' selection still needs to be updated.
  #linkSelectionAnnotation = null;
  #currentInsightOverlays = [];
  #activeInsight = null;
  #markers = [];
  #tooltipElement = document.createElement("div");
  // We use an symbol as the loggable for each group. This is because
  // groups can get re-built at times and we need a common reference to act as
  // the reference for each group that we log. By storing these symbols in
  // a map keyed off the context of the group, we ensure we persist the
  // loggable even if the group gets rebuilt at some point in time.
  #loggableForGroupByLogContext = /* @__PURE__ */ new Map();
  #onMainEntryInvoked;
  #onNetworkEntryInvoked;
  #currentSelection = null;
  #entityMapper = null;
  // Only one dimmer is used at a time. The first dimmer, as defined by the following
  // order, that is `active` within this array is used.
  #flameChartDimmers = [];
  #searchDimmer = this.#registerFlameChartDimmer({ inclusive: false, outline: true });
  #treeRowHoverDimmer = this.#registerFlameChartDimmer({ inclusive: false, outline: true });
  #treeRowClickDimmer = this.#registerFlameChartDimmer({ inclusive: false, outline: false });
  #activeInsightDimmer = this.#registerFlameChartDimmer({ inclusive: false, outline: true });
  #thirdPartyCheckboxDimmer = this.#registerFlameChartDimmer({ inclusive: true, outline: false });
  /**
   * Determines if we respect the user's prefers-reduced-motion setting. We
   * absolutely should care about this; the only time we don't is in unit tests
   * when we need to force animations on and don't want the environment to
   * determine if they are on or not.
   * It is not expected that this flag is ever disabled in non-test environments.
   */
  #checkReducedMotion = true;
  /**
   * Persist the visual configuration of the tracks/groups into memory.
   * Note that the user cannot hide/show/re-order the network track; so storing
   * its configuration like this is a little overkill. But we use the
   * configuration to check if the network track is collapsed or expanded, and
   * it's easier to use the same configuration types for both.
   */
  #networkPersistedGroupConfigSetting;
  #mainPersistedGroupConfigSetting;
  constructor(delegate) {
    super({ jslog: `${VisualLogging10.section("timeline.flame-chart-view")}` });
    this.registerRequiredCSS(timelineFlameChartView_css_default);
    this.element.classList.add("timeline-flamechart");
    this.delegate = delegate;
    this.eventListeners = [];
    this.#parsedTrace = null;
    const flameChartsContainer = new UI18.Widget.VBox();
    flameChartsContainer.element.classList.add("flame-charts-container");
    this.networkSplitWidget = new UI18.SplitWidget.SplitWidget(false, false, "timeline-flamechart-main-view", 150);
    this.networkSplitWidget.show(flameChartsContainer.element);
    this.#overlaysContainer.classList.add("timeline-overlays-container");
    flameChartsContainer.element.appendChild(this.#overlaysContainer);
    this.#tooltipElement.classList.add("timeline-entry-tooltip-element");
    flameChartsContainer.element.appendChild(this.#tooltipElement);
    this.networkSplitWidget.sidebarElement().style.zIndex = "120";
    this.#mainPersistedGroupConfigSetting = Common15.Settings.Settings.instance().createSetting("timeline-persisted-main-flamechart-track-config", null);
    this.#networkPersistedGroupConfigSetting = Common15.Settings.Settings.instance().createSetting("timeline-persisted-network-flamechart-track-config", null);
    this.mainDataProvider = new TimelineFlameChartDataProvider();
    this.mainDataProvider.setPersistedGroupConfigSetting(this.#mainPersistedGroupConfigSetting);
    this.mainDataProvider.addEventListener("DataChanged", () => this.mainFlameChart.scheduleUpdate());
    this.mainDataProvider.addEventListener("FlameChartItemHovered", (e) => this.detailsView.revealEventInTreeView(e.data));
    this.mainFlameChart = new PerfUI16.FlameChart.FlameChart(this.mainDataProvider, this, {
      // The TimelineOverlays are used for selected elements
      selectedElementOutline: false,
      tooltipElement: this.#tooltipElement,
      useOverlaysForCursorRuler: true,
      canvasVELogContext: "timeline.flamechart.main"
    });
    this.mainFlameChart.alwaysShowVerticalScroll();
    this.mainFlameChart.enableRuler(false);
    this.mainFlameChart.addEventListener("LatestDrawDimensions", (dimensions) => {
      this.#overlays.updateChartDimensions("main", dimensions.data.chart);
      this.#overlays.updateVisibleWindow(dimensions.data.traceWindow);
      void this.#overlays.update();
    });
    this.networkDataProvider = new TimelineFlameChartNetworkDataProvider();
    this.networkDataProvider.setPersistedGroupConfigSetting(this.#networkPersistedGroupConfigSetting);
    this.networkFlameChart = new PerfUI16.FlameChart.FlameChart(this.networkDataProvider, this, {
      // The TimelineOverlays are used for selected elements
      selectedElementOutline: false,
      tooltipElement: this.#tooltipElement,
      useOverlaysForCursorRuler: true,
      canvasVELogContext: "timeline.flamechart.network"
    });
    this.networkFlameChart.alwaysShowVerticalScroll();
    this.networkFlameChart.addEventListener("LatestDrawDimensions", (dimensions) => {
      this.#overlays.updateChartDimensions("network", dimensions.data.chart);
      this.#overlays.updateVisibleWindow(dimensions.data.traceWindow);
      void this.#overlays.update();
      this.mainFlameChart.setTooltipYPixelAdjustment(this.#overlays.networkChartOffsetHeight());
    });
    this.mainFlameChart.addEventListener("MouseMove", (event) => {
      void this.#processFlameChartMouseMoveEvent(event.data);
    });
    this.networkFlameChart.addEventListener("MouseMove", (event) => {
      void this.#processFlameChartMouseMoveEvent(event.data);
    });
    this.#overlays = new Overlays3.Overlays.Overlays({
      container: this.#overlaysContainer,
      flameChartsContainers: {
        main: this.mainFlameChart.element,
        network: this.networkFlameChart.element
      },
      charts: {
        mainChart: this.mainFlameChart,
        mainProvider: this.mainDataProvider,
        networkChart: this.networkFlameChart,
        networkProvider: this.networkDataProvider
      },
      entryQueries: {
        parsedTrace: () => {
          return this.#parsedTrace;
        },
        isEntryCollapsedByUser: (entry) => {
          return ModificationsManager.activeManager()?.getEntriesFilter().entryIsInvisible(entry) ?? false;
        },
        firstVisibleParentForEntry(entry) {
          return ModificationsManager.activeManager()?.getEntriesFilter().firstVisibleParentEntryForEntry(entry) ?? null;
        }
      }
    });
    this.#overlays.addEventListener(Overlays3.Overlays.ConsentDialogVisibilityChange.eventName, (e) => {
      const event = e;
      if (event.isVisible) {
        this.element.setAttribute("inert", "inert");
      } else {
        this.element.removeAttribute("inert");
      }
    });
    this.#overlays.addEventListener(Overlays3.Overlays.EntryLabelMouseClick.eventName, (event) => {
      const { overlay } = event;
      this.dispatchEventToListeners("EntryLabelAnnotationClicked", {
        entry: overlay.entry
      });
    });
    this.#overlays.addEventListener(Overlays3.Overlays.AnnotationOverlayActionEvent.eventName, (event) => {
      const { overlay, action: action2 } = event;
      if (action2 === "Remove") {
        if (ModificationsManager.activeManager()?.getAnnotationByOverlay(overlay) === this.#timeRangeSelectionAnnotation) {
          this.#timeRangeSelectionAnnotation = null;
        }
        ModificationsManager.activeManager()?.removeAnnotationOverlay(overlay);
      } else if (action2 === "Update") {
        ModificationsManager.activeManager()?.updateAnnotationOverlay(overlay);
      }
    });
    this.element.addEventListener(OverlayComponents.EntriesLinkOverlay.EntryLinkStartCreating.eventName, () => {
      this.focus();
    });
    this.networkPane = new UI18.Widget.VBox();
    this.networkPane.setMinimumSize(23, 23);
    this.networkFlameChart.show(this.networkPane.element);
    this.splitResizer = this.networkPane.element.createChild("div", "timeline-flamechart-resizer");
    this.networkSplitWidget.hideDefaultResizer(true);
    this.networkSplitWidget.installResizer(this.splitResizer);
    this.networkSplitWidget.setMainWidget(this.mainFlameChart);
    this.networkSplitWidget.setSidebarWidget(this.networkPane);
    this.chartSplitWidget = new UI18.SplitWidget.SplitWidget(false, true, "timeline-counters-split-view-state");
    this.countersView = new CountersGraph(this.delegate);
    this.chartSplitWidget.setMainWidget(flameChartsContainer);
    this.chartSplitWidget.setSidebarWidget(this.countersView);
    this.chartSplitWidget.hideDefaultResizer();
    this.chartSplitWidget.installResizer(this.countersView.resizerElement());
    this.detailsSplitWidget = new UI18.SplitWidget.SplitWidget(false, true, "timeline-panel-details-split-view-state");
    this.detailsSplitWidget.element.classList.add("timeline-details-split");
    this.detailsView = new TimelineDetailsPane(delegate);
    this.detailsSplitWidget.installResizer(this.detailsView.headerElement());
    this.detailsSplitWidget.setMainWidget(this.chartSplitWidget);
    this.detailsSplitWidget.setSidebarWidget(this.detailsView);
    this.detailsSplitWidget.show(this.element);
    this.onMainAddEntryLabelAnnotation = this.onAddEntryLabelAnnotation.bind(this, this.mainDataProvider);
    this.onNetworkAddEntryLabelAnnotation = this.onAddEntryLabelAnnotation.bind(this, this.networkDataProvider);
    this.#onMainEntriesLinkAnnotationCreated = (event) => this.onEntriesLinkAnnotationCreate(this.mainDataProvider, event.data.entryFromIndex);
    this.#onNetworkEntriesLinkAnnotationCreated = (event) => this.onEntriesLinkAnnotationCreate(this.networkDataProvider, event.data.entryFromIndex);
    this.mainFlameChart.addEventListener("EntryLabelAnnotationAdded", this.onMainAddEntryLabelAnnotation, this);
    this.mainDataProvider.addEventListener("EntryLabelAnnotationAdded", this.onMainAddEntryLabelAnnotation, this);
    this.networkFlameChart.addEventListener("EntryLabelAnnotationAdded", this.onNetworkAddEntryLabelAnnotation, this);
    this.mainFlameChart.addEventListener("EntriesLinkAnnotationCreated", this.#onMainEntriesLinkAnnotationCreated, this);
    this.networkFlameChart.addEventListener("EntriesLinkAnnotationCreated", this.#onNetworkEntriesLinkAnnotationCreated, this);
    this.mainFlameChart.addEventListener("TracksReorderStateChange", (event) => {
      this.#overlays.toggleAllOverlaysDisplayed(!event.data);
    });
    this.detailsView.addEventListener("TreeRowHovered", (e) => {
      if (e.data.events) {
        this.#updateFlameChartDimmerWithEvents(this.#treeRowHoverDimmer, e.data.events);
        return;
      }
      const events = e?.data?.node?.events ?? null;
      this.#updateFlameChartDimmerWithEvents(this.#treeRowHoverDimmer, events);
    });
    this.detailsView.addEventListener("TreeRowClicked", (e) => {
      if (e.data.events) {
        this.#updateFlameChartDimmerWithEvents(this.#treeRowClickDimmer, e.data.events);
        return;
      }
      const events = e?.data?.node?.events ?? null;
      this.#updateFlameChartDimmerWithEvents(this.#treeRowClickDimmer, events);
    });
    this.onMainEntrySelected = this.onEntrySelected.bind(this, this.mainDataProvider);
    this.onNetworkEntrySelected = this.onEntrySelected.bind(this, this.networkDataProvider);
    this.mainFlameChart.addEventListener("EntrySelected", this.onMainEntrySelected, this);
    this.networkFlameChart.addEventListener("EntrySelected", this.onNetworkEntrySelected, this);
    this.#onMainEntryInvoked = this.#onEntryInvoked.bind(this, this.mainDataProvider);
    this.#onNetworkEntryInvoked = this.#onEntryInvoked.bind(this, this.networkDataProvider);
    this.mainFlameChart.addEventListener("EntryInvoked", this.#onMainEntryInvoked, this);
    this.networkFlameChart.addEventListener("EntryInvoked", this.#onNetworkEntryInvoked, this);
    this.mainFlameChart.addEventListener("EntryHovered", (event) => {
      this.onEntryHovered(event);
      this.updateLinkSelectionAnnotationWithToEntry(this.mainDataProvider, event.data);
    }, this);
    this.networkFlameChart.addEventListener("EntryHovered", (event) => {
      this.updateLinkSelectionAnnotationWithToEntry(this.networkDataProvider, event.data);
    }, this);
    this.#overlays.addEventListener(Overlays3.Overlays.EventReferenceClick.eventName, (event) => {
      const eventRef = event;
      const fromTraceEvent = selectionFromEvent(eventRef.event);
      void this.openSelectionDetailsView(fromTraceEvent);
    });
    this.element.addEventListener(TimelineInsights2.EventRef.EventReferenceClick.eventName, (event) => {
      void this.setSelectionAndReveal(selectionFromEvent(event.event));
    });
    this.element.addEventListener("keydown", this.#keydownHandler.bind(this));
    this.element.addEventListener("pointerdown", this.#pointerDownHandler.bind(this));
    this.#boundRefreshAfterIgnoreList = this.#refreshAfterIgnoreList.bind(this);
    this.#selectedEvents = null;
    this.groupBySetting = Common15.Settings.Settings.instance().createSetting("timeline-tree-group-by", AggregatedTimelineTreeView.GroupBy.None);
    this.groupBySetting.addChangeListener(this.refreshMainFlameChart, this);
    this.refreshMainFlameChart();
    TraceBounds15.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
  }
  containingElement() {
    return this.element;
  }
  // Activates or disables dimming when setting is toggled.
  dimThirdPartiesIfRequired() {
    if (!this.#parsedTrace) {
      return;
    }
    const dim = Common15.Settings.Settings.instance().createSetting("timeline-dim-third-parties", false).get();
    const thirdPartyEvents = this.#entityMapper?.thirdPartyEvents() ?? [];
    if (dim && thirdPartyEvents.length) {
      this.#updateFlameChartDimmerWithEvents(this.#thirdPartyCheckboxDimmer, thirdPartyEvents);
    } else {
      this.#updateFlameChartDimmerWithEvents(this.#thirdPartyCheckboxDimmer, null);
    }
  }
  #registerFlameChartDimmer(opts) {
    const dimmer = {
      active: false,
      mainChartIndices: [],
      networkChartIndices: [],
      inclusive: opts.inclusive,
      outline: opts.outline
    };
    this.#flameChartDimmers.push(dimmer);
    return dimmer;
  }
  #updateFlameChartDimmerWithEvents(dimmer, events) {
    if (events) {
      dimmer.active = true;
      dimmer.mainChartIndices = events.map((event) => this.mainDataProvider.indexForEvent(event) ?? -1);
      dimmer.networkChartIndices = events.map((event) => this.networkDataProvider.indexForEvent(event) ?? -1);
    } else {
      dimmer.active = false;
      dimmer.mainChartIndices = [];
      dimmer.networkChartIndices = [];
    }
    this.#refreshDimming();
  }
  #updateFlameChartDimmerWithIndices(dimmer, mainChartIndices, networkChartIndices) {
    dimmer.active = true;
    dimmer.mainChartIndices = mainChartIndices;
    dimmer.networkChartIndices = networkChartIndices;
    this.#refreshDimming();
  }
  #refreshDimming() {
    const dimmer = this.#flameChartDimmers.find((dimmer2) => dimmer2.active);
    this.delegate.set3PCheckboxDisabled(Boolean(dimmer && dimmer !== this.#thirdPartyCheckboxDimmer));
    if (!dimmer) {
      this.mainFlameChart.disableDimming();
      this.networkFlameChart.disableDimming();
      return;
    }
    const mainOutline = typeof dimmer.outline === "boolean" ? dimmer.outline : dimmer.outline.main;
    const networkOutline = typeof dimmer.outline === "boolean" ? dimmer.outline : dimmer.outline.network;
    this.mainFlameChart.enableDimming(dimmer.mainChartIndices, dimmer.inclusive, mainOutline);
    this.networkFlameChart.enableDimming(dimmer.networkChartIndices, dimmer.inclusive, networkOutline);
  }
  #dimInsightRelatedEvents(relatedEvents) {
    const relatedMainIndices = relatedEvents.map((event) => this.mainDataProvider.indexForEvent(event) ?? -1);
    const relatedNetworkIndices = relatedEvents.map((event) => this.networkDataProvider.indexForEvent(event) ?? -1);
    this.#activeInsightDimmer.outline = {
      main: [...relatedMainIndices],
      network: [...relatedNetworkIndices]
    };
    for (const overlay of this.#currentInsightOverlays) {
      let bounds;
      if (overlay.type === "TIMESPAN_BREAKDOWN") {
        const firstSection = overlay.sections.at(0);
        const lastSection = overlay.sections.at(-1);
        if (firstSection && lastSection) {
          bounds = Trace32.Helpers.Timing.traceWindowFromMicroSeconds(firstSection.bounds.min, lastSection.bounds.max);
        }
      } else if (overlay.type === "TIME_RANGE") {
        bounds = overlay.bounds;
      }
      if (!bounds) {
        continue;
      }
      let provider, relevantEvents;
      const overlayEvent = Overlays3.Overlays.entriesForOverlay(overlay).at(0);
      if (overlayEvent) {
        if (this.mainDataProvider.indexForEvent(overlayEvent) !== null) {
          provider = this.mainDataProvider;
          relevantEvents = relatedMainIndices;
        } else if (this.networkDataProvider.indexForEvent(overlayEvent) !== null) {
          provider = this.networkDataProvider;
          relevantEvents = relatedNetworkIndices;
        }
      } else if (overlay.type === "TIMESPAN_BREAKDOWN") {
        provider = this.mainDataProvider;
        relevantEvents = relatedMainIndices;
      }
      if (!provider || !relevantEvents) {
        continue;
      }
      relevantEvents.push(...provider.search(bounds).map((r) => r.index));
    }
    this.#updateFlameChartDimmerWithIndices(this.#activeInsightDimmer, relatedMainIndices, relatedNetworkIndices);
  }
  #sortMarkersForPreferredVisualOrder(markers) {
    markers.sort((m1, m2) => {
      const m1Index = SORT_ORDER_PAGE_LOAD_MARKERS[m1.name] ?? Infinity;
      const m2Index = SORT_ORDER_PAGE_LOAD_MARKERS[m2.name] ?? Infinity;
      return m1Index - m2Index;
    });
  }
  #amendMarkerWithFieldData() {
    const metadata = this.#parsedTrace?.metadata;
    const insights = this.#parsedTrace?.insights;
    if (!metadata?.cruxFieldData || !insights) {
      return;
    }
    const fieldMetricResultsByNavigationId = /* @__PURE__ */ new Map();
    for (const insightSet of insights.values()) {
      if (insightSet.navigation?.args.data?.navigationId) {
        fieldMetricResultsByNavigationId.set(insightSet.navigation.args.data.navigationId, Trace32.Insights.Common.getFieldMetricsForInsightSet(insightSet, metadata, CrUXManager5.CrUXManager.instance().getSelectedScope()));
      }
    }
    for (const marker of this.#markers) {
      for (const event of marker.entries) {
        const navigationId = event.args?.data?.navigationId;
        if (!navigationId) {
          continue;
        }
        const fieldMetricResults = fieldMetricResultsByNavigationId.get(navigationId);
        if (!fieldMetricResults) {
          continue;
        }
        let fieldMetricResult;
        if (event.name === "firstContentfulPaint") {
          fieldMetricResult = fieldMetricResults.fcp;
        } else if (event.name === "largestContentfulPaint::Candidate") {
          fieldMetricResult = fieldMetricResults.lcp;
        }
        if (!fieldMetricResult) {
          continue;
        }
        marker.entryToFieldResult.set(event, fieldMetricResult);
      }
    }
  }
  setMarkers(parsedTrace) {
    if (!parsedTrace) {
      return;
    }
    this.bulkRemoveOverlays(this.#markers);
    const markerEvents = parsedTrace.data.PageLoadMetrics.allMarkerEvents;
    const markers = markerEvents.filter(
      (event) => event.name === "navigationStart" || event.name === "largestContentfulPaint::Candidate" || event.name === "firstContentfulPaint" || event.name === "MarkDOMContent" || event.name === "MarkLoad"
      /* Trace.Types.Events.Name.MARK_LOAD */
    );
    this.#sortMarkersForPreferredVisualOrder(markers);
    const overlayByTs = /* @__PURE__ */ new Map();
    markers.forEach((marker) => {
      const adjustedTimestamp = Trace32.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(marker, parsedTrace.data.Meta.traceBounds, parsedTrace.data.Meta.navigationsByNavigationId, parsedTrace.data.Meta.navigationsByFrameId);
      let matchingOverlay = false;
      for (const [ts, overlay] of overlayByTs.entries()) {
        if (Math.abs(marker.ts - ts) <= TIMESTAMP_THRESHOLD_MS) {
          overlay.entries.push(marker);
          matchingOverlay = true;
          break;
        }
      }
      if (!matchingOverlay) {
        const overlay = {
          type: "TIMINGS_MARKER",
          entries: [marker],
          entryToFieldResult: /* @__PURE__ */ new Map(),
          adjustedTimestamp
        };
        overlayByTs.set(marker.ts, overlay);
      }
    });
    const markerOverlays = [...overlayByTs.values()];
    this.#markers = markerOverlays;
    if (this.#markers.length === 0) {
      return;
    }
    this.#amendMarkerWithFieldData();
    this.bulkAddOverlays(this.#markers);
  }
  setOverlays(overlays, options) {
    this.bulkRemoveOverlays(this.#currentInsightOverlays);
    this.#currentInsightOverlays = overlays;
    if (this.#currentInsightOverlays.length === 0) {
      return;
    }
    const traceBounds = TraceBounds15.TraceBounds.BoundsManager.instance().state()?.micro.entireTraceBounds;
    if (!traceBounds) {
      return;
    }
    this.bulkAddOverlays(this.#currentInsightOverlays);
    const entries = [];
    for (const overlay of this.#currentInsightOverlays) {
      entries.push(...Overlays3.Overlays.entriesForOverlay(overlay));
    }
    let relatedEventsList = this.#activeInsight?.model.relatedEvents;
    if (!relatedEventsList) {
      relatedEventsList = [];
    } else if (relatedEventsList instanceof Map) {
      relatedEventsList = Array.from(relatedEventsList.keys());
    }
    this.#dimInsightRelatedEvents([...entries, ...relatedEventsList]);
    if (options.updateTraceWindow) {
      for (const entry of entries) {
        this.#expandEntryTrack(entry);
      }
      const overlaysBounds = Overlays3.Overlays.traceWindowContainingOverlays(this.#currentInsightOverlays);
      if (overlaysBounds) {
        const percentage = options.updateTraceWindowPercentage ?? 50;
        const expandedBounds = Trace32.Helpers.Timing.expandWindowByPercentOrToOneMillisecond(overlaysBounds, traceBounds, percentage);
        TraceBounds15.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(expandedBounds, { ignoreMiniMapBounds: true, shouldAnimate: true });
      }
    }
    if (entries.length !== 0) {
      const earliestEntry = entries.reduce((earliest, current) => earliest.ts < current.ts ? earliest : current, entries[0]);
      this.revealEventVertically(earliestEntry);
    }
  }
  hoverAnnotationInSidebar(annotation) {
    const overlay = ModificationsManager.activeManager()?.getOverlaybyAnnotation(annotation);
    if (overlay?.type === "ENTRY_LABEL") {
      this.#overlays.highlightOverlay(overlay);
    }
  }
  sidebarAnnotationHoverOut() {
    this.#overlays.undimAllEntryLabels();
  }
  revealAnnotation(annotation) {
    const traceBounds = TraceBounds15.TraceBounds.BoundsManager.instance().state()?.micro.entireTraceBounds;
    if (!traceBounds) {
      return;
    }
    const annotationWindow = getAnnotationWindow(annotation);
    if (!annotationWindow) {
      return;
    }
    const annotationEntries = getAnnotationEntries(annotation);
    for (const entry of annotationEntries) {
      this.#expandEntryTrack(entry);
    }
    const firstEntry = annotationEntries.at(0);
    if (firstEntry) {
      this.revealEventVertically(firstEntry);
    }
    const expandedBounds = Trace32.Helpers.Timing.expandWindowByPercentOrToOneMillisecond(annotationWindow, traceBounds, 100);
    TraceBounds15.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(expandedBounds, { ignoreMiniMapBounds: true, shouldAnimate: true });
  }
  setActiveInsight(insight) {
    this.#activeInsight = insight;
    this.bulkRemoveOverlays(this.#currentInsightOverlays);
    if (!this.#activeInsight) {
      this.#updateFlameChartDimmerWithEvents(this.#activeInsightDimmer, null);
    }
  }
  /**
   * Expands the track / group that the given entry is in.
   */
  #expandEntryTrack(entry) {
    const chartName = Overlays3.Overlays.chartForEntry(entry);
    const provider = chartName === "main" ? this.mainDataProvider : this.networkDataProvider;
    const entryChart = chartName === "main" ? this.mainFlameChart : this.networkFlameChart;
    const entryIndex = provider.indexForEvent?.(entry) ?? null;
    if (entryIndex === null) {
      return;
    }
    const group = provider.groupForEvent?.(entryIndex) ?? null;
    if (!group) {
      return;
    }
    const groupIndex = provider.timelineData().groups.indexOf(group);
    if (!group.expanded && groupIndex > -1) {
      entryChart.toggleGroupExpand(groupIndex);
    }
  }
  addTimestampMarkerOverlay(timestamp) {
    this.addOverlay({
      type: "TIMESTAMP_MARKER",
      timestamp
    });
  }
  async removeTimestampMarkerOverlay() {
    const removedCount = this.#overlays.removeOverlaysOfType("TIMESTAMP_MARKER");
    if (removedCount > 0) {
      await this.#overlays.update();
    }
  }
  async #processFlameChartMouseMoveEvent(data) {
    const { mouseEvent, timeInMicroSeconds } = data;
    if (!mouseEvent.shiftKey) {
      await this.removeTimestampMarkerOverlay();
    }
    if (!mouseEvent.metaKey && mouseEvent.shiftKey) {
      this.addTimestampMarkerOverlay(timeInMicroSeconds);
    }
  }
  #pointerDownHandler(event) {
    if (event.buttons === 2 && this.#linkSelectionAnnotation) {
      this.#clearLinkSelectionAnnotation(true);
      event.stopPropagation();
    }
  }
  #clearLinkSelectionAnnotation(deleteCurrentLink) {
    if (this.#linkSelectionAnnotation === null) {
      return;
    }
    if (deleteCurrentLink || this.#linkSelectionAnnotation.state !== "connected") {
      ModificationsManager.activeManager()?.removeAnnotation(this.#linkSelectionAnnotation);
    }
    this.mainFlameChart.setLinkSelectionAnnotationIsInProgress(false);
    this.networkFlameChart.setLinkSelectionAnnotationIsInProgress(false);
    this.#linkSelectionAnnotation = null;
  }
  #setLinkSelectionAnnotation(linkSelectionAnnotation) {
    this.mainFlameChart.setLinkSelectionAnnotationIsInProgress(true);
    this.networkFlameChart.setLinkSelectionAnnotationIsInProgress(true);
    this.#linkSelectionAnnotation = linkSelectionAnnotation;
  }
  #createNewTimeRangeFromKeyboard(startTime, endTime) {
    if (this.#timeRangeSelectionAnnotation) {
      return;
    }
    this.#timeRangeSelectionAnnotation = {
      bounds: Trace32.Helpers.Timing.traceWindowFromMicroSeconds(startTime, endTime),
      type: "TIME_RANGE",
      label: ""
    };
    ModificationsManager.activeManager()?.createAnnotation(this.#timeRangeSelectionAnnotation, { muteAriaNotifications: false, loadedFromFile: false });
  }
  /**
   * Handles key presses that could impact the creation of a time range overlay with the keyboard.
   * @returns `true` if the event should not be propagated + have its default behaviour stopped.
   */
  #handleTimeRangeKeyboardCreation(event) {
    const visibleWindow = TraceBounds15.TraceBounds.BoundsManager.instance().state()?.micro.timelineTraceWindow;
    if (!visibleWindow) {
      return false;
    }
    const timeRangeIncrementValue = visibleWindow.range * 0.02;
    switch (event.key) {
      // ArrowLeft + ArrowRight adjusts the right hand bound (the max) of the time range
      // alt/option + ArrowRight also starts a range if there isn't one already
      case "ArrowRight": {
        if (!this.#timeRangeSelectionAnnotation) {
          if (event.altKey) {
            let startTime = visibleWindow.min;
            if (this.#currentSelection) {
              startTime = rangeForSelection(this.#currentSelection).min;
            }
            this.#createNewTimeRangeFromKeyboard(startTime, Trace32.Types.Timing.Micro(startTime + timeRangeIncrementValue));
            return true;
          }
          return false;
        }
        this.#timeRangeSelectionAnnotation.bounds.max = Trace32.Types.Timing.Micro(Math.min(this.#timeRangeSelectionAnnotation.bounds.max + timeRangeIncrementValue, visibleWindow.max));
        this.#timeRangeSelectionAnnotation.bounds.range = Trace32.Types.Timing.Micro(this.#timeRangeSelectionAnnotation.bounds.max - this.#timeRangeSelectionAnnotation.bounds.min);
        ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
        return true;
      }
      case "ArrowLeft": {
        if (!this.#timeRangeSelectionAnnotation) {
          return false;
        }
        this.#timeRangeSelectionAnnotation.bounds.max = Trace32.Types.Timing.Micro(
          // Shrink the RHS of the range, but make sure it cannot go below the min value.
          Math.max(this.#timeRangeSelectionAnnotation.bounds.max - timeRangeIncrementValue, this.#timeRangeSelectionAnnotation.bounds.min + 1)
        );
        this.#timeRangeSelectionAnnotation.bounds.range = Trace32.Types.Timing.Micro(this.#timeRangeSelectionAnnotation.bounds.max - this.#timeRangeSelectionAnnotation.bounds.min);
        ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
        return true;
      }
      // ArrowDown + ArrowUp adjusts the left hand bound (the min) of the time range
      case "ArrowUp": {
        if (!this.#timeRangeSelectionAnnotation) {
          return false;
        }
        this.#timeRangeSelectionAnnotation.bounds.min = Trace32.Types.Timing.Micro(
          // Increase the LHS of the range, but make sure it cannot go above the max value.
          Math.min(this.#timeRangeSelectionAnnotation.bounds.min + timeRangeIncrementValue, this.#timeRangeSelectionAnnotation.bounds.max - 1)
        );
        this.#timeRangeSelectionAnnotation.bounds.range = Trace32.Types.Timing.Micro(this.#timeRangeSelectionAnnotation.bounds.max - this.#timeRangeSelectionAnnotation.bounds.min);
        ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
        return true;
      }
      case "ArrowDown": {
        if (!this.#timeRangeSelectionAnnotation) {
          return false;
        }
        this.#timeRangeSelectionAnnotation.bounds.min = Trace32.Types.Timing.Micro(
          // Decrease the LHS, but make sure it cannot go beyond the minimum visible window.
          Math.max(this.#timeRangeSelectionAnnotation.bounds.min - timeRangeIncrementValue, visibleWindow.min)
        );
        this.#timeRangeSelectionAnnotation.bounds.range = Trace32.Types.Timing.Micro(this.#timeRangeSelectionAnnotation.bounds.max - this.#timeRangeSelectionAnnotation.bounds.min);
        ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
        return true;
      }
      default: {
        this.#timeRangeSelectionAnnotation = null;
        return false;
      }
    }
  }
  #keydownHandler(event) {
    const keyCombo = "fixme";
    if (this.#linkSelectionAnnotation && this.#linkSelectionAnnotation.state === "creation_not_started") {
      this.#clearLinkSelectionAnnotation(true);
      event.stopPropagation();
    }
    if (event.key === "Escape" && this.#linkSelectionAnnotation) {
      this.#clearLinkSelectionAnnotation(true);
      event.stopPropagation();
      event.preventDefault();
    }
    const eventHandledByKeyboardTimeRange = this.#handleTimeRangeKeyboardCreation(event);
    if (eventHandledByKeyboardTimeRange) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === keyCombo[this.#gameKeyMatches]) {
      this.#gameKeyMatches++;
      clearTimeout(this.#gameTimeout);
      this.#gameTimeout = setTimeout(() => {
        this.#gameKeyMatches = 0;
      }, 2e3);
    } else {
      this.#gameKeyMatches = 0;
      clearTimeout(this.#gameTimeout);
    }
    if (this.#gameKeyMatches !== keyCombo.length) {
      return;
    }
    this.runBrickBreakerGame();
  }
  forceAnimationsForTest() {
    this.#checkReducedMotion = false;
  }
  runBrickBreakerGame() {
    if (!SHOULD_SHOW_EASTER_EGG) {
      return;
    }
    if ([...this.element.childNodes].find((child) => child instanceof PerfUI16.BrickBreaker.BrickBreaker)) {
      return;
    }
    this.brickGame = new PerfUI16.BrickBreaker.BrickBreaker(this.mainFlameChart);
    this.brickGame.classList.add("brick-game");
    this.element.append(this.brickGame);
  }
  #onTraceBoundsChange(event) {
    if (event.updateType === "MINIMAP_BOUNDS") {
      return;
    }
    const visibleWindow = event.state.milli.timelineTraceWindow;
    const userHasReducedMotionSet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldAnimate = Boolean(event.options.shouldAnimate) && (this.#checkReducedMotion ? !userHasReducedMotionSet : true);
    this.mainFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max, shouldAnimate);
    this.networkDataProvider.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max, shouldAnimate);
    const debouncedUpdate = Common15.Debouncer.debounce(() => {
      this.updateSearchResults(false, false);
    }, 100);
    debouncedUpdate();
  }
  getLinkSelectionAnnotation() {
    return this.#linkSelectionAnnotation;
  }
  getMainDataProvider() {
    return this.mainDataProvider;
  }
  getNetworkDataProvider() {
    return this.networkDataProvider;
  }
  refreshMainFlameChart() {
    this.mainFlameChart.update();
  }
  windowChanged(windowStartTime, windowEndTime, animate) {
    TraceBounds15.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(Trace32.Helpers.Timing.traceWindowFromMilliSeconds(Trace32.Types.Timing.Milli(windowStartTime), Trace32.Types.Timing.Milli(windowEndTime)), { shouldAnimate: animate });
  }
  /**
   * @param startTime the start time of the selection in MilliSeconds
   * @param endTime the end time of the selection in MilliSeconds
   * TODO(crbug.com/346312365): update the type definitions in ChartViewport.ts
   */
  updateRangeSelection(startTime, endTime) {
    this.delegate.select(selectionFromRangeMilliSeconds(Trace32.Types.Timing.Milli(startTime), Trace32.Types.Timing.Milli(endTime)));
    const bounds = Trace32.Helpers.Timing.traceWindowFromMilliSeconds(Trace32.Types.Timing.Milli(startTime), Trace32.Types.Timing.Milli(endTime));
    if (this.#timeRangeSelectionAnnotation) {
      this.#timeRangeSelectionAnnotation.bounds = bounds;
      ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
    } else {
      this.#timeRangeSelectionAnnotation = {
        type: "TIME_RANGE",
        label: "",
        bounds
      };
      ModificationsManager.activeManager()?.deleteEmptyRangeAnnotations();
      ModificationsManager.activeManager()?.createAnnotation(this.#timeRangeSelectionAnnotation, { muteAriaNotifications: false, loadedFromFile: false });
    }
  }
  getMainFlameChart() {
    return this.mainFlameChart;
  }
  // This function is public for test purpose.
  getNetworkFlameChart() {
    return this.networkFlameChart;
  }
  updateSelectedGroup(flameChart, group) {
    if (flameChart !== this.mainFlameChart || this.#selectedGroupName === group?.name) {
      return;
    }
    this.#selectedGroupName = group?.name || null;
    this.#selectedEvents = group ? this.mainDataProvider.groupTreeEvents(group) : null;
    this.#updateDetailViews();
  }
  setModel(newParsedTrace, eventToRelatedInsightsMap) {
    if (newParsedTrace === this.#parsedTrace) {
      return;
    }
    this.#parsedTrace = newParsedTrace;
    this.#eventToRelatedInsightsMap = eventToRelatedInsightsMap;
    for (const dimmer of this.#flameChartDimmers) {
      dimmer.active = false;
      dimmer.mainChartIndices = [];
      dimmer.networkChartIndices = [];
    }
    this.rebuildDataForTrace({ updateType: "NEW_TRACE" });
  }
  /**
   * Resets the state of the UI data and initializes it again with the
   * current parsed trace.
   * @param opts.updateType determines if we are redrawing because we need to show a new trace,
   * or redraw an existing trace (if the user changed a setting).
   * This distinction is needed because in the latter case we do not want to
   * trigger some code such as Aria announcements for annotations if we are
   * just redrawing.
   */
  rebuildDataForTrace(opts) {
    if (!this.#parsedTrace) {
      return;
    }
    this.#selectedGroupName = null;
    Common15.EventTarget.removeEventListeners(this.eventListeners);
    this.#selectedEvents = null;
    this.#entityMapper = new Trace32.EntityMapper.EntityMapper(this.#parsedTrace);
    this.mainDataProvider.setModel(this.#parsedTrace, this.#entityMapper);
    this.networkDataProvider.setModel(this.#parsedTrace, this.#entityMapper);
    this.reset();
    const mainChartConfig = this.#mainPersistedGroupConfigSetting.get();
    if (mainChartConfig) {
      this.mainFlameChart.setPersistedConfig(mainChartConfig);
    }
    const networkChartConfig = this.#networkPersistedGroupConfigSetting.get();
    if (networkChartConfig) {
      this.networkFlameChart.setPersistedConfig(networkChartConfig);
    }
    this.setupWindowTimes();
    this.updateSearchResults(false, false);
    this.#updateFlameCharts();
    this.resizeToPreferredHeights();
    this.setMarkers(this.#parsedTrace);
    this.dimThirdPartiesIfRequired();
    ModificationsManager.activeManager()?.applyAnnotationsFromCache({ muteAriaNotifications: opts.updateType === "REDRAW_EXISTING_TRACE" });
  }
  /**
   * Gets the persisted config (if the user has made any visual changes) in
   * order to save it to disk as part of the trace.
   */
  getPersistedConfigMetadata() {
    const main = this.#mainPersistedGroupConfigSetting.get();
    const network = this.#networkPersistedGroupConfigSetting.get();
    return { main, network };
  }
  reset() {
    if (this.networkDataProvider.isEmpty()) {
      this.mainFlameChart.enableRuler(true);
      this.networkSplitWidget.hideSidebar();
    } else {
      this.mainFlameChart.enableRuler(false);
      this.networkSplitWidget.showBoth();
      this.resizeToPreferredHeights();
    }
    this.#overlays.reset();
    this.mainFlameChart.reset();
    this.networkFlameChart.reset();
    this.updateSearchResults(false, false);
  }
  // TODO(paulirish): It's possible this is being called more than necessary. Attempt to clean up the lifecycle.
  setupWindowTimes() {
    const traceBoundsState = TraceBounds15.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      throw new Error("TimelineFlameChartView could not set the window bounds.");
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    this.mainFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkDataProvider.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max);
  }
  #refreshAfterIgnoreList() {
    this.mainDataProvider.timelineData(true);
    this.mainFlameChart.scheduleUpdate();
  }
  #updateDetailViews() {
    this.countersView.setModel(this.#parsedTrace, this.#selectedEvents);
    void this.detailsView.setModel({
      parsedTrace: this.#parsedTrace,
      selectedEvents: this.#selectedEvents,
      eventToRelatedInsightsMap: this.#eventToRelatedInsightsMap,
      entityMapper: this.#entityMapper
    });
  }
  #updateFlameCharts() {
    this.mainFlameChart.scheduleUpdate();
    this.networkFlameChart.scheduleUpdate();
    this.#registerLoggableGroups();
  }
  hasHiddenTracks() {
    const groups = [
      ...this.mainFlameChart.timelineData()?.groups ?? [],
      ...this.networkFlameChart.timelineData()?.groups ?? []
    ];
    return groups.some((g) => g.hidden);
  }
  #registerLoggableGroups() {
    const groups = [
      ...this.mainFlameChart.timelineData()?.groups ?? [],
      ...this.networkFlameChart.timelineData()?.groups ?? []
    ];
    for (const group of groups) {
      if (!group.jslogContext) {
        continue;
      }
      const loggable = this.#loggableForGroupByLogContext.get(group.jslogContext) ?? Symbol(group.jslogContext);
      if (!this.#loggableForGroupByLogContext.has(group.jslogContext)) {
        this.#loggableForGroupByLogContext.set(group.jslogContext, loggable);
        VisualLogging10.registerLoggable(loggable, `${VisualLogging10.section().context(`timeline.${group.jslogContext}`)}`, this.delegate.element, new DOMRect(0, 0, 200, 100));
      }
    }
  }
  // If an entry is hovered over and a creation of link annotation is in progress, update that annotation with a hovered entry.
  updateLinkSelectionAnnotationWithToEntry(dataProvider, entryIndex) {
    if (!this.#linkSelectionAnnotation || this.#linkSelectionAnnotation.state === "creation_not_started") {
      return;
    }
    const toSelectionObject = this.#selectionIfTraceEvent(entryIndex, dataProvider);
    if (toSelectionObject) {
      if (toSelectionObject === this.#linkSelectionAnnotation.entryFrom) {
        return;
      }
      const linkBetweenEntriesExists = ModificationsManager.activeManager()?.linkAnnotationBetweenEntriesExists(this.#linkSelectionAnnotation.entryFrom, toSelectionObject);
      if (linkBetweenEntriesExists) {
        return;
      }
      this.#linkSelectionAnnotation.state = "connected";
      this.#linkSelectionAnnotation.entryTo = toSelectionObject;
    } else {
      this.#linkSelectionAnnotation.state = "pending_to_event";
      delete this.#linkSelectionAnnotation["entryTo"];
    }
    ModificationsManager.activeManager()?.updateAnnotation(this.#linkSelectionAnnotation);
  }
  onEntryHovered(commonEvent) {
    SDK14.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    const entryIndex = commonEvent.data;
    const event = this.mainDataProvider.eventByIndex(entryIndex);
    if (!event || !this.#parsedTrace) {
      return;
    }
    if (Trace32.Types.Events.isLegacyTimelineFrame(event)) {
      return;
    }
    const target = targetForEvent(this.#parsedTrace, event);
    if (!target) {
      return;
    }
    const nodeIds = Utils7.EntryNodes.nodeIdsForEvent(this.#parsedTrace, event);
    for (const nodeId of nodeIds) {
      new SDK14.DOMModel.DeferredDOMNode(target, nodeId).highlight();
    }
  }
  highlightEvent(event) {
    const entryIndex = event ? this.mainDataProvider.entryIndexForSelection(selectionFromEvent(event)) : -1;
    if (entryIndex >= 0) {
      this.mainFlameChart.highlightEntry(entryIndex);
    } else {
      this.mainFlameChart.hideHighlight();
    }
  }
  willHide() {
    super.willHide();
    this.#networkPersistedGroupConfigSetting.removeChangeListener(this.resizeToPreferredHeights, this);
    Workspace3.IgnoreListManager.IgnoreListManager.instance().removeChangeListener(this.#boundRefreshAfterIgnoreList);
  }
  wasShown() {
    super.wasShown();
    this.#networkPersistedGroupConfigSetting.addChangeListener(this.resizeToPreferredHeights, this);
    Workspace3.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.#boundRefreshAfterIgnoreList);
    if (this.needsResizeToPreferredHeights) {
      this.resizeToPreferredHeights();
    }
    this.#updateFlameCharts();
  }
  updateCountersGraphToggle(showMemoryGraph) {
    if (showMemoryGraph) {
      this.chartSplitWidget.showBoth();
    } else {
      this.chartSplitWidget.hideSidebar();
    }
  }
  zoomEvent(event) {
    const traceBounds = TraceBounds15.TraceBounds.BoundsManager.instance().state()?.micro.entireTraceBounds;
    if (!traceBounds) {
      return;
    }
    this.#expandEntryTrack(event);
    this.revealEventVertically(event);
    const entryWindow = Trace32.Helpers.Timing.traceWindowFromMicroSeconds(event.ts, Trace32.Types.Timing.Micro(event.ts + (event.dur ?? 0)));
    const expandedBounds = Trace32.Helpers.Timing.expandWindowByPercentOrToOneMillisecond(entryWindow, traceBounds, 100);
    TraceBounds15.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(expandedBounds, { ignoreMiniMapBounds: true, shouldAnimate: true });
  }
  revealEvent(event) {
    const mainIndex = this.mainDataProvider.indexForEvent(event);
    const networkIndex = this.networkDataProvider.indexForEvent(event);
    if (mainIndex !== null) {
      this.mainFlameChart.revealEntry(mainIndex);
    } else if (networkIndex !== null) {
      this.networkFlameChart.revealEntry(networkIndex);
    }
  }
  // Given an event, it reveals its position vertically
  revealEventVertically(event) {
    const mainIndex = this.mainDataProvider.indexForEvent(event);
    const networkIndex = this.networkDataProvider.indexForEvent(event);
    if (mainIndex !== null) {
      this.mainFlameChart.revealEntryVertically(mainIndex);
    } else if (networkIndex !== null) {
      this.networkFlameChart.revealEntryVertically(networkIndex);
    }
  }
  async setSelectionAndReveal(selection) {
    if (selection && this.#currentSelection && selectionsEqual(selection, this.#currentSelection)) {
      return;
    }
    this.#currentSelection = selection;
    this.#overlays.removeOverlaysOfType("ENTRY_SELECTED");
    if ((selection === null || !selectionIsRange(selection)) && this.#timeRangeSelectionAnnotation && !this.#timeRangeSelectionAnnotation.label) {
      ModificationsManager.activeManager()?.removeAnnotation(this.#timeRangeSelectionAnnotation);
      this.#timeRangeSelectionAnnotation = null;
    }
    if (selection === null) {
      this.#updateFlameChartDimmerWithEvents(this.#treeRowClickDimmer, null);
    }
    const mainIndex = this.mainDataProvider.entryIndexForSelection(selection);
    this.mainDataProvider.buildFlowForInitiator(mainIndex);
    this.mainFlameChart.setSelectedEntry(mainIndex);
    const networkIndex = this.networkDataProvider.entryIndexForSelection(selection);
    this.networkDataProvider.buildFlowForInitiator(networkIndex);
    this.networkFlameChart.setSelectedEntry(networkIndex);
    if (this.detailsView) {
      await this.detailsView.setSelection(selection);
    }
    if (selectionIsEvent(selection)) {
      this.addOverlay({
        type: "ENTRY_SELECTED",
        entry: selection.event
      });
    }
    if (this.#linkSelectionAnnotation && this.#linkSelectionAnnotation.state === "creation_not_started") {
      this.#clearLinkSelectionAnnotation(true);
    }
    requestAnimationFrame(() => {
      if (!this.#parsedTrace) {
        return;
      }
      const event = selectionIsEvent(selection) ? selection.event : null;
      let focus = UI18.Context.Context.instance().flavor(AIAssistance.AIContext.AgentFocus);
      if (focus) {
        focus = focus.withEvent(event);
      } else if (event) {
        focus = AIAssistance.AIContext.AgentFocus.fromEvent(this.#parsedTrace, event);
      } else {
        focus = null;
      }
      UI18.Context.Context.instance().setFlavor(AIAssistance.AIContext.AgentFocus, focus);
    });
  }
  // Only opens the details view of a selection. This is used for Timing Markers. Timing markers replace
  // their entry with a new UI. Because of that, their entries can no longer be "selected" in the timings track,
  // so if clicked, we only open their details view.
  async openSelectionDetailsView(selection) {
    if (this.detailsView) {
      await this.detailsView.setSelection(selection);
    }
  }
  /**
   * Used to create multiple overlays at once without triggering a redraw for each one.
   */
  bulkAddOverlays(overlays) {
    for (const overlay of overlays) {
      this.#overlays.add(overlay);
    }
    void this.#overlays.update();
  }
  addOverlay(newOverlay) {
    const overlay = this.#overlays.add(newOverlay);
    void this.#overlays.update();
    return overlay;
  }
  bulkRemoveOverlays(overlays) {
    if (!overlays.length) {
      return;
    }
    for (const overlay of overlays) {
      this.#overlays.remove(overlay);
    }
    void this.#overlays.update();
  }
  removeOverlay(removedOverlay) {
    this.#overlays.remove(removedOverlay);
    void this.#overlays.update();
  }
  updateExistingOverlay(existingOverlay, newData) {
    this.#overlays.updateExisting(existingOverlay, newData);
    void this.#overlays.update();
  }
  enterLabelEditMode(overlay) {
    this.#overlays.enterLabelEditMode(overlay);
  }
  bringLabelForward(overlay) {
    this.#overlays.bringLabelForward(overlay);
  }
  enterMainChartTrackConfigurationMode() {
    this.mainFlameChart.enterTrackConfigurationMode();
  }
  showAllMainChartTracks() {
    this.mainFlameChart.showAllGroups();
  }
  async onAddEntryLabelAnnotation(dataProvider, event) {
    const selection = dataProvider.createSelection(event.data.entryIndex);
    if (selectionIsEvent(selection)) {
      await this.setSelectionAndReveal(selection);
      ModificationsManager.activeManager()?.createAnnotation({
        type: "ENTRY_LABEL",
        entry: selection.event,
        label: ""
      }, { loadedFromFile: false, muteAriaNotifications: false });
      if (event.data.withLinkCreationButton) {
        this.onEntriesLinkAnnotationCreate(dataProvider, event.data.entryIndex, true);
      }
    }
  }
  onEntriesLinkAnnotationCreate(dataProvider, entryFromIndex, linkCreateButton) {
    const fromSelectionObject = entryFromIndex ? this.#selectionIfTraceEvent(entryFromIndex, dataProvider) : null;
    if (fromSelectionObject) {
      this.#setLinkSelectionAnnotation({
        type: "ENTRIES_LINK",
        entryFrom: fromSelectionObject,
        state: linkCreateButton ? "creation_not_started" : "pending_to_event"
      });
      if (this.#linkSelectionAnnotation) {
        ModificationsManager.activeManager()?.createAnnotation(this.#linkSelectionAnnotation, { loadedFromFile: false, muteAriaNotifications: false });
      }
    }
  }
  #selectionIfTraceEvent(index, dataProvider) {
    const selection = dataProvider.createSelection(index);
    return selectionIsEvent(selection) ? selection.event : null;
  }
  /**
   * Called when the user either:
   * 1. clicks with their mouse on an entry
   * 2. Uses the keyboard and presses "enter" whilst an entry is selected
   */
  #onEntryInvoked(dataProvider, event) {
    const selectedEvent = dataProvider.eventByIndex(event.data);
    if (this.#parsedTrace && selectedEvent) {
      const handledByFloaty = UI18.Floaty.onFloatyClick({
        type: "PERFORMANCE_EVENT",
        data: { event: selectedEvent, traceStartTime: this.#parsedTrace.data.Meta.traceBounds.min }
      });
      if (handledByFloaty) {
        return;
      }
    }
    this.#updateSelectedEntryStatus(dataProvider, event);
    const entryIndex = event.data;
    if (this.#linkSelectionAnnotation) {
      this.handleToEntryOfLinkBetweenEntriesSelection(entryIndex);
    }
  }
  #updateSelectedEntryStatus(dataProvider, event) {
    const data = dataProvider.timelineData();
    if (!data) {
      return;
    }
    const entryIndex = event.data;
    const entryLevel = data.entryLevels[entryIndex];
    const group = groupForLevel(data.groups, entryLevel);
    if (group?.jslogContext) {
      const loggable = this.#loggableForGroupByLogContext.get(group.jslogContext) ?? null;
      if (loggable) {
        VisualLogging10.logClick(loggable, new MouseEvent("click"));
      }
    }
    this.delegate.select(dataProvider.createSelection(entryIndex));
    const traceEventForSelection = dataProvider.eventByIndex(entryIndex);
    if (traceEventForSelection) {
      ModificationsManager.activeManager()?.bringEntryLabelForwardIfExists(traceEventForSelection);
    }
  }
  /**
   * This is invoked when the user uses their KEYBOARD ONLY to navigate between
   * events.
   * It IS NOT called when the user uses the mouse. See `onEntryInvoked`.
   */
  onEntrySelected(dataProvider, event) {
    this.#updateSelectedEntryStatus(dataProvider, event);
    const entryIndex = event.data;
    const toSelectionObject = this.#selectionIfTraceEvent(entryIndex, dataProvider);
    if (toSelectionObject && toSelectionObject !== this.#linkSelectionAnnotation?.entryTo) {
      this.updateLinkSelectionAnnotationWithToEntry(dataProvider, entryIndex);
    }
  }
  handleToEntryOfLinkBetweenEntriesSelection(toIndex) {
    if (this.#linkSelectionAnnotation && toIndex === -1) {
      ModificationsManager.activeManager()?.removeAnnotation(this.#linkSelectionAnnotation);
    } else if (this.#linkSelectionAnnotation && this.#linkSelectionAnnotation?.entryTo && this.#linkSelectionAnnotation?.entryFrom.ts > this.#linkSelectionAnnotation?.entryTo.ts) {
      const entryFrom = this.#linkSelectionAnnotation.entryFrom;
      const entryTo = this.#linkSelectionAnnotation.entryTo;
      this.#linkSelectionAnnotation.entryTo = entryFrom;
      this.#linkSelectionAnnotation.entryFrom = entryTo;
      ModificationsManager.activeManager()?.updateAnnotation(this.#linkSelectionAnnotation);
    }
    this.#clearLinkSelectionAnnotation(false);
  }
  resizeToPreferredHeights() {
    if (!this.isShowing()) {
      this.needsResizeToPreferredHeights = true;
      return;
    }
    this.needsResizeToPreferredHeights = false;
    this.networkPane.element.classList.toggle("timeline-network-resizer-disabled", !this.networkDataProvider.isExpanded());
    this.networkSplitWidget.setSidebarSize(this.networkDataProvider.preferredHeight() + this.splitResizer.clientHeight + PerfUI16.FlameChart.RulerHeight + 2);
  }
  setSearchableView(searchableView) {
    this.searchableView = searchableView;
  }
  // UI.SearchableView.Searchable implementation
  jumpToNextSearchResult() {
    if (!this.searchResults?.length) {
      return;
    }
    const index = typeof this.selectedSearchResult !== "undefined" ? this.searchResults.indexOf(this.selectedSearchResult) : -1;
    this.#selectSearchResult(Platform15.NumberUtilities.mod(index + 1, this.searchResults.length));
  }
  jumpToPreviousSearchResult() {
    if (!this.searchResults?.length) {
      return;
    }
    const index = typeof this.selectedSearchResult !== "undefined" ? this.searchResults.indexOf(this.selectedSearchResult) : 0;
    this.#selectSearchResult(Platform15.NumberUtilities.mod(index - 1, this.searchResults.length));
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return true;
  }
  supportsRegexSearch() {
    return true;
  }
  #selectSearchResult(searchResultIndex) {
    this.searchableView.updateCurrentMatchIndex(searchResultIndex);
    const matchedResult = this.searchResults?.at(searchResultIndex) ?? null;
    if (!matchedResult) {
      return;
    }
    switch (matchedResult.provider) {
      case "main": {
        this.delegate.select(this.mainDataProvider.createSelection(matchedResult.index));
        this.mainFlameChart.showPopoverForSearchResult(matchedResult.index);
        break;
      }
      case "network": {
        this.delegate.select(this.networkDataProvider.createSelection(matchedResult.index));
        this.networkFlameChart.showPopoverForSearchResult(matchedResult.index);
        break;
      }
      case "other":
        break;
      default:
        Platform15.assertNever(matchedResult.provider, `Unknown SearchResult[provider]: ${matchedResult.provider}`);
    }
    this.selectedSearchResult = matchedResult;
  }
  updateSearchResults(shouldJump, jumpBackwards) {
    const traceBoundsState = TraceBounds15.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const oldSelectedSearchResult = this.selectedSearchResult;
    delete this.selectedSearchResult;
    this.searchResults = [];
    if (!this.searchRegex) {
      return;
    }
    const regExpFilter = new TimelineRegExp(this.searchRegex);
    const visibleWindow = traceBoundsState.micro.timelineTraceWindow;
    const mainMatches = this.mainDataProvider.search(visibleWindow, regExpFilter);
    const networkMatches = this.networkDataProvider.search(visibleWindow, regExpFilter);
    this.searchResults = mainMatches.concat(networkMatches).sort((m1, m2) => {
      return m1.startTimeMilli - m2.startTimeMilli;
    });
    this.searchableView.updateSearchMatchesCount(this.searchResults.length);
    this.#updateFlameChartDimmerWithIndices(this.#searchDimmer, mainMatches.map((m) => m.index), networkMatches.map((m) => m.index));
    if (!shouldJump || !this.searchResults.length) {
      return;
    }
    let selectedIndex = this.#indexOfSearchResult(oldSelectedSearchResult);
    if (selectedIndex === -1) {
      selectedIndex = jumpBackwards ? this.searchResults.length - 1 : 0;
    }
    this.#selectSearchResult(selectedIndex);
  }
  #indexOfSearchResult(target) {
    if (!target) {
      return -1;
    }
    return this.searchResults?.findIndex((result) => {
      return result.provider === target.provider && result.index === target.index;
    }) ?? -1;
  }
  /**
   * Returns the indexes of the elements that matched the most recent
   * query. Elements are indexed by the data provider and correspond
   * to their position in the data provider entry data array.
   * Public only for tests.
   */
  getSearchResults() {
    return this.searchResults;
  }
  onSearchCanceled() {
    if (typeof this.selectedSearchResult !== "undefined") {
      this.delegate.select(null);
    }
    delete this.searchResults;
    delete this.selectedSearchResult;
    delete this.searchRegex;
    this.mainFlameChart.showPopoverForSearchResult(null);
    this.networkFlameChart.showPopoverForSearchResult(null);
    this.#updateFlameChartDimmerWithEvents(this.#searchDimmer, null);
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    this.searchRegex = searchConfig.toSearchRegex().regex;
    this.updateSearchResults(shouldJump, jumpBackwards);
  }
  togglePopover({ event, show }) {
    const entryIndex = this.mainDataProvider.indexForEvent(event);
    if (show && entryIndex) {
      this.mainFlameChart.setSelectedEntry(entryIndex);
      this.mainFlameChart.showPopoverForSearchResult(entryIndex);
    } else {
      this.mainFlameChart.hideHighlight();
    }
  }
  overlays() {
    return this.#overlays;
  }
  selectDetailsViewTab(tabName, node) {
    this.detailsView.selectTab(tabName, node);
  }
};
var Selection = class {
  timelineSelection;
  entryIndex;
  constructor(selection, entryIndex) {
    this.timelineSelection = selection;
    this.entryIndex = entryIndex;
  }
};
var FlameChartStyle = {
  textColor: "#333"
};
var TimelineFlameChartMarker = class {
  #startTime;
  startOffset;
  style;
  constructor(startTime, startOffset, style) {
    this.#startTime = startTime;
    this.startOffset = startOffset;
    this.style = style;
  }
  startTime() {
    return this.#startTime;
  }
  color() {
    return this.style.color;
  }
  title() {
    if (this.style.lowPriority) {
      return null;
    }
    const startTime = i18n52.TimeUtilities.millisToString(this.startOffset);
    return i18nString26(UIStrings26.sAtS, { PH1: this.style.title, PH2: startTime });
  }
  draw(context, x, _height, pixelsPerMillisecond) {
    const lowPriorityVisibilityThresholdInPixelsPerMs = 4;
    if (this.style.lowPriority && pixelsPerMillisecond < lowPriorityVisibilityThresholdInPixelsPerMs) {
      return;
    }
    if (!this.style.tall) {
      return;
    }
    context.save();
    context.strokeStyle = this.style.color;
    context.lineWidth = this.style.lineWidth;
    context.translate(this.style.lineWidth < 1 || this.style.lineWidth & 1 ? 0.5 : 0, 0.5);
    context.beginPath();
    context.moveTo(x, 0);
    context.setLineDash(this.style.dashStyle);
    context.lineTo(x, context.canvas.height);
    context.stroke();
    context.restore();
  }
};
function groupForLevel(groups, level) {
  const groupForLevel2 = groups.find((group, groupIndex) => {
    const nextGroup = groups.at(groupIndex + 1);
    const groupEndLevel = nextGroup ? nextGroup.startLevel - 1 : Infinity;
    return group.startLevel <= level && groupEndLevel >= level;
  });
  return groupForLevel2 ?? null;
}

// gen/front_end/panels/timeline/TimelineFlameChartDataProvider.js
import * as Utils8 from "./utils/utils.js";
var UIStrings27 = {
  /**
   * @description Text for rendering frames
   */
  frames: "Frames",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  idleFrame: "Idle frame",
  /**
   * @description Text in Timeline Frame Chart Data Provider of the Performance panel
   */
  droppedFrame: "Dropped frame",
  /**
   * @description Text in Timeline Frame Chart Data Provider of the Performance panel
   */
  partiallyPresentedFrame: "Partially-presented frame",
  /**
   * @description Text for a rendering frame
   */
  frame: "Frame",
  /**
   * @description Text for Hiding a function from the Flame Chart
   */
  hideFunction: "Hide function",
  /**
   * @description Text for Hiding all children of a function from the Flame Chart
   */
  hideChildren: "Hide children",
  /**
   * @description Text for Hiding all child entries that are identical to the selected entry from the Flame Chart
   */
  hideRepeatingChildren: "Hide repeating children",
  /**
   * @description Text for remove script from ignore list from the Flame Chart
   */
  removeScriptFromIgnoreList: "Remove script from ignore list",
  /**
   * @description Text for add script to ignore list from the Flame Chart
   */
  addScriptToIgnoreList: "Add script to ignore list",
  /**
   * @description Text for an action that shows all of the hidden children of an entry
   */
  resetChildren: "Reset children",
  /**
   * @description Text for an action that shows all of the hidden entries of the Flame Chart
   */
  resetTrace: "Reset trace",
  /**
   * @description Text of a context menu item to redirect to the AI assistance panel and to start a chat.
   */
  startAChat: "Start a chat",
  /**
   * @description Context menu item in Performance panel to label an entry.
   */
  labelEntry: "Label entry",
  /**
   * @description Context menu item in Performance panel to assess the purpose of an entry via AI.
   */
  assessThePurpose: "Assess the purpose",
  /**
   * @description Context menu item in Performance panel to identify time spent in a call tree via AI.
   */
  identifyTimeSpent: "Identify time spent",
  /**
   * @description Context menu item in Performance panel to find improvements for a call tree via AI.
   */
  findImprovements: "Find improvements"
};
var str_27 = i18n54.i18n.registerUIStrings("panels/timeline/TimelineFlameChartDataProvider.ts", UIStrings27);
var i18nString27 = i18n54.i18n.getLocalizedString.bind(void 0, str_27);
var TimelineFlameChartDataProvider = class extends Common16.ObjectWrapper.ObjectWrapper {
  droppedFramePattern;
  partialFramePattern;
  #timelineData = null;
  currentLevel = 0;
  compatibilityTracksAppender = null;
  parsedTrace = null;
  #minimumBoundary = 0;
  timeSpan = 0;
  framesGroupStyle;
  screenshotsGroupStyle;
  // Contains all the entries that are DRAWN onto the track. Entries that have
  // been hidden - either by a user action, or because they aren't visible at
  // all - will not appear in this array and it will change per-render. For
  // example, if a user collapses an icicle in the flamechart, those entries
  // that are now hidden will no longer be in this array.
  // This also includes entrys that used to be special cased (e.g.
  // TimelineFrames) that are now of type Types.Events.Event and so the old
  // `TimelineFlameChartEntry` type has been removed in faovur of using
  // Trace.Types.Events.Event directly. See crrev.com/c/5973695 for details.
  entryData = [];
  entryTypeByLevel = [];
  entryIndexToTitle = [];
  #lastInitiatorEntryIndex = -1;
  lastSelection = null;
  #font = `${PerfUI17.Font.DEFAULT_FONT_SIZE} ${PerfUI17.Font.getFontFamilyForCanvas()}`;
  #eventIndexByEvent = /* @__PURE__ */ new WeakMap();
  #entityMapper = null;
  /**
   * When we create initiator chains for a selected event, we store those
   * chains in this map so that if the user reselects the same event we do not
   * have to recalculate. This is reset when the trace changes.
   */
  #initiatorsCache = /* @__PURE__ */ new Map();
  #persistedGroupConfigSetting = null;
  constructor() {
    super();
    this.reset();
    [this.droppedFramePattern, this.partialFramePattern] = this.preparePatternCanvas();
    this.framesGroupStyle = this.buildGroupStyle({ useFirstLineForOverview: true });
    this.screenshotsGroupStyle = this.buildGroupStyle({
      useFirstLineForOverview: true,
      nestingLevel: 1,
      collapsible: 1,
      itemsHeight: 150
    });
    ThemeSupport25.ThemeSupport.instance().addEventListener(ThemeSupport25.ThemeChangeEvent.eventName, () => {
      const headers = [
        this.framesGroupStyle,
        this.screenshotsGroupStyle
      ];
      for (const header of headers) {
        header.color = ThemeSupport25.ThemeSupport.instance().getComputedValue("--sys-color-on-surface");
        header.backgroundColor = ThemeSupport25.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container");
      }
    });
    Utils8.ImageCache.emitter.addEventListener("screenshot-loaded", () => this.dispatchEventToListeners(
      "DataChanged"
      /* Events.DATA_CHANGED */
    ));
    Common16.Settings.Settings.instance().moduleSetting("skip-stack-frames-pattern").addChangeListener(this.#onIgnoreListChanged.bind(this));
    Common16.Settings.Settings.instance().moduleSetting("skip-content-scripts").addChangeListener(this.#onIgnoreListChanged.bind(this));
    Common16.Settings.Settings.instance().moduleSetting("automatically-ignore-list-known-third-party-scripts").addChangeListener(this.#onIgnoreListChanged.bind(this));
    Common16.Settings.Settings.instance().moduleSetting("enable-ignore-listing").addChangeListener(this.#onIgnoreListChanged.bind(this));
    Common16.Settings.Settings.instance().moduleSetting("skip-anonymous-scripts").addChangeListener(this.#onIgnoreListChanged.bind(this));
  }
  handleTrackConfigurationChange(groups, indexesInVisualOrder) {
    if (!this.#persistedGroupConfigSetting) {
      return;
    }
    if (!this.parsedTrace) {
      return;
    }
    const persistedDataForTrace = buildPersistedConfig(groups, indexesInVisualOrder);
    this.#persistedGroupConfigSetting.set(persistedDataForTrace);
  }
  setPersistedGroupConfigSetting(setting) {
    this.#persistedGroupConfigSetting = setting;
  }
  hasTrackConfigurationMode() {
    return true;
  }
  getPossibleActions(entryIndex, groupIndex) {
    const data = this.timelineData();
    if (!data) {
      return;
    }
    const group = data.groups.at(groupIndex);
    if (!group || !group.expanded || !group.showStackContextMenu) {
      return;
    }
    return this.findPossibleContextMenuActions(entryIndex);
  }
  customizedContextMenu(mouseEvent, entryIndex, groupIndex) {
    const entry = this.eventByIndex(entryIndex);
    if (!entry) {
      return;
    }
    const possibleActions = this.getPossibleActions(entryIndex, groupIndex);
    const PERF_AI_ACTION_ID = "drjones.performance-panel-context";
    const perfAIEntryPointEnabled = Boolean(entry && this.parsedTrace && UI19.ActionRegistry.ActionRegistry.instance().hasAction(PERF_AI_ACTION_ID));
    if (!possibleActions && !perfAIEntryPointEnabled) {
      return;
    }
    const contextMenu = new UI19.ContextMenu.ContextMenu(mouseEvent);
    if (perfAIEntryPointEnabled && this.parsedTrace) {
      const callTree = AIAssistance2.AICallTree.AICallTree.fromEvent(entry, this.parsedTrace);
      if (callTree) {
        const action2 = UI19.ActionRegistry.ActionRegistry.instance().getAction(PERF_AI_ACTION_ID);
        if (Root6.Runtime.hostConfig.devToolsAiSubmenuPrompts?.enabled) {
          let appendSubmenuPromptAction = function(submenu2, action3, label, prompt, jslogContext) {
            submenu2.defaultSection().appendItem(label, () => action3.execute({ prompt }), { disabled: !action3.enabled(), jslogContext });
          };
          const submenu = contextMenu.footerSection().appendSubMenuItem(action2.title(), false, PERF_AI_ACTION_ID, Root6.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.featureName);
          submenu.defaultSection().appendAction(PERF_AI_ACTION_ID, i18nString27(UIStrings27.startAChat));
          submenu.defaultSection().appendItem(i18nString27(UIStrings27.labelEntry), () => {
            this.dispatchEventToListeners("EntryLabelAnnotationAdded", { entryIndex, withLinkCreationButton: false });
          }, {
            jslogContext: "timeline.annotations.create-entry-label"
          });
          appendSubmenuPromptAction(submenu, action2, i18nString27(UIStrings27.assessThePurpose), "What's the purpose of this entry?", PERF_AI_ACTION_ID + ".purpose");
          appendSubmenuPromptAction(submenu, action2, i18nString27(UIStrings27.identifyTimeSpent), "Where is most time being spent in this call tree?", PERF_AI_ACTION_ID + ".time-spent");
          appendSubmenuPromptAction(submenu, action2, i18nString27(UIStrings27.findImprovements), "How can I reduce the time of this call tree?", PERF_AI_ACTION_ID + ".improvements");
        } else if (Root6.Runtime.hostConfig.devToolsAiDebugWithAi?.enabled) {
          contextMenu.footerSection().appendAction(PERF_AI_ACTION_ID, void 0, false, void 0, Root6.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.featureName);
        } else {
          contextMenu.footerSection().appendAction(PERF_AI_ACTION_ID);
        }
      }
    }
    if (!possibleActions) {
      return contextMenu;
    }
    const hideEntryOption = contextMenu.defaultSection().appendItem(i18nString27(UIStrings27.hideFunction), () => {
      this.modifyTree("MERGE_FUNCTION", entryIndex);
    }, {
      disabled: !possibleActions?.[
        "MERGE_FUNCTION"
        /* PerfUI.FlameChart.FilterAction.MERGE_FUNCTION */
      ],
      jslogContext: "hide-function"
    });
    hideEntryOption.setAccelerator(UI19.KeyboardShortcut.Keys.H, [UI19.KeyboardShortcut.Modifiers.None]);
    hideEntryOption.setIsDevToolsPerformanceMenuItem(true);
    const hideChildrenOption = contextMenu.defaultSection().appendItem(i18nString27(UIStrings27.hideChildren), () => {
      this.modifyTree("COLLAPSE_FUNCTION", entryIndex);
    }, {
      disabled: !possibleActions?.[
        "COLLAPSE_FUNCTION"
        /* PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION */
      ],
      jslogContext: "hide-children"
    });
    hideChildrenOption.setAccelerator(UI19.KeyboardShortcut.Keys.C, [UI19.KeyboardShortcut.Modifiers.None]);
    hideChildrenOption.setIsDevToolsPerformanceMenuItem(true);
    const hideRepeatingChildrenOption = contextMenu.defaultSection().appendItem(i18nString27(UIStrings27.hideRepeatingChildren), () => {
      this.modifyTree("COLLAPSE_REPEATING_DESCENDANTS", entryIndex);
    }, {
      disabled: !possibleActions?.[
        "COLLAPSE_REPEATING_DESCENDANTS"
        /* PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS */
      ],
      jslogContext: "hide-repeating-children"
    });
    hideRepeatingChildrenOption.setAccelerator(UI19.KeyboardShortcut.Keys.R, [UI19.KeyboardShortcut.Modifiers.None]);
    hideRepeatingChildrenOption.setIsDevToolsPerformanceMenuItem(true);
    const resetChildrenOption = contextMenu.defaultSection().appendItem(i18nString27(UIStrings27.resetChildren), () => {
      this.modifyTree("RESET_CHILDREN", entryIndex);
    }, {
      disabled: !possibleActions?.[
        "RESET_CHILDREN"
        /* PerfUI.FlameChart.FilterAction.RESET_CHILDREN */
      ],
      jslogContext: "reset-children"
    });
    resetChildrenOption.setAccelerator(UI19.KeyboardShortcut.Keys.U, [UI19.KeyboardShortcut.Modifiers.None]);
    resetChildrenOption.setIsDevToolsPerformanceMenuItem(true);
    contextMenu.defaultSection().appendItem(i18nString27(UIStrings27.resetTrace), () => {
      this.modifyTree("UNDO_ALL_ACTIONS", entryIndex);
    }, {
      disabled: !possibleActions?.[
        "UNDO_ALL_ACTIONS"
        /* PerfUI.FlameChart.FilterAction.UNDO_ALL_ACTIONS */
      ],
      jslogContext: "reset-trace"
    });
    if (!this.parsedTrace || Trace33.Types.Events.isLegacyTimelineFrame(entry)) {
      return contextMenu;
    }
    const url = SourceMapsResolver5.SourceMapsResolver.resolvedURLForEntry(this.parsedTrace, entry);
    if (!url) {
      return contextMenu;
    }
    if (Utils8.IgnoreList.isIgnoreListedEntry(entry)) {
      contextMenu.defaultSection().appendItem(i18nString27(UIStrings27.removeScriptFromIgnoreList), () => {
        Workspace4.IgnoreListManager.IgnoreListManager.instance().unIgnoreListURL(url);
        this.#onIgnoreListChanged();
      }, {
        jslogContext: "remove-from-ignore-list"
      });
    } else {
      contextMenu.defaultSection().appendItem(i18nString27(UIStrings27.addScriptToIgnoreList), () => {
        Workspace4.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(url);
        this.#onIgnoreListChanged();
      }, {
        jslogContext: "add-to-ignore-list"
      });
    }
    return contextMenu;
  }
  #onIgnoreListChanged() {
    this.timelineData(
      /* rebuild= */
      true
    );
    this.dispatchEventToListeners(
      "DataChanged"
      /* Events.DATA_CHANGED */
    );
  }
  modifyTree(action2, entryIndex) {
    const entry = this.entryData[entryIndex];
    ModificationsManager.activeManager()?.getEntriesFilter().applyFilterAction({ type: action2, entry });
    this.timelineData(true);
    this.buildFlowForInitiator(entryIndex);
    this.dispatchEventToListeners(
      "DataChanged"
      /* Events.DATA_CHANGED */
    );
  }
  findPossibleContextMenuActions(entryIndex) {
    const entry = this.entryData[entryIndex];
    return ModificationsManager.activeManager()?.getEntriesFilter().findPossibleActions(entry);
  }
  handleFlameChartTransformKeyboardEvent(event, entryIndex, groupIndex) {
    const possibleActions = this.getPossibleActions(entryIndex, groupIndex);
    if (!possibleActions) {
      return;
    }
    let handled = false;
    if (event.code === "KeyH" && possibleActions[
      "MERGE_FUNCTION"
      /* PerfUI.FlameChart.FilterAction.MERGE_FUNCTION */
    ]) {
      this.modifyTree("MERGE_FUNCTION", entryIndex);
      handled = true;
    } else if (event.code === "KeyC" && possibleActions[
      "COLLAPSE_FUNCTION"
      /* PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION */
    ]) {
      this.modifyTree("COLLAPSE_FUNCTION", entryIndex);
      handled = true;
    } else if (event.code === "KeyR" && possibleActions[
      "COLLAPSE_REPEATING_DESCENDANTS"
      /* PerfUI.FlameChart.FilterAction.COLLAPSE_REPEATING_DESCENDANTS */
    ]) {
      this.modifyTree("COLLAPSE_REPEATING_DESCENDANTS", entryIndex);
      handled = true;
    } else if (event.code === "KeyU") {
      this.modifyTree("RESET_CHILDREN", entryIndex);
      handled = true;
    }
    if (handled) {
      event.consume(true);
    }
  }
  buildGroupStyle(extra) {
    const defaultGroupStyle = {
      padding: 4,
      height: 17,
      collapsible: 0,
      color: ThemeSupport25.ThemeSupport.instance().getComputedValue("--sys-color-on-surface"),
      backgroundColor: ThemeSupport25.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container"),
      nestingLevel: 0,
      shareHeaderLine: true
    };
    return Object.assign(defaultGroupStyle, extra);
  }
  setModel(parsedTrace, entityMapper) {
    this.reset();
    this.parsedTrace = parsedTrace;
    const { traceBounds } = parsedTrace.data.Meta;
    const minTime = Trace33.Helpers.Timing.microToMilli(traceBounds.min);
    const maxTime = Trace33.Helpers.Timing.microToMilli(traceBounds.max);
    this.#minimumBoundary = minTime;
    this.timeSpan = minTime === maxTime ? 1e3 : maxTime - this.#minimumBoundary;
    this.#entityMapper = entityMapper;
  }
  /**
   * Instances and caches a CompatibilityTracksAppender using the
   * internal flame chart data and the trace parsed data coming from the
   * trace engine.
   * The model data must have been set to the data provider instance before
   * attempting to instance the CompatibilityTracksAppender.
   */
  compatibilityTracksAppenderInstance(forceNew = false) {
    if (!this.compatibilityTracksAppender || forceNew) {
      if (!this.parsedTrace) {
        throw new Error("Attempted to instantiate a CompatibilityTracksAppender without having set the trace parse data first.");
      }
      this.#timelineData = this.#instantiateTimelineData();
      this.compatibilityTracksAppender = new CompatibilityTracksAppender(this.#timelineData, this.parsedTrace, this.entryData, this.entryTypeByLevel, this.#entityMapper);
    }
    return this.compatibilityTracksAppender;
  }
  /**
   * Returns the instance of the timeline flame chart data, without
   * adding data to it. In case the timeline data hasn't been instanced
   * creates a new instance and returns it.
   */
  #instantiateTimelineData() {
    if (!this.#timelineData) {
      this.#timelineData = PerfUI17.FlameChart.FlameChartTimelineData.createEmpty();
    }
    return this.#timelineData;
  }
  /**
   * Builds the flame chart data whilst allowing for a custom filtering of track appenders.
   * This is ONLY to be used in test environments.
   */
  buildWithCustomTracksForTest(options) {
    const compatAppender = this.compatibilityTracksAppenderInstance();
    const appenders = compatAppender.allVisibleTrackAppenders();
    let visibleTrackIndexCounter = 0;
    for (const appender of appenders) {
      const trackName = appender instanceof ThreadAppender ? appender.trackName() : appender.appenderName;
      const shouldIncludeTrack = options?.filterTracks?.call(null, trackName, visibleTrackIndexCounter) ?? true;
      if (!shouldIncludeTrack) {
        continue;
      }
      const shouldExpandTrack = options?.expandTracks?.call(null, trackName, visibleTrackIndexCounter) ?? true;
      this.currentLevel = appender.appendTrackAtLevel(this.currentLevel, shouldExpandTrack);
      visibleTrackIndexCounter++;
    }
  }
  groupTreeEvents(group) {
    return this.compatibilityTracksAppender?.groupEventsForTreeView(group) ?? null;
  }
  mainFrameNavigationStartEvents() {
    if (!this.parsedTrace) {
      return [];
    }
    return this.parsedTrace.data.Meta.mainFrameNavigations;
  }
  entryTitle(entryIndex) {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === "Screenshot") {
      return "";
    }
    if (entryType === "TrackAppender") {
      const timelineData = this.#timelineData;
      const eventLevel = timelineData.entryLevels[entryIndex];
      const event = this.entryData[entryIndex];
      return this.compatibilityTracksAppender?.titleForEvent(event, eventLevel) || null;
    }
    let title = this.entryIndexToTitle[entryIndex];
    if (!title) {
      title = `Unexpected entryIndex ${entryIndex}`;
      console.error(title);
    }
    return title;
  }
  textColor(index) {
    const event = this.entryData[index];
    return Utils8.IgnoreList.isIgnoreListedEntry(event) ? "#888" : FlameChartStyle.textColor;
  }
  entryFont(_index) {
    return this.#font;
  }
  /**
   * Clear the cache and rebuild the timeline data This should be called
   * when the trace file is the same but we want to rebuild the timeline
   * data. Some possible example: when we hide/unhide an event, or the
   * ignore list is changed etc.
   */
  rebuildTimelineData() {
    this.currentLevel = 0;
    this.entryData = [];
    this.entryTypeByLevel = [];
    this.entryIndexToTitle = [];
    this.#eventIndexByEvent = /* @__PURE__ */ new Map();
    if (this.#timelineData) {
      this.compatibilityTracksAppender?.setFlameChartDataAndEntryData(this.#timelineData, this.entryData, this.entryTypeByLevel);
      this.compatibilityTracksAppender?.threadAppenders().forEach((threadAppender) => threadAppender.setHeaderAppended(false));
    }
  }
  /**
   * Reset all data other than the UI elements.
   * This should be called when
   * - initialized the data provider
   * - a new trace file is coming (when `setModel()` is called)
   * etc.
   */
  reset() {
    this.currentLevel = 0;
    this.entryData = [];
    this.entryTypeByLevel = [];
    this.entryIndexToTitle = [];
    this.#eventIndexByEvent = /* @__PURE__ */ new Map();
    this.#minimumBoundary = 0;
    this.timeSpan = 0;
    this.compatibilityTracksAppender?.reset();
    this.compatibilityTracksAppender = null;
    this.#timelineData = null;
    this.parsedTrace = null;
    this.#entityMapper = null;
    this.#lastInitiatorEntryIndex = -1;
    this.#initiatorsCache.clear();
  }
  maxStackDepth() {
    return this.currentLevel;
  }
  /**
   * Builds the flame chart data using the tracks appender (which use
   * the new trace engine). The result built data is cached and returned.
   */
  timelineData(rebuild = false) {
    if (!rebuild && this.#timelineData && this.#timelineData.entryLevels.length !== 0) {
      return this.#timelineData;
    }
    this.#timelineData = PerfUI17.FlameChart.FlameChartTimelineData.createEmpty();
    if (rebuild) {
      this.rebuildTimelineData();
    }
    this.currentLevel = 0;
    if (this.parsedTrace) {
      this.compatibilityTracksAppender = this.compatibilityTracksAppenderInstance();
      if (this.parsedTrace.data.Meta.traceIsGeneric) {
        this.#processGenericTrace();
      } else {
        this.#processInspectorTrace();
      }
    }
    return this.#timelineData;
  }
  #processGenericTrace() {
    if (!this.compatibilityTracksAppender) {
      return;
    }
    const appendersByProcess = this.compatibilityTracksAppender.allThreadAppendersByProcess();
    for (const [pid, threadAppenders] of appendersByProcess) {
      const processGroupStyle = this.buildGroupStyle({ shareHeaderLine: false });
      const processName = this.parsedTrace?.data.Meta.processNames.get(pid)?.args.name || "Process";
      this.appendHeader(`${processName} (${pid})`, processGroupStyle, true, false);
      for (const appender of threadAppenders) {
        appender.setHeaderNestingLevel(1);
        this.currentLevel = appender.appendTrackAtLevel(this.currentLevel);
      }
    }
  }
  #processInspectorTrace() {
    this.#appendFramesAndScreenshotsTrack();
    const weight = (track) => {
      switch (track.appenderName) {
        case "Animations":
          return 0;
        case "Timings":
          return 1;
        case "Interactions":
          return 2;
        case "LayoutShifts":
          return 3;
        case "Extension":
          return 4;
        case "Thread":
          return 5;
        case "ServerTimings":
          return 6;
        case "GPU":
          return 7;
        case "Thread_AuctionWorklet":
          return 8;
        default:
          return 9;
      }
    };
    const allTrackAppenders = this.compatibilityTracksAppender ? this.compatibilityTracksAppender.allVisibleTrackAppenders() : [];
    allTrackAppenders.sort((a, b) => weight(a) - weight(b));
    for (const appender of allTrackAppenders) {
      if (!this.parsedTrace) {
        continue;
      }
      this.currentLevel = appender.appendTrackAtLevel(this.currentLevel);
      if (this.#timelineData && !this.#timelineData.selectedGroup) {
        if (appender instanceof ThreadAppender && (appender.threadType === "MAIN_THREAD" || appender.threadType === "CPU_PROFILE")) {
          const group = this.compatibilityTracksAppender?.groupForAppender(appender);
          if (group) {
            this.#timelineData.selectedGroup = group;
          }
        }
      }
    }
    if (this.#timelineData?.selectedGroup) {
      this.#timelineData.selectedGroup.expanded = true;
    }
  }
  minimumBoundary() {
    return this.#minimumBoundary;
  }
  totalTime() {
    return this.timeSpan;
  }
  search(visibleWindow, filter) {
    const results = [];
    this.timelineData();
    for (let i = 0; i < this.entryData.length; ++i) {
      const entry = this.entryData[i];
      if (!entry) {
        continue;
      }
      if (Trace33.Types.Events.isLegacyTimelineFrame(entry)) {
        continue;
      }
      if (Trace33.Types.Events.isLegacyScreenshot(entry)) {
        continue;
      }
      if (!Trace33.Helpers.Timing.eventIsInBounds(entry, visibleWindow)) {
        continue;
      }
      if (!filter || filter.accept(entry, this.parsedTrace?.data || void 0)) {
        const startTimeMilli = Trace33.Helpers.Timing.microToMilli(entry.ts);
        results.push({ index: i, startTimeMilli, provider: "main" });
      }
    }
    return results;
  }
  getEntryTypeForLevel(level) {
    return this.entryTypeByLevel[level];
  }
  /**
   * The frames and screenshots track is special cased because it is rendered
   * differently to the rest of the tracks and not as a series of events. This
   * is why it is not done via the appender system; we track frames &
   * screenshots as a different EntryType to the TrackAppender entries,
   * because then when it comes to drawing we can decorate them differently.
   **/
  #appendFramesAndScreenshotsTrack() {
    if (!this.parsedTrace) {
      return;
    }
    const filmStrip = Trace33.Extras.FilmStrip.fromHandlerData(this.parsedTrace.data);
    const hasScreenshots = filmStrip.frames.length > 0;
    const hasFrames = this.parsedTrace.data.Frames.frames.length > 0;
    if (!hasFrames && !hasScreenshots) {
      return;
    }
    this.framesGroupStyle.collapsible = hasScreenshots ? 0 : 1;
    const expanded = Root6.Runtime.Runtime.queryParam("flamechart-force-expand") === "frames";
    this.appendHeader(i18nString27(UIStrings27.frames), this.framesGroupStyle, false, expanded);
    this.entryTypeByLevel[this.currentLevel] = "Frame";
    for (const frame of this.parsedTrace.data.Frames.frames) {
      this.#appendFrame(frame);
    }
    ++this.currentLevel;
    if (!hasScreenshots) {
      return;
    }
    this.#appendScreenshots(filmStrip);
  }
  #appendScreenshots(filmStrip) {
    if (!this.#timelineData || !this.parsedTrace) {
      return;
    }
    this.appendHeader(
      "",
      this.screenshotsGroupStyle,
      false
      /* selectable */
    );
    this.entryTypeByLevel[this.currentLevel] = "Screenshot";
    let prevTimestamp = void 0;
    for (const filmStripFrame of filmStrip.frames) {
      const screenshotTimeInMilliSeconds = Trace33.Helpers.Timing.microToMilli(filmStripFrame.screenshotEvent.ts);
      this.entryData.push(filmStripFrame.screenshotEvent);
      this.#timelineData.entryLevels.push(this.currentLevel);
      this.#timelineData.entryStartTimes.push(screenshotTimeInMilliSeconds);
      if (prevTimestamp) {
        this.#timelineData.entryTotalTimes.push(screenshotTimeInMilliSeconds - prevTimestamp);
      }
      prevTimestamp = screenshotTimeInMilliSeconds;
    }
    if (filmStrip.frames.length && prevTimestamp !== void 0) {
      const maxRecordTimeMillis = Trace33.Helpers.Timing.traceWindowMilliSeconds(this.parsedTrace.data.Meta.traceBounds).max;
      this.#timelineData.entryTotalTimes.push(maxRecordTimeMillis - prevTimestamp);
    }
    ++this.currentLevel;
  }
  #entryTypeForIndex(entryIndex) {
    const level = this.timelineData().entryLevels[entryIndex];
    return this.entryTypeByLevel[level];
  }
  preparePopoverElement(entryIndex) {
    let time = "";
    let title;
    let warningElements = [];
    let timeElementClassName = "popoverinfo-time";
    const additionalContent = [];
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === "TrackAppender") {
      if (!this.compatibilityTracksAppender) {
        return null;
      }
      const event = this.entryData[entryIndex];
      const timelineData = this.#timelineData;
      const eventLevel = timelineData.entryLevels[entryIndex];
      const popoverInfo = this.compatibilityTracksAppender.popoverInfo(event, eventLevel);
      title = popoverInfo.title;
      time = popoverInfo.formattedTime;
      warningElements = popoverInfo.warningElements || warningElements;
      if (popoverInfo.additionalElements?.length) {
        additionalContent.push(...popoverInfo.additionalElements);
      }
      this.dispatchEventToListeners("FlameChartItemHovered", event);
    } else if (entryType === "Frame") {
      const frame = this.entryData[entryIndex];
      time = i18n54.TimeUtilities.preciseMillisToString(Trace33.Helpers.Timing.microToMilli(frame.duration), 1);
      if (frame.idle) {
        title = i18nString27(UIStrings27.idleFrame);
      } else if (frame.dropped) {
        title = frame.isPartial ? i18nString27(UIStrings27.partiallyPresentedFrame) : i18nString27(UIStrings27.droppedFrame);
        timeElementClassName = "popoverinfo-warning";
      } else {
        title = i18nString27(UIStrings27.frame);
      }
    } else {
      this.dispatchEventToListeners("FlameChartItemHovered", null);
      return null;
    }
    const popoverElement = document.createElement("div");
    const root = UI19.UIUtils.createShadowRootWithCoreStyles(popoverElement, { cssFile: timelineFlamechartPopover_css_default });
    const popoverContents = root.createChild("div", "timeline-flamechart-popover");
    popoverContents.createChild("span", timeElementClassName).textContent = time;
    popoverContents.createChild("span", "popoverinfo-title").textContent = title;
    for (const warningElement of warningElements) {
      warningElement.classList.add("popoverinfo-warning");
      popoverContents.appendChild(warningElement);
    }
    for (const elem of additionalContent) {
      popoverContents.appendChild(elem);
    }
    return popoverElement;
  }
  preparePopoverForCollapsedArrow(entryIndex) {
    const element = document.createElement("div");
    const root = UI19.UIUtils.createShadowRootWithCoreStyles(element, { cssFile: timelineFlamechartPopover_css_default });
    const entry = this.entryData[entryIndex];
    const hiddenEntriesAmount = ModificationsManager.activeManager()?.getEntriesFilter().findHiddenDescendantsAmount(entry);
    if (!hiddenEntriesAmount) {
      return null;
    }
    const contents = root.createChild("div", "timeline-flamechart-popover");
    contents.createChild("span", "popoverinfo-title").textContent = hiddenEntriesAmount + " hidden";
    return element;
  }
  getDrawOverride(entryIndex) {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType !== "TrackAppender") {
      return;
    }
    const timelineData = this.#timelineData;
    const eventLevel = timelineData.entryLevels[entryIndex];
    const event = this.entryData[entryIndex];
    return this.compatibilityTracksAppender?.getDrawOverride(event, eventLevel);
  }
  #entryColorForFrame(entryIndex) {
    const frame = this.entryData[entryIndex];
    if (frame.idle) {
      return "white";
    }
    if (frame.dropped) {
      if (frame.isPartial) {
        return "#f0e442";
      }
      return "#f08080";
    }
    return "#d7f0d1";
  }
  entryColor(entryIndex) {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === "Frame") {
      return this.#entryColorForFrame(entryIndex);
    }
    if (entryType === "TrackAppender") {
      const timelineData = this.#timelineData;
      const eventLevel = timelineData.entryLevels[entryIndex];
      const event = this.entryData[entryIndex];
      return this.compatibilityTracksAppender?.colorForEvent(event, eventLevel) || "";
    }
    return "";
  }
  preparePatternCanvas() {
    const size = 17;
    const droppedFrameCanvas = document.createElement("canvas");
    const partialFrameCanvas = document.createElement("canvas");
    droppedFrameCanvas.width = droppedFrameCanvas.height = size;
    partialFrameCanvas.width = partialFrameCanvas.height = size;
    const ctx = droppedFrameCanvas.getContext("2d", { willReadFrequently: true });
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(Math.PI * 0.25);
    ctx.translate(-size * 0.5, -size * 0.5);
    ctx.fillStyle = "rgb(255, 255, 255)";
    for (let x = -size; x < size * 2; x += 3) {
      ctx.fillRect(x, -size, 1, size * 3);
    }
    const droppedFramePattern = ctx.createPattern(droppedFrameCanvas, "repeat");
    const ctx2 = partialFrameCanvas.getContext("2d", { willReadFrequently: true });
    ctx2.strokeStyle = "rgb(255, 255, 255)";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(17, 0);
    ctx2.lineTo(10, 7);
    ctx2.moveTo(8, 9);
    ctx2.lineTo(2, 15);
    ctx2.stroke();
    const partialFramePattern = ctx.createPattern(partialFrameCanvas, "repeat");
    return [droppedFramePattern, partialFramePattern];
  }
  drawFrame(entryIndex, context, barX, barY, barWidth, barHeight, transformColor) {
    const hPadding = 1;
    const frame = this.entryData[entryIndex];
    barX += hPadding;
    barWidth -= 2 * hPadding;
    context.fillStyle = transformColor(this.entryColor(entryIndex));
    if (frame.dropped) {
      context.fillRect(barX, barY, barWidth, barHeight);
      if (frame.isPartial) {
        context.fillStyle = this.partialFramePattern || context.fillStyle;
      } else {
        context.fillStyle = this.droppedFramePattern || context.fillStyle;
      }
    }
    context.fillRect(barX, barY, barWidth, barHeight);
    const frameDurationText = i18n54.TimeUtilities.preciseMillisToString(Trace33.Helpers.Timing.microToMilli(frame.duration), 1);
    const textWidth = context.measureText(frameDurationText).width;
    if (textWidth <= barWidth) {
      context.fillStyle = this.textColor(entryIndex);
      context.fillText(frameDurationText, barX + (barWidth - textWidth) / 2, barY + barHeight - 4);
    }
  }
  async drawScreenshot(entryIndex, context, barX, barY, barWidth, barHeight) {
    const screenshot = this.entryData[entryIndex];
    const image = Utils8.ImageCache.getOrQueue(screenshot);
    if (!image) {
      return;
    }
    const imageX = barX + 1;
    const imageY = barY + 1;
    const imageHeight = barHeight - 2;
    const scale = imageHeight / image.naturalHeight;
    const imageWidth = Math.floor(image.naturalWidth * scale);
    context.save();
    context.beginPath();
    context.rect(barX, barY, barWidth, barHeight);
    context.clip();
    context.drawImage(image, imageX, imageY, imageWidth, imageHeight);
    context.strokeStyle = "#ccc";
    context.strokeRect(imageX - 0.5, imageY - 0.5, Math.min(barWidth - 1, imageWidth + 1), imageHeight);
    context.restore();
  }
  decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio, transformColor) {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === "Frame") {
      this.drawFrame(entryIndex, context, barX, barY, barWidth, barHeight, transformColor);
      return true;
    }
    if (entryType === "Screenshot") {
      void this.drawScreenshot(entryIndex, context, barX, barY, barWidth, barHeight);
      return true;
    }
    if (entryType === "TrackAppender") {
      const entry = this.entryData[entryIndex];
      if (Trace33.Types.Events.isSyntheticInteraction(entry)) {
        this.#drawInteractionEventWithWhiskers(context, entryIndex, text, entry, barX, barY, unclippedBarX, barWidth, barHeight, timeToPixelRatio);
        return true;
      }
    }
    return false;
  }
  /**
   * Draws the left and right whiskers around an interaction in the timeline.
   * @param context the canvas that will be drawn onto
   * @param entryIndex
   * @param entryTitle the title of the entry
   * @param entry the entry itself
   * @param barX the starting X pixel position of the bar representing this event. This is clipped: if the bar is off the left side of the screen, this value will be 0
   * @param barY the starting Y pixel position of the bar representing this event.
   * @param unclippedBarXStartPixel the starting X pixel position of the bar representing this event, not clipped. This means if the bar is off the left of the screen this will be a negative number.
   * @param barWidth the width of the full bar in pixels
   * @param barHeight the height of the full bar in pixels
   * @param timeToPixelRatio the ratio required to convert a millisecond time to a pixel value.
   **/
  #drawInteractionEventWithWhiskers(context, entryIndex, entryTitle, entry, barX, barY, unclippedBarXStartPixel, barWidth, barHeight, timeToPixelRatio) {
    const beginTime = Trace33.Helpers.Timing.microToMilli(entry.ts);
    const entireBarEndXPixel = barX + barWidth;
    function timeToPixel(time) {
      const timeMilli = Trace33.Helpers.Timing.microToMilli(time);
      return Math.floor(unclippedBarXStartPixel + (timeMilli - beginTime) * timeToPixelRatio);
    }
    context.save();
    context.fillStyle = ThemeSupport25.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container");
    let desiredBoxStartX = timeToPixel(entry.processingStart);
    const desiredBoxEndX = timeToPixel(entry.processingEnd);
    if (entry.processingEnd - entry.processingStart === 0) {
      desiredBoxStartX -= 1;
    }
    context.fillRect(barX, barY - 0.5, desiredBoxStartX - barX, barHeight);
    context.fillRect(desiredBoxEndX, barY - 0.5, entireBarEndXPixel - desiredBoxEndX, barHeight);
    function drawTick(begin, end, y) {
      const tickHeightPx = 6;
      context.moveTo(begin, y - tickHeightPx / 2);
      context.lineTo(begin, y + tickHeightPx / 2);
      context.moveTo(begin, y);
      context.lineTo(end, y);
    }
    const leftWhiskerX = timeToPixel(entry.ts);
    const rightWhiskerX = timeToPixel(Trace33.Types.Timing.Micro(entry.ts + entry.dur));
    context.beginPath();
    context.lineWidth = 1;
    context.strokeStyle = "#ccc";
    const lineY = Math.floor(barY + barHeight / 2) + 0.5;
    const leftTick = leftWhiskerX + 0.5;
    const rightTick = rightWhiskerX - 0.5;
    drawTick(leftTick, desiredBoxStartX, lineY);
    drawTick(rightTick, desiredBoxEndX, lineY);
    context.stroke();
    if (entryTitle) {
      const textStartX = desiredBoxStartX > 0 ? desiredBoxStartX : barX;
      context.font = this.#font;
      const textWidth = UI19.UIUtils.measureTextWidth(context, entryTitle);
      const textPadding = 5;
      const textBaseline = 5;
      if (textWidth <= desiredBoxEndX - textStartX + textPadding) {
        context.fillStyle = this.textColor(entryIndex);
        context.fillText(entryTitle, textStartX + textPadding, barY + barHeight - textBaseline);
      }
    }
    context.restore();
  }
  forceDecoration(entryIndex) {
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === "Frame") {
      return true;
    }
    if (entryType === "Screenshot") {
      return true;
    }
    const event = this.entryData[entryIndex];
    if (Trace33.Types.Events.isSyntheticInteraction(event)) {
      return true;
    }
    return Boolean(this.parsedTrace?.data.Warnings.perEvent.get(event));
  }
  appendHeader(title, style, selectable, expanded) {
    const group = { startLevel: this.currentLevel, name: title, style, selectable, expanded };
    this.#timelineData.groups.push(group);
    return group;
  }
  #appendFrame(frame) {
    const index = this.entryData.length;
    this.entryData.push(frame);
    const durationMilliseconds = Trace33.Helpers.Timing.microToMilli(frame.duration);
    this.entryIndexToTitle[index] = i18n54.TimeUtilities.millisToString(durationMilliseconds, true);
    if (!this.#timelineData) {
      return;
    }
    this.#timelineData.entryLevels[index] = this.currentLevel;
    this.#timelineData.entryTotalTimes[index] = durationMilliseconds;
    this.#timelineData.entryStartTimes[index] = Trace33.Helpers.Timing.microToMilli(frame.startTime);
  }
  createSelection(entryIndex) {
    const entry = this.entryData[entryIndex];
    const timelineSelection = entry ? selectionFromEvent(entry) : null;
    if (timelineSelection) {
      this.lastSelection = new Selection(timelineSelection, entryIndex);
    }
    return timelineSelection;
  }
  formatValue(value, precision) {
    return i18n54.TimeUtilities.preciseMillisToString(value, precision);
  }
  groupForEvent(entryIndex) {
    if (!this.compatibilityTracksAppender) {
      return null;
    }
    const level = this.#timelineData?.entryLevels[entryIndex] ?? null;
    if (level === null) {
      return null;
    }
    const groupForLevel2 = this.compatibilityTracksAppender.groupForLevel(level);
    if (!groupForLevel2) {
      return null;
    }
    return groupForLevel2;
  }
  canJumpToEntry(_entryIndex) {
    return false;
  }
  entryIndexForSelection(selection) {
    if (!selection || selectionIsRange(selection) || Trace33.Types.Events.isNetworkTrackEntry(selection.event)) {
      return -1;
    }
    if (this.lastSelection && selectionsEqual(this.lastSelection.timelineSelection, selection)) {
      return this.lastSelection.entryIndex;
    }
    const index = this.entryData.indexOf(selection.event);
    if (index === -1) {
      if (this.#timelineData?.selectedGroup) {
        ModificationsManager.activeManager()?.getEntriesFilter().revealEntry(selection.event);
        this.timelineData(true);
      }
    }
    if (index !== -1) {
      this.lastSelection = new Selection(selection, index);
    }
    return index;
  }
  /**
   * Return the index for the given entry. Note that this method assumes that
   * timelineData() has been generated. If it hasn't, this method will return
   * null.
   */
  indexForEvent(targetEvent) {
    const fromCache = this.#eventIndexByEvent.get(targetEvent);
    if (typeof fromCache === "number") {
      return fromCache;
    }
    const index = this.entryData.indexOf(targetEvent);
    const result = index > -1 ? index : null;
    this.#eventIndexByEvent.set(targetEvent, result);
    return result;
  }
  /**
   * Build the data for initiators and initiated entries.
   * @param entryIndex
   * @returns if we should re-render the flame chart (canvas)
   */
  buildFlowForInitiator(entryIndex) {
    if (!this.parsedTrace || !this.compatibilityTracksAppender || !this.#timelineData) {
      return false;
    }
    if (this.#lastInitiatorEntryIndex === entryIndex) {
      return false;
    }
    this.#lastInitiatorEntryIndex = entryIndex;
    const previousInitiatorsDataLength = this.#timelineData.initiatorsData.length;
    if (entryIndex === -1) {
      if (this.#timelineData.initiatorsData.length === 0) {
        return false;
      }
      this.#timelineData.emptyInitiators();
      return true;
    }
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType !== "TrackAppender") {
      return false;
    }
    const cached = this.#initiatorsCache.get(entryIndex);
    if (cached) {
      this.#timelineData.initiatorsData = cached;
      return true;
    }
    const event = this.entryData[entryIndex];
    this.#timelineData.emptyInitiators();
    const hiddenEvents = ModificationsManager.activeManager()?.getEntriesFilter().invisibleEntries() ?? [];
    const expandableEntries = ModificationsManager.activeManager()?.getEntriesFilter().expandableEntries() ?? [];
    const initiatorsData = initiatorsDataToDraw(this.parsedTrace, event, hiddenEvents, expandableEntries);
    if (initiatorsData.length === 0) {
      this.#initiatorsCache.set(entryIndex, []);
    }
    if (previousInitiatorsDataLength === 0 && initiatorsData.length === 0) {
      return false;
    }
    for (const initiatorData of initiatorsData) {
      const eventIndex = this.indexForEvent(initiatorData.event);
      const initiatorIndex = this.indexForEvent(initiatorData.initiator);
      if (eventIndex === null || initiatorIndex === null) {
        continue;
      }
      this.#timelineData.initiatorsData.push({
        initiatorIndex,
        eventIndex,
        isInitiatorHidden: initiatorData.isInitiatorHidden,
        isEntryHidden: initiatorData.isEntryHidden
      });
    }
    this.#initiatorsCache.set(entryIndex, this.#timelineData.initiatorsData);
    return true;
  }
  eventByIndex(entryIndex) {
    if (entryIndex < 0) {
      return null;
    }
    const entryType = this.#entryTypeForIndex(entryIndex);
    if (entryType === "TrackAppender") {
      return this.entryData[entryIndex];
    }
    if (entryType === "Frame") {
      return this.entryData[entryIndex];
    }
    return null;
  }
};
var InstantEventVisibleDurationMs = Trace33.Types.Timing.Milli(1e-3);

// gen/front_end/panels/timeline/TimingsTrackAppender.js
var TimingsTrackAppender_exports = {};
__export(TimingsTrackAppender_exports, {
  SORT_ORDER_PAGE_LOAD_MARKERS: () => SORT_ORDER_PAGE_LOAD_MARKERS2,
  TimingsTrackAppender: () => TimingsTrackAppender
});
import * as i18n56 from "./../../core/i18n/i18n.js";
import * as Trace34 from "./../../models/trace/trace.js";
import * as PerfUI18 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Extensions4 from "./extensions/extensions.js";
var UIStrings28 = {
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  timings: "Timings"
};
var str_28 = i18n56.i18n.registerUIStrings("panels/timeline/TimingsTrackAppender.ts", UIStrings28);
var i18nString28 = i18n56.i18n.getLocalizedString.bind(void 0, str_28);
var SORT_ORDER_PAGE_LOAD_MARKERS2 = {
  [
    "navigationStart"
    /* Trace.Types.Events.Name.NAVIGATION_START */
  ]: 0,
  [
    "MarkLoad"
    /* Trace.Types.Events.Name.MARK_LOAD */
  ]: 1,
  [
    "firstContentfulPaint"
    /* Trace.Types.Events.Name.MARK_FCP */
  ]: 2,
  [
    "firstPaint"
    /* Trace.Types.Events.Name.MARK_FIRST_PAINT */
  ]: 2,
  [
    "MarkDOMContent"
    /* Trace.Types.Events.Name.MARK_DOM_CONTENT */
  ]: 3,
  [
    "largestContentfulPaint::Candidate"
    /* Trace.Types.Events.Name.MARK_LCP_CANDIDATE */
  ]: 4
};
var TimingsTrackAppender = class {
  appenderName = "Timings";
  #colorGenerator;
  #compatibilityBuilder;
  #parsedTrace;
  #extensionMarkers;
  constructor(compatibilityBuilder, parsedTrace, colorGenerator2) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = colorGenerator2;
    this.#parsedTrace = parsedTrace;
    const extensionDataEnabled = TimelinePanel.extensionDataVisibilitySetting().get();
    this.#extensionMarkers = extensionDataEnabled ? this.#parsedTrace.data.ExtensionTraceData.extensionMarkers : [];
  }
  /**
   * Appends into the flame chart data the data corresponding to the
   * timings track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded whether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel, expanded) {
    const extensionMarkersAreEmpty = this.#extensionMarkers.length === 0;
    const performanceMarks = this.#parsedTrace.data.UserTimings.performanceMarks.filter((m) => !Trace34.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInPerformanceTiming(m).devtoolsObj);
    const performanceMeasures = this.#parsedTrace.data.UserTimings.performanceMeasures.filter((m) => !Trace34.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInPerformanceTiming(m).devtoolsObj);
    const timestampEvents = this.#parsedTrace.data.UserTimings.timestampEvents.filter((timeStamp) => !Trace34.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInConsoleTimeStamp(timeStamp).devtoolsObj);
    const consoleTimings = this.#parsedTrace.data.UserTimings.consoleTimings;
    const allTimings = [...performanceMeasures, ...consoleTimings, ...timestampEvents, ...performanceMarks].sort((a, b) => a.ts - b.ts);
    if (extensionMarkersAreEmpty && allTimings.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    const newLevel = this.#appendExtensionsAtLevel(trackStartLevel);
    return this.#compatibilityBuilder.appendEventsAtLevel(allTimings, newLevel, this);
  }
  /**
   * Adds into the flame chart data the header corresponding to the
   * timings track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel, expanded) {
    const trackIsCollapsible = this.#parsedTrace.data.UserTimings.performanceMeasures.length > 0;
    const style = buildGroupStyle({
      useFirstLineForOverview: true,
      collapsible: trackIsCollapsible ? 2 : 1
    });
    const group = buildTrackHeader(
      "timings",
      currentLevel,
      i18nString28(UIStrings28.timings),
      style,
      /* selectable= */
      true,
      expanded
    );
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  /**
   * Adds into the flame chart data the ExtensionMarkers.
   * @param currentLevel the flame chart level from which markers will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * extension markers (the first available level to append more data).
   */
  #appendExtensionsAtLevel(currentLevel) {
    const markers = this.#extensionMarkers.toSorted((m1, m2) => m1.ts - m2.ts);
    if (markers.length === 0) {
      return currentLevel;
    }
    for (const marker of markers) {
      const index = this.#compatibilityBuilder.appendEventAtLevel(marker, currentLevel, this);
      this.#compatibilityBuilder.getFlameChartTimelineData().entryTotalTimes[index] = Number.NaN;
    }
    const minTimeMs = Trace34.Helpers.Timing.microToMilli(this.#parsedTrace.data.Meta.traceBounds.min);
    const flameChartMarkers = markers.map((marker) => {
      const startTimeMs = Trace34.Helpers.Timing.microToMilli(marker.ts);
      const style = this.markerStyleForExtensionMarker(marker);
      return new TimelineFlameChartMarker(startTimeMs, startTimeMs - minTimeMs, style);
    });
    this.#compatibilityBuilder.getFlameChartTimelineData().markers.push(...flameChartMarkers);
    return ++currentLevel;
  }
  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */
  /**
   * Gets the style for a page load marker event.
   */
  markerStyleForPageLoadEvent(markerEvent) {
    const tallMarkerDashStyle = [6, 4];
    let title = "";
    let color = "grey";
    if (Trace34.Types.Events.isMarkDOMContent(markerEvent)) {
      color = "#0867CB";
      title = "DCL";
    }
    if (Trace34.Types.Events.isMarkLoad(markerEvent)) {
      color = "#B31412";
      title = "L";
    }
    if (Trace34.Types.Events.isFirstPaint(markerEvent)) {
      color = "#228847";
      title = "FP";
    }
    if (Trace34.Types.Events.isFirstContentfulPaint(markerEvent)) {
      color = "#1A6937";
      title = "FCP";
    }
    if (Trace34.Types.Events.isLargestContentfulPaintCandidate(markerEvent)) {
      color = "#1A3422";
      title = "LCP";
    }
    if (Trace34.Types.Events.isNavigationStart(markerEvent)) {
      color = "#FF9800";
      title = "";
    }
    return {
      title,
      dashStyle: tallMarkerDashStyle,
      lineWidth: 0.5,
      color,
      tall: true,
      lowPriority: false
    };
  }
  markerStyleForExtensionMarker(markerEvent) {
    const tallMarkerDashStyle = [6, 4];
    const title = markerEvent.name;
    const color = Extensions4.ExtensionUI.extensionEntryColor(markerEvent);
    return {
      title,
      dashStyle: tallMarkerDashStyle,
      lineWidth: 0.5,
      color,
      tall: true,
      lowPriority: false
    };
  }
  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event) {
    if (Trace34.Types.Events.eventIsPageLoadEvent(event)) {
      return this.markerStyleForPageLoadEvent(event).color;
    }
    if (Trace34.Types.Extensions.isSyntheticExtensionEntry(event)) {
      return Extensions4.ExtensionUI.extensionEntryColor(event);
    }
    return this.#colorGenerator.colorForID(event.name);
  }
  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event) {
    const metricsHandler = Trace34.Handlers.ModelHandlers.PageLoadMetrics;
    if (Trace34.Types.Events.eventIsPageLoadEvent(event)) {
      switch (event.name) {
        case "MarkDOMContent":
          return "DCL";
        case "MarkLoad":
          return "L";
        case "firstContentfulPaint":
          return "FCP";
        case "firstPaint":
          return "FP";
        case "largestContentfulPaint::Candidate":
          return "LCP";
        case "navigationStart":
          return "";
        default:
          return event.name;
      }
    }
    if (Trace34.Types.Events.isConsoleTimeStamp(event)) {
      return `TimeStamp: ${event.args.data?.message ?? "(name unknown)"}`;
    }
    if (Trace34.Types.Events.isPerformanceMark(event)) {
      return `[mark]: ${event.name}`;
    }
    return event.name;
  }
  setPopoverInfo(event, info) {
    const isExtensibilityMarker = Trace34.Types.Extensions.isSyntheticExtensionEntry(event) && Trace34.Types.Extensions.isExtensionPayloadMarker(event.devtoolsObj);
    if (isExtensibilityMarker) {
      info.title = event.devtoolsObj.tooltipText || event.name;
    }
    if (Trace34.Types.Events.isMarkerEvent(event) || Trace34.Types.Events.isPerformanceMark(event) || Trace34.Types.Events.isConsoleTimeStamp(event) || isExtensibilityMarker) {
      const timeOfEvent = Trace34.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(event, this.#parsedTrace.data.Meta.traceBounds, this.#parsedTrace.data.Meta.navigationsByNavigationId, this.#parsedTrace.data.Meta.navigationsByFrameId);
      info.formattedTime = getDurationString(timeOfEvent);
    }
  }
};

// gen/front_end/panels/timeline/CompatibilityTracksAppender.js
import * as TimelineUtils from "./utils/utils.js";
var showPostMessageEvents;
function isShowPostMessageEventsEnabled() {
  if (showPostMessageEvents === void 0) {
    showPostMessageEvents = Root7.Runtime.experiments.isEnabled(
      "timeline-show-postmessage-events"
      /* Root.Runtime.ExperimentName.TIMELINE_SHOW_POST_MESSAGE_EVENTS */
    );
  }
  return showPostMessageEvents;
}
function entryIsVisibleInTimeline(entry, parsedTrace) {
  if (parsedTrace?.data.Meta.traceIsGeneric) {
    return true;
  }
  if (Trace35.Types.Events.isUpdateCounters(entry)) {
    return true;
  }
  if (isShowPostMessageEventsEnabled()) {
    if (Trace35.Types.Events.isSchedulePostMessage(entry) || Trace35.Types.Events.isHandlePostMessage(entry)) {
      return true;
    }
  }
  if (Trace35.Types.Extensions.isSyntheticExtensionEntry(entry)) {
    return true;
  }
  const eventStyle = Trace35.Styles.getEventStyle(entry.name);
  const eventIsTiming = Trace35.Types.Events.isConsoleTime(entry) || Trace35.Types.Events.isPerformanceMeasure(entry) || Trace35.Types.Events.isPerformanceMark(entry) || Trace35.Types.Events.isConsoleTimeStamp(entry);
  return eventStyle && !eventStyle.hidden || eventIsTiming;
}
var HIDDEN_THREAD_NAMES = /* @__PURE__ */ new Set(["Chrome_ChildIOThread", "Compositor", "GpuMemoryThread", "PerfettoTrace"]);
var TrackNames = [
  "Animations",
  "Timings",
  "Interactions",
  "GPU",
  "LayoutShifts",
  "Thread",
  "Thread_AuctionWorklet",
  "Extension",
  "ServerTimings"
];
var CompatibilityTracksAppender = class {
  #trackForLevel = /* @__PURE__ */ new Map();
  #trackForGroup = /* @__PURE__ */ new Map();
  #eventsForTrack = /* @__PURE__ */ new Map();
  #trackEventsForTreeview = /* @__PURE__ */ new Map();
  #flameChartData;
  #parsedTrace;
  #entryData;
  #colorGenerator;
  #allTrackAppenders = [];
  #visibleTrackNames = /* @__PURE__ */ new Set([...TrackNames]);
  #legacyEntryTypeByLevel;
  #timingsTrackAppender;
  #animationsTrackAppender;
  #interactionsTrackAppender;
  #gpuTrackAppender;
  #layoutShiftsTrackAppender;
  #threadAppenders = [];
  #entityMapper;
  /**
   * @param flameChartData the data used by the flame chart renderer on
   * which the track data will be appended.
   * @param parsedTrace the trace parsing engines output.
   * @param entryData the array containing all event to be rendered in
   * the flamechart.
   * @param legacyEntryTypeByLevel an array containing the type of
   * each entry in the entryData array. Indexed by the position the
   * corresponding entry occupies in the entryData array. This reference
   * is needed only for compatibility with the legacy flamechart
   * architecture and should be removed once all tracks use the new
   * system.
   * @param entityMapper 3P entity data for the trace.
   */
  constructor(flameChartData, parsedTrace, entryData, legacyEntryTypeByLevel, entityMapper) {
    this.#flameChartData = flameChartData;
    this.#parsedTrace = parsedTrace;
    this.#entityMapper = entityMapper;
    this.#entryData = entryData;
    this.#colorGenerator = new Common17.Color.Generator(
      /* hueSpace= */
      { min: 30, max: 55, count: void 0 },
      /* satSpace= */
      { min: 70, max: 100, count: 6 },
      /* lightnessSpace= */
      50,
      /* alphaSpace= */
      0.7
    );
    this.#legacyEntryTypeByLevel = legacyEntryTypeByLevel;
    this.#timingsTrackAppender = new TimingsTrackAppender(this, this.#parsedTrace, this.#colorGenerator);
    this.#allTrackAppenders.push(this.#timingsTrackAppender);
    this.#interactionsTrackAppender = new InteractionsTrackAppender(this, this.#parsedTrace, this.#colorGenerator);
    this.#allTrackAppenders.push(this.#interactionsTrackAppender);
    this.#animationsTrackAppender = new AnimationsTrackAppender(this, this.#parsedTrace);
    this.#allTrackAppenders.push(this.#animationsTrackAppender);
    this.#gpuTrackAppender = new GPUTrackAppender(this, this.#parsedTrace);
    this.#allTrackAppenders.push(this.#gpuTrackAppender);
    this.#layoutShiftsTrackAppender = new LayoutShiftsTrackAppender(this, this.#parsedTrace);
    this.#allTrackAppenders.push(this.#layoutShiftsTrackAppender);
    this.#addThreadAppenders();
    this.#addExtensionAppenders();
    this.onThemeChange = this.onThemeChange.bind(this);
    ThemeSupport27.ThemeSupport.instance().addEventListener(ThemeSupport27.ThemeChangeEvent.eventName, this.onThemeChange);
  }
  reset() {
    ThemeSupport27.ThemeSupport.instance().removeEventListener(ThemeSupport27.ThemeChangeEvent.eventName, this.onThemeChange);
  }
  setFlameChartDataAndEntryData(flameChartData, entryData, legacyEntryTypeByLevel) {
    this.#trackForGroup.clear();
    this.#flameChartData = flameChartData;
    this.#entryData = entryData;
    this.#legacyEntryTypeByLevel = legacyEntryTypeByLevel;
  }
  getFlameChartTimelineData() {
    return this.#flameChartData;
  }
  onThemeChange() {
    for (const group of this.#flameChartData.groups) {
      group.style.color = ThemeSupport27.ThemeSupport.instance().getComputedValue("--sys-color-on-surface");
      group.style.backgroundColor = ThemeSupport27.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container");
    }
  }
  #addExtensionAppenders() {
    if (!TimelinePanel.extensionDataVisibilitySetting().get()) {
      return;
    }
    const tracks = this.#parsedTrace.data.ExtensionTraceData.extensionTrackData;
    for (const trackData of tracks) {
      this.#allTrackAppenders.push(new ExtensionTrackAppender(this, trackData));
    }
  }
  #addThreadAppenders() {
    const threadTrackOrder = (appender) => {
      switch (appender.threadType) {
        case "MAIN_THREAD": {
          if (appender.isOnMainFrame) {
            const url = appender.getUrl();
            if (url.startsWith("about:") || url.startsWith("chrome:")) {
              return 2;
            }
            return 0;
          }
          return 1;
        }
        case "WORKER":
          return 3;
        case "AUCTION_WORKLET":
          return 3;
        case "RASTERIZER":
          return 4;
        case "THREAD_POOL":
          return 5;
        case "OTHER":
          return 7;
        default:
          return 8;
      }
    };
    const threads = Trace35.Handlers.Threads.threadsInTrace(this.#parsedTrace.data);
    const showAllEvents = Root7.Runtime.experiments.isEnabled("timeline-show-all-events");
    for (const { pid, tid, name, type, entries, tree } of threads) {
      if (this.#parsedTrace.data.Meta.traceIsGeneric) {
        this.#threadAppenders.push(new ThreadAppender(this, this.#parsedTrace, pid, tid, name, "OTHER", entries, tree));
        continue;
      }
      if (name && HIDDEN_THREAD_NAMES.has(name) && !showAllEvents) {
        continue;
      }
      const matchingWorklet = this.#parsedTrace.data.AuctionWorklets.worklets.get(pid);
      if (matchingWorklet) {
        const tids = [matchingWorklet.args.data.utilityThread.tid, matchingWorklet.args.data.v8HelperThread.tid];
        if (tids.includes(tid)) {
          this.#threadAppenders.push(new ThreadAppender(this, this.#parsedTrace, pid, tid, "", "AUCTION_WORKLET", entries, tree));
        }
        continue;
      }
      this.#threadAppenders.push(new ThreadAppender(this, this.#parsedTrace, pid, tid, name, type, entries, tree));
    }
    this.#threadAppenders.sort((a, b) => threadTrackOrder(a) - threadTrackOrder(b) || b.getEntries().length - a.getEntries().length);
    this.#allTrackAppenders.push(...this.#threadAppenders);
  }
  timingsTrackAppender() {
    return this.#timingsTrackAppender;
  }
  animationsTrackAppender() {
    return this.#animationsTrackAppender;
  }
  interactionsTrackAppender() {
    return this.#interactionsTrackAppender;
  }
  gpuTrackAppender() {
    return this.#gpuTrackAppender;
  }
  layoutShiftsTrackAppender() {
    return this.#layoutShiftsTrackAppender;
  }
  threadAppenders() {
    return this.#threadAppenders;
  }
  eventsInTrack(trackAppender) {
    const cachedData = this.#eventsForTrack.get(trackAppender);
    if (cachedData) {
      return cachedData;
    }
    let trackStartLevel = null;
    let trackEndLevel = null;
    for (const [level, track] of this.#trackForLevel) {
      if (track !== trackAppender) {
        continue;
      }
      if (trackStartLevel === null) {
        trackStartLevel = level;
      }
      trackEndLevel = level;
    }
    if (trackStartLevel === null || trackEndLevel === null) {
      throw new Error(`Could not find events for track: ${trackAppender}`);
    }
    const entryLevels = this.#flameChartData.entryLevels;
    const events = [];
    for (let i = 0; i < entryLevels.length; i++) {
      if (trackStartLevel <= entryLevels[i] && entryLevels[i] <= trackEndLevel) {
        events.push(this.#entryData[i]);
      }
    }
    events.sort((a, b) => a.ts - b.ts);
    this.#eventsForTrack.set(trackAppender, events);
    return events;
  }
  /**
   * Gets the events to be shown in the tree views of the details pane
   * (Bottom-up, Call tree, etc.). These are the events from the track
   * that can be arranged in a tree shape.
   */
  eventsForTreeView(trackAppender) {
    const cachedData = this.#trackEventsForTreeview.get(trackAppender);
    if (cachedData) {
      return cachedData;
    }
    let trackEvents = this.eventsInTrack(trackAppender);
    if (!Trace35.Helpers.TreeHelpers.canBuildTreesFromEvents(trackEvents)) {
      trackEvents = trackEvents.filter((e) => !Trace35.Types.Events.isPhaseAsync(e.ph));
    }
    this.#trackEventsForTreeview.set(trackAppender, trackEvents);
    return trackEvents;
  }
  /**
   * Caches the track appender that owns a flame chart group. FlameChart
   * groups are created for each track in the timeline. When an user
   * selects a track in the UI, the track's group is passed to the model
   * layer to inform about the selection.
   */
  registerTrackForGroup(group, appender) {
    this.#flameChartData.groups.push(group);
    this.#trackForGroup.set(group, appender);
  }
  /**
   * Returns number of tracks of given type already appended.
   * Used to name the "Raster Thread 6" tracks, etc
   */
  getCurrentTrackCountForThreadType(threadType) {
    return this.#threadAppenders.filter((appender) => appender.threadType === threadType && appender.headerAppended()).length;
  }
  /**
   * Looks up a FlameChart group for a given appender.
   */
  groupForAppender(targetAppender) {
    let foundGroup = null;
    for (const [group, appender] of this.#trackForGroup) {
      if (appender === targetAppender) {
        foundGroup = group;
        break;
      }
    }
    return foundGroup;
  }
  /**
   * Given a FlameChart group, gets the events to be shown in the tree
   * views if that group was registered by the appender system.
   */
  groupEventsForTreeView(group) {
    const track = this.#trackForGroup.get(group);
    if (!track) {
      return null;
    }
    return this.eventsForTreeView(track);
  }
  groupForLevel(level) {
    const appenderForLevel = this.#trackForLevel.get(level);
    if (!appenderForLevel) {
      return null;
    }
    return this.groupForAppender(appenderForLevel);
  }
  /**
   * Adds an event to the flame chart data at a defined level.
   * @param event the event to be appended,
   * @param level the level to append the event,
   * @param appender the track which the event belongs to.
   * @returns the index of the event in all events to be rendered in the flamechart.
   */
  appendEventAtLevel(event, level, appender) {
    this.#trackForLevel.set(level, appender);
    const index = this.#entryData.length;
    this.#entryData.push(event);
    this.#legacyEntryTypeByLevel[level] = "TrackAppender";
    this.#flameChartData.entryLevels[index] = level;
    this.#flameChartData.entryStartTimes[index] = Trace35.Helpers.Timing.microToMilli(event.ts);
    const dur = event.dur || Trace35.Helpers.Timing.milliToMicro(InstantEventVisibleDurationMs);
    this.#flameChartData.entryTotalTimes[index] = Trace35.Helpers.Timing.microToMilli(dur);
    return index;
  }
  /**
   * Adds into the flame chart data a list of trace events.
   * @param events the trace events that will be appended to the flame chart.
   * The events should be taken straight from the trace handlers. The handlers
   * should sort the events by start time, and the parent event is before the
   * child.
   * @param trackStartLevel the flame chart level from which the events will
   * be appended.
   * @param appender the track that the trace events belong to.
   * @param eventAppendedCallback an optional function called after the
   * event has been added to the timeline data. This allows the caller
   * to know f.e. the position of the event in the entry data. Use this
   * hook to customize the data after it has been appended, f.e. to add
   * decorations to a set of the entries.
   * @returns the next level after the last occupied by the appended these
   * trace events (the first available level to append next track).
   */
  appendEventsAtLevel(events, trackStartLevel, appender, eventAppendedCallback) {
    const lastTimestampByLevel = [];
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      if (!entryIsVisibleInTimeline(event, this.#parsedTrace)) {
        continue;
      }
      const level = getEventLevel(event, lastTimestampByLevel);
      const index = this.appendEventAtLevel(event, trackStartLevel + level, appender);
      eventAppendedCallback?.(event, index);
    }
    this.#legacyEntryTypeByLevel.length = trackStartLevel + lastTimestampByLevel.length;
    this.#legacyEntryTypeByLevel.fill("TrackAppender", trackStartLevel);
    return trackStartLevel + lastTimestampByLevel.length;
  }
  /**
   * Gets the all track appenders that have been set to be visible.
   */
  allVisibleTrackAppenders() {
    return this.#allTrackAppenders.filter((track) => this.#visibleTrackNames.has(track.appenderName));
  }
  allThreadAppendersByProcess() {
    const appenders = this.allVisibleTrackAppenders();
    const result = /* @__PURE__ */ new Map();
    for (const appender of appenders) {
      if (!(appender instanceof ThreadAppender)) {
        continue;
      }
      const existing = result.get(appender.processId()) ?? [];
      existing.push(appender);
      result.set(appender.processId(), existing);
    }
    return result;
  }
  getDrawOverride(event, level) {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error("Track not found for level");
    }
    return track.getDrawOverride?.(event);
  }
  /**
   * Returns the color an event is shown with in the timeline.
   */
  colorForEvent(event, level) {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error("Track not found for level");
    }
    return track.colorForEvent(event);
  }
  /**
   * Returns the title an event is shown with in the timeline.
   */
  titleForEvent(event, level) {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error("Track not found for level");
    }
    if (track.titleForEvent) {
      return track.titleForEvent(event);
    }
    return Trace35.Name.forEntry(event, this.#parsedTrace);
  }
  /**
   * Returns the info shown when an event in the timeline is hovered.
   */
  popoverInfo(event, level) {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error("Track not found for level");
    }
    const info = {
      title: this.titleForEvent(event, level),
      formattedTime: getDurationString(event.dur),
      warningElements: TimelineComponents7.DetailsView.buildWarningElementsForEvent(event, this.#parsedTrace),
      additionalElements: [],
      url: null
    };
    if (track.setPopoverInfo) {
      track.setPopoverInfo(event, info);
    }
    const url = URL.parse(info.url ?? SourceMapsResolver7.SourceMapsResolver.resolvedURLForEntry(this.#parsedTrace, event) ?? "");
    if (url) {
      const MAX_PATH_LENGTH = 45;
      const path = Platform16.StringUtilities.trimMiddle(url.href.replace(url.origin, ""), MAX_PATH_LENGTH);
      const urlElems = document.createElement("div");
      urlElems.createChild("span", "popoverinfo-url-path").textContent = path;
      const entity = this.#entityMapper ? this.#entityMapper.entityForEvent(event) : null;
      const originWithEntity = TimelineUtils.Helpers.formatOriginWithEntity(url, entity);
      urlElems.createChild("span", "popoverinfo-url-origin").textContent = `(${originWithEntity})`;
      info.additionalElements.push(urlElems);
    }
    return info;
  }
};

// gen/front_end/panels/timeline/timeline.prebundle.js
import * as Utils9 from "./utils/utils.js";
export {
  AnimationsTrackAppender_exports as AnimationsTrackAppender,
  AnnotationHelpers_exports as AnnotationHelpers,
  AppenderUtils_exports as AppenderUtils,
  BenchmarkEvents_exports as BenchmarkEvents,
  CompatibilityTracksAppender_exports as CompatibilityTracksAppender,
  CountersGraph_exports as CountersGraph,
  EntriesFilter_exports as EntriesFilter,
  EventsTimelineTreeView_exports as EventsTimelineTreeView,
  ExtensionTrackAppender_exports as ExtensionTrackAppender,
  GPUTrackAppender_exports as GPUTrackAppender,
  Initiators_exports as Initiators,
  InteractionsTrackAppender_exports as InteractionsTrackAppender,
  LayoutShiftsTrackAppender_exports as LayoutShiftsTrackAppender,
  ModificationsManager_exports as ModificationsManager,
  NetworkTrackAppender_exports as NetworkTrackAppender,
  RecordingMetadata_exports as RecordingMetadata,
  SaveFileFormatter_exports as SaveFileFormatter,
  TargetForEvent_exports as TargetForEvent,
  ThirdPartyTreeView_exports as ThirdPartyTreeView,
  ThreadAppender_exports as ThreadAppender,
  TimelineController_exports as TimelineController,
  TimelineDetailsView_exports as TimelineDetailsView,
  TimelineEventOverview_exports as TimelineEventOverview,
  TimelineFilters_exports as TimelineFilters,
  TimelineFlameChartDataProvider_exports as TimelineFlameChartDataProvider,
  TimelineFlameChartNetworkDataProvider_exports as TimelineFlameChartNetworkDataProvider,
  TimelineFlameChartView_exports as TimelineFlameChartView,
  TimelineHistoryManager_exports as TimelineHistoryManager,
  TimelineLayersView_exports as TimelineLayersView,
  TimelineLoader_exports as TimelineLoader,
  TimelineMiniMap_exports as TimelineMiniMap,
  TimelinePaintProfilerView_exports as TimelinePaintProfilerView,
  TimelinePanel_exports as TimelinePanel,
  TimelineSelection_exports as TimelineSelection,
  TimelineTreeView_exports as TimelineTreeView,
  TimelineUIUtils_exports as TimelineUIUtils,
  TimingsTrackAppender_exports as TimingsTrackAppender,
  TrackConfigBanner_exports as TrackConfigBanner,
  TrackConfiguration_exports as TrackConfiguration,
  UIDevtoolsController_exports as UIDevtoolsController,
  UIDevtoolsUtils_exports as UIDevtoolsUtils,
  Utils9 as Utils
};
//# sourceMappingURL=timeline.js.map
