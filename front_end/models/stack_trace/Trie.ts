// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';

import type * as StackTrace from './stack_trace.js';

/**
 * Intentionally very close to a {@link Protocol.Runtime.CallFrame} but with optional `scriptId`.
 */
export interface RawFrame {
  readonly scriptId?: Protocol.Runtime.ScriptId;
  readonly url?: string;
  readonly functionName?: string;
  readonly lineNumber: number;
  readonly columnNumber: number;
}

interface FrameNodeBase<ChildT, ParentT> {
  readonly parent: ParentT;
  readonly children: ChildT[];
}

type RootFrameNode = FrameNodeBase<WeakRef<FrameNode>, null>;
type AnyFrameNode = FrameNode|RootFrameNode;

export interface FrameNode extends FrameNodeBase<FrameNode, AnyFrameNode> {
  readonly rawFrame: RawFrame;
  frames: StackTrace.StackTrace.Frame[];
}

/**
 * Stores stack trace fragments in a trie, but does not own them/keep them alive.
 */
export class Trie {
  // eslint-disable-next-line no-unused-private-class-members
  readonly #root: RootFrameNode = {parent: null, children: []};

  insert(frames: RawFrame[]): FrameNode {
    if (frames.length === 0) {
      throw new Error('Trie.insert called with an empty frames array.');
    }

    // TODO(crbug.com/433162438): Implement it.
    throw new Error('Not implemented');
  }
}
