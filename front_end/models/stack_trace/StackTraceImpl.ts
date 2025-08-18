// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Workspace from '../workspace/workspace.js';

import type * as StackTrace from './stack_trace.js';
import type {FrameNode} from './Trie.js';

export class StackTraceImpl extends Common.ObjectWrapper.ObjectWrapper<StackTrace.StackTrace.EventTypes> implements
    StackTrace.StackTrace.StackTrace {
  readonly syncFragment: FragmentImpl;
  readonly asyncFragments: readonly AsyncFragmentImpl[];

  constructor(syncFragment: FragmentImpl, asyncFragments: AsyncFragmentImpl[]) {
    super();
    this.syncFragment = syncFragment;
    this.asyncFragments = asyncFragments;

    syncFragment.stackTraces.add(this);
    this.asyncFragments.forEach(asyncFragment => asyncFragment.fragment.stackTraces.add(this));
  }
}

export class FragmentImpl implements StackTrace.StackTrace.Fragment {
  readonly node: FrameNode;
  readonly stackTraces = new Set<StackTraceImpl>();

  /**
   * Fragments are deduplicated based on the node.
   *
   * In turn, each fragment can be part of multiple stack traces.
   */
  static getOrCreate(node: FrameNode): FragmentImpl {
    if (!node.fragment) {
      node.fragment = new FragmentImpl(node);
    }
    return node.fragment;
  }

  private constructor(node: FrameNode) {
    this.node = node;
  }

  get frames(): FrameImpl[] {
    const frames: FrameImpl[] = [];

    for (const node of this.node.getCallStack()) {
      frames.push(...node.frames);
    }

    return frames;
  }
}

export class AsyncFragmentImpl implements StackTrace.StackTrace.AsyncFragment {
  constructor(readonly description: string, readonly fragment: FragmentImpl) {
  }

  get frames(): StackTrace.StackTrace.Frame[] {
    return this.fragment.frames;
  }
}

export class FrameImpl implements StackTrace.StackTrace.Frame {
  readonly url?: string;
  readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
  readonly name?: string;
  readonly line: number;
  readonly column: number;

  constructor(
      url: string|undefined, uiSourceCode: Workspace.UISourceCode.UISourceCode|undefined, name: string|undefined,
      line: number, column: number) {
    this.url = url;
    this.uiSourceCode = uiSourceCode;
    this.name = name;
    this.line = line;
    this.column = column;
  }
}
