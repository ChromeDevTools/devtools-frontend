// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Network.GroupLookupInterface}
 */
Network.FrameGrouper = class {
  /**
   * @param {!Network.NetworkLogView} parentView
   */
  constructor(parentView) {
    this._parentView = parentView;
    /** @type {?ProductRegistry.Registry} */
    this._productRegistry = null;
    /** @type {!Map<!SDK.ResourceTreeFrame, !Network.FrameGroupNode>} */
    this._activeGroups = new Map();
  }

  /**
   * @override
   * @return {!Promise}
   */
  initialize() {
    return ProductRegistry.instance().then(productRegistry => {
      this._productRegistry = productRegistry;
      this._activeGroups.forEach(node => node.refresh());
    });
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest} request
   * @return {?Network.NetworkGroupNode}
   */
  groupNodeForRequest(request) {
    var frame = SDK.ResourceTreeModel.frameForRequest(request);
    if (!frame || frame.isMainFrame())
      return null;
    var groupNode = this._activeGroups.get(frame);
    if (groupNode)
      return groupNode;
    groupNode = new Network.FrameGroupNode(this._parentView, frame, this);
    this._activeGroups.set(frame, groupNode);
    return groupNode;
  }

  /**
   * @override
   */
  reset() {
    this._activeGroups.clear();
  }
};

Network.FrameGroupNode = class extends Network.NetworkGroupNode {
  /**
   * @param {!Network.NetworkLogView} parentView
   * @param {!SDK.ResourceTreeFrame} frame
   * @param {!Network.FrameGrouper} grouper
   */
  constructor(parentView, frame, grouper) {
    super(parentView);
    this._frame = frame;
    this._grouper = grouper;
    /** @type {?Network.NetworkNode._ProductEntryInfo|undefined} */
    this._productInfoEntryCache;
  }

  /**
   * @override
   * @return {boolean}
   */
  isFromFrame() {
    return true;
  }

  /**
   * @override
   */
  displayName() {
    var entryInfo = this._innerProductEntry();
    return entryInfo ? entryInfo.entry.name :
                       (new Common.ParsedURL(this._frame.url)).host || this._frame.name || '<iframe>';
  }

  /**
   * @override
   * @param {!Element} cell
   * @param {string} columnId
   */
  renderCell(cell, columnId) {
    super.renderCell(cell, columnId);
    if (columnId === 'name') {
      var name = this.displayName();
      cell.textContent = name;
      cell.title = name;
    }
    if (columnId === 'product') {
      var entryInfo = this._innerProductEntry();
      if (entryInfo)
        cell.textContent = entryInfo.entry.name;
    }
  }

  /**
   * @override
   * @return {!Promise<?Network.NetworkNode._ProductEntryInfo>}
   */
  productEntry() {
    return Promise.resolve(this._innerProductEntry());
  }

  /**
   * @return {?Network.NetworkNode._ProductEntryInfo}
   */
  _innerProductEntry() {
    if (this._productInfoEntryCache !== undefined)
      return this._productInfoEntryCache;
    var productRegistry = this._grouper._productRegistry;
    if (!productRegistry)
      return null;
    this._productInfoEntryCache = Network.NetworkNode.productEntryInfoForFrame(productRegistry, this._frame);
    return this._productInfoEntryCache;
  }
};
