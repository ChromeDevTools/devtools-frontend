var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/trace/extras/FilmStrip.js
var FilmStrip_exports = {};
__export(FilmStrip_exports, {
  frameClosestToTimestamp: () => frameClosestToTimestamp,
  fromHandlerData: () => fromHandlerData
});
import * as Platform from "./../../../core/platform/platform.js";
var filmStripCache = /* @__PURE__ */ new WeakMap();
function fromHandlerData(data, customZeroTime) {
  const frames = [];
  const zeroTime = typeof customZeroTime !== "undefined" ? customZeroTime : data.Meta.traceBounds.min;
  const spanTime = data.Meta.traceBounds.range;
  const fromCache = filmStripCache.get(data)?.get(zeroTime);
  if (fromCache) {
    return fromCache;
  }
  const screenshots = data.Screenshots.screenshots ?? data.Screenshots.legacySyntheticScreenshots ?? [];
  for (const screenshotEvent of screenshots) {
    if (screenshotEvent.ts < zeroTime) {
      continue;
    }
    const frame = {
      index: frames.length,
      screenshotEvent
    };
    frames.push(frame);
  }
  const result = {
    zeroTime,
    spanTime,
    frames: Array.from(frames)
  };
  const cachedForData = Platform.MapUtilities.getWithDefault(filmStripCache, data, () => /* @__PURE__ */ new Map());
  cachedForData.set(zeroTime, result);
  return result;
}
function frameClosestToTimestamp(filmStrip, searchTimestamp) {
  const closestFrameIndexBeforeTimestamp = Platform.ArrayUtilities.nearestIndexFromEnd(filmStrip.frames, (frame) => frame.screenshotEvent.ts < searchTimestamp);
  if (closestFrameIndexBeforeTimestamp === null) {
    return null;
  }
  return filmStrip.frames[closestFrameIndexBeforeTimestamp];
}

// gen/front_end/models/trace/extras/MainThreadActivity.js
var MainThreadActivity_exports = {};
__export(MainThreadActivity_exports, {
  calculateWindow: () => calculateWindow
});
import * as Helpers from "./../helpers/helpers.js";
import * as Types from "./../types/types.js";
var IDLE_FUNCTION_CALL_NAMES = /* @__PURE__ */ new Set([
  "(program)",
  "(idle)",
  "(root)"
]);
function calculateWindow(traceBounds, mainThreadEntries) {
  if (!mainThreadEntries.length) {
    return traceBounds;
  }
  const entriesWithIdleRemoved = mainThreadEntries.filter((entry) => {
    if (Types.Events.isProfileCall(entry) && (IDLE_FUNCTION_CALL_NAMES.has(entry.callFrame.functionName) || !entry.callFrame.functionName)) {
      return false;
    }
    return true;
  });
  if (entriesWithIdleRemoved.length === 0) {
    return traceBounds;
  }
  function findLowUtilizationRegion(startIndex, stopIndex) {
    const threshold = 0.1;
    let cutIndex = startIndex;
    const entryAtCut = entriesWithIdleRemoved[cutIndex];
    const timings = Helpers.Timing.eventTimingsMicroSeconds(entryAtCut);
    let cutTime = (timings.startTime + timings.endTime) / 2;
    let usedTime = 0;
    const step = Math.sign(stopIndex - startIndex);
    for (let i = startIndex; i !== stopIndex; i += step) {
      const task = entriesWithIdleRemoved[i];
      const taskTimings = Helpers.Timing.eventTimingsMicroSeconds(task);
      const taskTime = (taskTimings.startTime + taskTimings.endTime) / 2;
      const interval = Math.abs(cutTime - taskTime);
      if (usedTime < threshold * interval) {
        cutIndex = i;
        cutTime = taskTime;
        usedTime = 0;
      }
      usedTime += taskTimings.duration;
    }
    return cutIndex;
  }
  const rightIndex = findLowUtilizationRegion(entriesWithIdleRemoved.length - 1, 0);
  const leftIndex = findLowUtilizationRegion(0, rightIndex);
  const leftTimings = Helpers.Timing.eventTimingsMicroSeconds(entriesWithIdleRemoved[leftIndex]);
  const rightTimings = Helpers.Timing.eventTimingsMicroSeconds(entriesWithIdleRemoved[rightIndex]);
  let leftTime = leftTimings.startTime;
  let rightTime = rightTimings.endTime;
  const zoomedInSpan = rightTime - leftTime;
  if (zoomedInSpan < traceBounds.range * 0.1) {
    return traceBounds;
  }
  leftTime = Types.Timing.Micro(Math.max(leftTime - 0.05 * zoomedInSpan, traceBounds.min));
  rightTime = Types.Timing.Micro(Math.min(rightTime + 0.05 * zoomedInSpan, traceBounds.max));
  return {
    min: leftTime,
    max: rightTime,
    range: Types.Timing.Micro(rightTime - leftTime)
  };
}

