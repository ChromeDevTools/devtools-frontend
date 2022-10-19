// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import type * as Platform from '../platform/platform.js';

import {type Target} from './Target.js';

export class ProfileNode {
  callFrame: Protocol.Runtime.CallFrame;
  callUID: string;
  self: number;
  total: number;
  id: number;
  parent: ProfileNode|null;
  children: ProfileNode[];
  functionName: string;
  depth!: number;
  deoptReason!: string|null;
  /**
   * The target a node's call frame belongs to.
   */
  #target: Target|null;
  constructor(callFrame: Protocol.Runtime.CallFrame, target: Target|null) {
    this.callFrame = callFrame;
    this.callUID = `${callFrame.functionName}@${callFrame.scriptId}:${callFrame.lineNumber}:${callFrame.columnNumber}`;
    this.self = 0;
    this.total = 0;
    this.id = 0;
    this.functionName = callFrame.functionName;
    this.parent = null;
    this.children = [];
    this.#target = target;
  }

  get scriptId(): Protocol.Runtime.ScriptId {
    return String(this.callFrame.scriptId) as Protocol.Runtime.ScriptId;
  }

  get url(): Platform.DevToolsPath.UrlString {
    return this.callFrame.url as Platform.DevToolsPath.UrlString;
  }

  get lineNumber(): number {
    return this.callFrame.lineNumber;
  }

  get columnNumber(): number {
    return this.callFrame.columnNumber;
  }

  setFunctionName(name: string|null): void {
    if (name === null) {
      return;
    }
    this.functionName = name;
  }

  target(): Target|null {
    return this.#target;
  }
}

export class ProfileTreeModel {
  readonly #targetInternal: Target|null;
  root!: ProfileNode;
  total!: number;
  maxDepth!: number;
  constructor(target?: Target|null) {
    this.#targetInternal = target || null;
  }

  initialize(root: ProfileNode): void {
    this.root = root;
    this.assignDepthsAndParents();
    this.total = this.calculateTotals(this.root);
  }

  private assignDepthsAndParents(): void {
    const root = this.root;
    root.depth = -1;
    root.parent = null;
    this.maxDepth = 0;
    const nodesToTraverse = [root];
    while (nodesToTraverse.length) {
      const parent = (nodesToTraverse.pop() as ProfileNode);
      const depth = parent.depth + 1;
      if (depth > this.maxDepth) {
        this.maxDepth = depth;
      }
      const children = parent.children;
      for (const child of children) {
        child.depth = depth;
        child.parent = parent;
        if (child.children.length) {
          nodesToTraverse.push(child);
        }
      }
    }
  }

  private calculateTotals(root: ProfileNode): number {
    const nodesToTraverse = [root];
    const dfsList = [];
    while (nodesToTraverse.length) {
      const node = (nodesToTraverse.pop() as ProfileNode);
      node.total = node.self;
      dfsList.push(node);
      nodesToTraverse.push(...node.children);
    }
    while (dfsList.length > 1) {
      const node = (dfsList.pop() as ProfileNode);
      if (node.parent) {
        node.parent.total += node.total;
      }
    }
    return root.total;
  }

  target(): Target|null {
    return this.#targetInternal;
  }
}
