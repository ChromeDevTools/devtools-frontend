var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/trace/helpers/Extensions.js
var Extensions_exports = {};
__export(Extensions_exports, {
  buildTrackDataFromExtensionEntries: () => buildTrackDataFromExtensionEntries
});
import * as Platform3 from "./../../../core/platform/platform.js";

// gen/front_end/models/trace/helpers/Trace.js
var Trace_exports = {};
__export(Trace_exports, {
  VISIBLE_TRACE_EVENT_TYPES: () => VISIBLE_TRACE_EVENT_TYPES,
  activeURLForFrameAtTime: () => activeURLForFrameAtTime,
  addEventToProcessThread: () => addEventToProcessThread,
  compareBeginAndEnd: () => compareBeginAndEnd,
  createMatchedSortedSyntheticEvents: () => createMatchedSortedSyntheticEvents,
  eventContainsTimestamp: () => eventContainsTimestamp,
  eventHasCategory: () => eventHasCategory,
  eventTimeComparator: () => eventTimeComparator,
  extractId: () => extractId,
  extractOriginFromTrace: () => extractOriginFromTrace,
  extractSampleTraceId: () => extractSampleTraceId,
  findNextEventAfterTimestamp: () => findNextEventAfterTimestamp,
  findPreviousEventBeforeTimestamp: () => findPreviousEventBeforeTimestamp,
  findRecalcStyleEvents: () => findRecalcStyleEvents,
  forEachEvent: () => forEachEvent,
  frameIDForEvent: () => frameIDForEvent,
  getNavigationForTraceEvent: () => getNavigationForTraceEvent,
  getStackTraceTopCallFrameInEventPayload: () => getStackTraceTopCallFrameInEventPayload,
  getSyntheticId: () => getSyntheticId,
  getZeroIndexedLineAndColumnForEvent: () => getZeroIndexedLineAndColumnForEvent,
  getZeroIndexedStackTraceInEventPayload: () => getZeroIndexedStackTraceInEventPayload,
  isExtensionUrl: () => isExtensionUrl,
  isMatchingCallFrame: () => isMatchingCallFrame,
  isTopLevelEvent: () => isTopLevelEvent,
  makeProfileCall: () => makeProfileCall,
  makeZeroBasedCallFrame: () => makeZeroBasedCallFrame,
  mergeEventsInOrder: () => mergeEventsInOrder,
  parseDevtoolsDetails: () => parseDevtoolsDetails,
  rawCallFrameForEntry: () => rawCallFrameForEntry,
  sortTraceEventsInPlace: () => sortTraceEventsInPlace,
  stackTraceInEvent: () => stackTraceInEvent
});
import * as Common from "./../../../core/common/common.js";
import * as Platform2 from "./../../../core/platform/platform.js";
import * as Types2 from "./../types/types.js";

// gen/front_end/models/trace/helpers/SyntheticEvents.js
var SyntheticEvents_exports = {};
__export(SyntheticEvents_exports, {
  SyntheticEventsManager: () => SyntheticEventsManager
});
var activeManager = null;
var SyntheticEventsManager = class _SyntheticEventsManager {
  /**
   * All synthetic entries created in a trace from a corresponding trace events.
   * (ProfileCalls are excluded because they are not based on a real trace event)
   */
  #syntheticTraces = [];
  /**
   * All raw entries from a trace.
   */
  #rawTraceEvents = [];
  static activate(manager) {
    activeManager = manager;
  }
  static createAndActivate(rawEvents) {
    const manager = new _SyntheticEventsManager(rawEvents);
    _SyntheticEventsManager.activate(manager);
    return manager;
  }
  static getActiveManager() {
    if (!activeManager) {
      throw new Error("Attempted to get a SyntheticEventsManager without initializing");
    }
    return activeManager;
  }
  static reset() {
    activeManager = null;
  }
  static registerSyntheticEvent(syntheticEvent) {
    try {
      return _SyntheticEventsManager.getActiveManager().#registerSyntheticEvent(syntheticEvent);
    } catch {
      return syntheticEvent;
    }
  }
  constructor(rawEvents) {
    this.#rawTraceEvents = rawEvents;
  }
  /**
   * Registers and returns a branded synthetic event. Synthetic events need to
   * be created with this method to ensure they are registered and made
   * available to load events using serialized keys.
   */
  #registerSyntheticEvent(syntheticEvent) {
    const rawIndex = this.#rawTraceEvents.indexOf(syntheticEvent.rawSourceEvent);
    if (rawIndex < 0) {
      throw new Error("Attempted to register a synthetic event paired to an unknown raw event.");
    }
    const eventAsSynthetic = syntheticEvent;
    this.#syntheticTraces[rawIndex] = eventAsSynthetic;
    return eventAsSynthetic;
  }
  syntheticEventForRawEventIndex(rawEventIndex) {
    const syntheticEvent = this.#syntheticTraces.at(rawEventIndex);
    if (!syntheticEvent) {
      throw new Error(`Attempted to get a synthetic event from an unknown raw event index: ${rawEventIndex}`);
    }
    return syntheticEvent;
  }
  getSyntheticTraces() {
    return this.#syntheticTraces;
  }
  getRawTraceEvents() {
    return this.#rawTraceEvents;
  }
};