// gen/front_end/models/trace/extras/ScriptDuplication.js
var ScriptDuplication_exports = {};
__export(ScriptDuplication_exports, {
  computeScriptDuplication: () => computeScriptDuplication,
  getNodeModuleName: () => getNodeModuleName,
  normalizeDuplication: () => normalizeDuplication,
  normalizeSource: () => normalizeSource
});
import * as Handlers from "./../handlers/handlers.js";
var ABSOLUTE_SIZE_THRESHOLD_BYTES = 1024 * 0.5;
var RELATIVE_SIZE_THRESHOLD = 0.1;
function normalizeSource(source) {
  source = source.replace(/\?$/, "");
  const lastNodeModulesIndex = source.lastIndexOf("node_modules");
  if (lastNodeModulesIndex !== -1) {
    source = source.substring(lastNodeModulesIndex);
  }
  return source;
}
function shouldIgnoreSource(source) {
  if (source.includes("webpack/bootstrap")) {
    return true;
  }
  if (source.includes("(webpack)/buildin")) {
    return true;
  }
  if (source.includes("external ")) {
    return true;
  }
  return false;
}
function normalizeDuplication(duplication) {
  for (const [key, data] of duplication) {
    data.duplicates.sort((a, b) => b.attributedSize - a.attributedSize);
    if (data.duplicates.length > 1) {
      const largestResourceSize = data.duplicates[0].attributedSize;
      data.duplicates = data.duplicates.filter((duplicate) => {
        const percentSize = duplicate.attributedSize / largestResourceSize;
        return percentSize >= RELATIVE_SIZE_THRESHOLD;
      });
    }
    data.duplicates = data.duplicates.filter((duplicate) => duplicate.attributedSize >= ABSOLUTE_SIZE_THRESHOLD_BYTES);
    if (data.duplicates.length <= 1) {
      duplication.delete(key);
      continue;
    }
    data.estimatedDuplicateBytes = data.duplicates.slice(1).reduce((acc, cur) => acc + cur.attributedSize, 0);
  }
}
function indexOfOrLength(haystack, needle, startPosition = 0) {
  const index = haystack.indexOf(needle, startPosition);
  return index === -1 ? haystack.length : index;
}
function getNodeModuleName(source) {
  const sourceSplit = source.split("node_modules/");
  source = sourceSplit[sourceSplit.length - 1];
  const indexFirstSlash = indexOfOrLength(source, "/");
  if (source[0] === "@") {
    return source.slice(0, indexOfOrLength(source, "/", indexFirstSlash + 1));
  }
  return source.slice(0, indexFirstSlash);
}
function groupByNodeModules(duplication) {
  const groupedDuplication = /* @__PURE__ */ new Map();
  for (const [source, data] of duplication) {
    if (!source.includes("node_modules")) {
      groupedDuplication.set(source, data);
      continue;
    }
    const nodeModuleKey = "node_modules/" + getNodeModuleName(source);
    const aggregatedData = groupedDuplication.get(nodeModuleKey) ?? {
      duplicates: [],
      // This is calculated in normalizeDuplication.
      estimatedDuplicateBytes: 0
    };
    groupedDuplication.set(nodeModuleKey, aggregatedData);
    for (const { script, attributedSize } of data.duplicates) {
      let duplicate = aggregatedData.duplicates.find((d) => d.script === script);
      if (!duplicate) {
        duplicate = { script, attributedSize: 0 };
        aggregatedData.duplicates.push(duplicate);
      }
      duplicate.attributedSize += attributedSize;
    }
  }
  return groupedDuplication;
}
function sorted(duplication) {
  return new Map([...duplication].sort((a, b) => b[1].estimatedDuplicateBytes - a[1].estimatedDuplicateBytes));
}
function computeScriptDuplication(scriptsData, compressionRatios) {
  const sourceDatasMap = /* @__PURE__ */ new Map();
  for (const script of scriptsData.scripts) {
    if (!script.content || !script.sourceMap) {
      continue;
    }
    const sizes = Handlers.ModelHandlers.Scripts.getScriptGeneratedSizes(script);
    if (!sizes) {
      continue;
    }
    if ("errorMessage" in sizes) {
      console.error(sizes.errorMessage);
      continue;
    }
    const sourceDataArray = [];
    sourceDatasMap.set(script, sourceDataArray);
    const sources = script.sourceMap.sourceURLs();
    for (let i = 0; i < sources.length; i++) {
      if (shouldIgnoreSource(sources[i])) {
        continue;
      }
      const sourceSize = sizes.files[sources[i]];
      sourceDataArray.push({
        source: normalizeSource(sources[i]),
        resourceSize: sourceSize
      });
    }
  }
  const duplication = /* @__PURE__ */ new Map();
  for (const [script, sourceDataArray] of sourceDatasMap) {
    for (const sourceData of sourceDataArray) {
      let data = duplication.get(sourceData.source);
      if (!data) {
        data = { estimatedDuplicateBytes: 0, duplicates: [] };
        duplication.set(sourceData.source, data);
      }
      const compressionRatio = script.request ? compressionRatios.get(script.request?.args.data.requestId) ?? 1 : 1;
      const transferSize = Math.round(sourceData.resourceSize * compressionRatio);
      data.duplicates.push({
        script,
        attributedSize: transferSize
      });
    }
  }
  const duplicationGroupedByNodeModules = groupByNodeModules(duplication);
  normalizeDuplication(duplication);
  normalizeDuplication(duplicationGroupedByNodeModules);
  return {
    duplication: sorted(duplication),
    duplicationGroupedByNodeModules: sorted(duplicationGroupedByNodeModules)
  };
}

