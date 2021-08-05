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

/* eslint-disable rulesdir/no_underscored_properties */

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
  _model: ApplicationCacheModel;
  _deleteButton: UI.Toolbar.ToolbarButton;
  _connectivityIcon: UI.UIUtils.DevToolsIconLabel;
  _statusIcon: UI.UIUtils.DevToolsIconLabel;
  _frameId: string;
  _emptyWidget: UI.EmptyWidget.EmptyWidget;
  _nodeResources: WeakMap<DataGrid.DataGrid.DataGridNode<unknown>, Protocol.ApplicationCache.ApplicationCacheResource>;
  _viewDirty?: boolean;
  _status?: number;
  _manifest?: string;
  _creationTime?: number;
  _updateTime?: number;
  _size?: number;
  _resources?: Protocol.ApplicationCache.ApplicationCacheResource[];
  _dataGrid?: DataGrid.DataGrid.DataGridImpl<unknown>;

  constructor(model: ApplicationCacheModel, frameId: string) {
    super(i18nString(UIStrings.appcache));

    this._model = model;

    this.element.classList.add('storage-view', 'table');

    this._deleteButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.deleteString), 'largeicon-delete');
    this._deleteButton.setVisible(false);
    this._deleteButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._deleteButtonClicked, this);
    this._connectivityIcon = (document.createElement('span', {is: 'dt-icon-label'}) as UI.UIUtils.DevToolsIconLabel);
    this._connectivityIcon.style.margin = '0 2px 0 5px';
    this._statusIcon = (document.createElement('span', {is: 'dt-icon-label'}) as UI.UIUtils.DevToolsIconLabel);
    this._statusIcon.style.margin = '0 2px 0 5px';

    this._frameId = frameId;

    this._emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noApplicationCacheInformation));
    this._emptyWidget.show(this.element);

    this._markDirty();

    const status = this._model.frameManifestStatus(frameId);
    this.updateStatus(status);
    this.updateNetworkState(this._model.onLine);
    (this._deleteButton.element as HTMLElement).style.display = 'none';

    this._nodeResources = new WeakMap();
  }

  async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    return [
      this._deleteButton,
      new UI.Toolbar.ToolbarItem(this._connectivityIcon),
      new UI.Toolbar.ToolbarSeparator(),
      new UI.Toolbar.ToolbarItem(this._statusIcon),
    ];
  }

  wasShown(): void {
    this._maybeUpdate();
  }

  willHide(): void {
    this._deleteButton.setVisible(false);
  }

  _maybeUpdate(): void {
    if (!this.isShowing() || !this._viewDirty) {
      return;
    }

    this._update();
    this._viewDirty = false;
  }

  _markDirty(): void {
    this._viewDirty = true;
  }

  updateStatus(status: number): void {
    const oldStatus = this._status;
    this._status = status;

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
      this._statusIcon.type = info.type;
      this._statusIcon.textContent = info.text;
    }

    if (this.isShowing() && this._status === IDLE && (oldStatus === UPDATEREADY || !this._resources)) {
      this._markDirty();
    }
    this._maybeUpdate();
  }

  updateNetworkState(isNowOnline: boolean): void {
    if (isNowOnline) {
      this._connectivityIcon.type = 'smallicon-green-ball';
      this._connectivityIcon.textContent = i18nString(UIStrings.online);
    } else {
      this._connectivityIcon.type = 'smallicon-red-ball';
      this._connectivityIcon.textContent = i18nString(UIStrings.offline);
    }
  }

  async _update(): Promise<void> {
    const applicationCache = await this._model.requestApplicationCache(this._frameId);

    if (!applicationCache || !applicationCache.manifestURL) {
      delete this._manifest;
      delete this._creationTime;
      delete this._updateTime;
      delete this._size;
      delete this._resources;

      this._emptyWidget.show(this.element);
      this._deleteButton.setVisible(false);
      if (this._dataGrid) {
        this._dataGrid.element.classList.add('hidden');
      }
      return;
    }
    // FIXME: are these variables needed anywhere else?
    this._manifest = applicationCache.manifestURL;
    this._creationTime = applicationCache.creationTime;
    this._updateTime = applicationCache.updateTime;
    this._size = applicationCache.size;
    this._resources = applicationCache.resources;

    if (!this._dataGrid) {
      this._createDataGrid();
    }

    this._populateDataGrid();
    if (this._dataGrid) {
      this._dataGrid.autoSizeColumns(20, 80);
      this._dataGrid.element.classList.remove('hidden');
    }
    this._emptyWidget.detach();
    this._deleteButton.setVisible(true);

    // FIXME: For Chrome, put creationTime and updateTime somewhere.
    // NOTE: localizedString has not yet been added.
    // i18nString("(%s) Created: %s Updated: %s", this._size, this._creationTime, this._updateTime);
  }

  _createDataGrid(): void {
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
    this._dataGrid = new DataGrid.DataGrid.DataGridImpl(parameters);
    this._dataGrid.setStriped(true);
    this._dataGrid.asWidget().show(this.element);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._populateDataGrid, this);
  }

  _populateDataGrid(): void {
    if (!this._dataGrid) {
      return;
    }
    const selectedResource: Protocol.ApplicationCache.ApplicationCacheResource|null =
        (this._dataGrid.selectedNode ? this._nodeResources.get(this._dataGrid.selectedNode) : null) || null;
    const sortDirection = this._dataGrid.isSortOrderAscending() ? 1 : -1;

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
    switch (this._dataGrid.sortColumnId()) {
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

    this._dataGrid.rootNode().removeChildren();
    if (!this._resources) {
      return;
    }
    if (comparator) {
      this._resources.sort(comparator);
    }

    let nodeToSelect;
    for (let i = 0; i < this._resources.length; ++i) {
      const resource = this._resources[i];
      const data = {
        resource: resource.url,
        type: resource.type,
        size: Platform.NumberUtilities.bytesToString(resource.size),
      };
      const node = new DataGrid.DataGrid.DataGridNode(data);
      this._nodeResources.set(node, resource);
      node.selectable = true;
      this._dataGrid.rootNode().appendChild(node);
      if (resource === selectedResource) {
        nodeToSelect = node;
        nodeToSelect.selected = true;
      }
    }

    if (!nodeToSelect && this._dataGrid.rootNode().children.length) {
      this._dataGrid.rootNode().children[0].selected = true;
    }
  }

  _deleteButtonClicked(_event: Common.EventTarget.EventTargetEvent): void {
    if (!this._dataGrid || !this._dataGrid.selectedNode) {
      return;
    }

    // FIXME: Delete Button semantics are not yet defined. (Delete a single, or all?)
    this._deleteCallback(this._dataGrid.selectedNode);
  }

  _deleteCallback(_node: DataGrid.DataGrid.DataGridNode<unknown>): void {
    // FIXME: Should we delete a single (selected) resource or all resources?
    // ProtocolClient.inspectorBackend.deleteCachedResource(...)
    // this.update();
  }
}