// gen/front_end/models/trace/helpers/Timing.js
var Timing_exports = {};
__export(Timing_exports, {
  boundsIncludeTimeRange: () => boundsIncludeTimeRange,
  combineTraceWindowsMicro: () => combineTraceWindowsMicro,
  eventIsInBounds: () => eventIsInBounds,
  eventTimingsMicroSeconds: () => eventTimingsMicroSeconds,
  eventTimingsMilliSeconds: () => eventTimingsMilliSeconds,
  expandWindowByPercentOrToOneMillisecond: () => expandWindowByPercentOrToOneMillisecond,
  microToMilli: () => microToMilli,
  microToSeconds: () => microToSeconds,
  milliToMicro: () => milliToMicro,
  secondsToMicro: () => secondsToMicro,
  secondsToMilli: () => secondsToMilli,
  timeStampForEventAdjustedByClosestNavigation: () => timeStampForEventAdjustedByClosestNavigation,
  timestampIsInBounds: () => timestampIsInBounds,
  traceWindowFromEvent: () => traceWindowFromEvent,
  traceWindowFromMicroSeconds: () => traceWindowFromMicroSeconds,
  traceWindowFromMilliSeconds: () => traceWindowFromMilliSeconds,
  traceWindowFromOverlay: () => traceWindowFromOverlay,
  traceWindowMicroSecondsToMilliSeconds: () => traceWindowMicroSecondsToMilliSeconds,
  traceWindowMilliSeconds: () => traceWindowMilliSeconds,
  windowFitsInsideBounds: () => windowFitsInsideBounds,
  windowsEqual: () => windowsEqual
});
import * as Platform from "./../../../core/platform/platform.js";
import * as Types from "./../types/types.js";
var milliToMicro = (value) => Types.Timing.Micro(value * 1e3);
var secondsToMilli = (value) => Types.Timing.Milli(value * 1e3);
var secondsToMicro = (value) => milliToMicro(secondsToMilli(value));
var microToMilli = (value) => Types.Timing.Milli(value / 1e3);
var microToSeconds = (value) => Types.Timing.Seconds(value / 1e3 / 1e3);
function timeStampForEventAdjustedByClosestNavigation(event, traceBounds, navigationsByNavigationId, navigationsByFrameId) {
  let eventTimeStamp = event.ts - traceBounds.min;
  if (event.args?.data?.navigationId) {
    const navigationForEvent = navigationsByNavigationId.get(event.args.data.navigationId);
    if (navigationForEvent) {
      eventTimeStamp = event.ts - navigationForEvent.ts;
    }
  } else if (event.args?.data?.frame) {
    const navigationForEvent = getNavigationForTraceEvent(event, event.args.data.frame, navigationsByFrameId);
    if (navigationForEvent) {
      eventTimeStamp = event.ts - navigationForEvent.ts;
    }
  }
  return Types.Timing.Micro(eventTimeStamp);
}
function expandWindowByPercentOrToOneMillisecond(annotationWindow, maxTraceWindow, percentage) {
  let newMin = annotationWindow.min - annotationWindow.range * (percentage / 100) / 2;
  let newMax = annotationWindow.max + annotationWindow.range * (percentage / 100) / 2;
  if (newMax - newMin < 1e3) {
    const rangeMiddle = (annotationWindow.min + annotationWindow.max) / 2;
    newMin = rangeMiddle - 500;
    newMax = rangeMiddle + 500;
  }
  newMin = Math.max(newMin, maxTraceWindow.min);
  newMax = Math.min(newMax, maxTraceWindow.max);
  const expandedWindow = {
    min: Types.Timing.Micro(newMin),
    max: Types.Timing.Micro(newMax),
    range: Types.Timing.Micro(newMax - newMin)
  };
  return expandedWindow;
}
function eventTimingsMicroSeconds(event) {
  return {
    startTime: event.ts,
    endTime: event.ts + (event.dur ?? 0),
    duration: event.dur || 0
  };
}
function eventTimingsMilliSeconds(event) {
  return {
    startTime: event.ts / 1e3,
    endTime: (event.ts + (event.dur ?? 0)) / 1e3,
    duration: (event.dur || 0) / 1e3
  };
}
function traceWindowMilliSeconds(bounds) {
  return {
    min: microToMilli(bounds.min),
    max: microToMilli(bounds.max),
    range: microToMilli(bounds.range)
  };
}
function traceWindowMicroSecondsToMilliSeconds(bounds) {
  return {
    min: microToMilli(bounds.min),
    max: microToMilli(bounds.max),
    range: microToMilli(bounds.range)
  };
}
function traceWindowFromMilliSeconds(min, max) {
  const traceWindow = {
    min: milliToMicro(min),
    max: milliToMicro(max),
    range: Types.Timing.Micro(milliToMicro(max) - milliToMicro(min))
  };
  return traceWindow;
}
function traceWindowFromMicroSeconds(min, max) {
  const traceWindow = {
    min,
    max,
    range: max - min
  };
  return traceWindow;
}
function traceWindowFromEvent(event) {
  return {
    min: event.ts,
    max: event.ts + (event.dur ?? 0),
    range: event.dur ?? 0
  };
}
function traceWindowFromOverlay(overlay) {
  switch (overlay.type) {
    case "ENTRY_LABEL":
    case "ENTRY_OUTLINE":
    case "ENTRY_SELECTED": {
      return traceWindowFromEvent(overlay.entry);
    }
    case "TIMESPAN_BREAKDOWN": {
      const windows = overlay.sections.map((s) => s.bounds);
      if (overlay.entry) {
        windows.push(traceWindowFromEvent(overlay.entry));
      }
      return combineTraceWindowsMicro(windows);
    }
    case "CANDY_STRIPED_TIME_RANGE":
    case "TIME_RANGE": {
      return structuredClone(overlay.bounds);
    }
    case "ENTRIES_LINK": {
      const from = traceWindowFromEvent(overlay.entryFrom);
      if (!overlay.entryTo) {
        return from;
      }
      const to = traceWindowFromEvent(overlay.entryTo);
      return combineTraceWindowsMicro([from, to]);
    }
    case "TIMESTAMP_MARKER":
      return traceWindowFromMicroSeconds(overlay.timestamp, overlay.timestamp);
    case "TIMINGS_MARKER":
      return traceWindowFromMicroSeconds(overlay.adjustedTimestamp, overlay.adjustedTimestamp);
    case "BOTTOM_INFO_BAR":
      return null;
    default:
      Platform.TypeScriptUtilities.assertNever(overlay, `Unexpected overlay ${overlay}`);
  }
}
function combineTraceWindowsMicro(windows) {
  if (!windows.length) {
    return null;
  }
  const result = structuredClone(windows[0]);
  for (const bounds of windows.slice(1)) {
    result.min = Math.min(result.min, bounds.min);
    result.max = Math.max(result.max, bounds.max);
  }
  result.range = result.max - result.min;
  return result;
}
function boundsIncludeTimeRange(data) {
  const { min: visibleMin, max: visibleMax } = data.bounds;
  const { min: rangeMin, max: rangeMax } = data.timeRange;
  return visibleMin <= rangeMax && visibleMax >= rangeMin;
}
function eventIsInBounds(event, bounds) {
  const startTime = event.ts;
  return startTime <= bounds.max && bounds.min < startTime + (event.dur ?? 0);
}
function timestampIsInBounds(bounds, timestamp) {
  return timestamp >= bounds.min && timestamp <= bounds.max;
}
function windowFitsInsideBounds(data) {
  return data.window.min >= data.bounds.min && data.window.max <= data.bounds.max;
}
function windowsEqual(w1, w2) {
  return w1.min === w2.min && w1.max === w2.max;
}

