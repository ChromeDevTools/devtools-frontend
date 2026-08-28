var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/trace/extras/FilmStrip.ts
var FilmStrip_exports = {};
__export(FilmStrip_exports, {
  frameClosestToTimestamp: () => frameClosestToTimestamp,
  fromHandlerData: () => fromHandlerData
});
import * as Platform from "../../../core/platform/platform.js";
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
  const closestFrameIndexBeforeTimestamp = Platform.ArrayUtilities.nearestIndexFromEnd(
    filmStrip.frames,
    (frame) => frame.screenshotEvent.ts < searchTimestamp
  );
  if (closestFrameIndexBeforeTimestamp === null) {
    return null;
  }
  return filmStrip.frames[closestFrameIndexBeforeTimestamp];
}

// ../../front_end/models/trace/extras/Initiators.ts
var Initiators_exports = {};
__export(Initiators_exports, {
  getNetworkInitiator: () => getNetworkInitiator
});

// ../../front_end/models/trace/extras/StackTraceForEvent.ts
var StackTraceForEvent_exports = {};
__export(StackTraceForEvent_exports, {
  clearCacheForTrace: () => clearCacheForTrace,
  get: () => get,
  stackTraceForEventInTrace: () => stackTraceForEventInTrace
});
import * as Helpers from "../helpers/helpers.js";
import * as Types from "../types/types.js";
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
  if (Types.Extensions.isSyntheticExtensionEntry(event)) {
    result = getForExtensionEntry(event, data);
  } else if (Types.Events.isPerformanceMeasureBegin(event)) {
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
    if (!Types.Events.isProfileCall(node.entry)) {
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
  if (Types.Events.isPerformanceMeasureBegin(rawEvent)) {
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
  const payloadCallStack = Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event) || [];
  const callFrames = [];
  for (const frame of payloadCallStack) {
    callFrames.push({ ...frame, scriptId: String(frame.scriptId) });
  }
  return callFrames;
}

// ../../front_end/models/trace/extras/Initiators.ts
function getNetworkInitiator(data, event) {
  const networkHandlerInitiator = data.NetworkRequests.incompleteInitiator.get(event);
  if (networkHandlerInitiator?.args.data.mimeType === "text/css") {
    return networkHandlerInitiator;
  }
  const stack = get(event.rawSourceEvent, data);
  const initiatorCallFrame = stack?.parent?.callFrames.at(0);
  if (!initiatorCallFrame) {
    return networkHandlerInitiator;
  }
  const matchingRequestIds = data.NetworkRequests.requestIdsByURL.get(initiatorCallFrame.url) ?? [];
  const matchingRequests = matchingRequestIds.map((id) => data.NetworkRequests.byId.get(id)).filter((req) => req !== void 0).filter((req) => req.ts < event.ts);
  return matchingRequests.at(-1);
}

// ../../front_end/models/trace/extras/MainThreadActivity.ts
var MainThreadActivity_exports = {};
__export(MainThreadActivity_exports, {
  calculateWindow: () => calculateWindow
});
import * as Helpers2 from "../helpers/helpers.js";
import * as Types2 from "../types/types.js";
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
    if (Types2.Events.isProfileCall(entry) && (IDLE_FUNCTION_CALL_NAMES.has(entry.callFrame.functionName) || !entry.callFrame.functionName)) {
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
    const timings = Helpers2.Timing.eventTimingsMicroSeconds(entryAtCut);
    let cutTime = (timings.startTime + timings.endTime) / 2;
    let usedTime = 0;
    const step = Math.sign(stopIndex - startIndex);
    for (let i = startIndex; i !== stopIndex; i += step) {
      const task = entriesWithIdleRemoved[i];
      const taskTimings = Helpers2.Timing.eventTimingsMicroSeconds(task);
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
  const leftTimings = Helpers2.Timing.eventTimingsMicroSeconds(entriesWithIdleRemoved[leftIndex]);
  const rightTimings = Helpers2.Timing.eventTimingsMicroSeconds(entriesWithIdleRemoved[rightIndex]);
  let leftTime = leftTimings.startTime;
  let rightTime = rightTimings.endTime;
  const zoomedInSpan = rightTime - leftTime;
  if (zoomedInSpan < traceBounds.range * 0.1) {
    return traceBounds;
  }
  leftTime = Types2.Timing.Micro(Math.max(leftTime - 0.05 * zoomedInSpan, traceBounds.min));
  rightTime = Types2.Timing.Micro(Math.min(rightTime + 0.05 * zoomedInSpan, traceBounds.max));
  return {
    min: leftTime,
    max: rightTime,
    range: Types2.Timing.Micro(rightTime - leftTime)
  };
}

// ../../front_end/models/trace/extras/ScriptDuplication.ts
var ScriptDuplication_exports = {};
__export(ScriptDuplication_exports, {
  computeScriptDuplication: () => computeScriptDuplication,
  getNodeModuleName: () => getNodeModuleName,
  normalizeDuplication: () => normalizeDuplication,
  normalizeSource: () => normalizeSource
});
import * as Handlers from "../handlers/handlers.js";
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

// ../../front_end/models/trace/extras/ThirdParties.ts
var ThirdParties_exports = {};
__export(ThirdParties_exports, {
  summarizeByThirdParty: () => summarizeByThirdParty,
  summarizeByURL: () => summarizeByURL
});
import * as Handlers2 from "../handlers/handlers.js";
import * as Helpers5 from "../helpers/helpers.js";
import * as Types5 from "../types/types.js";

// ../../front_end/models/trace/extras/TraceFilter.ts
var TraceFilter_exports = {};
__export(TraceFilter_exports, {
  ExclusiveNameFilter: () => ExclusiveNameFilter,
  InvisibleEventsFilter: () => InvisibleEventsFilter,
  TraceFilter: () => TraceFilter,
  VisibleEventsFilter: () => VisibleEventsFilter
});
import * as Types3 from "../types/types.js";
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
      return Types3.Events.Name.CONSOLE_TIME;
    }
    if (event.cat.includes("blink.user_timing")) {
      return Types3.Events.Name.USER_TIMING;
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

// ../../front_end/models/trace/extras/TraceTree.ts
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
import * as Helpers3 from "../helpers/helpers.js";
import * as Types4 from "../types/types.js";
var SamplesIntegrator2 = Helpers3.SamplesIntegrator.SamplesIntegrator;
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
    Helpers3.Trace.forEachEvent(
      root.events,
      {
        onStartEvent,
        onEndEvent,
        onInstantEvent: instantEventCallback,
        startTime: Helpers3.Timing.milliToMicro(startTime),
        endTime: Helpers3.Timing.milliToMicro(endTime),
        eventFilter: root.filter,
        ignoreAsyncEvents: false
      }
    );
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
      if (Types4.Events.isReceivedDataEvent(e)) {
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
  constructor(events, {
    textFilter,
    filters,
    startTime,
    endTime,
    eventGroupIdCallback,
    calculateTransferSize,
    forceGroupIdCallback
  }) {
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
    const idToIsCacheHit = /* @__PURE__ */ new Map();
    for (const e of this.events) {
      if (Types4.Events.isReceivedDataEvent(e) && e.name === "ResourceReceiveResponse") {
        let id = generateEventID(e);
        if (this.forceGroupIdCallback && this.eventGroupIdCallback) {
          id = `${id}-${this.eventGroupIdCallback(e)}`;
        }
        idToIsCacheHit.set(id, e.args.data.fromCache || false);
      }
    }
    const sumTransferSizeOfInstantEvent = (e) => {
      if (Types4.Events.isReceivedDataEvent(e)) {
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
          if (idToIsCacheHit.get(id)) {
            node.transferSize = 0;
          } else {
            node.transferSize += e.args.data.encodedDataLength;
          }
        } else if (e.name === "ResourceFinish" && e.args.data.encodedDataLength === 0 && idToIsCacheHit.get(id)) {
          node.transferSize = 0;
        } else if (e.args.data.encodedDataLength > 0) {
          node.transferSize = e.args.data.encodedDataLength;
        }
      }
    };
    Helpers3.Trace.forEachEvent(
      this.events,
      {
        onStartEvent,
        onEndEvent,
        onInstantEvent: this.calculateTransferSize ? sumTransferSizeOfInstantEvent : void 0,
        startTime: Helpers3.Timing.milliToMicro(this.startTime),
        endTime: Helpers3.Timing.milliToMicro(this.endTime),
        eventFilter: this.filter,
        ignoreAsyncEvents: false
      }
    );
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
    Helpers3.Trace.forEachEvent(
      this.root.events,
      {
        onStartEvent,
        onEndEvent,
        startTime: Helpers3.Timing.milliToMicro(startTime),
        endTime: Helpers3.Timing.milliToMicro(endTime),
        eventFilter: this.root.filter,
        ignoreAsyncEvents: false
      }
    );
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
  if (Types4.Events.isProfileCall(event)) {
    return event.callFrame;
  }
  const topFrame = event.args?.data?.stackTrace?.[0];
  if (!topFrame) {
    return null;
  }
  return { ...topFrame, scriptId: String(topFrame.scriptId) };
}
function generateEventID(event) {
  if (Types4.Events.isProfileCall(event)) {
    const name = SamplesIntegrator2.isNativeRuntimeFrame(event.callFrame) ? SamplesIntegrator2.nativeGroup(event.callFrame.functionName) : event.callFrame.functionName;
    const location = event.callFrame.scriptId || event.callFrame.url || "";
    return `f:${name}@${location}:${event.callFrame.lineNumber}:${event.callFrame.columnNumber}`;
  }
  if (Types4.Events.isConsoleTimeStamp(event) && event.args.data) {
    return `${event.name}:${event.args.data.name}`;
  }
  if (Types4.Events.isSyntheticNetworkRequest(event) || Types4.Events.isReceivedDataEvent(event)) {
    return `req:${event.args.data.requestId}`;
  }
  return event.name;
}

// ../../front_end/models/trace/extras/ThirdParties.ts
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
      mainThreadTime: Types5.Timing.Milli(node.selfTime),
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
      mainThreadTime: Types5.Timing.Milli(node.selfTime)
    };
    summaries.push(summary);
  }
  return summaries;
}
function getBottomUpTree(mainThreadEvents, tracebounds, groupingFunction) {
  const visibleEvents = Helpers5.Trace.VISIBLE_TRACE_EVENT_TYPES.values().toArray();
  const filter = new VisibleEventsFilter(visibleEvents.concat([Types5.Events.Name.SYNTHETIC_NETWORK_REQUEST]));
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
  Initiators_exports as Initiators,
  MainThreadActivity_exports as MainThreadActivity,
  ScriptDuplication_exports as ScriptDuplication,
  StackTraceForEvent_exports as StackTraceForEvent,
  ThirdParties_exports as ThirdParties,
  TraceFilter_exports as TraceFilter,
  TraceTree_exports as TraceTree
};
//# sourceMappingURL=extras.js.map
