import type * as SDK from '../../core/sdk/sdk.js';
import type * as StackTrace from '../stack_trace/stack_trace.js';
export declare class SymbolizedError {
    readonly remoteError: SDK.RemoteObject.RemoteError;
    readonly stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace;
    readonly cause: SymbolizedError | null;
    constructor(remoteError: SDK.RemoteObject.RemoteError, stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace, cause: SymbolizedError | null);
}
