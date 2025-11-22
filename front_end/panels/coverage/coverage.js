var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/coverage/CoverageModel.js
var CoverageModel_exports = {};
__export(CoverageModel_exports, {
  CoverageInfo: () => CoverageInfo,
  CoverageModel: () => CoverageModel,
  Events: () => Events,
  SourceURLCoverageInfo: () => SourceURLCoverageInfo,
  URLCoverageInfo: () => URLCoverageInfo,
  mergeSegments: () => mergeSegments
});
import * as Common from "./../../core/common/common.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Workspace from "./../../models/workspace/workspace.js";
var Events;
(function(Events2) {
  Events2["CoverageUpdated"] = "CoverageUpdated";
  Events2["CoverageReset"] = "CoverageReset";
  Events2["SourceMapResolved"] = "SourceMapResolved";
})(Events || (Events = {}));
var COVERAGE_POLLING_PERIOD_MS = 200;
var RESOLVE_SOURCEMAP_TIMEOUT = 500;
var CoverageModel = class _CoverageModel extends SDK.SDKModel.SDKModel {
  cpuProfilerModel;
  cssModel;
  debuggerModel;
  coverageByURL;
  coverageByContentProvider;
  coverageUpdateTimes;
  suspensionState;
  pollTimer;
  currentPollPromise;
  shouldResumePollingOnResume;
  jsBacklog;
  cssBacklog;
  performanceTraceRecording;
  sourceMapManager;
  willResolveSourceMaps;
  processSourceMapBacklog;
  constructor(target) {
    super(target);
    this.cpuProfilerModel = target.model(SDK.CPUProfilerModel.CPUProfilerModel);
    this.cssModel = target.model(SDK.CSSModel.CSSModel);
    this.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    this.sourceMapManager = this.debuggerModel?.sourceMapManager() || null;
    this.sourceMapManager?.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this.sourceMapAttached, this);
    this.coverageByURL = /* @__PURE__ */ new Map();
    this.coverageByContentProvider = /* @__PURE__ */ new Map();
    this.coverageUpdateTimes = /* @__PURE__ */ new Set();
    this.suspensionState = "Active";
    this.pollTimer = null;
    this.currentPollPromise = null;
    this.shouldResumePollingOnResume = false;
    this.jsBacklog = [];
    this.cssBacklog = [];
    this.performanceTraceRecording = false;
    this.willResolveSourceMaps = false;
    this.processSourceMapBacklog = [];
  }
  async start(jsCoveragePerBlock) {
    if (this.suspensionState !== "Active") {
      throw new Error("Cannot start CoverageModel while it is not active.");
    }
    const promises = [];
    if (this.cssModel) {
      this.clearCSS();
      this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.handleStyleSheetAdded, this);
      promises.push(this.cssModel.startCoverage());
    }
    if (this.cpuProfilerModel) {
      promises.push(this.cpuProfilerModel.startPreciseCoverage(jsCoveragePerBlock, this.preciseCoverageDeltaUpdate.bind(this)));
    }
    await Promise.all(promises);
    return Boolean(this.cssModel || this.cpuProfilerModel);
  }
  async sourceMapAttached(event) {
    const script = event.data.client;
    const sourceMap = event.data.sourceMap;
    this.processSourceMapBacklog.push({ script, sourceMap });
    if (!this.willResolveSourceMaps) {
      this.willResolveSourceMaps = true;
      setTimeout(this.resolveSourceMapsAndUpdate.bind(this), RESOLVE_SOURCEMAP_TIMEOUT);
    }
  }
  async resolveSourceMapsAndUpdate() {
    this.willResolveSourceMaps = false;
    const currentBacklog = this.processSourceMapBacklog;
    this.processSourceMapBacklog = [];
    await Promise.all(currentBacklog.map(({ script, sourceMap }) => this.resolveSourceMap(script, sourceMap)));
    this.dispatchEventToListeners(Events.SourceMapResolved);
  }
  async resolveSourceMap(script, sourceMap) {
    const url = script.sourceURL;
    const urlCoverage = this.coverageByURL.get(url);
    if (!urlCoverage) {
      return;
    }
    if (urlCoverage.sourcesURLCoverageInfo.size === 0) {
      const generatedContent = TextUtils.ContentData.ContentData.contentDataOrEmpty(await script.requestContentData());
      const [sourceSizeMap, sourceSegments] = this.calculateSizeForSources(sourceMap, generatedContent.textObj, script.contentLength);
      urlCoverage.setSourceSegments(sourceSegments);
      for (const sourceURL of sourceMap.sourceURLs()) {
        this.addCoverageForSource(sourceURL, sourceSizeMap.get(sourceURL) || 0, urlCoverage.type(), urlCoverage);
      }
    }
  }
  async preciseCoverageDeltaUpdate(timestamp, coverageData) {
    this.coverageUpdateTimes.add(timestamp);
    const result = await this.backlogOrProcessJSCoverage(coverageData, timestamp);
    if (result.length) {
      this.dispatchEventToListeners(Events.CoverageUpdated, result);
    }
  }
  async stop() {
    await this.stopPolling();
    const promises = [];
    if (this.cpuProfilerModel) {
      promises.push(this.cpuProfilerModel.stopPreciseCoverage());
    }
    if (this.cssModel) {
      promises.push(this.cssModel.stopCoverage());
      this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.handleStyleSheetAdded, this);
    }
    await Promise.all(promises);
  }
  reset() {
    this.coverageByURL = /* @__PURE__ */ new Map();
    this.coverageByContentProvider = /* @__PURE__ */ new Map();
    this.coverageUpdateTimes = /* @__PURE__ */ new Set();
    this.dispatchEventToListeners(Events.CoverageReset);
  }
  async startPolling() {
    if (this.currentPollPromise || this.suspensionState !== "Active") {
      return;
    }
    await this.pollLoop();
  }
  async pollLoop() {
    this.clearTimer();
    this.currentPollPromise = this.pollAndCallback();
    await this.currentPollPromise;
    if (this.suspensionState === "Active" || this.performanceTraceRecording) {
      this.pollTimer = window.setTimeout(() => this.pollLoop(), COVERAGE_POLLING_PERIOD_MS);
    }
  }
  async stopPolling() {
    this.clearTimer();
    await this.currentPollPromise;
    this.currentPollPromise = null;
    await this.pollAndCallback();
  }
  async pollAndCallback() {
    if (this.suspensionState === "Suspended" && !this.performanceTraceRecording) {
      return;
    }
    const updates = await this.takeAllCoverage();
    console.assert(this.suspensionState !== "Suspended" || Boolean(this.performanceTraceRecording), "CoverageModel was suspended while polling.");
    if (updates.length) {
      this.dispatchEventToListeners(Events.CoverageUpdated, updates);
    }
  }
  clearTimer() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
  /**
   * Stops polling as preparation for suspension. This function is idempotent
   * due because it changes the state to suspending.
   */
  async preSuspendModel(reason) {
    if (this.suspensionState !== "Active") {
      return;
    }
    this.suspensionState = "Suspending";
    if (reason === "performance-timeline") {
      this.performanceTraceRecording = true;
      return;
    }
    if (this.currentPollPromise) {
      await this.stopPolling();
      this.shouldResumePollingOnResume = true;
    }
  }
  async suspendModel(_reason) {
    this.suspensionState = "Suspended";
  }
  async resumeModel() {
  }
  /**
   * Restarts polling after suspension. Note that the function is idempotent
   * because starting polling is idempotent.
   */
  async postResumeModel() {
    this.suspensionState = "Active";
    this.performanceTraceRecording = false;
    if (this.shouldResumePollingOnResume) {
      this.shouldResumePollingOnResume = false;
      await this.startPolling();
    }
  }
  entries() {
    return Array.from(this.coverageByURL.values());
  }
  getCoverageForUrl(url) {
    return this.coverageByURL.get(url) || null;
  }
  usageForRange(contentProvider, startOffset, endOffset) {
    const coverageInfo = this.coverageByContentProvider.get(contentProvider);
    return coverageInfo?.usageForRange(startOffset, endOffset);
  }
  clearCSS() {
    for (const entry of this.coverageByContentProvider.values()) {
      if (entry.type() !== 1) {
        continue;
      }
      const contentProvider = entry.getContentProvider();
      this.coverageByContentProvider.delete(contentProvider);
      const urlEntry = this.coverageByURL.get(entry.url());
      if (!urlEntry) {
        continue;
      }
      const key = `${contentProvider.startLine}:${contentProvider.startColumn}`;
      urlEntry.removeCoverageEntry(key, entry);
      if (urlEntry.numberOfEntries() === 0) {
        this.coverageByURL.delete(entry.url());
      }
    }
    if (this.cssModel) {
      for (const styleSheetHeader of this.cssModel.getAllStyleSheetHeaders()) {
        this.addStyleSheetToCSSCoverage(styleSheetHeader);
      }
    }
  }
  async takeAllCoverage() {
    const [updatesCSS, updatesJS] = await Promise.all([this.takeCSSCoverage(), this.takeJSCoverage()]);
    return [...updatesCSS, ...updatesJS];
  }
  async takeJSCoverage() {
    if (!this.cpuProfilerModel) {
      return [];
    }
    const { coverage, timestamp } = await this.cpuProfilerModel.takePreciseCoverage();
    this.coverageUpdateTimes.add(timestamp);
    return await this.backlogOrProcessJSCoverage(coverage, timestamp);
  }
  async backlogOrProcessJSCoverage(freshRawCoverageData, freshTimestamp) {
    if (freshRawCoverageData.length > 0) {
      this.jsBacklog.push({ rawCoverageData: freshRawCoverageData, stamp: freshTimestamp });
    }
    if (this.suspensionState !== "Active") {
      return [];
    }
    const ascendingByTimestamp = (x, y) => x.stamp - y.stamp;
    const results = [];
    for (const { rawCoverageData, stamp } of this.jsBacklog.sort(ascendingByTimestamp)) {
      results.push(await this.processJSCoverage(rawCoverageData, stamp));
    }
    this.jsBacklog = [];
    return results.flat();
  }
  async processJSBacklog() {
    void this.backlogOrProcessJSCoverage([], 0);
  }
  async processJSCoverage(scriptsCoverage, stamp) {
    if (!this.debuggerModel) {
      return [];
    }
    const updatedEntries = [];
    for (const entry of scriptsCoverage) {
      const script = this.debuggerModel.scriptForId(entry.scriptId);
      if (!script) {
        continue;
      }
      const ranges = [];
      let type = 2;
      for (const func of entry.functions) {
        if (func.isBlockCoverage === false && !(func.ranges.length === 1 && !func.ranges[0].count)) {
          type |= 4;
        }
        for (const range of func.ranges) {
          ranges.push(range);
        }
      }
      const subentry = await this.addCoverage(script, script.contentLength, script.lineOffset, script.columnOffset, ranges, type, stamp);
      if (subentry) {
        updatedEntries.push(...subentry);
      }
    }
    return updatedEntries;
  }
  handleStyleSheetAdded(event) {
    this.addStyleSheetToCSSCoverage(event.data);
  }
  async takeCSSCoverage() {
    if (!this.cssModel || this.suspensionState !== "Active") {
      return [];
    }
    const { coverage, timestamp } = await this.cssModel.takeCoverageDelta();
    this.coverageUpdateTimes.add(timestamp);
    return await this.backlogOrProcessCSSCoverage(coverage, timestamp);
  }
  async backlogOrProcessCSSCoverage(freshRawCoverageData, freshTimestamp) {
    if (freshRawCoverageData.length > 0) {
      this.cssBacklog.push({ rawCoverageData: freshRawCoverageData, stamp: freshTimestamp });
    }
    if (this.suspensionState !== "Active") {
      return [];
    }
    const ascendingByTimestamp = (x, y) => x.stamp - y.stamp;
    const results = [];
    for (const { rawCoverageData, stamp } of this.cssBacklog.sort(ascendingByTimestamp)) {
      results.push(await this.processCSSCoverage(rawCoverageData, stamp));
    }
    this.cssBacklog = [];
    return results.flat();
  }
  async processCSSCoverage(ruleUsageList, stamp) {
    if (!this.cssModel) {
      return [];
    }
    const updatedEntries = [];
    const rulesByStyleSheet = /* @__PURE__ */ new Map();
    for (const rule of ruleUsageList) {
      const styleSheetHeader = this.cssModel.styleSheetHeaderForId(rule.styleSheetId);
      if (!styleSheetHeader) {
        continue;
      }
      let ranges = rulesByStyleSheet.get(styleSheetHeader);
      if (!ranges) {
        ranges = [];
        rulesByStyleSheet.set(styleSheetHeader, ranges);
      }
      ranges.push({ startOffset: rule.startOffset, endOffset: rule.endOffset, count: Number(rule.used) });
    }
    for (const entry of rulesByStyleSheet) {
      const styleSheetHeader = entry[0];
      const ranges = entry[1];
      const subentry = await this.addCoverage(styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn, ranges, 1, stamp);
      if (subentry) {
        updatedEntries.push(...subentry);
      }
    }
    return updatedEntries;
  }
  static convertToDisjointSegments(ranges, stamp) {
    ranges.sort((a, b) => a.startOffset - b.startOffset);
    const result = [];
    const stack = [];
    for (const entry of ranges) {
      let top = stack[stack.length - 1];
      while (top && top.endOffset <= entry.startOffset) {
        append(top.endOffset, top.count);
        stack.pop();
        top = stack[stack.length - 1];
      }
      append(entry.startOffset, top ? top.count : 0);
      stack.push(entry);
    }
    for (let top = stack.pop(); top; top = stack.pop()) {
      append(top.endOffset, top.count);
    }
    function append(end, count) {
      const last = result[result.length - 1];
      if (last) {
        if (last.end === end) {
          return;
        }
        if (last.count === count) {
          last.end = end;
          return;
        }
      }
      result.push({ end, count, stamp });
    }
    return result;
  }
  addStyleSheetToCSSCoverage(styleSheetHeader) {
    void this.addCoverage(styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn, [], 1, Date.now());
  }
  calculateSizeForSources(sourceMap, text, contentLength) {
    const sourceSizeMap = /* @__PURE__ */ new Map();
    const sourceSegments = [];
    const calculateSize = function(startLine, startCol, endLine, endCol) {
      if (startLine === endLine) {
        return endCol - startCol;
      }
      if (text) {
        const startOffset = text.offsetFromPosition(startLine, startCol);
        const endOffset = text.offsetFromPosition(endLine, endCol);
        return endOffset - startOffset;
      }
      return endCol;
    };
    const mappings = sourceMap.mappings();
    if (mappings.length === 0) {
      return [sourceSizeMap, sourceSegments];
    }
    let lastEntry = mappings[0];
    let totalSegmentSize = 0;
    if (text) {
      totalSegmentSize += text.offsetFromPosition(lastEntry.lineNumber, lastEntry.columnNumber);
    } else {
      totalSegmentSize += calculateSize(0, 0, lastEntry.lineNumber, lastEntry.columnNumber);
    }
    sourceSegments.push({ end: totalSegmentSize, sourceUrl: "" });
    for (let i = 0; i < mappings.length; i++) {
      const curEntry = mappings[i];
      const entryRange = sourceMap.findEntryRanges(curEntry.lineNumber, curEntry.columnNumber);
      if (entryRange) {
        const range = entryRange.range;
        const sourceURL = entryRange.sourceURL;
        const oldSize = sourceSizeMap.get(sourceURL) || 0;
        let size = 0;
        if (i === mappings.length - 1) {
          const startOffset = text.offsetFromPosition(range.startLine, range.startColumn);
          size = contentLength - startOffset;
        } else {
          size = calculateSize(range.startLine, range.startColumn, range.endLine, range.endColumn);
        }
        sourceSizeMap.set(sourceURL, oldSize + size);
      }
      const segmentSize = calculateSize(lastEntry.lineNumber, lastEntry.columnNumber, curEntry.lineNumber, curEntry.columnNumber);
      totalSegmentSize += segmentSize;
      if (curEntry.sourceURL !== lastEntry.sourceURL) {
        if (text) {
          const endOffsetForLastEntry = text.offsetFromPosition(curEntry.lineNumber, curEntry.columnNumber);
          sourceSegments.push({ end: endOffsetForLastEntry, sourceUrl: lastEntry.sourceURL || "" });
        } else {
          sourceSegments.push({ end: totalSegmentSize, sourceUrl: lastEntry.sourceURL || "" });
        }
      }
      lastEntry = curEntry;
      if (i === mappings.length - 1) {
        sourceSegments.push({ end: contentLength, sourceUrl: curEntry.sourceURL || "" });
      }
    }
    return [sourceSizeMap, sourceSegments];
  }
  async addCoverage(contentProvider, contentLength, startLine, startColumn, ranges, type, stamp) {
    const coverageInfoArray = [];
    const url = contentProvider.contentURL();
    if (!url) {
      return null;
    }
    let urlCoverage = this.coverageByURL.get(url);
    let isNewUrlCoverage = false;
    if (!urlCoverage) {
      isNewUrlCoverage = true;
      urlCoverage = new URLCoverageInfo(url);
      this.coverageByURL.set(url, urlCoverage);
      const sourceMap = await this.sourceMapManager?.sourceMapForClientPromise(contentProvider);
      if (sourceMap) {
        const generatedContent = TextUtils.ContentData.ContentData.contentDataOrEmpty(await contentProvider.requestContentData());
        const [sourceSizeMap, sourceSegments] = this.calculateSizeForSources(sourceMap, generatedContent.textObj, contentLength);
        urlCoverage.setSourceSegments(sourceSegments);
        for (const sourceURL of sourceMap.sourceURLs()) {
          const subentry = this.addCoverageForSource(sourceURL, sourceSizeMap.get(sourceURL) || 0, type, urlCoverage);
          if (subentry) {
            coverageInfoArray.push(subentry);
          }
        }
      }
    }
    const coverageInfo = urlCoverage.ensureEntry(contentProvider, contentLength, startLine, startColumn, type);
    this.coverageByContentProvider.set(contentProvider, coverageInfo);
    const segments = _CoverageModel.convertToDisjointSegments(ranges, stamp);
    const last = segments[segments.length - 1];
    if (last && last.end < contentLength) {
      segments.push({ end: contentLength, stamp, count: 0 });
    }
    const usedSizeDelta = coverageInfo.mergeCoverage(segments);
    if (!isNewUrlCoverage && usedSizeDelta === 0) {
      return null;
    }
    urlCoverage.addToSizes(usedSizeDelta, 0);
    for (const [sourceUrl, sizeDelta] of coverageInfo.sourceDeltaMap) {
      const sourceURLCoverageInfo = urlCoverage.sourcesURLCoverageInfo.get(sourceUrl);
      if (sourceURLCoverageInfo) {
        sourceURLCoverageInfo.addToSizes(sizeDelta, 0);
        sourceURLCoverageInfo.lastSourceUsedRange = coverageInfo.sourceUsedRangeMap.get(sourceUrl) || [];
      }
    }
    coverageInfoArray.push(coverageInfo);
    return coverageInfoArray;
  }
  addCoverageForSource(url, size, type, generatedUrlCoverage) {
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
    const contentProvider = uiSourceCode;
    const urlCoverage = new SourceURLCoverageInfo(url, generatedUrlCoverage);
    const coverageInfo = urlCoverage.ensureEntry(contentProvider, size, 0, 0, type);
    generatedUrlCoverage.sourcesURLCoverageInfo.set(url, urlCoverage);
    return coverageInfo;
  }
  async exportReport(fos) {
    const result = [];
    const coverageByUrlKeys = Array.from(this.coverageByURL.keys()).sort();
    for (const urlInfoKey of coverageByUrlKeys) {
      const urlInfo = this.coverageByURL.get(urlInfoKey);
      if (!urlInfo) {
        continue;
      }
      const url = urlInfo.url();
      if (url.startsWith("extensions::") || Common.ParsedURL.schemeIs(url, "chrome-extension:")) {
        continue;
      }
      result.push(...await urlInfo.entriesForExport());
    }
    await fos.write(JSON.stringify(result, void 0, 2));
    void fos.close();
  }
};
SDK.SDKModel.SDKModel.register(CoverageModel, { capabilities: 0, autostart: false });
function locationCompare(a, b) {
  const [aLine, aPos] = a.split(":");
  const [bLine, bPos] = b.split(":");
  return Number.parseInt(aLine, 10) - Number.parseInt(bLine, 10) || Number.parseInt(aPos, 10) - Number.parseInt(bPos, 10);
}
var URLCoverageInfo = class _URLCoverageInfo extends Common.ObjectWrapper.ObjectWrapper {
  #url;
  coverageInfoByLocation;
  #size;
  #usedSize;
  #type;
  #isContentScript;
  sourcesURLCoverageInfo = /* @__PURE__ */ new Map();
  sourceSegments;
  constructor(url) {
    super();
    this.#url = url;
    this.coverageInfoByLocation = /* @__PURE__ */ new Map();
    this.#size = 0;
    this.#usedSize = 0;
    this.#isContentScript = false;
  }
  url() {
    return this.#url;
  }
  type() {
    return this.#type;
  }
  size() {
    return this.#size;
  }
  usedSize() {
    return this.#usedSize;
  }
  unusedSize() {
    return this.#size - this.#usedSize;
  }
  usedPercentage() {
    if (this.#size === 0) {
      return 0;
    }
    if (!this.unusedSize() || !this.size()) {
      return 0;
    }
    return this.usedSize() / this.size();
  }
  unusedPercentage() {
    if (this.#size === 0) {
      return 1;
    }
    return this.unusedSize() / this.size();
  }
  isContentScript() {
    return this.#isContentScript;
  }
  entries() {
    return this.coverageInfoByLocation.values();
  }
  numberOfEntries() {
    return this.coverageInfoByLocation.size;
  }
  removeCoverageEntry(key, entry) {
    if (!this.coverageInfoByLocation.delete(key)) {
      return;
    }
    this.addToSizes(-entry.getUsedSize(), -entry.getSize());
  }
  addToSizes(usedSize, size) {
    this.#usedSize += usedSize;
    this.#size += size;
    if (usedSize !== 0 || size !== 0) {
      this.dispatchEventToListeners(_URLCoverageInfo.Events.SizesChanged);
    }
  }
  setSourceSegments(segments) {
    this.sourceSegments = segments;
  }
  ensureEntry(contentProvider, contentLength, lineOffset, columnOffset, type) {
    const key = `${lineOffset}:${columnOffset}`;
    let entry = this.coverageInfoByLocation.get(key);
    if (type & 2 && !this.coverageInfoByLocation.size && contentProvider instanceof SDK.Script.Script) {
      this.#isContentScript = contentProvider.isContentScript();
    }
    this.#type |= type;
    if (entry) {
      entry.addCoverageType(type);
      return entry;
    }
    if (type & 2 && !this.coverageInfoByLocation.size && contentProvider instanceof SDK.Script.Script) {
      this.#isContentScript = contentProvider.isContentScript();
    }
    entry = new CoverageInfo(contentProvider, contentLength, lineOffset, columnOffset, type, this);
    this.coverageInfoByLocation.set(key, entry);
    this.addToSizes(0, contentLength);
    return entry;
  }
  async getFullText() {
    let useFullText = false;
    const url = this.url();
    for (const info of this.coverageInfoByLocation.values()) {
      const { lineOffset, columnOffset } = info.getOffsets();
      if (lineOffset || columnOffset) {
        useFullText = Boolean(url);
        break;
      }
    }
    if (!useFullText) {
      return null;
    }
    const resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(url);
    if (!resource) {
      return null;
    }
    const content = TextUtils.ContentData.ContentData.contentDataOrEmpty(await resource.requestContentData());
    return content.textObj;
  }
  entriesForExportBasedOnFullText(fullText) {
    const coverageByLocationKeys = Array.from(this.coverageInfoByLocation.keys()).sort(locationCompare);
    const entry = { url: this.url(), ranges: [], text: fullText.value() };
    for (const infoKey of coverageByLocationKeys) {
      const info = this.coverageInfoByLocation.get(infoKey);
      if (!info) {
        continue;
      }
      const { lineOffset, columnOffset } = info.getOffsets();
      const offset = fullText ? fullText.offsetFromPosition(lineOffset, columnOffset) : 0;
      entry.ranges.push(...info.rangesForExport(offset));
    }
    return entry;
  }
  async entriesForExportBasedOnContent() {
    const coverageByLocationKeys = Array.from(this.coverageInfoByLocation.keys()).sort(locationCompare);
    const result = [];
    for (const infoKey of coverageByLocationKeys) {
      const info = this.coverageInfoByLocation.get(infoKey);
      if (!info) {
        continue;
      }
      const entry = {
        url: this.url(),
        ranges: info.rangesForExport(),
        text: TextUtils.ContentData.ContentData.textOr(await info.getContentProvider().requestContentData(), null)
      };
      result.push(entry);
    }
    return result;
  }
  async entriesForExport() {
    const fullText = await this.getFullText();
    if (fullText) {
      return [await this.entriesForExportBasedOnFullText(fullText)];
    }
    return await this.entriesForExportBasedOnContent();
  }
};
var SourceURLCoverageInfo = class extends URLCoverageInfo {
  generatedURLCoverageInfo;
  lastSourceUsedRange = [];
  constructor(sourceUrl, generatedUrlCoverage) {
    super(sourceUrl);
    this.generatedURLCoverageInfo = generatedUrlCoverage;
  }
};
(function(URLCoverageInfo2) {
  let Events2;
  (function(Events3) {
    Events3["SizesChanged"] = "SizesChanged";
  })(Events2 = URLCoverageInfo2.Events || (URLCoverageInfo2.Events = {}));
})(URLCoverageInfo || (URLCoverageInfo = {}));
var mergeSegments = (segmentsA, segmentsB) => {
  const result = [];
  let indexA = 0;
  let indexB = 0;
  while (indexA < segmentsA.length && indexB < segmentsB.length) {
    const a = segmentsA[indexA];
    const b = segmentsB[indexB];
    const count = (a.count || 0) + (b.count || 0);
    const end = Math.min(a.end, b.end);
    const last = result[result.length - 1];
    const stamp = Math.min(a.stamp, b.stamp);
    if (last?.count !== count || last.stamp !== stamp) {
      result.push({ end, count, stamp });
    } else {
      last.end = end;
    }
    if (a.end <= b.end) {
      indexA++;
    }
    if (a.end >= b.end) {
      indexB++;
    }
  }
  for (; indexA < segmentsA.length; indexA++) {
    result.push(segmentsA[indexA]);
  }
  for (; indexB < segmentsB.length; indexB++) {
    result.push(segmentsB[indexB]);
  }
  return result;
};
var CoverageInfo = class {
  contentProvider;
  size;
  usedSize;
  statsByTimestamp;
  lineOffset;
  columnOffset;
  coverageType;
  segments;
  generatedUrlCoverageInfo;
  sourceUsedSizeMap = /* @__PURE__ */ new Map();
  sourceDeltaMap = /* @__PURE__ */ new Map();
  sourceUsedRangeMap = /* @__PURE__ */ new Map();
  constructor(contentProvider, size, lineOffset, columnOffset, type, generatedUrlCoverageInfo) {
    this.contentProvider = contentProvider;
    this.size = size;
    this.usedSize = 0;
    this.statsByTimestamp = /* @__PURE__ */ new Map();
    this.lineOffset = lineOffset;
    this.columnOffset = columnOffset;
    this.coverageType = type;
    this.generatedUrlCoverageInfo = generatedUrlCoverageInfo;
    this.segments = [];
  }
  getContentProvider() {
    return this.contentProvider;
  }
  url() {
    return this.contentProvider.contentURL();
  }
  type() {
    return this.coverageType;
  }
  addCoverageType(type) {
    this.coverageType |= type;
  }
  getOffsets() {
    return { lineOffset: this.lineOffset, columnOffset: this.columnOffset };
  }
  /**
   * Returns the delta by which usedSize increased.
   */
  mergeCoverage(segments) {
    const oldUsedSize = this.usedSize;
    this.segments = mergeSegments(this.segments, segments);
    this.updateStats();
    if (this.generatedUrlCoverageInfo.sourceSegments && this.generatedUrlCoverageInfo.sourceSegments.length > 0) {
      this.updateSourceCoverage();
    }
    return this.usedSize - oldUsedSize;
  }
  getSize() {
    return this.size;
  }
  getUsedSize() {
    return this.usedSize;
  }
  usageForRange(start, end) {
    let index = Platform.ArrayUtilities.upperBound(this.segments, start, (position, segment) => position - segment.end);
    for (; index < this.segments.length && this.segments[index].end < end; ++index) {
      if (this.segments[index].count) {
        return true;
      }
    }
    return index < this.segments.length && Boolean(this.segments[index].count);
  }
  updateStats() {
    this.statsByTimestamp = /* @__PURE__ */ new Map();
    this.usedSize = 0;
    let last = 0;
    for (const segment of this.segments) {
      let previousCount = this.statsByTimestamp.get(segment.stamp);
      if (previousCount === void 0) {
        previousCount = 0;
      }
      if (segment.count) {
        const used = segment.end - last;
        this.usedSize += used;
        this.statsByTimestamp.set(segment.stamp, previousCount + used);
      }
      last = segment.end;
    }
  }
  updateSourceCoverage() {
    const sourceCoverage = /* @__PURE__ */ new Map();
    this.sourceDeltaMap = /* @__PURE__ */ new Map();
    this.sourceUsedRangeMap = /* @__PURE__ */ new Map();
    const ranges = this.generatedUrlCoverageInfo.sourceSegments || [];
    let segmentStart = 0;
    let lastFoundRange = 0;
    for (const segment of this.segments) {
      const segmentEnd = segment.end;
      if (segment.count) {
        for (let i = lastFoundRange; i < ranges.length; i++) {
          const rangeStart = i === 0 ? 0 : ranges[i - 1].end + 1;
          const rangeEnd = ranges[i].end;
          const overlapStart = Math.max(segmentStart, rangeStart);
          const overlapEnd = Math.min(segmentEnd, rangeEnd);
          if (overlapStart <= overlapEnd) {
            const overlapSize = overlapEnd - overlapStart + 1;
            const overlapRange = { start: overlapStart, end: overlapEnd };
            if (!sourceCoverage.has(ranges[i].sourceUrl)) {
              sourceCoverage.set(ranges[i].sourceUrl, overlapSize);
            } else {
              sourceCoverage.set(ranges[i].sourceUrl, sourceCoverage.get(ranges[i].sourceUrl) + overlapSize);
            }
            if (!this.sourceUsedRangeMap.has(ranges[i].sourceUrl)) {
              this.sourceUsedRangeMap.set(ranges[i].sourceUrl, [overlapRange]);
            } else {
              this.sourceUsedRangeMap.get(ranges[i].sourceUrl)?.push(overlapRange);
            }
            lastFoundRange = i;
          }
          if (segmentEnd < rangeEnd) {
            break;
          }
        }
      }
      segmentStart = segmentEnd + 1;
    }
    for (const [url, size] of sourceCoverage) {
      const oldSize = this.sourceUsedSizeMap.get(url) || 0;
      if (oldSize !== size) {
        this.sourceUsedSizeMap.set(url, size);
        this.sourceDeltaMap.set(url, size - oldSize);
      }
    }
  }
  rangesForExport(offset = 0) {
    const ranges = [];
    let start = 0;
    for (const segment of this.segments) {
      if (segment.count) {
        const last = ranges.length > 0 ? ranges[ranges.length - 1] : null;
        if (last?.end === start + offset) {
          last.end = segment.end + offset;
        } else {
          ranges.push({ start: start + offset, end: segment.end + offset });
        }
      }
      start = segment.end;
    }
    return ranges;
  }
};

