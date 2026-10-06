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
import * as Protocol from '../../generated/protocol.js';

interface ScopedPosition {
  sourceMap: SDK.SourceMap.SourceMap;
  script: SDK.Script.Script;
  /** Script-relative. */
  line: number;
  column: number;
}

/**
 * @returns the script-relative position of {@link frame}, if it's in a script with encoded source map scopes.
 *          Scopes without any mappings are ignored: every position would count as unmapped (see {@link isUnmapped}).
 */
function scopedPosition(frame: SDK.DebuggerModel.CallFrame): ScopedPosition|null {
  if (!Root.Runtime.hostConfig.devToolsSourceMapScopesInSourcesPanel?.enabled) {
    return null;
  }
  const script = frame.script;
  const sourceMap = script.sourceMap();
  if (!sourceMap?.hasEncodedScopeInfo() || sourceMap.mappings().length === 0) {
    return null;
  }
  const {lineNumber, columnNumber} = script.rawLocationToRelativeLocation(frame.location());
  return {sourceMap, script, line: lineNumber, column: columnNumber};
}

function toLocationRanges({script}: ScopedPosition,
                          ranges: readonly SDK.SourceMapScopesInfo.PositionRange[]): SDK.DebuggerModel.LocationRange[] {
  const toLocation = ({line, column}: {line: number, column: number}): SDK.DebuggerModel.Location => {
    const {lineNumber, columnNumber} = script.relativeLocationToRawLocation({lineNumber: line, columnNumber: column});
    return script.debuggerModel.createRawLocation(script, lineNumber, columnNumber);
  };
  return ranges.map(({start, end}) => ({start: toLocation(start), end: toLocation(end)}));
}

export function isScopedFrame(frame: SDK.DebuggerModel.CallFrame): boolean {
  return scopedPosition(frame) !== null;
}

/** @returns true iff {@link frame} has encoded scopes, and its position is not mapped to any source. */
export function isUnmapped(frame: SDK.DebuggerModel.CallFrame): boolean {
  const position = scopedPosition(frame);
  return position !== null && position.sourceMap.findEntry(position.line, position.column)?.sourceURL === undefined;
}

/** @returns the body of the innermost inlined function that {@link frame} is paused in (empty if none). */
export function inlinedFunctionRanges(frame: SDK.DebuggerModel.CallFrame): SDK.DebuggerModel.LocationRange[] {
  const position = scopedPosition(frame);
  const range = position?.sourceMap.inlinedFunctionRange(position.line, position.column);
  return position && range ? toLocationRanges(position, [range]) : [];
}

/** @returns the bodies of the functions inlined into the logical function that {@link frame} is paused in. */
export function inlinedCalleeRanges(frame: SDK.DebuggerModel.CallFrame): SDK.DebuggerModel.LocationRange[] {
  const position = scopedPosition(frame);
  return position ? toLocationRanges(position, position.sourceMap.inlinedCalleeRanges(position.line, position.column)) :
                    [];
}

/**
 * Decides whether the pause {@link details} completes the user's step {@link context}.
 *
 * @returns null to present the pause, or the step to issue instead.
 */
export async function nextAutoStep(
    details: SDK.DebuggerModel.DebuggerPausedDetails, context: SDK.DebuggerModel.StepContext|null,
    computeAutoStep: SDK.DebuggerModel.ComputeAutoStepCallback): Promise<SDK.DebuggerModel.AutoStep|null> {
  if (!context || details.reason !== Protocol.Debugger.PausedEventReason.Step) {
    return null;
  }
  const frames = details.callFrames;
  const start = context.callFrames;
  if (frames.length === 0 || start.length === 0 || (!isScopedFrame(frames[0]) && !isScopedFrame(start[0]))) {
    return null;
  }
  if (isUnmapped(frames[0])) {
    // Keep stepping through unmapped code. Stepping into calls of the unmapped code would present a pause inside the
    // callee, so a step out continues as step over.
    const mode = context.mode === SDK.DebuggerModel.StepMode.STEP_INTO ? SDK.DebuggerModel.StepMode.STEP_INTO :
                                                                         SDK.DebuggerModel.StepMode.STEP_OVER;
    return await computeAutoStep(mode, frames);
  }
  return null;
}
