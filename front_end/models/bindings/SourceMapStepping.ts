// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Stepping through code with encoded source map scopes: inlined functions, outlined functions and unmapped code.
 *
 * Mirrors the Wasm auto-stepping: user steps get a skip list (see `DebuggerWorkspaceBinding.computeAutoStep`).
 */

import * as Root from '../../core/root/root.js';
import type * as SDK from '../../core/sdk/sdk.js';

interface ScopedPosition {
  sourceMap: SDK.SourceMap.SourceMap;
  script: SDK.Script.Script;
  /** Script-relative. */
  line: number;
  column: number;
}

/** @returns the script-relative position of {@link frame}, if it's in a script with encoded source map scopes. */
function scopedPosition(frame: SDK.DebuggerModel.CallFrame): ScopedPosition|null {
  if (!Root.Runtime.hostConfig.devToolsSourceMapScopesInSourcesPanel?.enabled) {
    return null;
  }
  const script = frame.script;
  const sourceMap = script.sourceMap();
  if (!sourceMap?.hasEncodedScopeInfo()) {
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
