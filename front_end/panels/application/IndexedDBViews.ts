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

import * as i18n from '../../core/i18n/i18n.js';

import indexedDBViewsStyles from './indexedDBViews.css.js';

import type * as SDK from '../../core/sdk/sdk.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import {
  type Database,
  type DatabaseId,
  type Entry,
  type Index,
  type IndexedDBModel,
  type ObjectStore,
  type ObjectStoreMetadata,
} from './IndexedDBModel.js';

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
  private readonly model: IndexedDBModel;
  private database!: Database;
  private readonly reportView: UI.ReportView.ReportView;
  private securityOriginElement: HTMLElement;
  private versionElement: HTMLElement;
  private objectStoreCountElement: HTMLElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly refreshButton: HTMLButtonElement;
  constructor(model: IndexedDBModel, database: Database|null) {
    super();

    this.model = model;
    const databaseName = database ? database.databaseId.name : i18nString(UIStrings.loading);

    this.contentElement.classList.add('indexed-db-container');

    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this.reportView = new UI.ReportView.ReportView(databaseName);
    this.reportView.show(this.contentElement);

    this.reportView.element.classList.add('indexed-db-header');

    const bodySection = this.reportView.appendSection('');
    this.securityOriginElement = bodySection.appendField(i18nString(UIStrings.securityOrigin));
    this.versionElement = bodySection.appendField(i18nString(UIStrings.version));
    this.objectStoreCountElement = bodySection.appendField(i18nString(UIStrings.objectStores));

    const footer = this.reportView.appendSection('').appendRow();
    this.clearButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.deleteDatabase), () => this.deleteDatabase(), i18nString(UIStrings.deleteDatabase));
    footer.appendChild(this.clearButton);

    this.refreshButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.refreshDatabase), () => this.refreshDatabaseButtonClicked(),
        i18nString(UIStrings.refreshDatabase));
    footer.appendChild(this.refreshButton);

    if (database) {
      this.update(database);
    }
  }

  private refreshDatabase(): void {
    this.securityOriginElement.textContent = this.database.databaseId.storageKey;
    if (this.versionElement) {
      this.versionElement.textContent = this.database.version.toString();
    }

    this.objectStoreCountElement.textContent = this.database.objectStores.size.toString();
  }

  private refreshDatabaseButtonClicked(): void {
    this.model.refreshDatabase(this.database.databaseId);
  }

  update(database: Database): void {
    this.database = database;
    this.reportView.setTitle(this.database.databaseId.name);
    this.refreshDatabase();
    this.updatedForTests();
  }

  private updatedForTests(): void {
    // Sniffed in tests.
  }

  private async deleteDatabase(): Promise<void> {
    const ok = await UI.UIUtils.ConfirmDialog.show(
        i18nString(UIStrings.pleaseConfirmDeleteOfSDatabase, {PH1: this.database.databaseId.name}), this.element);
    if (ok) {
      void this.model.deleteDatabase(this.database.databaseId);
    }
  }
  wasShown(): void {
    super.wasShown();
    this.reportView.registerCSSFiles([indexedDBViewsStyles]);
    this.registerCSSFiles([indexedDBViewsStyles]);
  }
}

export class IDBDataView extends UI.View.SimpleView {
  private readonly model: IndexedDBModel;
  private readonly databaseId: DatabaseId;
  private isIndex: boolean;
  private readonly refreshObjectStoreCallback: () => void;
  private readonly refreshButton: UI.Toolbar.ToolbarButton;
  private readonly deleteSelectedButton: UI.Toolbar.ToolbarButton;
  private readonly clearButton: UI.Toolbar.ToolbarButton;
  private readonly needsRefresh: UI.Toolbar.ToolbarItem;
  private clearingObjectStore: boolean;
  private pageSize: number;
  private skipCount: number;
  private entries: Entry[];
  private objectStore!: ObjectStore;
  private index!: Index|null;
  private keyInput!: UI.Toolbar.ToolbarInput;
  private dataGrid!: DataGrid.DataGrid.DataGridImpl<unknown>;
  private lastPageSize!: number;
  private lastSkipCount!: number;
  private pageBackButton!: UI.Toolbar.ToolbarButton;
  private pageForwardButton!: UI.Toolbar.ToolbarButton;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private lastKey?: any;
  private summaryBarElement?: HTMLElement;