// gen/front_end/models/trace/helpers/Trace.js
function stackTraceInEvent(event) {
  if (event.args?.data?.stackTrace) {
    return event.args.data.stackTrace;
  }
  if (event.args?.stackTrace) {
    return event.args.stackTrace;
  }
  if (Types2.Events.isRecalcStyle(event)) {
    return event.args.beginData?.stackTrace || null;
  }
  if (Types2.Events.isLayout(event)) {
    return event.args.beginData.stackTrace ?? null;
  }
  if (Types2.Events.isFunctionCall(event)) {
    const data = event.args.data;
    if (!data) {
      return null;
    }
    const { columnNumber, lineNumber, url, scriptId, functionName } = data;
    if (lineNumber === void 0 || functionName === void 0 || columnNumber === void 0 || scriptId === void 0 || url === void 0) {
      return null;
    }
    return [{ columnNumber, lineNumber, url, scriptId, functionName }];
  }
  if (Types2.Events.isProfileCall(event)) {
    const callFrame = event.callFrame;
    if (!callFrame) {
      return null;
    }
    const { columnNumber, lineNumber, url, scriptId, functionName } = callFrame;
    if (lineNumber === void 0 || functionName === void 0 || columnNumber === void 0 || scriptId === void 0 || url === void 0) {
      return null;
    }
    return [{ columnNumber, lineNumber, url, scriptId, functionName }];
  }
  return null;
}
function extractOriginFromTrace(firstNavigationURL) {
  const url = Common.ParsedURL.ParsedURL.fromString(firstNavigationURL);
  if (url) {
    if (url.host.startsWith("www.")) {
      return url.host.slice(4);
    }
    return url.host;
  }
  return null;
}
function addEventToProcessThread(event, eventsInProcessThread) {
  const { tid, pid } = event;
  let eventsInThread = eventsInProcessThread.get(pid);
  if (!eventsInThread) {
    eventsInThread = /* @__PURE__ */ new Map();
  }
  let events = eventsInThread.get(tid);
  if (!events) {
    events = [];
  }
  events.push(event);
  eventsInThread.set(event.tid, events);
  eventsInProcessThread.set(event.pid, eventsInThread);
}
function compareBeginAndEnd(aBeginTime, bBeginTime, aEndTime, bEndTime) {
  if (aBeginTime < bBeginTime) {
    return -1;
  }
  if (aBeginTime > bBeginTime) {
    return 1;
  }
  if (aEndTime > bEndTime) {
    return -1;
  }
  if (aEndTime < bEndTime) {
    return 1;
  }
  return 0;
}
function eventTimeComparator(a, b) {
  const aBeginTime = a.ts;
  const bBeginTime = b.ts;
  const aDuration = a.dur ?? 0;
  const bDuration = b.dur ?? 0;
  const aEndTime = aBeginTime + aDuration;
  const bEndTime = bBeginTime + bDuration;
  const timeDifference = compareBeginAndEnd(aBeginTime, bBeginTime, aEndTime, bEndTime);
  if (timeDifference) {
    return timeDifference;
  }
  if (Types2.Events.isProfileCall(a) && !Types2.Events.isProfileCall(b)) {
    return -1;
  }
  if (Types2.Events.isProfileCall(b) && !Types2.Events.isProfileCall(a)) {
    return 1;
  }
  return 0;
}
function sortTraceEventsInPlace(events) {
  events.sort(eventTimeComparator);
}
function mergeEventsInOrder(eventsArray1, eventsArray2) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < eventsArray1.length && j < eventsArray2.length) {
    const event1 = eventsArray1[i];
    const event2 = eventsArray2[j];
    const compareValue = eventTimeComparator(event1, event2);
    if (compareValue <= 0) {
      result.push(event1);
      i++;
    }
    if (compareValue === 1) {
      result.push(event2);
      j++;
    }
  }
  while (i < eventsArray1.length) {
    result.push(eventsArray1[i++]);
  }
  while (j < eventsArray2.length) {
    result.push(eventsArray2[j++]);
  }
  return result;
}
function parseDevtoolsDetails(timingDetail, key) {
  try {
    const detailObj = JSON.parse(timingDetail);
    if (!(key in detailObj)) {
      return null;
    }
    if (!Types2.Extensions.isValidExtensionPayload(detailObj[key])) {
      return null;
    }
    return detailObj[key];
  } catch {
    return null;
  }
}
function getNavigationForTraceEvent(event, eventFrameId, navigationsByFrameId) {
  const navigations = navigationsByFrameId.get(eventFrameId);
  if (!navigations || eventFrameId === "") {
    return null;
  }
  const eventNavigationIndex = Platform2.ArrayUtilities.nearestIndexFromEnd(navigations, (navigation) => navigation.ts <= event.ts);
  if (eventNavigationIndex === null) {
    return null;
  }
  return navigations[eventNavigationIndex];
}
function extractId(event) {
  return event.id ?? event.id2?.global ?? event.id2?.local;
}
function activeURLForFrameAtTime(frameId, time, rendererProcessesByFrame) {
  const processData = rendererProcessesByFrame.get(frameId);
  if (!processData) {
    return null;
  }
  for (const processes of processData.values()) {
    for (const processInfo of processes) {
      if (processInfo.window.min > time || processInfo.window.max < time) {
        continue;
      }
      return processInfo.frame.url;
    }
  }
  return null;
}
function makeProfileCall(node, profileId, sampleIndex, ts, pid, tid) {
  return {
    cat: "",
    name: "ProfileCall",
    nodeId: node.id,
    args: {},
    ph: "X",
    pid,
    tid,
    ts,
    dur: Types2.Timing.Micro(0),
    callFrame: node.callFrame,
    sampleIndex,
    profileId
  };
}
function matchEvents(unpairedEvents) {
  sortTraceEventsInPlace(unpairedEvents);
  const matches = [];
  const beginEventsById = /* @__PURE__ */ new Map();
  const instantEventsById = /* @__PURE__ */ new Map();
  for (const event of unpairedEvents) {
    const id = getSyntheticId(event);
    if (id === void 0) {
      continue;
    }
    if (Types2.Events.isPairableAsyncBegin(event)) {
      const existingEvents = beginEventsById.get(id) ?? [];
      existingEvents.push(event);
      beginEventsById.set(id, existingEvents);
    } else if (Types2.Events.isPairableAsyncInstant(event)) {
      const existingEvents = instantEventsById.get(id) ?? [];
      existingEvents.push(event);
      instantEventsById.set(id, existingEvents);
    } else if (Types2.Events.isPairableAsyncEnd(event)) {
      const beginEventsWithMatchingId = beginEventsById.get(id) ?? [];
      const beginEvent = beginEventsWithMatchingId.pop();
      if (!beginEvent) {
        continue;
      }
      const instantEventsWithMatchingId = instantEventsById.get(id) ?? [];
      const instantEventsForThisGroup = [];
      while (instantEventsWithMatchingId.length > 0) {
        if (instantEventsWithMatchingId[0].ts >= beginEvent.ts) {
          const event2 = instantEventsWithMatchingId.pop();
          if (event2) {
            instantEventsForThisGroup.push(event2);
          }
        } else {
          break;
        }
      }
      const matchingGroup = {
        begin: beginEvent,
        end: event,
        instant: instantEventsForThisGroup,
        syntheticId: id
      };
      matches.push(matchingGroup);
    }
  }
  for (const [id, beginEvents] of beginEventsById) {
    const beginEvent = beginEvents.pop();
    if (!beginEvent) {
      continue;
    }
    const matchingInstantEvents = instantEventsById.get(id);
    if (matchingInstantEvents?.length) {
      matches.push({
        syntheticId: id,
        begin: beginEvent,
        end: null,
        instant: matchingInstantEvents
      });
    }
  }
  return matches;
}
function getSyntheticId(event) {
  const id = extractId(event);
  return id && `${event.cat}:${id}:${event.name}`;
}
function createSortedSyntheticEvents(matchedPairs) {
  const syntheticEvents = [];
  for (const eventsTriplet of matchedPairs) {
    let eventsArePairable = function(data) {
      const instantEventsMatch = data.instantEvents ? data.instantEvents.some((e) => id === getSyntheticId(e)) : false;
      const endEventMatch = data.endEvent ? id === getSyntheticId(data.endEvent) : false;
      return Boolean(id) && (instantEventsMatch || endEventMatch);
    };
    const id = eventsTriplet.syntheticId;
    const beginEvent = eventsTriplet.begin;
    const endEvent = eventsTriplet.end;
    const instantEvents = eventsTriplet.instant;
    if (!beginEvent || !(endEvent || instantEvents)) {
      continue;
    }
    const triplet = { beginEvent, endEvent, instantEvents };
    if (!eventsArePairable(triplet)) {
      continue;
    }
    const targetEvent = endEvent || beginEvent;
    const event = SyntheticEventsManager.registerSyntheticEvent({
      rawSourceEvent: triplet.beginEvent,
      cat: targetEvent.cat,
      ph: targetEvent.ph,
      pid: targetEvent.pid,
      tid: targetEvent.tid,
      id,
      // Both events have the same name, so it doesn't matter which we pick to
      // use as the description
      name: beginEvent.name,
      dur: Types2.Timing.Micro(targetEvent.ts - beginEvent.ts),
      ts: beginEvent.ts,
      args: {
        data: triplet
      }
    });
    if (event.dur < 0) {
      continue;
    }
    syntheticEvents.push(event);
  }
  sortTraceEventsInPlace(syntheticEvents);
  return syntheticEvents;
}
function createMatchedSortedSyntheticEvents(unpairedAsyncEvents) {
  const matchedPairs = matchEvents(unpairedAsyncEvents);
  const syntheticEvents = createSortedSyntheticEvents(matchedPairs);
  return syntheticEvents;
}
function getZeroIndexedLineAndColumnForEvent(event) {
  const numbers = getRawLineAndColumnNumbersForEvent(event);
  const { lineNumber, columnNumber } = numbers;
  switch (event.name) {
    // All these events have line/column numbers which are 1 indexed; so we
    // subtract to make them 0 indexed.
    case "FunctionCall":
    case "EvaluateScript":
    case "v8.compile":
    case "v8.produceCache": {
      return {
        lineNumber: typeof lineNumber === "number" ? lineNumber - 1 : void 0,
        columnNumber: typeof columnNumber === "number" ? columnNumber - 1 : void 0
      };
    }
    case "ProfileCall": {
      const callFrame = event.callFrame;
      return {
        lineNumber: typeof lineNumber === "number" ? callFrame.lineNumber - 1 : void 0,
        columnNumber: typeof columnNumber === "number" ? callFrame.columnNumber - 1 : void 0
      };
    }
    default: {
      return numbers;
    }
  }
}
function getZeroIndexedStackTraceInEventPayload(event) {
  const stack = stackTraceInEvent(event);
  if (!stack) {
    return null;
  }
  switch (event.name) {
    case "ScheduleStyleRecalculation":
    case "InvalidateLayout":
    case "FunctionCall":
    case "Layout":
    case "UpdateLayoutTree": {
      return stack.map(makeZeroBasedCallFrame);
    }
    default: {
      if (Types2.Events.isUserTiming(event) || Types2.Extensions.isSyntheticExtensionEntry(event)) {
        return stack.map(makeZeroBasedCallFrame);
      }
      return stack;
    }
  }
}
function getStackTraceTopCallFrameInEventPayload(event) {
  const stack = stackTraceInEvent(event);
  if (!stack || stack.length === 0) {
    return null;
  }
  switch (event.name) {
    case "ScheduleStyleRecalculation":
    case "InvalidateLayout":
    case "FunctionCall":
    case "Layout":
    case "UpdateLayoutTree": {
      return makeZeroBasedCallFrame(stack[0]);
    }
    default: {
      if (Types2.Events.isUserTiming(event) || Types2.Extensions.isSyntheticExtensionEntry(event)) {
        return makeZeroBasedCallFrame(stack[0]);
      }
      return stack[0];
    }
  }
}
function rawCallFrameForEntry(entry) {
  if (Types2.Events.isProfileCall(entry)) {
    return entry.callFrame;
  }
  const topCallFrame = getStackTraceTopCallFrameInEventPayload(entry);
  if (topCallFrame) {
    return topCallFrame;
  }
  return null;
}
function makeZeroBasedCallFrame(callFrame) {
  const normalizedCallFrame = { ...callFrame };
  normalizedCallFrame.lineNumber = callFrame.lineNumber && callFrame.lineNumber - 1;
  normalizedCallFrame.columnNumber = callFrame.columnNumber && callFrame.columnNumber - 1;
  return normalizedCallFrame;
}
function getRawLineAndColumnNumbersForEvent(event) {
  if (!event.args?.data) {
    return {
      lineNumber: void 0,
      columnNumber: void 0
    };
  }
  let lineNumber = void 0;
  let columnNumber = void 0;
  if ("lineNumber" in event.args.data && typeof event.args.data.lineNumber === "number") {
    lineNumber = event.args.data.lineNumber;
  }
  if ("columnNumber" in event.args.data && typeof event.args.data.columnNumber === "number") {
    columnNumber = event.args.data.columnNumber;
  }
  return { lineNumber, columnNumber };
}
function frameIDForEvent(event) {
  if (event.args && "beginData" in event.args && typeof event.args.beginData === "object" && event.args.beginData !== null && "frame" in event.args.beginData && typeof event.args.beginData.frame === "string") {
    return event.args.beginData.frame;
  }
  if (event.args?.data?.frame) {
    return event.args.data.frame;
  }
  return null;
}
var DevToolsTimelineEventCategory = "disabled-by-default-devtools.timeline";
function isTopLevelEvent(event) {
  return event.cat.includes(DevToolsTimelineEventCategory) && event.name === "RunTask";
}
function isExtensionUrl(url) {
  return url.startsWith("extensions:") || url.startsWith("chrome-extension:");
}
function topLevelEventIndexEndingAfter(events, time) {
  let index = Platform2.ArrayUtilities.upperBound(events, time, (time2, event) => time2 - event.ts) - 1;
  while (index > 0 && !isTopLevelEvent(events[index])) {
    index--;
  }
  return Math.max(index, 0);
}
function findRecalcStyleEvents(events, startTime, endTime) {
  const foundEvents = [];
  const startEventIndex = topLevelEventIndexEndingAfter(events, startTime);
  for (let i = startEventIndex; i < events.length; i++) {
    const event = events[i];
    if (!Types2.Events.isRecalcStyle(event)) {
      continue;
    }
    if (event.ts >= (endTime || Infinity)) {
      continue;
    }
    foundEvents.push(event);
  }
  return foundEvents;
}
function findNextEventAfterTimestamp(candidates, ts) {
  const index = Platform2.ArrayUtilities.nearestIndexFromBeginning(candidates, (candidate) => ts < candidate.ts);
  return index === null ? null : candidates[index];
}
function findPreviousEventBeforeTimestamp(candidates, ts) {
  const index = Platform2.ArrayUtilities.nearestIndexFromEnd(candidates, (candidate) => candidate.ts < ts);
  return index === null ? null : candidates[index];
}
function forEachEvent(events, config) {
  const globalStartTime = config.startTime ?? Types2.Timing.Micro(0);
  const globalEndTime = config.endTime || Types2.Timing.Micro(Infinity);
  const ignoreAsyncEvents = config.ignoreAsyncEvents === false ? false : true;
  const stack = [];
  const startEventIndex = topLevelEventIndexEndingAfter(events, globalStartTime);
  for (let i = startEventIndex; i < events.length; i++) {
    const currentEvent = events[i];
    const currentEventTimings = eventTimingsMicroSeconds(currentEvent);
    if (currentEventTimings.endTime < globalStartTime) {
      continue;
    }
    if (currentEventTimings.startTime > globalEndTime) {
      break;
    }
    const isIgnoredAsyncEvent = ignoreAsyncEvents && Types2.Events.isPhaseAsync(currentEvent.ph);
    if (isIgnoredAsyncEvent || Types2.Events.isFlowPhase(currentEvent.ph)) {
      continue;
    }
    let lastEventOnStack = stack.at(-1);
    let lastEventEndTime = lastEventOnStack ? eventTimingsMicroSeconds(lastEventOnStack).endTime : null;
    while (lastEventOnStack && lastEventEndTime && lastEventEndTime <= currentEventTimings.startTime) {
      stack.pop();
      config.onEndEvent(lastEventOnStack);
      lastEventOnStack = stack.at(-1);
      lastEventEndTime = lastEventOnStack ? eventTimingsMicroSeconds(lastEventOnStack).endTime : null;
    }
    if (config.eventFilter && !config.eventFilter(currentEvent)) {
      continue;
    }
    if (currentEventTimings.duration) {
      config.onStartEvent(currentEvent);
      stack.push(currentEvent);
    } else if (config.onInstantEvent) {
      config.onInstantEvent(currentEvent);
    }
  }
  while (stack.length) {
    const last = stack.pop();
    if (last) {
      config.onEndEvent(last);
    }
  }
}
var parsedCategories = /* @__PURE__ */ new Map();
function eventHasCategory(event, category) {
  let parsedCategoriesForEvent = parsedCategories.get(event.cat);
  if (!parsedCategoriesForEvent) {
    parsedCategoriesForEvent = new Set(event.cat.split(",") || []);
  }
  return parsedCategoriesForEvent.has(category);
}
function isMatchingCallFrame(eventFrame, nodeFrame) {
  return eventFrame.columnNumber === nodeFrame.columnNumber && eventFrame.lineNumber === nodeFrame.lineNumber && String(eventFrame.scriptId) === nodeFrame.scriptId && eventFrame.url === nodeFrame.url && eventFrame.functionName === nodeFrame.functionName;
}
function eventContainsTimestamp(event, ts) {
  return event.ts <= ts && event.ts + (event.dur || 0) >= ts;
}
function extractSampleTraceId(event) {
  if (!event.args) {
    return null;
  }
  if ("beginData" in event.args) {
    const beginData = event.args["beginData"];
    return beginData.sampleTraceId ?? null;
  }
  return event.args?.sampleTraceId ?? event.args?.data?.sampleTraceId ?? null;
}
var VISIBLE_TRACE_EVENT_TYPES = /* @__PURE__ */ new Set([
  "AbortPostTaskCallback",
  "Animation",
  "AsyncTask",
  "v8.deserializeOnBackground",
  "v8.produceModuleCache",
  "v8.produceCache",
  "CancelAnimationFrame",
  "CancelIdleCallback",
  "Commit",
  "V8.CompileCode",
  "V8.CompileModule",
  "v8.compile",
  "CompositeLayers",
  "ComputeIntersections",
  "ConsoleTime",
  "CppGC.IncrementalSweep",
  "DoDecryptReply",
  "DoDecrypt",
  "DoDigestReply",
  "DoDigest",
  "DoEncryptReply",
  "DoEncrypt",
  "DoSignReply",
  "DoSign",
  "DoVerifyReply",
  "DoVerify",
  "Decode Image",
  "EmbedderCallback",
  "v8.evaluateModule",
  "EvaluateScript",
  "EventDispatch",
  "EventTiming",
  "V8.FinalizeDeserialization",
  "FireAnimationFrame",
  "FireIdleCallback",
  "FunctionCall",
  "BlinkGC.AtomicPhase",
  "GCEvent",
  "GPUTask",
  "HandlePostMessage",
  "HitTest",
  "JSSample",
  "Layerize",
  "Layout",
  "MajorGC",
  "MinorGC",
  "V8.OptimizeCode",
  "PaintSetup",
  "Paint",
  "ParseAuthorStyleSheet",
  "ParseHTML",
  "PrePaint",
  "ProfileCall",
  "Program",
  "RasterTask",
  "RequestAnimationFrame",
  "RequestIdleCallback",
  "ResourceFinish",
  "ResourceReceivedData",
  "ResourceReceiveResponse",
  "ResourceSendRequest",
  "ResourceWillSendRequest",
  "RunMicrotasks",
  "RunPostTaskCallback",
  "RunTask",
  "SchedulePostMessage",
  "SchedulePostTaskCallback",
  "ScheduleStyleRecalculation",
  "ScrollLayer",
  "CpuProfiler::StartProfiling",
  "v8.parseOnBackgroundParsing",
  "v8.parseOnBackgroundWaiting",
  "v8.parseOnBackground",
  "SyntheticLayoutShiftCluster",
  "SyntheticLayoutShift",
  "TimeStamp",
  "TimerFire",
  "TimerInstall",
  "TimerRemove",
  "UpdateLayerTree",
  "UpdateLayoutTree",
  "UserTiming",
  "V8Console::runTask",
  "v8.wasm.cachedModule",
  "v8.wasm.compiledModule",
  "v8.wasm.moduleCacheHit",
  "v8.wasm.moduleCacheInvalid",
  "v8.wasm.streamFromResponseCallback",
  "WebSocketCreate",
  "WebSocketDestroy",
  "WebSocketReceiveHandshakeResponse",
  "WebSocketReceive",
  "WebSocketSendHandshakeRequest",
  "WebSocketSend",
  "XHRLoad",
  "XHRReadyStateChange"
]);

