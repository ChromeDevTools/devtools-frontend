import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';
interface ScriptDescription {
    url: string;
    content: string;
    hasSourceURL?: boolean;
    startLine?: number;
    startColumn?: number;
    isContentScript?: boolean;
    embedderName?: string;
    executionContextId?: number;
}
export declare class MockProtocolBackend {
    #private;
    constructor();
    dispatchDebuggerPause(script: SDK.Script.Script, reason: Protocol.Debugger.PausedEventReason, functionName?: string, scopeChain?: Protocol.Debugger.Scope[]): void;
    dispatchDebuggerPauseWithNoCallFrames(target: SDK.Target.Target, reason: Protocol.Debugger.PausedEventReason): void;
    addScript(target: SDK.Target.Target, scriptDescription: ScriptDescription, sourceMap: {
        url: string;
        content: string | SDK.SourceMap.SourceMapV3;
    } | null): Promise<SDK.Script.Script>;
    createSimpleRemoteObject(properties: Array<{
        name: string;
        value?: number;
    }>): Protocol.Runtime.RemoteObject;
    createCallFrame(target: SDK.Target.Target, script: {
        url: string;
        content: string;
    }, scopeDescriptor: string, sourceMap: {
        url: string;
        content: string;
    } | null, scopeObjects?: Protocol.Runtime.RemoteObject[]): Promise<SDK.DebuggerModel.CallFrame>;
    responderToBreakpointByUrlRequest(url: string, lineNumber: number): (response: Omit<Protocol.Debugger.SetBreakpointByUrlResponse, 'getError'>) => Promise<void>;
    setBreakpointByUrlToFail(url: string, lineNumber: number): void;
    breakpointRemovedPromise(breakpointId: Protocol.Debugger.BreakpointId): Promise<void>;
}
interface ScopePosition {
    type: Protocol.Debugger.ScopeType;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}
export declare function parseScopeChain(scopeDescriptor: string): ScopePosition[];
export {};
