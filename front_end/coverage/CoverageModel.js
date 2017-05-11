// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {{startOffset: number, endOffset: number, count: number}} */
Coverage.RangeUseCount;

/** @typedef {{end: number, count: (number|undefined)}} */
Coverage.CoverageSegment;

/**
 * @enum {number}
 */
Coverage.CoverageType = {
  CSS: (1 << 0),
  JavaScript: (1 << 1),
};

Coverage.CoverageModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._cpuProfilerModel = target.model(SDK.CPUProfilerModel);
    this._cssModel = target.model(SDK.CSSModel);
    this._debuggerModel = target.model(SDK.DebuggerModel);

    /** @type {!Map<string, !Coverage.URLCoverageInfo>} */
    this._coverageByURL = new Map();
    /** @type {!Map<!Common.ContentProvider, !Coverage.CoverageInfo>} */
    this._coverageByContentProvider = new Map();
  }

  /**
   * @return {boolean}
   */
  start() {
    this._coverageByURL.clear();
    if (this._cssModel)
      this._cssModel.startCoverage();
    if (this._cpuProfilerModel)
      this._cpuProfilerModel.startPreciseCoverage();
    return !!(this._cssModel || this._cpuProfilerModel);
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  stop() {
    var pollPromise = this.poll();
    if (this._cpuProfilerModel)
      this._cpuProfilerModel.stopPreciseCoverage();
    if (this._cssModel)
      this._cssModel.stopCoverage();
    return pollPromise;
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  async poll() {
    var updates = await Promise.all([this._takeCSSCoverage(), this._takeJSCoverage()]);
    return updates[0].concat(updates[1]);
  }

  /**
   * @return {!Array<!Coverage.URLCoverageInfo>}
   */
  entries() {
    return Array.from(this._coverageByURL.values());
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} startOffset
   * @param {number} endOffset
   * @return {boolean|undefined}
   */
  usageForRange(contentProvider, startOffset, endOffset) {
    var coverageInfo = this._coverageByContentProvider.get(contentProvider);
    return coverageInfo && coverageInfo.usageForRange(startOffset, endOffset);
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  async _takeJSCoverage() {
    if (!this._cpuProfilerModel)
      return [];
    var rawCoverageData = await this._cpuProfilerModel.takePreciseCoverage();
    return this._processJSCoverage(rawCoverageData);
  }

  /**
   * @param {!Array<!Protocol.Profiler.ScriptCoverage>} scriptsCoverage
   * @return {!Array<!Coverage.CoverageInfo>}
   */
  _processJSCoverage(scriptsCoverage) {
    var updatedEntries = [];
    for (var entry of scriptsCoverage) {
      var script = this._debuggerModel.scriptForId(entry.scriptId);
      if (!script)
        continue;
      var ranges = [];
      for (var func of entry.functions) {
        for (var range of func.ranges)
          ranges.push(range);
      }
      var entry = this._addCoverage(script, script.contentLength, script.lineOffset, script.columnOffset, ranges);
      if (entry)
        updatedEntries.push(entry);
    }
    return updatedEntries;
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  async _takeCSSCoverage() {
    if (!this._cssModel)
      return [];
    var rawCoverageData = await this._cssModel.takeCoverageDelta();
    return this._processCSSCoverage(rawCoverageData);
  }

  /**
   * @param {!Array<!Protocol.CSS.RuleUsage>} ruleUsageList
   * @return {!Array<!Coverage.CoverageInfo>}
   */
  _processCSSCoverage(ruleUsageList) {
    var updatedEntries = [];
    /** @type {!Map<!SDK.CSSStyleSheetHeader, !Array<!Coverage.RangeUseCount>>} */
    var rulesByStyleSheet = new Map();
    for (var rule of ruleUsageList) {
      var styleSheetHeader = this._cssModel.styleSheetHeaderForId(rule.styleSheetId);
      if (!styleSheetHeader)
        continue;
      var ranges = rulesByStyleSheet.get(styleSheetHeader);
      if (!ranges) {
        ranges = [];
        rulesByStyleSheet.set(styleSheetHeader, ranges);
      }
      ranges.push({startOffset: rule.startOffset, endOffset: rule.endOffset, count: Number(rule.used)});
    }
    for (var entry of rulesByStyleSheet) {
      var styleSheetHeader = /** @type {!SDK.CSSStyleSheetHeader} */ (entry[0]);
      var ranges = /** @type {!Array<!Coverage.RangeUseCount>} */ (entry[1]);
      var entry = this._addCoverage(
          styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn,
          ranges);
      if (entry)
        updatedEntries.push(entry);
    }
    return updatedEntries;
  }

  /**
   * @param {!Array<!Coverage.RangeUseCount>} ranges
   * @return {!Array<!Coverage.CoverageSegment>}
   */
  static _convertToDisjointSegments(ranges) {
    ranges.sort((a, b) => a.startOffset - b.startOffset);

    var result = [];
    var stack = [];
    for (var entry of ranges) {
      var top = stack.peekLast();
      while (top && top.endOffset <= entry.startOffset) {
        append(top.endOffset, top.count);
        stack.pop();
        top = stack.peekLast();
      }
      append(entry.startOffset, top ? top.count : undefined);
      stack.push(entry);
    }

    while (stack.length) {
      var top = stack.pop();
      append(top.endOffset, top.count);
    }

    /**
     * @param {number} end
     * @param {number} count
     */
    function append(end, count) {
      var last = result.peekLast();
      if (last) {
        if (last.end === end)
          return;
        if (last.count === count) {
          last.end = end;
          return;
        }
      }
      result.push({end: end, count: count});
    }

    return result;
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} contentLength
   * @param {number} startLine
   * @param {number} startColumn
   * @param {!Array<!Coverage.RangeUseCount>} ranges
   * @return {?Coverage.CoverageInfo}
   */
  _addCoverage(contentProvider, contentLength, startLine, startColumn, ranges) {
    var url = contentProvider.contentURL();
    if (!url)
      return null;
    var urlCoverage = this._coverageByURL.get(url);
    if (!urlCoverage) {
      urlCoverage = new Coverage.URLCoverageInfo(url);
      this._coverageByURL.set(url, urlCoverage);
    }
    var coverageInfo = urlCoverage._ensureEntry(contentProvider, contentLength, startLine, startColumn);
    this._coverageByContentProvider.set(contentProvider, coverageInfo);
    var segments = Coverage.CoverageModel._convertToDisjointSegments(ranges);
    if (segments.length && segments.peekLast().end < contentLength)
      segments.push({end: contentLength});
    var oldUsedSize = coverageInfo._usedSize;
    coverageInfo.mergeCoverage(segments);
    if (coverageInfo._usedSize === oldUsedSize)
      return null;
    urlCoverage._usedSize += coverageInfo._usedSize - oldUsedSize;
    return coverageInfo;
  }
};

Coverage.URLCoverageInfo = class {
  /**
   * @param {string} url
   */
  constructor(url) {
    this._url = url;
    /** @type {!Map<string, !Coverage.CoverageInfo>} */
    this._coverageInfoByLocation = new Map();
    this._size = 0;
    this._usedSize = 0;
    /** @type {!Coverage.CoverageType} */
    this._type;
  }

  /**
   * @return {string}
   */
  url() {
    return this._url;
  }

  /**
   * @return {!Coverage.CoverageType}
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
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} contentLength
   * @param {number} lineOffset
   * @param {number} columnOffset
   * @return {!Coverage.CoverageInfo}
   */
  _ensureEntry(contentProvider, contentLength, lineOffset, columnOffset) {
    var key = `${lineOffset}:${columnOffset}`;
    var entry = this._coverageInfoByLocation.get(key);

    if (!entry) {
      entry = new Coverage.CoverageInfo(contentProvider, lineOffset, columnOffset);
      this._coverageInfoByLocation.set(key, entry);
      this._size += contentLength;
      this._type |= entry.type();
    }
    return entry;
  }
};

Coverage.CoverageInfo = class {
  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} lineOffset
   * @param {number} columnOffset
   */
  constructor(contentProvider, lineOffset, columnOffset) {
    this._contentProvider = contentProvider;
    this._lineOffset = lineOffset;
    this._columnOffset = columnOffset;
    this._usedSize = 0;

    if (contentProvider.contentType().isScript()) {
      this._coverageType = Coverage.CoverageType.JavaScript;
    } else if (contentProvider.contentType().isStyleSheet()) {
      this._coverageType = Coverage.CoverageType.CSS;
    } else {
      console.assert(
          false, `Unexpected resource type ${contentProvider.contentType().name} for ${contentProvider.contentURL()}`);
    }
    /** !Array<!Coverage.CoverageSegment> */
    this._segments = [];
  }

  /**
   * @return {!Common.ContentProvider}
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
   * @return {!Coverage.CoverageType}
   */
  type() {
    return this._coverageType;
  }

  /**
   * @param {!Array<!Coverage.CoverageSegment>} segments
   */
  mergeCoverage(segments) {
    this._segments = Coverage.CoverageInfo._mergeCoverage(this._segments, segments);
    this._updateStats();
  }

  /**
   * @param {number} start
   * @param {number} end
   * @return {boolean}
   */
  usageForRange(start, end) {
    var index = this._segments.upperBound(start, (position, segment) => position - segment.end);
    for (; index < this._segments.length && this._segments[index].end < end; ++index) {
      if (this._segments[index].count)
        return true;
    }
    return index < this._segments.length && !!this._segments[index].count;
  }

  /**
   * @param {!Array<!Coverage.CoverageSegment>} segmentsA
   * @param {!Array<!Coverage.CoverageSegment>} segmentsB
   */
  static _mergeCoverage(segmentsA, segmentsB) {
    var result = [];

    var indexA = 0;
    var indexB = 0;
    while (indexA < segmentsA.length && indexB < segmentsB.length) {
      var a = segmentsA[indexA];
      var b = segmentsB[indexB];
      var count =
          typeof a.count === 'number' || typeof b.count === 'number' ? (a.count || 0) + (b.count || 0) : undefined;
      var end = Math.min(a.end, b.end);
      var last = result.peekLast();
      if (!last || last.count !== count)
        result.push({end: end, count: count});
      else
        last.end = end;
      if (a.end <= b.end)
        indexA++;
      if (a.end >= b.end)
        indexB++;
    }

    for (; indexA < segmentsA.length; indexA++)
      result.push(segmentsA[indexA]);
    for (; indexB < segmentsB.length; indexB++)
      result.push(segmentsB[indexB]);
    return result;
  }

  _updateStats() {
    this._usedSize = 0;

    var last = 0;
    for (var segment of this._segments) {
      if (segment.count)
        this._usedSize += segment.end - last;
      last = segment.end;
    }
  }
};