// gen/front_end/models/trace/helpers/TreeHelpers.js
var TreeHelpers_exports = {};
__export(TreeHelpers_exports, {
  canBuildTreesFromEvents: () => canBuildTreesFromEvents,
  makeEmptyTraceEntryNode: () => makeEmptyTraceEntryNode,
  makeEmptyTraceEntryTree: () => makeEmptyTraceEntryTree,
  makeTraceEntryNodeId: () => makeTraceEntryNodeId,
  treify: () => treify,
  walkEntireTree: () => walkEntireTree,
  walkTreeFromEntry: () => walkTreeFromEntry
});
import * as Types3 from "./../types/types.js";
var nodeIdCount = 0;
var makeTraceEntryNodeId = () => ++nodeIdCount;
var makeEmptyTraceEntryTree = () => ({
  roots: /* @__PURE__ */ new Set(),
  maxDepth: 0
});
var makeEmptyTraceEntryNode = (entry, id) => ({
  entry,
  id,
  parent: null,
  children: [],
  depth: 0
});
function treify(entries, options) {
  const entryToNode = /* @__PURE__ */ new Map();
  const stack = [];
  nodeIdCount = -1;
  const tree = makeEmptyTraceEntryTree();
  for (let i = 0; i < entries.length; i++) {
    const event = entries[i];
    if (options && !options.filter.has(event.name)) {
      continue;
    }
    const duration = event.dur || 0;
    const nodeId = makeTraceEntryNodeId();
    const node = makeEmptyTraceEntryNode(event, nodeId);
    if (stack.length === 0) {
      tree.roots.add(node);
      node.selfTime = Types3.Timing.Micro(duration);
      stack.push(node);
      tree.maxDepth = Math.max(tree.maxDepth, stack.length);
      entryToNode.set(event, node);
      continue;
    }
    const parentNode = stack.at(-1);
    if (parentNode === void 0) {
      throw new Error("Impossible: no parent node found in the stack");
    }
    const parentEvent = parentNode.entry;
    const begin = event.ts;
    const parentBegin = parentEvent.ts;
    const parentDuration = parentEvent.dur || 0;
    const end = begin + duration;
    const parentEnd = parentBegin + parentDuration;
    const startsBeforeParent = begin < parentBegin;
    if (startsBeforeParent) {
      throw new Error("Impossible: current event starts before the parent event");
    }
    const startsAfterParent = begin >= parentEnd;
    if (startsAfterParent) {
      stack.pop();
      i--;
      nodeIdCount--;
      continue;
    }
    const endsAfterParent = end > parentEnd;
    if (endsAfterParent) {
      continue;
    }
    node.depth = stack.length;
    node.parent = parentNode;
    parentNode.children.push(node);
    node.selfTime = Types3.Timing.Micro(duration);
    if (parentNode.selfTime !== void 0) {
      parentNode.selfTime = Types3.Timing.Micro(parentNode.selfTime - (event.dur || 0));
    }
    stack.push(node);
    tree.maxDepth = Math.max(tree.maxDepth, stack.length);
    entryToNode.set(event, node);
  }
  return { tree, entryToNode };
}
function walkTreeFromEntry(entryToNode, rootEntry, onEntryStart, onEntryEnd) {
  const startNode = entryToNode.get(rootEntry);
  if (!startNode) {
    return;
  }
  walkTreeByNode(entryToNode, startNode, onEntryStart, onEntryEnd);
}
function walkEntireTree(entryToNode, tree, onEntryStart, onEntryEnd, traceWindowToInclude, minDuration) {
  for (const rootNode of tree.roots) {
    walkTreeByNode(entryToNode, rootNode, onEntryStart, onEntryEnd, traceWindowToInclude, minDuration);
  }
}
function walkTreeByNode(entryToNode, rootNode, onEntryStart, onEntryEnd, traceWindowToInclude, minDuration) {
  if (traceWindowToInclude && !treeNodeIsInWindow(rootNode, traceWindowToInclude)) {
    return;
  }
  if (typeof minDuration !== "undefined") {
    const duration = Types3.Timing.Micro(rootNode.entry.ts + Types3.Timing.Micro(rootNode.entry.dur ?? 0));
    if (duration < minDuration) {
      return;
    }
  }
  onEntryStart(rootNode.entry);
  for (const child of rootNode.children) {
    walkTreeByNode(entryToNode, child, onEntryStart, onEntryEnd, traceWindowToInclude, minDuration);
  }
  onEntryEnd(rootNode.entry);
}
function treeNodeIsInWindow(node, traceWindow) {
  return eventIsInBounds(node.entry, traceWindow);
}
function canBuildTreesFromEvents(events) {
  const stack = [];
  for (const event of events) {
    const startTime = event.ts;
    const endTime = event.ts + (event.dur ?? 0);
    let parent = stack.at(-1);
    if (parent === void 0) {
      stack.push(event);
      continue;
    }
    let parentEndTime = parent.ts + (parent.dur ?? 0);
    while (stack.length && startTime >= parentEndTime) {
      stack.pop();
      parent = stack.at(-1);
      if (parent === void 0) {
        break;
      }
      parentEndTime = parent.ts + (parent.dur ?? 0);
    }
    if (stack.length && endTime > parentEndTime) {
      return false;
    }
    stack.push(event);
  }
  return true;
}

