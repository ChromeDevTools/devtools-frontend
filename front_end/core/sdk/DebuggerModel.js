// Copyright 2010 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import { RemoteObjectProperty, ScopeRef } from './RemoteObject.js';
import { Events as ResourceTreeModelEvents, ResourceTreeModel } from './ResourceTreeModel.js';
import { RuntimeModel } from './RuntimeModel.js';
import { Script } from './Script.js';
import { SDKModel } from './SDKModel.js';
import { SourceMap } from './SourceMap.js';
import { SourceMapManager } from './SourceMapManager.js';
import { Type } from './Target.js';
const UIStrings = {
    /**
     * @description Title of a section in the debugger showing local JavaScript variables.
     */
    local: 'Local',
    /**
     * @description Text that refers to closure as a programming term
     */
    closure: 'Closure',
    /**
     * @description Noun that represents a section or block of code in the Debugger Model. Shown in the Sources tab, while paused on a breakpoint.
     */
    block: 'Block',
    /**
     * @description Label for a group of JavaScript files
     */
    script: 'Script',
    /**
     * @description Title of a section in the debugger showing JavaScript variables from the a 'with'
     *block. Block here means section of code, 'with' refers to a JavaScript programming concept and
     *is a fixed term.
     */
    withBlock: '`With` block',
    /**
     * @description Title of a section in the debugger showing JavaScript variables from the a 'catch'
     *block. Block here means section of code, 'catch' refers to a JavaScript programming concept and
     *is a fixed term.
     */
    catchBlock: '`Catch` block',
    /**
     * @description Title of a section in the debugger showing JavaScript variables from the global scope.
     */
    global: 'Global',
    /**
     * @description Text for a JavaScript module, the programming concept
     */
    module: 'Module',
    /**
     * @description Text describing the expression scope in WebAssembly
     */
    expression: 'Expression',
    /**
     * @description Text in Scope Chain Sidebar Pane of the Sources panel
     */
    exception: 'Exception',
    /**
     * @description Text in Scope Chain Sidebar Pane of the Sources panel
     */
    returnValue: 'Return value',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/DebuggerModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function sortAndMergeRanges(locationRanges) {
    function compare(p1, p2) {
        return (p1.lineNumber - p2.lineNumber) || (p1.columnNumber - p2.columnNumber);
    }
    function overlap(r1, r2) {
        if (r1.scriptId !== r2.scriptId) {
            return false;
        }
        const n = compare(r1.start, r2.start);
        if (n < 0) {
            return compare(r1.end, r2.start) >= 0;
        }
        if (n > 0) {
            return compare(r1.start, r2.end) <= 0;
        }
        return true;
    }
    if (locationRanges.length === 0) {
        return [];
    }
    locationRanges.sort((r1, r2) => {
        if (r1.scriptId < r2.scriptId) {
            return -1;
        }
        if (r1.scriptId > r2.scriptId) {
            return 1;
        }
        return compare(r1.start, r2.start) || compare(r1.end, r2.end);
    });
    let prev = locationRanges[0];
    const merged = [];
    for (let i = 1; i < locationRanges.length; ++i) {
        const curr = locationRanges[i];
        if (overlap(prev, curr)) {
            if (compare(prev.end, curr.end) <= 0) {
                prev = { ...prev, end: curr.end };
            }
        }
        else {
            merged.push(prev);
            prev = curr;
        }
    }
    merged.push(prev);
    return merged;
}
export const WASM_SYMBOLS_PRIORITY = [
    "ExternalDWARF" /* Protocol.Debugger.DebugSymbolsType.ExternalDWARF */,
    "EmbeddedDWARF" /* Protocol.Debugger.DebugSymbolsType.EmbeddedDWARF */,
    "SourceMap" /* Protocol.Debugger.DebugSymbolsType.SourceMap */,
];
export class DebuggerModel extends SDKModel {
    agent;
    #runtimeModel;
    #sourceMapManager;
    #debuggerPausedDetails = null;
    #scripts = new Map();
    #scriptsBySourceURL = new Map();
    #discardableScripts = [];
    continueToLocationCallback = null;
    #selectedCallFrame = null;
    #debuggerEnabled = false;
    #debuggerId = null;
    #skipAllPausesTimeout = 0;
    #beforePausedCallback = null;
    #computeAutoStepRangesCallback = null;
    #expandCallFramesCallback = null;
    evaluateOnCallFrameCallback = null;
    #synchronizeBreakpointsCallback = null;
    // We need to be able to register listeners for individual breakpoints. As such, we dispatch
    // on breakpoint ids, which are not statically known. The event #payload will always be a `Location`.
    #breakpointResolvedEventTarget = new Common.ObjectWrapper.ObjectWrapper();
    // When stepping over with autostepping enabled, the context denotes the function to which autostepping is restricted
    // to by way of its functionLocation (as per Debugger.CallFrame).
    #autoSteppingContext = null;
    #isPausing = false;
    constructor(target) {
        super(target);
        target.registerDebuggerDispatcher(new DebuggerDispatcher(this));
        this.agent = target.debuggerAgent();
        this.#runtimeModel = target.model(RuntimeModel);
        this.#sourceMapManager = new SourceMapManager(target, (compiledURL, sourceMappingURL, payload, script) => new SourceMap(compiledURL, sourceMappingURL, payload, script));
        Common.Settings.Settings.instance()
            .moduleSetting('pause-on-exception-enabled')
            .addChangeListener(this.pauseOnExceptionStateChanged, this);
        Common.Settings.Settings.instance()
            .moduleSetting('pause-on-caught-exception')
            .addChangeListener(this.pauseOnExceptionStateChanged, this);
        Common.Settings.Settings.instance()
            .moduleSetting('pause-on-uncaught-exception')
            .addChangeListener(this.pauseOnExceptionStateChanged, this);
        Common.Settings.Settings.instance()
            .moduleSetting('disable-async-stack-traces')
            .addChangeListener(this.asyncStackTracesStateChanged, this);
        Common.Settings.Settings.instance()
            .moduleSetting('breakpoints-active')
            .addChangeListener(this.breakpointsActiveChanged, this);
        if (!target.suspended()) {
            void this.enableDebugger();
        }
        this.#sourceMapManager.setEnabled(Common.Settings.Settings.instance().moduleSetting('js-source-maps-enabled').get());
        Common.Settings.Settings.instance()
            .moduleSetting('js-source-maps-enabled')
            .addChangeListener(event => this.#sourceMapManager.setEnabled(event.data));
        const resourceTreeModel = target.model(ResourceTreeModel);
        if (resourceTreeModel) {
            resourceTreeModel.addEventListener(ResourceTreeModelEvents.FrameNavigated, this.onFrameNavigated, this);
        }
    }
    static selectSymbolSource(debugSymbols) {
        if (!debugSymbols || debugSymbols.length === 0) {
            return null;
        }
        // Provides backwards compatibility to previous CDP version on Protocol.Debugger.DebugSymbols.
        // TODO(crbug.com/369515221): Remove extra code as soon as old v8 versions used in Node are no longer supported.
        if ('type' in debugSymbols) {
            if (debugSymbols.type === 'None') {
                return null;
            }
            return debugSymbols;
        }
        let debugSymbolsSource = null;
        const symbolTypes = new Map(debugSymbols.map(symbol => [symbol.type, symbol]));
        for (const symbol of WASM_SYMBOLS_PRIORITY) {
            if (symbolTypes.has(symbol)) {
                debugSymbolsSource = symbolTypes.get(symbol) || null;
                break;
            }
        }
        console.assert(debugSymbolsSource !== null, 'Unknown symbol types. Front-end and back-end should be kept in sync regarding Protocol.Debugger.DebugSymbolTypes');
        if (debugSymbolsSource && debugSymbols.length > 1) {
            Common.Console.Console.instance().warn(`Multiple debug symbols for script were found. Using ${debugSymbolsSource.type}`);
        }
        return debugSymbolsSource;
    }
    sourceMapManager() {
        return this.#sourceMapManager;
    }
    runtimeModel() {
        return this.#runtimeModel;
    }
    debuggerEnabled() {
        return Boolean(this.#debuggerEnabled);
    }
    debuggerId() {
        return this.#debuggerId;
    }
    async enableDebugger() {
        if (this.#debuggerEnabled) {
            return;
        }
        this.#debuggerEnabled = true;
        // Set a limit for the total size of collected script sources retained by debugger.
        // 10MB for remote frontends, 100MB for others.
        const isRemoteFrontend = Root.Runtime.Runtime.queryParam('remoteFrontend') || Root.Runtime.Runtime.queryParam('ws');
        const maxScriptsCacheSize = isRemoteFrontend ? 10e6 : 100e6;
        const enablePromise = this.agent.invoke_enable({ maxScriptsCacheSize });
        let instrumentationPromise;
        if (Root.Runtime.experiments.isEnabled("instrumentation-breakpoints" /* Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS */)) {
            instrumentationPromise = this.agent.invoke_setInstrumentationBreakpoint({
                instrumentation: "beforeScriptExecution" /* Protocol.Debugger.SetInstrumentationBreakpointRequestInstrumentation.BeforeScriptExecution */,
            });
        }
        this.pauseOnExceptionStateChanged();
        void this.asyncStackTracesStateChanged();
        if (!Common.Settings.Settings.instance().moduleSetting('breakpoints-active').get()) {
            this.breakpointsActiveChanged();
        }
        this.dispatchEventToListeners(Events.DebuggerWasEnabled, this);
        const [enableResult] = await Promise.all([enablePromise, instrumentationPromise]);
        this.registerDebugger(enableResult);
    }
    async syncDebuggerId() {
        const isRemoteFrontend = Root.Runtime.Runtime.queryParam('remoteFrontend') || Root.Runtime.Runtime.queryParam('ws');
        const maxScriptsCacheSize = isRemoteFrontend ? 10e6 : 100e6;
        const enablePromise = this.agent.invoke_enable({ maxScriptsCacheSize });
        void enablePromise.then(this.registerDebugger.bind(this));
        return await enablePromise;
    }
    onFrameNavigated() {
        if (DebuggerModel.shouldResyncDebuggerId) {
            return;
        }
        DebuggerModel.shouldResyncDebuggerId = true;
    }
    registerDebugger(response) {
        if (response.getError()) {
            this.#debuggerEnabled = false;
            return;
        }
        const { debuggerId } = response;
        debuggerIdToModel.set(debuggerId, this);
        this.#debuggerId = debuggerId;
        this.dispatchEventToListeners(Events.DebuggerIsReadyToPause, this);
    }
    isReadyToPause() {
        return Boolean(this.#debuggerId);
    }
    static async modelForDebuggerId(debuggerId) {
        if (DebuggerModel.shouldResyncDebuggerId) {
            await DebuggerModel.resyncDebuggerIdForModels();
            DebuggerModel.shouldResyncDebuggerId = false;
        }
        return debuggerIdToModel.get(debuggerId) || null;
    }
    static async resyncDebuggerIdForModels() {
        const dbgModels = debuggerIdToModel.values();
        for (const dbgModel of dbgModels) {
            if (dbgModel.debuggerEnabled()) {
                await dbgModel.syncDebuggerId();
            }
        }
    }
    async disableDebugger() {
        if (!this.#debuggerEnabled) {
            return;
        }
        this.#debuggerEnabled = false;
        await this.asyncStackTracesStateChanged();
        await this.agent.invoke_disable();
        this.#isPausing = false;
        this.globalObjectCleared();
        this.dispatchEventToListeners(Events.DebuggerWasDisabled, this);
        if (typeof this.#debuggerId === 'string') {
            debuggerIdToModel.delete(this.#debuggerId);
        }
        this.#debuggerId = null;
    }
    skipAllPauses(skip) {
        if (this.#skipAllPausesTimeout) {
            clearTimeout(this.#skipAllPausesTimeout);
            this.#skipAllPausesTimeout = 0;
        }
        void this.agent.invoke_setSkipAllPauses({ skip });
    }
    skipAllPausesUntilReloadOrTimeout(timeout) {
        if (this.#skipAllPausesTimeout) {
            clearTimeout(this.#skipAllPausesTimeout);
        }
        void this.agent.invoke_setSkipAllPauses({ skip: true });
        // If reload happens before the timeout, the flag will be already unset and the timeout callback won't change anything.
        this.#skipAllPausesTimeout = window.setTimeout(this.skipAllPauses.bind(this, false), timeout);
    }
    pauseOnExceptionStateChanged() {
        const pauseOnCaughtEnabled = Common.Settings.Settings.instance().moduleSetting('pause-on-caught-exception').get();
        let state;
        const pauseOnUncaughtEnabled = Common.Settings.Settings.instance().moduleSetting('pause-on-uncaught-exception').get();
        if (pauseOnCaughtEnabled && pauseOnUncaughtEnabled) {
            state = "all" /* Protocol.Debugger.SetPauseOnExceptionsRequestState.All */;
        }
        else if (pauseOnCaughtEnabled) {
            state = "caught" /* Protocol.Debugger.SetPauseOnExceptionsRequestState.Caught */;
        }
        else if (pauseOnUncaughtEnabled) {
            state = "uncaught" /* Protocol.Debugger.SetPauseOnExceptionsRequestState.Uncaught */;
        }
        else {
            state = "none" /* Protocol.Debugger.SetPauseOnExceptionsRequestState.None */;
        }
        void this.agent.invoke_setPauseOnExceptions({ state });
    }
    asyncStackTracesStateChanged() {
        const maxAsyncStackChainDepth = 32;
        const enabled = !Common.Settings.Settings.instance().moduleSetting('disable-async-stack-traces').get() && this.#debuggerEnabled;
        const maxDepth = enabled ? maxAsyncStackChainDepth : 0;
        return this.agent.invoke_setAsyncCallStackDepth({ maxDepth });
    }
    breakpointsActiveChanged() {
        void this.agent.invoke_setBreakpointsActive({ active: Common.Settings.Settings.instance().moduleSetting('breakpoints-active').get() });
    }
    setComputeAutoStepRangesCallback(callback) {
        this.#computeAutoStepRangesCallback = callback;
    }
    async computeAutoStepSkipList(mode) {
        let ranges = [];
        if (this.#computeAutoStepRangesCallback && this.#debuggerPausedDetails &&
            this.#debuggerPausedDetails.callFrames.length > 0) {
            const [callFrame] = this.#debuggerPausedDetails.callFrames;
            ranges = await this.#computeAutoStepRangesCallback.call(null, mode, callFrame);
        }
        const skipList = ranges.map(({ start, end }) => ({
            scriptId: start.scriptId,
            start: { lineNumber: start.lineNumber, columnNumber: start.columnNumber },
            end: { lineNumber: end.lineNumber, columnNumber: end.columnNumber },
        }));
        return sortAndMergeRanges(skipList);
    }
    async stepInto() {
        const skipList = await this.computeAutoStepSkipList("StepInto" /* StepMode.STEP_INTO */);
        void this.agent.invoke_stepInto({ breakOnAsyncCall: false, skipList });
    }
    async stepOver() {
        this.#autoSteppingContext = this.#debuggerPausedDetails?.callFrames[0]?.functionLocation() ?? null;
        const skipList = await this.computeAutoStepSkipList("StepOver" /* StepMode.STEP_OVER */);
        void this.agent.invoke_stepOver({ skipList });
    }
    async stepOut() {
        const skipList = await this.computeAutoStepSkipList("StepOut" /* StepMode.STEP_OUT */);
        if (skipList.length !== 0) {
            void this.agent.invoke_stepOver({ skipList });
        }
        else {
            void this.agent.invoke_stepOut();
        }
    }
    scheduleStepIntoAsync() {
        void this.computeAutoStepSkipList("StepInto" /* StepMode.STEP_INTO */).then(skipList => {
            void this.agent.invoke_stepInto({ breakOnAsyncCall: true, skipList });
        });
    }
    resume() {
        void this.agent.invoke_resume({ terminateOnResume: false });
        this.#isPausing = false;
    }
    pause() {
        this.#isPausing = true;
        this.skipAllPauses(false);
        void this.agent.invoke_pause();
    }
    async setBreakpointByURL(url, lineNumber, columnNumber, condition) {
        // Convert file url to node-js path.
        let urlRegex;
        if (this.target().type() === Type.NODE && Common.ParsedURL.schemeIs(url, 'file:')) {
            const platformPath = Common.ParsedURL.ParsedURL.urlToRawPathString(url, Host.Platform.isWin());
            urlRegex =
                `${Platform.StringUtilities.escapeForRegExp(platformPath)}|${Platform.StringUtilities.escapeForRegExp(url)}`;
            if (Host.Platform.isWin() && platformPath.match(/^.:\\/)) {
                // Match upper or lower case drive letter
                urlRegex = `[${platformPath[0].toUpperCase()}${platformPath[0].toLowerCase()}]` + urlRegex.substr(1);
            }
        }
        // Adjust column if needed.
        let minColumnNumber = 0;
        const scripts = this.#scriptsBySourceURL.get(url) || [];
        for (let i = 0, l = scripts.length; i < l; ++i) {
            const script = scripts[i];
            if (lineNumber === script.lineOffset) {
                minColumnNumber = minColumnNumber ? Math.min(minColumnNumber, script.columnOffset) : script.columnOffset;
            }
        }
        columnNumber = Math.max(columnNumber || 0, minColumnNumber);
        const response = await this.agent.invoke_setBreakpointByUrl({
            lineNumber,
            url: urlRegex ? undefined : url,
            urlRegex,
            columnNumber,
            condition,
        });
        if (response.getError()) {
            return { locations: [], breakpointId: null };
        }
        let locations = [];
        if (response.locations) {
            locations = response.locations.map(payload => Location.fromPayload(this, payload));
        }
        return { locations, breakpointId: response.breakpointId };
    }
    async setBreakpointInAnonymousScript(scriptHash, lineNumber, columnNumber, condition) {
        const response = await this.agent.invoke_setBreakpointByUrl({ lineNumber, scriptHash, columnNumber, condition });
        if (response.getError()) {
            return { locations: [], breakpointId: null };
        }
        let locations = [];
        if (response.locations) {
            locations = response.locations.map(payload => Location.fromPayload(this, payload));
        }
        return { locations, breakpointId: response.breakpointId };
    }
    async removeBreakpoint(breakpointId) {
        await this.agent.invoke_removeBreakpoint({ breakpointId });
    }
    async getPossibleBreakpoints(startLocation, endLocation, restrictToFunction) {
        const response = await this.agent.invoke_getPossibleBreakpoints({
            start: startLocation.payload(),
            end: endLocation ? endLocation.payload() : undefined,
            restrictToFunction,
        });
        if (response.getError() || !response.locations) {
            return [];
        }
        return response.locations.map(location => BreakLocation.fromPayload(this, location));
    }
    async fetchAsyncStackTrace(stackId) {
        const response = await this.agent.invoke_getStackTrace({ stackTraceId: stackId });
        return response.getError() ? null : response.stackTrace;
    }
    breakpointResolved(breakpointId, location) {
        this.#breakpointResolvedEventTarget.dispatchEventToListeners(breakpointId, Location.fromPayload(this, location));
    }
    globalObjectCleared() {
        this.resetDebuggerPausedDetails();
        this.reset();
        // TODO(dgozman): move clients to ExecutionContextDestroyed/ScriptCollected events.
        this.dispatchEventToListeners(Events.GlobalObjectCleared, this);
    }
    reset() {
        for (const script of this.#scripts.values()) {
            this.#sourceMapManager.detachSourceMap(script);
        }
        this.#scripts.clear();
        this.#scriptsBySourceURL.clear();
        this.#discardableScripts = [];
        this.#autoSteppingContext = null;
    }
    scripts() {
        return Array.from(this.#scripts.values());
    }
    scriptForId(scriptId) {
        return this.#scripts.get(scriptId) || null;
    }
    /**
     * Returns all `Script` objects with the same provided `sourceURL`. The
     * resulting array is sorted by time with the newest `Script` in the front.
     */
    scriptsForSourceURL(sourceURL) {
        return this.#scriptsBySourceURL.get(sourceURL) || [];
    }
    scriptsForExecutionContext(executionContext) {
        const result = [];
        for (const script of this.#scripts.values()) {
            if (script.executionContextId === executionContext.id) {
                result.push(script);
            }
        }
        return result;
    }
    get callFrames() {
        return this.#debuggerPausedDetails ? this.#debuggerPausedDetails.callFrames : null;
    }
    debuggerPausedDetails() {
        return this.#debuggerPausedDetails;
    }
    async setDebuggerPausedDetails(debuggerPausedDetails) {
        this.#isPausing = false;
        this.#debuggerPausedDetails = debuggerPausedDetails;
        if (this.#beforePausedCallback) {
            if (!await this.#beforePausedCallback.call(null, debuggerPausedDetails, this.#autoSteppingContext)) {
                return false;
            }
        }
        // If we resolved a location in auto-stepping callback, reset the
        // auto-step-over context.
        this.#autoSteppingContext = null;
        this.dispatchEventToListeners(Events.DebuggerPaused, this);
        this.setSelectedCallFrame(debuggerPausedDetails.callFrames[0]);
        return true;
    }
    resetDebuggerPausedDetails() {
        this.#isPausing = false;
        this.#debuggerPausedDetails = null;
        this.setSelectedCallFrame(null);
    }
    setBeforePausedCallback(callback) {
        this.#beforePausedCallback = callback;
    }
    setExpandCallFramesCallback(callback) {
        this.#expandCallFramesCallback = callback;
    }
    setEvaluateOnCallFrameCallback(callback) {
        this.evaluateOnCallFrameCallback = callback;
    }
    setSynchronizeBreakpointsCallback(callback) {
        this.#synchronizeBreakpointsCallback = callback;
    }
    async pausedScript(callFrames, reason, auxData, breakpointIds, asyncStackTrace, asyncStackTraceId) {
        if (reason === "instrumentation" /* Protocol.Debugger.PausedEventReason.Instrumentation */) {
            const script = this.scriptForId(auxData.scriptId);
            if (this.#synchronizeBreakpointsCallback && script) {
                await this.#synchronizeBreakpointsCallback(script);
            }
            this.resume();
            return;
        }
        const pausedDetails = new DebuggerPausedDetails(this, callFrames, reason, auxData, breakpointIds, asyncStackTrace, asyncStackTraceId);
        await this.#expandCallFrames(pausedDetails);
        if (this.continueToLocationCallback) {
            const callback = this.continueToLocationCallback;
            this.continueToLocationCallback = null;
            if (callback(pausedDetails)) {
                return;
            }
        }
        if (!await this.setDebuggerPausedDetails(pausedDetails)) {
            if (this.#autoSteppingContext) {
                void this.stepOver();
            }
            else {
                void this.stepInto();
            }
        }
        else {
            Common.EventTarget.fireEvent('DevTools.DebuggerPaused');
        }
    }
    /** Delegates to the DebuggerLanguagePlugin and potential attached source maps to expand inlined call frames */
    async #expandCallFrames(pausedDetails) {
        if (this.#expandCallFramesCallback) {
            pausedDetails.callFrames = await this.#expandCallFramesCallback.call(null, pausedDetails.callFrames);
        }
        if (!Root.Runtime.experiments.isEnabled("use-source-map-scopes" /* Root.Runtime.ExperimentName.USE_SOURCE_MAP_SCOPES */)) {
            return;
        }
        // TODO(crbug.com/40277685): Support attaching/detaching source maps after pausing.
        // Expanding call frames via source maps here is only suitable for the experiment prototype because
        // we block until all relevant source maps are loaded.
        // We should change this so the "Debugger Plugin" and "Source Map" have a bottle neck where they expand
        // call frames and that bottleneck should support attaching/detaching source maps while paused.
        const finalFrames = [];
        for (const frame of pausedDetails.callFrames) {
            const sourceMap = await this.sourceMapManager().sourceMapForClientPromise(frame.script);
            if (sourceMap?.hasScopeInfo()) {
                finalFrames.push(...sourceMap.expandCallFrame(frame));
            }
            else {
                finalFrames.push(frame);
            }
        }
        pausedDetails.callFrames = finalFrames;
    }
    resumedScript() {
        this.resetDebuggerPausedDetails();
        this.dispatchEventToListeners(Events.DebuggerResumed, this);
    }
    parsedScriptSource(scriptId, sourceURL, startLine, startColumn, endLine, endColumn, 
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executionContextId, hash, executionContextAuxData, isLiveEdit, sourceMapURL, hasSourceURLComment, hasSyntaxError, length, isModule, originStackTrace, codeOffset, scriptLanguage, debugSymbols, embedderName, buildId) {
        const knownScript = this.#scripts.get(scriptId);
        if (knownScript) {
            return knownScript;
        }
        let isContentScript = false;
        if (executionContextAuxData && ('isDefault' in executionContextAuxData)) {
            isContentScript = !executionContextAuxData['isDefault'];
        }
        const selectedDebugSymbol = DebuggerModel.selectSymbolSource(debugSymbols);
        const script = new Script(this, scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash, isContentScript, isLiveEdit, sourceMapURL, hasSourceURLComment, length, isModule, originStackTrace, codeOffset, scriptLanguage, selectedDebugSymbol, embedderName, buildId);
        this.registerScript(script);
        this.dispatchEventToListeners(Events.ParsedScriptSource, script);
        if (script.sourceMapURL && !hasSyntaxError) {
            this.#sourceMapManager.attachSourceMap(script, script.sourceURL, script.sourceMapURL);
        }
        const isDiscardable = hasSyntaxError && script.isAnonymousScript();
        if (isDiscardable) {
            this.#discardableScripts.push(script);
            this.collectDiscardedScripts();
        }
        return script;
    }
    setSourceMapURL(script, newSourceMapURL) {
        // Detach any previous source map from the `script` first.
        this.#sourceMapManager.detachSourceMap(script);
        script.sourceMapURL = newSourceMapURL;
        this.#sourceMapManager.attachSourceMap(script, script.sourceURL, script.sourceMapURL);
    }
    async setDebugInfoURL(script, _externalURL) {
        if (this.#expandCallFramesCallback && this.#debuggerPausedDetails) {
            this.#debuggerPausedDetails.callFrames =
                await this.#expandCallFramesCallback.call(null, this.#debuggerPausedDetails.callFrames);
        }
        this.dispatchEventToListeners(Events.DebugInfoAttached, script);
    }
    executionContextDestroyed(executionContext) {
        for (const script of this.#scripts.values()) {
            if (script.executionContextId === executionContext.id) {
                this.#sourceMapManager.detachSourceMap(script);
            }
        }
    }
    registerScript(script) {
        this.#scripts.set(script.scriptId, script);
        if (script.isAnonymousScript()) {
            return;
        }
        let scripts = this.#scriptsBySourceURL.get(script.sourceURL);
        if (!scripts) {
            scripts = [];
            this.#scriptsBySourceURL.set(script.sourceURL, scripts);
        }
        // Newer scripts with the same URL should be preferred so we put them in
        // the front. Consuming code usually will iterate over the array and pick
        // the first script that works.
        scripts.unshift(script);
    }
    unregisterScript(script) {
        console.assert(script.isAnonymousScript());
        this.#scripts.delete(script.scriptId);
    }
    collectDiscardedScripts() {
        if (this.#discardableScripts.length < 1000) {
            return;
        }
        const scriptsToDiscard = this.#discardableScripts.splice(0, 100);
        for (const script of scriptsToDiscard) {
            this.unregisterScript(script);
            this.dispatchEventToListeners(Events.DiscardedAnonymousScriptSource, script);
        }
    }
    createRawLocation(script, lineNumber, columnNumber, inlineFrameIndex) {
        return this.createRawLocationByScriptId(script.scriptId, lineNumber, columnNumber, inlineFrameIndex);
    }
    createRawLocationByURL(sourceURL, lineNumber, columnNumber, inlineFrameIndex) {
        for (const script of this.#scriptsBySourceURL.get(sourceURL) || []) {
            if (script.lineOffset > lineNumber ||
                (script.lineOffset === lineNumber && columnNumber !== undefined && script.columnOffset > columnNumber)) {
                continue;
            }
            if (script.endLine < lineNumber ||
                (script.endLine === lineNumber && columnNumber !== undefined && script.endColumn <= columnNumber)) {
                continue;
            }
            return new Location(this, script.scriptId, lineNumber, columnNumber, inlineFrameIndex);
        }
        return null;
    }
    createRawLocationByScriptId(scriptId, lineNumber, columnNumber, inlineFrameIndex) {
        return new Location(this, scriptId, lineNumber, columnNumber, inlineFrameIndex);
    }
    createRawLocationsByStackTrace(stackTrace) {
        const rawLocations = [];
        for (let current = stackTrace; current; current = current.parent) {
            for (const { scriptId, lineNumber, columnNumber } of current.callFrames) {
                rawLocations.push(this.createRawLocationByScriptId(scriptId, lineNumber, columnNumber));
            }
        }
        return rawLocations;
    }
    isPaused() {
        return Boolean(this.debuggerPausedDetails());
    }
    isPausing() {
        return this.#isPausing;
    }
    setSelectedCallFrame(callFrame) {
        if (this.#selectedCallFrame === callFrame) {
            return;
        }
        this.#selectedCallFrame = callFrame;
        this.dispatchEventToListeners(Events.CallFrameSelected, this);
    }
    selectedCallFrame() {
        return this.#selectedCallFrame;
    }
    async evaluateOnSelectedCallFrame(options) {
        const callFrame = this.selectedCallFrame();
        if (!callFrame) {
            throw new Error('No call frame selected');
        }
        return await callFrame.evaluate(options);
    }
    functionDetailsPromise(remoteObject) {
        return remoteObject.getAllProperties(false /* accessorPropertiesOnly */, false /* generatePreview */)
            .then(buildDetails.bind(this));
        function buildDetails(response) {
            if (!response) {
                return null;
            }
            let location = null;
            if (response.internalProperties) {
                for (const prop of response.internalProperties) {
                    if (prop.name === '[[FunctionLocation]]') {
                        location = prop.value;
                    }
                }
            }
            let functionName = null;
            if (response.properties) {
                for (const prop of response.properties) {
                    if (prop.name === 'name' && prop.value && prop.value.type === 'string') {
                        functionName = prop.value;
                    }
                }
            }
            let debuggerLocation = null;
            if (location) {
                debuggerLocation = this.createRawLocationByScriptId(location.value.scriptId, location.value.lineNumber, location.value.columnNumber);
            }
            return { location: debuggerLocation, functionName: functionName ? functionName.value : '' };
        }
    }
    async setVariableValue(scopeNumber, variableName, newValue, callFrameId) {
        const response = await this.agent.invoke_setVariableValue({ scopeNumber, variableName, newValue, callFrameId });
        const error = response.getError();
        return error;
    }
    addBreakpointListener(breakpointId, listener, thisObject) {
        this.#breakpointResolvedEventTarget.addEventListener(breakpointId, listener, thisObject);
    }
    removeBreakpointListener(breakpointId, listener, thisObject) {
        this.#breakpointResolvedEventTarget.removeEventListener(breakpointId, listener, thisObject);
    }
    async setBlackboxPatterns(patterns, skipAnonymous) {
        const response = await this.agent.invoke_setBlackboxPatterns({ patterns, skipAnonymous });
        const error = response.getError();
        return !error;
    }
    async setBlackboxExecutionContexts(uniqueIds) {
        const response = await this.agent.invoke_setBlackboxExecutionContexts({ uniqueIds });
        const error = response.getError();
        return !error;
    }
    dispose() {
        if (this.#debuggerId) {
            debuggerIdToModel.delete(this.#debuggerId);
        }
        Common.Settings.Settings.instance()
            .moduleSetting('pause-on-exception-enabled')
            .removeChangeListener(this.pauseOnExceptionStateChanged, this);
        Common.Settings.Settings.instance()
            .moduleSetting('pause-on-caught-exception')
            .removeChangeListener(this.pauseOnExceptionStateChanged, this);
        Common.Settings.Settings.instance()
            .moduleSetting('disable-async-stack-traces')
            .removeChangeListener(this.asyncStackTracesStateChanged, this);
    }
    async suspendModel() {
        await this.disableDebugger();
    }
    async resumeModel() {
        await this.enableDebugger();
    }
    static shouldResyncDebuggerId = false;
    getEvaluateOnCallFrameCallback() {
        return this.evaluateOnCallFrameCallback;
    }
    /**
     * Iterates the async stack trace parents.
     *
     * Retrieving cross-target async stack fragments requires CDP interaction, so this is an async generator.
     *
     * Important: This iterator will not yield the "synchronous" part of the stack trace, only the async parent chain.
     */
    async *iterateAsyncParents(stackTraceOrPausedDetails) {
        // We make `DebuggerPausedDetails` look like a stack trace. We are only interested in `parent` and `parentId` in any case.
        let stackTrace = stackTraceOrPausedDetails instanceof DebuggerPausedDetails ?
            {
                callFrames: [],
                parent: stackTraceOrPausedDetails.asyncStackTrace,
                parentId: stackTraceOrPausedDetails.asyncStackTraceId
            } :
            stackTraceOrPausedDetails;
        let target = this.target();
        while (true) {
            if (stackTrace.parent) {
                stackTrace = stackTrace.parent;
            }
            else if (stackTrace.parentId) {
                const model = stackTrace.parentId.debuggerId ?
                    await DebuggerModel.modelForDebuggerId(stackTrace.parentId.debuggerId) :
                    this;
                if (!model) {
                    return;
                }
                const maybeStackTrace = await model.fetchAsyncStackTrace(stackTrace.parentId);
                if (!maybeStackTrace) {
                    return;
                }
                stackTrace = maybeStackTrace;
                target = model.target();
            }
            else {
                return;
            }
            yield { stackTrace, target };
        }
    }
}
const debuggerIdToModel = new Map();
/**
 * Keep these in sync with WebCore::V8Debugger
 */
export var PauseOnExceptionsState;
(function (PauseOnExceptionsState) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    PauseOnExceptionsState["DontPauseOnExceptions"] = "none";
    PauseOnExceptionsState["PauseOnAllExceptions"] = "all";
    PauseOnExceptionsState["PauseOnCaughtExceptions"] = "caught";
    PauseOnExceptionsState["PauseOnUncaughtExceptions"] = "uncaught";
    /* eslint-enable @typescript-eslint/naming-convention */
})(PauseOnExceptionsState || (PauseOnExceptionsState = {}));
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["DebuggerWasEnabled"] = "DebuggerWasEnabled";
    Events["DebuggerWasDisabled"] = "DebuggerWasDisabled";
    Events["DebuggerPaused"] = "DebuggerPaused";
    Events["DebuggerResumed"] = "DebuggerResumed";
    Events["DebugInfoAttached"] = "DebugInfoAttached";
    Events["ParsedScriptSource"] = "ParsedScriptSource";
    Events["DiscardedAnonymousScriptSource"] = "DiscardedAnonymousScriptSource";
    Events["GlobalObjectCleared"] = "GlobalObjectCleared";
    Events["CallFrameSelected"] = "CallFrameSelected";
    Events["DebuggerIsReadyToPause"] = "DebuggerIsReadyToPause";
    Events["ScriptSourceWasEdited"] = "ScriptSourceWasEdited";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
class DebuggerDispatcher {
    #debuggerModel;
    constructor(debuggerModel) {
        this.#debuggerModel = debuggerModel;
    }
    paused({ callFrames, reason, data, hitBreakpoints, asyncStackTrace, asyncStackTraceId }) {
        if (!this.#debuggerModel.debuggerEnabled()) {
            return;
        }
        void this.#debuggerModel.pausedScript(callFrames, reason, data, hitBreakpoints || [], asyncStackTrace, asyncStackTraceId);
    }
    resumed() {
        if (!this.#debuggerModel.debuggerEnabled()) {
            return;
        }
        this.#debuggerModel.resumedScript();
    }
    scriptParsed({ scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, executionContextAuxData, isLiveEdit, sourceMapURL, hasSourceURL, length, isModule, stackTrace, codeOffset, scriptLanguage, debugSymbols, embedderName, buildId, }) {
        if (!this.#debuggerModel.debuggerEnabled()) {
            return;
        }
        this.#debuggerModel.parsedScriptSource(scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, executionContextAuxData, Boolean(isLiveEdit), sourceMapURL, Boolean(hasSourceURL), false, length || 0, isModule || null, stackTrace || null, codeOffset || null, scriptLanguage || null, debugSymbols || null, embedderName || null, buildId || null);
    }
    scriptFailedToParse({ scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, executionContextAuxData, sourceMapURL, hasSourceURL, length, isModule, stackTrace, codeOffset, scriptLanguage, embedderName, buildId, }) {
        if (!this.#debuggerModel.debuggerEnabled()) {
            return;
        }
        this.#debuggerModel.parsedScriptSource(scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, executionContextAuxData, false, sourceMapURL, Boolean(hasSourceURL), true, length || 0, isModule || null, stackTrace || null, codeOffset || null, scriptLanguage || null, null, embedderName || null, buildId || null);
    }
    breakpointResolved({ breakpointId, location }) {
        if (!this.#debuggerModel.debuggerEnabled()) {
            return;
        }
        this.#debuggerModel.breakpointResolved(breakpointId, location);
    }
}
export class Location {
    debuggerModel;
    scriptId;
    lineNumber;
    columnNumber;
    inlineFrameIndex;
    constructor(debuggerModel, scriptId, lineNumber, columnNumber, inlineFrameIndex) {
        this.debuggerModel = debuggerModel;
        this.scriptId = scriptId;
        this.lineNumber = lineNumber;
        this.columnNumber = columnNumber || 0;
        this.inlineFrameIndex = inlineFrameIndex || 0;
    }
    static fromPayload(debuggerModel, payload, inlineFrameIndex) {
        return new Location(debuggerModel, payload.scriptId, payload.lineNumber, payload.columnNumber, inlineFrameIndex);
    }
    payload() {
        return { scriptId: this.scriptId, lineNumber: this.lineNumber, columnNumber: this.columnNumber };
    }
    script() {
        return this.debuggerModel.scriptForId(this.scriptId);
    }
    continueToLocation(pausedCallback) {
        if (pausedCallback) {
            this.debuggerModel.continueToLocationCallback = this.paused.bind(this, pausedCallback);
        }
        void this.debuggerModel.agent.invoke_continueToLocation({
            location: this.payload(),
            targetCallFrames: "current" /* Protocol.Debugger.ContinueToLocationRequestTargetCallFrames.Current */,
        });
    }
    paused(pausedCallback, debuggerPausedDetails) {
        const location = debuggerPausedDetails.callFrames[0].location();
        if (location.scriptId === this.scriptId && location.lineNumber === this.lineNumber &&
            location.columnNumber === this.columnNumber) {
            pausedCallback();
            return true;
        }
        return false;
    }
    id() {
        return this.debuggerModel.target().id() + ':' + this.scriptId + ':' + this.lineNumber + ':' + this.columnNumber;
    }
}
export class BreakLocation extends Location {
    type;
    constructor(debuggerModel, scriptId, lineNumber, columnNumber, type) {
        super(debuggerModel, scriptId, lineNumber, columnNumber);
        if (type) {
            this.type = type;
        }
    }
    static fromPayload(debuggerModel, payload) {
        return new BreakLocation(debuggerModel, payload.scriptId, payload.lineNumber, payload.columnNumber, payload.type);
    }
}
export class CallFrame {
    debuggerModel;
    script;
    payload;
    #location;
    #scopeChain;
    #localScope;
    inlineFrameIndex;
    functionName;
    #functionLocation;
    #returnValue;
    missingDebugInfoDetails;
    exception;
    canBeRestarted;
    constructor(debuggerModel, script, payload, inlineFrameIndex, functionName, exception = null) {
        this.debuggerModel = debuggerModel;
        this.script = script;
        this.payload = payload;
        this.#location = Location.fromPayload(debuggerModel, payload.location, inlineFrameIndex);
        this.#scopeChain = [];
        this.#localScope = null;
        this.inlineFrameIndex = inlineFrameIndex || 0;
        this.functionName = functionName ?? payload.functionName;
        this.missingDebugInfoDetails = null;
        this.canBeRestarted = Boolean(payload.canBeRestarted);
        this.exception = exception;
        for (let i = 0; i < payload.scopeChain.length; ++i) {
            const scope = new Scope(this, i);
            this.#scopeChain.push(scope);
            if (scope.type() === "local" /* Protocol.Debugger.ScopeType.Local */) {
                this.#localScope = scope;
            }
        }
        if (payload.functionLocation) {
            this.#functionLocation = Location.fromPayload(debuggerModel, payload.functionLocation);
        }
        this.#returnValue =
            payload.returnValue ? this.debuggerModel.runtimeModel().createRemoteObject(payload.returnValue) : null;
    }
    static fromPayloadArray(debuggerModel, callFrames, exception) {
        const result = [];
        for (let i = 0; i < callFrames.length; ++i) {
            const callFrame = callFrames[i];
            const script = debuggerModel.scriptForId(callFrame.location.scriptId);
            if (script) {
                const ex = i === 0 ? exception : null;
                result.push(new CallFrame(debuggerModel, script, callFrame, undefined, undefined, ex));
            }
        }
        return result;
    }
    createVirtualCallFrame(inlineFrameIndex, name) {
        return new CallFrame(this.debuggerModel, this.script, this.payload, inlineFrameIndex, name, this.exception);
    }
    get id() {
        return this.payload.callFrameId;
    }
    scopeChain() {
        return this.#scopeChain;
    }
    localScope() {
        return this.#localScope;
    }
    thisObject() {
        return this.payload.this ? this.debuggerModel.runtimeModel().createRemoteObject(this.payload.this) : null;
    }
    returnValue() {
        return this.#returnValue;
    }
    async setReturnValue(expression) {
        if (!this.#returnValue) {
            return null;
        }
        const evaluateResponse = await this.debuggerModel.agent.invoke_evaluateOnCallFrame({ callFrameId: this.id, expression, silent: true, objectGroup: 'backtrace' });
        if (evaluateResponse.getError() || evaluateResponse.exceptionDetails) {
            return null;
        }
        const response = await this.debuggerModel.agent.invoke_setReturnValue({ newValue: evaluateResponse.result });
        if (response.getError()) {
            return null;
        }
        this.#returnValue = this.debuggerModel.runtimeModel().createRemoteObject(evaluateResponse.result);
        return this.#returnValue;
    }
    location() {
        return this.#location;
    }
    functionLocation() {
        return this.#functionLocation || null;
    }
    async evaluate(options) {
        const debuggerModel = this.debuggerModel;
        const runtimeModel = debuggerModel.runtimeModel();
        const evaluateOnCallFrameCallback = debuggerModel.getEvaluateOnCallFrameCallback();
        if (evaluateOnCallFrameCallback) {
            const result = await evaluateOnCallFrameCallback(this, options);
            if (result) {
                return result;
            }
        }
        const response = await this.debuggerModel.agent.invoke_evaluateOnCallFrame({
            callFrameId: this.id,
            expression: options.expression,
            objectGroup: options.objectGroup,
            includeCommandLineAPI: options.includeCommandLineAPI,
            silent: options.silent,
            returnByValue: options.returnByValue,
            generatePreview: options.generatePreview,
            throwOnSideEffect: options.throwOnSideEffect,
            timeout: options.timeout,
        });
        const error = response.getError();
        if (error) {
            return { error };
        }
        return { object: runtimeModel.createRemoteObject(response.result), exceptionDetails: response.exceptionDetails };
    }
    async restart() {
        console.assert(this.canBeRestarted, 'This frame can not be restarted.');
        // Note that even if `canBeRestarted` is true, the restart frame call can still fail.
        // The user can evaluate arbitrary code between pausing and restarting the frame that
        // could mess with the call stack.
        await this.debuggerModel.agent.invoke_restartFrame({ callFrameId: this.id, mode: "StepInto" /* Protocol.Debugger.RestartFrameRequestMode.StepInto */ });
    }
    getPayload() {
        return this.payload;
    }
}
export class Scope {
    #callFrame;
    #payload;
    #type;
    #name;
    #ordinal;
    #locationRange;
    #object = null;
    constructor(callFrame, ordinal) {
        this.#callFrame = callFrame;
        this.#payload = callFrame.getPayload().scopeChain[ordinal];
        this.#type = this.#payload.type;
        this.#name = this.#payload.name;
        this.#ordinal = ordinal;
        const start = this.#payload.startLocation ? Location.fromPayload(callFrame.debuggerModel, this.#payload.startLocation) : null;
        const end = this.#payload.endLocation ? Location.fromPayload(callFrame.debuggerModel, this.#payload.endLocation) : null;
        if (start && end && start.scriptId === end.scriptId) {
            this.#locationRange = { start, end };
        }
        else {
            this.#locationRange = null;
        }
    }
    callFrame() {
        return this.#callFrame;
    }
    type() {
        return this.#type;
    }
    typeName() {
        switch (this.#type) {
            case "local" /* Protocol.Debugger.ScopeType.Local */:
                return i18nString(UIStrings.local);
            case "closure" /* Protocol.Debugger.ScopeType.Closure */:
                return i18nString(UIStrings.closure);
            case "catch" /* Protocol.Debugger.ScopeType.Catch */:
                return i18nString(UIStrings.catchBlock);
            case "eval" /* Protocol.Debugger.ScopeType.Eval */:
                return i18n.i18n.lockedString('Eval');
            case "block" /* Protocol.Debugger.ScopeType.Block */:
                return i18nString(UIStrings.block);
            case "script" /* Protocol.Debugger.ScopeType.Script */:
                return i18nString(UIStrings.script);
            case "with" /* Protocol.Debugger.ScopeType.With */:
                return i18nString(UIStrings.withBlock);
            case "global" /* Protocol.Debugger.ScopeType.Global */:
                return i18nString(UIStrings.global);
            case "module" /* Protocol.Debugger.ScopeType.Module */:
                return i18nString(UIStrings.module);
            case "wasm-expression-stack" /* Protocol.Debugger.ScopeType.WasmExpressionStack */:
                return i18nString(UIStrings.expression);
        }
        return '';
    }
    name() {
        return this.#name;
    }
    range() {
        return this.#locationRange;
    }
    object() {
        if (this.#object) {
            return this.#object;
        }
        const runtimeModel = this.#callFrame.debuggerModel.runtimeModel();
        const declarativeScope = this.#type !== "with" /* Protocol.Debugger.ScopeType.With */ && this.#type !== "global" /* Protocol.Debugger.ScopeType.Global */;
        if (declarativeScope) {
            this.#object =
                runtimeModel.createScopeRemoteObject(this.#payload.object, new ScopeRef(this.#ordinal, this.#callFrame.id));
        }
        else {
            this.#object = runtimeModel.createRemoteObject(this.#payload.object);
        }
        return this.#object;
    }
    description() {
        const declarativeScope = this.#type !== "with" /* Protocol.Debugger.ScopeType.With */ && this.#type !== "global" /* Protocol.Debugger.ScopeType.Global */;
        return declarativeScope ? '' : (this.#payload.object.description || '');
    }
    icon() {
        return undefined;
    }
    extraProperties() {
        if (this.#ordinal !== 0 || this.#type !== "local" /* Protocol.Debugger.ScopeType.Local */ || this.#callFrame.script.isWasm()) {
            return [];
        }
        const extraProperties = [];
        const exception = this.#callFrame.exception;
        if (exception) {
            extraProperties.push(new RemoteObjectProperty(i18nString(UIStrings.exception), exception, undefined, undefined, undefined, undefined, undefined, 
            /* synthetic */ true));
        }
        const returnValue = this.#callFrame.returnValue();
        if (returnValue) {
            extraProperties.push(new RemoteObjectProperty(i18nString(UIStrings.returnValue), returnValue, undefined, undefined, undefined, undefined, undefined, 
            /* synthetic */ true, this.#callFrame.setReturnValue.bind(this.#callFrame)));
        }
        return extraProperties;
    }
}
export class DebuggerPausedDetails {
    debuggerModel;
    callFrames;
    reason;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auxData;
    breakpointIds;
    asyncStackTrace;
    asyncStackTraceId;
    constructor(debuggerModel, callFrames, reason, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auxData, breakpointIds, asyncStackTrace, asyncStackTraceId) {
        this.debuggerModel = debuggerModel;
        this.reason = reason;
        this.auxData = auxData;
        this.breakpointIds = breakpointIds;
        if (asyncStackTrace) {
            this.asyncStackTrace = this.cleanRedundantFrames(asyncStackTrace);
        }
        this.asyncStackTraceId = asyncStackTraceId;
        this.callFrames = CallFrame.fromPayloadArray(debuggerModel, callFrames, this.exception());
    }
    exception() {
        if (this.reason !== "exception" /* Protocol.Debugger.PausedEventReason.Exception */ &&
            this.reason !== "promiseRejection" /* Protocol.Debugger.PausedEventReason.PromiseRejection */) {
            return null;
        }
        return this.debuggerModel.runtimeModel().createRemoteObject(this.auxData);
    }
    cleanRedundantFrames(asyncStackTrace) {
        let stack = asyncStackTrace;
        let previous = null;
        while (stack) {
            if (previous && !stack.callFrames.length) {
                previous.parent = stack.parent;
            }
            else {
                previous = stack;
            }
            stack = stack.parent;
        }
        return asyncStackTrace;
    }
}
SDKModel.register(DebuggerModel, { capabilities: 4 /* Capability.JS */, autostart: true });
export const LOGPOINT_SOURCE_URL = 'debugger://logpoint';
export const COND_BREAKPOINT_SOURCE_URL = 'debugger://breakpoint';
//# sourceMappingURL=DebuggerModel.js.map