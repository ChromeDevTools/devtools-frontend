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

    var editorToolbar = new UI.Toolbar('data-view-toolbar', this.element);

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

    var needsRefresh = createElement('div');
    var needsRefreshIcon = needsRefresh.createChild('label', '', 'dt-icon-label');
    needsRefreshIcon.type = 'smallicon-warning';
    needsRefreshIcon.createChild('span').textContent = Common.UIString('Refresh needed');
    this._needsRefresh = new UI.ToolbarItem(needsRefresh);
    this._needsRefresh.setVisible(false);
    this._needsRefresh.setTitle(Common.UIString('Some entries have been modified'));
    editorToolbar.appendSpacer();
    editorToolbar.appendToolbarItem(this._needsRefresh);

    this._pageSize = 50;
    this._skipCount = 0;

    /** @type {!Array<!Resources.ServiceWorkerCacheView._Response>} */
    this._recentlyPreviewedResponses = [];

    this.update(cache);
    this._entries = [];
  }

  /**
   * @param {?UI.Widget} preview
   */
  _showPreview(preview) {
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
      {id: 'number', title: Common.UIString('#'), width: '50px'}, {id: 'request', title: Common.UIString('Request')},
      {id: 'response', title: Common.UIString('Response')},
      {id: 'responseTime', title: Common.UIString('Time Cached')}
    ]);
    var dataGrid = new DataGrid.DataGrid(
        columns, undefined, this._deleteButtonClicked.bind(this), this._updateData.bind(this, true));
    dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SelectedNode, event => this._previewCachedResponse(event.data.data['request']), this);
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

    await this._model.deleteCacheEntry(this._cache, /** @type {string} */ (node.data['request']));
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
   * @param {!Array.<!SDK.ServiceWorkerCacheModel.Entry>} entries
   * @param {boolean} hasMore
   * @this {Resources.ServiceWorkerCacheView}
   */
  _updateDataCallback(skipCount, entries, hasMore) {
    this._refreshButton.setEnabled(true);
    this.clear();
    this._entries = entries;
    for (var i = 0; i < entries.length; ++i) {
      var data = {};
      data['number'] = i + skipCount;
      data['request'] = entries[i].request;
      data['response'] = entries[i].response;
      data['responseTime'] = entries[i].responseTime;
      var node = new DataGrid.DataGridNode(data);
      node.selectable = true;
      this._dataGrid.rootNode().appendChild(node);
    }
    this._pageBackButton.setEnabled(!!skipCount);
    this._pageForwardButton.setEnabled(hasMore);
    this._needsRefresh.setVisible(false);
  }

  /**
   * @param {boolean} force
   */
  _updateData(force) {
    var pageSize = this._pageSize;
    var skipCount = this._skipCount;

    if (!force && this._lastPageSize === pageSize && this._lastSkipCount === skipCount)
      return;
    this._showPreview(null);
    this._refreshButton.setEnabled(false);
    if (this._lastPageSize !== pageSize) {
      skipCount = 0;
      this._skipCount = 0;
    }
    this._lastPageSize = pageSize;
    this._lastSkipCount = skipCount;
    this._recentlyPreviewedResponses = [];
    this._model.loadCacheData(this._cache, skipCount, pageSize, this._updateDataCallback.bind(this, skipCount));
  }

  /**
   * @param {!Common.Event} event
   */
  _refreshButtonClicked(event) {
    this._updateData(true);
  }

  markNeedsRefresh() {
    this._needsRefresh.setVisible(true);
  }

  clear() {
    this._dataGrid.rootNode().removeChildren();
    this._entries = [];
  }

  /**
   * @param {string} url
   * @return {!Resources.ServiceWorkerCacheView._Response}
   */
  _responseForUrl(url) {
    var response = null;
    var index = this._recentlyPreviewedResponses.findIndex(response => response.url === url);
    if (index >= 0) {
      response = this._recentlyPreviewedResponses[index];
      this._recentlyPreviewedResponses.splice(index, 1);
    } else {
      response = new Resources.ServiceWorkerCacheView._Response(this._cache, url);
    }
    if (this._recentlyPreviewedResponses.length === Resources.ServiceWorkerCacheView._RESPONSE_CACHE_SIZE)
      this._recentlyPreviewedResponses.pop();
    this._recentlyPreviewedResponses.unshift(response);
    return response;
  }

  /**
   * @param {string} url
   */
  async _previewCachedResponse(url) {
    var preview = await this._responseForUrl(url)._previewPromise;
    // It is possible that table selection changes before the preview opens
    var selectedRequest = this._dataGrid.selectedNode.data['request'];
    if (url !== selectedRequest)
      return;
    this._showPreview(preview);
  }

  /**
   * @override
   */
  willHide() {
    this._recentlyPreviewedResponses = [];
  }
};

Resources.ServiceWorkerCacheView._Response = class {
  /**
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   * @param {string} url
   */
  constructor(cache, url) {
    this.url = url;
    /** @type {!Promise<!UI.Widget>} */
    this._previewPromise = this._innerPreview(cache);
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
