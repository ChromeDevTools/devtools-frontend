import * as Common from '../../core/common/common.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
export type SymbolizedError = SymbolizedErrorObject;
export declare class SymbolizedErrorObject extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    readonly message: string;
    readonly stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace;
    readonly cause: SymbolizedError | null;
    constructor(message: string, stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace, cause: SymbolizedError | null);
    dispose(): void;
}
export declare const enum Events {
    UPDATED = "UPDATED"
}
export interface EventTypes {
    [Events.UPDATED]: void;
}
