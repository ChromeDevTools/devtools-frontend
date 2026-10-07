// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Stepping through code with encoded source map scopes: inlined functions, outlined functions and unmapped code.
 *
 * Mirrors the Wasm auto-stepping: user steps get a skip list (see `DebuggerWorkspaceBinding.computeAutoStep`), and
 * pauses that don't correspond to a "logical" step are continued automatically ({@link nextAutoStep}).
 *
 * Outlined code is code of an authored function that the compiler moved into a separate generated function marked as
 * "hidden". A run of outlined frames on top of the stack is one logical frame together with the frame below them (the
 * "owner"), see {@link logicalDepth}.
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

/** @returns the number of leading frames that are outlined parts of the (logical) frame below them. */
function outlinedPrefixLength(callFrames: readonly SDK.DebuggerModel.CallFrame[]): number {
  let length = 0;
  for (const frame of callFrames) {
    const position = scopedPosition(frame);
    if (!position ||
        position.sourceMap.translateRawFrame(position.line, position.column)?.kind !==
            SDK.SourceMapScopesInfo.GeneratedFrameKind.OUTLINED) {
      break;
    }
    ++length;
  }
  return length;
}

/**
 * @returns the stack depth that doesn't count outlined frames on top of the stack. Entering or leaving an outlined
 *          part of a function doesn't change it, while calling a function increases it.
 */
export function logicalDepth(callFrames: readonly SDK.DebuggerModel.CallFrame[]): number {
  return callFrames.length - outlinedPrefixLength(callFrames);
}

/** @returns true iff {@link frame} has encoded scopes, and its position is not mapped to any source. */
export function isUnmapped(frame: SDK.DebuggerModel.CallFrame): boolean {
  const position = scopedPosition(frame);
  return position !== null && position.sourceMap.findEntry(position.line, position.column)?.sourceURL === undefined;
}

/** @returns true iff both frames have encoded scopes and are mapped to the same original location. */
export function isSameOriginalLocation(a: SDK.DebuggerModel.CallFrame, b: SDK.DebuggerModel.CallFrame): boolean {
  const entry = (frame: SDK.DebuggerModel.CallFrame): SDK.SourceMap.SourceMapEntry|null => {
    const position = scopedPosition(frame);
    return position?.sourceMap.findEntry(position.line, position.column) ?? null;
  };
  const entryA = entry(a);
  const entryB = entry(b);
  return entryA?.sourceURL !== undefined && entryA.sourceURL === entryB?.sourceURL &&
      entryA.sourceLineNumber === entryB.sourceLineNumber && entryA.sourceColumnNumber === entryB.sourceColumnNumber;
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

  switch (context.mode) {
    case SDK.DebuggerModel.StepMode.STEP_INTO:
      return isUnmapped(frames[0]) ? await computeAutoStep(SDK.DebuggerModel.StepMode.STEP_INTO, frames) : null;

    case SDK.DebuggerModel.StepMode.STEP_OVER: {
      const startDepth = logicalDepth(start);
      const depth = logicalDepth(frames);
      if (isUnmapped(frames[0]) || (depth === startDepth && isSameOriginalLocation(frames[0], start[0]))) {
        // Unmapped code, or still on the same original location (the skip list only covers the generated ranges that
        // contain the start position): keep stepping over.
        return await computeAutoStep(SDK.DebuggerModel.StepMode.STEP_OVER, frames);
      }
      return null;
    }

    case SDK.DebuggerModel.StepMode.STEP_OUT:
      // Stepping into calls of the unmapped code would present a pause inside the callee, so continue as step over.
      return isUnmapped(frames[0]) ? await computeAutoStep(SDK.DebuggerModel.StepMode.STEP_OVER, frames) : null;
  }
}
