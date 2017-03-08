// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {{startOffset: number, endOffset: number, count: number}} */
Coverage.RangeUseCount;

/** @typedef {{
 *    contentProvider: !Common.ContentProvider,
 *    size: (number|undefined),
 *    unusedSize: (number|undefined),
 *    usedSize: (number|undefined),
 *    type: !Coverage.CoverageType,
 *    lineOffset: number,
 *    columnOffset: number,
 *    ranges: !Array<!Coverage.RangeUseCount>
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
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  static async _processJSCoverage(debuggerModel, scriptsCoverage) {
    var promises = [];
    for (var entry of scriptsCoverage) {
      var script = debuggerModel.scriptForId(entry.scriptId);
      if (!script)
        continue;
      var ranges = [];
      for (var func of entry.functions) {
        for (var range of func.ranges)
          ranges.push({startOffset: range.startOffset, endOffset: range.endOffset, count: range.count});
      }
      promises.push(
          Coverage.CoverageModel._coverageInfoForText(script, script.lineOffset, script.columnOffset, ranges));
    }
    return Promise.all(promises);
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
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  static async _processCSSCoverage(cssModel, ruleUsageList) {
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
    return Promise.all(Array.from(
        rulesByStyleSheet.entries(),
        entry =>
            Coverage.CoverageModel._coverageInfoForText(entry[0], entry[0].startLine, entry[0].startColumn, entry[1])));
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} startLine
   * @param {number} startColumn
   * @param {!Array<!Coverage.RangeUseCount>} ranges
   * @return {!Promise<?Coverage.CoverageInfo>}
   */
  static async _coverageInfoForText(contentProvider, startLine, startColumn, ranges) {
    var coverageType;
    var url = contentProvider.contentURL();
    if (contentProvider.contentType().isScript())
      coverageType = Coverage.CoverageType.JavaScript;
    else if (contentProvider.contentType().isStyleSheet())
      coverageType = Coverage.CoverageType.CSS;
    else
      console.assert(false, `Unexpected resource type ${contentProvider.contentType().name} for ${url}`);

    var stack = [];
    ranges.sort((a, b) => a.startOffset - b.startOffset);
    for (var entry of ranges) {
      while (stack.length && stack.peekLast().endOffset <= entry.startOffset)
        stack.pop();

      entry.ownSize = entry.endOffset - entry.startOffset;
      var top = stack.peekLast();
      if (top) {
        if (top.endOffset < entry.endOffset) {
          console.assert(
              false, `Overlapping coverage entries in ${url}: ${top.start}-${top.end} vs. ${entry.start}-${entry.end}`);
        }
        top.ownSize -= entry.ownSize;
      }
      stack.push(entry);
    }

    var usedSize = 0;
    var unusedSize = 0;
    for (var entry of ranges) {
      if (entry.count)
        usedSize += entry.ownSize;
      else
        unusedSize += entry.ownSize;
    }

    // FIXME: get rid of this when we get the size upfront.
    var content = await contentProvider.requestContent();
    if (typeof content !== 'string')
      return null;

    var coverageInfo = {
      contentProvider: contentProvider,
      ranges: ranges,
      type: coverageType,
      size: content.length,
      usedSize: usedSize,
      unusedSize: unusedSize,
      lineOffset: startLine,
      columnOffset: startColumn
    };
    return coverageInfo;
  }
};
