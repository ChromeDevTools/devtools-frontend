// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/components/report_view/report_view.js';
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
import indexedDBViewsStyles from './indexedDBViews.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Text in Indexed DBViews of the Application panel
     */
    version: 'Version',
    /**
     * @description Text in Indexed DBViews of the Application panel
     */
    objectStores: 'Object stores',
    /**
     * @description Text of button in Indexed DBViews of the Application panel
     */
    deleteDatabase: 'Delete database',
    /**
     * @description Text of button in Indexed DBViews of the Application panel
     */
    refreshDatabase: 'Refresh database',
    /**
     * @description Text in Application panel IndexedDB delete confirmation dialog
     * @example {msb} PH1
     */
    confirmDeleteDatabase: 'Delete "{PH1}" database?',
    /**
     * @description Explanation text in Application panel IndexedDB delete confirmation dialog
     */
    databaseWillBeRemoved: 'The selected database and contained data will be removed.',
    /**
     * @description Title of the confirmation dialog in the IndexedDB tab of the Application panel
     *              that the user is about to clear an object store and this cannot be undone.
     * @example {table1} PH1
     */
    confirmClearObjectStore: 'Clear "{PH1}" object store?',
    /**
     * @description Description in the confirmation dialog in the IndexedDB tab of the Application
     *              panel that the user is about to clear an object store and this cannot be undone.
     */
    objectStoreWillBeCleared: 'The data contained in the selected object store will be removed.',
    /**
     * @description Text in Indexed DBViews of the Application panel
     */
    idb: 'IDB',
    /**
     * @description Text to refresh the page
     */
    refresh: 'Refresh',
    /**
     * @description Tooltip text that appears when hovering over the delete button in the Indexed DBViews of the Application panel
     */
    deleteSelected: 'Delete selected',
    /**
     * @description Tooltip text that appears when hovering over the clear button in the Indexed DBViews of the Application panel
     */
    clearObjectStore: 'Clear object store',
    /**
     * @description Text in Indexed DBViews of the Application panel
     */
    dataMayBeStale: 'Data may be stale',
    /**
     * @description Title of needs refresh in indexed dbviews of the application panel
     */
    someEntriesMayHaveBeenModified: 'Some entries may have been modified',
    /**
     * @description Text in DOMStorage Items View of the Application panel
     */
    keyString: 'Key',
    /**
     * @description Text in Indexed DBViews of the Application panel
     */
    primaryKey: 'Primary key',
    /**
     * @description Text for the value of something
     */
    valueString: 'Value',
    /**
     * @description Data grid name for Indexed DB data grids
     */
    indexedDb: 'Indexed DB',
    /**
     * @description Text in Indexed DBViews of the Application panel
     */
    keyPath: 'Key path: ',
    /**
     * @description Tooltip text that appears when hovering over the triangle left button in the Indexed DBViews of the Application panel
     */
    showPreviousPage: 'Show previous page',
    /**
     * @description Tooltip text that appears when hovering over the triangle right button in the Indexed DBViews of the Application panel
     */
    showNextPage: 'Show next page',
    /**
     * @description Text in Indexed DBViews of the Application panel
     */
    filterByKey: 'Filter by key (show keys greater or equal to)',
    /**
     * @description Text in Context menu for expanding objects in IndexedDB tables
     */
    expandRecursively: 'Expand Recursively',
    /**
     * @description Text in Context menu for collapsing objects in IndexedDB tables
     */
    collapse: 'Collapse',
    /**
     * @description Span text content in Indexed DBViews of the Application panel
     * @example {2} PH1
     */
    totalEntriesS: 'Total entries: {PH1}',
    /**
     * @description Text in Indexed DBViews of the Application panel
     * @example {2} PH1
     */
    keyGeneratorValueS: 'Key generator value: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/IndexedDBViews.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class IDBDatabaseView extends ApplicationComponents.StorageMetadataView.StorageMetadataView {
    model;
    database;
    constructor(model, database) {
        super();
        this.model = model;
        this.setShowOnlyBucket(false);
        if (database) {
            this.update(database);
        }
    }
    getTitle() {
        return this.database?.databaseId.name;
    }
    async renderReportContent() {
        if (!this.database) {
            return Lit.nothing;
        }
        return html `
      ${await super.renderReportContent()}
      ${this.key(i18nString(UIStrings.version))}
      ${this.value(this.database.version.toString())}
      ${this.key(i18nString(UIStrings.objectStores))}
      ${this.value(this.database.objectStores.size.toString())}
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section>
      <devtools-button
          aria-label=${i18nString(UIStrings.deleteDatabase)}
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          @click=${this.deleteDatabase}
          jslog=${VisualLogging.action('delete-database').track({
            click: true,
        })}>
        ${i18nString(UIStrings.deleteDatabase)}
      </devtools-button>&nbsp;
      <devtools-button
          aria-label=${i18nString(UIStrings.refreshDatabase)}
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          @click=${this.refreshDatabaseButtonClicked}
          jslog=${VisualLogging.action('refresh-database').track({
            click: true,
        })}>
        ${i18nString(UIStrings.refreshDatabase)}
      </devtools-button>
      </devtools-report-section>
      `;
    }
    refreshDatabaseButtonClicked() {
        this.model.refreshDatabase(this.database.databaseId);
    }
    update(database) {
        this.database = database;
        const bucketInfo = this.model.target()
            .model(SDK.StorageBucketsModel.StorageBucketsModel)
            ?.getBucketByName(database.databaseId.storageBucket.storageKey, database.databaseId.storageBucket.name);
        if (bucketInfo) {
            this.setStorageBucket(bucketInfo);
        }
        else {
            this.setStorageKey(database.databaseId.storageBucket.storageKey);
        }
        void this.render().then(() => this.updatedForTests());
    }
    updatedForTests() {
        // Sniffed in tests.
    }
    async deleteDatabase() {
        const ok = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.databaseWillBeRemoved), i18nString(UIStrings.confirmDeleteDatabase, { PH1: this.database.databaseId.name }), this, { jslogContext: 'delete-database-confirmation' });
        if (ok) {
            void this.model.deleteDatabase(this.database.databaseId);
        }
    }
    wasShown() {
        super.wasShown();
    }
}
customElements.define('devtools-idb-database-view', IDBDatabaseView);
export class IDBDataView extends UI.View.SimpleView {
    model;
    databaseId;
    isIndex;
    refreshObjectStoreCallback;
    refreshButton;
    deleteSelectedButton;
    clearButton;
    needsRefresh;
    clearingObjectStore;
    pageSize;
    skipCount;
    // Used in Web Tests
    entries;
    objectStore;
    index;
    keyInput;
    dataGrid;
    lastPageSize;
    lastSkipCount;
    pageBackButton;
    pageForwardButton;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastKey;
    summaryBarElement;
    constructor(model, databaseId, objectStore, index, refreshObjectStoreCallback) {
        super({
            title: i18nString(UIStrings.idb),
            viewId: 'idb',
            jslog: `${VisualLogging.pane('indexed-db-data-view')}`,
        });
        this.registerRequiredCSS(indexedDBViewsStyles);
        this.model = model;
        this.databaseId = databaseId;
        this.isIndex = Boolean(index);
        this.refreshObjectStoreCallback = refreshObjectStoreCallback;
        this.element.classList.add('indexed-db-data-view', 'storage-view');
        this.refreshButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refresh), 'refresh');
        this.refreshButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.refreshButtonClicked, this);
        this.refreshButton.element.setAttribute('jslog', `${VisualLogging.action('refresh').track({ click: true })}`);
        this.deleteSelectedButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.deleteSelected), 'bin');
        this.deleteSelectedButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, _event => {
            void this.deleteButtonClicked(null);
        });
        this.deleteSelectedButton.element.setAttribute('jslog', `${VisualLogging.action('delete-selected').track({ click: true })}`);
        this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearObjectStore), 'clear');
        this.clearButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, () => {
            void this.clearButtonClicked();
        }, this);
        this.clearButton.element.setAttribute('jslog', `${VisualLogging.action('clear-all').track({ click: true })}`);
        const refreshIcon = UI.UIUtils.createIconLabel({
            title: i18nString(UIStrings.dataMayBeStale),
            iconName: 'warning',
            color: 'var(--icon-warning)',
            width: '20px',
            height: '20px',
        });
        this.needsRefresh = new UI.Toolbar.ToolbarItem(refreshIcon);
        this.needsRefresh.setVisible(false);
        this.needsRefresh.setTitle(i18nString(UIStrings.someEntriesMayHaveBeenModified));
        this.clearingObjectStore = false;
        this.createEditorToolbar();
        this.pageSize = 50;
        this.skipCount = 0;
        this.update(objectStore, index);
        this.entries = [];
    }
    createDataGrid() {
        const keyPath = this.isIndex && this.index ? this.index.keyPath : this.objectStore.keyPath;
        const columns = [];
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
        columns.push({ ...columnDefaults, id: 'number', title: '#', sortable: false, width: '50px' });
        columns.push({
            ...columnDefaults,
            id: 'key',
            titleDOMFragment: this.keyColumnHeaderFragment(i18nString(UIStrings.keyString), keyPath),
            sortable: false,
        });
        if (this.isIndex) {
            columns.push({
                ...columnDefaults,
                id: 'primary-key',
                titleDOMFragment: this.keyColumnHeaderFragment(i18nString(UIStrings.primaryKey), this.objectStore.keyPath),
                sortable: false,
            });
        }
        const title = i18nString(UIStrings.valueString);
        columns.push({ ...columnDefaults, id: 'value', title, sortable: false });
        const dataGrid = new DataGrid.DataGrid.DataGridImpl({
            displayName: i18nString(UIStrings.indexedDb),
            columns,
            deleteCallback: this.deleteButtonClicked.bind(this),
            refreshCallback: this.updateData.bind(this, true),
        });
        dataGrid.setStriped(true);
        dataGrid.addEventListener("SelectedNode" /* DataGrid.DataGrid.Events.SELECTED_NODE */, () => {
            this.updateToolbarEnablement();
        }, this);
        return dataGrid;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyColumnHeaderFragment(prefix, keyPath) {
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
        }
        else {
            const keyPathString = keyPath;
            keyColumnHeaderFragment.appendChild(this.keyPathStringFragment(keyPathString));
        }
        UI.UIUtils.createTextChild(keyColumnHeaderFragment, ')');
        return keyColumnHeaderFragment;
    }
    keyPathStringFragment(keyPathString) {
        const keyPathStringFragment = document.createDocumentFragment();
        UI.UIUtils.createTextChild(keyPathStringFragment, '"');
        const keyPathSpan = keyPathStringFragment.createChild('span', 'source-code indexed-db-key-path');
        keyPathSpan.textContent = keyPathString;
        UI.UIUtils.createTextChild(keyPathStringFragment, '"');
        return keyPathStringFragment;
    }
    createEditorToolbar() {
        const editorToolbar = this.element.createChild('devtools-toolbar', 'data-view-toolbar');
        editorToolbar.setAttribute('jslog', `${VisualLogging.toolbar()}`);
        editorToolbar.appendToolbarItem(this.refreshButton);
        editorToolbar.appendToolbarItem(this.clearButton);
        editorToolbar.appendToolbarItem(this.deleteSelectedButton);
        editorToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());
        this.pageBackButton =
            new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showPreviousPage), 'triangle-left', undefined, 'prev-page');
        this.pageBackButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.pageBackButtonClicked, this);
        editorToolbar.appendToolbarItem(this.pageBackButton);
        this.pageForwardButton =
            new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showNextPage), 'triangle-right', undefined, 'next-page');
        this.pageForwardButton.setEnabled(false);
        this.pageForwardButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.pageForwardButtonClicked, this);
        editorToolbar.appendToolbarItem(this.pageForwardButton);
        this.keyInput = new UI.Toolbar.ToolbarFilter(i18nString(UIStrings.filterByKey), 0.5);
        this.keyInput.addEventListener("TextChanged" /* UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED */, this.updateData.bind(this, false));
        editorToolbar.appendToolbarItem(this.keyInput);
        editorToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());
        editorToolbar.appendToolbarItem(this.needsRefresh);
    }
    pageBackButtonClicked() {
        this.skipCount = Math.max(0, this.skipCount - this.pageSize);
        this.updateData(false);
    }
    pageForwardButtonClicked() {
        this.skipCount = this.skipCount + this.pageSize;
        this.updateData(false);
    }
    populateContextMenu(contextMenu, gridNode) {
        const node = gridNode;
        if (node.valueObjectPresentation) {
            contextMenu.revealSection().appendItem(i18nString(UIStrings.expandRecursively), () => {
                if (!node.valueObjectPresentation) {
                    return;
                }
                void node.valueObjectPresentation.objectTreeElement().expandRecursively();
            }, { jslogContext: 'expand-recursively' });
            contextMenu.revealSection().appendItem(i18nString(UIStrings.collapse), () => {
                if (!node.valueObjectPresentation) {
                    return;
                }
                node.valueObjectPresentation.objectTreeElement().collapse();
            }, { jslogContext: 'collapse' });
        }
    }
    refreshData() {
        this.updateData(true);
    }
    update(objectStore = null, index = null) {
        if (!objectStore) {
            return;
        }
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
    parseKey(keyString) {
        let result;
        try {
            result = JSON.parse(keyString);
        }
        catch {
            result = keyString;
        }
        return result;
    }
    updateData(force) {
        const key = this.parseKey(this.keyInput.value());
        const pageSize = this.pageSize;
        let skipCount = this.skipCount;
        let selected = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.data['number'] : 0;
        selected = Math.max(selected, this.skipCount); // Page forward should select top entry
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
        function callback(entries, hasMore) {
            this.clear();
            this.entries = entries;
            let selectedNode = null;
            for (let i = 0; i < entries.length; ++i) {
                // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = {};
                data['number'] = i + skipCount;
                data['key'] = entries[i].key;
                data['primary-key'] = entries[i].primaryKey;
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
            this.model.loadIndexData(this.databaseId, this.objectStore.name, this.index.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
        }
        else {
            this.model.loadObjectStoreData(this.databaseId, this.objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
        }
        void this.model.getMetadata(this.databaseId, this.objectStore).then(this.updateSummaryBar.bind(this));
    }
    updateSummaryBar(metadata) {
        if (!this.summaryBarElement) {
            this.summaryBarElement = this.element.createChild('div', 'object-store-summary-bar');
        }
        this.summaryBarElement.removeChildren();
        if (!metadata) {
            return;
        }
        const separator = '\u2002\u2758\u2002';
        const span = this.summaryBarElement.createChild('span');
        span.textContent = i18nString(UIStrings.totalEntriesS, { PH1: String(metadata.entriesCount) });
        if (this.objectStore.autoIncrement) {
            span.textContent += separator;
            span.textContent += i18nString(UIStrings.keyGeneratorValueS, { PH1: String(metadata.keyGeneratorValue) });
        }
    }
    updatedDataForTests() {
        // Sniffed in tests.
    }
    refreshButtonClicked() {
        this.updateData(true);
    }
    async clearButtonClicked() {
        const ok = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.objectStoreWillBeCleared), i18nString(UIStrings.confirmClearObjectStore, { PH1: this.objectStore.name }), this.element, { jslogContext: 'clear-object-store-confirmation' });
        if (ok) {
            this.clearButton.setEnabled(false);
            this.clearingObjectStore = true;
            await this.model.clearObjectStore(this.databaseId, this.objectStore.name);
            this.clearingObjectStore = false;
            this.clearButton.setEnabled(true);
            this.updateData(true);
        }
    }
    markNeedsRefresh() {
        // We expect that calling clearObjectStore() will cause the backend to send us an update.
        if (this.clearingObjectStore) {
            return;
        }
        this.needsRefresh.setVisible(true);
    }
    async resolveArrayKey(key) {
        const { properties } = await key.getOwnProperties(false /* generatePreview */);
        if (!properties) {
            return [];
        }
        const result = [];
        const propertyPromises = properties.filter(property => !isNaN(Number(property.name))).map(async (property) => {
            const value = property.value;
            if (!value) {
                return;
            }
            let propertyValue;
            if (value.subtype === 'array') {
                propertyValue = await this.resolveArrayKey(value);
            }
            else {
                propertyValue = value.value;
            }
            result[Number(property.name)] = propertyValue;
        });
        await Promise.all(propertyPromises);
        return result;
    }
    async deleteButtonClicked(node) {
        if (!node) {
            node = this.dataGrid.selectedNode;
            if (!node) {
                return;
            }
        }
        const key = (this.isIndex ? node.data['primary-key'] : node.data.key);
        const keyValue = key.subtype === 'array' ? await this.resolveArrayKey(key) : key.value;
        await this.model.deleteEntries(this.databaseId, this.objectStore.name, window.IDBKeyRange.only(keyValue));
        this.refreshObjectStoreCallback();
    }
    clear() {
        this.dataGrid.rootNode().removeChildren();
        this.entries = [];
    }
    updateToolbarEnablement() {
        const empty = !this.dataGrid || this.dataGrid.rootNode().children.length === 0;
        this.deleteSelectedButton.setEnabled(!empty && this.dataGrid.selectedNode !== null);
    }
}
export class IDBDataGridNode extends DataGrid.DataGrid.DataGridNode {
    selectable;
    valueObjectPresentation;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(data) {
        super(data, false);
        this.selectable = true;
        this.valueObjectPresentation = null;
    }
    createCell(columnIdentifier) {
        const cell = super.createCell(columnIdentifier);
        const value = this.data[columnIdentifier];
        switch (columnIdentifier) {
            case 'value': {
                cell.removeChildren();
                const objectPropSection = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.defaultObjectPropertiesSection(value, undefined /* linkifier */, true /* skipProto */, true /* readOnly */);
                cell.appendChild(objectPropSection.element);
                this.valueObjectPresentation = objectPropSection;
                break;
            }
            case 'key':
            case 'primary-key': {
                cell.removeChildren();
                const objectElement = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.defaultObjectPresentation(value, undefined /* linkifier */, true /* skipProto */, true /* readOnly */);
                cell.appendChild(objectElement);
                break;
            }
        }
        return cell;
    }
}
//# sourceMappingURL=IndexedDBViews.js.map