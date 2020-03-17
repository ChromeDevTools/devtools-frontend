// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';  // eslint-disable-line no-unused-vars
import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';

/**
 * @enum {number}
 */
export const CoverageType = {
  CSS: (1 << 0),
  JavaScript: (1 << 1),
  JavaScriptPerFunction: (1 << 2),
};

/** @enum {symbol} */
export const SuspensionState = {
  Active: Symbol('Active'),
  Suspending: Symbol('Suspending'),
  Suspended: Symbol('Suspended')
};

/** @enum {symbol} */
export const Events = {
  CoverageUpdated: Symbol('CoverageUpdated'),
  CoverageReset: Symbol('CoverageReset'),
};

/** @type {number} */
const _coveragePollingPeriodMs = 200;

export class CoverageModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);
    this._cpuProfilerModel = target.model(SDK.CPUProfilerModel.CPUProfilerModel);
    this._cssModel = target.model(SDK.CSSModel.CSSModel);
    this._debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);

    /** @type {!Map<string, !URLCoverageInfo>} */
    this._coverageByURL = new Map();
    /** @type {!Map<!TextUtils.ContentProvider.ContentProvider, !CoverageInfo>} */
    this._coverageByContentProvider = new Map();

    // We keep track of the update times, because the other data-structures don't change if an
    // update doesn't change the coverage. Some visualizations want to convey to the user that
    // an update was received at a certain time, but did not result in a coverage change.
    /** @type {!Set<number>} */
    this._coverageUpdateTimes = new Set();

    /** @type {!SuspensionState} */
    this._suspensionState = SuspensionState.Active;
    /** @type {?number} */
    this._pollTimer = null;
    /** @type {?Promise} */
    this._currentPollPromise = null;
    /** @type {?boolean} */
    this._shouldResumePollingOnResume = false;
    /** @type {!Array<!{rawCoverageData:!Array<!Protocol.Profiler.ScriptCoverage>,stamp:number}>} */
    this._jsBacklog = [];
    /** @type {!Array<!{rawCoverageData:!Array<!Protocol.CSS.RuleUsage>,stamp:number}>} */
    this._cssBacklog = [];
    /** @type {?boolean} */
    this._performanceTraceRecording = false;
  }

  /**
   * @param {boolean} jsCoveragePerBlock - Collect per Block coverage if `true`, per function coverage otherwise.
   * @return {!Promise<boolean>}
   */
  async start(jsCoveragePerBlock) {
    if (this._suspensionState !== SuspensionState.Active) {
      throw Error('Cannot start CoverageModel while it is not active.');
    }
    const promises = [];
    if (this._cssModel) {
      // Note there's no JS coverage since JS won't ever return
      // coverage twice, even after it's restarted.
      this._clearCSS();

      this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._handleStyleSheetAdded, this);
      promises.push(this._cssModel.startCoverage());
    }
    if (this._cpuProfilerModel) {
      promises.push(
          this._cpuProfilerModel.startPreciseCoverage(jsCoveragePerBlock, this.preciseCoverageDeltaUpdate.bind(this)));
    }

    await Promise.all(promises);
    return !!(this._cssModel || this._cpuProfilerModel);
  }

  preciseCoverageDeltaUpdate(timestamp, occasion, coverageData) {
    this._coverageUpdateTimes.add(timestamp);
    this._backlogOrProcessJSCoverage(coverageData, timestamp);
  }

  /**
   * @return {!Promise}
   */
  async stop() {
    await this.stopPolling();
    const promises = [];
    if (this._cpuProfilerModel) {
      promises.push(this._cpuProfilerModel.stopPreciseCoverage());
    }
    if (this._cssModel) {
      promises.push(this._cssModel.stopCoverage());
      this._cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._handleStyleSheetAdded, this);
    }
    await Promise.all(promises);
  }

  reset() {
    this._coverageByURL = new Map();
    this._coverageByContentProvider = new Map();
    this._coverageUpdateTimes = new Set();
    this.dispatchEventToListeners(CoverageModel.Events.CoverageReset);
  }

  /**
   * @return {!Promise}
   */
  async startPolling() {
    if (this._currentPollPromise || this._suspensionState !== SuspensionState.Active) {
      return;
    }
    await this._pollLoop();
  }

  /**
   * @return {!Promise}
   */
  async _pollLoop() {
    this._clearTimer();
    this._currentPollPromise = this._pollAndCallback();
    await this._currentPollPromise;
    if (this._suspensionState === SuspensionState.Active || this._performanceTraceRecording) {
      this._pollTimer = setTimeout(() => this._pollLoop(), _coveragePollingPeriodMs);
    }
  }

  async stopPolling() {
    this._clearTimer();
    await this._currentPollPromise;
    this._currentPollPromise = null;
    // Do one last poll to get the final data.
    await this._pollAndCallback();
  }

  /**
   * @return {!Promise<undefined>}
   */
  async _pollAndCallback() {
    if (this._suspensionState === SuspensionState.Suspended && !this._performanceTraceRecording) {
      return;
    }
    const updates = await this._takeAllCoverage();
    // This conditional should never trigger, as all intended ways to stop
    // polling are awaiting the `_currentPollPromise` before suspending.
    console.assert(
        this._suspensionState !== SuspensionState.Suspended || this._performanceTraceRecording,
        'CoverageModel was suspended while polling.');
    if (updates.length) {
      this.dispatchEventToListeners(Events.CoverageUpdated, updates);
    }
  }

  _clearTimer() {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
  }

  /**
   * Stops polling as preparation for suspension. This function is idempotent
   * due because it changes the state to suspending.
   * @override
   * @param {string=} reason - optionally provide a reason, so the model can respond accordingly
   * @return {!Promise<undefined>}
   */
  async preSuspendModel(reason) {
    if (this._suspensionState !== SuspensionState.Active) {
      return;
    }
    this._suspensionState = SuspensionState.Suspending;
    if (reason === 'performance-timeline') {
      this._performanceTraceRecording = true;
      // Keep polling to the backlog if a performance trace is recorded.
      return;
    }
    if (this._currentPollPromise) {
      await this.stopPolling();
      this._shouldResumePollingOnResume = true;
    }
  }

  /**
   * @override
   * @param {string=} reason - optionally provide a reason, so the model can respond accordingly
   * @return {!Promise<undefined>}
   */
  async suspendModel(reason) {
    this._suspensionState = SuspensionState.Suspended;
  }

  /**
   * @override
   * @return {!Promise<undefined>}
   */
  async resumeModel() {
  }

  /**
   * Restarts polling after suspension. Note that the function is idempotent
   * because starting polling is idempotent.
   * @override
   * @return {!Promise<undefined>}
   */
  async postResumeModel() {
    this._suspensionState = SuspensionState.Active;
    this._performanceTraceRecording = false;
    if (this._shouldResumePollingOnResume) {
      this._shouldResumePollingOnResume = false;
      await this.startPolling();
    }
  }

  /**
   * @return {!Array<!URLCoverageInfo>}
   */
  entries() {
    return Array.from(this._coverageByURL.values());
  }

  /**
   *
   * @param {string} url
   * @return {?URLCoverageInfo}
   */
  getCoverageForUrl(url) {
    return this._coverageByURL.get(url);
  }

  /**
   * @param {!TextUtils.ContentProvider.ContentProvider} contentProvider
   * @param {number} startOffset
   * @param {number} endOffset
   * @return {boolean|undefined}
   */
  usageForRange(contentProvider, startOffset, endOffset) {
    const coverageInfo = this._coverageByContentProvider.get(contentProvider);
    return coverageInfo && coverageInfo.usageForRange(startOffset, endOffset);
  }

  _clearCSS() {
    for (const entry of this._coverageByContentProvider.values()) {
      if (entry.type() !== CoverageType.CSS) {
        continue;
      }
      const contentProvider = /** @type {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} */ (entry.contentProvider());
      this._coverageByContentProvider.delete(contentProvider);
      const key = `${contentProvider.startLine}:${contentProvider.startColumn}`;
      const urlEntry = this._coverageByURL.get(entry.url());
      if (!urlEntry || !urlEntry._coverageInfoByLocation.delete(key)) {
        continue;
      }
      urlEntry._addToSizes(-entry._usedSize, -entry._size);
      if (!urlEntry._coverageInfoByLocation.size) {
        this._coverageByURL.delete(entry.url());
      }
    }

    for (const styleSheetHeader of this._cssModel.getAllStyleSheetHeaders()) {
      this._addStyleSheetToCSSCoverage(styleSheetHeader);
    }
  }

  /**
   * @return {!Promise<!Array<!CoverageInfo>>}
   */
  async _takeAllCoverage() {
    const [updatesCSS, updatesJS] = await Promise.all([this._takeCSSCoverage(), this._takeJSCoverage()]);
    return [...updatesCSS, ...updatesJS];
  }

  /**
   * @return {!Promise<!Array<!CoverageInfo>>}
   */
  async _takeJSCoverage() {
    if (!this._cpuProfilerModel) {
      return [];
    }
    const {coverage, timestamp} = await this._cpuProfilerModel.takePreciseCoverage();
    this._coverageUpdateTimes.add(timestamp);
    return this._backlogOrProcessJSCoverage(coverage, timestamp);
  }

  coverageUpdateTimes() {
    return this._coverageUpdateTimes;
  }

  async _backlogOrProcessJSCoverage(freshRawCoverageData, freshTimestamp) {
    if (freshRawCoverageData.length > 0) {
      this._jsBacklog.push({rawCoverageData: freshRawCoverageData, stamp: freshTimestamp});
    }
    if (this._suspensionState !== SuspensionState.Active) {
      return [];
    }
    const ascendingByTimestamp = (x, y) => x.stamp - y.stamp;
    const results = [];
    for (const {rawCoverageData, stamp} of this._jsBacklog.sort(ascendingByTimestamp)) {
      results.push(this._processJSCoverage(rawCoverageData, stamp));
    }
    this._jsBacklog = [];
    return results.flat();
  }

  async processJSBacklog() {
    this._backlogOrProcessJSCoverage([], 0);
  }

  /**
   * @param {!Array<!Protocol.Profiler.ScriptCoverage>} scriptsCoverage
   * @return {!Array<!CoverageInfo>}
   */
  _processJSCoverage(scriptsCoverage, stamp) {
    const updatedEntries = [];
    for (const entry of scriptsCoverage) {
      const script = this._debuggerModel.scriptForId(entry.scriptId);
      if (!script) {
        continue;
      }

      const ranges = [];
      let type = CoverageType.JavaScript;
      for (const func of entry.functions) {
        // Do not coerce undefined to false, i.e. only consider blockLevel to be false
        // if back-end explicitly provides blockLevel field, otherwise presume blockLevel
        // coverage is not available. Also, ignore non-block level functions that weren't
        // ever called.
        if (func.isBlockCoverage === false && !(func.ranges.length === 1 && !func.ranges[0].count)) {
          type |= CoverageType.JavaScriptPerFunction;
        }
        for (const range of func.ranges) {
          ranges.push(range);
        }
      }
      const subentry = this._addCoverage(
          script, script.contentLength, script.lineOffset, script.columnOffset, ranges,
          /** @type {!CoverageType} */ (type), stamp);
      if (subentry) {
        updatedEntries.push(subentry);
      }
    }
    return updatedEntries;
  }

  _handleStyleSheetAdded(event) {
    const styleSheetHeader = /** @type {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} */ (event.data);

    this._addStyleSheetToCSSCoverage(styleSheetHeader);
  }

  /**
   * @return {!Promise<!Array<!CoverageInfo>>}
   */
  async _takeCSSCoverage() {
    // Don't poll if we have no model, or are suspended.
    if (!this._cssModel || this._suspensionState !== SuspensionState.Active) {
      return [];
    }
    const {coverage, timestamp} = await this._cssModel.takeCoverageDelta();
    this._coverageUpdateTimes.add(timestamp);
    return this._backlogOrProcessCSSCoverage(coverage, timestamp);
  }

  async _backlogOrProcessCSSCoverage(freshRawCoverageData, freshTimestamp) {
    if (freshRawCoverageData.length > 0) {
      this._cssBacklog.push({rawCoverageData: freshRawCoverageData, stamp: freshTimestamp});
    }
    if (this._suspensionState !== SuspensionState.Active) {
      return [];
    }
    const ascendingByTimestamp = (x, y) => x.stamp - y.stamp;
    const results = [];
    for (const {rawCoverageData, stamp} of this._cssBacklog.sort(ascendingByTimestamp)) {
      results.push(this._processCSSCoverage(rawCoverageData, stamp));
    }
    this._cssBacklog = [];
    return results.flat();
  }

  /**
   * @param {!Array<!Protocol.CSS.RuleUsage>} ruleUsageList
   * @return {!Array<!CoverageInfo>}
   */
  _processCSSCoverage(ruleUsageList, stamp) {
    const updatedEntries = [];
    /** @type {!Map<!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, !Array<!RangeUseCount>>} */
    const rulesByStyleSheet = new Map();
    for (const rule of ruleUsageList) {
      const styleSheetHeader = this._cssModel.styleSheetHeaderForId(rule.styleSheetId);
      if (!styleSheetHeader) {
        continue;
      }
      let ranges = rulesByStyleSheet.get(styleSheetHeader);
      if (!ranges) {
        ranges = [];
        rulesByStyleSheet.set(styleSheetHeader, ranges);
      }
      ranges.push({startOffset: rule.startOffset, endOffset: rule.endOffset, count: Number(rule.used)});
    }
    for (const entry of rulesByStyleSheet) {
      const styleSheetHeader = /** @type {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} */ (entry[0]);
      const ranges = /** @type {!Array<!RangeUseCount>} */ (entry[1]);
      const subentry = this._addCoverage(
          styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn,
          ranges, CoverageType.CSS, stamp);
      if (subentry) {
        updatedEntries.push(subentry);
      }
    }
    return updatedEntries;
  }

  /**
   * @param {!Array<!RangeUseCount>} ranges
   * @return {!Array<!CoverageSegment>}
   */
  static _convertToDisjointSegments(ranges, stamp) {
    ranges.sort((a, b) => a.startOffset - b.startOffset);

    const result = [];
    const stack = [];
    for (const entry of ranges) {
      let top = stack.peekLast();
      while (top && top.endOffset <= entry.startOffset) {
        append(top.endOffset, top.count);
        stack.pop();
        top = stack.peekLast();
      }
      append(entry.startOffset, top ? top.count : undefined);
      stack.push(entry);
    }

    while (stack.length) {
      const top = stack.pop();
      append(top.endOffset, top.count);
    }

    /**
     * @param {number} end
     * @param {number} count
     */
    function append(end, count) {
      const last = result.peekLast();
      if (last) {
        if (last.end === end) {
          return;
        }
        if (last.count === count) {
          last.end = end;
          return;
        }
      }
      result.push({end: end, count: count, stamp: stamp});
    }

    return result;
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} styleSheetHeader
   */
  _addStyleSheetToCSSCoverage(styleSheetHeader) {
    this._addCoverage(
        styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn, [],
        CoverageType.CSS, Date.now());
  }

  /**
   * @param {!TextUtils.ContentProvider.ContentProvider} contentProvider
   * @param {number} contentLength
   * @param {number} startLine
   * @param {number} startColumn
   * @param {!Array<!RangeUseCount>} ranges
   * @param {!CoverageType} type
   * @return {?CoverageInfo}
   */
  _addCoverage(contentProvider, contentLength, startLine, startColumn, ranges, type, stamp) {
    const url = contentProvider.contentURL();
    if (!url) {
      return null;
    }
    let urlCoverage = this._coverageByURL.get(url);
    let isNewUrlCoverage = false;
    if (!urlCoverage) {
      isNewUrlCoverage = true;
      urlCoverage = new URLCoverageInfo(url);
      this._coverageByURL.set(url, urlCoverage);
    }

    const coverageInfo = urlCoverage._ensureEntry(contentProvider, contentLength, startLine, startColumn, type);
    this._coverageByContentProvider.set(contentProvider, coverageInfo);
    const segments = CoverageModel._convertToDisjointSegments(ranges, stamp);
    if (segments.length && segments.peekLast().end < contentLength) {
      segments.push({end: contentLength, stamp: stamp});
    }
    const oldUsedSize = coverageInfo._usedSize;
    coverageInfo.mergeCoverage(segments);
    if (!isNewUrlCoverage && coverageInfo._usedSize === oldUsedSize) {
      return null;
    }
    urlCoverage._addToSizes(coverageInfo._usedSize - oldUsedSize, 0);
    return coverageInfo;
  }

  /**
   * @param {!Bindings.FileUtils.FileOutputStream} fos
   */
  async exportReport(fos) {
    const result = [];
    function locationCompare(a, b) {
      const [aLine, aPos] = a.split(':');
      const [bLine, bPos] = b.split(':');
      return aLine - bLine || aPos - bPos;
    }
    const coverageByUrlKeys = Array.from(this._coverageByURL.keys()).sort();
    for (const urlInfoKey of coverageByUrlKeys) {
      const urlInfo = this._coverageByURL.get(urlInfoKey);
      const url = urlInfo.url();
      if (url.startsWith('extensions::') || url.startsWith('chrome-extension://')) {
        continue;
      }

      // For .html resources, multiple scripts share URL, but have different offsets.
      let useFullText = false;
      for (const info of urlInfo._coverageInfoByLocation.values()) {
        if (info._lineOffset || info._columnOffset) {
          useFullText = !!url;
          break;
        }
      }

      let fullText = null;
      if (useFullText) {
        const resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(url);
        const content = (await resource.requestContent()).content;
        fullText = resource ? new TextUtils.Text.Text(content || '') : null;
      }

      const coverageByLocationKeys = Array.from(urlInfo._coverageInfoByLocation.keys()).sort(locationCompare);

      // We have full text for this resource, resolve the offsets using the text line endings.
      if (fullText) {
        const entry = {url, ranges: [], text: fullText.value()};
        for (const infoKey of coverageByLocationKeys) {
          const info = urlInfo._coverageInfoByLocation.get(infoKey);
          const offset = fullText ? fullText.offsetFromPosition(info._lineOffset, info._columnOffset) : 0;
          let start = 0;
          for (const segment of info._segments) {
            if (segment.count) {
              entry.ranges.push({start: start + offset, end: segment.end + offset});
            } else {
              start = segment.end;
            }
          }
        }
        result.push(entry);
        continue;
      }

      // Fall back to the per-script operation.
      for (const infoKey of coverageByLocationKeys) {
        const info = urlInfo._coverageInfoByLocation.get(infoKey);
        const entry = {url, ranges: [], text: (await info.contentProvider().requestContent()).content};
        let start = 0;
        for (const segment of info._segments) {
          if (segment.count) {
            entry.ranges.push({start: start, end: segment.end});
          } else {
            start = segment.end;
          }
        }
        result.push(entry);
      }
    }
    await fos.write(JSON.stringify(result, undefined, 2));
    fos.close();
  }
}