// gen/front_end/panels/coverage/CoverageListView.js
var CoverageListView_exports = {};
__export(CoverageListView_exports, {
  CoverageListView: () => CoverageListView,
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  coverageTypeToString: () => coverageTypeToString
});
import "./../../ui/components/highlighting/highlighting.js";
import "./../../ui/legacy/components/data_grid/data_grid.js";
import * as Common2 from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Workspace3 from "./../../models/workspace/workspace.js";
import * as UI from "./../../ui/legacy/legacy.js";
import { Directives, html, nothing, render } from "./../../ui/lit/lit.js";

// gen/front_end/panels/coverage/coverageListView.css.js
var coverageListView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.data-grid {
  border: none;
}

.data-grid td .url-outer {
  width: 100%;
  display: inline-flex;
  justify-content: flex-start;
}

.data-grid td .url-outer .filter-highlight {
  font-weight: bold;
}

.data-grid td .url-prefix {
  overflow-x: hidden;
  text-overflow: ellipsis;
}

.data-grid td .url-suffix {
  flex: none;
}

.data-grid td .bar {
  display: inline-block;
  height: 8px;
  border: 1px solid transparent;
}

.data-grid td .bar-unused-size {
  background-color: var(--app-color-coverage-unused);
}

.data-grid td .bar-used-size {
  background-color: var(--app-color-coverage-used);
}

