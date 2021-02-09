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

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as DataGrid from '../data_grid/data_grid.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as UI from '../ui/ui.js';

import {ApplicationCacheModel, CHECKING, DOWNLOADING, IDLE, OBSOLETE, UNCACHED, UPDATEREADY} from './ApplicationCacheModel.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('resources/ApplicationCacheItemsView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ApplicationCacheItemsView extends UI.View.SimpleView {
  /**
   * @param {!ApplicationCacheModel} model
   * @param {!Protocol.Page.FrameId} frameId
   */
  constructor(model, frameId) {
    super(i18nString(UIStrings.appcache));

    this._model = model;

    this.element.classList.add('storage-view', 'table');

    this._deleteButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.deleteString), 'largeicon-delete');
    this._deleteButton.setVisible(false);
    this._deleteButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._deleteButtonClicked, this);

    this._connectivityIcon =
        /** @type {!UI.UIUtils.DevToolsIconLabel} */ (document.createElement('span', {is: 'dt-icon-label'}));
    this._connectivityIcon.style.margin = '0 2px 0 5px';
    this._statusIcon =
        /** @type {!UI.UIUtils.DevToolsIconLabel} */ (document.createElement('span', {is: 'dt-icon-label'}));
    this._statusIcon.style.margin = '0 2px 0 5px';

    this._frameId = frameId;

    this._emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noApplicationCacheInformation));
    this._emptyWidget.show(this.element);

    this._markDirty();

    const status = this._model.frameManifestStatus(frameId);
    this.updateStatus(status);
    this.updateNetworkState(this._model.onLine);

    // FIXME: Status bar items don't work well enough yet, so they are being hidden.
    // http://webkit.org/b/41637 Web Inspector: Give Semantics to "Refresh" and "Delete" Buttons in ApplicationCache DataGrid
    (/** @type {!HTMLElement} */ (this._deleteButton.element)).style.display = 'none';

    /** @type {!WeakMap<!DataGrid.DataGrid.DataGridNode<*>, !Protocol.ApplicationCache.ApplicationCacheResource>} */
    this._nodeResources = new WeakMap();
  }

  /**
   * @override
   * @return {!Promise<!Array.<!UI.Toolbar.ToolbarItem>>}
   */
  async toolbarItems() {
    return [
      this._deleteButton, new UI.Toolbar.ToolbarItem(this._connectivityIcon), new UI.Toolbar.ToolbarSeparator(),
      new UI.Toolbar.ToolbarItem(this._statusIcon)
    ];
  }

  /**
   * @override
   */
  wasShown() {
    this._maybeUpdate();
  }

  /**
   * @override
   */
  willHide() {
    this._deleteButton.setVisible(false);
  }

  _maybeUpdate() {
    if (!this.isShowing() || !this._viewDirty) {
      return;
    }

    this._update();
    this._viewDirty = false;
  }

  _markDirty() {
    this._viewDirty = true;
  }

  /**
   * @param {number} status
   */
  updateStatus(status) {
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

  /**
   * @param {boolean} isNowOnline
   */
  updateNetworkState(isNowOnline) {
    if (isNowOnline) {
      this._connectivityIcon.type = 'smallicon-green-ball';
      this._connectivityIcon.textContent = i18nString(UIStrings.online);
    } else {
      this._connectivityIcon.type = 'smallicon-red-ball';
      this._connectivityIcon.textContent = i18nString(UIStrings.offline);
    }
  }

  async _update() {
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

  _createDataGrid() {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'resource', title: i18nString(UIStrings.resource), sort: DataGrid.DataGrid.Order.Ascending, sortable: true},
      {id: 'type', title: i18nString(UIStrings.typeString), sortable: true},
      {id: 'size', title: i18nString(UIStrings.sizeString), align: DataGrid.DataGrid.Align.Right, sortable: true}
    ]);
    /** @type {!DataGrid.DataGrid.Parameters} */
    const parameters = {
      displayName: i18nString(UIStrings.applicationCache),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined
    };
    this._dataGrid = new DataGrid.DataGrid.DataGridImpl(parameters);
    this._dataGrid.setStriped(true);
    this._dataGrid.asWidget().show(this.element);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._populateDataGrid, this);
  }

  _populateDataGrid() {
    if (!this._dataGrid) {
      return;
    }
    /** @type {?Protocol.ApplicationCache.ApplicationCacheResource} */
    const selectedResource =
        (this._dataGrid.selectedNode ? this._nodeResources.get(this._dataGrid.selectedNode) : null) || null;
    const sortDirection = this._dataGrid.isSortOrderAscending() ? 1 : -1;

    /**
     * @param {string} field
     * @param {!Protocol.ApplicationCache.ApplicationCacheResource} resource1
     * @param {!Protocol.ApplicationCache.ApplicationCacheResource} resource2
     */
    function numberCompare(field, resource1, resource2) {
      return sortDirection * (/** @type {*} */ (resource1)[field] - /** @type {*} */ (resource2)[field]);
    }

    /**
     * @param {string} field
     * @param {!Protocol.ApplicationCache.ApplicationCacheResource} resource1
     * @param {!Protocol.ApplicationCache.ApplicationCacheResource} resource2
     */
    function localeCompare(field, resource1, resource2) {
      return sortDirection *
          String(/** @type {*} */ (resource1)[field]).localeCompare(String(/** @type {*} */ (resource2)[field]));
    }

    let comparator;
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
      default:
        localeCompare.bind(null, 'resource');  // FIXME: comparator = ?
    }

    this._dataGrid.rootNode().removeChildren();
    if (!this._resources) {
      return;
    }
    this._resources.sort(comparator);

    let nodeToSelect;
    for (let i = 0; i < this._resources.length; ++i) {
      const data = {};
      const resource = this._resources[i];
      data.resource = resource.url;
      data.type = resource.type;
      data.size = Platform.NumberUtilities.bytesToString(resource.size);
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _deleteButtonClicked(event) {
    if (!this._dataGrid || !this._dataGrid.selectedNode) {
      return;
    }

    // FIXME: Delete Button semantics are not yet defined. (Delete a single, or all?)
    this._deleteCallback(this._dataGrid.selectedNode);
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode<*>} node
   */
  _deleteCallback(node) {
    // FIXME: Should we delete a single (selected) resource or all resources?
    // ProtocolClient.inspectorBackend.deleteCachedResource(...)
    // this._update();
  }
}
