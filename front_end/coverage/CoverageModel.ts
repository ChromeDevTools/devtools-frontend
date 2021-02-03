// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Bindings from '../bindings/bindings.js';  // eslint-disable-line no-unused-vars
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';

export const enum CoverageType {
  CSS = (1 << 0),
  JavaScript = (1 << 1),
  JavaScriptPerFunction = (1 << 2),
}


export const enum SuspensionState {
  Active = 'Active',
  Suspending = 'Suspending',
  Suspended = 'Suspended',
}


// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  CoverageUpdated = 'CoverageUpdated',
  CoverageReset = 'CoverageReset',
}


const _coveragePollingPeriodMs: number = 200;

interface BacklogItem<T> {
  rawCoverageData: Array<T>;
  stamp: number;
}

export class CoverageModel extends SDK.SDKModel.SDKModel {
  _cpuProfilerModel: SDK.CPUProfilerModel.CPUProfilerModel|null;
  _cssModel: SDK.CSSModel.CSSModel|null;
  _debuggerModel: SDK.DebuggerModel.DebuggerModel|null;
  _coverageByURL: Map<string, URLCoverageInfo>;
  _coverageByContentProvider: Map<TextUtils.ContentProvider.ContentProvider, CoverageInfo>;
  _coverageUpdateTimes: Set<number>;
  _suspensionState: SuspensionState;
  _pollTimer: number|null;
  _currentPollPromise: Promise<void>|null;
  _shouldResumePollingOnResume: boolean|null;
  _jsBacklog: BacklogItem<Protocol.Profiler.ScriptCoverage>[];
  _cssBacklog: BacklogItem<Protocol.CSS.RuleUsage>[];
  _performanceTraceRecording: boolean|null;

  constructor(target: SDK.SDKModel.Target) {
    super(target);
    this._cpuProfilerModel = target.model(SDK.CPUProfilerModel.CPUProfilerModel);
    this._cssModel = target.model(SDK.CSSModel.CSSModel);
    this._debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);

    this._coverageByURL = new Map();
    this._coverageByContentProvider = new Map();

    // We keep track of the update times, because the other data-structures don't change if an
    // update doesn't change the coverage. Some visualizations want to convey to the user that
    // an update was received at a certain time, but did not result in a coverage change.
    this._coverageUpdateTimes = new Set();

