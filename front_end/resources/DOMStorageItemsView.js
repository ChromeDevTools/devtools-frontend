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

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {DOMStorage} from './DOMStorageModel.js';
import {StorageItemsView} from './StorageItemsView.js';

export class DOMStorageItemsView extends StorageItemsView {
  /**
   * @param {!DOMStorage} domStorage
   */
  constructor(domStorage) {
    super(Common.UIString.UIString('DOM Storage'), 'domStoragePanel');

    this._domStorage = domStorage;

    this.element.classList.add('storage-view', 'table');

    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'key', title: Common.UIString.UIString('Key'), sortable: false, editable: true, longText: true, weight: 50},
      {
        id: 'value',
        title: Common.UIString.UIString('Value'),
        sortable: false,
        editable: true,
        longText: true,
        weight: 50
      }
    ]);
    this._dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: ls`DOM Storage Items`,
      columns,
      editCallback: this._editingCallback.bind(this),
      deleteCallback: this._deleteCallback.bind(this),
      refreshCallback: this.refreshItems.bind(this)
    });
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, event => {
      this._previewEntry(/** @type {!DataGrid.DataGrid.DataGridNode} */ (event.data));
    });
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode, event => {
      this._previewEntry(null);
    });
    this._dataGrid.setStriped(true);
    this._dataGrid.setName('DOMStorageItemsView');

    this._splitWidget = new UI.SplitWidget.SplitWidget(
        /* isVertical: */ false, /* secondIsSidebar: */ true, 'domStorageSplitViewState');
    this._splitWidget.show(this.element);

    this._previewPanel = new UI.Widget.VBox();
    this._previewPanel.setMinimumSize(0, 50);
    const resizer = this._previewPanel.element.createChild('div', 'preview-panel-resizer');
    const dataGridWidget = this._dataGrid.asWidget();
    dataGridWidget.setMinimumSize(0, 50);
    this._splitWidget.setMainWidget(dataGridWidget);
    this._splitWidget.setSidebarWidget(this._previewPanel);
    this._splitWidget.installResizer(resizer);

    /** @type {?UI.Widget.Widget} */
    this._preview = null;
    /** @type {?string} */
    this._previewValue = null;

    this._showPreview(null, null);

    this._eventListeners = [];
    this.setStorage(domStorage);
  }

  /**
   * @param {!DOMStorage} domStorage
   */
  setStorage(domStorage) {
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    this._domStorage = domStorage;
    this._eventListeners = [
      this._domStorage.addEventListener(DOMStorage.Events.DOMStorageItemsCleared, this._domStorageItemsCleared, this),
      this._domStorage.addEventListener(DOMStorage.Events.DOMStorageItemRemoved, this._domStorageItemRemoved, this),
      this._domStorage.addEventListener(DOMStorage.Events.DOMStorageItemAdded, this._domStorageItemAdded, this),
      this._domStorage.addEventListener(DOMStorage.Events.DOMStorageItemUpdated, this._domStorageItemUpdated, this),
    ];
    this.refreshItems();
  }

  _domStorageItemsCleared() {
    if (!this.isShowing() || !this._dataGrid) {
      return;
    }

    this._dataGrid.rootNode().removeChildren();
    this._dataGrid.addCreationNode(false);
    this.setCanDeleteSelected(false);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _domStorageItemRemoved(event) {
    if (!this.isShowing() || !this._dataGrid) {
      return;
    }

    const storageData = event.data;
    const rootNode = this._dataGrid.rootNode();
    const children = rootNode.children;

    for (let i = 0; i < children.length; ++i) {
      const childNode = children[i];
      if (childNode.data.key === storageData.key) {
        rootNode.removeChild(childNode);
        this.setCanDeleteSelected(children.length > 1);
        return;
      }
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _domStorageItemAdded(event) {
    if (!this.isShowing() || !this._dataGrid) {
      return;
    }

    const storageData = event.data;
    const rootNode = this._dataGrid.rootNode();
    const children = rootNode.children;

    for (let i = 0; i < children.length; ++i) {
      if (children[i].data.key === storageData.key) {
        return;
      }
    }

    const childNode = new DataGrid.DataGrid.DataGridNode({key: storageData.key, value: storageData.value}, false);
    rootNode.insertChild(childNode, children.length - 1);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _domStorageItemUpdated(event) {
    if (!this.isShowing() || !this._dataGrid) {
      return;
    }

    const storageData = event.data;
    const childNode = this._dataGrid.rootNode().children.find(child => child.data.key === storageData.key);
    if (!childNode || childNode.data.value === storageData.value) {
      return;
    }

    childNode.data.value = storageData.value;
    childNode.refresh();
    if (!childNode.selected) {
      return;
    }
    this._previewEntry(childNode);
    this.setCanDeleteSelected(true);
  }

  /**
   * @param {!Array<!Array<string>>} items
   */
  _showDOMStorageItems(items) {
    const rootNode = this._dataGrid.rootNode();
    let selectedKey = null;
    for (const node of rootNode.children) {
      if (!node.selected) {
        continue;
      }
      selectedKey = node.data.key;
      break;
    }
    rootNode.removeChildren();
    let selectedNode = null;
    const filteredItems = item => `${item[0]} ${item[1]}`;
    for (const item of this.filter(items, filteredItems)) {
      const key = item[0];
      const value = item[1];
      const node = new DataGrid.DataGrid.DataGridNode({key: key, value: value}, false);
      node.selectable = true;
      rootNode.appendChild(node);
      if (!selectedNode || key === selectedKey) {
        selectedNode = node;
      }
    }
    if (selectedNode) {
      selectedNode.selected = true;
    }
    this._dataGrid.addCreationNode(false);
    this.setCanDeleteSelected(!!selectedNode);
  }

  /**
   * @override
   */
  deleteSelectedItem() {
    if (!this._dataGrid || !this._dataGrid.selectedNode) {
      return;
    }

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
    const domStorage = this._domStorage;
    if (columnIdentifier === 'key') {
      if (typeof oldText === 'string') {
        domStorage.removeItem(oldText);
      }
      domStorage.setItem(newText, editingNode.data.value || '');
      this._removeDupes(editingNode);
    } else {
      domStorage.setItem(editingNode.data.key || '', newText);
    }
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} masterNode
   */
  _removeDupes(masterNode) {
    const rootNode = this._dataGrid.rootNode();
    const children = rootNode.children;
    for (let i = children.length - 1; i >= 0; --i) {
      const childNode = children[i];
      if ((childNode.data.key === masterNode.data.key) && (masterNode !== childNode)) {
        rootNode.removeChild(childNode);
      }
    }
  }

  _deleteCallback(node) {
    if (!node || node.isCreationNode) {
      return;
    }

    if (this._domStorage) {
      this._domStorage.removeItem(node.data.key);
    }
  }

  /**
   * @param {?UI.Widget.Widget} preview
   * @param {?string} value
   */
  _showPreview(preview, value) {
    if (this._preview && this._previewValue === value) {
      return;
    }
    if (this._preview) {
      this._preview.detach();
    }
    if (!preview) {
      preview = new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('Select a value to preview'));
    }
    this._previewValue = value;
    this._preview = preview;
    preview.show(this._previewPanel.contentElement);
  }

  /**
   * @param {?DataGrid.DataGrid.DataGridNode} entry
   */
  async _previewEntry(entry) {
    const value = entry && entry.data && entry.data.value;
    if (!value) {
      this._showPreview(null, value);
      return;
    }
    const protocol = this._domStorage.isLocalStorage ? 'localstorage' : 'sessionstorage';
    const url = `${protocol}://${entry.key}`;
    const provider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
        url, Common.ResourceType.resourceTypes.XHR, /** @type {string} */ (value));
    const preview = await SourceFrame.PreviewFactory.PreviewFactory.createPreview(provider, 'text/plain');
    // Selection could've changed while the preview was loaded
    if (!entry.selected) {
      return;
    }
    this._showPreview(preview, value);
  }
}