// gen/front_end/models/trace/helpers/Extensions.js
function buildTrackDataFromExtensionEntries(extensionEntries, extensionTrackData, entryToNode) {
  const dataByTrack = /* @__PURE__ */ new Map();
  for (const entry of extensionEntries) {
    const key = entry.devtoolsObj.trackGroup || `track-name-${entry.devtoolsObj.track}`;
    const batchedData = Platform3.MapUtilities.getWithDefault(dataByTrack, key, () => ({
      name: entry.devtoolsObj.trackGroup || entry.devtoolsObj.track,
      isTrackGroup: Boolean(entry.devtoolsObj.trackGroup),
      entriesByTrack: { [entry.devtoolsObj.track]: [] }
    }));
    if (!batchedData.entriesByTrack[entry.devtoolsObj.track]) {
      batchedData.entriesByTrack[entry.devtoolsObj.track] = [];
    }
    const entriesInTrack = batchedData.entriesByTrack[entry.devtoolsObj.track];
    entriesInTrack.push(entry);
  }
  for (const trackData of dataByTrack.values()) {
    for (const entries of Object.values(trackData.entriesByTrack)) {
      sortTraceEventsInPlace(entries);
      if (canBuildTreesFromEvents(entries)) {
        for (const [entry, node] of treify(entries).entryToNode) {
          entryToNode.set(entry, node);
        }
      }
    }
    extensionTrackData.push(trackData);
  }
  return { extensionTrackData, entryToNode };
}

