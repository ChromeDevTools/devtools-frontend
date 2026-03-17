import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';
import { type CommandHandlerResponse, MockCDPConnection } from './MockCDPConnection.js';
import { createTarget } from './TargetHelpers.js';
import { TestUniverse } from './TestUniverse.js';
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
/**
 * @deprecated Use {@link MockDebuggerBackend} instead.
 */
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
/**
 * Drop-in replacement for {@link MockProtocolBackend} but doesn't use any global state.
 *
 * Creates a new {@link TestUniverse}, accessible via `mockDebuggerBackend.universe`.
 */
export declare class MockDebuggerBackend {
    #private;
    readonly universe: TestUniverse;
    /** The mock connection used for all targets created with this MockDebuggerBackend instance */
    readonly cdpConnection: MockCDPConnection;
    constructor();
    createTarget(options?: Parameters<typeof createTarget>[0]): SDK.Target.Target;
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
    responderToBreakpointByUrlRequest(url: string, lineNumber: number): (response: CommandHandlerResponse<'Debugger.setBreakpointByUrl'>) => Promise<void>;
    setBreakpointByUrlToFail(url: string, lineNumber: number): void;
    breakpointRemovedPromise(breakpointId: Protocol.Debugger.BreakpointId): Promise<void>;
}
export {};
