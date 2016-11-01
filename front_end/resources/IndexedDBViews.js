/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @unrestricted
 */
WebInspector.IDBDatabaseView = class extends WebInspector.VBox {
  /**
   * @param {!WebInspector.IndexedDBModel.Database} database
   */
  constructor(database) {
    super();
    this.registerRequiredCSS('resources/indexedDBViews.css');

    this.element.classList.add('indexed-db-database-view');
    this.element.classList.add('storage-view');

    this._securityOriginElement = this.element.createChild('div', 'header-row');
    this._nameElement = this.element.createChild('div', 'header-row');
    this._versionElement = this.element.createChild('div', 'header-row');

    this.update(database);
  }

  /**
   * @param {!Element} element
   * @param {string} name
   * @param {string} value
   */
  _formatHeader(element, name, value) {
    element.removeChildren();
    element.createChild('div', 'attribute-name').textContent = name + ':';
    element.createChild('div', 'attribute-value source-code').textContent = value;
  }

  _refreshDatabase() {
    this._formatHeader(
        this._securityOriginElement, WebInspector.UIString('Security origin'),
        this._database.databaseId.securityOrigin);
    this._formatHeader(this._nameElement, WebInspector.UIString('Name'), this._database.databaseId.name);
    this._formatHeader(this._versionElement, WebInspector.UIString('Version'), this._database.version);
  }

  /**
   * @param {!WebInspector.IndexedDBModel.Database} database
   */
  update(database) {
    this._database = database;
    this._refreshDatabase();
  }
};

/**
 * @unrestricted
 */
