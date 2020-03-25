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

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {Database, DatabaseId, Entry, Index, IndexedDBModel, ObjectStore, ObjectStoreMetadata} from './IndexedDBModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class IDBDatabaseView extends UI.Widget.VBox {
  /**
   * @param {!IndexedDBModel} model
   * @param {?Database} database
   */
  constructor(model, database) {
    super();

    this._model = model;
    const databaseName = database ? database.databaseId.name : ls`Loading…`;

    this._reportView = new UI.ReportView.ReportView(databaseName);
    this._reportView.show(this.contentElement);

    const bodySection = this._reportView.appendSection('');
    this._securityOriginElement = bodySection.appendField(ls`Security origin`);
    this._versionElement = bodySection.appendField(ls`Version`);
    this._objectStoreCountElement = bodySection.appendField(ls`Object stores`);

    const footer = this._reportView.appendSection('').appendRow();
    this._clearButton =
        UI.UIUtils.createTextButton(ls`Delete database`, () => this._deleteDatabase(), ls`Delete database`);
    footer.appendChild(this._clearButton);

    this._refreshButton = UI.UIUtils.createTextButton(
        ls`Refresh database`, () => this._refreshDatabaseButtonClicked(), ls`Refresh database`);
    footer.appendChild(this._refreshButton);

    if (database) {
      this.update(database);
    }
  }

  _refreshDatabase() {
    this._securityOriginElement.textContent = this._database.databaseId.securityOrigin;
    this._versionElement.textContent = this._database.version;
    this._objectStoreCountElement.textContent = Object.keys(this._database.objectStores).length;
  }

  _refreshDatabaseButtonClicked() {
    this._model.refreshDatabase(this._database.databaseId);
  }

  /**
   * @param {!Database} database
   */
  update(database) {
    this._database = database;
    this._reportView.setTitle(this._database.databaseId.name);
    this._refreshDatabase();
    this._updatedForTests();
  }

  _updatedForTests() {
    // Sniffed in tests.
  }

  async _deleteDatabase() {
    const ok = await UI.UIUtils.ConfirmDialog.show(
        Common.UIString.UIString('Please confirm delete of "%s" database.', this._database.databaseId.name),
        this.element);
    if (ok) {
      this._model.deleteDatabase(this._database.databaseId);
    }
  }
}

/**
 * @unrestricted
 */
