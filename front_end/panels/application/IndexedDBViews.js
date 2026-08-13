// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/report_view/report_view.js';
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
import indexedDBViewsStyles from './indexedDBViews.css.js';
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
const { repeat } = Directives;
const { widget } = UI.Widget;
export class IDBDatabaseView extends ApplicationComponents.StorageMetadataView.StorageMetadataView {
    model;
    database;
    constructor(model, database) {
        super();
        this.model = model;
        this.setShowOnlyBucket(true);
        if (database) {
            this.update(database);
        }
    }
    getTitle() {
        return this.database?.databaseId.name;
    }
    async renderReportContent() {
        if (!this.database) {
            return nothing;
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
const renderKeyPathString = (keyPathString) => {
    return html `"<span class="source-code indexed-db-key-path">${keyPathString}</span>"`;
};
const renderKeyColumnHeader = (prefix, keyPath) => {
    if (keyPath === undefined || keyPath === null || keyPath === '') {
        return html `${prefix}`;
    }
    return html `
    ${prefix} (${i18nString(UIStrings.keyPath)}${Array.isArray(keyPath) ?
        html `[${keyPath.map((path, i) => html `${i > 0 ? ', ' : ''}${renderKeyPathString(path)}`)}]` :
        renderKeyPathString(keyPath)})`;
};
const populateContextMenu = (e) => {
    const row = e.currentTarget;
    const widgetElement = row.querySelector('.value-column devtools-widget');
    const widget = widgetElement ? UI.Widget.Widget.get(widgetElement) : null;
    if (widget?.objectTree) {
        const contextMenu = e.detail;
        contextMenu.revealSection().appendItem(i18nString(UIStrings.expandRecursively), () => {
            void widget.expandRecursively();
        }, { jslogContext: 'expand-recursively' });
        contextMenu.revealSection().appendItem(i18nString(UIStrings.collapse), () => {
            widget.expanded = false;
        }, { jslogContext: 'collapse' });
    }
};
const renderDataGrid = (input) => {
    const keyPath = input.isIndex && input.index ? input.index.keyPath : input.objectStore.keyPath;
    // clang-format off
    return html `<devtools-data-grid striped style="flex: auto;" name=${i18nString(UIStrings.indexedDb)} .template=${html `
    <style>${indexedDBViewsStyles}</style>
    <table>
      <tr>
        <th id="number" fixed width="50px">#</th>
        <th id="key">${renderKeyColumnHeader(i18nString(UIStrings.keyString), keyPath)}</th>
        ${input.isIndex ? html `<th id="primary-key">${renderKeyColumnHeader(i18nString(UIStrings.primaryKey), input.objectStore.keyPath)}</th>` : nothing}
        <th id="value">${i18nString(UIStrings.valueString)}</th>
      </tr>
      ${repeat(input.entries, (_entry, index) => index, (entry, index) => {
        return html `
          <tr ?selected=${index + input.skipCount === input.selectedRowNumber}
              class="data-grid-data-row"
              @select=${() => input.onRowSelected(index + input.skipCount)}
              @delete=${() => input.deleteEntry(entry)}
              @contextmenu=${populateContextMenu}>
            <td>${index + input.skipCount}</td>
            <td>${widget(ObjectPropertiesSectionWidget, { value: entry.key })}</td>
            ${input.isIndex ? html `<td>${widget(ObjectPropertiesSectionWidget, { value: entry.primaryKey })}</td>`
            : nothing}
            <td class="value-column">${widget(ObjectPropertiesSectionWidget, { value: entry.value })}</td>
          </tr>`;
    })}
    </table>`}>
  </devtools-data-grid>`;
    // clang-format on
};
const renderToolbar = (input) => {
    // clang-format off
    return html `
    <devtools-toolbar class="data-view-toolbar" jslog=${VisualLogging.toolbar()}>
      <devtools-button
        class="toolbar-button"
        .iconName=${'refresh'}
        .title=${i18nString(UIStrings.refresh)}
        jslog=${VisualLogging.action('refresh').track({ click: true })}
        @click=${input.refreshButtonClicked}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
      ></devtools-button>
      <devtools-button
        class="toolbar-button"
        .iconName=${'clear'}
        .title=${i18nString(UIStrings.clearObjectStore)}
        jslog=${VisualLogging.action('clear-all').track({ click: true })}
        @click=${input.clearButtonClicked}
        .disabled=${input.isIndex || !input.clearButtonEnabled}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}>
      </devtools-button>
      <devtools-button
        class="toolbar-button"
        .iconName=${'bin'}
        .title=${i18nString(UIStrings.deleteSelected)}
        jslog=${VisualLogging.action('delete-selected').track({ click: true })}
        @click=${input.deleteButtonClicked}
        .disabled=${input.selectedRowNumber < 0 || input.entries.length === 0}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}>
      </devtools-button>

      <div class="toolbar-divider"></div>

      <devtools-button
        class="toolbar-button"
        .iconName=${'triangle-left'}
        .title=${i18nString(UIStrings.showPreviousPage)}
        .disabled=${input.skipCount <= 0}
        @click=${input.pageBackButtonClicked}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}>
      </devtools-button>
      <devtools-button
        class="toolbar-button"
        .iconName=${'triangle-right'}
        .title=${i18nString(UIStrings.showNextPage)}
        .disabled=${!input.hasMore}
        @click=${input.pageForwardButtonClicked}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}>
      </devtools-button>

      <devtools-toolbar-input
        type="filter"
        placeholder=${i18nString(UIStrings.filterByKey)}
        class="key-filter-input"
        .value=${input.keyFilter}
        @change=${(e) => {
        input.onKeyFilterChange(e.detail);
    }}>
      </devtools-toolbar-input>

      ${input.needsRefreshVisible ? html `
        <div class="toolbar-divider"></div>
        <div class="toolbar-item stale-data-warning" title=${i18nString(UIStrings
        .someEntriesMayHaveBeenModified)}>
          <devtools-icon name="warning" class="warning-icon"></devtools-icon>
          <span>${i18nString(UIStrings.dataMayBeStale)}</span>
        </div>
      ` : nothing}
    </devtools-toolbar>`;
    // clang-format on
};
const renderSummaryBar = (input) => {
    const metadata = input.metadata;
    if (!metadata) {
        return nothing;
    }
    // clang-format off
    return html `
    <div class="object-store-summary-bar">
      <span>${i18nString(UIStrings.totalEntriesS, { PH1: String(metadata.entriesCount) })}</span>
      ${input.objectStore.autoIncrement ? html `
        <span class="separator">\u2758</span>
        <span>${i18nString(UIStrings.keyGeneratorValueS, { PH1: String(metadata.keyGeneratorValue) })}</span>`
        : nothing}
    </div>`;
    // clang-format on
};
// clang-format off
export const IDB_DATA_VIEW_DEFAULT_VIEW = (input, _output, target) => {
    render(html `
    ${renderToolbar(input)}
    <div class="data-grid-container">
      ${renderDataGrid(input)}
    </div>
    ${renderSummaryBar(input)}
  `, target, { container: { classes: ['indexed-db-data-view', 'storage-view'] } });
};
// clang-format on
export class IDBDataView extends UI.View.SimpleView {
    model;
    databaseId;
    isIndex;
    refreshObjectStoreCallback;
    clearingObjectStore;
    pageSize;
    skipCount;
    // Used in Web Tests
    entries;
    #hasMore = false;
    #selectedRowNumber = -1;
    #needsRefreshVisible = false;
    #clearButtonEnabled = true;
    #metadata = null;
    #keyFilter = '';
    objectStore;
    index;
    lastPageSize;
    lastSkipCount;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastKey;
    #view;
    constructor(model, databaseId, objectStore, index, refreshObjectStoreCallback, view = IDB_DATA_VIEW_DEFAULT_VIEW) {
        super({
            title: i18nString(UIStrings.idb),
            viewId: 'idb',
            jslog: `${VisualLogging.pane('indexed-db-data-view')}`,
        });
        this.#view = view;
        this.registerRequiredCSS(indexedDBViewsStyles);
        this.registerRequiredCSS(DataGrid.dataGridStyles);
        this.model = model;
        this.databaseId = databaseId;
        this.isIndex = Boolean(index);
        this.refreshObjectStoreCallback = refreshObjectStoreCallback;
        this.clearingObjectStore = false;
        this.pageSize = 50;
        this.skipCount = 0;
        this.entries = [];
        this.update(objectStore, index);
    }
    pageBackButtonClicked() {
        this.skipCount = Math.max(0, this.skipCount - this.pageSize);
        this.updateData(false);
    }
    pageForwardButtonClicked() {
        this.skipCount = this.skipCount + this.pageSize;
        this.updateData(false);
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
        this.#selectedRowNumber = -1;
        this.skipCount = 0;
        this.updateData(true);
        this.performUpdate();
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
        const key = this.parseKey(this.#keyFilter);
        const pageSize = this.pageSize;
        let skipCount = this.skipCount;
        const selected = this.#selectedRowNumber !== -1 ? this.#selectedRowNumber : 0;
        this.#selectedRowNumber = Math.max(selected, this.skipCount); // Page forward should select top entry
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
            this.entries = entries;
            this.#hasMore = hasMore;
            this.#needsRefreshVisible = false;
            if (this.entries.length === 0) {
                this.#selectedRowNumber = -1;
            }
            else {
                this.#selectedRowNumber = Math.min(this.#selectedRowNumber, this.skipCount + this.entries.length - 1);
                if (this.#selectedRowNumber < this.skipCount) {
                    this.#selectedRowNumber = -1;
                }
            }
            this.performUpdate();
            this.updatedDataForTests();
        }
        const idbKeyRange = key ? window.IDBKeyRange.lowerBound(key) : null;
        if (this.isIndex && this.index) {
            this.model.loadIndexData(this.databaseId, this.objectStore.name, this.index.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
        }
        else {
            this.model.loadObjectStoreData(this.databaseId, this.objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
        }
        void this.model.getMetadata(this.databaseId, this.objectStore).then(metadata => {
            this.#metadata = metadata;
            this.performUpdate();
        });
    }
    updatedDataForTests() {
        // Sniffed in tests.
    }
    refreshButtonClicked() {
        this.updateData(true);
    }
    async clearButtonClicked() {
        const ok = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.objectStoreWillBeCleared), i18nString(UIStrings.confirmClearObjectStore, { PH1: this.objectStore.name }), 
        // TODO(b/407750537): Fix the linter false positive
        // eslint-disable-next-line @devtools/no-imperative-dom-api
        this.element, { jslogContext: 'clear-object-store-confirmation' });
        if (ok) {
            this.#clearButtonEnabled = false;
            this.performUpdate();
            this.clearingObjectStore = true;
            await this.model.clearObjectStore(this.databaseId, this.objectStore.name);
            this.clearingObjectStore = false;
            this.#clearButtonEnabled = true;
            this.performUpdate();
            this.updateData(true);
        }
    }
    markNeedsRefresh() {
        // We expect that calling clearObjectStore() will cause the backend to send us an update.
        if (this.clearingObjectStore) {
            return;
        }
        this.#needsRefreshVisible = true;
        this.performUpdate();
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
    async deleteButtonClicked() {
        if (this.#selectedRowNumber < 0) {
            return;
        }
        const entry = this.entries[this.#selectedRowNumber - this.skipCount];
        if (entry) {
            await this.deleteEntry(entry);
        }
    }
    async deleteEntry(entry) {
        const key = (this.isIndex ? entry.primaryKey : entry.key);
        const keyValue = key.subtype === 'array' ? await this.resolveArrayKey(key) : key.value;
        await this.model.deleteEntries(this.databaseId, this.objectStore.name, window.IDBKeyRange.only(keyValue));
        this.refreshObjectStoreCallback();
    }
    clear() {
        this.entries = [];
        this.#selectedRowNumber = -1;
        this.performUpdate();
    }
    onRowSelected(rowNumber) {
        this.#selectedRowNumber = rowNumber;
        this.performUpdate();
    }
    performUpdate() {
        this.#view({
            isIndex: this.isIndex,
            index: this.index,
            objectStore: this.objectStore,
            entries: this.entries,
            skipCount: this.skipCount,
            selectedRowNumber: this.#selectedRowNumber,
            clearButtonEnabled: this.#clearButtonEnabled,
            hasMore: this.#hasMore,
            keyFilter: this.#keyFilter,
            needsRefreshVisible: this.#needsRefreshVisible,
            metadata: this.#metadata,
            refreshButtonClicked: this.refreshButtonClicked.bind(this),
            clearButtonClicked: this.clearButtonClicked.bind(this),
            deleteButtonClicked: this.deleteButtonClicked.bind(this),
            pageBackButtonClicked: this.pageBackButtonClicked.bind(this),
            pageForwardButtonClicked: this.pageForwardButtonClicked.bind(this),
            onKeyFilterChange: (value) => {
                this.#keyFilter = value;
                this.updateData(false);
            },
            onRowSelected: this.onRowSelected.bind(this),
            deleteEntry: this.deleteEntry.bind(this),
        }, undefined, this.element);
    }
}
const OBJECT_PROPERTIES_SECTION_WIDGET_DEFAULT_VIEW = (input, output, target) => {
    if (!input.objectTree) {
        render(nothing, target);
        return;
    }
    render(ObjectUI.ObjectPropertiesSection.defaultObjectPresentation(input.objectTree, undefined /* linkifier */, true /* skipProto */, true /* readOnly */), target);
};
export class ObjectPropertiesSectionWidget extends UI.Widget.Widget {
    #objectTree = null;
    #view;
    constructor(element, view = OBJECT_PROPERTIES_SECTION_WIDGET_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    set value(value) {
        if (value) {
            this.#objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(value, {
                readOnly: true,
                propertiesMode: 1 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */,
            });
        }
        else {
            this.#objectTree = null;
        }
        this.requestUpdate();
    }
    get objectTree() {
        return this.#objectTree;
    }
    get expanded() {
        return this.#objectTree?.expanded ?? false;
    }
    set expanded(expanded) {
        if (this.#objectTree) {
            this.#objectTree.expanded = expanded;
            this.requestUpdate();
        }
    }
    async expandRecursively() {
        if (this.#objectTree) {
            await this.#objectTree.expandRecursively(ObjectUI.ObjectPropertiesSection.EXPANDABLE_MAX_DEPTH);
            this.requestUpdate();
        }
    }
    performUpdate() {
        this.#view({ objectTree: this.#objectTree }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=IndexedDBViews.js.map