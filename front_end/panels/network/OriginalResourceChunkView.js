// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import viewStyles from './originalResourceChunkView.css.js';
const UIStrings = {
    /**
     * @description Text in Event Source Messages View of the Network panel
     */
    data: 'Data',
    /**
     * @description Text in Messages View of the Network panel
     */
    length: 'Length',
    /**
     * @description Text that refers to the time
     */
    time: 'Time',
    /**
     * @description Text to clear everything
     */
    clearAll: 'Clear All',
    /**
     * @description Text to filter result items
     */
    filter: 'Filter',
    /**
     * @description Text in Messages View of the Network panel that shows if no message is selected for viewing its content
     */
    noMessageSelected: 'No message selected',
    /**
     * @description Text in Messages View of the Network panel
     */
    selectMessageToBrowseItsContent: 'Select message to browse its content.',
    /**
     * @description Text in Messages View of the Network panel
     */
    copyMessageD: 'Copy message…',
    /**
     * @description A context menu item in the Messages View of the Network panel
     */
    copyMessage: 'Copy message',
    /**
     * @description Text for everything
     */
    all: 'All',
    /**
     * @description Text in Messages View of the Network panel
     */
    send: 'Send',
    /**
     * @description Text in Messages View of the Network panel
     */
    receive: 'Receive',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/OriginalResourceChunkView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class OriginalResourceChunkView extends UI.Widget.VBox {
    splitWidget;
    dataGrid;
    timeComparator;
    mainToolbar;
    clearAllButton;
    filterTypeCombobox;
    filterType = null;
    filterTextInput;
    filterRegex = null;
    frameEmptyWidget;
    currentSelectedNode;
    request;
    messageFilterSetting;
    sidebarWidget = null;
    constructor(request, messageFilterSettingKey, splitWidgetSettingKey, dataGridDisplayName, filterUsingRegexHint) {
        super();
        this.messageFilterSetting = Common.Settings.Settings.instance().createSetting(messageFilterSettingKey, '');
        this.registerRequiredCSS(viewStyles);
        this.request = request;
        this.element.classList.add('resource-chunk-view');
        this.splitWidget = new UI.SplitWidget.SplitWidget(false, true, splitWidgetSettingKey);
        this.splitWidget.show(this.element);
        const columns = this.getColumns();
        this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
            displayName: dataGridDisplayName,
            columns,
        });
        this.dataGrid.setRowContextMenuCallback((menu, node) => this.onRowContextMenu(menu, node));
        this.dataGrid.setEnableAutoScrollToBottom(true);
        this.dataGrid.setCellClass('resource-chunk-view-td');
        this.timeComparator = resourceChunkNodeTimeComparator;
        this.dataGrid.sortNodes(this.timeComparator, false);
        this.dataGrid.markColumnAsSortedBy('time', DataGrid.DataGrid.Order.Ascending);
        this.dataGrid.addEventListener("SortingChanged" /* DataGrid.DataGrid.Events.SORTING_CHANGED */, this.sortItems, this);
        this.dataGrid.setName(splitWidgetSettingKey + '_datagrid');
        this.dataGrid.addEventListener("SelectedNode" /* DataGrid.DataGrid.Events.SELECTED_NODE */, event => {
            void this.onChunkSelected(event);
        }, this);
        this.dataGrid.addEventListener("DeselectedNode" /* DataGrid.DataGrid.Events.DESELECTED_NODE */, this.onChunkDeselected, this);
        this.mainToolbar = document.createElement('devtools-toolbar');
        this.clearAllButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'clear');
        this.clearAllButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.clearChunks, this);
        this.mainToolbar.appendToolbarItem(this.clearAllButton);
        this.filterTypeCombobox =
            new UI.Toolbar.ToolbarComboBox(this.onFilterTypeChanged.bind(this), i18nString(UIStrings.filter));
        for (const filterItem of FILTER_TYPES) {
            const option = this.filterTypeCombobox.createOption(filterItem.label(), filterItem.name);
            this.filterTypeCombobox.addOption(option);
        }
        this.mainToolbar.appendToolbarItem(this.filterTypeCombobox);
        this.filterTextInput = new UI.Toolbar.ToolbarFilter(filterUsingRegexHint, 0.4);
        this.filterTextInput.addEventListener("TextChanged" /* UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED */, this.onFilterTextChanged, this);
        const filter = this.messageFilterSetting.get();
        if (filter) {
            this.filterTextInput.setValue(filter);
        }
        this.mainToolbar.appendToolbarItem(this.filterTextInput);
        const mainContainer = new UI.Widget.VBox();
        mainContainer.element.appendChild(this.mainToolbar);
        this.dataGrid.asWidget().show(mainContainer.element);
        mainContainer.setMinimumSize(0, 72);
        this.splitWidget.setMainWidget(mainContainer);
        this.frameEmptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMessageSelected), i18nString(UIStrings.selectMessageToBrowseItsContent));
        this.sidebarWidget = this.frameEmptyWidget;
        this.splitWidget.setSidebarWidget(this.sidebarWidget);
        if (filter) {
            this.applyFilter(filter);
        }
    }
    onRowContextMenu(contextMenu, node) {
        const item = node;
        const binaryView = item.binaryView();
        if (binaryView) {
            binaryView.addCopyToContextMenu(contextMenu, i18nString(UIStrings.copyMessageD));
        }
        else {
            const dataVal = item.data.data;
            const textToCopy = typeof dataVal === 'string' ? dataVal : item.dataText();
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyMessage), Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(Host.InspectorFrontendHost.InspectorFrontendHostInstance, textToCopy), { jslogContext: 'copy' });
        }
        contextMenu.footerSection().appendItem(i18nString(UIStrings.clearAll), this.clearChunks.bind(this), { jslogContext: 'clear-all' });
    }
    getColumns() {
        return [
            { id: 'data', title: i18nString(UIStrings.data), sortable: false, weight: 88 },
            {
                id: 'length',
                title: i18nString(UIStrings.length),
                sortable: false,
                align: "right" /* DataGrid.DataGrid.Align.RIGHT */,
                weight: 5,
            },
            { id: 'time', title: i18nString(UIStrings.time), sortable: true, weight: 7 },
        ];
    }
    chunkAdded(chunk) {
        if (!this.chunkFilter(chunk)) {
            return;
        }
        this.dataGrid.insertChild(this.createGridItem(chunk));
    }
    clearChunks() {
        // TODO(allada): actually remove frames from request.
        clearChunkOffsets.set(this.request, this.getRequestChunks().length);
        this.performUpdate();
    }
    onFilterTypeChanged() {
        const val = this.filterTypeCombobox.selectedOption().value;
        this.filterType = val === 'all' ? null : val;
        this.performUpdate();
    }
    onFilterTextChanged() {
        const text = this.filterTextInput.value();
        this.messageFilterSetting.set(text);
        this.applyFilter(text);
    }
    applyFilter(text) {
        if (text) {
            try {
                this.filterRegex = new RegExp(text, 'i');
            }
            catch {
                this.filterRegex = new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i');
            }
        }
        else {
            this.filterRegex = null;
        }
        this.performUpdate();
    }
    async onChunkSelected(event) {
        this.currentSelectedNode = event.data;
        await this.updateSidebar();
    }
    onChunkDeselected() {
        this.currentSelectedNode = null;
        void this.updateSidebar();
    }
    async updateSidebar() {
        if (!this.currentSelectedNode) {
            this.sidebarWidget = null;
            this.updateSidebarWidget();
            return;
        }
        const content = this.currentSelectedNode.dataText();
        const binaryView = this.currentSelectedNode.binaryView();
        if (binaryView) {
            this.sidebarWidget = binaryView;
            this.updateSidebarWidget();
            return;
        }
        const jsonView = await SourceFrame.JSONView.JSONView.createView(content);
        if (jsonView) {
            this.sidebarWidget = jsonView;
            this.updateSidebarWidget();
            return;
        }
        this.sidebarWidget = new SourceFrame.ResourceSourceFrame.ResourceSourceFrame(TextUtils.StaticContentProvider.StaticContentProvider.fromString(this.request.url(), this.request.resourceType(), content), '');
        this.updateSidebarWidget();
    }
    updateSidebarWidget() {
        const activeSidebar = this.sidebarWidget || this.frameEmptyWidget;
        if (this.splitWidget.sidebarWidget() !== activeSidebar) {
            this.splitWidget.setSidebarWidget(activeSidebar);
        }
    }
    performUpdate() {
        this.dataGrid.rootNode().removeChildren();
        let chunks = this.getRequestChunks();
        const offset = clearChunkOffsets.get(this.request) || 0;
        chunks = chunks.slice(offset).filter(this.chunkFilter.bind(this));
        chunks.forEach(chunk => this.dataGrid.insertChild(this.createGridItem(chunk)));
        this.updateSidebarWidget();
    }
    refresh() {
        this.performUpdate();
    }
    sortItems() {
        this.dataGrid.sortNodes(this.timeComparator, !this.dataGrid.isSortOrderAscending());
    }
    getDataGridForTest() {
        return this.dataGrid;
    }
    getSplitWidgetForTest() {
        return this.splitWidget;
    }
    getFilterInputForTest() {
        return this.filterTextInput;
    }
    getClearAllButtonForTest() {
        return this.clearAllButton;
    }
    getFilterTypeComboboxForTest() {
        return this.filterTypeCombobox;
    }
}
const FILTER_TYPES = [
    { name: 'all', label: i18nLazyString(UIStrings.all), jslogContext: 'all' },
    { name: 'send', label: i18nLazyString(UIStrings.send), jslogContext: 'send' },
    { name: 'receive', label: i18nLazyString(UIStrings.receive), jslogContext: 'receive' },
];
export class DataGridItem extends DataGrid.SortableDataGrid.SortableDataGridNode {
}
function resourceChunkNodeTimeComparator(a, b) {
    return a.getTime() - b.getTime();
}
const clearChunkOffsets = new WeakMap();
//# sourceMappingURL=OriginalResourceChunkView.js.map