export class IDBDataView extends UI.View.SimpleView {
  /**
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   * @param {!ObjectStore} objectStore
   * @param {?Index} index
   * @param {function()} refreshObjectStoreCallback
   */
  constructor(model, databaseId, objectStore, index, refreshObjectStoreCallback) {
    super(Common.UIString.UIString('IDB'));
    this.registerRequiredCSS('resources/indexedDBViews.css');

    this._model = model;
    this._databaseId = databaseId;
    this._isIndex = !!index;
    this._refreshObjectStoreCallback = refreshObjectStoreCallback;

    this.element.classList.add('indexed-db-data-view', 'storage-view');

    this._refreshButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Refresh'), 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._refreshButtonClicked, this);

    this._deleteSelectedButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Delete selected'), 'largeicon-delete');
    this._deleteSelectedButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._deleteButtonClicked(null);
    });

    this._clearButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Clear object store'), 'largeicon-clear');
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._clearButtonClicked(event);
    }, this);

    this._needsRefresh = new UI.Toolbar.ToolbarItem(
        UI.UIUtils.createIconLabel(Common.UIString.UIString('Data may be stale'), 'smallicon-warning'));
    this._needsRefresh.setVisible(false);
    this._needsRefresh.setTitle(Common.UIString.UIString('Some entries may have been modified'));

    this._createEditorToolbar();

    this._pageSize = 50;
    this._skipCount = 0;

    this.update(objectStore, index);
    this._entries = [];
  }

  /**
   * @return {!DataGrid.DataGrid.DataGridImpl}
   */
  _createDataGrid() {
    const keyPath = this._isIndex ? this._index.keyPath : this._objectStore.keyPath;

    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([]);
    columns.push({id: 'number', title: Common.UIString.UIString('#'), sortable: false, width: '50px'});
    columns.push({
      id: 'key',
      titleDOMFragment: this._keyColumnHeaderFragment(Common.UIString.UIString('Key'), keyPath),
      sortable: false
    });
    if (this._isIndex) {
      columns.push({
        id: 'primaryKey',
        titleDOMFragment:
            this._keyColumnHeaderFragment(Common.UIString.UIString('Primary key'), this._objectStore.keyPath),
        sortable: false
      });
    }
    columns.push({id: 'value', title: Common.UIString.UIString('Value'), sortable: false});

    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: ls`Indexed DB`,
      columns,
      deleteCallback: this._deleteButtonClicked.bind(this),
      refreshCallback: this._updateData.bind(this, true)
    });
    dataGrid.setStriped(true);
    dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, event => this._updateToolbarEnablement(), this);
    return dataGrid;
  }

  /**
   * @param {string} prefix
   * @param {*} keyPath
   * @return {!DocumentFragment}
   */
  _keyColumnHeaderFragment(prefix, keyPath) {
    const keyColumnHeaderFragment = createDocumentFragment();
    keyColumnHeaderFragment.createTextChild(prefix);
    if (keyPath === null) {
      return keyColumnHeaderFragment;
    }

    keyColumnHeaderFragment.createTextChild(' (' + Common.UIString.UIString('Key path: '));
    if (Array.isArray(keyPath)) {
      keyColumnHeaderFragment.createTextChild('[');
      for (let i = 0; i < keyPath.length; ++i) {
        if (i !== 0) {
          keyColumnHeaderFragment.createTextChild(', ');
        }
        keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPath[i]));
      }
      keyColumnHeaderFragment.createTextChild(']');
    } else {
      const keyPathString = /** @type {string} */ (keyPath);
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
    const keyPathStringFragment = createDocumentFragment();
    keyPathStringFragment.createTextChild('"');
    const keyPathSpan = keyPathStringFragment.createChild('span', 'source-code indexed-db-key-path');
    keyPathSpan.textContent = keyPathString;
    keyPathStringFragment.createTextChild('"');
    return keyPathStringFragment;
  }

  _createEditorToolbar() {
    const editorToolbar = new UI.Toolbar.Toolbar('data-view-toolbar', this.element);

    editorToolbar.appendToolbarItem(this._refreshButton);

    editorToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());

    this._pageBackButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Show previous page'), 'largeicon-play-back');
    this._pageBackButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._pageBackButtonClicked, this);
    editorToolbar.appendToolbarItem(this._pageBackButton);

    this._pageForwardButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Show next page'), 'largeicon-play');
    this._pageForwardButton.setEnabled(false);
    this._pageForwardButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._pageForwardButtonClicked, this);
    editorToolbar.appendToolbarItem(this._pageForwardButton);

    this._keyInput = new UI.Toolbar.ToolbarInput(ls`Start from key`, '', 0.5);
    this._keyInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._updateData.bind(this, false));
    editorToolbar.appendToolbarItem(this._keyInput);
    editorToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());
    editorToolbar.appendToolbarItem(this._clearButton);
    editorToolbar.appendToolbarItem(this._deleteSelectedButton);

    editorToolbar.appendToolbarItem(this._needsRefresh);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _pageBackButtonClicked(event) {
    this._skipCount = Math.max(0, this._skipCount - this._pageSize);
    this._updateData(false);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _pageForwardButtonClicked(event) {
    this._skipCount = this._skipCount + this._pageSize;
    this._updateData(false);
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!DataGrid.DataGrid.DataGridNode} gridNode
   */
  _populateContextMenu(contextMenu, gridNode) {
    const node = /** @type {!IDBDataGridNode} */ (gridNode);
    if (node.valueObjectPresentation) {
      contextMenu.revealSection().appendItem(ls`Expand Recursively`, () => {
        node.valueObjectPresentation.objectTreeElement().expandRecursively();
      });
      contextMenu.revealSection().appendItem(ls`Collapse`, () => {
        node.valueObjectPresentation.objectTreeElement().collapse();
      });
    }
  }

  refreshData() {
    this._updateData(true);
  }

  /**
   * @param {!ObjectStore} objectStore
   * @param {?Index} index
   */
  update(objectStore, index) {
    this._objectStore = objectStore;
    this._index = index;

    if (this._dataGrid) {
      this._dataGrid.asWidget().detach();
    }
    this._dataGrid = this._createDataGrid();
    this._dataGrid.setRowContextMenuCallback(this._populateContextMenu.bind(this));
    this._dataGrid.asWidget().show(this.element);

    this._skipCount = 0;
    this._updateData(true);
  }

  /**
   * @param {string} keyString
   */
  _parseKey(keyString) {
    let result;
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
    const key = this._parseKey(this._keyInput.value());
    const pageSize = this._pageSize;
    let skipCount = this._skipCount;
    let selected = this._dataGrid.selectedNode ? this._dataGrid.selectedNode.data['number'] : 0;
    selected = Math.max(selected, this._skipCount);  // Page forward should select top entry
    this._refreshButton.setEnabled(false);
    this._clearButton.setEnabled(!this._isIndex);

    if (!force && this._lastKey === key && this._lastPageSize === pageSize && this._lastSkipCount === skipCount) {
      return;
    }

    if (this._lastKey !== key || this._lastPageSize !== pageSize) {
      skipCount = 0;
      this._skipCount = 0;
    }
    this._lastKey = key;
    this._lastPageSize = pageSize;
    this._lastSkipCount = skipCount;

    /**
     * @param {!Array.<!Entry>} entries
     * @param {boolean} hasMore
     * @this {IDBDataView}
     */
    function callback(entries, hasMore) {
      this._refreshButton.setEnabled(true);
      this.clear();
      this._entries = entries;
      let selectedNode = null;
      for (let i = 0; i < entries.length; ++i) {
        const data = {};
        data['number'] = i + skipCount;
        data['key'] = entries[i].key;
        data['primaryKey'] = entries[i].primaryKey;
        data['value'] = entries[i].value;

        const node = new IDBDataGridNode(data);
        this._dataGrid.rootNode().appendChild(node);
        if (data['number'] <= selected) {
          selectedNode = node;
        }
      }

      if (selectedNode) {
        selectedNode.select();
      }
      this._pageBackButton.setEnabled(!!skipCount);
      this._pageForwardButton.setEnabled(hasMore);
      this._needsRefresh.setVisible(false);
      this._updateToolbarEnablement();
      this._updatedDataForTests();
    }

    const idbKeyRange = key ? window.IDBKeyRange.lowerBound(key) : null;
    if (this._isIndex) {
      this._model.loadIndexData(
          this._databaseId, this._objectStore.name, this._index.name, idbKeyRange, skipCount, pageSize,
          callback.bind(this));
    } else {
      this._model.loadObjectStoreData(
          this._databaseId, this._objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
    }
    this._model.getMetadata(this._databaseId, this._objectStore).then(this._updateSummaryBar.bind(this));
  }

  /**
   * @param {?ObjectStoreMetadata} metadata
   */
  _updateSummaryBar(metadata) {
    if (!this._summaryBarElement) {
      this._summaryBarElement = this.element.createChild('div', 'object-store-summary-bar');
    }
    this._summaryBarElement.removeChildren();
    if (!metadata) {
      return;
    }

    const separator = '\u2002\u2758\u2002';

    const span = this._summaryBarElement.createChild('span');
    span.textContent = ls`Total entries: ${String(metadata.entriesCount)}`;

    if (this._objectStore.autoIncrement) {
      span.textContent += separator;
      span.textContent += ls`Key generator value: ${String(metadata.keyGeneratorValue)}`;
    }
  }

  _updatedDataForTests() {
    // Sniffed in tests.
  }

  /**
   * @param {?Common.EventTarget.EventTargetEvent} event
   */
  _refreshButtonClicked(event) {
    this._updateData(true);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _clearButtonClicked(event) {
    this._clearButton.setEnabled(false);
    await this._model.clearObjectStore(this._databaseId, this._objectStore.name);
    this._clearButton.setEnabled(true);
    this._updateData(true);
  }

  markNeedsRefresh() {
    this._needsRefresh.setVisible(true);
  }

  /**
   * @param {?DataGrid.DataGrid.DataGridNode} node
   */
  async _deleteButtonClicked(node) {
    if (!node) {
      node = this._dataGrid.selectedNode;
      if (!node) {
        return;
      }
    }
    const key = /** @type {!SDK.RemoteObject.RemoteObject} */ (this._isIndex ? node.data.primaryKey : node.data.key);
    const keyValue = /** @type {!Array<?>|!Date|number|string} */ (key.value);
    await this._model.deleteEntries(this._databaseId, this._objectStore.name, window.IDBKeyRange.only(keyValue));
    this._refreshObjectStoreCallback();
  }

  clear() {
    this._dataGrid.rootNode().removeChildren();
    this._entries = [];
  }

  _updateToolbarEnablement() {
    const empty = !this._dataGrid || this._dataGrid.rootNode().children.length === 0;
    this._deleteSelectedButton.setEnabled(!empty && this._dataGrid.selectedNode !== null);
  }
}

/**
 * @unrestricted
 */
export class IDBDataGridNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @param {!Object.<string, *>} data
   */
  constructor(data) {
    super(data, false);
    this.selectable = true;
    /** @type {?ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection} */
    this.valueObjectPresentation = null;
  }

  /**
   * @override
   * @return {!Element}
   */
  createCell(columnIdentifier) {
    const cell = super.createCell(columnIdentifier);
    const value = /** @type {!SDK.RemoteObject.RemoteObject} */ (this.data[columnIdentifier]);

    switch (columnIdentifier) {
      case 'value': {
        cell.removeChildren();
        const objectPropSection =
            ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.defaultObjectPropertiesSection(
                value, undefined /* linkifier */, true /* skipProto */, true /* readOnly */);
        cell.appendChild(objectPropSection.element);
        this.valueObjectPresentation = objectPropSection;
        break;
      }
      case 'key':
      case 'primaryKey': {
        cell.removeChildren();
        const objectElement = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.defaultObjectPresentation(
            value, undefined /* linkifier */, true /* skipProto */, true /* readOnly */);
        cell.appendChild(objectElement);
        break;
      }
      default: {
      }
    }

    return cell;
  }
}
