// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Resources.ServiceWorkerCacheView = class extends UI.SimpleView {
  /**
   * @param {!SDK.ServiceWorkerCacheModel} model
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  constructor(model, cache) {
    super(Common.UIString('Cache'));
    this.registerRequiredCSS('resources/serviceWorkerCacheViews.css');

    this._model = model;
    this._entriesForTest = null;

    this.element.classList.add('service-worker-cache-data-view');
    this.element.classList.add('storage-view');

    var editorToolbar = new UI.Toolbar('data-view-toolbar', this.element);
    this._splitWidget = new UI.SplitWidget(false, false);
    this._splitWidget.show(this.element);

    this._previewPanel = new UI.VBox();
    var resizer = this._previewPanel.element.createChild('div', 'preview-panel-resizer');
    this._splitWidget.setMainWidget(this._previewPanel);
    this._splitWidget.installResizer(resizer);

    /** @type {?UI.Widget} */
    this._preview = null;

    this._cache = cache;
    /** @type {?DataGrid.DataGrid} */
    this._dataGrid = null;
    /** @type {?number} */
    this._lastPageSize = null;
    /** @type {?number} */
    this._lastSkipCount = null;
    this._refreshThrottler = new Common.Throttler(300);

    this._pageBackButton = new UI.ToolbarButton(Common.UIString('Show previous page'), 'largeicon-play-back');
    this._pageBackButton.addEventListener(UI.ToolbarButton.Events.Click, this._pageBackButtonClicked, this);
    editorToolbar.appendToolbarItem(this._pageBackButton);

    this._pageForwardButton = new UI.ToolbarButton(Common.UIString('Show next page'), 'largeicon-play');
    this._pageForwardButton.setEnabled(false);
    this._pageForwardButton.addEventListener(UI.ToolbarButton.Events.Click, this._pageForwardButtonClicked, this);
    editorToolbar.appendToolbarItem(this._pageForwardButton);

    this._refreshButton = new UI.ToolbarButton(Common.UIString('Refresh'), 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.ToolbarButton.Events.Click, this._refreshButtonClicked, this);
    editorToolbar.appendToolbarItem(this._refreshButton);

    this._deleteSelectedButton = new UI.ToolbarButton(Common.UIString('Delete Selected'), 'largeicon-delete');
    this._deleteSelectedButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._deleteButtonClicked(null));
    editorToolbar.appendToolbarItem(this._deleteSelectedButton);

    this._pageSize = 50;
    this._skipCount = 0;

    this.update(cache);
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
   * @param {?UI.Widget} preview
   */
  _showPreview(preview) {
    if (this._preview === preview)
      return;
    if (this._preview)
      this._preview.detach();
    if (!preview)
      preview = new UI.EmptyWidget(Common.UIString('Select a cache entry above to preview'));
    this._preview = preview;
    this._preview.show(this._previewPanel.element);
  }

  /**
   * @return {!DataGrid.DataGrid}
   */
  _createDataGrid() {
    var columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'path', title: Common.UIString('Path'), weight: 4, sortable: true},
      {id: 'contentType', title: Common.UIString('Content-Type'), weight: 1, sortable: true}, {
        id: 'contentLength',
        title: Common.UIString('Content-Length'),
        weight: 1,
        align: DataGrid.DataGrid.Align.Right,
        sortable: true
      },
      {
        id: 'responseTime',
        title: Common.UIString('Time Cached'),
        width: '12em',
        weight: 1,
        align: DataGrid.DataGrid.Align.Right,
        sortable: true
      }
    ]);
    var dataGrid = new DataGrid.DataGrid(
        columns, undefined, this._deleteButtonClicked.bind(this), this._updateData.bind(this, true));

    dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this);

    dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SelectedNode, event => this._previewCachedResponse(event.data.data), this);
    dataGrid.setStriped(true);
    return dataGrid;
  }

  _sortingChanged() {
    if (!this._dataGrid)
      return;

    var accending = this._dataGrid.isSortOrderAscending();
    var columnId = this._dataGrid.sortColumnId();
    var comparator;
    if (columnId === 'path')
      comparator = (a, b) => a._path.localeCompare(b._path);
    else if (columnId === 'contentType')
      comparator = (a, b) => a.data.mimeType.localeCompare(b.data.mimeType);
    else if (columnId === 'contentLength')
      comparator = (a, b) => a.data.resourceSize - b.data.resourceSize;
    else if (columnId === 'responseTime')
      comparator = (a, b) => a.data.endTime - b.data.endTime;

    var children = this._dataGrid.rootNode().children.slice();
    this._dataGrid.rootNode().removeChildren();
    children.sort((a, b) => {
      var result = comparator(a, b);
      return accending ? result : -result;
    });
    children.forEach(child => this._dataGrid.rootNode().appendChild(child));
  }

  /**
   * @param {!Common.Event} event
   */
  _pageBackButtonClicked(event) {
    this._skipCount = Math.max(0, this._skipCount - this._pageSize);
    this._updateData(false);
  }

  /**
   * @param {!Common.Event} event
   */
  _pageForwardButtonClicked(event) {
    this._skipCount = this._skipCount + this._pageSize;
    this._updateData(false);
  }

  /**
   * @param {?DataGrid.DataGridNode} node
   */
  async _deleteButtonClicked(node) {
    if (!node) {
      node = this._dataGrid && this._dataGrid.selectedNode;
      if (!node)
        return;
    }
    await this._model.deleteCacheEntry(this._cache, /** @type {string} */ (node.data.url()));
    node.remove();
  }

  /**
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  update(cache) {
    this._cache = cache;

    if (this._dataGrid)
      this._dataGrid.asWidget().detach();
    this._dataGrid = this._createDataGrid();
    this._splitWidget.setSidebarWidget(this._dataGrid.asWidget());
    this._skipCount = 0;
    this._updateData(true);
  }

  /**
   * @param {number} skipCount
   * @param {!Array<!Protocol.CacheStorage.DataEntry>} entries
   * @param {boolean} hasMore
   * @this {Resources.ServiceWorkerCacheView}
   */
  _updateDataCallback(skipCount, entries, hasMore) {
    var selected = this._dataGrid.selectedNode && this._dataGrid.selectedNode.data.url();
    this._refreshButton.setEnabled(true);
    this._entriesForTest = entries;

    /** @type {!Map<string, !DataGrid.DataGridNode>} */
    var oldEntries = new Map();
    var rootNode = this._dataGrid.rootNode();
    for (var node of rootNode.children)
      oldEntries.set(node.data.url, node);
    rootNode.removeChildren();
    var selectedNode = null;
    for (var entry of entries) {
      var node = oldEntries.get(entry.requestURL);
      if (!node || node.data.responseTime !== entry.responseTime) {
        node = new Resources.ServiceWorkerCacheView.DataGridNode(this._createRequest(entry));
        node.selectable = true;
      }
      rootNode.appendChild(node);
      if (entry.requestURL === selected)
        selectedNode = node;
    }
    this._pageBackButton.setEnabled(!!skipCount);
    this._pageForwardButton.setEnabled(hasMore);
    if (!selectedNode)
      this._showPreview(null);
    else
      selectedNode.revealAndSelect();
    this._updatedForTest();
  }

  /**
   * @param {boolean} force
   */
  _updateData(force) {
    var pageSize = this._pageSize;
    var skipCount = this._skipCount;

    if (!force && this._lastPageSize === pageSize && this._lastSkipCount === skipCount)
      return;
    this._refreshButton.setEnabled(false);
    if (this._lastPageSize !== pageSize) {
      skipCount = 0;
      this._skipCount = 0;
    }
    this._lastPageSize = pageSize;
    this._lastSkipCount = skipCount;
    this._model.loadCacheData(this._cache, skipCount, pageSize, this._updateDataCallback.bind(this, skipCount));
  }

  /**
   * @param {!Common.Event} event
   */
  _refreshButtonClicked(event) {
    this._updateData(true);
  }

  /**
   * @param {!Common.Event} event
   */
  _cacheContentUpdated(event) {
    var nameAndOrigin = event.data;
    if (this._cache.securityOrigin !== nameAndOrigin.origin || this._cache.cacheName !== nameAndOrigin.cacheName)
      return;
    this._refreshThrottler.schedule(() => Promise.resolve(this._updateData(true)), true);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  async _previewCachedResponse(request) {
    var preview = request[Resources.ServiceWorkerCacheView._previewSymbol];
    if (!preview) {
      preview = new Resources.ServiceWorkerCacheView.RequestView(request);
      request[Resources.ServiceWorkerCacheView._previewSymbol] = preview;
    }

    // It is possible that table selection changes before the preview opens.
    if (request === this._dataGrid.selectedNode.data)
      this._showPreview(preview);
  }

  /**
   * @param {!Protocol.CacheStorage.DataEntry} entry
   * @return {!SDK.NetworkRequest}
   */
  _createRequest(entry) {
    var request = new SDK.NetworkRequest('cache-storage-' + entry.requestURL, entry.requestURL, '', '', '', null);
    request.requestMethod = entry.requestMethod;
    request.setRequestHeaders(entry.requestHeaders);
    request.statusCode = entry.responseStatus;
    request.statusText = entry.responseStatusText;
    request.protocol = new Common.ParsedURL(entry.requestURL).scheme;
    request.responseHeaders = entry.responseHeaders;
    request.setRequestHeadersText('');
    request.endTime = entry.responseTime;

    var header = entry.responseHeaders.find(header => header.name.toLowerCase() === 'content-type');
    var contentType = header ? header.value : 'text/plain';
    request.mimeType = contentType;

    header = entry.responseHeaders.find(header => header.name.toLowerCase() === 'content-length');
    request.resourceSize = (header && header.value) | 0;

    var resourceType = Common.ResourceType.fromMimeType(contentType);
    if (!resourceType)
      resourceType = Common.ResourceType.fromURL(entry.requestURL) || Common.resourceTypes.Other;
    request.setResourceType(resourceType);
    request.setContentDataProvider(this._requestContent.bind(this, request));
    return request;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {!Promise<!SDK.NetworkRequest.ContentData>}
   */
  async _requestContent(request) {
    var isText = request.resourceType().isTextType();
    var contentData = {error: null, content: null, encoded: !isText};
    var response = await this._cache.requestCachedResponse(request.url());
    if (response)
      contentData.content = isText ? window.atob(response.body) : response.body;
    return contentData;
  }

  _updatedForTest() {
  }
};

Resources.ServiceWorkerCacheView._previewSymbol = Symbol('preview');

Resources.ServiceWorkerCacheView._RESPONSE_CACHE_SIZE = 10;

Resources.ServiceWorkerCacheView.DataGridNode = class extends DataGrid.DataGridNode {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super(request);
    this._path = Common.ParsedURL.extractPath(request.url());
    if (!this._path)
      this._path = request.url();
    if (this._path.length > 1 && this._path.startsWith('/'))
      this._path = this._path.substring(1);
    this._request = request;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    var cell = this.createTD(columnId);
    var value;
    if (columnId === 'path')
      value = this._path;
    else if (columnId === 'contentType')
      value = this._request.mimeType;
    else if (columnId === 'contentLength')
      value = (this._request.resourceSize | 0).toLocaleString('en-US');
    else if (columnId === 'responseTime')
      value = new Date(this._request.endTime * 1000).toLocaleString();
    DataGrid.DataGrid.setElementText(cell, value || '', true);
    return cell;
  }
};

Resources.ServiceWorkerCacheView.RequestView = class extends UI.VBox {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super();

    this._tabbedPane = new UI.TabbedPane();
    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
    this._resourceViewTabSetting = Common.settings.createSetting('cacheStorageViewTab', 'preview');

    this._tabbedPane.appendTab('headers', Common.UIString('Headers'), new Network.RequestHeadersView(request));
    this._tabbedPane.appendTab('preview', Common.UIString('Preview'), new Network.RequestPreviewView(request));
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
    if (!tabId)
      tabId = this._resourceViewTabSetting.get();
    if (!this._tabbedPane.selectTab(tabId))
      this._tabbedPane.selectTab('headers');
  }

  _tabSelected(event) {
    if (!event.data.isUserGesture)
      return;
    this._resourceViewTabSetting.set(event.data.tabId);
  }
};