SDK.SDKModel.SDKModel.register(CoverageModel, SDK.SDKModel.Capability.None, false);

/**
 * @unrestricted
 */
export class URLCoverageInfo extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} url
   */
  constructor(url) {
    super();

    this._url = url;
    /** @type {!Map<string, !CoverageInfo>} */
    this._coverageInfoByLocation = new Map();
    this._size = 0;
    this._usedSize = 0;
    /** @type {!CoverageType} */
    this._type;
    this._isContentScript = false;
  }

  /**
   * @return {string}
   */
  url() {
    return this._url;
  }

  /**
   * @return {!CoverageType}
   */
  type() {
    return this._type;
  }

  /**
   * @return {number}
   */
  size() {
    return this._size;
  }

  /**
   * @return {number}
   */
  usedSize() {
    return this._usedSize;
  }

  /**
   * @return {number}
   */
  unusedSize() {
    return this._size - this._usedSize;
  }

  /**
   * @return {number}
   */
  usedPercentage() {
    // Per convention, empty files are reported as 100 % uncovered
    if (this._size === 0) {
      return 0;
    }
    return this.usedSize() / this.size() * 100;
  }

  /**
   * @return {number}
   */
  unusedPercentage() {
    // Per convention, empty files are reported as 100 % uncovered
    if (this._size === 0) {
      return 100;
    }
    return this.unusedSize() / this.size() * 100;
  }

  /**
   * @return {boolean}
   */
  isContentScript() {
    return this._isContentScript;
  }

  entries() {
    return this._coverageInfoByLocation.values();
  }

  _addToSizes(usedSize, size) {
    this._usedSize += usedSize;
    this._size += size;

    if (usedSize !== 0 || size !== 0) {
      this.dispatchEventToListeners(URLCoverageInfo.Events.SizesChanged);
    }
  }

  /**
   * @param {!TextUtils.ContentProvider.ContentProvider} contentProvider
   * @param {number} contentLength
   * @param {number} lineOffset
   * @param {number} columnOffset
   * @param {!CoverageType} type
   * @return {!CoverageInfo}
   */
  _ensureEntry(contentProvider, contentLength, lineOffset, columnOffset, type) {
    const key = `${lineOffset}:${columnOffset}`;
    let entry = this._coverageInfoByLocation.get(key);

    if ((type & CoverageType.JavaScript) && !this._coverageInfoByLocation.size) {
      this._isContentScript = /** @type {!SDK.Script.Script} */ (contentProvider).isContentScript();
    }
    this._type |= type;

    if (entry) {
      entry._coverageType |= type;
      return entry;
    }

    if ((type & CoverageType.JavaScript) && !this._coverageInfoByLocation.size) {
      this._isContentScript = /** @type {!SDK.Script.Script} */ (contentProvider).isContentScript();
    }

    entry = new CoverageInfo(contentProvider, contentLength, lineOffset, columnOffset, type);
    this._coverageInfoByLocation.set(key, entry);
    this._addToSizes(0, contentLength);

    return entry;
  }
}

