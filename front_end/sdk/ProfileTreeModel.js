// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SDK.ProfileNode = class {
  /**
   * @param {!Protocol.Runtime.CallFrame} callFrame
   */
  constructor(callFrame) {
    /** @type {!Protocol.Runtime.CallFrame} */
    this.callFrame = callFrame;
    /** @type {string} */
    this.callUID = `${this.callFrame.functionName}@${this.callFrame.scriptId}:${this.callFrame.lineNumber}`;
    /** @type {number} */
    this.self = 0;
    /** @type {number} */
    this.total = 0;
    /** @type {number} */
    this.id = 0;
    /** @type {?SDK.ProfileNode} */
    this.parent = null;
    /** @type {!Array<!SDK.ProfileNode>} */
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
};

/**
 * @unrestricted
 */
SDK.ProfileTreeModel = class {
  /**
   * @param {!SDK.ProfileNode} root
   * @protected
   */
  initialize(root) {
    this.root = root;
    this._assignDepthsAndParents();
    this.total = this._calculateTotals(this.root);
  }

  _assignDepthsAndParents() {
    var root = this.root;
    root.depth = -1;
    root.parent = null;
    this.maxDepth = 0;
    var nodesToTraverse = [root];
    while (nodesToTraverse.length) {
      var parent = nodesToTraverse.pop();
      var depth = parent.depth + 1;
      if (depth > this.maxDepth)
        this.maxDepth = depth;
      var children = parent.children;
      var length = children.length;
      for (var i = 0; i < length; ++i) {
        var child = children[i];
        child.depth = depth;
        child.parent = parent;
        if (child.children.length)
          nodesToTraverse.push(child);
      }
    }
  }

  /**
   * @param {!SDK.ProfileNode} root
   * @return {number}
   */
  _calculateTotals(root) {
    var nodesToTraverse = [root];
    var dfsList = [];
    while (nodesToTraverse.length) {
      var node = nodesToTraverse.pop();
      node.total = node.self;
      dfsList.push(node);
      nodesToTraverse.push(...node.children);
    }
    while (dfsList.length > 1) {
      var node = dfsList.pop();
      node.parent.total += node.total;
    }
    return root.total;
  }
};