// gen/front_end/models/trace/extras/StackTraceForEvent.js
var StackTraceForEvent_exports = {};
__export(StackTraceForEvent_exports, {
  clearCacheForTrace: () => clearCacheForTrace,
  get: () => get,
  stackTraceForEventInTrace: () => stackTraceForEventInTrace
});
import * as Helpers2 from "./../helpers/helpers.js";
import * as Types2 from "./../types/types.js";
var stackTraceForEventInTrace = /* @__PURE__ */ new Map();
function clearCacheForTrace(data) {
  stackTraceForEventInTrace.delete(data);
}
function get(event, data) {
  let cacheForTrace = stackTraceForEventInTrace.get(data);
  if (!cacheForTrace) {
    cacheForTrace = /* @__PURE__ */ new Map();
    stackTraceForEventInTrace.set(data, cacheForTrace);
  }
  const resultFromCache = cacheForTrace.get(event);
  if (resultFromCache) {
    return resultFromCache;
  }
  let result = null;
  if (Types2.Extensions.isSyntheticExtensionEntry(event)) {
    result = getForExtensionEntry(event, data);
  } else if (Types2.Events.isPerformanceMeasureBegin(event)) {
    result = getForPerformanceMeasure(event, data);
  } else {
    result = getForEvent(event, data);
    const payloadCallFrames = getTraceEventPayloadStackAsProtocolCallFrame(event).filter((callFrame) => !isNativeJSFunction(callFrame));
    if (!result.callFrames.length) {
      result.callFrames = payloadCallFrames;
    } else {
      for (let i = 0; i < payloadCallFrames.length && i < result.callFrames.length; i++) {
        result.callFrames[i] = payloadCallFrames[i];
      }
    }
  }
  if (result) {
    cacheForTrace.set(event, result);
  }
  return result;
}
function getForEvent(event, data) {
  const entryToNode = data.Renderer.entryToNode.size > 0 ? data.Renderer.entryToNode : data.Samples.entryToNode;
  const topStackTrace = { callFrames: [] };
  let stackTrace = topStackTrace;
  let currentEntry;
  let node = entryToNode.get(event);
  const traceCache = stackTraceForEventInTrace.get(data) || /* @__PURE__ */ new Map();
  stackTraceForEventInTrace.set(data, traceCache);
  while (node) {
    if (!Types2.Events.isProfileCall(node.entry)) {
      const maybeAsyncParent = data.AsyncJSCalls.runEntryPointToScheduler.get(node.entry);
      if (!maybeAsyncParent) {
        node = node.parent;
        continue;
      }
      const maybeAsyncParentNode2 = maybeAsyncParent && entryToNode.get(maybeAsyncParent.scheduler);
      if (maybeAsyncParentNode2) {
        stackTrace = addAsyncParentToStack(stackTrace, maybeAsyncParent.taskName);
        node = maybeAsyncParentNode2;
      }
      continue;
    }
    currentEntry = node.entry;
    const stackTraceFromCache = traceCache.get(node.entry);
    if (stackTraceFromCache) {
      stackTrace.callFrames.push(...stackTraceFromCache.callFrames.filter((callFrame) => !isNativeJSFunction(callFrame)));
      stackTrace.parent = stackTraceFromCache.parent;
      stackTrace.description = stackTrace.description || stackTraceFromCache.description;
      break;
    }
    if (!isNativeJSFunction(currentEntry.callFrame)) {
      stackTrace.callFrames.push(currentEntry.callFrame);
    }
    const maybeAsyncParentEvent = data.AsyncJSCalls.asyncCallToScheduler.get(currentEntry);
    const maybeAsyncParentNode = maybeAsyncParentEvent && entryToNode.get(maybeAsyncParentEvent.scheduler);
    if (maybeAsyncParentNode) {
      stackTrace = addAsyncParentToStack(stackTrace, maybeAsyncParentEvent.taskName);
      node = maybeAsyncParentNode;
      continue;
    }
    node = node.parent;
  }
  return topStackTrace;
}
function addAsyncParentToStack(stackTrace, taskName) {
  const parent = { callFrames: [] };
  stackTrace.parent = parent;
  parent.description = taskName;
  return parent;
}
function getForExtensionEntry(event, data) {
  const rawEvent = event.rawSourceEvent;
  if (Types2.Events.isPerformanceMeasureBegin(rawEvent)) {
    return getForPerformanceMeasure(rawEvent, data);
  }
  if (!rawEvent) {
    return null;
  }
  return get(rawEvent, data);
}
function getForPerformanceMeasure(event, data) {
  let rawEvent = event;
  if (event.args.traceId === void 0) {
    return null;
  }
  rawEvent = data.UserTimings.measureTraceByTraceId.get(event.args.traceId);
  if (!rawEvent) {
    return null;
  }
  return get(rawEvent, data);
}
function isNativeJSFunction({ columnNumber, lineNumber, url, scriptId }) {
  return lineNumber === -1 && columnNumber === -1 && url === "" && scriptId === "0";
}
function getTraceEventPayloadStackAsProtocolCallFrame(event) {
  const payloadCallStack = Helpers2.Trace.getZeroIndexedStackTraceInEventPayload(event) || [];
  const callFrames = [];
  for (const frame of payloadCallStack) {
    callFrames.push({ ...frame, scriptId: String(frame.scriptId) });
  }
  return callFrames;
}

// gen/front_end/models/trace/extras/ThirdParties.js
var ThirdParties_exports = {};
__export(ThirdParties_exports, {
  summarizeByThirdParty: () => summarizeByThirdParty,
  summarizeByURL: () => summarizeByURL
});
import * as Handlers2 from "./../handlers/handlers.js";
import * as Helpers5 from "./../helpers/helpers.js";
import * as Types8 from "./../types/types.js";

