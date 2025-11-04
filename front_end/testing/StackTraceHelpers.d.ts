import type * as Protocol from '../generated/protocol.js';
import type * as StackTrace from '../models/stack_trace/stack_trace.js';
/**
 * Easily create `Protocol.Runtime.CallFrame`s by passing a string of the format: `<url>:<scriptId>:<name>:<line>:<column>`
 */
export declare function protocolCallFrame(descriptor: string): Protocol.Runtime.CallFrame;
export declare function stringifyFrame(frame: StackTrace.StackTrace.Frame): string;
export declare function stringifyFragment(fragment: StackTrace.StackTrace.Fragment): string;
export declare function stringifyAsyncFragment(fragment: StackTrace.StackTrace.AsyncFragment): string;
export declare function stringifyStackTrace(stackTrace: StackTrace.StackTrace.StackTrace): string;