WebInspector.IDBDataView = class extends WebInspector.SimpleView {
  /**
   * @param {!WebInspector.IndexedDBModel} model
   * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
   * @param {!WebInspector.IndexedDBModel.ObjectStore} objectStore
   * @param {?WebInspector.IndexedDBModel.Index} index
   */
  constructor(model, databaseId, objectStore, index) {
    super(WebInspector.UIString('IDB'));
    this.registerRequiredCSS('resources/indexedDBViews.css');

    this._model = model;
    this._databaseId = databaseId;
    this._isIndex = !!index;

    this.element.classList.add('indexed-db-data-view');

    this._createEditorToolbar();

    this._refreshButton = new WebInspector.ToolbarButton(WebInspector.UIString('Refresh'), 'refresh-toolbar-item');
    this._refreshButton.addEventListener('click', this._refreshButtonClicked, this);

    this._clearButton =
        new WebInspector.ToolbarButton(WebInspector.UIString('Clear object store'), 'clear-toolbar-item');
    this._clearButton.addEventListener('click', this._clearButtonClicked, this);

    this._pageSize = 50;
    this._skipCount = 0;

    this.update(objectStore, index);
    this._entries = [];
  }

  /**
   * @return {!WebInspector.DataGrid}
   */
  _createDataGrid() {
    var keyPath = this._isIndex ? this._index.keyPath : this._objectStore.keyPath;

    var columns = /** @type {!Array<!WebInspector.DataGrid.ColumnDescriptor>} */ ([]);
    columns.push({id: 'number', title: WebInspector.UIString('#'), sortable: false, width: '50px'});
    columns.push({
      id: 'key',
      titleDOMFragment: this._keyColumnHeaderFragment(WebInspector.UIString('Key'), keyPath),
      sortable: false
    });
    if (this._isIndex)
      columns.push({
        id: 'primaryKey',
        titleDOMFragment:
            this._keyColumnHeaderFragment(WebInspector.UIString('Primary key'), this._objectStore.keyPath),
        sortable: false
      });
    columns.push({id: 'value', title: WebInspector.UIString('Value'), sortable: false});

    var dataGrid = new WebInspector.DataGrid(columns);
    return dataGrid;
  }

  /**
   * @param {string} prefix
   * @param {*} keyPath
   * @return {!DocumentFragment}
   */
  _keyColumnHeaderFragment(prefix, keyPath) {
    var keyColumnHeaderFragment = createDocumentFragment();
    keyColumnHeaderFragment.createTextChild(prefix);
    if (keyPath === null)
      return keyColumnHeaderFragment;

    keyColumnHeaderFragment.createTextChild(' (' + WebInspector.UIString('Key path: '));
    if (Array.isArray(keyPath)) {
      keyColumnHeaderFragment.createTextChild('[');
      for (var i = 0; i < keyPath.length; ++i) {
        if (i !== 0)
          keyColumnHeaderFragment.createTextChild(', ');
        keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPath[i]));
      }
      keyColumnHeaderFragment.createTextChild(']');
    } else {
      var keyPathString = /** @type {string} */ (keyPath);
      keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPathString));
    }
    keyColumnHeaderFragment.createTextChild(')');
    return keyColumnHeaderFragment;
  }

  /**
   * @param {string} keyPathString
   * @return {!DocumentFragment}
   */
  _keyPathStringFragment(keyPathString) {
    var keyPathStringFragment = createDocumentFragment();
    keyPathStringFragment.createTextChild('"');
    var keyPathSpan = keyPathStringFragment.createChild('span', 'source-code indexed-db-key-path');
    keyPathSpan.textContent = keyPathString;
    keyPathStringFragment.createTextChild('"');
    return keyPathStringFragment;
  }

  _createEditorToolbar() {
    var editorToolbar = new WebInspector.Toolbar('data-view-toolbar', this.element);

    this._pageBackButton =
        new WebInspector.ToolbarButton(WebInspector.UIString('Show previous page'), 'play-backwards-toolbar-item');
    this._pageBackButton.addEventListener('click', this._pageBackButtonClicked, this);
    editorToolbar.appendToolbarItem(this._pageBackButton);

    this._pageForwardButton =
        new WebInspector.ToolbarButton(WebInspector.UIString('Show next page'), 'play-toolbar-item');
    this._pageForwardButton.setEnabled(false);
    this._pageForwardButton.addEventListener('click', this._pageForwardButtonClicked, this);
    editorToolbar.appendToolbarItem(this._pageForwardButton);

    this._keyInputElement = editorToolbar.element.createChild('input', 'key-input');
    this._keyInputElement.placeholder = WebInspector.UIString('Start from key');
    this._keyInputElement.addEventListener('paste', this._keyInputChanged.bind(this), false);
    this._keyInputElement.addEventListener('cut', this._keyInputChanged.bind(this), false);
    this._keyInputElement.addEventListener('keypress', this._keyInputChanged.bind(this), false);
    this._keyInputElement.addEventListener('keydown', this._keyInputChanged.bind(this), false);
  }

  _pageBackButtonClicked() {
    this._skipCount = Math.max(0, this._skipCount - this._pageSize);
    this._updateData(false);
  }

  _pageForwardButtonClicked() {
    this._skipCount = this._skipCount + this._pageSize;
    this._updateData(false);
  }

  _keyInputChanged() {
    window.setTimeout(this._updateData.bind(this, false), 0);
  }

  /**
   * @param {!WebInspector.IndexedDBModel.ObjectStore} objectStore
   * @param {?WebInspector.IndexedDBModel.Index} index
   */
  update(objectStore, index) {
    this._objectStore = objectStore;
    this._index = index;

    if (this._dataGrid)
      this._dataGrid.asWidget().detach();
    this._dataGrid = this._createDataGrid();
    this._dataGrid.asWidget().show(this.element);

    this._skipCount = 0;
    this._updateData(true);
  }

  /**
   * @param {string} keyString
   */
  _parseKey(keyString) {
    var result;
    try {
      result = JSON.parse(keyString);
    } catch (e) {
      result = keyString;
    }
    return result;
  }

  /**
   * @param {boolean} force
   */
  _updateData(force) {
    var key = this._parseKey(this._keyInputElement.value);
    var pageSize = this._pageSize;
    var skipCount = this._skipCount;
    this._refreshButton.setEnabled(false);
    this._clearButton.setEnabled(!this._isIndex);

    if (!force && this._lastKey === key && this._lastPageSize === pageSize && this._lastSkipCount === skipCount)
      return;

    if (this._lastKey !== key || this._lastPageSize !== pageSize) {
      skipCount = 0;
      this._skipCount = 0;
    }
    this._lastKey = key;
    this._lastPageSize = pageSize;
    this._lastSkipCount = skipCount;

    /**
     * @param {!Array.<!WebInspector.IndexedDBModel.Entry>} entries
     * @param {boolean} hasMore
     * @this {WebInspector.IDBDataView}
     */
    function callback(entries, hasMore) {
      this._refreshButton.setEnabled(true);
      this.clear();
      this._entries = entries;
      for (var i = 0; i < entries.length; ++i) {
        var data = {};
        data['number'] = i + skipCount;
        data['key'] = entries[i].key;
        data['primaryKey'] = entries[i].primaryKey;
        data['value'] = entries[i].value;

        var node = new WebInspector.IDBDataGridNode(data);
        this._dataGrid.rootNode().appendChild(node);
      }

      this._pageBackButton.setEnabled(!!skipCount);
      this._pageForwardButton.setEnabled(hasMore);
    }

    var idbKeyRange = key ? window.IDBKeyRange.lowerBound(key) : null;
    if (this._isIndex)
      this._model.loadIndexData(
          this._databaseId, this._objectStore.name, this._index.name, idbKeyRange, skipCount, pageSize,
          callback.bind(this));
    else
      this._model.loadObjectStoreData(
          this._databaseId, this._objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
  }

  _refreshButtonClicked(event) {
    this._updateData(true);
  }

  _clearButtonClicked(event) {
    /**
     * @this {WebInspector.IDBDataView}
     */
    function cleared() {
      this._clearButton.setEnabled(true);
      this._updateData(true);
    }
    this._clearButton.setEnabled(false);
    this._model.clearObjectStore(this._databaseId, this._objectStore.name, cleared.bind(this));
  }

  /**
   * @override
   * @return {!Array.<!WebInspector.ToolbarItem>}
   */
  syncToolbarItems() {
    return [this._refreshButton, this._clearButton];
  }

  clear() {
    this._dataGrid.rootNode().removeChildren();
    this._entries = [];
  }
};

/**
 * @unrestricted
 */
WebInspector.IDBDataGridNode = class extends WebInspector.DataGridNode {
  /**
   * @param {!Object.<string, *>} data
   */
  constructor(data) {
    super(data, false);
    this.selectable = false;
  }

  /**
   * @override
   * @return {!Element}
   */
  createCell(columnIdentifier) {
    var cell = super.createCell(columnIdentifier);
    var value = /** @type {!WebInspector.RemoteObject} */ (this.data[columnIdentifier]);

    switch (columnIdentifier) {
      case 'value':
      case 'key':
      case 'primaryKey':
        cell.removeChildren();
        var objectElement = WebInspector.ObjectPropertiesSection.defaultObjectPresentation(value, undefined, true);
        cell.appendChild(objectElement);
        break;
      default:
    }

    return cell;
  }
};
