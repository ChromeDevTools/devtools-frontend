// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../generated/protocol.js';
import type * as StackTrace from '../models/stack_trace/stack_trace.js';

/**
 * Easily create `Protocol.Runtime.CallFrame`s by passing a string of the format: `<url>:<scriptId>:<name>:<line>:<column>`
 */
export function protocolCallFrame(descriptor: string): Protocol.Runtime.CallFrame {
  const parts = descriptor.split(':', 5);
  return {
    url: parts[0],
    scriptId: parts[1] as Protocol.Runtime.ScriptId,
    functionName: parts[2],
    lineNumber: parts[3] ? Number.parseInt(parts[3], 10) : -1,
    columnNumber: parts[4] ? Number.parseInt(parts[4], 10) : -1,
  };
}

export function stringifyFrame(frame: StackTrace.StackTrace.Frame): string {
  let result = `at ${frame.name ?? '<anonymous>'}`;
  if (frame.uiSourceCode) {
    result += ` (${frame.uiSourceCode.displayName()}:${frame.line}:${frame.column})`;
  } else if (frame.url) {
    result += ` (${frame.url}:${frame.line}:${frame.column})`;
  }
  return result;
}

export function stringifyFragment(fragment: StackTrace.StackTrace.Fragment): string {
  return fragment.frames.map(stringifyFrame).join('\n');
}

export function stringifyAsyncFragment(fragment: StackTrace.StackTrace.AsyncFragment): string {
  const separatorLineLength = 40;
  const prefix = `--- ${fragment.description || 'async'} `;
  const separator = prefix + '-'.repeat(separatorLineLength - prefix.length);
  return separator + '\n' + stringifyFragment(fragment);
}

export function stringifyStackTrace(stackTrace: StackTrace.StackTrace.StackTrace): string {
  return [stringifyFragment(stackTrace.syncFragment), ...stackTrace.asyncFragments.map(stringifyAsyncFragment)].join(
      '\n');
}
