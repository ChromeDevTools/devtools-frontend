// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class ProfileNode {
  /**
   * @param {!Protocol.Runtime.CallFrame} callFrame
   */
  constructor(callFrame) {
    /** @type {!Protocol.Runtime.CallFrame} */
    this.callFrame = callFrame;
    /** @type {string} */
    this.callUID = `${callFrame.functionName}@${callFrame.scriptId}:${callFrame.lineNumber}:${callFrame.columnNumber}`;
    /** @type {number} */
    this.self = 0;
    /** @type {number} */
    this.total = 0;
    /** @type {number} */
    this.id = 0;
    /** @type {?ProfileNode} */
    this.parent = null;
    /** @type {!Array<!ProfileNode>} */
    this.children = [];
  }

  /**
   * @return {string}
   */
  get functionName() {
    return this.callFrame.functionName;
  }

  /**
   * @return {string}
   */
  get scriptId() {
    return this.callFrame.scriptId;
  }

  /**
   * @return {string}
   */
  get url() {
    return this.callFrame.url;
  }

  /**
   * @return {number}
   */
  get lineNumber() {
    return this.callFrame.lineNumber;
  }

  /**
   * @return {number}
   */
  get columnNumber() {
    return this.callFrame.columnNumber;
  }
}

/**
 * @unrestricted
 */
export class ProfileTreeModel {
  /**
   * @param {?Target=} target
   */
  constructor(target) {
    this._target = target || null;
  }

  /**
   * @param {!ProfileNode} root
   * @protected
   */
  initialize(root) {
    this.root = root;
    this._assignDepthsAndParents();
    this.total = this._calculateTotals(this.root);
  }

  _assignDepthsAndParents() {
    const root = this.root;
    root.depth = -1;
    root.parent = null;
    this.maxDepth = 0;
    const nodesToTraverse = [root];
    while (nodesToTraverse.length) {
      const parent = nodesToTraverse.pop();
      const depth = parent.depth + 1;
      if (depth > this.maxDepth) {
        this.maxDepth = depth;
      }
      const children = parent.children;
      const length = children.length;
      for (let i = 0; i < length; ++i) {
        const child = children[i];
        child.depth = depth;
        child.parent = parent;
        if (child.children.length) {
          nodesToTraverse.push(child);
        }
      }
    }
  }

  /**
   * @param {!ProfileNode} root
   * @return {number}
   */
  _calculateTotals(root) {
    const nodesToTraverse = [root];
    const dfsList = [];
    while (nodesToTraverse.length) {
      const node = nodesToTraverse.pop();
      node.total = node.self;
      dfsList.push(node);
      nodesToTraverse.push(...node.children);
    }
    while (dfsList.length > 1) {
      const node = dfsList.pop();
      node.parent.total += node.total;
    }
    return root.total;
  }

  /**
   * @return {?Target}
   */
  target() {
    return this._target;
  }
}