// gen/front_end/models/trace/extras/TraceFilter.js
var TraceFilter_exports = {};
__export(TraceFilter_exports, {
  ExclusiveNameFilter: () => ExclusiveNameFilter,
  InvisibleEventsFilter: () => InvisibleEventsFilter,
  TraceFilter: () => TraceFilter,
  VisibleEventsFilter: () => VisibleEventsFilter
});
import * as Types3 from "./../types/types.js";
var TraceFilter = class {
};
var VisibleEventsFilter = class _VisibleEventsFilter extends TraceFilter {
  visibleTypes;
  constructor(visibleTypes) {
    super();
    this.visibleTypes = new Set(visibleTypes);
  }
  accept(event) {
    if (Types3.Extensions.isSyntheticExtensionEntry(event)) {
      return true;
    }
    return this.visibleTypes.has(_VisibleEventsFilter.eventType(event));
  }
  static eventType(event) {
    if (event.cat.includes("blink.console")) {
      return "ConsoleTime";
    }
    if (event.cat.includes("blink.user_timing")) {
      return "UserTiming";
    }
    return event.name;
  }
};
var InvisibleEventsFilter = class extends TraceFilter {
  #invisibleTypes;
  constructor(invisibleTypes) {
    super();
    this.#invisibleTypes = new Set(invisibleTypes);
  }
  accept(event) {
    return !this.#invisibleTypes.has(VisibleEventsFilter.eventType(event));
  }
};
var ExclusiveNameFilter = class extends TraceFilter {
  #excludeNames;
  constructor(excludeNames) {
    super();
    this.#excludeNames = new Set(excludeNames);
  }
  accept(event) {
    return !this.#excludeNames.has(event.name);
  }
};

// gen/front_end/models/trace/extras/TraceTree.js
var TraceTree_exports = {};
__export(TraceTree_exports, {
  BottomUpNode: () => BottomUpNode,
  BottomUpRootNode: () => BottomUpRootNode,
  GroupNode: () => GroupNode,
  Node: () => Node,
  TopDownNode: () => TopDownNode,
  TopDownRootNode: () => TopDownRootNode,
  eventStackFrame: () => eventStackFrame,
  generateEventID: () => generateEventID
});
import * as Helpers3 from "./../helpers/helpers.js";

// gen/front_end/models/trace/helpers/SamplesIntegrator.js
import * as Types6 from "./../types/types.js";

// gen/front_end/models/trace/helpers/Timing.js
import * as Platform3 from "./../../../core/platform/platform.js";
import * as Types5 from "./../types/types.js";

// gen/front_end/models/trace/helpers/Trace.js
import * as Common from "./../../../core/common/common.js";
import * as Platform2 from "./../../../core/platform/platform.js";
import * as Types4 from "./../types/types.js";
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
  if (Types4.Events.isProfileCall(a) && !Types4.Events.isProfileCall(b)) {
    return -1;
  }
  if (Types4.Events.isProfileCall(b) && !Types4.Events.isProfileCall(a)) {
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
    dur: Types4.Timing.Micro(0),
    callFrame: node.callFrame,
    sampleIndex,
    profileId
  };
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

// gen/front_end/models/trace/helpers/Timing.js
var milliToMicro = (value) => Types5.Timing.Micro(value * 1e3);

// gen/front_end/models/trace/helpers/SamplesIntegrator.js
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
    this.#engineConfig = configuration || Types6.Configuration.defaults();
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
        if (Types6.Events.isProfileCall(event)) {
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
      if (Types6.Events.isProfileCall(event)) {
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
    if (parent && Types6.Events.isJSInvocationEvent(parent) || this.#fakeJSInvocation) {
      this.#extractStackTrace(event);
    } else if (Types6.Events.isProfileCall(event) && this.#currentJSStack.length === 0) {
      this.#fakeJSInvocation = true;
      const stackDepthBefore = this.#currentJSStack.length;
      this.#extractStackTrace(event);
      this.#lockedJsStackDepth.push(stackDepthBefore);
    }
  }
  #onTraceEventEnd(event) {
    const endTime = Types6.Timing.Micro(event.ts + (event.dur ?? 0));
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
      const timestamp = milliToMicro(Types6.Timing.Milli(timestamps[i]));
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
    if (Types6.Events.isProfileCall(event)) {
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
      this.#currentJSStack[i].dur = Types6.Timing.Micro(Math.max(this.#currentJSStack[i].dur || 0, endTime - this.#currentJSStack[i].ts));
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
      this.#currentJSStack[k].dur = Types6.Timing.Micro(Math.max(time - this.#currentJSStack[k].ts, 0));
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
      dur: Types6.Timing.Micro(0),
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
      pid: Types6.Events.ProcessID(1),
      tid,
      ts: Types6.Timing.Micro(profile.startTime),
      dur: Types6.Timing.Micro(profile.endTime - profile.startTime),
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
    const profileEvent = traceEvents.find((e) => Types6.Events.isSyntheticCpuProfile(e));
    const profile = profileEvent?.args.data.cpuProfile;
    if (!profile) {
      throw new Error("Missing cpuProfile data");
    }
    return profile;
  }
};
_a = SamplesIntegrator;

