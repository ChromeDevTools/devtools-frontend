// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js'; // eslint-disable-line no-unused-vars
import * as UI from '../../ui/legacy/legacy.js';

import {NetworkGroupNode} from './NetworkDataGridNode.js';
import type {GroupLookupInterface, NetworkLogView} from './NetworkLogView.js'; // eslint-disable-line no-unused-vars

export class NetworkFrameGrouper implements GroupLookupInterface {
  _parentView: NetworkLogView;
  _activeGroups: Map<SDK.ResourceTreeModel.ResourceTreeFrame, FrameGroupNode>;

  constructor(parentView: NetworkLogView) {
    this._parentView = parentView;
    this._activeGroups = new Map();
  }

  groupNodeForRequest(request: SDK.NetworkRequest.NetworkRequest): NetworkGroupNode|null {
    const frame = SDK.ResourceTreeModel.ResourceTreeModel.frameForRequest(request);
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

  reset(): void {
    this._activeGroups.clear();
  }
}

export class FrameGroupNode extends NetworkGroupNode {
  _frame: SDK.ResourceTreeModel.ResourceTreeFrame;

  constructor(parentView: NetworkLogView, frame: SDK.ResourceTreeModel.ResourceTreeFrame) {
    super(parentView);
    this._frame = frame;
  }

  displayName(): string {
    return new Common.ParsedURL.ParsedURL(this._frame.url).domain() || this._frame.name || '<iframe>';
  }

  renderCell(cell: HTMLElement, columnId: string): void {
    super.renderCell(cell, columnId);
    const columnIndex = (this.dataGrid as DataGrid.DataGrid.DataGridImpl<unknown>).indexOfVisibleColumn(columnId);
    if (columnIndex === 0) {
      const name = this.displayName();
      cell.appendChild(UI.Icon.Icon.create('largeicon-navigator-frame', 'network-frame-group-icon'));
      UI.UIUtils.createTextChild(cell, name);
      UI.Tooltip.Tooltip.install(cell, name);
      this.setCellAccessibleName(cell.textContent || '', cell, columnId);
    }
  }
}
