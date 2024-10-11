// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import type * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';

import {NetworkGroupNode} from './NetworkDataGridNode.js';
import type {GroupLookupInterface, NetworkLogView} from './NetworkLogView.js';

export class NetworkFrameGrouper implements GroupLookupInterface {
  private parentView: NetworkLogView;
  private readonly activeGroups: Map<SDK.ResourceTreeModel.ResourceTreeFrame, FrameGroupNode>;

  constructor(parentView: NetworkLogView) {
    this.parentView = parentView;
    this.activeGroups = new Map();
  }

  groupNodeForRequest(request: SDK.NetworkRequest.NetworkRequest): NetworkGroupNode|null {
    const frame = SDK.ResourceTreeModel.ResourceTreeModel.frameForRequest(request);
    if (!frame || frame.isOutermostFrame()) {
      return null;
    }
    let groupNode = this.activeGroups.get(frame);
    if (groupNode) {
      return groupNode;
    }
    groupNode = new FrameGroupNode(this.parentView, frame);
    this.activeGroups.set(frame, groupNode);
    return groupNode;
  }

  reset(): void {
    this.activeGroups.clear();
  }
}

export class FrameGroupNode extends NetworkGroupNode {
  private readonly frame: SDK.ResourceTreeModel.ResourceTreeFrame;

  constructor(parentView: NetworkLogView, frame: SDK.ResourceTreeModel.ResourceTreeFrame) {
    super(parentView);
    this.frame = frame;
  }

  override displayName(): string {
    return new Common.ParsedURL.ParsedURL(this.frame.url).domain() || this.frame.name || '<iframe>';
  }

  override renderCell(cell: HTMLElement, columnId: string): void {
    super.renderCell(cell, columnId);
    const columnIndex = (this.dataGrid as DataGrid.DataGrid.DataGridImpl<unknown>).indexOfVisibleColumn(columnId);
    if (columnIndex === 0) {
      const name = this.displayName();
      cell.appendChild(IconButton.Icon.create('frame', 'network-frame-group-icon'));
      UI.UIUtils.createTextChild(cell, name);
      UI.Tooltip.Tooltip.install(cell, name);
      this.setCellAccessibleName(cell.textContent || '', cell, columnId);
    }
  }
}