/** @enum {symbol} */
URLCoverageInfo.Events = {
  SizesChanged: Symbol('SizesChanged')
};

/**
 * @unrestricted
 */
export class CoverageInfo {
  /**
   * @param {!TextUtils.ContentProvider.ContentProvider} contentProvider
   * @param {number} size
   * @param {number} lineOffset
   * @param {number} columnOffset
   * @param {!CoverageType} type
   */
  constructor(contentProvider, size, lineOffset, columnOffset, type) {
    this._contentProvider = contentProvider;
    this._size = size;
    this._usedSize = 0;
    this._statsByTimestamp = new Map();
    this._lineOffset = lineOffset;
    this._columnOffset = columnOffset;
    this._coverageType = type;

    /** !Array<!CoverageSegment> */
    this._segments = [];
  }

  /**
   * @return {!TextUtils.ContentProvider.ContentProvider}
   */
  contentProvider() {
    return this._contentProvider;
  }

  /**
   * @return {string}
   */
  url() {
    return this._contentProvider.contentURL();
  }

  /**
   * @return {!CoverageType}
   */
  type() {
    return this._coverageType;
  }

  /**
   * @param {!Array<!CoverageSegment>} segments
   */
  mergeCoverage(segments) {
    this._segments = CoverageInfo._mergeCoverage(this._segments, segments);
    this._updateStats();
  }

