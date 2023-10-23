// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Bindings from '../../models/bindings/bindings.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';

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

export type EventTypes = {
  [Events.CoverageUpdated]: CoverageInfo[],
  [Events.CoverageReset]: void,
};

const COVERAGE_POLLING_PERIOD_MS: number = 200;

interface BacklogItem<T> {
  rawCoverageData: Array<T>;
  stamp: number;
}

export class CoverageModel extends SDK.SDKModel.SDKModel<EventTypes> {
  private cpuProfilerModel: SDK.CPUProfilerModel.CPUProfilerModel|null;
  private cssModel: SDK.CSSModel.CSSModel|null;
  private debuggerModel: SDK.DebuggerModel.DebuggerModel|null;
  private coverageByURL: Map<Platform.DevToolsPath.UrlString, URLCoverageInfo>;
  private coverageByContentProvider: Map<TextUtils.ContentProvider.ContentProvider, CoverageInfo>;
  private coverageUpdateTimes: Set<number>;
  private suspensionState: SuspensionState;
  private pollTimer: number|null;
  private currentPollPromise: Promise<void>|null;
  private shouldResumePollingOnResume: boolean|null;
  private jsBacklog: BacklogItem<Protocol.Profiler.ScriptCoverage>[];
  private cssBacklog: BacklogItem<Protocol.CSS.RuleUsage>[];
  private performanceTraceRecording: boolean|null;

  constructor(target: SDK.Target.Target) {
    super(target);
    this.cpuProfilerModel = target.model(SDK.CPUProfilerModel.CPUProfilerModel);
    this.cssModel = target.model(SDK.CSSModel.CSSModel);
    this.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);

    this.coverageByURL = new Map();
    this.coverageByContentProvider = new Map();

    // We keep track of the update times, because the other data-structures don't change if an
    // update doesn't change the coverage. Some visualizations want to convey to the user that
    // an update was received at a certain time, but did not result in a coverage change.
    this.coverageUpdateTimes = new Set();

