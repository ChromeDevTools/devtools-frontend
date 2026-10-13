// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Platform from '../core/platform/platform.js';
import * as Protocol from '../generated/protocol.js';
import type * as StackTrace from '../models/stack_trace/stack_trace.js';
import type * as Workspace from '../models/workspace/workspace.js';

const {urlString} = Platform.DevToolsPath;

/**
 * Turns a plain frame object into a `StackTrace.Frame` (or any subtype) by adding a `toUiLocation` implementation
 * that mirrors the production one.
 */
export function stubFrame<T extends StackTrace.StackTrace.Frame>(frame: Omit<T, 'toUiLocation'>): T {
  const toUiLocation = (workspace: Workspace.Workspace.WorkspaceImpl): Workspace.UISourceCode.UILocation|null => {
    const uiSourceCode =
        frame.uiSourceCode ?? (frame.url ? workspace.uiSourceCodeForURL(urlString`${frame.url}`) : null);
    return uiSourceCode?.uiLocation(frame.line, frame.column) ?? null;
  };
  return {...frame, toUiLocation} as T;
}

/**
 * Easily create `Protocol.Runtime.CallFrame`s by passing a string of the format: `<url>:<scriptId>:<name>:<line>:<column>`
 */
export function protocolCallFrame(descriptor: string): Protocol.Runtime.CallFrame {
  // Since URLs can contain colons, we count from the end and rejoin the rest again.
  const parts = descriptor.split(':');
  return {
    url: parts.slice(0, -4).join(':'),
    scriptId: parts.at(-4) as Protocol.Runtime.ScriptId,
    functionName: parts.at(-3) ?? '',
    lineNumber: parts.at(-2) ? Number.parseInt(parts.at(-2)!, 10) : -1,
    columnNumber: parts.at(-1) ? Number.parseInt(parts.at(-1)!, 10) : -1,
  };
}

/**
 * Easily create `Protocol.Debugger.CallFrame`s by passing a string of the format: `<url>:<scriptId>:<name>:<line>:<column>`
 */
export function debuggerCallFrame(descriptor: string): Protocol.Debugger.CallFrame {
  // Since URLs can contain colons, we count from the end and rejoin the rest again.
  const parts = descriptor.split(':');
  return {
    url: parts.slice(0, -4).join(':'),
    callFrameId: 'cfid' + parts.at(-4)! as Protocol.Debugger.CallFrameId,
    this: {type: Protocol.Runtime.RemoteObjectType.Undefined},
    scopeChain: [],
    location: {
      scriptId: parts.at(-4) as Protocol.Runtime.ScriptId,
      lineNumber: parts.at(-2) ? Number.parseInt(parts.at(-2)!, 10) : -1,
      columnNumber: parts.at(-1) ? Number.parseInt(parts.at(-1)!, 10) : -1,
    },
    functionName: parts.at(-3) ?? '',
  };
}

export function stringifyFrame(frame: Pick<StackTrace.StackTrace.Frame, 'url'|'uiSourceCode'|'name'|'line'|'column'>):
    string {
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

export class StubStackTrace extends Common.ObjectWrapper.ObjectWrapper<StackTrace.StackTrace.EventTypes> implements
    StackTrace.StackTrace.StackTrace {
  readonly syncFragment: StackTrace.StackTrace.Fragment;
  readonly asyncFragments: StackTrace.StackTrace.AsyncFragment[];

  /**
   * Create a stub stack trace by passing a string of the format `<url>:<name>:<line>:<column>` for each frame.
   */
  static create(syncFragmentDescriptor: string[], asyncFragmentDescriptors: Array<{
                                                    description: string,
                                                    frames: string[],
                                                  }> = []): StubStackTrace {
    function toFrame(descriptor: string): StackTrace.StackTrace.Frame {
      // Since URLs can contain colons, we count from the end and rejoin the rest again.
      const parts = descriptor.split(':');
      return stubFrame({
        url: parts.slice(0, -3).join(':'),
        name: parts.at(-3) ?? '',
        line: parts.at(-2) ? Number.parseInt(parts.at(-2)!, 10) : -1,
        column: parts.at(-1) ? Number.parseInt(parts.at(-1)!, 10) : -1,
      });
    }

    return new StubStackTrace(
        {frames: syncFragmentDescriptor.map(toFrame)},
        asyncFragmentDescriptors.map(
            fragment => ({description: fragment.description, frames: fragment.frames.map(toFrame)})));
  }

  constructor(syncFragment: StackTrace.StackTrace.Fragment, asyncFragments: StackTrace.StackTrace.AsyncFragment[]) {
    super();
    this.syncFragment = syncFragment;
    this.asyncFragments = asyncFragments;
  }
}

export class StubParsedErrorStackTrace extends Common.ObjectWrapper.ObjectWrapper<StackTrace.StackTrace.EventTypes>
    implements StackTrace.StackTrace.ParsedErrorStackTrace {
  readonly syncFragment: StackTrace.StackTrace.ParsedErrorStackFragment;
  readonly asyncFragments: StackTrace.StackTrace.AsyncFragment[];

  static create(syncFrames: Array<Partial<StackTrace.StackTrace.ParsedErrorStackFrame>>,
                asyncFragments: Array<{
                  description: string,
                  frames: Array<Partial<StackTrace.StackTrace.ParsedErrorStackFrame>>,
                }> = []): StubParsedErrorStackTrace {
    const toFrame =
        (frame: Partial<StackTrace.StackTrace.ParsedErrorStackFrame>): StackTrace.StackTrace.ParsedErrorStackFrame => {
          return stubFrame<StackTrace.StackTrace.ParsedErrorStackFrame>({
            line: -1,
            column: -1,
            ...frame,
          });
        };
    return new StubParsedErrorStackTrace(
        {frames: syncFrames.map(toFrame)},
        asyncFragments.map(fragment => ({description: fragment.description, frames: fragment.frames.map(toFrame)})));
  }

  constructor(syncFragment: StackTrace.StackTrace.ParsedErrorStackFragment,
              asyncFragments: StackTrace.StackTrace.AsyncFragment[] = []) {
    super();
    this.syncFragment = syncFragment;
    this.asyncFragments = asyncFragments;
  }
}
