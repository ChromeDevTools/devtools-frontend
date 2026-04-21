import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
export declare class SymbolizedError extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    readonly remoteError: SDK.RemoteObject.RemoteError;
    readonly stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace;
    readonly cause: SymbolizedError | null;
    constructor(remoteError: SDK.RemoteObject.RemoteError, stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace, cause: SymbolizedError | null);
    dispose(): void;
}
export declare const enum Events {
    UPDATED = "UPDATED"
}
export interface EventTypes {
    [Events.UPDATED]: void;
}