    this.suspensionState = SuspensionState.Active;
    this.pollTimer = null;
    this.currentPollPromise = null;
    this.shouldResumePollingOnResume = false;
    this.jsBacklog = [];
    this.cssBacklog = [];
    this.performanceTraceRecording = false;
  }

  async start(jsCoveragePerBlock: boolean): Promise<boolean> {
    if (this.suspensionState !== SuspensionState.Active) {
      throw Error('Cannot start CoverageModel while it is not active.');
    }
    const promises = [];
    if (this.cssModel) {
      // Note there's no JS coverage since JS won't ever return
      // coverage twice, even after it's restarted.
      this.clearCSS();

      this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.handleStyleSheetAdded, this);
      promises.push(this.cssModel.startCoverage());
    }
    if (this.cpuProfilerModel) {
      promises.push(
          this.cpuProfilerModel.startPreciseCoverage(jsCoveragePerBlock, this.preciseCoverageDeltaUpdate.bind(this)));
    }

    await Promise.all(promises);
    return Boolean(this.cssModel || this.cpuProfilerModel);
  }

  async preciseCoverageDeltaUpdate(
      timestamp: number, occasion: string, coverageData: Protocol.Profiler.ScriptCoverage[]): Promise<void> {
    this.coverageUpdateTimes.add(timestamp);
    const result = await this.backlogOrProcessJSCoverage(coverageData, timestamp);
    if (result.length) {
      this.dispatchEventToListeners(Events.CoverageUpdated, result);
    }
  }

  async stop(): Promise<void> {
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

  reset(): void {
    this.coverageByURL = new Map();
    this.coverageByContentProvider = new Map();
    this.coverageUpdateTimes = new Set();
    this.dispatchEventToListeners(Events.CoverageReset);
  }

  async startPolling(): Promise<void> {
    if (this.currentPollPromise || this.suspensionState !== SuspensionState.Active) {
      return;
    }
    await this.pollLoop();
  }

  private async pollLoop(): Promise<void> {
    this.clearTimer();
    this.currentPollPromise = this.pollAndCallback();
    await this.currentPollPromise;
    if (this.suspensionState === SuspensionState.Active || this.performanceTraceRecording) {
      this.pollTimer = window.setTimeout(() => this.pollLoop(), COVERAGE_POLLING_PERIOD_MS);
    }
  }

  async stopPolling(): Promise<void> {
    this.clearTimer();
    await this.currentPollPromise;
    this.currentPollPromise = null;
    // Do one last poll to get the final data.
    await this.pollAndCallback();
  }

  private async pollAndCallback(): Promise<void> {
    if (this.suspensionState === SuspensionState.Suspended && !this.performanceTraceRecording) {
      return;
    }
    const updates = await this.takeAllCoverage();
    // This conditional should never trigger, as all intended ways to stop
    // polling are awaiting the `_currentPollPromise` before suspending.
    console.assert(
        this.suspensionState !== SuspensionState.Suspended || Boolean(this.performanceTraceRecording),
        'CoverageModel was suspended while polling.');
    if (updates.length) {
      this.dispatchEventToListeners(Events.CoverageUpdated, updates);
    }
  }

  private clearTimer(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Stops polling as preparation for suspension. This function is idempotent
   * due because it changes the state to suspending.
   */
  override async preSuspendModel(reason?: string): Promise<void> {
    if (this.suspensionState !== SuspensionState.Active) {
      return;
    }
    this.suspensionState = SuspensionState.Suspending;
    if (reason === 'performance-timeline') {
      this.performanceTraceRecording = true;
      // Keep polling to the backlog if a performance trace is recorded.
      return;
    }
    if (this.currentPollPromise) {
      await this.stopPolling();
      this.shouldResumePollingOnResume = true;
    }
  }

  override async suspendModel(_reason?: string): Promise<void> {
    this.suspensionState = SuspensionState.Suspended;
  }

  override async resumeModel(): Promise<void> {
  }

  /**
   * Restarts polling after suspension. Note that the function is idempotent
   * because starting polling is idempotent.
   */
  override async postResumeModel(): Promise<void> {
    this.suspensionState = SuspensionState.Active;
    this.performanceTraceRecording = false;
    if (this.shouldResumePollingOnResume) {
      this.shouldResumePollingOnResume = false;
      await this.startPolling();
    }
  }

  entries(): URLCoverageInfo[] {
    return Array.from(this.coverageByURL.values());
  }

  getCoverageForUrl(url: Platform.DevToolsPath.UrlString): URLCoverageInfo|null {
    return this.coverageByURL.get(url) || null;
  }

  usageForRange(contentProvider: TextUtils.ContentProvider.ContentProvider, startOffset: number, endOffset: number):
      boolean|undefined {
    const coverageInfo = this.coverageByContentProvider.get(contentProvider);
    return coverageInfo && coverageInfo.usageForRange(startOffset, endOffset);
  }

  private clearCSS(): void {
    for (const entry of this.coverageByContentProvider.values()) {
      if (entry.type() !== CoverageType.CSS) {
        continue;
      }
      const contentProvider = entry.getContentProvider() as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;
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

  private async takeAllCoverage(): Promise<CoverageInfo[]> {
    const [updatesCSS, updatesJS] = await Promise.all([this.takeCSSCoverage(), this.takeJSCoverage()]);
    return [...updatesCSS, ...updatesJS];
  }

  private async takeJSCoverage(): Promise<CoverageInfo[]> {
    if (!this.cpuProfilerModel) {
      return [];
    }
    const {coverage, timestamp} = await this.cpuProfilerModel.takePreciseCoverage();
    this.coverageUpdateTimes.add(timestamp);
    return this.backlogOrProcessJSCoverage(coverage, timestamp);
  }

  getCoverageUpdateTimes(): Set<number> {
    return this.coverageUpdateTimes;
  }

  private async backlogOrProcessJSCoverage(
      freshRawCoverageData: Protocol.Profiler.ScriptCoverage[], freshTimestamp: number): Promise<CoverageInfo[]> {
    if (freshRawCoverageData.length > 0) {
      this.jsBacklog.push({rawCoverageData: freshRawCoverageData, stamp: freshTimestamp});
    }
    if (this.suspensionState !== SuspensionState.Active) {
      return [];
    }
    const ascendingByTimestamp = (x: {stamp: number}, y: {stamp: number}): number => x.stamp - y.stamp;
    const results = [];
    for (const {rawCoverageData, stamp} of this.jsBacklog.sort(ascendingByTimestamp)) {
      results.push(this.processJSCoverage(rawCoverageData, stamp));
    }
    this.jsBacklog = [];
    return results.flat();
  }

  async processJSBacklog(): Promise<void> {
    void this.backlogOrProcessJSCoverage([], 0);
  }

  private processJSCoverage(scriptsCoverage: Protocol.Profiler.ScriptCoverage[], stamp: number): CoverageInfo[] {
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
      const subentry = this.addCoverage(
          script, script.contentLength, script.lineOffset, script.columnOffset, ranges, type as CoverageType, stamp);
      if (subentry) {
        updatedEntries.push(subentry);
      }
    }
    return updatedEntries;
  }

  private handleStyleSheetAdded(
      event: Common.EventTarget.EventTargetEvent<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>): void {
    this.addStyleSheetToCSSCoverage(event.data);
  }

  private async takeCSSCoverage(): Promise<CoverageInfo[]> {
    // Don't poll if we have no model, or are suspended.
    if (!this.cssModel || this.suspensionState !== SuspensionState.Active) {
      return [];
    }
    const {coverage, timestamp} = await this.cssModel.takeCoverageDelta();
    this.coverageUpdateTimes.add(timestamp);
    return this.backlogOrProcessCSSCoverage(coverage, timestamp);
  }

  private async backlogOrProcessCSSCoverage(freshRawCoverageData: Protocol.CSS.RuleUsage[], freshTimestamp: number):
      Promise<CoverageInfo[]> {
    if (freshRawCoverageData.length > 0) {
      this.cssBacklog.push({rawCoverageData: freshRawCoverageData, stamp: freshTimestamp});
    }
    if (this.suspensionState !== SuspensionState.Active) {
      return [];
    }
    const ascendingByTimestamp = (x: {stamp: number}, y: {stamp: number}): number => x.stamp - y.stamp;
    const results = [];
    for (const {rawCoverageData, stamp} of this.cssBacklog.sort(ascendingByTimestamp)) {
      results.push(this.processCSSCoverage(rawCoverageData, stamp));
    }
    this.cssBacklog = [];
    return results.flat();
  }

  private processCSSCoverage(ruleUsageList: Protocol.CSS.RuleUsage[], stamp: number): CoverageInfo[] {
    if (!this.cssModel) {
      return [];
    }
    const updatedEntries = [];
    const rulesByStyleSheet = new Map<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, RangeUseCount[]>();
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
      ranges.push({startOffset: rule.startOffset, endOffset: rule.endOffset, count: Number(rule.used)});
    }
    for (const entry of rulesByStyleSheet) {
      const styleSheetHeader = entry[0] as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;
      const ranges = entry[1] as RangeUseCount[];
      const subentry = this.addCoverage(
          styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn,
          ranges, CoverageType.CSS, stamp);
      if (subentry) {
        updatedEntries.push(subentry);
      }
    }
    return updatedEntries;
  }

  private static convertToDisjointSegments(ranges: RangeUseCount[], stamp: number): CoverageSegment[] {
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

  private addStyleSheetToCSSCoverage(styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): void {
    this.addCoverage(
        styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn, [],
        CoverageType.CSS, Date.now());
  }

  private addCoverage(
      contentProvider: TextUtils.ContentProvider.ContentProvider, contentLength: number, startLine: number,
      startColumn: number, ranges: RangeUseCount[], type: CoverageType, stamp: number): CoverageInfo|null {
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
    }

    const coverageInfo = urlCoverage.ensureEntry(contentProvider, contentLength, startLine, startColumn, type);
    this.coverageByContentProvider.set(contentProvider, coverageInfo);
    const segments = CoverageModel.convertToDisjointSegments(ranges, stamp);
    const last = segments[segments.length - 1];
    if (last && last.end < contentLength) {
      segments.push({end: contentLength, stamp: stamp, count: 0});
    }
    const usedSizeDelta = coverageInfo.mergeCoverage(segments);
    if (!isNewUrlCoverage && usedSizeDelta === 0) {
      return null;
    }
    urlCoverage.addToSizes(usedSizeDelta, 0);
    return coverageInfo;
  }

  async exportReport(fos: Bindings.FileUtils.FileOutputStream): Promise<void> {
    const result: {url: string, ranges: {start: number, end: number}[], text: string|null}[] = [];
    const coverageByUrlKeys = Array.from(this.coverageByURL.keys()).sort();
    for (const urlInfoKey of coverageByUrlKeys) {
      const urlInfo = this.coverageByURL.get(urlInfoKey);
      if (!urlInfo) {
        continue;
      }
      const url = urlInfo.url();
      if (url.startsWith('extensions::') || url.startsWith('chrome-extension://')) {
        continue;
      }
      result.push(...await urlInfo.entriesForExport());
    }
    await fos.write(JSON.stringify(result, undefined, 2));
    void fos.close();
  }
}

SDK.SDKModel.SDKModel.register(CoverageModel, {capabilities: SDK.Target.Capability.None, autostart: false});

export interface EntryForExport {
  url: Platform.DevToolsPath.UrlString;
  ranges: {start: number, end: number}[];
  text: string|null;
}

function locationCompare(a: string, b: string): number {
  const [aLine, aPos] = a.split(':');
  const [bLine, bPos] = b.split(':');
  return Number.parseInt(aLine, 10) - Number.parseInt(bLine, 10) ||
      Number.parseInt(aPos, 10) - Number.parseInt(bPos, 10);
}

export class URLCoverageInfo extends Common.ObjectWrapper.ObjectWrapper<URLCoverageInfo.EventTypes> {
  private readonly urlInternal: Platform.DevToolsPath.UrlString;
  private coverageInfoByLocation: Map<string, CoverageInfo>;
  private sizeInternal: number;
  private usedSizeInternal: number;
  private typeInternal!: CoverageType;
  private isContentScriptInternal: boolean;

  constructor(url: Platform.DevToolsPath.UrlString) {
    super();

    this.urlInternal = url;
    this.coverageInfoByLocation = new Map();
    this.sizeInternal = 0;
    this.usedSizeInternal = 0;
    this.isContentScriptInternal = false;
  }

  url(): Platform.DevToolsPath.UrlString {
    return this.urlInternal;
  }

  type(): CoverageType {
    return this.typeInternal;
  }

  size(): number {
    return this.sizeInternal;
  }

  usedSize(): number {
    return this.usedSizeInternal;
  }

  unusedSize(): number {
    return this.sizeInternal - this.usedSizeInternal;
  }

  usedPercentage(): number {
    // Per convention, empty files are reported as 100 % uncovered
    if (this.sizeInternal === 0) {
      return 0;
    }
    return this.usedSize() / this.size();
  }

  unusedPercentage(): number {
    // Per convention, empty files are reported as 100 % uncovered
    if (this.sizeInternal === 0) {
      return 100;
    }
    return this.unusedSize() / this.size();
  }

  isContentScript(): boolean {
    return this.isContentScriptInternal;
  }

  entries(): IterableIterator<CoverageInfo> {
    return this.coverageInfoByLocation.values();
  }

  numberOfEntries(): number {
    return this.coverageInfoByLocation.size;
  }

  removeCoverageEntry(key: string, entry: CoverageInfo): void {
    if (!this.coverageInfoByLocation.delete(key)) {
      return;
    }
    this.addToSizes(-entry.getUsedSize(), -entry.getSize());
  }

  addToSizes(usedSize: number, size: number): void {
    this.usedSizeInternal += usedSize;
    this.sizeInternal += size;

    if (usedSize !== 0 || size !== 0) {
      this.dispatchEventToListeners(URLCoverageInfo.Events.SizesChanged);
    }
  }

  ensureEntry(
      contentProvider: TextUtils.ContentProvider.ContentProvider, contentLength: number, lineOffset: number,
      columnOffset: number, type: CoverageType): CoverageInfo {
    const key = `${lineOffset}:${columnOffset}`;
    let entry = this.coverageInfoByLocation.get(key);

    if ((type & CoverageType.JavaScript) && !this.coverageInfoByLocation.size) {
      this.isContentScriptInternal = (contentProvider as SDK.Script.Script).isContentScript();
    }
    this.typeInternal |= type;

    if (entry) {
      entry.addCoverageType(type);
      return entry;
    }

    if ((type & CoverageType.JavaScript) && !this.coverageInfoByLocation.size) {
      this.isContentScriptInternal = (contentProvider as SDK.Script.Script).isContentScript();
    }

    entry = new CoverageInfo(contentProvider, contentLength, lineOffset, columnOffset, type);
    this.coverageInfoByLocation.set(key, entry);
    this.addToSizes(0, contentLength);

    return entry;
  }

  async getFullText(): Promise<TextUtils.Text.Text|null> {
    // For .html resources, multiple scripts share URL, but have different offsets.
    let useFullText = false;
    const url = this.url();
    for (const info of this.coverageInfoByLocation.values()) {
      const {lineOffset, columnOffset} = info.getOffsets();
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
    const content = (await resource.requestContent()).content;
    return new TextUtils.Text.Text(content || '');
  }

  entriesForExportBasedOnFullText(fullText: TextUtils.Text.Text): EntryForExport {
    const coverageByLocationKeys = Array.from(this.coverageInfoByLocation.keys()).sort(locationCompare);
    const entry: EntryForExport = {url: this.url(), ranges: [], text: fullText.value()};
    for (const infoKey of coverageByLocationKeys) {
      const info = this.coverageInfoByLocation.get(infoKey);
      if (!info) {
        continue;
      }
      const {lineOffset, columnOffset} = info.getOffsets();
      const offset = fullText ? fullText.offsetFromPosition(lineOffset, columnOffset) : 0;
      entry.ranges.push(...info.rangesForExport(offset));
    }
    return entry;
  }

  async entriesForExportBasedOnContent(): Promise<EntryForExport[]> {
    const coverageByLocationKeys = Array.from(this.coverageInfoByLocation.keys()).sort(locationCompare);
    const result = [];
    for (const infoKey of coverageByLocationKeys) {
      const info = this.coverageInfoByLocation.get(infoKey);
      if (!info) {
        continue;
      }
      const entry: EntryForExport = {
        url: this.url(),
        ranges: info.rangesForExport(),
        text: (await info.getContentProvider().requestContent()).content,
      };
      result.push(entry);
    }
    return result;
  }

  async entriesForExport(): Promise<EntryForExport[]> {
    const fullText = await this.getFullText();

    // We have full text for this resource, resolve the offsets using the text line endings.
    if (fullText) {
      return [await this.entriesForExportBasedOnFullText(fullText)];
    }

    // Fall back to the per-script operation.
    return this.entriesForExportBasedOnContent();
  }
}

export namespace URLCoverageInfo {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Events {
    SizesChanged = 'SizesChanged',
  }

  export type EventTypes = {
    [Events.SizesChanged]: void,
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
  private contentProvider: TextUtils.ContentProvider.ContentProvider;
  private size: number;
  private usedSize: number;
  private statsByTimestamp: Map<number, number>;
  private lineOffset: number;
  private columnOffset: number;
  private coverageType: CoverageType;
  private segments: CoverageSegment[];

  constructor(
      contentProvider: TextUtils.ContentProvider.ContentProvider, size: number, lineOffset: number,
      columnOffset: number, type: CoverageType) {
    this.contentProvider = contentProvider;
    this.size = size;
    this.usedSize = 0;
    this.statsByTimestamp = new Map();
    this.lineOffset = lineOffset;
    this.columnOffset = columnOffset;
    this.coverageType = type;

    this.segments = [];
  }

  getContentProvider(): TextUtils.ContentProvider.ContentProvider {
    return this.contentProvider;
  }

  url(): Platform.DevToolsPath.UrlString {
    return this.contentProvider.contentURL();
  }

  type(): CoverageType {
    return this.coverageType;
  }

  addCoverageType(type: CoverageType): void {
    this.coverageType |= type;
  }

  getOffsets(): {lineOffset: number, columnOffset: number} {
    return {lineOffset: this.lineOffset, columnOffset: this.columnOffset};
  }

  /**
   * Returns the delta by which usedSize increased.
   */
  mergeCoverage(segments: CoverageSegment[]): number {
    const oldUsedSize = this.usedSize;
    this.segments = mergeSegments(this.segments, segments);
    this.updateStats();
    return this.usedSize - oldUsedSize;
  }

  usedByTimestamp(): Map<number, number> {
    return this.statsByTimestamp;
  }

  getSize(): number {
    return this.size;
  }

  getUsedSize(): number {
    return this.usedSize;
  }

  usageForRange(start: number, end: number): boolean {
    let index = Platform.ArrayUtilities.upperBound(this.segments, start, (position, segment) => position - segment.end);
    for (; index < this.segments.length && this.segments[index].end < end; ++index) {
      if (this.segments[index].count) {
        return true;
      }
    }
    return index < this.segments.length && Boolean(this.segments[index].count);
  }

  private updateStats(): void {
    this.statsByTimestamp = new Map();
    this.usedSize = 0;

    let last = 0;
    for (const segment of this.segments) {
      let previousCount = this.statsByTimestamp.get(segment.stamp);
      if (previousCount === undefined) {
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

  rangesForExport(offset: number = 0): {start: number, end: number}[] {
    const ranges = [];
    let start = 0;
    for (const segment of this.segments) {
      if (segment.count) {
        const last = ranges.length > 0 ? ranges[ranges.length - 1] : null;
        if (last && last.end === start + offset) {
          // We can extend the last segment.
          last.end = segment.end + offset;
        } else {
          // There was a gap, add a new segment.
          ranges.push({start: start + offset, end: segment.end + offset});
        }
      }
      start = segment.end;
    }
    return ranges;
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