// gen/front_end/models/trace/extras/TraceTree.js
import * as Types7 from "./../types/types.js";
var Node = class {
  /** ms */
  totalTime;
  /** ms */
  selfTime;
  transferSize;
  id;
  /** The first trace event encountered that necessitated the creation of this tree node. */
  event;
  /**
   * All of the trace events associated with this aggregate node.
   * Minor: In the case of Event Log (EventsTimelineTreeView), the node is not aggregate and this will only hold 1 event, the same that's in this.event
   */
  events;
  parent;
  groupId;
  isGroupNodeInternal;
  depth;
  constructor(id, event) {
    this.totalTime = 0;
    this.selfTime = 0;
    this.transferSize = 0;
    this.id = id;
    this.event = event;
    this.events = [event];
    this.groupId = "";
    this.isGroupNodeInternal = false;
    this.depth = 0;
  }
  isGroupNode() {
    return this.isGroupNodeInternal;
  }
  hasChildren() {
    throw new Error("Not implemented");
  }
  setHasChildren(_value) {
    throw new Error("Not implemented");
  }
  /**
   * Returns the direct descendants of this node.
   * @returns a map with ordered <nodeId, Node> tuples.
   */
  children() {
    throw new Error("Not implemented");
  }
  searchTree(matchFunction, results) {
    results = results || [];
    if (this.event && matchFunction(this.event)) {
      results.push(this);
    }
    for (const child of this.children().values()) {
      child.searchTree(matchFunction, results);
    }
    return results;
  }
};
var TopDownNode = class _TopDownNode extends Node {
  root;
  hasChildrenInternal;
  childrenInternal;
  parent;
  constructor(id, event, parent) {
    super(id, event);
    this.root = parent?.root ?? null;
    this.hasChildrenInternal = false;
    this.childrenInternal = null;
    this.parent = parent;
  }
  hasChildren() {
    return this.hasChildrenInternal;
  }
  setHasChildren(value) {
    this.hasChildrenInternal = value;
  }
  children() {
    return this.childrenInternal || this.buildChildren();
  }
  buildChildren() {
    const path = [];
    for (let node = this; node.parent && !node.isGroupNode(); node = node.parent) {
      path.push(node);
    }
    path.reverse();
    const children = /* @__PURE__ */ new Map();
    const self = this;
    const root = this.root;
    if (!root) {
      this.childrenInternal = children;
      return this.childrenInternal;
    }
    const startTime = root.startTime;
    const endTime = root.endTime;
    const instantEventCallback = root.doNotAggregate || root.includeInstantEvents ? onInstantEvent : void 0;
    const eventIdCallback = root.doNotAggregate ? void 0 : generateEventID;
    const eventGroupIdCallback = root.getEventGroupIdCallback();
    let depth = 0;
    let matchedDepth = 0;
    let currentDirectChild = null;
    Helpers3.Trace.forEachEvent(root.events, {
      onStartEvent,
      onEndEvent,
      onInstantEvent: instantEventCallback,
      startTime: Helpers3.Timing.milliToMicro(startTime),
      endTime: Helpers3.Timing.milliToMicro(endTime),
      eventFilter: root.filter,
      ignoreAsyncEvents: false
    });
    function onStartEvent(e) {
      const { startTime: currentStartTime, endTime: currentEndTime } = Helpers3.Timing.eventTimingsMilliSeconds(e);
      ++depth;
      if (depth > path.length + 2) {
        return;
      }
      if (!matchPath(e)) {
        return;
      }
      const actualEndTime = currentEndTime !== void 0 ? Math.min(currentEndTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(startTime, currentStartTime);
      if (duration < 0) {
        console.error("Negative event duration");
      }
      processEvent(e, duration);
    }
    function onInstantEvent(e) {
      ++depth;
      if (matchedDepth === path.length && depth <= path.length + 2) {
        processEvent(e, 0);
      }
      --depth;
    }
    function processEvent(e, duration) {
      if (depth === path.length + 2) {
        if (!currentDirectChild) {
          return;
        }
        currentDirectChild.setHasChildren(true);
        currentDirectChild.selfTime -= duration;
        return;
      }
      let id;
      let groupId = "";
      if (!eventIdCallback) {
        id = Symbol("uniqueId");
      } else {
        id = eventIdCallback(e);
        groupId = eventGroupIdCallback ? eventGroupIdCallback(e) : "";
        if (groupId) {
          id += "/" + groupId;
        }
      }
      let node = children.get(id);
      if (!node) {
        node = new _TopDownNode(id, e, self);
        node.groupId = groupId;
        children.set(id, node);
      } else {
        node.events.push(e);
      }
      node.selfTime += duration;
      node.totalTime += duration;
      if (Types7.Events.isReceivedDataEvent(e)) {
        node.transferSize += e.args.data.encodedDataLength;
      }
      currentDirectChild = node;
    }
    function matchPath(e) {
      const { endTime: endTime2 } = Helpers3.Timing.eventTimingsMilliSeconds(e);
      if (matchedDepth === path.length) {
        return true;
      }
      if (matchedDepth !== depth - 1) {
        return false;
      }
      if (!endTime2) {
        return false;
      }
      if (!eventIdCallback) {
        if (e === path[matchedDepth].event) {
          ++matchedDepth;
        }
        return false;
      }
      let id = eventIdCallback(e);
      const groupId = eventGroupIdCallback ? eventGroupIdCallback(e) : "";
      if (groupId) {
        id += "/" + groupId;
      }
      if (id === path[matchedDepth].id) {
        ++matchedDepth;
      }
      return false;
    }
    function onEndEvent() {
      --depth;
      if (matchedDepth > depth) {
        matchedDepth = depth;
      }
    }
    this.childrenInternal = children;
    return children;
  }
};
var TopDownRootNode = class extends TopDownNode {
  filter;
  startTime;
  endTime;
  eventGroupIdCallback;
  /** Default behavior is to aggregate similar trace events into one Node based on generateEventID(), eventGroupIdCallback(), etc. Set true to keep nodes 1:1 with events. */
  doNotAggregate;
  includeInstantEvents;
  totalTime;
  selfTime;
  constructor(events, { filters, startTime, endTime, doNotAggregate, eventGroupIdCallback, includeInstantEvents }) {
    super("", events[0], null);
    this.event = events[0];
    this.root = this;
    this.events = events;
    this.filter = (e) => filters.every((f) => f.accept(e));
    this.startTime = startTime;
    this.endTime = endTime;
    this.eventGroupIdCallback = eventGroupIdCallback;
    this.doNotAggregate = doNotAggregate;
    this.includeInstantEvents = includeInstantEvents;
    this.totalTime = endTime - startTime;
    this.selfTime = this.totalTime;
  }
  children() {
    return this.childrenInternal || this.grouppedTopNodes();
  }
  grouppedTopNodes() {
    const flatNodes = super.children();
    for (const node of flatNodes.values()) {
      this.selfTime -= node.totalTime;
    }
    if (!this.eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = /* @__PURE__ */ new Map();
    for (const node of flatNodes.values()) {
      const groupId = this.eventGroupIdCallback(node.event);
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, node.events);
        groupNodes.set(groupId, groupNode);
      } else {
        groupNode.events.push(...node.events);
      }
      groupNode.addChild(node, node.selfTime, node.totalTime, node.transferSize);
    }
    this.childrenInternal = groupNodes;
    return groupNodes;
  }
  getEventGroupIdCallback() {
    return this.eventGroupIdCallback;
  }
};
var BottomUpRootNode = class extends Node {
  childrenInternal;
  textFilter;
  filter;
  startTime;
  endTime;
  totalTime;
  eventGroupIdCallback;
  calculateTransferSize;
  forceGroupIdCallback;
  constructor(events, { textFilter, filters, startTime, endTime, eventGroupIdCallback, calculateTransferSize, forceGroupIdCallback }) {
    super("", events[0]);
    this.childrenInternal = null;
    this.events = events;
    this.textFilter = textFilter;
    this.filter = (e) => filters.every((f) => f.accept(e));
    this.startTime = startTime;
    this.endTime = endTime;
    this.eventGroupIdCallback = eventGroupIdCallback;
    this.totalTime = endTime - startTime;
    this.calculateTransferSize = calculateTransferSize;
    this.forceGroupIdCallback = forceGroupIdCallback;
  }
  hasChildren() {
    return true;
  }
  filterChildren(children) {
    for (const [id, child] of children) {
      if (child.event && child.depth <= 1 && !this.textFilter.accept(child.event)) {
        children.delete(id);
      }
    }
    return children;
  }
  children() {
    if (!this.childrenInternal) {
      this.childrenInternal = this.filterChildren(this.grouppedTopNodes());
    }
    return this.childrenInternal;
  }
  // If no grouping is applied, the nodes returned here are what's initially shown in the bottom-up view.
  // "No grouping" == no grouping in UI dropdown == no groupingFunction…
  // … HOWEVER, nodes are still aggregated via `generateEventID`, which is ~= the event name.
  ungroupedTopNodes() {
    const root = this;
    const startTime = this.startTime;
    const endTime = this.endTime;
    const idStack = [];
    const nodeById = /* @__PURE__ */ new Map();
    const selfTimeStack = [endTime - startTime];
    const firstNodeStack = [];
    const totalTimeById = /* @__PURE__ */ new Map();
    const eventGroupIdCallback = this.eventGroupIdCallback;
    const forceGroupIdCallback = this.forceGroupIdCallback;
    const sumTransferSizeOfInstantEvent = (e) => {
      if (Types7.Events.isReceivedDataEvent(e)) {
        let id = generateEventID(e);
        if (this.forceGroupIdCallback && this.eventGroupIdCallback) {
          id = `${id}-${this.eventGroupIdCallback(e)}`;
        }
        let node = nodeById.get(id);
        if (!node) {
          node = new BottomUpNode(root, id, e, false, root);
          nodeById.set(id, node);
        } else {
          node.events.push(e);
        }
        if (e.name === "ResourceReceivedData") {
          node.transferSize += e.args.data.encodedDataLength;
        } else if (e.args.data.encodedDataLength > 0) {
          node.transferSize = e.args.data.encodedDataLength;
        }
      }
    };
    Helpers3.Trace.forEachEvent(this.events, {
      onStartEvent,
      onEndEvent,
      onInstantEvent: this.calculateTransferSize ? sumTransferSizeOfInstantEvent : void 0,
      startTime: Helpers3.Timing.milliToMicro(this.startTime),
      endTime: Helpers3.Timing.milliToMicro(this.endTime),
      eventFilter: this.filter,
      ignoreAsyncEvents: false
    });
    function onStartEvent(e) {
      const { startTime: currentStartTime, endTime: currentEndTime } = Helpers3.Timing.eventTimingsMilliSeconds(e);
      const actualEndTime = currentEndTime !== void 0 ? Math.min(currentEndTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(currentStartTime, startTime);
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      let id = generateEventID(e);
      if (forceGroupIdCallback && eventGroupIdCallback) {
        id = `${id}-${eventGroupIdCallback(e)}`;
      }
      idStack.push(id);
      const noNodeOnStack = !totalTimeById.has(id);
      if (noNodeOnStack) {
        totalTimeById.set(id, duration);
      }
      firstNodeStack.push(noNodeOnStack);
    }
    function onEndEvent(event) {
      const id = idStack.pop();
      if (!id) {
        return;
      }
      let node = nodeById.get(id);
      if (!node) {
        node = new BottomUpNode(root, id, event, false, root);
        nodeById.set(id, node);
      } else {
        node.events.push(event);
      }
      node.selfTime += selfTimeStack.pop() || 0;
      if (firstNodeStack.pop()) {
        node.totalTime += totalTimeById.get(id) || 0;
        totalTimeById.delete(id);
      }
      if (idStack.length > 0) {
        node.setHasChildren(true);
      }
    }
    this.selfTime = selfTimeStack.pop() || 0;
    for (const pair of nodeById) {
      if (pair[1].selfTime <= 0 && (!this.calculateTransferSize || pair[1].transferSize <= 0)) {
        nodeById.delete(pair[0]);
      }
    }
    return nodeById;
  }
  grouppedTopNodes() {
    const flatNodes = this.ungroupedTopNodes();
    if (!this.eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = /* @__PURE__ */ new Map();
    for (const node of flatNodes.values()) {
      const groupId = this.eventGroupIdCallback(node.event);
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, node.events);
        groupNodes.set(groupId, groupNode);
      } else {
        for (const e of node.events) {
          groupNode.events.push(e);
        }
      }
      groupNode.addChild(node, node.selfTime, node.selfTime, node.transferSize);
    }
    return groupNodes;
  }
};
var GroupNode = class extends Node {
  childrenInternal;
  isGroupNodeInternal;
  events;
  constructor(id, parent, events) {
    super(id, events[0]);
    this.events = events;
    this.childrenInternal = /* @__PURE__ */ new Map();
    this.parent = parent;
    this.isGroupNodeInternal = true;
  }
  addChild(child, selfTime, totalTime, transferSize) {
    this.childrenInternal.set(child.id, child);
    this.selfTime += selfTime;
    this.totalTime += totalTime;
    this.transferSize += transferSize;
    child.parent = this;
  }
  hasChildren() {
    return true;
  }
  children() {
    return this.childrenInternal;
  }
};
var BottomUpNode = class _BottomUpNode extends Node {
  parent;
  root;
  depth;
  cachedChildren;
  hasChildrenInternal;
  constructor(root, id, event, hasChildren, parent) {
    super(id, event);
    this.parent = parent;
    this.root = root;
    this.depth = (parent.depth || 0) + 1;
    this.cachedChildren = null;
    this.hasChildrenInternal = hasChildren;
  }
  hasChildren() {
    return this.hasChildrenInternal;
  }
  setHasChildren(value) {
    this.hasChildrenInternal = value;
  }
  children() {
    if (this.cachedChildren) {
      return this.cachedChildren;
    }
    const selfTimeStack = [0];
    const eventIdStack = [];
    const eventStack = [];
    const nodeById = /* @__PURE__ */ new Map();
    const startTime = this.root.startTime;
    const endTime = this.root.endTime;
    let lastTimeMarker = startTime;
    const self = this;
    Helpers3.Trace.forEachEvent(this.root.events, {
      onStartEvent,
      onEndEvent,
      startTime: Helpers3.Timing.milliToMicro(startTime),
      endTime: Helpers3.Timing.milliToMicro(endTime),
      eventFilter: this.root.filter,
      ignoreAsyncEvents: false
    });
    function onStartEvent(e) {
      const { startTime: currentStartTime, endTime: currentEndTime } = Helpers3.Timing.eventTimingsMilliSeconds(e);
      const actualEndTime = currentEndTime !== void 0 ? Math.min(currentEndTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(currentStartTime, startTime);
      if (duration < 0) {
        console.assert(false, "Negative duration of an event");
      }
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      const id = generateEventID(e);
      eventIdStack.push(id);
      eventStack.push(e);
    }
    function onEndEvent(e) {
      const { startTime: currentStartTime, endTime: currentEndTime } = Helpers3.Timing.eventTimingsMilliSeconds(e);
      const selfTime = selfTimeStack.pop();
      const id = eventIdStack.pop();
      eventStack.pop();
      let node;
      for (node = self; node.depth > 1; node = node.parent) {
        if (node.id !== eventIdStack[eventIdStack.length + 1 - node.depth]) {
          return;
        }
      }
      if (node.id !== id || eventIdStack.length < self.depth) {
        return;
      }
      const childId = eventIdStack[eventIdStack.length - self.depth];
      node = nodeById.get(childId);
      if (!node) {
        const event = eventStack[eventStack.length - self.depth];
        const hasChildren = eventStack.length > self.depth;
        node = new _BottomUpNode(self.root, childId, event, hasChildren, self);
        nodeById.set(childId, node);
      } else {
        node.events.push(e);
      }
      const actualEndTime = currentEndTime !== void 0 ? Math.min(currentEndTime, endTime) : endTime;
      const totalTime = actualEndTime - Math.max(currentStartTime, lastTimeMarker);
      node.selfTime += selfTime || 0;
      node.totalTime += totalTime;
      lastTimeMarker = actualEndTime;
    }
    this.cachedChildren = this.root.filterChildren(nodeById);
    return this.cachedChildren;
  }
  searchTree(matchFunction, results) {
    results = results || [];
    if (this.event && matchFunction(this.event)) {
      results.push(this);
    }
    return results;
  }
};
function eventStackFrame(event) {
  if (Types7.Events.isProfileCall(event)) {
    return event.callFrame;
  }
  const topFrame = event.args?.data?.stackTrace?.[0];
  if (!topFrame) {
    return null;
  }
  return { ...topFrame, scriptId: String(topFrame.scriptId) };
}
function generateEventID(event) {
  if (Types7.Events.isProfileCall(event)) {
    const name = SamplesIntegrator.isNativeRuntimeFrame(event.callFrame) ? SamplesIntegrator.nativeGroup(event.callFrame.functionName) : event.callFrame.functionName;
    const location = event.callFrame.scriptId || event.callFrame.url || "";
    return `f:${name}@${location}`;
  }
  if (Types7.Events.isConsoleTimeStamp(event) && event.args.data) {
    return `${event.name}:${event.args.data.name}`;
  }
  if (Types7.Events.isSyntheticNetworkRequest(event) || Types7.Events.isReceivedDataEvent(event)) {
    return `req:${event.args.data.requestId}`;
  }
  return event.name;
}

// gen/front_end/models/trace/extras/ThirdParties.js
function collectMainThreadActivity(data) {
  const mainFrameMainThread = data.Renderer.processes.values().find((p) => {
    const url = p.url ?? "";
    return p.isOnMainFrame && !url.startsWith("about:") && !url.startsWith("chrome:");
  })?.threads.values().find((t) => t.name === "CrRendererMain");
  if (!mainFrameMainThread) {
    return [];
  }
  return mainFrameMainThread.entries;
}
function summarizeByThirdParty(data, traceBounds) {
  const mainThreadEvents = collectMainThreadActivity(data).sort(Helpers5.Trace.eventTimeComparator);
  const groupingFunction = (event) => {
    const entity = data.Renderer.entityMappings.entityByEvent.get(event);
    return entity?.name ?? "";
  };
  const node = getBottomUpTree(mainThreadEvents, traceBounds, groupingFunction);
  const summaries = summarizeBottomUpByEntity(node, data);
  return summaries;
}
function summarizeByURL(data, traceBounds) {
  const mainThreadEvents = collectMainThreadActivity(data).sort(Helpers5.Trace.eventTimeComparator);
  const groupingFunction = (event) => {
    return Handlers2.Helpers.getNonResolvedURL(event, data) ?? "";
  };
  const node = getBottomUpTree(mainThreadEvents, traceBounds, groupingFunction);
  const summaries = summarizeBottomUpByURL(node, data);
  return summaries;
}
function summarizeBottomUpByEntity(root, data) {
  const summaries = [];
  const topNodes = [...root.children().values()].flat();
  for (const node of topNodes) {
    if (node.id === "") {
      continue;
    }
    const entity = data.Renderer.entityMappings.entityByEvent.get(node.event);
    if (!entity) {
      continue;
    }
    const summary = {
      transferSize: node.transferSize,
      mainThreadTime: Types8.Timing.Milli(node.selfTime),
      entity,
      relatedEvents: data.Renderer.entityMappings.eventsByEntity.get(entity) ?? []
    };
    summaries.push(summary);
  }
  return summaries;
}
function summarizeBottomUpByURL(root, data) {
  const summaries = [];
  const allRequests = data.NetworkRequests.byTime;
  const topNodes = [...root.children().values()].flat();
  for (const node of topNodes) {
    if (node.id === "" || typeof node.id !== "string") {
      continue;
    }
    const entity = data.Renderer.entityMappings.entityByEvent.get(node.event);
    if (!entity) {
      continue;
    }
    const url = node.id;
    const request = allRequests.find((r) => r.args.data.url === url);
    const summary = {
      request,
      url,
      entity,
      transferSize: node.transferSize,
      mainThreadTime: Types8.Timing.Milli(node.selfTime)
    };
    summaries.push(summary);
  }
  return summaries;
}
function getBottomUpTree(mainThreadEvents, tracebounds, groupingFunction) {
  const visibleEvents = Helpers5.Trace.VISIBLE_TRACE_EVENT_TYPES.values().toArray();
  const filter = new VisibleEventsFilter(visibleEvents.concat([
    "SyntheticNetworkRequest"
    /* Types.Events.Name.SYNTHETIC_NETWORK_REQUEST */
  ]));
  const startTime = Helpers5.Timing.microToMilli(tracebounds.min);
  const endTime = Helpers5.Timing.microToMilli(tracebounds.max);
  return new BottomUpRootNode(mainThreadEvents, {
    textFilter: new ExclusiveNameFilter([]),
    filters: [filter],
    startTime,
    endTime,
    eventGroupIdCallback: groupingFunction,
    calculateTransferSize: true,
    // Ensure we group by 3P alongside eventID for correct 3P grouping.
    forceGroupIdCallback: true
  });
}
export {
  FilmStrip_exports as FilmStrip,
  MainThreadActivity_exports as MainThreadActivity,
  ScriptDuplication_exports as ScriptDuplication,
  StackTraceForEvent_exports as StackTraceForEvent,
  ThirdParties_exports as ThirdParties,
  TraceFilter_exports as TraceFilter,
  TraceTree_exports as TraceTree
};
//# sourceMappingURL=extras.js.map
