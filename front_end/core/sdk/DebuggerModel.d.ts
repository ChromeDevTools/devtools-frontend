import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import type { PageResourceLoadInitiator } from './PageResourceLoader.js';
import { type RemoteObject, RemoteObjectProperty } from './RemoteObject.js';
import { type EvaluationOptions, type EvaluationResult, type ExecutionContext, RuntimeModel } from './RuntimeModel.js';
import { Script } from './Script.js';
import { SDKModel } from './SDKModel.js';
import { SourceMapManager } from './SourceMapManager.js';
import { type Target } from './Target.js';
export declare function sortAndMergeRanges(locationRanges: Protocol.Debugger.LocationRange[]): Protocol.Debugger.LocationRange[];
export declare const enum StepMode {
    STEP_INTO = "StepInto",
    STEP_OUT = "StepOut",
    STEP_OVER = "StepOver"
}
export declare const WASM_SYMBOLS_PRIORITY: Protocol.Debugger.DebugSymbolsType[];
export declare class DebuggerModel extends SDKModel<EventTypes> {
    #private;
    readonly agent: ProtocolProxyApi.DebuggerApi;
    continueToLocationCallback: ((arg0: DebuggerPausedDetails) => boolean) | null;
    evaluateOnCallFrameCallback: ((arg0: CallFrame, arg1: EvaluationOptions) => Promise<EvaluationResult | null>) | null;
    constructor(target: Target);
    static selectSymbolSource(debugSymbols: Protocol.Debugger.DebugSymbols[] | null): Protocol.Debugger.DebugSymbols | null;
    sourceMapManager(): SourceMapManager<Script>;
    runtimeModel(): RuntimeModel;
    debuggerEnabled(): boolean;
    debuggerId(): string | null;
    private enableDebugger;
    syncDebuggerId(): Promise<Protocol.Debugger.EnableResponse>;
    private onFrameNavigated;
    private registerDebugger;
    isReadyToPause(): boolean;
    static modelForDebuggerId(debuggerId: string): Promise<DebuggerModel | null>;
    static resyncDebuggerIdForModels(): Promise<void>;
    private disableDebugger;
    private skipAllPauses;
    skipAllPausesUntilReloadOrTimeout(timeout: number): void;
    private pauseOnExceptionStateChanged;
    private asyncStackTracesStateChanged;
    private breakpointsActiveChanged;
    setComputeAutoStepRangesCallback(callback: ((arg0: StepMode, arg1: CallFrame) => Promise<LocationRange[]>) | null): void;
    private computeAutoStepSkipList;
    stepInto(): Promise<void>;
    stepOver(): Promise<void>;
    stepOut(): Promise<void>;
    scheduleStepIntoAsync(): void;
    resume(): void;
    pause(): void;
    setBreakpointByURL(url: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber?: number, condition?: BackendCondition): Promise<SetBreakpointResult>;
    setBreakpointInAnonymousScript(scriptHash: string, lineNumber: number, columnNumber?: number, condition?: BackendCondition): Promise<SetBreakpointResult>;
    removeBreakpoint(breakpointId: Protocol.Debugger.BreakpointId): Promise<void>;
    getPossibleBreakpoints(startLocation: Location, endLocation: Location | null, restrictToFunction: boolean): Promise<BreakLocation[]>;
    fetchAsyncStackTrace(stackId: Protocol.Runtime.StackTraceId): Promise<Protocol.Runtime.StackTrace | null>;
    breakpointResolved(breakpointId: string, location: Protocol.Debugger.Location): void;
    globalObjectCleared(): void;
    private reset;
    scripts(): Script[];
    scriptForId(scriptId: string): Script | null;
    /**
     * Returns all `Script` objects with the same provided `sourceURL`. The
     * resulting array is sorted by time with the newest `Script` in the front.
     */
    scriptsForSourceURL(sourceURL: string): Script[];
    scriptsForExecutionContext(executionContext: ExecutionContext): Script[];
    get callFrames(): CallFrame[] | null;
    debuggerPausedDetails(): DebuggerPausedDetails | null;
    private setDebuggerPausedDetails;
    private resetDebuggerPausedDetails;
    setBeforePausedCallback(callback: ((arg0: DebuggerPausedDetails, autoSteppingContext: Location | null) => Promise<boolean>) | null): void;
    setExpandCallFramesCallback(callback: ((arg0: CallFrame[]) => Promise<CallFrame[]>) | null): void;
    setEvaluateOnCallFrameCallback(callback: ((arg0: CallFrame, arg1: EvaluationOptions) => Promise<EvaluationResult | null>) | null): void;
    setSynchronizeBreakpointsCallback(callback: ((script: Script) => Promise<void>) | null): void;
    pausedScript(callFrames: Protocol.Debugger.CallFrame[], reason: Protocol.Debugger.PausedEventReason, auxData: Object | undefined, breakpointIds: string[], asyncStackTrace?: Protocol.Runtime.StackTrace, asyncStackTraceId?: Protocol.Runtime.StackTraceId): Promise<void>;
    resumedScript(): void;
    parsedScriptSource(scriptId: Protocol.Runtime.ScriptId, sourceURL: Platform.DevToolsPath.UrlString, startLine: number, startColumn: number, endLine: number, endColumn: number, executionContextId: number, hash: string, executionContextAuxData: any, isLiveEdit: boolean, sourceMapURL: string | undefined, hasSourceURLComment: boolean, hasSyntaxError: boolean, length: number, isModule: boolean | null, originStackTrace: Protocol.Runtime.StackTrace | null, codeOffset: number | null, scriptLanguage: string | null, debugSymbols: Protocol.Debugger.DebugSymbols[] | null, embedderName: Platform.DevToolsPath.UrlString | null, buildId: string | null): Script;
    setSourceMapURL(script: Script, newSourceMapURL: Platform.DevToolsPath.UrlString): void;
    setDebugInfoURL(script: Script, _externalURL: Platform.DevToolsPath.UrlString): Promise<void>;
    executionContextDestroyed(executionContext: ExecutionContext): void;
    private registerScript;
    private unregisterScript;
    private collectDiscardedScripts;
    createRawLocation(script: Script, lineNumber: number, columnNumber: number, inlineFrameIndex?: number): Location;
    createRawLocationByURL(sourceURL: string, lineNumber: number, columnNumber?: number, inlineFrameIndex?: number): Location | null;
    createRawLocationByScriptId(scriptId: Protocol.Runtime.ScriptId, lineNumber: number, columnNumber?: number, inlineFrameIndex?: number): Location;
    createRawLocationsByStackTrace(stackTrace: Protocol.Runtime.StackTrace): Location[];
    isPaused(): boolean;
    isPausing(): boolean;
    setSelectedCallFrame(callFrame: CallFrame | null): void;
    selectedCallFrame(): CallFrame | null;
    evaluateOnSelectedCallFrame(options: EvaluationOptions): Promise<EvaluationResult>;
    functionDetailsPromise(remoteObject: RemoteObject): Promise<FunctionDetails | null>;
    setVariableValue(scopeNumber: number, variableName: string, newValue: Protocol.Runtime.CallArgument, callFrameId: Protocol.Debugger.CallFrameId): Promise<string | undefined>;
    addBreakpointListener(breakpointId: string, listener: (arg0: Common.EventTarget.EventTargetEvent<Location>) => void, thisObject?: Object): void;
    removeBreakpointListener(breakpointId: string, listener: (arg0: Common.EventTarget.EventTargetEvent<Location>) => void, thisObject?: Object): void;
    setBlackboxPatterns(patterns: string[], skipAnonymous: boolean): Promise<boolean>;
    setBlackboxExecutionContexts(uniqueIds: string[]): Promise<boolean>;
    dispose(): void;
    suspendModel(): Promise<void>;
    resumeModel(): Promise<void>;
    private static shouldResyncDebuggerId;
    getEvaluateOnCallFrameCallback(): ((arg0: CallFrame, arg1: EvaluationOptions) => Promise<EvaluationResult | null>) | null;
    /**
     * Iterates the async stack trace parents.
     *
     * Retrieving cross-target async stack fragments requires CDP interaction, so this is an async generator.
     *
     * Important: This iterator will not yield the "synchronous" part of the stack trace, only the async parent chain.
     */
    iterateAsyncParents(stackTraceOrPausedDetails: Protocol.Runtime.StackTrace | DebuggerPausedDetails): AsyncGenerator<{
        stackTrace: Protocol.Runtime.StackTrace;
        target: Target;
    }>;
}
/**
 * Keep these in sync with WebCore::V8Debugger
 */