  usedByTimestamp() {
    return this._statsByTimestamp;
  }

  size() {
    return this._size;
  }

  /**
   * @param {number} start
   * @param {number} end
   * @return {boolean}
   */
  usageForRange(start, end) {
    let index = this._segments.upperBound(start, (position, segment) => position - segment.end);
    for (; index < this._segments.length && this._segments[index].end < end; ++index) {
      if (this._segments[index].count) {
        return true;
      }
    }
    return index < this._segments.length && !!this._segments[index].count;
  }

  /**
   * @param {!Array<!CoverageSegment>} segmentsA
   * @param {!Array<!CoverageSegment>} segmentsB
   */
  static _mergeCoverage(segmentsA, segmentsB) {
    const result = [];

    let indexA = 0;
    let indexB = 0;
    while (indexA < segmentsA.length && indexB < segmentsB.length) {
      const a = segmentsA[indexA];
      const b = segmentsB[indexB];
      const count =
          typeof a.count === 'number' || typeof b.count === 'number' ? (a.count || 0) + (b.count || 0) : undefined;
      const end = Math.min(a.end, b.end);
      const last = result.peekLast();
      const stamp = Math.min(a.stamp, b.stamp);
      if (!last || last.count !== count || last.stamp !== stamp) {
        result.push({end: end, count: count, stamp: stamp});
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
  }

  _updateStats() {
    this._statsByTimestamp = new Map();
    this._usedSize = 0;

    let last = 0;
    for (const segment of this._segments) {
      if (!this._statsByTimestamp.has(segment.stamp)) {
        this._statsByTimestamp.set(segment.stamp, 0);
      }

      if (segment.count) {
        const used = segment.end - last;
        this._usedSize += used;
        this._statsByTimestamp.set(segment.stamp, this._statsByTimestamp.get(segment.stamp) + used);
      }
      last = segment.end;
    }
  }
}

/** @typedef {{startOffset: number, endOffset: number, count: number}} */
export let RangeUseCount;

/** @typedef {{end: number, count: (number|undefined)}} */
export let CoverageSegment;
