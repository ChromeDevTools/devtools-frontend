import type * as SDK from '../../core/sdk/sdk.js';
/** @returns the body of the innermost inlined function that {@link frame} is paused in (empty if none). */
export declare function inlinedFunctionRanges(frame: SDK.DebuggerModel.CallFrame): SDK.DebuggerModel.LocationRange[];
