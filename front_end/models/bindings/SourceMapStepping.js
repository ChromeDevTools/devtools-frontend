// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Stepping through code with encoded source map scopes: inlined functions, outlined functions and unmapped code.
 *
 * Mirrors the Wasm auto-stepping: user steps get a skip list (see `DebuggerWorkspaceBinding.computeAutoStep`), and
 * pauses that don't correspond to a "logical" step are continued automatically ({@link nextAutoStep}).
 */
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
/**
 * @returns the script-relative position of {@link frame}, if it's in a script with encoded source map scopes.
 *          Scopes without any mappings are ignored: every position would count as unmapped (see {@link isUnmapped}).
 */
function scopedPosition(frame) {
    if (!Root.Runtime.hostConfig.devToolsSourceMapScopesInSourcesPanel?.enabled) {
        return null;
    }
    const script = frame.script;
    const sourceMap = script.sourceMap();
    if (!sourceMap?.hasEncodedScopeInfo() || sourceMap.mappings().length === 0) {
        return null;
    }
    const { lineNumber, columnNumber } = script.rawLocationToRelativeLocation(frame.location());
    return { sourceMap, script, line: lineNumber, column: columnNumber };
}
function toLocationRanges({ script }, ranges) {
    const toLocation = ({ line, column }) => {
        const { lineNumber, columnNumber } = script.relativeLocationToRawLocation({ lineNumber: line, columnNumber: column });
        return script.debuggerModel.createRawLocation(script, lineNumber, columnNumber);
    };
    return ranges.map(({ start, end }) => ({ start: toLocation(start), end: toLocation(end) }));
}
export function isScopedFrame(frame) {
    return scopedPosition(frame) !== null;
}
/** @returns true iff {@link frame} has encoded scopes, and its position is not mapped to any source. */
export function isUnmapped(frame) {
    const position = scopedPosition(frame);
    return position !== null && position.sourceMap.findEntry(position.line, position.column)?.sourceURL === undefined;
}
/** @returns true iff both frames have encoded scopes and are mapped to the same original location. */
export function isSameOriginalLocation(a, b) {
    const entry = (frame) => {
        const position = scopedPosition(frame);
        return position?.sourceMap.findEntry(position.line, position.column) ?? null;
    };
    const entryA = entry(a);
    const entryB = entry(b);
    return entryA?.sourceURL !== undefined && entryA.sourceURL === entryB?.sourceURL &&
        entryA.sourceLineNumber === entryB.sourceLineNumber && entryA.sourceColumnNumber === entryB.sourceColumnNumber;
}
/** @returns the body of the innermost inlined function that {@link frame} is paused in (empty if none). */
export function inlinedFunctionRanges(frame) {
    const position = scopedPosition(frame);
    const range = position?.sourceMap.inlinedFunctionRange(position.line, position.column);
    return position && range ? toLocationRanges(position, [range]) : [];
}
/** @returns the bodies of the functions inlined into the logical function that {@link frame} is paused in. */
export function inlinedCalleeRanges(frame) {
    const position = scopedPosition(frame);
    return position ? toLocationRanges(position, position.sourceMap.inlinedCalleeRanges(position.line, position.column)) :
        [];
}
/**
 * Decides whether the pause {@link details} completes the user's step {@link context}.
 *
 * @returns null to present the pause, or the step to issue instead.
 */
export async function nextAutoStep(details, context, computeAutoStep) {
    if (!context || details.reason !== "step" /* Protocol.Debugger.PausedEventReason.Step */) {
        return null;
    }
    const frames = details.callFrames;
    const start = context.callFrames;
    if (frames.length === 0 || start.length === 0 || (!isScopedFrame(frames[0]) && !isScopedFrame(start[0]))) {
        return null;
    }
    switch (context.mode) {
        case "StepInto" /* SDK.DebuggerModel.StepMode.STEP_INTO */:
            return isUnmapped(frames[0]) ? await computeAutoStep("StepInto" /* SDK.DebuggerModel.StepMode.STEP_INTO */, frames) : null;
        case "StepOver" /* SDK.DebuggerModel.StepMode.STEP_OVER */: {
            const startDepth = start.length;
            const depth = frames.length;
            if (isUnmapped(frames[0]) || (depth === startDepth && isSameOriginalLocation(frames[0], start[0]))) {
                // Unmapped code, or still on the same original location (the skip list only covers the generated ranges that
                // contain the start position): keep stepping over.
                return await computeAutoStep("StepOver" /* SDK.DebuggerModel.StepMode.STEP_OVER */, frames);
            }
            return null;
        }
        case "StepOut" /* SDK.DebuggerModel.StepMode.STEP_OUT */:
            // Stepping into calls of the unmapped code would present a pause inside the callee, so continue as step over.
            return isUnmapped(frames[0]) ? await computeAutoStep("StepOver" /* SDK.DebuggerModel.StepMode.STEP_OVER */, frames) : null;
    }
}
//# sourceMappingURL=SourceMapStepping.js.map