  constructor(
      model: IndexedDBModel, databaseId: DatabaseId, objectStore: ObjectStore, index: Index|null,
      refreshObjectStoreCallback: () => void) {
    super(i18nString(UIStrings.idb));

    this.model = model;
    this.databaseId = databaseId;
    this.isIndex = Boolean(index);
    this.refreshObjectStoreCallback = refreshObjectStoreCallback;

    this.element.classList.add('indexed-db-data-view', 'storage-view');

    this.refreshButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refresh), 'largeicon-refresh');
    this.refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.refreshButtonClicked, this);

    this.deleteSelectedButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.deleteSelected), 'largeicon-delete');
    this.deleteSelectedButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      void this.deleteButtonClicked(null);
    });

    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearObjectStore), 'largeicon-clear');
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      void this.clearButtonClicked();
    }, this);

    this.needsRefresh = new UI.Toolbar.ToolbarItem(
        UI.UIUtils.createIconLabel(i18nString(UIStrings.dataMayBeStale), 'smallicon-warning'));
    this.needsRefresh.setVisible(false);
    this.needsRefresh.setTitle(i18nString(UIStrings.someEntriesMayHaveBeenModified));
    this.clearingObjectStore = false;

    this.createEditorToolbar();

    this.pageSize = 50;
    this.skipCount = 0;

    this.update(objectStore, index);
    this.entries = [];
  }

  private createDataGrid(): DataGrid.DataGrid.DataGridImpl<unknown> {
    const keyPath = this.isIndex && this.index ? this.index.keyPath : this.objectStore.keyPath;

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
      titleDOMFragment: this.keyColumnHeaderFragment(i18nString(UIStrings.keyString), keyPath),
      sortable: false,
    } as DataGrid.DataGrid.ColumnDescriptor));
    if (this.isIndex) {
      columns.push(({
        ...columnDefaults,
        id: 'primaryKey',
        titleDOMFragment: this.keyColumnHeaderFragment(i18nString(UIStrings.primaryKey), this.objectStore.keyPath),
        sortable: false,
      } as DataGrid.DataGrid.ColumnDescriptor));
    }
    const title = i18nString(UIStrings.valueString);
    columns.push(({...columnDefaults, id: 'value', title, sortable: false} as DataGrid.DataGrid.ColumnDescriptor));

    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.indexedDb),
      columns,
      deleteCallback: this.deleteButtonClicked.bind(this),
      refreshCallback: this.updateData.bind(this, true),
      editCallback: undefined,
    });
    dataGrid.setStriped(true);
    dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, () => this.updateToolbarEnablement(), this);
    return dataGrid;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private keyColumnHeaderFragment(prefix: string, keyPath: any): DocumentFragment {
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
        keyColumnHeaderFragment.appendChild(this.keyPathStringFragment(keyPath[i]));
      }
      UI.UIUtils.createTextChild(keyColumnHeaderFragment, ']');
    } else {
      const keyPathString = (keyPath as string);
      keyColumnHeaderFragment.appendChild(this.keyPathStringFragment(keyPathString));
    }
    UI.UIUtils.createTextChild(keyColumnHeaderFragment, ')');
    return keyColumnHeaderFragment;
  }

  private keyPathStringFragment(keyPathString: string): DocumentFragment {
    const keyPathStringFragment = document.createDocumentFragment();
    UI.UIUtils.createTextChild(keyPathStringFragment, '"');
    const keyPathSpan = keyPathStringFragment.createChild('span', 'source-code indexed-db-key-path');
    keyPathSpan.textContent = keyPathString;
    UI.UIUtils.createTextChild(keyPathStringFragment, '"');
    return keyPathStringFragment;
  }

  private createEditorToolbar(): void {
    const editorToolbar = new UI.Toolbar.Toolbar('data-view-toolbar', this.element);

    editorToolbar.appendToolbarItem(this.refreshButton);

    editorToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());

    this.pageBackButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showPreviousPage), 'largeicon-play-back');
    this.pageBackButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.pageBackButtonClicked, this);
    editorToolbar.appendToolbarItem(this.pageBackButton);

    this.pageForwardButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showNextPage), 'largeicon-play');
    this.pageForwardButton.setEnabled(false);
    this.pageForwardButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.pageForwardButtonClicked, this);
    editorToolbar.appendToolbarItem(this.pageForwardButton);

    this.keyInput = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.startFromKey), '', 0.5);
    this.keyInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this.updateData.bind(this, false));
    editorToolbar.appendToolbarItem(this.keyInput);
    editorToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());
    editorToolbar.appendToolbarItem(this.clearButton);
    editorToolbar.appendToolbarItem(this.deleteSelectedButton);

    editorToolbar.appendToolbarItem(this.needsRefresh);
  }

  private pageBackButtonClicked(): void {
    this.skipCount = Math.max(0, this.skipCount - this.pageSize);
    this.updateData(false);
  }

  private pageForwardButtonClicked(): void {
    this.skipCount = this.skipCount + this.pageSize;
    this.updateData(false);
  }

  private populateContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, gridNode: DataGrid.DataGrid.DataGridNode<unknown>): void {
    const node = (gridNode as IDBDataGridNode);
    if (node.valueObjectPresentation) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.expandRecursively), () => {
        if (!node.valueObjectPresentation) {
          return;
        }
        void node.valueObjectPresentation.objectTreeElement().expandRecursively();
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
    this.updateData(true);
  }

  update(objectStore: ObjectStore, index: Index|null): void {
    this.objectStore = objectStore;
    this.index = index;

    if (this.dataGrid) {
      this.dataGrid.asWidget().detach();
    }
    this.dataGrid = this.createDataGrid();
    this.dataGrid.setRowContextMenuCallback(this.populateContextMenu.bind(this));
    this.dataGrid.asWidget().show(this.element);

    this.skipCount = 0;
    this.updateData(true);
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseKey(keyString: string): any {
    let result;
    try {
      result = JSON.parse(keyString);
    } catch (e) {
      result = keyString;
    }
    return result;
  }

  private updateData(force: boolean): void {
    const key = this.parseKey(this.keyInput.value());
    const pageSize = this.pageSize;
    let skipCount: 0|number = this.skipCount;
    let selected = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.data['number'] : 0;
    selected = Math.max(selected, this.skipCount);  // Page forward should select top entry
    this.clearButton.setEnabled(!this.isIndex);

    if (!force && this.lastKey === key && this.lastPageSize === pageSize && this.lastSkipCount === skipCount) {
      return;
    }

    if (this.lastKey !== key || this.lastPageSize !== pageSize) {
      skipCount = 0;
      this.skipCount = 0;
    }
    this.lastKey = key;
    this.lastPageSize = pageSize;
    this.lastSkipCount = skipCount;

    function callback(this: IDBDataView, entries: Entry[], hasMore: boolean): void {
      this.clear();
      this.entries = entries;
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
        this.dataGrid.rootNode().appendChild(node);
        if (data['number'] <= selected) {
          selectedNode = node;
        }
      }

      if (selectedNode) {
        selectedNode.select();
      }
      this.pageBackButton.setEnabled(Boolean(skipCount));
      this.pageForwardButton.setEnabled(hasMore);
      this.needsRefresh.setVisible(false);
      this.updateToolbarEnablement();
      this.updatedDataForTests();
    }

    const idbKeyRange = key ? window.IDBKeyRange.lowerBound(key) : null;
    if (this.isIndex && this.index) {
      this.model.loadIndexData(
          this.databaseId, this.objectStore.name, this.index.name, idbKeyRange, skipCount, pageSize,
          callback.bind(this));
    } else {
      this.model.loadObjectStoreData(
          this.databaseId, this.objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
    }
    void this.model.getMetadata(this.databaseId, this.objectStore).then(this.updateSummaryBar.bind(this));
  }

  private updateSummaryBar(metadata: ObjectStoreMetadata|null): void {
    if (!this.summaryBarElement) {
      this.summaryBarElement = this.element.createChild('div', 'object-store-summary-bar');
    }
    this.summaryBarElement.removeChildren();
    if (!metadata) {
      return;
    }

    const separator = '\u2002\u2758\u2002';

    const span = this.summaryBarElement.createChild('span');
    span.textContent = i18nString(UIStrings.totalEntriesS, {PH1: String(metadata.entriesCount)});

    if (this.objectStore.autoIncrement) {
      span.textContent += separator;
      span.textContent += i18nString(UIStrings.keyGeneratorValueS, {PH1: String(metadata.keyGeneratorValue)});
    }
  }

  private updatedDataForTests(): void {
    // Sniffed in tests.
  }

  private refreshButtonClicked(): void {
    this.updateData(true);
  }

  private async clearButtonClicked(): Promise<void> {
    this.clearButton.setEnabled(false);
    this.clearingObjectStore = true;
    await this.model.clearObjectStore(this.databaseId, this.objectStore.name);
    this.clearingObjectStore = false;
    this.clearButton.setEnabled(true);
    this.updateData(true);
  }

  markNeedsRefresh(): void {
    // We expect that calling clearObjectStore() will cause the backend to send us an update.
    if (this.clearingObjectStore) {
      return;
    }
    this.needsRefresh.setVisible(true);
  }

  private async deleteButtonClicked(node: DataGrid.DataGrid.DataGridNode<unknown>|null): Promise<void> {
    if (!node) {
      node = this.dataGrid.selectedNode;
      if (!node) {
        return;
      }
    }
    const key = (this.isIndex ? node.data.primaryKey : node.data.key as SDK.RemoteObject.RemoteObject);
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keyValue = (key.value as string | number | any[] | Date);
    await this.model.deleteEntries(this.databaseId, this.objectStore.name, window.IDBKeyRange.only(keyValue));
    this.refreshObjectStoreCallback();
  }

  clear(): void {
    this.dataGrid.rootNode().removeChildren();
    this.entries = [];
  }

  private updateToolbarEnablement(): void {
    const empty = !this.dataGrid || this.dataGrid.rootNode().children.length === 0;
    this.deleteSelectedButton.setEnabled(!empty && this.dataGrid.selectedNode !== null);
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([indexedDBViewsStyles]);
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
