// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as Network from '../network/network.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export class ServiceWorkerCacheView extends UI.View.SimpleView {
  /**
   * @param {!SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel} model
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  constructor(model, cache) {
    super(Common.UIString.UIString('Cache'));
    this.registerRequiredCSS('resources/serviceWorkerCacheViews.css');

    this._model = model;
    this._entriesForTest = null;

    this.element.classList.add('service-worker-cache-data-view');
    this.element.classList.add('storage-view');

    const editorToolbar = new UI.Toolbar.Toolbar('data-view-toolbar', this.element);
    this._splitWidget = new UI.SplitWidget.SplitWidget(false, false);
    this._splitWidget.show(this.element);

    this._previewPanel = new UI.Widget.VBox();
    const resizer = this._previewPanel.element.createChild('div', 'cache-preview-panel-resizer');
    this._splitWidget.setMainWidget(this._previewPanel);
    this._splitWidget.installResizer(resizer);

    /** @type {?UI.Widget.Widget} */
    this._preview = null;

    this._cache = cache;
    /** @type {?DataGrid.DataGrid.DataGridImpl} */
    this._dataGrid = null;
    this._refreshThrottler = new Common.Throttler.Throttler(300);
    this._refreshButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Refresh'), 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._refreshButtonClicked, this);
    editorToolbar.appendToolbarItem(this._refreshButton);

    this._deleteSelectedButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Delete Selected'), 'largeicon-delete');
    this._deleteSelectedButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._deleteButtonClicked(null);
    });
    editorToolbar.appendToolbarItem(this._deleteSelectedButton);

    const entryPathFilterBox = new UI.Toolbar.ToolbarInput(ls`Filter by Path`, '', 1);
    editorToolbar.appendToolbarItem(entryPathFilterBox);
    const entryPathFilterThrottler = new Common.Throttler.Throttler(300);
    this._entryPathFilter = '';
    entryPathFilterBox.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, () => {
      entryPathFilterThrottler.schedule(() => {
        this._entryPathFilter = entryPathFilterBox.value();
        return this._updateData(true);
      });
    });

    this._returnCount = /** @type {?number} */ (null);
    this._summaryBarElement = /** @type {?Element} */ (null);
    this._loadingPromise = /** @type {?Promise} */ (null);

    this.update(cache);
  }

  _resetDataGrid() {
    if (this._dataGrid) {
      this._dataGrid.asWidget().detach();
    }
    this._dataGrid = this._createDataGrid();
    const dataGridWidget = this._dataGrid.asWidget();
    this._splitWidget.setSidebarWidget(dataGridWidget);
    dataGridWidget.setMinimumSize(0, 250);
  }

  /**
   * @override
   */
  wasShown() {
    this._model.addEventListener(
        SDK.ServiceWorkerCacheModel.Events.CacheStorageContentUpdated, this._cacheContentUpdated, this);
    this._updateData(true);
  }

  /**
   * @override
   */
  willHide() {
    this._model.removeEventListener(
        SDK.ServiceWorkerCacheModel.Events.CacheStorageContentUpdated, this._cacheContentUpdated, this);
  }

  /**
   * @param {?UI.Widget.Widget} preview
   */
  _showPreview(preview) {
    if (preview && this._preview === preview) {
      return;
    }
    if (this._preview) {
      this._preview.detach();
    }
    if (!preview) {
      preview = new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('Select a cache entry above to preview'));
    }
    this._preview = preview;
    this._preview.show(this._previewPanel.element);
  }

  /**
   * @return {!DataGrid.DataGrid.DataGridImpl}
   */
  _createDataGrid() {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'number', title: '#', sortable: false, width: '3px'},
      {id: 'name', title: Common.UIString.UIString('Name'), weight: 4, sortable: true},
      {id: 'responseType', title: ls`Response-Type`, weight: 1, align: DataGrid.DataGrid.Align.Right, sortable: true},
      {id: 'contentType', title: Common.UIString.UIString('Content-Type'), weight: 1, sortable: true}, {
        id: 'contentLength',
        title: Common.UIString.UIString('Content-Length'),
        weight: 1,
        align: DataGrid.DataGrid.Align.Right,
        sortable: true
      },
      {
        id: 'responseTime',
        title: Common.UIString.UIString('Time Cached'),
        width: '12em',
        weight: 1,
        align: DataGrid.DataGrid.Align.Right,
        sortable: true
      }
    ]);
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: ls`Service Worker Cache`,
      columns,
      deleteCallback: this._deleteButtonClicked.bind(this),
      refreshCallback: this._updateData.bind(this, true)
    });

    dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this);

    dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, event => {
      this._previewCachedResponse(event.data.data);
    }, this);
    dataGrid.setStriped(true);
    return dataGrid;
  }

  _sortingChanged() {
    if (!this._dataGrid) {
      return;
    }

    const accending = this._dataGrid.isSortOrderAscending();
    const columnId = this._dataGrid.sortColumnId();
    let comparator;
    if (columnId === 'name') {
      comparator = (a, b) => a._name.localeCompare(b._name);
    } else if (columnId === 'contentType') {
      comparator = (a, b) => a.data.mimeType.localeCompare(b.data.mimeType);
    } else if (columnId === 'contentLength') {
      comparator = (a, b) => a.data.resourceSize - b.data.resourceSize;
    } else if (columnId === 'responseTime') {
      comparator = (a, b) => a.data.endTime - b.data.endTime;
    } else if (columnId === 'responseType') {
      comparator = (a, b) => a._responseType.localeCompare(b._responseType);
    }

    const children = this._dataGrid.rootNode().children.slice();
    this._dataGrid.rootNode().removeChildren();
    children.sort((a, b) => {
      const result = comparator(a, b);
      return accending ? result : -result;
    });
    children.forEach(child => this._dataGrid.rootNode().appendChild(child));
  }

  /**
   * @param {?DataGrid.DataGrid.DataGridNode} node
   */
  async _deleteButtonClicked(node) {
    if (!node) {
      node = this._dataGrid && this._dataGrid.selectedNode;
      if (!node) {
        return;
      }
    }
    await this._model.deleteCacheEntry(this._cache, /** @type {string} */ (node.data.url()));
    node.remove();
  }

  /**
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  update(cache) {
    this._cache = cache;
    this._resetDataGrid();
    this._updateData(true);
  }

  _updateSummaryBar() {
    if (!this._summaryBarElement) {
      this._summaryBarElement = this.element.createChild('div', 'cache-storage-summary-bar');
    }
    this._summaryBarElement.removeChildren();

    const span = this._summaryBarElement.createChild('span');
    if (this._entryPathFilter) {
      span.textContent = ls`Matching entries: ${this._returnCount}`;
    } else {
      span.textContent = ls`Total entries: ${this._returnCount}`;
    }
  }

  /**
   * @param {number} skipCount
   * @param {!Array<!Protocol.CacheStorage.DataEntry>} entries
   * @param {number} returnCount
   * @this {ServiceWorkerCacheView}
   */
  _updateDataCallback(skipCount, entries, returnCount) {
    const selected = this._dataGrid.selectedNode && this._dataGrid.selectedNode.data.url();
    this._refreshButton.setEnabled(true);
    this._entriesForTest = entries;
    this._returnCount = returnCount;
    this._updateSummaryBar();

    /** @type {!Map<string, !DataGrid.DataGrid.DataGridNode>} */
    const oldEntries = new Map();
    const rootNode = this._dataGrid.rootNode();
    for (const node of rootNode.children) {
      oldEntries.set(node.data.url, node);
    }
    rootNode.removeChildren();
    let selectedNode = null;
    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i];
      let node = oldEntries.get(entry.requestURL);
      if (!node || node.data.responseTime !== entry.responseTime) {
        node = new DataGridNode(i, this._createRequest(entry), entry.responseType);
        node.selectable = true;
      } else {
        node.data.number = i;
      }
      rootNode.appendChild(node);
      if (entry.requestURL === selected) {
        selectedNode = node;
      }
    }
    if (!selectedNode) {
      this._showPreview(null);
    } else {
      selectedNode.revealAndSelect();
    }
    this._updatedForTest();
  }

  /**
   * @param {boolean} force
   */
  async _updateData(force) {
    if (!force && this._loadingPromise) {
      return this._loadingPromise;
    }
    this._refreshButton.setEnabled(false);

    if (this._loadingPromise) {
      return this._loadingPromise;
    }

    this._loadingPromise = new Promise(resolve => {
      this._model.loadAllCacheData(this._cache, this._entryPathFilter, (entries, returnCount) => {
        resolve([entries, returnCount]);
      });
    });

    const [entries, returnCount] = await this._loadingPromise;
    this._updateDataCallback(0, entries, returnCount);
    this._loadingPromise = null;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _refreshButtonClicked(event) {
    this._updateData(true);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _cacheContentUpdated(event) {
    const nameAndOrigin = event.data;
    if (this._cache.securityOrigin !== nameAndOrigin.origin || this._cache.cacheName !== nameAndOrigin.cacheName) {
      return;
    }
    this._refreshThrottler.schedule(() => Promise.resolve(this._updateData(true)), true);
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  async _previewCachedResponse(request) {
    let preview = request[ServiceWorkerCacheView._previewSymbol];
    if (!preview) {
      preview = new RequestView(request);
      request[ServiceWorkerCacheView._previewSymbol] = preview;
    }

    // It is possible that table selection changes before the preview opens.
    if (request === this._dataGrid.selectedNode.data) {
      this._showPreview(preview);
    }
  }

  /**
   * @param {!Protocol.CacheStorage.DataEntry} entry
   * @return {!SDK.NetworkRequest.NetworkRequest}
   */
  _createRequest(entry) {
    const request =
        new SDK.NetworkRequest.NetworkRequest('cache-storage-' + entry.requestURL, entry.requestURL, '', '', '', null);
    request.requestMethod = entry.requestMethod;
    request.setRequestHeaders(entry.requestHeaders);
    request.statusCode = entry.responseStatus;
    request.statusText = entry.responseStatusText;
    request.protocol = new Common.ParsedURL.ParsedURL(entry.requestURL).scheme;
    request.responseHeaders = entry.responseHeaders;
    request.setRequestHeadersText('');
    request.endTime = entry.responseTime;

    let header = entry.responseHeaders.find(header => header.name.toLowerCase() === 'content-type');
    const contentType = header ? header.value : 'text/plain';
    request.mimeType = contentType;

    header = entry.responseHeaders.find(header => header.name.toLowerCase() === 'content-length');
    request.resourceSize = (header && header.value) | 0;

    let resourceType = Common.ResourceType.ResourceType.fromMimeType(contentType);
    if (!resourceType) {
      resourceType =
          Common.ResourceType.ResourceType.fromURL(entry.requestURL) || Common.ResourceType.resourceTypes.Other;
    }
    request.setResourceType(resourceType);
    request.setContentDataProvider(this._requestContent.bind(this, request));
    return request;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {!Promise<!SDK.NetworkRequest.ContentData>}
   */
  async _requestContent(request) {
    const isText = request.resourceType().isTextType();
    const contentData = {error: null, content: null, encoded: !isText};
    const response = await this._cache.requestCachedResponse(request.url(), request.requestHeaders());
    if (response) {
      contentData.content = isText ? window.atob(response.body) : response.body;
    }
    return contentData;
  }

  _updatedForTest() {
  }
}

ServiceWorkerCacheView._previewSymbol = Symbol('preview');

export class DataGridNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @param {number} number
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {!Protocol.CacheStorage.CachedResponseType} responseType
   */
  constructor(number, request, responseType) {
    super(request);
    this._number = number;
    const parsed = new Common.ParsedURL.ParsedURL(request.url());
    if (parsed.isValid) {
      this._name = Platform.StringUtilities.trimURL(request.url(), parsed.domain());
    } else {
      this._name = request.url();
    }
    this._request = request;
    this._responseType = responseType;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    const cell = this.createTD(columnId);
    let value;
    if (columnId === 'number') {
      value = String(this._number);
    } else if (columnId === 'name') {
      value = this._name;
    } else if (columnId === 'responseType') {
      if (this._responseType === 'opaqueResponse') {
        value = 'opaque';
      } else if (this._responseType === 'opaqueRedirect') {
        value = 'opaqueredirect';
      } else {
        value = this._responseType;
      }
    } else if (columnId === 'contentType') {
      value = this._request.mimeType;
    } else if (columnId === 'contentLength') {
      value = (this._request.resourceSize | 0).toLocaleString('en-US');
    } else if (columnId === 'responseTime') {
      value = new Date(this._request.endTime * 1000).toLocaleString();
    }
    DataGrid.DataGrid.DataGridImpl.setElementText(cell, value || '', true);
    cell.title = this._request.url();
    return cell;
  }
}

export class RequestView extends UI.Widget.VBox {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  constructor(request) {
    super();

    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
    this._resourceViewTabSetting = Common.Settings.Settings.instance().createSetting('cacheStorageViewTab', 'preview');

    this._tabbedPane.appendTab(
        'headers', Common.UIString.UIString('Headers'), new Network.RequestHeadersView.RequestHeadersView(request));
    this._tabbedPane.appendTab(
        'preview', Common.UIString.UIString('Preview'), new Network.RequestPreviewView.RequestPreviewView(request));
    this._tabbedPane.show(this.element);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._selectTab();
  }

  /**
   * @param {string=} tabId
   */
  _selectTab(tabId) {
    if (!tabId) {
      tabId = this._resourceViewTabSetting.get();
    }
    if (!this._tabbedPane.selectTab(tabId)) {
      this._tabbedPane.selectTab('headers');
    }
  }

  _tabSelected(event) {
    if (!event.data.isUserGesture) {
      return;
    }
    this._resourceViewTabSetting.set(event.data.tabId);
  }
}
