import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
import type * as Workspace from '../workspace/workspace.js';
import type { DebuggerWorkspaceBinding } from './DebuggerWorkspaceBinding.js';
export type SymbolizedError = SymbolizedErrorObject | SymbolizedSyntaxError;
export declare class SymbolizedErrorObject extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    readonly message: string;
    readonly stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace;
    readonly cause: SymbolizedError | null;
    constructor(message: string, stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace, cause: SymbolizedError | null);
    dispose(): void;
}
export declare class SymbolizedSyntaxError extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    readonly message: string;
    constructor(message: string);
    get uiLocation(): Workspace.UISourceCode.UILocation | null;
    static fromExceptionDetails(target: SDK.Target.Target, debuggerWorkspaceBinding: DebuggerWorkspaceBinding, exceptionDetails: Protocol.Runtime.ExceptionDetails): Promise<SymbolizedSyntaxError | null>;
}
export declare const enum Events {
    UPDATED = "UPDATED"
}
export interface EventTypes {
    [Events.UPDATED]: void;
}
