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

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js'; // eslint-disable-line no-unused-vars
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {Database, DatabaseId, Entry, Index, IndexedDBModel, ObjectStore, ObjectStoreMetadata} from './IndexedDBModel.js'; // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Text when something is loading
  */
  loading: 'Loading…',
  /**
  *@description Text in Indexed DBViews of the Application panel
  */
  securityOrigin: 'Security origin',
  /**
  *@description Text in Indexed DBViews of the Application panel
  */
  version: 'Version',
  /**
  *@description Text in Indexed DBViews of the Application panel
  */
  objectStores: 'Object stores',
  /**
  *@description Text of button in Indexed DBViews of the Application panel
  */
  deleteDatabase: 'Delete database',
  /**
  *@description Text of button in Indexed DBViews of the Application panel
  */
  refreshDatabase: 'Refresh database',
  /**
  *@description Text in Indexed DBViews of the Application panel
  *@example {msb} PH1
  */
  pleaseConfirmDeleteOfSDatabase: 'Please confirm delete of "{PH1}" database.',
  /**
  *@description Text in Indexed DBViews of the Application panel
  */
  idb: 'IDB',
  /**
  *@description Text to refresh the page
  */
  refresh: 'Refresh',
  /**
  *@description Tooltip text that appears when hovering over the largeicon delete button in the Indexed DBViews of the Application panel
  */
  deleteSelected: 'Delete selected',
  /**
  *@description Tooltip text that appears when hovering over the largeicon clear button in the Indexed DBViews of the Application panel
  */
  clearObjectStore: 'Clear object store',
  /**
  *@description Text in Indexed DBViews of the Application panel
  */
  dataMayBeStale: 'Data may be stale',
  /**
  *@description Title of needs refresh in indexed dbviews of the application panel
  */
  someEntriesMayHaveBeenModified: 'Some entries may have been modified',
  /**
  *@description Text in DOMStorage Items View of the Application panel
  */
  keyString: 'Key',
  /**
  *@description Text in Indexed DBViews of the Application panel
  */
  primaryKey: 'Primary key',
  /**
  *@description Text for the value of something
  */
  valueString: 'Value',
  /**
  *@description Data grid name for Indexed DB data grids
  */
  indexedDb: 'Indexed DB',
  /**
  *@description Text in Indexed DBViews of the Application panel
  */
  keyPath: 'Key path: ',
  /**
  *@description Tooltip text that appears when hovering over the largeicon play back button in the Indexed DBViews of the Application panel
  */
  showPreviousPage: 'Show previous page',
  /**
  *@description Tooltip text that appears when hovering over the largeicon play button in the Indexed DBViews of the Application panel
  */
  showNextPage: 'Show next page',
  /**
  *@description Text in Indexed DBViews of the Application panel
  */
  startFromKey: 'Start from key',
  /**
  *@description Text in Context menu for expanding objects in IndexedDB tables
  */
  expandRecursively: 'Expand Recursively',
  /**
  *@description Text in Context menu for collapsing objects in IndexedDB tables
  */
  collapse: 'Collapse',
  /**
  *@description Span text content in Indexed DBViews of the Application panel
  *@example {2} PH1
  */
  totalEntriesS: 'Total entries: {PH1}',
  /**
  *@description Text in Indexed DBViews of the Application panel
  *@example {2} PH1
  */
  keyGeneratorValueS: 'Key generator value: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/IndexedDBViews.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class IDBDatabaseView extends UI.Widget.VBox {
  _model: IndexedDBModel;
  _database!: Database;
  _reportView: UI.ReportView.ReportView;
  _securityOriginElement: HTMLElement;
  _versionElement: HTMLElement;
  _objectStoreCountElement: HTMLElement;
  _clearButton: HTMLButtonElement;
  _refreshButton: HTMLButtonElement;
  constructor(model: IndexedDBModel, database: Database|null) {
    super();

    this._model = model;
    const databaseName = database ? database.databaseId.name : i18nString(UIStrings.loading);

    this.registerRequiredCSS('panels/application/indexedDBViews.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('indexed-db-container');

    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this._reportView = new UI.ReportView.ReportView(databaseName);
    this._reportView.show(this.contentElement);
    this._reportView.registerRequiredCSS('panels/application/indexedDBViews.css', {enableLegacyPatching: false});
    this._reportView.element.classList.add('indexed-db-header');

    const bodySection = this._reportView.appendSection('');
    this._securityOriginElement = bodySection.appendField(i18nString(UIStrings.securityOrigin));
    this._versionElement = bodySection.appendField(i18nString(UIStrings.version));
    this._objectStoreCountElement = bodySection.appendField(i18nString(UIStrings.objectStores));

    const footer = this._reportView.appendSection('').appendRow();
    this._clearButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.deleteDatabase), () => this._deleteDatabase(), i18nString(UIStrings.deleteDatabase));
    footer.appendChild(this._clearButton);

    this._refreshButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.refreshDatabase), () => this._refreshDatabaseButtonClicked(),
        i18nString(UIStrings.refreshDatabase));
    footer.appendChild(this._refreshButton);

    if (database) {
      this.update(database);
    }
  }

  _refreshDatabase(): void {
    this._securityOriginElement.textContent = this._database.databaseId.securityOrigin;
    if (this._versionElement) {
      this._versionElement.textContent = this._database.version.toString();
    }

    this._objectStoreCountElement.textContent = this._database.objectStores.size.toString();
  }

  _refreshDatabaseButtonClicked(): void {
    this._model.refreshDatabase(this._database.databaseId);
  }

  update(database: Database): void {
    this._database = database;
    this._reportView.setTitle(this._database.databaseId.name);
    this._refreshDatabase();
    this._updatedForTests();
  }

  _updatedForTests(): void {
    // Sniffed in tests.
  }

  async _deleteDatabase(): Promise<void> {
    const ok = await UI.UIUtils.ConfirmDialog.show(
        i18nString(UIStrings.pleaseConfirmDeleteOfSDatabase, {PH1: this._database.databaseId.name}), this.element);
    if (ok) {
      this._model.deleteDatabase(this._database.databaseId);
    }
  }
}