export declare enum PauseOnExceptionsState {
    DontPauseOnExceptions = "none",
    PauseOnAllExceptions = "all",
    PauseOnCaughtExceptions = "caught",
    PauseOnUncaughtExceptions = "uncaught"
}
export declare enum Events {
    DebuggerWasEnabled = "DebuggerWasEnabled",
    DebuggerWasDisabled = "DebuggerWasDisabled",
    DebuggerPaused = "DebuggerPaused",
    DebuggerResumed = "DebuggerResumed",
    DebugInfoAttached = "DebugInfoAttached",
    ParsedScriptSource = "ParsedScriptSource",
    DiscardedAnonymousScriptSource = "DiscardedAnonymousScriptSource",
    GlobalObjectCleared = "GlobalObjectCleared",
    CallFrameSelected = "CallFrameSelected",
    DebuggerIsReadyToPause = "DebuggerIsReadyToPause",
    ScriptSourceWasEdited = "ScriptSourceWasEdited"
}
export interface EventTypes {
    [Events.DebuggerWasEnabled]: DebuggerModel;
    [Events.DebuggerWasDisabled]: DebuggerModel;
    [Events.DebuggerPaused]: DebuggerModel;
    [Events.DebuggerResumed]: DebuggerModel;
    [Events.ParsedScriptSource]: Script;
    [Events.DiscardedAnonymousScriptSource]: Script;
    [Events.GlobalObjectCleared]: DebuggerModel;
    [Events.CallFrameSelected]: DebuggerModel;
    [Events.DebuggerIsReadyToPause]: DebuggerModel;
    [Events.DebugInfoAttached]: Script;
    [Events.ScriptSourceWasEdited]: {
        script: Script;
        status: Protocol.Debugger.SetScriptSourceResponseStatus;
    };
}
export declare class Location {
    debuggerModel: DebuggerModel;
    scriptId: Protocol.Runtime.ScriptId;
    lineNumber: number;
    columnNumber: number;
    inlineFrameIndex: number;
    constructor(debuggerModel: DebuggerModel, scriptId: Protocol.Runtime.ScriptId, lineNumber: number, columnNumber?: number, inlineFrameIndex?: number);
    static fromPayload(debuggerModel: DebuggerModel, payload: Protocol.Debugger.Location, inlineFrameIndex?: number): Location;
    payload(): Protocol.Debugger.Location;
    script(): Script | null;
    continueToLocation(pausedCallback?: (() => void)): void;
    private paused;
    id(): string;
}
export interface LocationRange {
    start: Location;
    end: Location;
}
export declare class BreakLocation extends Location {
    type: Protocol.Debugger.BreakLocationType | undefined;
    constructor(debuggerModel: DebuggerModel, scriptId: Protocol.Runtime.ScriptId, lineNumber: number, columnNumber?: number, type?: Protocol.Debugger.BreakLocationType);
    static fromPayload(debuggerModel: DebuggerModel, payload: Protocol.Debugger.BreakLocation): BreakLocation;
}
export interface MissingDebugFiles {
    resourceUrl: Platform.DevToolsPath.UrlString;
    initiator: PageResourceLoadInitiator;
}
export interface MissingDebugInfoDetails {
    details: string;
    resources: MissingDebugFiles[];
}
export declare class CallFrame {
    #private;
    debuggerModel: DebuggerModel;
    readonly script: Script;
    payload: Protocol.Debugger.CallFrame;
    readonly inlineFrameIndex: number;
    readonly functionName: string;
    missingDebugInfoDetails: MissingDebugInfoDetails | null;
    readonly exception: RemoteObject | null;
    readonly canBeRestarted: boolean;
    constructor(debuggerModel: DebuggerModel, script: Script, payload: Protocol.Debugger.CallFrame, inlineFrameIndex?: number, functionName?: string, exception?: RemoteObject | null);
    static fromPayloadArray(debuggerModel: DebuggerModel, callFrames: Protocol.Debugger.CallFrame[], exception: RemoteObject | null): CallFrame[];
    createVirtualCallFrame(inlineFrameIndex: number, name: string): CallFrame;
    get id(): Protocol.Debugger.CallFrameId;
    scopeChain(): Scope[];
    localScope(): Scope | null;
    thisObject(): RemoteObject | null;
    returnValue(): RemoteObject | null;
    setReturnValue(expression: string): Promise<RemoteObject | null>;
    location(): Location;
    functionLocation(): Location | null;
    evaluate(options: EvaluationOptions): Promise<EvaluationResult>;
    restart(): Promise<void>;
    getPayload(): Protocol.Debugger.CallFrame;
}
export interface ScopeChainEntry {
    callFrame(): CallFrame;
    type(): string;
    typeName(): string;
    name(): string | undefined;
    range(): LocationRange | null;
    object(): RemoteObject;
    description(): string;
    icon(): string | undefined;
    /**
     * Extra and/or synthetic properties that should be added to the `RemoteObject`
     * returned by {@link ScopeChainEntry.object}.
     */
    extraProperties(): RemoteObjectProperty[];
}
export declare class Scope implements ScopeChainEntry {
    #private;
    constructor(callFrame: CallFrame, ordinal: number);
    callFrame(): CallFrame;
    type(): string;
    typeName(): string;
    name(): string | undefined;
    range(): LocationRange | null;
    object(): RemoteObject;
    description(): string;
    icon(): undefined;
    extraProperties(): RemoteObjectProperty[];
}
export declare class DebuggerPausedDetails {
    debuggerModel: DebuggerModel;
    callFrames: CallFrame[];
    reason: Protocol.Debugger.PausedEventReason;
    auxData: Record<string, any> | undefined;
    breakpointIds: string[];
    asyncStackTrace: Protocol.Runtime.StackTrace | undefined;
    asyncStackTraceId: Protocol.Runtime.StackTraceId | undefined;
    constructor(debuggerModel: DebuggerModel, callFrames: Protocol.Debugger.CallFrame[], reason: Protocol.Debugger.PausedEventReason, auxData: Record<string, any> | undefined, breakpointIds: string[], asyncStackTrace?: Protocol.Runtime.StackTrace, asyncStackTraceId?: Protocol.Runtime.StackTraceId);
    private exception;
    private cleanRedundantFrames;
}
export interface FunctionDetails {
    location: Location | null;
    functionName: string;
}
export interface SetBreakpointResult {
    breakpointId: Protocol.Debugger.BreakpointId | null;
    locations: Location[];
}
export interface EventListenerPausedDetailsAuxData {
    eventName: string;
    targetName?: string;
    webglErrorName?: string;
    directiveText?: string;
}
export declare const enum BreakpointType {
    LOGPOINT = "LOGPOINT",
    CONDITIONAL_BREAKPOINT = "CONDITIONAL_BREAKPOINT",
    REGULAR_BREAKPOINT = "REGULAR_BREAKPOINT"
}
/**
 * A breakpoint condition as sent to V8. This helps distinguish
 * the breakpoint condition as it is entered by the user.
 */
export type BackendCondition = Platform.Brand.Brand<string, 'BackendCondition'>;
export declare const LOGPOINT_SOURCE_URL = "debugger://logpoint";
export declare const COND_BREAKPOINT_SOURCE_URL = "debugger://breakpoint";