// gen/front_end/models/trace/helpers/Network.js
var Network_exports = {};
__export(Network_exports, {
  CACHEABLE_STATUS_CODES: () => CACHEABLE_STATUS_CODES,
  NON_NETWORK_SCHEMES: () => NON_NETWORK_SCHEMES,
  STATIC_RESOURCE_TYPES: () => STATIC_RESOURCE_TYPES,
  isSyntheticNetworkRequestEventRenderBlocking: () => isSyntheticNetworkRequestEventRenderBlocking,
  isSyntheticNetworkRequestHighPriority: () => isSyntheticNetworkRequestHighPriority,
  isSyntheticNetworkRequestLocalhost: () => isSyntheticNetworkRequestLocalhost,
  parseCacheControl: () => parseCacheControl
});
var NON_RENDER_BLOCKING_VALUES = /* @__PURE__ */ new Set([
  "non_blocking",
  "dynamically_injected_non_blocking",
  "potentially_blocking"
]);
function isSyntheticNetworkRequestEventRenderBlocking(event) {
  return !NON_RENDER_BLOCKING_VALUES.has(event.args.data.renderBlocking);
}
var HIGH_NETWORK_PRIORITIES = /* @__PURE__ */ new Set([
  "VeryHigh",
  "High",
  "Medium"
]);
function isSyntheticNetworkRequestHighPriority(event) {
  return HIGH_NETWORK_PRIORITIES.has(event.args.data.priority);
}
var CACHEABLE_STATUS_CODES = /* @__PURE__ */ new Set([200, 203, 206]);
var STATIC_RESOURCE_TYPES = /* @__PURE__ */ new Set([
  "Font",
  "Image",
  "Media",
  "Script",
  "Stylesheet"
]);
var NON_NETWORK_SCHEMES = [
  "blob",
  // @see https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
  "data",
  // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
  "intent",
  // @see https://developer.chrome.com/docs/multidevice/android/intents/
  "file",
  // @see https://en.wikipedia.org/wiki/File_URI_scheme
  "filesystem",
  // @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystem
  "chrome-extension"
];
function parseCacheControl(header) {
  if (!header) {
    return null;
  }
  const directives = header.split(",").map((directive) => directive.trim());
  const cacheControlOptions = {};
  for (const directive of directives) {
    const [key, value] = directive.split("=").map((part) => part.trim());
    switch (key) {
      case "max-age": {
        const maxAge = parseInt(value, 10);
        if (!isNaN(maxAge)) {
          cacheControlOptions["max-age"] = maxAge;
        }
        break;
      }
      case "no-cache":
        cacheControlOptions["no-cache"] = true;
        break;
      case "no-store":
        cacheControlOptions["no-store"] = true;
        break;
      case "must-revalidate":
        cacheControlOptions["must-revalidate"] = true;
        break;
      case "private":
        cacheControlOptions["private"] = true;
        break;
      default:
        break;
    }
  }
  return cacheControlOptions;
}
var SECURE_LOCALHOST_DOMAINS = ["localhost", "127.0.0.1"];
function isSyntheticNetworkRequestLocalhost(event) {
  try {
    const hostname = new URL(event.args.data.url).hostname;
    return SECURE_LOCALHOST_DOMAINS.includes(hostname) || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

// gen/front_end/models/trace/helpers/SamplesIntegrator.js
var SamplesIntegrator_exports = {};
__export(SamplesIntegrator_exports, {
  SamplesIntegrator: () => SamplesIntegrator
});
import * as Types4 from "./../types/types.js";
var _a;
var SamplesIntegrator = class {
  /**
   * The result of running the samples integrator. Holds the JS calls
   * with their approximated duration after integrating samples into the
   * trace event tree.
   */
  #constructedProfileCalls = [];
  /**
   * tracks the state of the JS stack at each point in time to update
   * the profile call durations as new events arrive. This doesn't only
   * happen with new profile calls (in which case we would compare the
   * stack in them) but also with trace events (in which case we would
   * update the duration of the events we are tracking at the moment).
   */
  #currentJSStack = [];
  /**
   * Process holding the CPU profile and trace events.
   */
  #processId;
  /**
   * Thread holding the CPU profile and trace events.
   */
  #threadId;
  /**
   * Tracks the depth of the JS stack at the moment a trace event starts
   * or ends. It is assumed that for the duration of a trace event, the
   * JS stack's depth cannot decrease, since JS calls that started
   * before a trace event cannot end during the trace event. So as trace
   * events arrive, we store the "locked" amount of JS frames that were
   * in the stack before the event came.
   */
  #lockedJsStackDepth = [];
  /**
   * Used to keep track when samples should be integrated even if they
   * are not children of invocation trace events. This is useful in
   * cases where we can be missing the start of JS invocation events if
   * we start tracing half-way through.
   */
  #fakeJSInvocation = false;
  /**
   * The parsed CPU profile, holding the tree hierarchy of JS frames and
   * the sample data.
   */
  #profileModel;
  /**
   * Because GC nodes don't have a stack, we artificially add a stack to
   * them which corresponds to that of the previous sample. This map
   * tracks which node is used for the stack of a GC call.
   * Note that GC samples are not shown in the flamechart, however they
   * are used during the construction of for profile calls, as we can
   * infer information about the duration of the executed code when a
   * GC node is sampled.
   */
  #nodeForGC = /* @__PURE__ */ new Map();
  #engineConfig;
  #profileId;
  /**
   * Keeps track of the individual samples from the CPU Profile.
   * Only used with Debug Mode experiment enabled.
   */
  jsSampleEvents = [];
  constructor(profileModel, profileId, pid, tid, configuration) {
    this.#profileModel = profileModel;
    this.#threadId = tid;
    this.#processId = pid;
    this.#engineConfig = configuration || Types4.Configuration.defaults();
    this.#profileId = profileId;
  }
  buildProfileCalls(traceEvents) {
    const mergedEvents = mergeEventsInOrder(traceEvents, this.callsFromProfileSamples());
    const stack = [];
    for (let i = 0; i < mergedEvents.length; i++) {
      const event = mergedEvents[i];
      if (event.ph === "I" && !extractSampleTraceId(event)) {
        continue;
      }
      if (stack.length === 0) {
        if (Types4.Events.isProfileCall(event)) {
          this.#onProfileCall(event);
          continue;
        }
        stack.push(event);
        this.#onTraceEventStart(event);
        continue;
      }
      const parentEvent = stack.at(-1);
      if (parentEvent === void 0) {
        continue;
      }
      const begin = event.ts;
      const parentBegin = parentEvent.ts;
      const parentDuration = parentEvent.dur || 0;
      const parentEnd = parentBegin + parentDuration;
      const startsAfterParent = begin >= parentEnd;
      if (startsAfterParent) {
        this.#onTraceEventEnd(parentEvent);
        stack.pop();
        i--;
        continue;
      }
      if (Types4.Events.isProfileCall(event)) {
        this.#onProfileCall(event, parentEvent);
        continue;
      }
      this.#onTraceEventStart(event);
      stack.push(event);
    }
    while (stack.length) {
      const last = stack.pop();
      if (last) {
        this.#onTraceEventEnd(last);
      }
    }
    sortTraceEventsInPlace(this.jsSampleEvents);
    return this.#constructedProfileCalls;
  }
  #onTraceEventStart(event) {
    if (event.name === "RunMicrotasks" || event.name === "RunTask") {
      this.#lockedJsStackDepth = [];
      this.#truncateJSStack(0, event.ts);
      this.#fakeJSInvocation = false;
    }
    if (this.#fakeJSInvocation) {
      this.#truncateJSStack(this.#lockedJsStackDepth.pop() || 0, event.ts);
      this.#fakeJSInvocation = false;
    }
    this.#extractStackTrace(event);
    this.#lockedJsStackDepth.push(this.#currentJSStack.length);
  }
  #onProfileCall(event, parent) {
    if (parent && Types4.Events.isJSInvocationEvent(parent) || this.#fakeJSInvocation) {
      this.#extractStackTrace(event);
    } else if (Types4.Events.isProfileCall(event) && this.#currentJSStack.length === 0) {
      this.#fakeJSInvocation = true;
      const stackDepthBefore = this.#currentJSStack.length;
      this.#extractStackTrace(event);
      this.#lockedJsStackDepth.push(stackDepthBefore);
    }
  }
  #onTraceEventEnd(event) {
    const endTime = Types4.Timing.Micro(event.ts + (event.dur ?? 0));
    this.#truncateJSStack(this.#lockedJsStackDepth.pop() || 0, endTime);
  }
  /**
   * Builds the initial calls with no duration from samples. Their
   * purpose is to be merged with the trace event array being parsed so
   * that they can be traversed in order with them and their duration
   * can be updated as the SampleIntegrator callbacks are invoked.
   */
  callsFromProfileSamples() {
    const samples = this.#profileModel.samples;
    const timestamps = this.#profileModel.timestamps;
    if (!samples) {
      return [];
    }
    const calls = [];
    let prevNode;
    for (let i = 0; i < samples.length; i++) {
      const node = this.#profileModel.nodeByIndex(i);
      const timestamp = milliToMicro(Types4.Timing.Milli(timestamps[i]));
      if (!node) {
        continue;
      }
      const call = makeProfileCall(node, this.#profileId, i, timestamp, this.#processId, this.#threadId);
      calls.push(call);
      if (this.#engineConfig.debugMode) {
        const traceId = this.#profileModel.traceIds?.[i];
        this.jsSampleEvents.push(this.#makeJSSampleEvent(call, timestamp, traceId));
      }
      if (node.id === this.#profileModel.gcNode?.id && prevNode) {
        this.#nodeForGC.set(call, prevNode);
        continue;
      }
      prevNode = node;
    }
    return calls;
  }
  /**
   * Given a synthetic profile call, returns an array of profile calls
   * representing the stack trace that profile call belongs to based on
   * its nodeId. The input profile call will be at the top of the
   * returned stack (last position), meaning that any other frames that
   * were effectively above it are omitted.
   * @param profileCall
   * @param overrideTimeStamp a custom timestamp to use for the returned
   * profile calls. If not defined, the timestamp of the input
   * profileCall is used instead. This param is useful for example when
   * creating the profile calls for a sample with a trace id, since the
   * timestamp of the corresponding trace event should be used instead
   * of the sample's.
   */
  #makeProfileCallsForStack(profileCall, overrideTimeStamp) {
    let node = this.#profileModel.nodeById(profileCall.nodeId);
    const isGarbageCollection = node?.id === this.#profileModel.gcNode?.id;
    if (isGarbageCollection) {
      node = this.#nodeForGC.get(profileCall) || null;
    }
    if (!node) {
      return [];
    }
    const callFrames = new Array(node.depth + 1 + Number(isGarbageCollection));
    let i = callFrames.length - 1;
    if (isGarbageCollection) {
      callFrames[i--] = profileCall;
    }
    while (node) {
      callFrames[i--] = makeProfileCall(node, profileCall.profileId, profileCall.sampleIndex, overrideTimeStamp ?? profileCall.ts, this.#processId, this.#threadId);
      node = node.parent;
    }
    return callFrames;
  }
  #getStackForSampleTraceId(traceId, timestamp) {
    const nodeId = this.#profileModel.traceIds?.[traceId];
    const node = nodeId && this.#profileModel.nodeById(nodeId);
    const maybeCallForTraceId = node && makeProfileCall(node, this.#profileId, -1, timestamp, this.#processId, this.#threadId);
    if (!maybeCallForTraceId) {
      return null;
    }
    if (this.#engineConfig.debugMode) {
      this.jsSampleEvents.push(this.#makeJSSampleEvent(maybeCallForTraceId, timestamp, traceId));
    }
    return this.#makeProfileCallsForStack(maybeCallForTraceId);
  }
  /**
   * Update tracked stack using this event's call stack.
   */
  #extractStackTrace(event) {
    let stackTrace = this.#currentJSStack;
    if (Types4.Events.isProfileCall(event)) {
      stackTrace = this.#makeProfileCallsForStack(event);
    }
    const traceId = extractSampleTraceId(event);
    const maybeCallForTraceId = traceId && this.#getStackForSampleTraceId(traceId, event.ts);
    if (maybeCallForTraceId) {
      stackTrace = maybeCallForTraceId;
    }
    _a.filterStackFrames(stackTrace, this.#engineConfig);
    const endTime = event.ts + (event.dur || 0);
    const minFrames = Math.min(stackTrace.length, this.#currentJSStack.length);
    let i;
    for (i = this.#lockedJsStackDepth.at(-1) || 0; i < minFrames; ++i) {
      const newFrame = stackTrace[i].callFrame;
      const oldFrame = this.#currentJSStack[i].callFrame;
      if (!_a.framesAreEqual(newFrame, oldFrame)) {
        break;
      }
      this.#currentJSStack[i].dur = Types4.Timing.Micro(Math.max(this.#currentJSStack[i].dur || 0, endTime - this.#currentJSStack[i].ts));
    }
    this.#truncateJSStack(i, event.ts);
    for (; i < stackTrace.length; ++i) {
      const call = stackTrace[i];
      if (call.nodeId === this.#profileModel.programNode?.id || call.nodeId === this.#profileModel.root?.id || call.nodeId === this.#profileModel.idleNode?.id || call.nodeId === this.#profileModel.gcNode?.id) {
        continue;
      }
      this.#currentJSStack.push(call);
      this.#constructedProfileCalls.push(call);
    }
  }
  /**
   * When a call stack that differs from the one we are tracking has
   * been detected in the samples, the latter is "truncated" by
   * setting the ending time of its call frames and removing the top
   * call frames that aren't shared with the new call stack. This way,
   * we can update the tracked stack with the new call frames on top.
   * @param depth the amount of call frames from bottom to top that
   * should be kept in the tracking stack trace. AKA amount of shared
   * call frames between two stacks.
   * @param time the new end of the call frames in the stack.
   */
  #truncateJSStack(depth, time) {
    if (this.#lockedJsStackDepth.length) {
      const lockedDepth = this.#lockedJsStackDepth.at(-1);
      if (lockedDepth && depth < lockedDepth) {
        console.error(`Child stack is shallower (${depth}) than the parent stack (${lockedDepth}) at ${time}`);
        depth = lockedDepth;
      }
    }
    if (this.#currentJSStack.length < depth) {
      console.error(`Trying to truncate higher than the current stack size at ${time}`);
      depth = this.#currentJSStack.length;
    }
    for (let k = 0; k < this.#currentJSStack.length; ++k) {
      this.#currentJSStack[k].dur = Types4.Timing.Micro(Math.max(time - this.#currentJSStack[k].ts, 0));
    }
    this.#currentJSStack.length = depth;
  }
  #makeJSSampleEvent(call, timestamp, traceId) {
    const JSSampleEvent = {
      name: "JSSample",
      cat: "devtools.timeline",
      args: {
        data: { traceId, stackTrace: this.#makeProfileCallsForStack(call).map((e) => e.callFrame) }
      },
      ph: "I",
      ts: timestamp,
      dur: Types4.Timing.Micro(0),
      pid: this.#processId,
      tid: this.#threadId
    };
    return JSSampleEvent;
  }
  static framesAreEqual(frame1, frame2) {
    return frame1.scriptId === frame2.scriptId && frame1.functionName === frame2.functionName && frame1.lineNumber === frame2.lineNumber;
  }
  static showNativeName(name, runtimeCallStatsEnabled) {
    return runtimeCallStatsEnabled && Boolean(_a.nativeGroup(name));
  }
  static nativeGroup(nativeName) {
    if (nativeName.startsWith("Parse")) {
      return "Parse";
    }
    if (nativeName.startsWith("Compile") || nativeName.startsWith("Recompile")) {
      return "Compile";
    }
    return null;
  }
  static isNativeRuntimeFrame(frame) {
    return frame.url === "native V8Runtime";
  }
  static filterStackFrames(stack, engineConfig) {
    const showAllEvents = engineConfig.showAllEvents;
    if (showAllEvents) {
      return;
    }
    let previousNativeFrameName = null;
    let j = 0;
    for (let i = 0; i < stack.length; ++i) {
      const frame = stack[i].callFrame;
      const nativeRuntimeFrame = _a.isNativeRuntimeFrame(frame);
      if (nativeRuntimeFrame && !_a.showNativeName(frame.functionName, engineConfig.includeRuntimeCallStats)) {
        continue;
      }
      const nativeFrameName = nativeRuntimeFrame ? _a.nativeGroup(frame.functionName) : null;
      if (previousNativeFrameName && previousNativeFrameName === nativeFrameName) {
        continue;
      }
      previousNativeFrameName = nativeFrameName;
      stack[j++] = stack[i];
    }
    stack.length = j;
  }
  static createFakeTraceFromCpuProfile(profile, tid) {
    if (!profile) {
      return { traceEvents: [], metadata: {} };
    }
    const cpuProfileEvent = {
      cat: "disabled-by-default-devtools.timeline",
      name: "CpuProfile",
      ph: "X",
      pid: Types4.Events.ProcessID(1),
      tid,
      ts: Types4.Timing.Micro(profile.startTime),
      dur: Types4.Timing.Micro(profile.endTime - profile.startTime),
      args: { data: { cpuProfile: profile } },
      // Create an arbitrary profile id.
      id: "0x1"
    };
    return {
      traceEvents: [cpuProfileEvent],
      metadata: {
        dataOrigin: "CPUProfile"
      }
    };
  }
  static extractCpuProfileFromFakeTrace(traceEvents) {
    const profileEvent = traceEvents.find((e) => Types4.Events.isSyntheticCpuProfile(e));
    const profile = profileEvent?.args.data.cpuProfile;
    if (!profile) {
      throw new Error("Missing cpuProfile data");
    }
    return profile;
  }
};
_a = SamplesIntegrator;
export {
  Extensions_exports as Extensions,
  Network_exports as Network,
  SamplesIntegrator_exports as SamplesIntegrator,
  SyntheticEvents_exports as SyntheticEvents,
  Timing_exports as Timing,
  Trace_exports as Trace,
  TreeHelpers_exports as TreeHelpers
};
//# sourceMappingURL=helpers.js.map
