import * as SDK from '../../core/sdk/sdk.js';
export declare function isScopedFrame(frame: SDK.DebuggerModel.CallFrame): boolean;
/** @returns true iff {@link frame} has encoded scopes, and its position is not mapped to any source. */
export declare function isUnmapped(frame: SDK.DebuggerModel.CallFrame): boolean;
/** @returns true iff both frames have encoded scopes and are mapped to the same original location. */
export declare function isSameOriginalLocation(a: SDK.DebuggerModel.CallFrame, b: SDK.DebuggerModel.CallFrame): boolean;
/** @returns the body of the innermost inlined function that {@link frame} is paused in (empty if none). */
export declare function inlinedFunctionRanges(frame: SDK.DebuggerModel.CallFrame): SDK.DebuggerModel.LocationRange[];
/** @returns the bodies of the functions inlined into the logical function that {@link frame} is paused in. */
export declare function inlinedCalleeRanges(frame: SDK.DebuggerModel.CallFrame): SDK.DebuggerModel.LocationRange[];
/**
 * Decides whether the pause {@link details} completes the user's step {@link context}.
 *
 * @returns null to present the pause, or the step to issue instead.
 */
export declare function nextAutoStep(details: SDK.DebuggerModel.DebuggerPausedDetails, context: SDK.DebuggerModel.StepContext | null, computeAutoStep: SDK.DebuggerModel.ComputeAutoStepCallback): Promise<SDK.DebuggerModel.AutoStep | null>;
