// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["CoverageUpdated"] = "CoverageUpdated";
    Events["CoverageReset"] = "CoverageReset";
    Events["SourceMapResolved"] = "SourceMapResolved";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
const COVERAGE_POLLING_PERIOD_MS = 200;
const RESOLVE_SOURCEMAP_TIMEOUT = 500;
export class CoverageModel extends SDK.SDKModel.SDKModel {
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
        this.coverageByURL = new Map();
        this.coverageByContentProvider = new Map();
        // We keep track of the update times, because the other data-structures don't change if an
        // update doesn't change the coverage. Some visualizations want to convey to the user that
        // an update was received at a certain time, but did not result in a coverage change.
        this.coverageUpdateTimes = new Set();
        this.suspensionState = "Active" /* SuspensionState.ACTIVE */;
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
        if (this.suspensionState !== "Active" /* SuspensionState.ACTIVE */) {
            throw new Error('Cannot start CoverageModel while it is not active.');
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
        // reset the backlog once we start processing it
        const currentBacklog = this.processSourceMapBacklog;
        this.processSourceMapBacklog = [];
        await Promise.all(currentBacklog.map(({ script, sourceMap }) => this.resolveSourceMap(script, sourceMap)));
        this.dispatchEventToListeners(Events.SourceMapResolved);
    }
    async resolveSourceMap(script, sourceMap) {
        const url = script.sourceURL;
        const urlCoverage = this.coverageByURL.get(url);
        if (!urlCoverage) {
            // The urlCoverage has not been created yet, so no need to update it.
            return;
        }
        // If the urlCoverage is there, but no sourceURLCoverageInfo have been added,
        // it means the source map is attached after the URLCoverage is created.
        // So now we need to create the sourceURLCoverageInfo and add it to the urlCoverage.
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
        this.coverageByURL = new Map();
        this.coverageByContentProvider = new Map();
        this.coverageUpdateTimes = new Set();
        this.dispatchEventToListeners(Events.CoverageReset);
    }
    async startPolling() {
        if (this.currentPollPromise || this.suspensionState !== "Active" /* SuspensionState.ACTIVE */) {
            return;
        }
        await this.pollLoop();
    }
    async pollLoop() {
        this.clearTimer();
        this.currentPollPromise = this.pollAndCallback();
        await this.currentPollPromise;
        if (this.suspensionState === "Active" /* SuspensionState.ACTIVE */ || this.performanceTraceRecording) {
            this.pollTimer = window.setTimeout(() => this.pollLoop(), COVERAGE_POLLING_PERIOD_MS);
        }
    }
    async stopPolling() {
        this.clearTimer();
        await this.currentPollPromise;
        this.currentPollPromise = null;
        // Do one last poll to get the final data.
        await this.pollAndCallback();
    }
    async pollAndCallback() {
        if (this.suspensionState === "Suspended" /* SuspensionState.SUSPENDED */ && !this.performanceTraceRecording) {
            return;
        }
        const updates = await this.takeAllCoverage();
        // This conditional should never trigger, as all intended ways to stop
        // polling are awaiting the `_currentPollPromise` before suspending.
        console.assert(this.suspensionState !== "Suspended" /* SuspensionState.SUSPENDED */ || Boolean(this.performanceTraceRecording), 'CoverageModel was suspended while polling.');
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
        if (this.suspensionState !== "Active" /* SuspensionState.ACTIVE */) {
            return;
        }
        this.suspensionState = "Suspending" /* SuspensionState.SUSPENDING */;
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
    async suspendModel(_reason) {
        this.suspensionState = "Suspended" /* SuspensionState.SUSPENDED */;
    }
    async resumeModel() {
    }
    /**
     * Restarts polling after suspension. Note that the function is idempotent
     * because starting polling is idempotent.
     */
    async postResumeModel() {
        this.suspensionState = "Active" /* SuspensionState.ACTIVE */;
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
            if (entry.type() !== 1 /* CoverageType.CSS */) {
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
        if (this.suspensionState !== "Active" /* SuspensionState.ACTIVE */) {
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
            let type = 2 /* CoverageType.JAVA_SCRIPT */;
            for (const func of entry.functions) {
                // Do not coerce undefined to false, i.e. only consider blockLevel to be false
                // if back-end explicitly provides blockLevel field, otherwise presume blockLevel
                // coverage is not available. Also, ignore non-block level functions that weren't
                // ever called.
                if (func.isBlockCoverage === false && !(func.ranges.length === 1 && !func.ranges[0].count)) {
                    type |= 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */;
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
        // Don't poll if we have no model, or are suspended.
        if (!this.cssModel || this.suspensionState !== "Active" /* SuspensionState.ACTIVE */) {
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
        if (this.suspensionState !== "Active" /* SuspensionState.ACTIVE */) {
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
        const rulesByStyleSheet = new Map();
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
            const subentry = await this.addCoverage(styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn, ranges, 1 /* CoverageType.CSS */, stamp);
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
        void this.addCoverage(styleSheetHeader, styleSheetHeader.contentLength, styleSheetHeader.startLine, styleSheetHeader.startColumn, [], 1 /* CoverageType.CSS */, Date.now());
    }
    calculateSizeForSources(sourceMap, text, contentLength) {
        // Map shows the size of source files contributed to the size in the generated file. For example:
        // Map(3) {url1 => 593, url2 => 232, url3 => 52}
        // This means in there are 593 bytes in the generated file are contributed by url1, and so on.
        const sourceSizeMap = new Map();
        // Continuous segments shows that which source file contribute to the generated file segment. For example:
        // [{end: 84, sourceUrl: ''}, {end: 593, sourceUrl: url1}, {end: 781, sourceUrl: url2}, {end: 833, sourceUrl: url3}, {end: 881, sourceUrl: url1}]
        // This means that the first 84 bytes in the generated file are not contributed by any source file, the next 593 bytes are contributed by url1, and so on.
        const sourceSegments = [];
        const calculateSize = function (startLine, startCol, endLine, endCol) {
            if (startLine === endLine) {
                return endCol - startCol;
            }
            if (text) {
                // If we hit the line break, we need to use offset to calculate size
                const startOffset = text.offsetFromPosition(startLine, startCol);
                const endOffset = text.offsetFromPosition(endLine, endCol);
                return endOffset - startOffset;
            }
            // If for some reason we don't have the text, we can only use col number to calculate size
            return endCol;
        };
        const mappings = sourceMap.mappings();
        if (mappings.length === 0) {
            return [sourceSizeMap, sourceSegments];
        }
        // calculate the segment before the first entry
        let lastEntry = mappings[0];
        let totalSegmentSize = 0;
        if (text) {
            totalSegmentSize += text.offsetFromPosition(lastEntry.lineNumber, lastEntry.columnNumber);
        }
        else {
            totalSegmentSize += calculateSize(0, 0, lastEntry.lineNumber, lastEntry.columnNumber);
        }
        sourceSegments.push({ end: totalSegmentSize, sourceUrl: '' });
        for (let i = 0; i < mappings.length; i++) {
            const curEntry = mappings[i];
            const entryRange = sourceMap.findEntryRanges(curEntry.lineNumber, curEntry.columnNumber);
            if (entryRange) {
                // calculate the size
                const range = entryRange.range;
                const sourceURL = entryRange.sourceURL;
                const oldSize = sourceSizeMap.get(sourceURL) || 0;
                let size = 0;
                if (i === mappings.length - 1) {
                    const startOffset = text.offsetFromPosition(range.startLine, range.startColumn);
                    size = contentLength - startOffset;
                }
                else {
                    size = calculateSize(range.startLine, range.startColumn, range.endLine, range.endColumn);
                }
                sourceSizeMap.set(sourceURL, oldSize + size);
            }
            // calculate the segment
            const segmentSize = calculateSize(lastEntry.lineNumber, lastEntry.columnNumber, curEntry.lineNumber, curEntry.columnNumber);
            totalSegmentSize += segmentSize;
            if (curEntry.sourceURL !== lastEntry.sourceURL) {
                if (text) {
                    const endOffsetForLastEntry = text.offsetFromPosition(curEntry.lineNumber, curEntry.columnNumber);
                    sourceSegments.push({ end: endOffsetForLastEntry, sourceUrl: lastEntry.sourceURL || '' });
                }
                else {
                    sourceSegments.push({ end: totalSegmentSize, sourceUrl: lastEntry.sourceURL || '' });
                }
            }
            lastEntry = curEntry;
            // add the last segment if we are at the last entry
            if (i === mappings.length - 1) {
                sourceSegments.push({ end: contentLength, sourceUrl: curEntry.sourceURL || '' });
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
            // If the script has source map, we need to create the sourceURLCoverageInfo for each source file.
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
        const segments = CoverageModel.convertToDisjointSegments(ranges, stamp);
        const last = segments[segments.length - 1];
        if (last && last.end < contentLength) {
            segments.push({ end: contentLength, stamp, count: 0 });
        }
        const usedSizeDelta = coverageInfo.mergeCoverage(segments);
        if (!isNewUrlCoverage && usedSizeDelta === 0) {
            return null;
        }
        urlCoverage.addToSizes(usedSizeDelta, 0);
        // go through the sources that have size changes.
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
            if (url.startsWith('extensions::') || Common.ParsedURL.schemeIs(url, 'chrome-extension:')) {
                continue;
            }
            result.push(...await urlInfo.entriesForExport());
        }
        await fos.write(JSON.stringify(result, undefined, 2));
        void fos.close();
    }
}
SDK.SDKModel.SDKModel.register(CoverageModel, { capabilities: 0 /* SDK.Target.Capability.NONE */, autostart: false });
function locationCompare(a, b) {
    const [aLine, aPos] = a.split(':');
    const [bLine, bPos] = b.split(':');
    return Number.parseInt(aLine, 10) - Number.parseInt(bLine, 10) ||
        Number.parseInt(aPos, 10) - Number.parseInt(bPos, 10);
}
export class URLCoverageInfo extends Common.ObjectWrapper.ObjectWrapper {
    #url;
    coverageInfoByLocation;
    #size;
    #usedSize;
    #type;
    #isContentScript;
    sourcesURLCoverageInfo = new Map();
    sourceSegments;
    constructor(url) {
        super();
        this.#url = url;
        this.coverageInfoByLocation = new Map();
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
        // Per convention, empty files are reported as 100 % uncovered
        if (this.#size === 0) {
            return 0;
        }
        if (!this.unusedSize() || !this.size()) {
            return 0;
        }
        return this.usedSize() / this.size();
    }
    unusedPercentage() {
        // Per convention, empty files are reported as 100 % uncovered
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
            this.dispatchEventToListeners(URLCoverageInfo.Events.SizesChanged);
        }
    }
    setSourceSegments(segments) {
        this.sourceSegments = segments;
    }
    ensureEntry(contentProvider, contentLength, lineOffset, columnOffset, type) {
        const key = `${lineOffset}:${columnOffset}`;
        let entry = this.coverageInfoByLocation.get(key);
        if ((type & 2 /* CoverageType.JAVA_SCRIPT */) && !this.coverageInfoByLocation.size &&
            contentProvider instanceof SDK.Script.Script) {
            this.#isContentScript = (contentProvider).isContentScript();
        }
        this.#type |= type;
        if (entry) {
            entry.addCoverageType(type);
            return entry;
        }
        if ((type & 2 /* CoverageType.JAVA_SCRIPT */) && !this.coverageInfoByLocation.size &&
            contentProvider instanceof SDK.Script.Script) {
            this.#isContentScript = (contentProvider).isContentScript();
        }
        entry = new CoverageInfo(contentProvider, contentLength, lineOffset, columnOffset, type, this);
        this.coverageInfoByLocation.set(key, entry);
        this.addToSizes(0, contentLength);
        return entry;
    }
    async getFullText() {
        // For .html resources, multiple scripts share URL, but have different offsets.
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
                text: TextUtils.ContentData.ContentData.textOr(await info.getContentProvider().requestContentData(), null),
            };
            result.push(entry);
        }
        return result;
    }
    async entriesForExport() {
        const fullText = await this.getFullText();
        // We have full text for this resource, resolve the offsets using the text line endings.
        if (fullText) {
            return [await this.entriesForExportBasedOnFullText(fullText)];
        }
        // Fall back to the per-script operation.
        return await this.entriesForExportBasedOnContent();
    }
}
export class SourceURLCoverageInfo extends URLCoverageInfo {
    generatedURLCoverageInfo;
    lastSourceUsedRange = [];
    constructor(sourceUrl, generatedUrlCoverage) {
        super(sourceUrl);
        this.generatedURLCoverageInfo = generatedUrlCoverage;
    }
}
(function (URLCoverageInfo) {
    let Events;
    (function (Events) {
        /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
        Events["SizesChanged"] = "SizesChanged";
        /* eslint-enable @typescript-eslint/naming-convention */
    })(Events = URLCoverageInfo.Events || (URLCoverageInfo.Events = {}));
})(URLCoverageInfo || (URLCoverageInfo = {}));
export const mergeSegments = (segmentsA, segmentsB) => {
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
        if (!last || last.count !== count || last.stamp !== stamp) {
            result.push({ end, count, stamp });
        }
        else {
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
    contentProvider;
    size;
    usedSize;
    statsByTimestamp;
    lineOffset;
    columnOffset;
    coverageType;
    segments;
    generatedUrlCoverageInfo;
    sourceUsedSizeMap = new Map();
    sourceDeltaMap = new Map();
    sourceUsedRangeMap = new Map();
    constructor(contentProvider, size, lineOffset, columnOffset, type, generatedUrlCoverageInfo) {
        this.contentProvider = contentProvider;
        this.size = size;
        this.usedSize = 0;
        this.statsByTimestamp = new Map();
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
    updateSourceCoverage() {
        const sourceCoverage = new Map();
        this.sourceDeltaMap = new Map();
        this.sourceUsedRangeMap = new Map();
        const ranges = this.generatedUrlCoverageInfo.sourceSegments || [];
        let segmentStart = 0;
        let lastFoundRange = 0;
        for (const segment of this.segments) {
            const segmentEnd = segment.end;
            if (segment.count) {
                for (let i = lastFoundRange; i < ranges.length; i++) {
                    // Calculate the start point of the current range.
                    // If it's the first range, the start point is 0,
                    // otherwise, it's one more than the end point of the previous range.
                    const rangeStart = i === 0 ? 0 : ranges[i - 1].end + 1;
                    const rangeEnd = ranges[i].end;
                    // Calculate the start and end points of the overlap between the current segment and range
                    const overlapStart = Math.max(segmentStart, rangeStart);
                    const overlapEnd = Math.min(segmentEnd, rangeEnd);
                    // If there's an overlap (start point is less than or equal to end point)
                    if (overlapStart <= overlapEnd) {
                        const overlapSize = overlapEnd - overlapStart + 1;
                        const overlapRange = { start: overlapStart, end: overlapEnd };
                        if (!sourceCoverage.has(ranges[i].sourceUrl)) {
                            sourceCoverage.set(ranges[i].sourceUrl, overlapSize);
                        }
                        else {
                            sourceCoverage.set(ranges[i].sourceUrl, sourceCoverage.get(ranges[i].sourceUrl) + overlapSize);
                        }
                        if (!this.sourceUsedRangeMap.has(ranges[i].sourceUrl)) {
                            this.sourceUsedRangeMap.set(ranges[i].sourceUrl, [overlapRange]);
                        }
                        else {
                            this.sourceUsedRangeMap.get(ranges[i].sourceUrl)?.push(overlapRange);
                        }
                        // The next overlap will start at or after the end of the current range
                        lastFoundRange = i;
                    }
                    // The segment end is before the end of the current range, so we can stop looking for overlaps
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
                this.sourceUsedSizeMap.set(url, size); // update the map tracking the old used size
                this.sourceDeltaMap.set(url, size - oldSize); // update the map tracking the delta
            }
        }
    }
    rangesForExport(offset = 0) {
        const ranges = [];
        let start = 0;
        for (const segment of this.segments) {
            if (segment.count) {
                const last = ranges.length > 0 ? ranges[ranges.length - 1] : null;
                if (last && last.end === start + offset) {
                    // We can extend the last segment.
                    last.end = segment.end + offset;
                }
                else {
                    // There was a gap, add a new segment.
                    ranges.push({ start: start + offset, end: segment.end + offset });
                }
            }
            start = segment.end;
        }
        return ranges;
    }
}
//# sourceMappingURL=CoverageModel.js.map