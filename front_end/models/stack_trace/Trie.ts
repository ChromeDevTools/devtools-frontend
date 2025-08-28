// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';

import type {FragmentImpl, FrameImpl} from './StackTraceImpl.js';

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

export class FrameNode implements FrameNodeBase<FrameNode, AnyFrameNode> {
  readonly parent: AnyFrameNode;
  readonly children: FrameNode[] = [];

  readonly rawFrame: RawFrame;
  frames: FrameImpl[] = [];

  fragment?: FragmentImpl;

  constructor(rawFrame: RawFrame, parent: AnyFrameNode) {
    this.rawFrame = rawFrame;
    this.parent = parent;
  }

  /**
   * Produces the ancestor chain. Including `this` but excluding the `RootFrameNode`.
   */
  * getCallStack(): Generator<FrameNode> {
    // The `RootFrameNode` doesn't have an actual frame attached, that's why we check for `node.parent` instead of `node`.
    for (let node: AnyFrameNode|null = this; node.parent; node = node.parent) {
      yield node;
    }
  }
}

/**
 * Stores stack trace fragments in a trie, but does not own them/keep them alive.
 */
export class Trie {
  readonly #root: RootFrameNode = {parent: null, children: []};

  /**
   * Most sources produce stack traces in "top-to-bottom" order, so that is what this method expects.
   *
   * @returns The {@link FrameNode} corresponding to the top-most stack frame.
   */
  insert(frames: RawFrame[]): FrameNode {
    if (frames.length === 0) {
      throw new Error('Trie.insert called with an empty frames array.');
    }

    let currentNode: AnyFrameNode = this.#root;
    for (let i = frames.length - 1; i >= 0; --i) {
      currentNode = this.#insert(currentNode, frames[i]);
    }
    return currentNode as FrameNode;
  }

  /**
   * Inserts `rawFrame` into the children of the provided node if not already there.
   *
   * @returns the child node corresponding to `rawFrame`.
   */
  #insert(node: AnyFrameNode, rawFrame: RawFrame): FrameNode {
    let i = 0;
    for (; i < node.children.length; ++i) {
      const maybeChild = node.children[i];
      const child = maybeChild instanceof WeakRef ? maybeChild.deref() : maybeChild;
      if (!child) {
        continue;
      }

      const compareResult = compareRawFrames(child.rawFrame, rawFrame);
      if (compareResult === 0) {
        return child;
      }
      if (compareResult > 0) {
        break;
      }
    }

    const newNode = new FrameNode(rawFrame, node);
    if (node.parent) {
      node.children.splice(i, 0, newNode);
    } else {
      node.children.splice(i, 0, new WeakRef(newNode));
    }
    return newNode;
  }

  /**
   * Traverses the trie in pre-order.
   *
   * @param node Start at `node` or `null` to start with the children of the root.
   * @param visit Called on each node in the trie. Return `true` if the visitor should descend into child nodes of the provided node.
   */
  walk(node: FrameNode|null, visit: (node: FrameNode) => boolean): void {
    const stack =
        node ? [node] : [...this.#root.children].map(ref => ref.deref()).filter(node => Boolean(node)) as FrameNode[];

    for (let node = stack.pop(); node; node = stack.pop()) {
      const visitChildren = visit(node);
      if (visitChildren) {
        // Pushing the children in reverse means the "left-most" child is visited first (i.e. pre-order).
        for (let i = node.children.length - 1; i >= 0; --i) {
          stack.push(node.children[i]);
        }
      }
    }
  }
}

/**
 * @returns a number < 0, 0 or > 0, if the `a` is smaller then, equal or greater then `b`.
 */
export function compareRawFrames(a: RawFrame, b: RawFrame): number {
  const scriptIdCompare = (a.scriptId ?? '').localeCompare(b.scriptId ?? '');
  if (scriptIdCompare !== 0) {
    return scriptIdCompare;
  }

  const urlCompare = (a.url ?? '').localeCompare(b.url ?? '');
  if (urlCompare !== 0) {
    return urlCompare;
  }

  const nameCompare = (a.functionName ?? '').localeCompare(b.functionName ?? '');
  if (nameCompare !== 0) {
    return nameCompare;
  }

  if (a.lineNumber !== b.lineNumber) {
    return a.lineNumber - b.lineNumber;
  }

  return a.columnNumber - b.columnNumber;
}
