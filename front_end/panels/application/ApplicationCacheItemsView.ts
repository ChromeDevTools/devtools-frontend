// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2010 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

import type {ApplicationCacheModel} from './ApplicationCacheModel.js';
import {CHECKING, DOWNLOADING, IDLE, OBSOLETE, UNCACHED, UPDATEREADY} from './ApplicationCacheModel.js';

const UIStrings = {
  /**
  *@description Text in Application Cache Items View of the Application panel
  */
  appcache: 'AppCache',
  /**
  *@description Text to delete something
  */
  deleteString: 'Delete',
  /**
  *@description Text in Application Cache Items View of the Application panel
  */
  noApplicationCacheInformation: 'No Application Cache information available.',
  /**
  *@description Text to indicate the network connectivity is online
  */
  online: 'Online',
  /**
  *@description Text to indicate the network connectivity is offline
  */
  offline: 'Offline',
  /**
  *@description Text that refers to the resources of the web page
  */
  resource: 'Resource',
  /**
  *@description Text that refers to some types
  */
  typeString: 'Type',
  /**
  *@description Text for the size of something
  */
  sizeString: 'Size',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  applicationCache: 'Application Cache',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ApplicationCacheItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ApplicationCacheItemsView extends UI.View.SimpleView {
  private readonly model: ApplicationCacheModel;
  private readonly deleteButton: UI.Toolbar.ToolbarButton;
  private connectivityIcon: UI.UIUtils.DevToolsIconLabel;
  private statusIcon: UI.UIUtils.DevToolsIconLabel;
  private readonly frameId: Protocol.Page.FrameId;
  private readonly emptyWidget: UI.EmptyWidget.EmptyWidget;
  private readonly nodeResources:
      WeakMap<DataGrid.DataGrid.DataGridNode<unknown>, Protocol.ApplicationCache.ApplicationCacheResource>;
  private viewDirty?: boolean;
  private status?: number;
  private manifest?: string;
  private creationTime?: number;
  private updateTime?: number;
  private size?: number;
  private resources?: Protocol.ApplicationCache.ApplicationCacheResource[];
  private dataGrid?: DataGrid.DataGrid.DataGridImpl<unknown>;

  constructor(model: ApplicationCacheModel, frameId: Protocol.Page.FrameId) {
    super(i18nString(UIStrings.appcache));

    this.model = model;

    this.element.classList.add('storage-view', 'table');

    this.deleteButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.deleteString), 'largeicon-delete');
    this.deleteButton.setVisible(false);
    this.deleteButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.deleteButtonClicked, this);
    this.connectivityIcon = (document.createElement('span', {is: 'dt-icon-label'}) as UI.UIUtils.DevToolsIconLabel);
    this.connectivityIcon.style.margin = '0 2px 0 5px';
    this.statusIcon = (document.createElement('span', {is: 'dt-icon-label'}) as UI.UIUtils.DevToolsIconLabel);
    this.statusIcon.style.margin = '0 2px 0 5px';

    this.frameId = frameId;

    this.emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noApplicationCacheInformation));
    this.emptyWidget.show(this.element);

    this.markDirty();

    const status = this.model.frameManifestStatus(frameId);
    this.updateStatus(status);
    this.updateNetworkState(this.model.onLine);
    (this.deleteButton.element as HTMLElement).style.display = 'none';

    this.nodeResources = new WeakMap();
  }

  async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    return [
      this.deleteButton,
      new UI.Toolbar.ToolbarItem(this.connectivityIcon),
      new UI.Toolbar.ToolbarSeparator(),
      new UI.Toolbar.ToolbarItem(this.statusIcon),
    ];
  }

  wasShown(): void {
    this.maybeUpdate();
  }

  willHide(): void {
    this.deleteButton.setVisible(false);
  }

  private maybeUpdate(): void {
    if (!this.isShowing() || !this.viewDirty) {
      return;
    }

    this.update();
    this.viewDirty = false;
  }

  private markDirty(): void {
    this.viewDirty = true;
  }

  updateStatus(status: number): void {
    const oldStatus = this.status;
    this.status = status;

    const statusInformation = new Map([
      // We should never have UNCACHED status, since we remove frames with UNCACHED application cache status from the tree.
      [UNCACHED, {type: 'smallicon-red-ball', text: 'UNCACHED'}],
      [IDLE, {type: 'smallicon-green-ball', text: 'IDLE'}],
      [CHECKING, {type: 'smallicon-orange-ball', text: 'CHECKING'}],
      [DOWNLOADING, {type: 'smallicon-orange-ball', text: 'DOWNLOADING'}],
      [UPDATEREADY, {type: 'smallicon-green-ball', text: 'UPDATEREADY'}],
      [OBSOLETE, {type: 'smallicon-red-ball', text: 'OBSOLETE'}],
    ]);
    const info = statusInformation.get(status) || statusInformation.get(UNCACHED);
    if (info) {
      this.statusIcon.type = info.type;
      this.statusIcon.textContent = info.text;
    }

    if (this.isShowing() && this.status === IDLE && (oldStatus === UPDATEREADY || !this.resources)) {
      this.markDirty();
    }
    this.maybeUpdate();
  }

  updateNetworkState(isNowOnline: boolean): void {
    if (isNowOnline) {
      this.connectivityIcon.type = 'smallicon-green-ball';
      this.connectivityIcon.textContent = i18nString(UIStrings.online);
    } else {
      this.connectivityIcon.type = 'smallicon-red-ball';
      this.connectivityIcon.textContent = i18nString(UIStrings.offline);
    }
  }

  private async update(): Promise<void> {
    const applicationCache = await this.model.requestApplicationCache(this.frameId);

    if (!applicationCache || !applicationCache.manifestURL) {
      delete this.manifest;
      delete this.creationTime;
      delete this.updateTime;
      delete this.size;
      delete this.resources;

      this.emptyWidget.show(this.element);
      this.deleteButton.setVisible(false);
      if (this.dataGrid) {
        this.dataGrid.element.classList.add('hidden');
      }
      return;
    }
    // FIXME: are these variables needed anywhere else?
    this.manifest = applicationCache.manifestURL;
    this.creationTime = applicationCache.creationTime;
    this.updateTime = applicationCache.updateTime;
    this.size = applicationCache.size;
    this.resources = applicationCache.resources;

    if (!this.dataGrid) {
      this.createDataGrid();
    }

    this.populateDataGrid();
    if (this.dataGrid) {
      this.dataGrid.autoSizeColumns(20, 80);
      this.dataGrid.element.classList.remove('hidden');
    }
    this.emptyWidget.detach();
    this.deleteButton.setVisible(true);

    // FIXME: For Chrome, put creationTime and updateTime somewhere.
    // NOTE: localizedString has not yet been added.
    // i18nString("(%s) Created: %s Updated: %s", this.size, this.creationTime, this.updateTime);
  }

  private createDataGrid(): void {
    const columns = ([
      {id: 'resource', title: i18nString(UIStrings.resource), sort: DataGrid.DataGrid.Order.Ascending, sortable: true},
      {id: 'type', title: i18nString(UIStrings.typeString), sortable: true},
      {id: 'size', title: i18nString(UIStrings.sizeString), align: DataGrid.DataGrid.Align.Right, sortable: true},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    const parameters: DataGrid.DataGrid.Parameters = {
      displayName: i18nString(UIStrings.applicationCache),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined,
    };
    this.dataGrid = new DataGrid.DataGrid.DataGridImpl(parameters);
    this.dataGrid.setStriped(true);
    this.dataGrid.asWidget().show(this.element);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this.populateDataGrid, this);
  }

  private populateDataGrid(): void {
    if (!this.dataGrid) {
      return;
    }
    const selectedResource: Protocol.ApplicationCache.ApplicationCacheResource|null =
        (this.dataGrid.selectedNode ? this.nodeResources.get(this.dataGrid.selectedNode) : null) || null;
    const sortDirection = this.dataGrid.isSortOrderAscending() ? 1 : -1;

    function numberCompare(
        field: keyof Platform.TypeScriptUtilities
            .PickFieldsThatExtend<Protocol.ApplicationCache.ApplicationCacheResource, number>,
        resource1: Protocol.ApplicationCache.ApplicationCacheResource,
        resource2: Protocol.ApplicationCache.ApplicationCacheResource): number {
      return sortDirection * (resource1[field] - resource2[field]);
    }

    function localeCompare(
        field: keyof Platform.TypeScriptUtilities
            .PickFieldsThatExtend<Protocol.ApplicationCache.ApplicationCacheResource, string>,
        resource1: Protocol.ApplicationCache.ApplicationCacheResource,
        resource2: Protocol.ApplicationCache.ApplicationCacheResource): number {
      return sortDirection * resource1[field].localeCompare(resource2[field]);
    }

    let comparator = null;
    switch (this.dataGrid.sortColumnId()) {
      case 'resource':
        comparator = localeCompare.bind(null, 'url');
        break;
      case 'type':
        comparator = localeCompare.bind(null, 'type');
        break;
      case 'size':
        comparator = numberCompare.bind(null, 'size');
        break;
    }

    this.dataGrid.rootNode().removeChildren();
    if (!this.resources) {
      return;
    }
    if (comparator) {
      this.resources.sort(comparator);
    }

    let nodeToSelect;
    for (let i = 0; i < this.resources.length; ++i) {
      const resource = this.resources[i];
      const data = {
        resource: resource.url,
        type: resource.type,
        size: Platform.NumberUtilities.bytesToString(resource.size),
      };
      const node = new DataGrid.DataGrid.DataGridNode(data);
      this.nodeResources.set(node, resource);
      node.selectable = true;
      this.dataGrid.rootNode().appendChild(node);
      if (resource === selectedResource) {
        nodeToSelect = node;
        nodeToSelect.selected = true;
      }
    }

    if (!nodeToSelect && this.dataGrid.rootNode().children.length) {
      this.dataGrid.rootNode().children[0].selected = true;
    }
  }

  private deleteButtonClicked(_event: Common.EventTarget.EventTargetEvent): void {
    if (!this.dataGrid || !this.dataGrid.selectedNode) {
      return;
    }

    // FIXME: Delete Button semantics are not yet defined. (Delete a single, or all?)
    this.deleteCallback(this.dataGrid.selectedNode);
  }

  private deleteCallback(_node: DataGrid.DataGrid.DataGridNode<unknown>): void {
    // FIXME: Should we delete a single (selected) resource or all resources?
    // ProtocolClient.inspectorBackend.deleteCachedResource(...)
    // this.update();
  }
}
