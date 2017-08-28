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

    this.element.classList.add('service-worker-cache-data-view');
    this.element.classList.add('storage-view');

    var editorToolbar = new UI.Toolbar('data-view-toolbar', this.element);
    this._splitWidget = new UI.SplitWidget(false, false);
    this._splitWidget.show(this.element);

    this._previewPanel = new UI.VBox();
    var resizer = this._previewPanel.element.createChild('div', 'cache-preview-panel-resizer');
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
    this._entries = [];
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
      // {id: 'number', title: Common.UIString('#'), width: '50px'},
      {id: 'path', title: Common.UIString('Path')},
      // {id: 'response', title: Common.UIString('Response')},
      {id: 'responseTime', title: Common.UIString('Time Cached'), width: '12em'}
    ]);
    var dataGrid = new DataGrid.DataGrid(
        columns, undefined, this._deleteButtonClicked.bind(this), this._updateData.bind(this, true));
    dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SelectedNode, event => this._previewCachedResponse(event.data.data), this);
    dataGrid.setStriped(true);
    return dataGrid;
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
    await this._model.deleteCacheEntry(this._cache, /** @type {string} */ (node.data.url));
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
   * @param {!Array<!SDK.ServiceWorkerCacheModel.Entry>} entries
   * @param {boolean} hasMore
   * @this {Resources.ServiceWorkerCacheView}
   */
  _updateDataCallback(skipCount, entries, hasMore) {
    var selected = this._dataGrid.selectedNode && this._dataGrid.selectedNode.data.url;
    this._refreshButton.setEnabled(true);

    /** @type {!Map<string, !DataGrid.DataGridNode>} */
    var oldEntries = new Map();
    var rootNode = this._dataGrid.rootNode();
    for (var node of rootNode.children)
      oldEntries.set(node.data.url, node);
    rootNode.removeChildren();
    this._entries = entries;
    var selectedNode = null;
    for (var entry of entries) {
      var node = oldEntries.get(entry.request);
      if (!node || node.data.timestamp !== entry.timestamp) {
        var data = new Resources.ServiceWorkerCacheView._Response(this._cache, entry.request, entry.timestamp);
        node = new DataGrid.DataGridNode(data);
        node.selectable = true;
      }
      rootNode.appendChild(node);
      if (entry.request === selected)
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
   * @param {!Resources.ServiceWorkerCacheView._Response} response
   */
  async _previewCachedResponse(response) {
    var preview = await response._previewPromise;
    // It is possible that table selection changes before the preview opens.
    if (response === this._dataGrid.selectedNode.data)
      this._showPreview(preview);
  }

  _updatedForTest() {
  }
};

Resources.ServiceWorkerCacheView._Response = class {
  /**
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   * @param {string} url
   * @param {number} timestamp
   */
  constructor(cache, url, timestamp) {
    this.url = url;
    this.timestamp = timestamp;
    /** @type {!Promise<!UI.Widget>} */
    this._previewPromise = this._innerPreview(cache);
    this.path = Resources.ServiceWorkerCacheView._Response._requestPath(url);
    this.responseTime = new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * @param {string} url
   * @return {string}
   */
  static _requestPath(url) {
    var path = Common.ParsedURL.extractPath(url);
    if (!path)
      return url;
    if (path.length > 1 && path.startsWith('/'))
      return path.substring(1);
    return path;
  }

  /**
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   * @return {!Promise<!UI.Widget>}
   */
  async _innerPreview(cache) {
    var response = await cache.requestCachedResponse(this.url);
    if (!response)
      return new UI.EmptyWidget(Common.UIString('Preview is not available'));

    var contentType = response.headers['content-type'];
    var resourceType = Common.ResourceType.fromMimeType(contentType);
    var body = resourceType.isTextType() ? window.atob(response.body) : response.body;
    var provider = new Resources.ServiceWorkerCacheView._ResponseContentProvider(this.url, resourceType, body);
    var preview = SourceFrame.PreviewFactory.createPreview(provider, contentType);
    if (!preview)
      return new UI.EmptyWidget(Common.UIString('Preview is not available'));
    return preview;
  }
};

/**
 * @implements {Common.ContentProvider}
 */
Resources.ServiceWorkerCacheView._ResponseContentProvider = class {
  /**
   * @param {string} url
   * @param {!Common.ResourceType} resourceType
   * @param {string} body
   */
  constructor(url, resourceType, body) {
    this._url = url;
    this._resourceType = resourceType;
    this._body = body;
  }

  /**
   * @override
   * @return {!Common.ResourceType}
   */
  contentType() {
    return this._resourceType;
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this._url;
  }

  /**
   * @override
   * @return {!Promise<?string>}
   */
  requestContent() {
    return /** @type {!Promise<?string>} */ (Promise.resolve(this._body));
  }

  /**
   * @override
   * @return {!Promise<!Array<!Common.ContentProvider.SearchMatch>>}
   */
  searchInContent() {
    return Promise.resolve([]);
  }
};

Resources.ServiceWorkerCacheView._RESPONSE_CACHE_SIZE = 10;
