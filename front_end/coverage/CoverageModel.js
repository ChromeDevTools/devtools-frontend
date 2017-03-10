// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {{startOffset: number, endOffset: number, count: number}} */
Coverage.RangeUseCount;

/** @typedef {{end: number, count: (number|undefined), depth: number}} */
Coverage.CoverageSegment;

/** @typedef {{
 *    contentProvider: !Common.ContentProvider,
 *    size: number,
 *    unusedSize: number,
 *    usedSize: number,
 *    type: !Coverage.CoverageType,
 *    lineOffset: number,
 *    columnOffset: number,
 *    segments: !Array<!Coverage.CoverageSegment>
 * }}
 */
Coverage.CoverageInfo;

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
    this._target = target;
    this._cpuProfilerModel = this._target.model(SDK.CPUProfilerModel);
    this._cssModel = this._target.model(SDK.CSSModel);
  }

  /**
   * @return {boolean}
   */
  start() {
    if (this._cssModel)
      this._cssModel.startRuleUsageTracking();
    if (this._cpuProfilerModel)
      this._cpuProfilerModel.startPreciseCoverage();
    return !!(this._cssModel || this._cpuProfilerModel);
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  async stop() {
    var cssCoverageInfoPromise = this._stopCSSCoverage();
    var jsCoverageInfoPromise = this._stopJSCoverage();
    var cssCoverageInfo = await cssCoverageInfoPromise;
    var jsCoverageInfo = await jsCoverageInfoPromise;
    return Coverage.CoverageModel._coalesceByURL(cssCoverageInfo.concat(jsCoverageInfo));
  }

  /**
   * @param {!Array<!Coverage.CoverageInfo>} coverageInfo
   * @return {!Array<!Coverage.CoverageInfo>}
   */
  static _coalesceByURL(coverageInfo) {
    coverageInfo.sort((a, b) => (a.contentProvider.contentURL() || '').localeCompare(b.contentProvider.contentURL()));
    var result = [];
    for (var entry of coverageInfo) {
      var url = entry.contentProvider.contentURL();
      if (!url)
        continue;
      if (result.length && result.peekLast().contentProvider.contentURL() === url) {
        var lastEntry = result.peekLast();
        lastEntry.size += entry.size;
        lastEntry.usedSize += entry.usedSize;
        lastEntry.unusedSize += entry.unusedSize;
        lastEntry.type |= entry.type;
      } else {
        result.push(entry);
      }
    }
    return result;
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  async _stopJSCoverage() {
    if (!this._cpuProfilerModel)
      return [];
    var coveragePromise = this._cpuProfilerModel.takePreciseCoverage();
    this._cpuProfilerModel.stopPreciseCoverage();
    var rawCoverageData = await coveragePromise;
    return Coverage.CoverageModel._processJSCoverage(
        /** @type !SDK.DebuggerModel */ (SDK.DebuggerModel.fromTarget(this.target())), rawCoverageData);
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Array<!Protocol.Profiler.ScriptCoverage>} scriptsCoverage
   * @return {!Array<!Coverage.CoverageInfo>}
   */
  static _processJSCoverage(debuggerModel, scriptsCoverage) {
    var result = [];
    for (var entry of scriptsCoverage) {
      var script = debuggerModel.scriptForId(entry.scriptId);
      if (!script)
        continue;
      var ranges = [];
      for (var func of entry.functions) {
        for (var range of func.ranges)
          ranges.push(range);
      }
      ranges.sort((a, b) => a.startOffset - b.startOffset);
      result.push(Coverage.CoverageModel._buildCoverageInfo(
          script, script.contentLength, script.lineOffset, script.columnOffset, ranges));
    }
    return result;
  }

  /**
   * @param {!Array<!Coverage.RangeUseCount>} ranges
   * @return {!Array<!Coverage.CoverageSegment>}
   */
  static _convertToDisjointSegments(ranges) {
    var result = [];

    var stack = [];
    for (var entry of ranges) {
      var top = stack.peekLast();
      while (top && top.endOffset <= entry.startOffset) {
        append(top.endOffset, top.count, stack.length);
        stack.pop();
        top = stack.peekLast();
      }
      append(entry.startOffset, top ? top.count : undefined, stack.length);
      stack.push(entry);
    }

    while (stack.length) {
      var depth = stack.length;
      var top = stack.pop();
      append(top.endOffset, top.count, depth);
    }

    /**
     * @param {number} end
     * @param {number} count
     * @param {number} depth
     */
    function append(end, count, depth) {
      var last = result.peekLast();
      if (last) {
        if (last.end === end)
          return;
        if (last.count === count && last.depth === depth) {
          last.end = end;
          return;
        }
      }
      result.push({end: end, count: count, depth: depth});
    }

    return result;
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  async _stopCSSCoverage() {
    if (!this._cssModel)
      return [];

    var rawCoverageData = await this._cssModel.ruleListPromise();
    return Coverage.CoverageModel._processCSSCoverage(
        /** @type !SDK.CSSModel */ (this._cssModel), rawCoverageData);
  }

  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Array<!Protocol.CSS.RuleUsage>} ruleUsageList
   * @return {!Array<!Coverage.CoverageInfo>}
   */
  static _processCSSCoverage(cssModel, ruleUsageList) {
    /** @type {!Map<?SDK.CSSStyleSheetHeader, !Array<!Coverage.RangeUseCount>>} */
    var rulesByStyleSheet = new Map();
    for (var rule of ruleUsageList) {
      var styleSheetHeader = cssModel.styleSheetHeaderForId(rule.styleSheetId);
      var ranges = rulesByStyleSheet.get(styleSheetHeader);
      if (!ranges) {
        ranges = [];
        rulesByStyleSheet.set(styleSheetHeader, ranges);
      }
      ranges.push({startOffset: rule.startOffset, endOffset: rule.endOffset, count: Number(rule.used)});
    }
    return Array.from(
        rulesByStyleSheet.entries(),
        entry => Coverage.CoverageModel._buildCoverageInfo(
            entry[0], entry[0].contentLength, entry[0].startLine, entry[0].startColumn, entry[1]));
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} contentLength
   * @param {number} startLine
   * @param {number} startColumn
   * @param {!Array<!Coverage.RangeUseCount>} ranges
   * @return {!Coverage.CoverageInfo}
   */
  static _buildCoverageInfo(contentProvider, contentLength, startLine, startColumn, ranges) {
    /** @type Coverage.CoverageType */
    var coverageType;
    var url = contentProvider.contentURL();
    if (contentProvider.contentType().isScript())
      coverageType = Coverage.CoverageType.JavaScript;
    else if (contentProvider.contentType().isStyleSheet())
      coverageType = Coverage.CoverageType.CSS;
    else
      console.assert(false, `Unexpected resource type ${contentProvider.contentType().name} for ${url}`);

    var segments = Coverage.CoverageModel._convertToDisjointSegments(ranges);
    var usedSize = 0;
    var unusedSize = 0;
    var last = 0;
    for (var segment of segments) {
      if (typeof segment.count === 'number') {
        if (segment.count)
          usedSize += segment.end - last;
        else
          unusedSize += segment.end - last;
      }
      last = segment.end;
    }
    var coverageInfo = {
      contentProvider: contentProvider,
      segments: segments,
      type: coverageType,
      size: contentLength,
      usedSize: usedSize,
      unusedSize: unusedSize,
      lineOffset: startLine,
      columnOffset: startColumn
    };
    return coverageInfo;
  }
};
