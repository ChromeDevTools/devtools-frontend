/*
 * Copyright (C) 2008 Nokia Inc.  All rights reserved.
 * Copyright (C) 2013 Samsung Electronics. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

Resources.DOMStorageItemsView = class extends Resources.StorageItemsView {
  /**
   * @param {!Resources.DOMStorage} domStorage
   */
  constructor(domStorage) {
    super(Common.UIString('DOM Storage'), 'domStoragePanel');

    this._domStorage = domStorage;

    this.element.classList.add('storage-view', 'table');

    var columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'key', title: Common.UIString('Key'), sortable: false, editable: true, longText: true, weight: 50},
      {id: 'value', title: Common.UIString('Value'), sortable: false, editable: true, longText: true, weight: 50}
    ]);

    this._dataGrid = new DataGrid.DataGrid(columns, this._editingCallback.bind(this), this._deleteCallback.bind(this));
    this._dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SelectedNode, event => this._previewEntry(event.data.data), this);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode, event => this._previewEntry(null), this);
    this._dataGrid.setStriped(true);
    this._dataGrid.setName('DOMStorageItemsView');

    this._splitWidget = new UI.SplitWidget(false, false);
    this._splitWidget.show(this.element);
    this._splitWidget.setSecondIsSidebar(true);

    this._previewPanel = new UI.VBox();
    var resizer = this._previewPanel.element.createChild('div', 'preview-panel-resizer');
    this._splitWidget.setMainWidget(this._dataGrid.asWidget());
    this._splitWidget.setSidebarWidget(this._previewPanel);
    this._splitWidget.installResizer(resizer);

    /** @type {?UI.Widget} */
    this._preview = null;
    /** @type {?string} */
    this._previewValue = null;

    this._eventListeners = [];
    this.setStorage(domStorage);
  }

  /**
   * @param {!Resources.DOMStorage} domStorage
   */
  setStorage(domStorage) {
    Common.EventTarget.removeEventListeners(this._eventListeners);
    this._domStorage = domStorage;
    this._eventListeners = [
      this._domStorage.addEventListener(
          Resources.DOMStorage.Events.DOMStorageItemsCleared, this._domStorageItemsCleared, this),
      this._domStorage.addEventListener(
          Resources.DOMStorage.Events.DOMStorageItemRemoved, this._domStorageItemRemoved, this),
      this._domStorage.addEventListener(
          Resources.DOMStorage.Events.DOMStorageItemAdded, this._domStorageItemAdded, this),
      this._domStorage.addEventListener(
          Resources.DOMStorage.Events.DOMStorageItemUpdated, this._domStorageItemUpdated, this),
    ];
    this.refreshItems();
  }

  _domStorageItemsCleared() {
    if (!this.isShowing() || !this._dataGrid)
      return;

    this._dataGrid.rootNode().removeChildren();
    this._dataGrid.addCreationNode(false);
    this.setCanDeleteSelected(false);
  }

  /**
   * @param {!Common.Event} event
   */
  _domStorageItemRemoved(event) {
    if (!this.isShowing() || !this._dataGrid)
      return;

    var storageData = event.data;
    var rootNode = this._dataGrid.rootNode();
    var children = rootNode.children;

    for (var i = 0; i < children.length; ++i) {
      var childNode = children[i];
      if (childNode.data.key === storageData.key) {
        rootNode.removeChild(childNode);
        this.setCanDeleteSelected(children.length > 1);
        return;
      }
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _domStorageItemAdded(event) {
    if (!this.isShowing() || !this._dataGrid)
      return;

    var storageData = event.data;
    var rootNode = this._dataGrid.rootNode();
    var children = rootNode.children;

    this.setCanDeleteSelected(true);

    for (var i = 0; i < children.length; ++i) {
      if (children[i].data.key === storageData.key)
        return;
    }

    var childNode = new DataGrid.DataGridNode({key: storageData.key, value: storageData.value}, false);
    rootNode.insertChild(childNode, children.length - 1);
  }

  /**
   * @param {!Common.Event} event
   */
  _domStorageItemUpdated(event) {
    if (!this.isShowing() || !this._dataGrid)
      return;

    var storageData = event.data;
    var rootNode = this._dataGrid.rootNode();
    var children = rootNode.children;

    var keyFound = false;
    for (var i = 0; i < children.length; ++i) {
      var childNode = children[i];
      if (childNode.data.key === storageData.key) {
        if (keyFound) {
          rootNode.removeChild(childNode);
          return;
        }
        keyFound = true;
        if (childNode.data.value !== storageData.value) {
          childNode.data.value = storageData.value;
          childNode.refresh();
          childNode.select();
          childNode.reveal();
        }
        this.setCanDeleteSelected(true);
      }
    }
  }

  /**
   * @param {!Array<!Array<string>>} items
   */
  _showDOMStorageItems(items) {
    var rootNode = this._dataGrid.rootNode();
    var selectedKey = null;
    for (var node of rootNode.children) {
      if (!node.selected)
        continue;
      selectedKey = node.data.key;
      break;
    }
    rootNode.removeChildren();
    var selectedNode = null;
    var filteredItems = item => `${item[0]} ${item[1]}`;
    for (var item of this.filter(items, filteredItems)) {
      var key = item[0];
      var value = item[1];
      var node = new DataGrid.DataGridNode({key: key, value: value}, false);
      node.selectable = true;
      rootNode.appendChild(node);
      if (!selectedNode || key === selectedKey)
        selectedNode = node;
    }
    if (selectedNode)
      selectedNode.selected = true;
    this._dataGrid.addCreationNode(false);
    this.setCanDeleteSelected(!!selectedNode);
  }

  /**
   * @override
   */
  deleteSelectedItem() {
    if (!this._dataGrid || !this._dataGrid.selectedNode)
      return;

    this._deleteCallback(this._dataGrid.selectedNode);
  }

  /**
   * @override
   */
  refreshItems() {
    this._domStorage.getItems().then(items => items && this._showDOMStorageItems(items));
  }

  /**
   * @override
   */
  deleteAllItems() {
    this._domStorage.clear();
    // explicitly clear the view because the event won't be fired when it has no items
    this._domStorageItemsCleared();
  }

  _editingCallback(editingNode, columnIdentifier, oldText, newText) {
    var domStorage = this._domStorage;
    if (columnIdentifier === 'key') {
      if (typeof oldText === 'string')
        domStorage.removeItem(oldText);
      domStorage.setItem(newText, editingNode.data.value || '');
      this._removeDupes(editingNode);
    } else {
      domStorage.setItem(editingNode.data.key || '', newText);
    }
  }

  /**
   * @param {!DataGrid.DataGridNode} masterNode
   */
  _removeDupes(masterNode) {
    var rootNode = this._dataGrid.rootNode();
    var children = rootNode.children;
    for (var i = children.length - 1; i >= 0; --i) {
      var childNode = children[i];
      if ((childNode.data.key === masterNode.data.key) && (masterNode !== childNode))
        rootNode.removeChild(childNode);
    }
  }

  _deleteCallback(node) {
    if (!node || node.isCreationNode)
      return;

    if (this._domStorage)
      this._domStorage.removeItem(node.data.key);
  }

  /**
   * @param {?{value: string}} entry
   */
  async _previewEntry(entry) {
    var value = entry && entry.value;
    if (value === this._previewValue)
      return;
    if (this._preview)
      this._preview.detach();
    this._preview = null;
    this._previewValue = value;
    if (!value)
      return;

    var protocol = this._domStorage.isLocalStorage ? 'localstorage' : 'sessionstorage';
    var url = `${protocol}://${entry.key}`;
    var provider =
        Common.StaticContentProvider.fromString(url, Common.resourceTypes.XHR, /** @type {string} */ (value));
    var preview = await SourceFrame.PreviewFactory.createPreview(provider, 'text/plain');

    // Selection could've changed while the preview was loaded
    if (this._preview || !preview || this._previewValue !== value)
      return;
    this._preview = preview;
    this._preview.show(this._previewPanel.contentElement);
  }
};