    this._suspensionState = SuspensionState.Active;
    this._pollTimer = null;
    this._currentPollPromise = null;
    this._shouldResumePollingOnResume = false;
    this._jsBacklog = [];
    this._cssBacklog = [];
    this._performanceTraceRecording = false;
  }

  async start(jsCoveragePerBlock: boolean): Promise<boolean> {
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
    return Boolean(this._cssModel || this._cpuProfilerModel);
  }

  preciseCoverageDeltaUpdate(timestamp: number, occasion: string, coverageData: Protocol.Profiler.ScriptCoverage[]):
      void {
    this._coverageUpdateTimes.add(timestamp);
    this._backlogOrProcessJSCoverage(coverageData, timestamp);
  }

  async stop(): Promise<void> {
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

  reset(): void {
    this._coverageByURL = new Map();
    this._coverageByContentProvider = new Map();
    this._coverageUpdateTimes = new Set();
    this.dispatchEventToListeners(Events.CoverageReset);
  }

  async startPolling(): Promise<void> {
    if (this._currentPollPromise || this._suspensionState !== SuspensionState.Active) {
      return;
    }
    await this._pollLoop();
  }

  async _pollLoop(): Promise<void> {
    this._clearTimer();
    this._currentPollPromise = this._pollAndCallback();
    await this._currentPollPromise;
    if (this._suspensionState === SuspensionState.Active || this._performanceTraceRecording) {
      this._pollTimer = window.setTimeout(() => this._pollLoop(), _coveragePollingPeriodMs);
    }
  }

  async stopPolling(): Promise<void> {
    this._clearTimer();
    await this._currentPollPromise;
    this._currentPollPromise = null;
    // Do one last poll to get the final data.
    await this._pollAndCallback();
  }

  async _pollAndCallback(): Promise<void> {
    if (this._suspensionState === SuspensionState.Suspended && !this._performanceTraceRecording) {
      return;
    }
    const updates = await this._takeAllCoverage();
    // This conditional should never trigger, as all intended ways to stop
    // polling are awaiting the `_currentPollPromise` before suspending.
    console.assert(
        this._suspensionState !== SuspensionState.Suspended || Boolean(this._performanceTraceRecording),
        'CoverageModel was suspended while polling.');
    if (updates.length) {
      this.dispatchEventToListeners(Events.CoverageUpdated, updates);
    }
  }

  _clearTimer(): void {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
  }

  /**
   * Stops polling as preparation for suspension. This function is idempotent
   * due because it changes the state to suspending.
   */
  async preSuspendModel(reason?: string): Promise<void> {
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

  async suspendModel(_reason?: string): Promise<void> {
    this._suspensionState = SuspensionState.Suspended;
  }

  async resumeModel(): Promise<void> {
  }

  /**
   * Restarts polling after suspension. Note that the function is idempotent
   * because starting polling is idempotent.
   */
  async postResumeModel(): Promise<void> {
    this._suspensionState = SuspensionState.Active;
    this._performanceTraceRecording = false;
    if (this._shouldResumePollingOnResume) {
      this._shouldResumePollingOnResume = false;
      await this.startPolling();
    }
  }

  entries(): URLCoverageInfo[] {
    return Array.from(this._coverageByURL.values());
  }

  getCoverageForUrl(url: string): URLCoverageInfo|null {
    return this._coverageByURL.get(url) || null;
  }

  usageForRange(contentProvider: TextUtils.ContentProvider.ContentProvider, startOffset: number, endOffset: number):
      boolean|undefined {
    const coverageInfo = this._coverageByContentProvider.get(contentProvider);
    return coverageInfo && coverageInfo.usageForRange(startOffset, endOffset);
  }

  _clearCSS(): void {
    for (const entry of this._coverageByContentProvider.values()) {
      if (entry.type() !== CoverageType.CSS) {
        continue;
      }
      const contentProvider = entry.contentProvider() as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;
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

    if (this._cssModel) {
      for (const styleSheetHeader of this._cssModel.getAllStyleSheetHeaders()) {
        this._addStyleSheetToCSSCoverage(styleSheetHeader);
      }
    }
  }

  async _takeAllCoverage(): Promise<CoverageInfo[]> {
    const [updatesCSS, updatesJS] = await Promise.all([this._takeCSSCoverage(), this._takeJSCoverage()]);
    return [...updatesCSS, ...updatesJS];
  }

  async _takeJSCoverage(): Promise<CoverageInfo[]> {
    if (!this._cpuProfilerModel) {
      return [];
    }
    const {coverage, timestamp} = await this._cpuProfilerModel.takePreciseCoverage();
    this._coverageUpdateTimes.add(timestamp);
    return this._backlogOrProcessJSCoverage(coverage, timestamp);
  }

  coverageUpdateTimes(): Set<number> {
    return this._coverageUpdateTimes;
  }

  async _backlogOrProcessJSCoverage(freshRawCoverageData: Protocol.Profiler.ScriptCoverage[], freshTimestamp: number):
      Promise<CoverageInfo[]> {
    if (freshRawCoverageData.length > 0) {
      this._jsBacklog.push({rawCoverageData: freshRawCoverageData, stamp: freshTimestamp});
    }
    if (this._suspensionState !== SuspensionState.Active) {
      return [];
    }
    const ascendingByTimestamp = (x: {stamp: number;}, y: {stamp: number;}): number => x.stamp - y.stamp;
    const results = [];
    for (const {rawCoverageData, stamp} of this._jsBacklog.sort(ascendingByTimestamp)) {
      results.push(this._processJSCoverage(rawCoverageData, stamp));
    }
    this._jsBacklog = [];
    return results.flat();
  }

  async processJSBacklog(): Promise<void> {
    this._backlogOrProcessJSCoverage([], 0);
  }

  _processJSCoverage(scriptsCoverage: Protocol.Profiler.ScriptCoverage[], stamp: number): CoverageInfo[] {
    if (!this._debuggerModel) {
      return [];
    }
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
          script, script.contentLength, script.lineOffset, script.columnOffset, ranges, type as CoverageType, stamp);
      if (subentry) {
        updatedEntries.push(subentry);
      }
    }
    return updatedEntries;
  }

  _handleStyleSheetAdded(event: Common.EventTarget.EventTargetEvent): void {
    const styleSheetHeader = event.data as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;

    this._addStyleSheetToCSSCoverage(styleSheetHeader);
  }

  async _takeCSSCoverage(): Promise<CoverageInfo[]> {
    // Don't poll if we have no model, or are suspended.
    if (!this._cssModel || this._suspensionState !== SuspensionState.Active) {
      return [];
    }
    const {coverage, timestamp} = await this._cssModel.takeCoverageDelta();
    this._coverageUpdateTimes.add(timestamp);
    return this._backlogOrProcessCSSCoverage(coverage, timestamp);
  }

  async _backlogOrProcessCSSCoverage(freshRawCoverageData: Protocol.CSS.RuleUsage[], freshTimestamp: number):
      Promise<CoverageInfo[]> {
    if (freshRawCoverageData.length > 0) {
      this._cssBacklog.push({rawCoverageData: freshRawCoverageData, stamp: freshTimestamp});
    }
    if (this._suspensionState !== SuspensionState.Active) {
      return [];
    }
    const ascendingByTimestamp = (x: {stamp: number;}, y: {stamp: number;}): number => x.stamp - y.stamp;
    const results = [];
    for (const {rawCoverageData, stamp} of this._cssBacklog.sort(ascendingByTimestamp)) {
      results.push(this._processCSSCoverage(rawCoverageData, stamp));
    }
    this._cssBacklog = [];
    return results.flat();
  }

  _processCSSCoverage(ruleUsageList: Protocol.CSS.RuleUsage[], stamp: number): CoverageInfo[] {
    if (!this._cssModel) {
      return [];
    }
    const updatedEntries = [];
    const rulesByStyleSheet = new Map<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, RangeUseCount[]>();
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
      const styleSheetHeader = entry[0] as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;
      const ranges = entry[1] as RangeUseCount[];
      const subentry = this._addCoverage(
          styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn,
          ranges, CoverageType.CSS, stamp);
      if (subentry) {
        updatedEntries.push(subentry);
      }
    }
    return updatedEntries;
  }

  static _convertToDisjointSegments(ranges: RangeUseCount[], stamp: number): CoverageSegment[] {
    ranges.sort((a, b) => a.startOffset - b.startOffset);

    const result: CoverageSegment[] = [];
    const stack = [];
    for (const entry of ranges) {
      let top: RangeUseCount = stack[stack.length - 1];
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

    function append(end: number, count: number): void {
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
      result.push({end: end, count: count, stamp: stamp});
    }

    return result;
  }

  _addStyleSheetToCSSCoverage(styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): void {
    this._addCoverage(
        styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn, [],
        CoverageType.CSS, Date.now());
  }

  _addCoverage(
      contentProvider: TextUtils.ContentProvider.ContentProvider, contentLength: number, startLine: number,
      startColumn: number, ranges: RangeUseCount[], type: CoverageType, stamp: number): CoverageInfo|null {
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
    const last = segments[segments.length - 1];
    if (last && last.end < contentLength) {
      segments.push({end: contentLength, stamp: stamp, count: 0});
    }
    const oldUsedSize = coverageInfo._usedSize;
    coverageInfo.mergeCoverage(segments);
    if (!isNewUrlCoverage && coverageInfo._usedSize === oldUsedSize) {
      return null;
    }
    urlCoverage._addToSizes(coverageInfo._usedSize - oldUsedSize, 0);
    return coverageInfo;
  }

  async exportReport(fos: Bindings.FileUtils.FileOutputStream): Promise<void> {
    const result: {url: string; ranges: {start: number; end: number;}[]; text: string | null;}[] = [];
    function locationCompare(a: string, b: string): number {
      const [aLine, aPos] = a.split(':');
      const [bLine, bPos] = b.split(':');
      return Number.parseInt(aLine, 10) - Number.parseInt(bLine, 10) ||
          Number.parseInt(aPos, 10) - Number.parseInt(bPos, 10);
    }
    const coverageByUrlKeys = Array.from(this._coverageByURL.keys()).sort();
    for (const urlInfoKey of coverageByUrlKeys) {
      const urlInfo = this._coverageByURL.get(urlInfoKey);
      if (!urlInfo) {
        continue;
      }
      const url = urlInfo.url();
      if (url.startsWith('extensions::') || url.startsWith('chrome-extension://')) {
        continue;
      }

      // For .html resources, multiple scripts share URL, but have different offsets.
      let useFullText = false;
      for (const info of urlInfo._coverageInfoByLocation.values()) {
        if (info._lineOffset || info._columnOffset) {
          useFullText = Boolean(url);
          break;
        }
      }

      let fullText: TextUtils.Text.Text|null = null;
      if (useFullText) {
        const resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(url);
        if (resource) {
          const content = (await resource.requestContent()).content;
          fullText = new TextUtils.Text.Text(content || '');
        }
      }

      const coverageByLocationKeys = Array.from(urlInfo._coverageInfoByLocation.keys()).sort(locationCompare);

      // We have full text for this resource, resolve the offsets using the text line endings.
      if (fullText) {
        const entry: {url: string; ranges: {start: number; end: number;}[];
                      text: string;} = {url, ranges: [], text: fullText.value()};
        for (const infoKey of coverageByLocationKeys) {
          const info = urlInfo._coverageInfoByLocation.get(infoKey);
          if (!info) {
            continue;
          }
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
        if (!info) {
          continue;
        }
        const entry: {url: string; ranges: {start: number; end: number;}[]; text: string |
                          null;} = {url, ranges: [], text: (await info.contentProvider().requestContent()).content};
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

export class URLCoverageInfo extends Common.ObjectWrapper.ObjectWrapper {
  _url: string;
  _coverageInfoByLocation: Map<string, CoverageInfo>;
  _size: number;
  _usedSize: number;
  _type!: CoverageType;
  _isContentScript: boolean;
  constructor(url: string) {
    super();

    this._url = url;
    this._coverageInfoByLocation = new Map();
    this._size = 0;
    this._usedSize = 0;
    this._isContentScript = false;
  }

  url(): string {
    return this._url;
  }

  type(): CoverageType {
    return this._type;
  }

  size(): number {
    return this._size;
  }

  usedSize(): number {
    return this._usedSize;
  }

  unusedSize(): number {
    return this._size - this._usedSize;
  }

  usedPercentage(): number {
    // Per convention, empty files are reported as 100 % uncovered
    if (this._size === 0) {
      return 0;
    }
    return this.usedSize() / this.size() * 100;
  }

  unusedPercentage(): number {
    // Per convention, empty files are reported as 100 % uncovered
    if (this._size === 0) {
      return 100;
    }
    return this.unusedSize() / this.size() * 100;
  }

  isContentScript(): boolean {
    return this._isContentScript;
  }

  entries(): IterableIterator<CoverageInfo> {
    return this._coverageInfoByLocation.values();
  }

  _addToSizes(usedSize: number, size: number): void {
    this._usedSize += usedSize;
    this._size += size;

    if (usedSize !== 0 || size !== 0) {
      this.dispatchEventToListeners(URLCoverageInfo.Events.SizesChanged);
    }
  }

  _ensureEntry(
      contentProvider: TextUtils.ContentProvider.ContentProvider, contentLength: number, lineOffset: number,
      columnOffset: number, type: CoverageType): CoverageInfo {
    const key = `${lineOffset}:${columnOffset}`;
    let entry = this._coverageInfoByLocation.get(key);

    if ((type & CoverageType.JavaScript) && !this._coverageInfoByLocation.size) {
      this._isContentScript = (contentProvider as SDK.Script.Script).isContentScript();
    }
    this._type |= type;

    if (entry) {
      entry._coverageType |= type;
      return entry;
    }

    if ((type & CoverageType.JavaScript) && !this._coverageInfoByLocation.size) {
      this._isContentScript = (contentProvider as SDK.Script.Script).isContentScript();
    }

    entry = new CoverageInfo(contentProvider, contentLength, lineOffset, columnOffset, type);
    this._coverageInfoByLocation.set(key, entry);
    this._addToSizes(0, contentLength);

    return entry;
  }

  static readonly Events = {
    SizesChanged: Symbol('SizesChanged'),
  };
}

export const mergeSegments = (segmentsA: CoverageSegment[], segmentsB: CoverageSegment[]): CoverageSegment[] => {
  const result: CoverageSegment[] = [];

  let indexA = 0;
  let indexB = 0;
  while (indexA < segmentsA.length && indexB < segmentsB.length) {
    const a = segmentsA[indexA];
    const b = segmentsB[indexB];
    const count = (a.count || 0) + (b.count || 0);
    const end = Math.min(a.end, b.end);
    const last = result[result.length - 1];
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
};

export class CoverageInfo {
  _contentProvider: TextUtils.ContentProvider.ContentProvider;
  _size: number;
  _usedSize: number;
  _statsByTimestamp: Map<number, number>;
  _lineOffset: number;
  _columnOffset: number;
  _coverageType: CoverageType;
  _segments: CoverageSegment[];
  constructor(
      contentProvider: TextUtils.ContentProvider.ContentProvider, size: number, lineOffset: number,
      columnOffset: number, type: CoverageType) {
    this._contentProvider = contentProvider;
    this._size = size;
    this._usedSize = 0;
    this._statsByTimestamp = new Map();
    this._lineOffset = lineOffset;
    this._columnOffset = columnOffset;
    this._coverageType = type;

    this._segments = [];
  }

  contentProvider(): TextUtils.ContentProvider.ContentProvider {
    return this._contentProvider;
  }

  url(): string {
    return this._contentProvider.contentURL();
  }

  type(): CoverageType {
    return this._coverageType;
  }

  mergeCoverage(segments: CoverageSegment[]): void {
    this._segments = mergeSegments(this._segments, segments);
    this._updateStats();
  }

  usedByTimestamp(): Map<number, number> {
    return this._statsByTimestamp;
  }

  size(): number {
    return this._size;
  }

  usageForRange(start: number, end: number): boolean {
    let index =
        Platform.ArrayUtilities.upperBound(this._segments, start, (position, segment) => position - segment.end);
    for (; index < this._segments.length && this._segments[index].end < end; ++index) {
      if (this._segments[index].count) {
        return true;
      }
    }
    return index < this._segments.length && Boolean(this._segments[index].count);
  }
  _updateStats(): void {
    this._statsByTimestamp = new Map();
    this._usedSize = 0;

    let last = 0;
    for (const segment of this._segments) {
      let previousCount = this._statsByTimestamp.get(segment.stamp);
      if (previousCount === undefined) {
        previousCount = 0;
      }

      if (segment.count) {
        const used = segment.end - last;
        this._usedSize += used;
        this._statsByTimestamp.set(segment.stamp, previousCount + used);
      }
      last = segment.end;
    }
  }
}
export interface RangeUseCount {
  startOffset: number;
  endOffset: number;
  count: number;
}
export interface CoverageSegment {
  end: number;
  count: number;
  stamp: number;
}