export class IDBDataView extends UI.View.SimpleView {
  _model: IndexedDBModel;
  _databaseId: DatabaseId;
  _isIndex: boolean;
  _refreshObjectStoreCallback: () => void;
  _refreshButton: UI.Toolbar.ToolbarButton;
  _deleteSelectedButton: UI.Toolbar.ToolbarButton;
  _clearButton: UI.Toolbar.ToolbarButton;
  _needsRefresh: UI.Toolbar.ToolbarItem;
  _clearingObjectStore: boolean;
  _pageSize: number;
  _skipCount: number;
  _entries: Entry[];
  _objectStore!: ObjectStore;
  _index!: Index|null;
  _keyInput!: UI.Toolbar.ToolbarInput;
  _dataGrid!: DataGrid.DataGrid.DataGridImpl<unknown>;
  _lastPageSize!: number;
  _lastSkipCount!: number;
  _pageBackButton!: UI.Toolbar.ToolbarButton;
  _pageForwardButton!: UI.Toolbar.ToolbarButton;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _lastKey?: any;
  _summaryBarElement?: HTMLElement;

  constructor(
      model: IndexedDBModel, databaseId: DatabaseId, objectStore: ObjectStore, index: Index|null,
      refreshObjectStoreCallback: () => void) {
    super(i18nString(UIStrings.idb));
    this.registerRequiredCSS('panels/application/indexedDBViews.css', {enableLegacyPatching: false});

    this._model = model;
    this._databaseId = databaseId;
    this._isIndex = Boolean(index);
    this._refreshObjectStoreCallback = refreshObjectStoreCallback;

    this.element.classList.add('indexed-db-data-view', 'storage-view');

    this._refreshButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refresh), 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._refreshButtonClicked, this);

    this._deleteSelectedButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.deleteSelected), 'largeicon-delete');
    this._deleteSelectedButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      this._deleteButtonClicked(null);
    });

    this._clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearObjectStore), 'largeicon-clear');
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._clearButtonClicked(event);
    }, this);

    this._needsRefresh = new UI.Toolbar.ToolbarItem(
        UI.UIUtils.createIconLabel(i18nString(UIStrings.dataMayBeStale), 'smallicon-warning'));
    this._needsRefresh.setVisible(false);
    this._needsRefresh.setTitle(i18nString(UIStrings.someEntriesMayHaveBeenModified));
    this._clearingObjectStore = false;

    this._createEditorToolbar();

    this._pageSize = 50;
    this._skipCount = 0;

    this.update(objectStore, index);
    this._entries = [];
  }

  _createDataGrid(): DataGrid.DataGrid.DataGridImpl<unknown> {
    const keyPath = this._isIndex && this._index ? this._index.keyPath : this._objectStore.keyPath;

    const columns = ([] as DataGrid.DataGrid.ColumnDescriptor[]);

    // Create column defaults so that we avoid repetition below.
    const columnDefaults = {
      title: undefined,
      titleDOMFragment: undefined,
      sortable: false,
      sort: undefined,
      align: undefined,
      width: undefined,
      fixedWidth: undefined,
      editable: undefined,
      nonSelectable: undefined,
      longText: undefined,
      disclosure: undefined,
      weight: undefined,
      allowInSortByEvenWhenHidden: undefined,
      dataType: undefined,
      defaultWeight: undefined,
    };
    columns.push(
        ({...columnDefaults, id: 'number', title: '#', sortable: false, width: '50px'} as
         DataGrid.DataGrid.ColumnDescriptor));
    columns.push(({
      ...columnDefaults,
      id: 'key',
      titleDOMFragment: this._keyColumnHeaderFragment(i18nString(UIStrings.keyString), keyPath),
      sortable: false,
    } as DataGrid.DataGrid.ColumnDescriptor));
    if (this._isIndex) {
      columns.push(({
        ...columnDefaults,
        id: 'primaryKey',
        titleDOMFragment: this._keyColumnHeaderFragment(i18nString(UIStrings.primaryKey), this._objectStore.keyPath),
        sortable: false,
      } as DataGrid.DataGrid.ColumnDescriptor));
    }
    const title = i18nString(UIStrings.valueString);
    columns.push(({...columnDefaults, id: 'value', title, sortable: false} as DataGrid.DataGrid.ColumnDescriptor));

    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.indexedDb),
      columns,
      deleteCallback: this._deleteButtonClicked.bind(this),
      refreshCallback: this._updateData.bind(this, true),
      editCallback: undefined,
    });
    dataGrid.setStriped(true);
    dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, _vent => this._updateToolbarEnablement(), this);
    return dataGrid;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _keyColumnHeaderFragment(prefix: string, keyPath: any): DocumentFragment {
    const keyColumnHeaderFragment = document.createDocumentFragment();
    UI.UIUtils.createTextChild(keyColumnHeaderFragment, prefix);
    if (keyPath === null) {
      return keyColumnHeaderFragment;
    }

    UI.UIUtils.createTextChild(keyColumnHeaderFragment, ' (' + i18nString(UIStrings.keyPath));
    if (Array.isArray(keyPath)) {
      UI.UIUtils.createTextChild(keyColumnHeaderFragment, '[');
      for (let i = 0; i < keyPath.length; ++i) {
        if (i !== 0) {
          UI.UIUtils.createTextChild(keyColumnHeaderFragment, ', ');
        }
        keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPath[i]));
      }
      UI.UIUtils.createTextChild(keyColumnHeaderFragment, ']');
    } else {
      const keyPathString = (keyPath as string);
      keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPathString));
    }
    UI.UIUtils.createTextChild(keyColumnHeaderFragment, ')');
    return keyColumnHeaderFragment;
  }

  _keyPathStringFragment(keyPathString: string): DocumentFragment {
    const keyPathStringFragment = document.createDocumentFragment();
    UI.UIUtils.createTextChild(keyPathStringFragment, '"');
    const keyPathSpan = keyPathStringFragment.createChild('span', 'source-code indexed-db-key-path');
    keyPathSpan.textContent = keyPathString;
    UI.UIUtils.createTextChild(keyPathStringFragment, '"');
    return keyPathStringFragment;
  }

  _createEditorToolbar(): void {
    const editorToolbar = new UI.Toolbar.Toolbar('data-view-toolbar', this.element);

    editorToolbar.appendToolbarItem(this._refreshButton);

    editorToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());

    this._pageBackButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showPreviousPage), 'largeicon-play-back');
    this._pageBackButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._pageBackButtonClicked, this);
    editorToolbar.appendToolbarItem(this._pageBackButton);

    this._pageForwardButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showNextPage), 'largeicon-play');
    this._pageForwardButton.setEnabled(false);
    this._pageForwardButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._pageForwardButtonClicked, this);
    editorToolbar.appendToolbarItem(this._pageForwardButton);

    this._keyInput = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.startFromKey), '', 0.5);
    this._keyInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._updateData.bind(this, false));
    editorToolbar.appendToolbarItem(this._keyInput);
    editorToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());
    editorToolbar.appendToolbarItem(this._clearButton);
    editorToolbar.appendToolbarItem(this._deleteSelectedButton);

    editorToolbar.appendToolbarItem(this._needsRefresh);
  }

  _pageBackButtonClicked(_event: Common.EventTarget.EventTargetEvent): void {
    this._skipCount = Math.max(0, this._skipCount - this._pageSize);
    this._updateData(false);
  }

  _pageForwardButtonClicked(_event: Common.EventTarget.EventTargetEvent): void {
    this._skipCount = this._skipCount + this._pageSize;
    this._updateData(false);
  }

  _populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, gridNode: DataGrid.DataGrid.DataGridNode<unknown>):
      void {
    const node = (gridNode as IDBDataGridNode);
    if (node.valueObjectPresentation) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.expandRecursively), () => {
        if (!node.valueObjectPresentation) {
          return;
        }
        node.valueObjectPresentation.objectTreeElement().expandRecursively();
      });
      contextMenu.revealSection().appendItem(i18nString(UIStrings.collapse), () => {
        if (!node.valueObjectPresentation) {
          return;
        }
        node.valueObjectPresentation.objectTreeElement().collapse();
      });
    }
  }

  refreshData(): void {
    this._updateData(true);
  }

  update(objectStore: ObjectStore, index: Index|null): void {
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

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseKey(keyString: string): any {
    let result;
    try {
      result = JSON.parse(keyString);
    } catch (e) {
      result = keyString;
    }
    return result;
  }

  _updateData(force: boolean): void {
    const key = this._parseKey(this._keyInput.value());
    const pageSize = this._pageSize;
    let skipCount: 0|number = this._skipCount;
    let selected = this._dataGrid.selectedNode ? this._dataGrid.selectedNode.data['number'] : 0;
    selected = Math.max(selected, this._skipCount);  // Page forward should select top entry
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

    function callback(this: IDBDataView, entries: Entry[], hasMore: boolean): void {
      this.clear();
      this._entries = entries;
      let selectedNode: IDBDataGridNode|null = null;
      for (let i = 0; i < entries.length; ++i) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {};
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
      this._pageBackButton.setEnabled(Boolean(skipCount));
      this._pageForwardButton.setEnabled(hasMore);
      this._needsRefresh.setVisible(false);
      this._updateToolbarEnablement();
      this._updatedDataForTests();
    }

    const idbKeyRange = key ? window.IDBKeyRange.lowerBound(key) : null;
    if (this._isIndex && this._index) {
      this._model.loadIndexData(
          this._databaseId, this._objectStore.name, this._index.name, idbKeyRange, skipCount, pageSize,
          callback.bind(this));
    } else {
      this._model.loadObjectStoreData(
          this._databaseId, this._objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
    }
    this._model.getMetadata(this._databaseId, this._objectStore).then(this._updateSummaryBar.bind(this));
  }

  _updateSummaryBar(metadata: ObjectStoreMetadata|null): void {
    if (!this._summaryBarElement) {
      this._summaryBarElement = this.element.createChild('div', 'object-store-summary-bar');
    }
    this._summaryBarElement.removeChildren();
    if (!metadata) {
      return;
    }

    const separator = '\u2002\u2758\u2002';

    const span = this._summaryBarElement.createChild('span');
    span.textContent = i18nString(UIStrings.totalEntriesS, {PH1: String(metadata.entriesCount)});

    if (this._objectStore.autoIncrement) {
      span.textContent += separator;
      span.textContent += i18nString(UIStrings.keyGeneratorValueS, {PH1: String(metadata.keyGeneratorValue)});
    }
  }

  _updatedDataForTests(): void {
    // Sniffed in tests.
  }

  _refreshButtonClicked(_event: Common.EventTarget.EventTargetEvent|null): void {
    this._updateData(true);
  }

  async _clearButtonClicked(_event: Common.EventTarget.EventTargetEvent): Promise<void> {
    this._clearButton.setEnabled(false);
    this._clearingObjectStore = true;
    await this._model.clearObjectStore(this._databaseId, this._objectStore.name);
    this._clearingObjectStore = false;
    this._clearButton.setEnabled(true);
    this._updateData(true);
  }

  markNeedsRefresh(): void {
    // We expect that calling clearObjectStore() will cause the backend to send us an update.
    if (this._clearingObjectStore) {
      return;
    }
    this._needsRefresh.setVisible(true);
  }

  async _deleteButtonClicked(node: DataGrid.DataGrid.DataGridNode<unknown>|null): Promise<void> {
    if (!node) {
      node = this._dataGrid.selectedNode;
      if (!node) {
        return;
      }
    }
    const key = (this._isIndex ? node.data.primaryKey : node.data.key as SDK.RemoteObject.RemoteObject);
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keyValue = (key.value as string | number | any[] | Date);
    await this._model.deleteEntries(this._databaseId, this._objectStore.name, window.IDBKeyRange.only(keyValue));
    this._refreshObjectStoreCallback();
  }

  clear(): void {
    this._dataGrid.rootNode().removeChildren();
    this._entries = [];
  }

  _updateToolbarEnablement(): void {
    const empty = !this._dataGrid || this._dataGrid.rootNode().children.length === 0;
    this._deleteSelectedButton.setEnabled(!empty && this._dataGrid.selectedNode !== null);
  }
}

export class IDBDataGridNode extends DataGrid.DataGrid.DataGridNode<unknown> {
  selectable: boolean;
  valueObjectPresentation: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection|null;
  constructor(data: {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any,
  }) {
    super(data, false);
    this.selectable = true;
    this.valueObjectPresentation = null;
  }

  createCell(columnIdentifier: string): HTMLElement {
    const cell = super.createCell(columnIdentifier);
    const value = (this.data[columnIdentifier] as SDK.RemoteObject.RemoteObject);

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