.data-grid td .percent-value {
  width: 7ex;
  display: inline-block;
  color: var(--sys-color-on-surface-subtle);
}

@media (forced-colors: active) {
  .data-grid td .bar-container {
    forced-color-adjust: none;
  }

  .data-grid td .bar-unused-size {
    background-color: ButtonText;
  }

  .data-grid td .bar-used-size {
    background-color: ButtonFace;
  }

  .data-grid td .bar {
    border-color: ButtonText;
  }

  .data-grid .selected td .bar {
    border-top-color: HighlightText;
    border-bottom-color: HighlightText;
  }

  .data-grid .selected td .bar:last-child {
    border-right-color: HighlightText;
  }

  .data-grid .selected td .bar:first-child {
    border-left-color: HighlightText;
  }

  .data-grid:focus tr.selected span.percent-value {
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./coverageListView.css")} */`;

// gen/front_end/panels/coverage/CoverageListView.js
var UIStrings = {
  /**
   * @description Text that appears on a button for the css resource type filter.
   */
  css: "CSS",
  /**
   * @description Text in Coverage List View of the Coverage tab
   */
  jsPerFunction: "JS (per function)",
  /**
   * @description Text in Coverage List View of the Coverage tab
   */
  jsPerBlock: "JS (per block)",
  /**
   * @description Text for web URLs
   */
  url: "URL",
  /**
   * @description Text that refers to some types
   */
  type: "Type",
  /**
   * @description Text in Coverage List View of the Coverage tab
   */
  totalBytes: "Total Bytes",
  /**
   * @description Text in Coverage List View of the Coverage tab
   */
  unusedBytes: "Unused Bytes",
  /**
   * @description Text in the Coverage List View of the Coverage Tab
   */
  usageVisualization: "Usage Visualization",
  /**
   * @description Data grid name for Coverage data grids
   */
  codeCoverage: "Code Coverage",
  /**
   * @description Cell title in Coverage List View of the Coverage tab. The coverage tool tells
   *developers which functions (logical groups of lines of code) were actually run/executed. If a
   *function does get run, then it is marked in the UI to indicate that it was covered.
   */
  jsCoverageWithPerFunction: "JS coverage with per function granularity: Once a function was executed, the whole function is marked as covered.",
  /**
   * @description Cell title in Coverage List View of the Coverage tab. The coverage tool tells
   *developers which blocks (logical groups of lines of code, smaller than a function) were actually
   *run/executed. If a block does get run, then it is marked in the UI to indicate that it was
   *covered.
   */
  jsCoverageWithPerBlock: "JS coverage with per block granularity: Once a block of JavaScript was executed, that block is marked as covered.",
  /**
   * @description Accessible text for the value in bytes in memory allocation or coverage view.
   */
  sBytes: "{n, plural, =1 {# byte} other {# bytes}}",
  /**
   * @description Accessible text for the unused bytes column in the coverage tool that describes the total unused bytes and percentage of the file unused.
   * @example {88%} percentage
   */
  sBytesS: "{n, plural, =1 {# byte, {percentage}} other {# bytes, {percentage}}}",
  /**
   * @description Tooltip text for the bar in the coverage list view of the coverage tool that illustrates the relation between used and unused bytes.
   * @example {1000} PH1
   * @example {12.34} PH2
   */
  sBytesSBelongToFunctionsThatHave: "{PH1} bytes ({PH2}) belong to functions that have not (yet) been executed.",
  /**
   * @description Tooltip text for the bar in the coverage list view of the coverage tool that illustrates the relation between used and unused bytes.
   * @example {1000} PH1
   * @example {12.34} PH2
   */
  sBytesSBelongToBlocksOf: "{PH1} bytes ({PH2}) belong to blocks of JavaScript that have not (yet) been executed.",
  /**
   * @description Message in Coverage View of the Coverage tab
   * @example {1000} PH1
   * @example {12.34} PH2
   */
  sBytesSBelongToFunctionsThatHaveExecuted: "{PH1} bytes ({PH2}) belong to functions that have executed at least once.",
  /**
   * @description Message in Coverage View of the Coverage tab
   * @example {1000} PH1
   * @example {12.34} PH2
   */
  sBytesSBelongToBlocksOfJavascript: "{PH1} bytes ({PH2}) belong to blocks of JavaScript that have executed at least once.",
  /**
   * @description Accessible text for the visualization column of coverage tool. Contains percentage of unused bytes to used bytes.
   * @example {12.3} PH1
   * @example {12.3} PH2
   */
  sOfFileUnusedSOfFileUsed: "{PH1} % of file unused, {PH2} % of file used"
};
var str_ = i18n.i18n.registerUIStrings("panels/coverage/CoverageListView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var { styleMap, repeat } = Directives;
function coverageTypeToString(type) {
  const types = [];
  if (type & 1) {
    types.push(i18nString(UIStrings.css));
  }
  if (type & 4) {
    types.push(i18nString(UIStrings.jsPerFunction));
  } else if (type & 2) {
    types.push(i18nString(UIStrings.jsPerBlock));
  }
  return types.join("+");
}
var formatBytes = (value) => {
  return getBytesFormatter().format(value ?? 0);
};
var formatPercent = (value) => {
  return getPercentageFormatter().format(value ?? 0);
};
var DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <style>${coverageListView_css_default}</style>
    <devtools-data-grid class="flex-auto" name=${i18nString(UIStrings.codeCoverage)} striped autofocus resize="last"
      .template=${html`
        <table>
          <tr>
            <th id="url" width="250px" weight="3" sortable>${i18nString(UIStrings.url)}</th>
            <th id="type" width="45px" weight="1" fixed sortable>${i18nString(UIStrings.type)}</th>
            <th id="size" width="60px" align="right" weight="1" fixed sortable>${i18nString(UIStrings.totalBytes)}</th>
            <th id="unused-size" width="100px" align="right" weight="1" fixed sortable sort="descending">${i18nString(UIStrings.unusedBytes)}</th>
            <th id="bars" width="250px" weight="1" sortable>${i18nString(UIStrings.usageVisualization)}</th>
          </tr>
          ${repeat(input.items, (info) => info.url, (info) => renderItem(info, input))}
        </table>`}>
      </devtools-data-grid>`, target);
};
var CoverageListView = class extends UI.Widget.VBox {
  #highlightRegExp;
  #coverageInfo = [];
  #selectedUrl = null;
  #maxSize = 0;
  #view;
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { useShadowDom: true, delegatesFocus: true });
    this.#view = view;
    this.#highlightRegExp = null;
  }
  set highlightRegExp(highlightRegExp) {
    this.#highlightRegExp = highlightRegExp;
    this.requestUpdate();
  }
  get highlightRegExp() {
    return this.#highlightRegExp;
  }
  set coverageInfo(coverageInfo) {
    this.#coverageInfo = coverageInfo;
    this.#maxSize = coverageInfo.reduce((acc, entry) => Math.max(acc, entry.size), 0);
    this.requestUpdate();
  }
  get coverageInfo() {
    return this.#coverageInfo;
  }
  performUpdate() {
    const input = {
      items: this.#coverageInfo,
      selectedUrl: this.#selectedUrl,
      maxSize: this.#maxSize,
      onOpen: (url) => {
        this.selectedUrl = url;
      },
      highlightRegExp: this.#highlightRegExp
    };
    this.#view(input, {}, this.contentElement);
  }
  reset() {
    this.#coverageInfo = [];
    this.#maxSize = 0;
    this.requestUpdate();
  }
  set selectedUrl(url) {
    const info = this.#coverageInfo.find((info2) => info2.url === url);
    if (!info) {
      return;
    }
    if (this.#selectedUrl !== url) {
      this.#selectedUrl = url;
      this.requestUpdate();
    }
    const sourceCode = url ? Workspace3.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url) : null;
    if (!sourceCode) {
      return;
    }
    void Common2.Revealer.reveal(sourceCode);
  }
  get selectedUrl() {
    return this.#selectedUrl;
  }
};
var percentageFormatter = null;
function getPercentageFormatter() {
  if (!percentageFormatter) {
    percentageFormatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
      style: "percent",
      maximumFractionDigits: 1
    });
  }
  return percentageFormatter;
}
var bytesFormatter = null;
function getBytesFormatter() {
  if (!bytesFormatter) {
    bytesFormatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale);
  }
  return bytesFormatter;
}
function renderItem(info, input) {
  function highlightRange(textContent) {
    const matches = input.highlightRegExp?.exec(textContent);
    return matches?.length ? `${matches.index},${matches[0].length}` : "";
  }
  const splitURL = /^(.*)(\/[^/]*)$/.exec(info.url);
  return html`
    <style>${coverageListView_css_default}</style>
    <tr data-url=${info.url} selected=${info.url === input.selectedUrl}
        @open=${() => input.onOpen(info.url)}>
      <td data-value=${info.url} title=${info.url} aria-label=${info.url}>
        <devtools-highlight ranges=${highlightRange(info.url)} class="url-outer" aria-hidden="true">
          <div class="url-prefix">${splitURL ? splitURL[1] : info.url}</div>
          <div class="url-suffix">${splitURL ? splitURL[2] : ""}</div>
        </devtools-highlight>
      </td>
      <td data-value=${coverageTypeToString(info.type)}
          title=${info.type & 4 ? i18nString(UIStrings.jsCoverageWithPerFunction) : info.type & 2 ? i18nString(UIStrings.jsCoverageWithPerBlock) : ""}>
        ${coverageTypeToString(info.type)}
      </td>
      <td data-value=${info.size} aria-label=${i18nString(UIStrings.sBytes, { n: info.size || 0 })}>
        <span>${formatBytes(info.size)}</span>
      </td>
      <td data-value=${info.unusedSize} aria-label=${i18nString(UIStrings.sBytesS, { n: info.unusedSize, percentage: formatPercent(info.unusedPercentage) })}>
        <span>${formatBytes(info.unusedSize)}</span>
        <span class="percent-value">
          ${formatPercent(info.unusedPercentage)}
        </span>
      </td>
      <td data-value=${info.unusedSize} aria-label=${i18nString(UIStrings.sOfFileUnusedSOfFileUsed, { PH1: formatPercent(info.unusedPercentage), PH2: formatPercent(info.usedPercentage) })}>
        <div class="bar-container">
          ${info.unusedSize > 0 ? html`
            <div class="bar bar-unused-size"
                title=${info.type & 4 ? i18nString(UIStrings.sBytesSBelongToFunctionsThatHave, { PH1: info.unusedSize, PH2: formatPercent(info.unusedPercentage) }) : info.type & 2 ? i18nString(UIStrings.sBytesSBelongToBlocksOf, { PH1: info.unusedSize, PH2: formatPercent(info.unusedPercentage) }) : ""}
                  style=${styleMap({ width: (info.unusedSize / input.maxSize * 100 || 0) + "%" })}>
            </div>` : nothing}
          ${info.usedSize > 0 ? html`
            <div class="bar bar-used-size"
                  title=${info.type & 4 ? i18nString(UIStrings.sBytesSBelongToFunctionsThatHaveExecuted, { PH1: info.usedSize, PH2: formatPercent(info.usedPercentage) }) : info.type & 2 ? i18nString(UIStrings.sBytesSBelongToBlocksOfJavascript, { PH1: info.usedSize, PH2: formatPercent(info.usedPercentage) }) : ""}
                style=${styleMap({ width: (info.usedSize / input.maxSize * 100 || 0) + "%" })}>
            </div>` : nothing}
        </div>
      </td>
      ${info.sources.length > 0 ? html`
        <td><table>
          ${repeat(info.sources, (source) => source.url, (source) => renderItem(source, input))}
        </table></td>` : nothing}
    </tr>`;
}

// gen/front_end/panels/coverage/CoverageView.js
var CoverageView_exports = {};
__export(CoverageView_exports, {
  ActionDelegate: () => ActionDelegate,
  CoverageView: () => CoverageView,
  DEFAULT_VIEW: () => DEFAULT_VIEW2
});
import "./../../ui/legacy/legacy.js";
import * as Common3 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Workspace7 from "./../../models/workspace/workspace.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html2, i18nTemplate as unboundI18nTemplate, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/coverage/CoverageDecorationManager.js
var CoverageDecorationManager_exports = {};
__export(CoverageDecorationManager_exports, {
  CoverageDecorationManager: () => CoverageDecorationManager,
  decoratorType: () => decoratorType
});
import * as Platform2 from "./../../core/platform/platform.js";
import * as TextUtils2 from "./../../models/text_utils/text_utils.js";
import * as Workspace5 from "./../../models/workspace/workspace.js";
var decoratorType = "coverage";
var CoverageDecorationManager = class _CoverageDecorationManager {
  coverageModel;
  textByProvider;
  uiSourceCodeByContentProvider;
  #workspace;
  #debuggerBinding;
  #cssBinding;
  constructor(coverageModel, workspace, debuggerBinding, cssBinding) {
    this.coverageModel = coverageModel;
    this.#workspace = workspace;
    this.#debuggerBinding = debuggerBinding;
    this.#cssBinding = cssBinding;
    this.textByProvider = /* @__PURE__ */ new Map();
    this.uiSourceCodeByContentProvider = new Platform2.MapUtilities.Multimap();
    for (const uiSourceCode of this.#workspace.uiSourceCodes()) {
      uiSourceCode.setDecorationData(decoratorType, this);
    }
    this.#workspace.addEventListener(Workspace5.Workspace.Events.UISourceCodeAdded, this.onUISourceCodeAdded, this);
  }
  reset() {
    for (const uiSourceCode of this.#workspace.uiSourceCodes()) {
      uiSourceCode.setDecorationData(decoratorType, void 0);
    }
  }
  dispose() {
    this.reset();
    this.#workspace.removeEventListener(Workspace5.Workspace.Events.UISourceCodeAdded, this.onUISourceCodeAdded, this);
  }
  update(updatedEntries) {
    for (const entry of updatedEntries) {
      for (const uiSourceCode of this.uiSourceCodeByContentProvider.get(entry.getContentProvider())) {
        uiSourceCode.setDecorationData(decoratorType, this);
      }
    }
  }
  /**
   * Returns the coverage per line of the provided uiSourceCode. The resulting array has the same length
   * as the provided `lines` array.
   *
   * @param uiSourceCode The UISourceCode for which to get the coverage info.
   * @param lineMappings The caller might have applied formatting to the UISourceCode. Each entry
   *                     in this array represents one line and the range specifies where it's found in
   *                     the original content.
   */
  async usageByLine(uiSourceCode, lineMappings) {
    const result = [];
    await this.updateTexts(uiSourceCode, lineMappings);
    for (const { startLine, startColumn, endLine, endColumn } of lineMappings) {
      const startLocationsPromise = this.rawLocationsForSourceLocation(uiSourceCode, startLine, startColumn);
      const endLocationsPromise = this.rawLocationsForSourceLocation(uiSourceCode, endLine, endColumn);
      const [startLocations, endLocations] = await Promise.all([startLocationsPromise, endLocationsPromise]);
      let used = void 0;
      for (let startIndex = 0, endIndex = 0; startIndex < startLocations.length; ++startIndex) {
        const start = startLocations[startIndex];
        while (endIndex < endLocations.length && _CoverageDecorationManager.compareLocations(start, endLocations[endIndex]) >= 0) {
          ++endIndex;
        }
        if (endIndex >= endLocations.length || endLocations[endIndex].id !== start.id) {
          continue;
        }
        const end = endLocations[endIndex++];
        const text = this.textByProvider.get(end.contentProvider);
        if (!text) {
          continue;
        }
        const textValue = text.value();
        let startOffset = Math.min(text.offsetFromPosition(start.line, start.column), textValue.length - 1);
        let endOffset = Math.min(text.offsetFromPosition(end.line, end.column), textValue.length - 1);
        while (startOffset <= endOffset && /\s/.test(textValue[startOffset])) {
          ++startOffset;
        }
        while (startOffset <= endOffset && /\s/.test(textValue[endOffset])) {
          --endOffset;
        }
        if (startOffset <= endOffset) {
          used = this.coverageModel.usageForRange(end.contentProvider, startOffset, endOffset);
        }
        if (used) {
          break;
        }
      }
      result.push(used);
    }
    return result;
  }
  async updateTexts(uiSourceCode, lineMappings) {
    const promises = [];
    for (const range of lineMappings) {
      for (const entry of await this.rawLocationsForSourceLocation(uiSourceCode, range.startLine, 0)) {
        if (this.textByProvider.has(entry.contentProvider)) {
          continue;
        }
        this.textByProvider.set(entry.contentProvider, null);
        this.uiSourceCodeByContentProvider.set(entry.contentProvider, uiSourceCode);
        promises.push(this.updateTextForProvider(entry.contentProvider));
      }
    }
    await Promise.all(promises);
  }
  async updateTextForProvider(contentProvider) {
    const contentData = TextUtils2.ContentData.ContentData.contentDataOrEmpty(await contentProvider.requestContentData());
    this.textByProvider.set(contentProvider, contentData.textObj);
  }
  async rawLocationsForSourceLocation(uiSourceCode, line, column) {
    const result = [];
    const contentType = uiSourceCode.contentType();
    if (contentType.hasScripts()) {
      let locations = await this.#debuggerBinding.uiLocationToRawLocations(uiSourceCode, line, column);
      locations = locations.filter((location) => !!location.script());
      for (const location of locations) {
        const script = location.script();
        if (!script) {
          continue;
        }
        if (script.isInlineScript() && contentType.isDocument()) {
          location.lineNumber -= script.lineOffset;
          if (!location.lineNumber) {
            location.columnNumber -= script.columnOffset;
          }
        }
        result.push({
          id: `js:${location.scriptId}`,
          contentProvider: script,
          line: location.lineNumber,
          column: location.columnNumber
        });
      }
    }
    if (contentType.isStyleSheet() || contentType.isDocument()) {
      const rawStyleLocations = this.#cssBinding.uiLocationToRawLocations(new Workspace5.UISourceCode.UILocation(uiSourceCode, line, column));
      for (const location of rawStyleLocations) {
        const header = location.header();
        if (!header) {
          continue;
        }
        if (header.isInline && contentType.isDocument()) {
          location.lineNumber -= header.startLine;
          if (!location.lineNumber) {
            location.columnNumber -= header.startColumn;
          }
        }
        result.push({
          id: `css:${location.styleSheetId}`,
          contentProvider: header,
          line: location.lineNumber,
          column: location.columnNumber
        });
      }
    }
    return result.sort(_CoverageDecorationManager.compareLocations);
  }
  static compareLocations(a, b) {
    return a.id.localeCompare(b.id) || a.line - b.line || a.column - b.column;
  }
  onUISourceCodeAdded(event) {
    const uiSourceCode = event.data;
    uiSourceCode.setDecorationData(decoratorType, this);
  }
};

// gen/front_end/panels/coverage/coverageView.css.js
var coverageView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: hidden;
}

.coverage-toolbar-container {
  display: flex;
  border-bottom: 1px solid var(--sys-color-divider);
  flex: 0 0 auto;
}

.coverage-toolbar {
  flex: auto;
}

.coverage-toolbar-summary {
  background-color: var(--sys-color-cdt-base-container);
  border-top: 1px solid var(--sys-color-divider);
  padding-left: 5px;
  flex: 0 0 19px;
  display: flex;
  padding-right: 5px;
}

.coverage-toolbar-summary .coverage-message {
  padding-top: 2px;
  padding-left: 1ex;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.coverage-results {
  overflow-y: auto;
  display: flex;
  flex: auto;
}

.bfcache-page,
.prerender-page {
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.bfcache-page .message,
.prerender-page .message {
  white-space: pre-line;
  text-align: center;
}

.inline-button {
  display: inline-flex;
  border: 1px solid var(--sys-color-neutral-outline);
  border-radius: 4px;
  position: relative;
  vertical-align: sub;
  margin: 2px;
  background-color: var(--sys-color-cdt-base-container);
  justify-content: center;
  width: 28px;
}

.inline-button:hover {
  border-color: transparent;
  background-color: var(--sys-color-state-hover-on-subtle);
}

/*# sourceURL=${import.meta.resolve("./coverageView.css")} */`;

// gen/front_end/panels/coverage/CoverageView.js
var UIStrings2 = {
  /**
   * @description Tooltip in Coverage List View of the Coverage tab for selecting JavaScript coverage mode
   */
  chooseCoverageGranularityPer: "Choose coverage granularity: Per function has low overhead, per block has significant overhead.",
  /**
   * @description Text in Coverage List View of the Coverage tab
   */
  perFunction: "Per function",
  /**
   * @description Text in Coverage List View of the Coverage tab
   */
  perBlock: "Per block",
  /**
   * @description Text in Coverage View of the Coverage tab
   */
  filterByUrl: "Filter by URL",
  /**
   * @description Label for the type filter in the Coverage Panel
   */
  filterCoverageByType: "Filter coverage by type",
  /**
   * @description Text for everything
   */
  all: "All",
  /**
   * @description Text that appears on a button for the css resource type filter.
   */
  css: "CSS",
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  javascript: "JavaScript",
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Coverage View of the Coverage tab
   */
  includeExtensionContentScripts: "Include extension content scripts",
  /**
   * @description Title for a type of source files
   */
  contentScripts: "Content scripts",
  /**
   * @description Message in Coverage View of the Coverage tab
   */
  noCoverageData: "No coverage data",
  /**
   * @description Message in Coverage View of the Coverage tab
   */
  reloadPage: "Reload page",
  /**
   * @description Message in Coverage View of the Coverage tab
   */
  startRecording: "Start recording",
  /**
   * @description Message in Coverage View of the Coverage tab
   * @example {Reload page} PH1
   */
  clickTheReloadButtonSToReloadAnd: 'Click the "{PH1}" button to reload and start capturing coverage.',
  /**
   * @description Message in Coverage View of the Coverage tab
   * @example {Start recording} PH1
   */
  clickTheRecordButtonSToStart: 'Click the "{PH1}" button to start capturing coverage.',
  /**
   * @description Message in the Coverage View explaining that DevTools could not capture coverage.
   */
  bfcacheNoCapture: "Could not capture coverage info because the page was served from the back/forward cache.",
  /**
   * @description  Message in the Coverage View explaining that DevTools could not capture coverage.
   */
  activationNoCapture: "Could not capture coverage info because the page was prerendered in the background.",
  /**
   * @description  Message in the Coverage View prompting the user to reload the page.
   * @example {reload button icon} PH1
   */
  reloadPrompt: "Click the reload button {PH1} to reload and get coverage.",
  /**
   * @description Footer message in Coverage View of the Coverage tab
   * @example {300k used, 600k unused} PH1
   * @example {500k used, 800k unused} PH2
   */
  filteredSTotalS: "Filtered: {PH1}  Total: {PH2}",
  /**
   * @description Footer message in Coverage View of the Coverage tab
   * @example {1.5 MB} PH1
   * @example {2.1 MB} PH2
   * @example {71%} PH3
   * @example {29%} PH4
   */
  sOfSSUsedSoFarSUnused: "{PH1} of {PH2} ({PH3}%) used so far, {PH4} unused."
};
var str_2 = i18n3.i18n.registerUIStrings("panels/coverage/CoverageView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var i18nTemplate = unboundI18nTemplate.bind(void 0, str_2);
var { ref } = Directives2;
var { bindToAction, bindToSetting } = UI2.UIUtils;
var { widgetConfig } = UI2.Widget;
var coverageViewInstance;
var DEFAULT_VIEW2 = (input, output, target) => {
  render2(html2`
      <style>${coverageView_css_default}</style>
      <div class="coverage-toolbar-container" jslog=${VisualLogging.toolbar()} role="toolbar">
        <devtools-toolbar class="coverage-toolbar" role="presentation" wrappable>
          <select title=${i18nString2(UIStrings2.chooseCoverageGranularityPer)}
              aria-label=${i18nString2(UIStrings2.chooseCoverageGranularityPer)}
              jslog=${VisualLogging.dropDown("coverage-type").track({ change: true })}
              @change=${(event) => input.onCoverageTypeChanged(event.target.selectedIndex)}
              .selectedIndex=${input.coverageType}
              ?disabled=${input.recording}>
            <option value=${2 | 4}
                    jslog=${VisualLogging.item(`${2 | 4}`).track({ click: true })}>
                 ${i18nString2(UIStrings2.perFunction)}
            </option>
            <option value=${2}
                    jslog=${VisualLogging.item(`${2}`).track({ click: true })}>
              ${i18nString2(UIStrings2.perBlock)}
            </option>
          </select>
          <devtools-button ${bindToAction(input.supportsRecordOnReload && !input.recording ? "coverage.start-with-reload" : "coverage.toggle-recording")}>
          </devtools-button>
          <devtools-button ${bindToAction("coverage.clear")}></devtools-button>
          <div class="toolbar-divider"></div>
          <devtools-button ${bindToAction("coverage.export")}></devtools-button>
          <div class="toolbar-divider"></div>
          <devtools-toolbar-input type="filter" placeholder=${i18nString2(UIStrings2.filterByUrl)}
              ?disabled=${!Boolean(input.coverageInfo)}
               @change=${(e) => input.onFilterChanged(e.detail)}
               style="flex-grow:1; flex-shrink:1">
          </devtools-toolbar-input>
          <div class="toolbar-divider"></div>
          <select title=${i18nString2(UIStrings2.filterCoverageByType)}
              aria-label=${i18nString2(UIStrings2.filterCoverageByType)}
              jslog=${VisualLogging.dropDown("coverage-by-type").track({ change: true })}
              ?disabled=${!Boolean(input.coverageInfo)}
              @change=${(event) => input.onTypeFilterChanged(Number(event.target.selectedOptions[0]?.value))}>
            <option value="" jslog=${VisualLogging.item("").track({ click: true })}
                    .selected=${input.typeFilter === null}>${i18nString2(UIStrings2.all)}</option>
            <option value=${1}
                    jslog=${VisualLogging.item(`${1}`).track({ click: true })}
                    .selected=${input.typeFilter === 1}>
              ${i18nString2(UIStrings2.css)}
            </option>
            <option value=${2 | 4}
                   jslog=${VisualLogging.item(`${2 | 4}`).track({ click: true })}
                   .selected=${input.typeFilter !== null && Boolean(input.typeFilter & (2 | 4))}>
              ${i18nString2(UIStrings2.javascript)}
            </option>
          </select>
          <div class="toolbar-divider"></div>
          <devtools-checkbox title=${i18nString2(UIStrings2.includeExtensionContentScripts)}
              ${bindToSetting(input.showContentScriptsSetting)}
              ?disabled=${!Boolean(input.coverageInfo)}>
            ${i18nString2(UIStrings2.contentScripts)}
          </devtools-checkbox>
        </devtools-toolbar>
      </div>
      <div class="coverage-results">
        ${input.needsReload ? renderReloadPromptPage(input.needsReload === "bfcache-page" ? i18nString2(UIStrings2.bfcacheNoCapture) : i18nString2(UIStrings2.activationNoCapture), input.needsReload) : input.coverageInfo ? html2`
          <devtools-widget autofocus class="results" .widgetConfig=${widgetConfig(CoverageListView, {
    coverageInfo: input.coverageInfo,
    highlightRegExp: input.textFilter,
    selectedUrl: input.selectedUrl
  })}
            ${ref((e) => {
    if (e instanceof HTMLElement) {
      output.focusResults = () => {
        e.focus();
      };
    }
  })}>` : renderLandingPage(input.supportsRecordOnReload)}
      </div>
      <div class="coverage-toolbar-summary">
        <div class="coverage-message">
            ${input.statusMessage}
        </div>
    </div>`, target);
};
function renderLandingPage(supportsRecordOnReload) {
  if (supportsRecordOnReload) {
    return html2`
      <devtools-widget .widgetConfig=${widgetConfig(UI2.EmptyWidget.EmptyWidget, {
      header: i18nString2(UIStrings2.noCoverageData),
      link: "https://developer.chrome.com/docs/devtools/coverage",
      text: i18nString2(UIStrings2.clickTheReloadButtonSToReloadAnd, { PH1: i18nString2(UIStrings2.reloadPage) })
    })}>
        <devtools-button ${bindToAction("coverage.start-with-reload")}
                          .variant=${"tonal"} .iconName=${void 0}>
          ${i18nString2(UIStrings2.reloadPage)}
        </devtools-button>
      </devtools-widget>`;
  }
  return html2`
    <devtools-widget .widgetConfig=${widgetConfig(UI2.EmptyWidget.EmptyWidget, {
    header: i18nString2(UIStrings2.noCoverageData),
    link: "https://developer.chrome.com/docs/devtools/coverage",
    text: i18nString2(UIStrings2.clickTheRecordButtonSToStart, { PH1: i18nString2(UIStrings2.startRecording) })
  })}>
      <devtools-button ${bindToAction("coverage.toggle-recording")}
                       .variant=${"tonal"} .iconName=${void 0}>
        ${i18nString2(UIStrings2.startRecording)}
      </devtools-button>
    </devtools-widget>`;
}
function renderReloadPromptPage(message, className) {
  return html2`
    <div class="widget vbox ${className}">
      <div class="message">${message}</div>
      <span class="message">
        ${i18nTemplate(UIStrings2.reloadPrompt, { PH1: html2`
          <devtools-button class="inline-button" ${bindToAction("inspector-main.reload")}></devtools-button>` })}
      </span>
    </div>`;
}
var CoverageView = class _CoverageView extends UI2.Widget.VBox {
  #model;
  #decorationManager;
  #coverageTypeComboBoxSetting;
  #toggleRecordAction;
  #clearAction;
  #exportAction;
  #textFilter;
  #typeFilter;
  #showContentScriptsSetting;
  #view;
  #supportsRecordOnReload;
  #needsReload = null;
  #statusMessage = "";
  #output = { focusResults: () => {
  } };
  #coverageInfo = null;
  #selectedUrl = null;
  constructor(view = DEFAULT_VIEW2) {
    super({
      jslog: `${VisualLogging.panel("coverage").track({ resize: true })}`,
      useShadowDom: true,
      delegatesFocus: true
    });
    this.registerRequiredCSS(coverageView_css_default);
    this.#view = view;
    this.#model = null;
    this.#decorationManager = null;
    this.#coverageTypeComboBoxSetting = Common3.Settings.Settings.instance().createSetting("coverage-view-coverage-type", 0);
    this.#toggleRecordAction = UI2.ActionRegistry.ActionRegistry.instance().getAction("coverage.toggle-recording");
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    this.#supportsRecordOnReload = Boolean(mainTarget?.model(SDK2.ResourceTreeModel.ResourceTreeModel));
    this.#clearAction = UI2.ActionRegistry.ActionRegistry.instance().getAction("coverage.clear");
    this.#clearAction.setEnabled(false);
    this.#exportAction = UI2.ActionRegistry.ActionRegistry.instance().getAction("coverage.export");
    this.#exportAction.setEnabled(false);
    this.#textFilter = null;
    this.#typeFilter = null;
    this.#showContentScriptsSetting = Common3.Settings.Settings.instance().createSetting("show-content-scripts", false);
    this.#showContentScriptsSetting.addChangeListener(this.#onFilterChanged, this);
    this.requestUpdate();
  }
  performUpdate() {
    const input = {
      coverageType: this.#coverageTypeComboBoxSetting.get(),
      recording: this.#toggleRecordAction.toggled(),
      supportsRecordOnReload: this.#supportsRecordOnReload,
      typeFilter: this.#typeFilter,
      showContentScriptsSetting: this.#showContentScriptsSetting,
      needsReload: this.#needsReload,
      coverageInfo: this.#coverageInfo,
      textFilter: this.#textFilter,
      selectedUrl: this.#selectedUrl,
      statusMessage: this.#statusMessage,
      onCoverageTypeChanged: this.#onCoverageTypeChanged.bind(this),
      onFilterChanged: (value) => {
        this.#textFilter = value ? Platform3.StringUtilities.createPlainTextSearchRegex(value, "i") : null;
        this.#onFilterChanged();
      },
      onTypeFilterChanged: this.#onTypeFilterChanged.bind(this)
    };
    this.#view(input, this.#output, this.contentElement);
  }
  static instance() {
    if (!coverageViewInstance) {
      coverageViewInstance = new _CoverageView();
    }
    return coverageViewInstance;
  }
  static removeInstance() {
    coverageViewInstance = void 0;
  }
  clear() {
    if (this.#model) {
      this.#model.reset();
    }
    this.#reset();
  }
  #reset() {
    if (this.#decorationManager) {
      this.#decorationManager.dispose();
      this.#decorationManager = null;
    }
    this.#needsReload = null;
    this.#coverageInfo = null;
    this.#statusMessage = "";
    this.#exportAction.setEnabled(false);
    this.requestUpdate();
  }
  toggleRecording() {
    const enable = !this.#toggleRecordAction.toggled();
    if (enable) {
      void this.startRecording({ reload: false, jsCoveragePerBlock: this.isBlockCoverageSelected() });
    } else {
      void this.stopRecording();
    }
  }
  isBlockCoverageSelected() {
    return this.#coverageTypeComboBoxSetting.get() === 2;
  }
  #selectCoverageType(jsCoveragePerBlock) {
    const selectedIndex = jsCoveragePerBlock ? 1 : 0;
    this.#coverageTypeComboBoxSetting.set(selectedIndex);
  }
  #onCoverageTypeChanged(newValue) {
    this.#coverageTypeComboBoxSetting.set(newValue);
  }
  async startRecording(options) {
    this.#reset();
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const { reload, jsCoveragePerBlock } = { reload: false, jsCoveragePerBlock: false, ...options };
    if (!this.#model || reload) {
      this.#model = mainTarget.model(CoverageModel);
    }
    if (!this.#model) {
      return;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStarted);
    if (jsCoveragePerBlock) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStartedPerBlock);
    }
    const success = await this.#model.start(Boolean(jsCoveragePerBlock));
    if (!success) {
      return;
    }
    this.#selectCoverageType(Boolean(jsCoveragePerBlock));
    this.#model.addEventListener(Events.CoverageUpdated, this.#onCoverageDataReceived, this);
    this.#model.addEventListener(Events.SourceMapResolved, this.#updateListView, this);
    const resourceTreeModel = mainTarget.model(SDK2.ResourceTreeModel.ResourceTreeModel);
    SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    this.#decorationManager = new CoverageDecorationManager(this.#model, Workspace7.Workspace.WorkspaceImpl.instance(), Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance());
    this.#toggleRecordAction.setToggled(true);
    this.#clearAction.setEnabled(false);
    this.#coverageInfo = [];
    this.#needsReload = null;
    this.requestUpdate();
    await this.updateComplete;
    this.#output.focusResults();
    if (reload && resourceTreeModel) {
      resourceTreeModel.reloadPage();
    } else {
      void this.#model.startPolling();
    }
  }
  #onCoverageDataReceived(event) {
    const data = event.data;
    this.#updateViews(data);
  }
  #updateListView() {
    const entries = (this.#model?.entries() || []).map((entry) => this.#toCoverageListItem(entry)).filter((info) => this.#isVisible(info)).map((entry) => ({ ...entry, sources: entry.sources.filter((entry2) => this.#isVisible(entry2)) }));
    this.#coverageInfo = entries;
  }
  #toCoverageListItem(info) {
    return {
      url: info.url(),
      type: info.type(),
      size: info.size(),
      usedSize: info.usedSize(),
      unusedSize: info.unusedSize(),
      usedPercentage: info.usedPercentage(),
      unusedPercentage: info.unusedPercentage(),
      sources: [...info.sourcesURLCoverageInfo.values()].map(this.#toCoverageListItem, this),
      isContentScript: info.isContentScript(),
      generatedUrl: info instanceof SourceURLCoverageInfo ? info.generatedURLCoverageInfo.url() : void 0
    };
  }
  async stopRecording() {
    SDK2.TargetManager.TargetManager.instance().removeModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    if (this.#model) {
      await this.#model.stop();
      this.#model.removeEventListener(Events.CoverageUpdated, this.#onCoverageDataReceived, this);
    }
    this.#toggleRecordAction.setToggled(false);
    this.#clearAction.setEnabled(true);
    this.requestUpdate();
  }
  async #onPrimaryPageChanged(event) {
    const frame = event.data.frame;
    const coverageModel = frame.resourceTreeModel().target().model(CoverageModel);
    if (!coverageModel) {
      return;
    }
    if (this.#model !== coverageModel) {
      if (this.#model) {
        await this.#model.stop();
        this.#model.removeEventListener(Events.CoverageUpdated, this.#onCoverageDataReceived, this);
      }
      this.#model = coverageModel;
      const success = await this.#model.start(this.isBlockCoverageSelected());
      if (!success) {
        return;
      }
      this.#model.addEventListener(Events.CoverageUpdated, this.#onCoverageDataReceived, this);
      this.#decorationManager = new CoverageDecorationManager(this.#model, Workspace7.Workspace.WorkspaceImpl.instance(), Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance());
    }
    if (event.data.type === "Activation") {
      this.#needsReload = "prerender-page";
    } else if (frame.backForwardCacheDetails.restoredFromCache) {
      this.#needsReload = "bfcache-page";
    } else {
      this.#needsReload = null;
      this.#coverageInfo = [];
    }
    this.requestUpdate();
    this.#model.reset();
    this.#decorationManager?.reset();
    void this.#model.startPolling();
  }
  #updateViews(updatedEntries) {
    this.#updateStats();
    this.#updateListView();
    this.#exportAction.setEnabled(this.#model !== null && this.#model.entries().length > 0);
    this.#decorationManager?.update(updatedEntries);
    this.requestUpdate();
  }
  #updateStats() {
    const all = { total: 0, unused: 0 };
    const filtered = { total: 0, unused: 0 };
    const filterApplied = this.#textFilter !== null;
    if (this.#model) {
      for (const info of this.#model.entries()) {
        all.total += info.size();
        all.unused += info.unusedSize();
        const listItem = this.#toCoverageListItem(info);
        if (this.#isVisible(listItem)) {
          if (this.#textFilter?.test(info.url())) {
            filtered.total += info.size();
            filtered.unused += info.unusedSize();
          } else {
            for (const childInfo of info.sourcesURLCoverageInfo.values()) {
              if (this.#isVisible(this.#toCoverageListItem(childInfo))) {
                filtered.total += childInfo.size();
                filtered.unused += childInfo.unusedSize();
              }
            }
          }
        }
      }
    }
    this.#statusMessage = filterApplied ? i18nString2(UIStrings2.filteredSTotalS, { PH1: formatStat(filtered), PH2: formatStat(all) }) : formatStat(all);
    function formatStat({ total, unused }) {
      const used = total - unused;
      const percentUsed = total ? Math.round(100 * used / total) : 0;
      return i18nString2(UIStrings2.sOfSSUsedSoFarSUnused, {
        PH1: i18n3.ByteUtilities.bytesToString(used),
        PH2: i18n3.ByteUtilities.bytesToString(total),
        PH3: percentUsed,
        PH4: i18n3.ByteUtilities.bytesToString(unused)
      });
    }
  }
  #onFilterChanged() {
    this.#updateListView();
    this.#updateStats();
    this.requestUpdate();
  }
  #onTypeFilterChanged(typeFilter) {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageReportFiltered);
    this.#typeFilter = typeFilter;
    this.#updateListView();
    this.#updateStats();
    this.requestUpdate();
  }
  #isVisible(coverageInfo) {
    const url = coverageInfo.url;
    if (url.startsWith(_CoverageView.EXTENSION_BINDINGS_URL_PREFIX)) {
      return false;
    }
    if (coverageInfo.isContentScript && !this.#showContentScriptsSetting.get()) {
      return false;
    }
    if (this.#typeFilter && !(coverageInfo.type & this.#typeFilter)) {
      return false;
    }
    if (coverageInfo.sources.length > 0) {
      for (const sourceURLCoverageInfo of coverageInfo.sources) {
        if (this.#isVisible(sourceURLCoverageInfo)) {
          return true;
        }
      }
    }
    return !this.#textFilter || this.#textFilter.test(url);
  }
  async exportReport() {
    const fos = new Bindings.FileUtils.FileOutputStream();
    const fileName = `Coverage-${Platform3.DateUtilities.toISO8601Compact(/* @__PURE__ */ new Date())}.json`;
    const accepted = await fos.open(fileName);
    if (!accepted) {
      return;
    }
    this.#model && await this.#model.exportReport(fos);
  }
  selectCoverageItemByUrl(url) {
    this.#selectedUrl = url;
    this.requestUpdate();
  }
  static EXTENSION_BINDINGS_URL_PREFIX = "extensions::";
  wasShown() {
    UI2.Context.Context.instance().setFlavor(_CoverageView, this);
    super.wasShown();
  }
  willHide() {
    super.willHide();
    UI2.Context.Context.instance().setFlavor(_CoverageView, null);
  }
  get model() {
    return this.#model;
  }
};
var ActionDelegate = class {
  handleAction(_context, actionId) {
    const coverageViewId = "coverage";
    void UI2.ViewManager.ViewManager.instance().showView(
      coverageViewId,
      /** userGesture= */
      false,
      /** omitFocus= */
      true
    ).then(() => {
      const view = UI2.ViewManager.ViewManager.instance().view(coverageViewId);
      return view?.widget();
    }).then((widget) => this.#handleAction(widget, actionId));
    return true;
  }
  #handleAction(coverageView, actionId) {
    switch (actionId) {
      case "coverage.toggle-recording":
        coverageView.toggleRecording();
        break;
      case "coverage.start-with-reload":
        void coverageView.startRecording({ reload: true, jsCoveragePerBlock: coverageView.isBlockCoverageSelected() });
        break;
      case "coverage.clear":
        coverageView.clear();
        break;
      case "coverage.export":
        void coverageView.exportReport();
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
};
export {
  CoverageDecorationManager_exports as CoverageDecorationManager,
  CoverageListView_exports as CoverageListView,
  CoverageModel_exports as CoverageModel,
  CoverageView_exports as CoverageView
};
//# sourceMappingURL=coverage.js.map
