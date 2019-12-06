// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Network.GroupLookupInterface}
 */
export default class NetworkFrameGrouper {
  /**
   * @param {!Network.NetworkLogView} parentView
   */
  constructor(parentView) {
    this._parentView = parentView;
    /** @type {!Map<!SDK.ResourceTreeFrame, !FrameGroupNode>} */
    this._activeGroups = new Map();
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest} request
   * @return {?Network.NetworkGroupNode}
   */
  groupNodeForRequest(request) {
    const frame = SDK.ResourceTreeModel.frameForRequest(request);
    if (!frame || frame.isTopFrame()) {
      return null;
    }
    let groupNode = this._activeGroups.get(frame);
    if (groupNode) {
      return groupNode;
    }
    groupNode = new FrameGroupNode(this._parentView, frame);
    this._activeGroups.set(frame, groupNode);
    return groupNode;
  }

  /**
   * @override
   */
  reset() {
    this._activeGroups.clear();
  }
}

export class FrameGroupNode extends Network.NetworkGroupNode {
  /**
   * @param {!Network.NetworkLogView} parentView
   * @param {!SDK.ResourceTreeFrame} frame
   */
  constructor(parentView, frame) {
    super(parentView);
    this._frame = frame;
  }

  /**
   * @override
   */
  displayName() {
    return new Common.ParsedURL(this._frame.url).domain() || this._frame.name || '<iframe>';
  }

  /**
   * @override
   * @param {!Element} cell
   * @param {string} columnId
   */
  renderCell(cell, columnId) {
    super.renderCell(cell, columnId);
    const columnIndex = this.dataGrid.indexOfVisibleColumn(columnId);
    if (columnIndex === 0) {
      const name = this.displayName();
      cell.appendChild(UI.Icon.create('largeicon-navigator-frame', 'network-frame-group-icon'));
      cell.createTextChild(name);
      cell.title = name;
    }
  }
}

/* Legacy exported object */
self.Network = self.Network || {};

/* Legacy exported object */
Network = Network || {};

/**
 * @constructor
 */
Network.NetworkFrameGrouper = NetworkFrameGrouper;

/**
 * @constructor
 */
Network.FrameGroupNode = FrameGroupNode;
