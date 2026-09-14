// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../core/sdk/sdk.js';

const base64Digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeUnsignedVlq(n: number): string {
  // Encode into a base64 run.
  let result = '';
  do {
    // Extract the lowest 5 bits and remove them from the number.
    const digit = n & 0x1f;
    n >>>= 5;
    // If there's nothing left to, we are done encoding and we get base64Digits[digit].
    // Otherwise add the digit and the continuation bit base64Digits[0x20 + digit]
    result += base64Digits[n === 0 ? digit : 0x20 + digit];
  } while (n > 0);
  return result;
}

export function encodeVlq(n: number): string {
  // Set the sign bit as the least significant bit, then encode the result as unsigned.
  return encodeUnsignedVlq(n >= 0 ? 2 * n : 1 - 2 * n);
}

export function encodeVlqList(list: number[]): string {
  return list.map(encodeVlq).join('');
}

/**
 * Encode array mappings of the form "compiledLine:compiledColumn => srcFile:srcLine:srcColumn@name"
 * as a source map.
 *
 * A mapping may be suffixed with " (range)" to mark it as a range mapping, in which case a
 * `rangeMappings` field is emitted alongside `mappings`.
 **/
export function encodeSourceMap(textMap: string[], sourceRoot?: string): SDK.SourceMap.SourceMapV3Object {
  let mappings = '';
  const sources: string[] = [];
  const names: string[] = [];
  let sourcesContent: Array<null|string>|undefined;
  // Index of the current mapping within its generated line, and per line the indices of
  // the mappings that were marked as range mappings.
  let indexInLine = 0;
  const rangeMappingsByLine = new Map<number, number[]>();

  const state = {
    line: -1,
    column: 0,
    srcFile: 0,
    srcLine: 0,
    srcColumn: 0,
    srcName: 0,
  };

  for (const mapping of textMap) {
    let match = mapping.match(/^(\d+):(\d+)(?:\s*=>\s*([^:]+):(\d+):(\d+)(?:@(\S+))?)?(\s+\(range\))?$/);
    if (!match) {
      match = mapping.match(/^([^:]+):\s*(.+)$/);
      if (!match) {
        throw new Error(`Cannot parse mapping "${mapping}"`);
      }
      (sourcesContent = sourcesContent ?? [])[getOrAddString(sources, match[1])] = match[2];
      continue;
    }

    const lastState = Object.assign({}, state);
    state.line = Number(match[1]);
    state.column = Number(match[2]);
    const hasSource = match[3] !== undefined;
    const hasName = hasSource && (match[6] !== undefined);
    if (hasSource) {
      state.srcFile = getOrAddString(sources, match[3]);
      state.srcLine = Number(match[4]);
      state.srcColumn = Number(match[5]);
      if (hasName) {
        state.srcName = getOrAddString(names, match[6]);
      }
    }

    if (state.line < lastState.line) {
      throw new Error('Line numbers must be increasing');
    }

    const isNewLine = state.line !== lastState.line;

    if (isNewLine) {
      // Fixup for the first line mapping.
      if (lastState.line === -1) {
        lastState.line = 0;
      }
      // Insert semicolons for all the new lines.
      mappings += ';'.repeat(state.line - lastState.line);
      // Reset the compiled code column counter.
      lastState.column = 0;
      indexInLine = 0;
    } else {
      mappings += ',';
      indexInLine++;
    }

    if (match[7] !== undefined) {
      if (!hasSource) {
        throw new Error(`Mapping "${mapping}" cannot be a range mapping without an original position`);
      }
      const indices = rangeMappingsByLine.get(state.line) ?? [];
      indices.push(indexInLine);
      rangeMappingsByLine.set(state.line, indices);
    }

    // Encode the mapping and add it to the list of mappings.
    const toEncode = [state.column - lastState.column];
    if (hasSource) {
      toEncode.push(
          state.srcFile - lastState.srcFile, state.srcLine - lastState.srcLine, state.srcColumn - lastState.srcColumn);
      if (hasName) {
        toEncode.push(state.srcName - lastState.srcName);
      }
    }
    mappings += encodeVlqList(toEncode);
  }

  const sourceMapV3: SDK.SourceMap.SourceMapV3 = {version: 3, mappings, sources, names};
  if (rangeMappingsByLine.size > 0) {
    const lastLine = Math.max(...rangeMappingsByLine.keys());
    const encodedLines = [];
    for (let line = 0; line <= lastLine; ++line) {
      const indices = rangeMappingsByLine.get(line) ?? [];
      // The first index on a line is absolute, all following ones are relative to it.
      encodedLines.push(
          indices.map((index, i) => encodeUnsignedVlq(i === 0 ? index : index - indices[i - 1])).join(''));
    }
    sourceMapV3.rangeMappings = encodedLines.join(';');
  }
  if (sourceRoot !== undefined) {
    sourceMapV3.sourceRoot = sourceRoot;
  }
  if (sourcesContent !== undefined) {
    for (let i = 0; i < sources.length; ++i) {
      if (typeof sourcesContent[i] !== 'string') {
        sourcesContent[i] = null;
      }
    }
    sourceMapV3.sourcesContent = sourcesContent;
  }
  return sourceMapV3;

  function getOrAddString(array: string[], s: string) {
    const index = array.indexOf(s);
    if (index >= 0) {
      return index;
    }
    array.push(s);
    return array.length - 1;
  }
}

export function waitForAllSourceMapsProcessed(): Promise<unknown> {
  return Promise.all(SDK.TargetManager.TargetManager.instance().targets().map(target => {
    const model = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    return model.sourceMapManager().waitForSourceMapsProcessedForTest();
  }));
}
