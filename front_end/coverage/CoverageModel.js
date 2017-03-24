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
  }

  /**
   * @return {boolean}
   */
  start() {
    this._coverageByURL.clear();
    if (this._cssModel)
      this._cssModel.startRuleUsageTracking();
    if (this._cpuProfilerModel)
      this._cpuProfilerModel.startPreciseCoverage();
    return !!(this._cssModel || this._cpuProfilerModel);
  }

  /**
   * @return {!Promise<!Array<!Coverage.URLCoverageInfo>>}
   */
  async stop() {
    await Promise.all([this._stopCSSCoverage(), this._stopJSCoverage()]);
    return Array.from(this._coverageByURL.values());
  }

  async _stopJSCoverage() {
    if (!this._cpuProfilerModel)
      return;
    var coveragePromise = this._cpuProfilerModel.takePreciseCoverage();
    this._cpuProfilerModel.stopPreciseCoverage();
    var rawCoverageData = await coveragePromise;
    this._processJSCoverage(rawCoverageData);
  }

  /**
   * @param {!Array<!Protocol.Profiler.ScriptCoverage>} scriptsCoverage
   */
  _processJSCoverage(scriptsCoverage) {
    for (var entry of scriptsCoverage) {
      var script = this._debuggerModel.scriptForId(entry.scriptId);
      if (!script)
        continue;
      var ranges = [];
      for (var func of entry.functions) {
        for (var range of func.ranges)
          ranges.push(range);
      }
      this._addCoverage(script, script.contentLength, script.lineOffset, script.columnOffset, ranges);
    }
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

  async _stopCSSCoverage() {
    if (!this._cssModel)
      return [];

    var rawCoverageData = await this._cssModel.ruleListPromise();
    this._processCSSCoverage(rawCoverageData);
  }

  /**
   * @param {!Array<!Protocol.CSS.RuleUsage>} ruleUsageList
   */
  _processCSSCoverage(ruleUsageList) {
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
      this._addCoverage(
          styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn,
          ranges);
    }
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} contentLength
   * @param {number} startLine
   * @param {number} startColumn
   * @param {!Array<!Coverage.RangeUseCount>} ranges
   */
  _addCoverage(contentProvider, contentLength, startLine, startColumn, ranges) {
    var url = contentProvider.contentURL();
    if (!url)
      return;
    var entry = this._coverageByURL.get(url);
    if (!entry) {
      entry = new Coverage.URLCoverageInfo(url);
      this._coverageByURL.set(url, entry);
    }
    var segments = Coverage.CoverageModel._convertToDisjointSegments(ranges);
    if (segments.length && segments.peekLast().end < contentLength)
      segments.push({end: contentLength});
    entry.update(contentProvider, contentLength, startLine, startColumn, segments);
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
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} contentLength
   * @param {number} lineOffset
   * @param {number} columnOffset
   * @param {!Array<!Coverage.CoverageSegment>} segments
   */
  update(contentProvider, contentLength, lineOffset, columnOffset, segments) {
    var key = `${lineOffset}:${columnOffset}`;
    var entry = this._coverageInfoByLocation.get(key);

    if (!entry) {
      entry = new Coverage.CoverageInfo(contentProvider, lineOffset, columnOffset);
      this._coverageInfoByLocation.set(key, entry);
      this._size += contentLength;
      this._type |= entry.type();
    }
    this._usedSize -= entry._usedSize;
    entry.mergeCoverage(segments);
    this._usedSize += entry._usedSize;
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
   * @return {!Promise<!Array<!{range: !TextUtils.TextRange, count: number}>>}
   */
  async buildTextRanges() {
    var textRangePromises = [];
    for (var coverageInfo of this._coverageInfoByLocation.values())
      textRangePromises.push(coverageInfo.buildTextRanges());
    var allTextRanges = await Promise.all(textRangePromises);
    return [].concat(...allTextRanges);
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

  /**
   * @return {!Promise<!Array<!{range: !TextUtils.TextRange, count: number}>>}
   */
  async buildTextRanges() {
    var contents = await this._contentProvider.requestContent();
    if (!contents)
      return [];
    var text = new TextUtils.Text(contents);
    var lastOffset = 0;
    var result = [];
    for (var segment of this._segments) {
      if (!segment.end)
        continue;
      var startPosition = text.positionFromOffset(lastOffset);
      var endPosition = text.positionFromOffset(segment.end);
      if (!startPosition.lineNumber)
        startPosition.columnNumber += this._columnOffset;
      startPosition.lineNumber += this._lineOffset;
      if (!endPosition.lineNumber)
        endPosition.columnNumber += this._columnOffset;
      endPosition.lineNumber += this._lineOffset;
      var range = new TextUtils.TextRange(
          startPosition.lineNumber, startPosition.columnNumber, endPosition.lineNumber, endPosition.columnNumber);
      result.push({count: segment.count || 0, range: range});
      lastOffset = segment.end;
    }
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
