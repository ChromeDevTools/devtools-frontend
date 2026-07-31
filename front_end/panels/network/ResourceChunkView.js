// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import resourceChunkViewStyles from './resourceChunkView.css.js';
const { html, render, Directives: { ifDefined } } = Lit;
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
const str_ = i18n.i18n.registerUIStrings('panels/network/ResourceChunkView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
// clang-format off
export function defaultHeaderTemplate() {
    return html `
    <tr>
      <th id="data" weight="88">${i18nString(UIStrings.data)}</th>
      <th id="length" align="right" weight="5">${i18nString(UIStrings.length)}</th>
      <th id="time" sortable sort="ascending" weight="7">${i18nString(UIStrings.time)}</th>
    </tr>`;
}
// clang-format on
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${resourceChunkViewStyles}</style>
      <div class="resource-chunk-view vbox">
        <devtools-toolbar class="resource-chunk-view-toolbar" jslog=${VisualLogging.toolbar()}>
          <devtools-button
              .data=${{
        variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
        iconName: 'clear',
        title: i18nString(UIStrings.clearAll),
        jslogContext: 'network.clear-all',
    }}
              aria-label=${i18nString(UIStrings.clearAll)}
              @click=${input.onClear}>
          </devtools-button>
          <select
              class="chrome-select"
              aria-label=${i18nString(UIStrings.filter)}
              @change=${input.onFilterTypeChange}>
            ${FILTER_TYPES.map(item => html `
              <option
                  value=${item.name}
                  .selected=${input.selectedFilterType === item.name}
                  jslog=${VisualLogging.item(item.name).track({ click: true })}
                  aria-label=${item.label()}>
                ${item.label()}
              </option>
            `)}
          </select>
          <devtools-toolbar-input type="filter"
              placeholder=${input.filterUsingRegexHint}
              .value=${input.filterText}
              @change=${input.onFilterTextChange}
              style="flex-grow: 0.4">
          </devtools-toolbar-input>
        </devtools-toolbar>
        <devtools-split-view direction="row" sidebar-position="second"
            name=${input.splitWidgetSettingKey}>
          <div slot="main" class="vbox flex-auto">
            <devtools-data-grid autoscroll name=${input.dataGridDisplayName} striped autofocus
                resize="last"
                @deselect=${input.onDeselect}
                .template=${html `
                  <style>${resourceChunkViewStyles}</style>
                  <table>
                    ${input.headerTemplate}
                    ${Lit.Directives.repeat(input.rows, row => row.chunk, row => html `
                      <tr class=${ifDefined(row.cssClass)}
                          ?selected=${row.selected}
                          data-index=${row.index}
                          @select=${input.onSelect}
                          @contextmenu=${(e) => {
        if (e instanceof CustomEvent && e.detail) {
            input.onContextMenu(row.item, e.detail);
        }
    }}>
                        ${input.columns.map(col => {
        const value = col.id === 'time' ? row.timeText : (row.item.data[col.id] ?? '');
        const title = col.id === 'time' ? row.timeTooltip : undefined;
        return html `
                              <td class="resource-chunk-view-td" title=${ifDefined(title)}
                                  data-value=${ifDefined(typeof value === 'string' ? value : undefined)}>
                                ${value}
                              </td>`;
    })}
                      </tr>
                    `)}
                  </table>
                `}>
            </devtools-data-grid>
          </div>
          <div slot="sidebar" class="vbox flex-auto" jslog=${VisualLogging.pane('preview').track({ resize: true })}>
            ${input.sidebarWidget ? html `
              <devtools-widget class="vbox flex-auto">
                ${input.sidebarWidget.element}
              </devtools-widget>` : html `
              <devtools-widget
                  ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noMessageSelected),
        text: i18nString(UIStrings.selectMessageToBrowseItsContent),
    })}>
              </devtools-widget>
            `}
          </div>
        </devtools-split-view>
      </div>`, target);
    // clang-format on
};
export class ResourceChunkView extends UI.Widget.VBox {
    #view;
    filterType = null;
    filterText = '';
    filterRegex = null;
    selectedChunk = null;
    currentSelectedNode;
    request;
    messageFilterSetting;
    sidebarWidget = null;
    splitWidgetSettingKey;
    dataGridDisplayName;
    filterUsingRegexHint;
    get headerTemplate() {
        return defaultHeaderTemplate();
    }
    constructor(request, messageFilterSettingKey, splitWidgetSettingKey, dataGridDisplayName, filterUsingRegexHint, opts, view = DEFAULT_VIEW) {
        super(opts);
        this.#view = view;
        this.messageFilterSetting = Common.Settings.Settings.instance().createSetting(messageFilterSettingKey, '');
        this.splitWidgetSettingKey = splitWidgetSettingKey;
        this.dataGridDisplayName = dataGridDisplayName;
        this.filterUsingRegexHint = filterUsingRegexHint;
        this.request = request;
        const initialFilter = this.messageFilterSetting.get();
        if (initialFilter) {
            this.applyFilter(initialFilter);
        }
    }
    onRowContextMenu(contextMenu, node) {
        const binaryView = node.binaryView();
        if (binaryView) {
            binaryView.addCopyToContextMenu(contextMenu, i18nString(UIStrings.copyMessageD));
        }
        else {
            const dataVal = node.data.data;
            const textToCopy = typeof dataVal === 'string' ? dataVal : node.dataText();
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
        this.requestUpdate();
    }
    clearChunks() {
        // TODO(allada): actually remove frames from request.
        clearChunkOffsets.set(this.request, this.getRequestChunks().length);
        this.requestUpdate();
    }
    onFilterTypeChanged(event) {
        const select = event.target;
        this.filterType = select.value === 'all' ? null : select.value;
        this.requestUpdate();
    }
    onFilterTextChanged(event) {
        const target = event.target;
        const text = target.value;
        this.messageFilterSetting.set(text);
        this.applyFilter(text);
    }
    applyFilter(text) {
        this.filterText = text;
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
        this.requestUpdate();
    }
    async onChunkSelected(chunk, item) {
        if (this.selectedChunk === chunk && this.currentSelectedNode === item && this.sidebarWidget) {
            return;
        }
        this.selectedChunk = chunk;
        this.currentSelectedNode = item;
        await this.updateSidebar();
    }
    onChunkDeselected() {
        if (this.selectedChunk === null && this.currentSelectedNode === null && this.sidebarWidget === null) {
            return;
        }
        this.selectedChunk = null;
        this.currentSelectedNode = null;
        void this.updateSidebar();
    }
    async updateSidebar() {
        const selectedNode = this.currentSelectedNode;
        if (!selectedNode) {
            this.sidebarWidget = null;
            this.requestUpdate();
            return;
        }
        const binaryView = selectedNode.binaryView();
        if (binaryView) {
            this.sidebarWidget = binaryView;
            this.requestUpdate();
            return;
        }
        const content = selectedNode.dataText();
        const jsonView = await SourceFrame.JSONView.JSONView.createView(content);
        if (jsonView) {
            this.sidebarWidget = jsonView;
            this.requestUpdate();
            return;
        }
        this.sidebarWidget = new SourceFrame.ResourceSourceFrame.ResourceSourceFrame(TextUtils.StaticContentProvider.StaticContentProvider.fromString(this.request.url(), this.request.resourceType(), content), '');
        this.requestUpdate();
    }
    performUpdate() {
        let chunks = this.getRequestChunks();
        const offset = clearChunkOffsets.get(this.request) || 0;
        chunks = chunks.slice(offset).filter(this.chunkFilter.bind(this));
        const rows = chunks.map((chunk, index) => {
            const item = this.createGridItem(chunk);
            const time = new Date(item.getTime() * 1000);
            const timeText = ('0' + time.getHours()).slice(-2) + ':' + ('0' + time.getMinutes()).slice(-2) + ':' +
                ('0' + time.getSeconds()).slice(-2) + '.' + ('00' + time.getMilliseconds()).slice(-3);
            return {
                chunk,
                item,
                selected: chunk === this.selectedChunk,
                cssClass: item.cssClass,
                index,
                timeTooltip: time.toLocaleString(),
                timeText,
            };
        });
        const input = {
            onClear: this.clearChunks.bind(this),
            selectedFilterType: this.filterType ?? 'all',
            onFilterTypeChange: this.onFilterTypeChanged.bind(this),
            filterUsingRegexHint: this.filterUsingRegexHint,
            filterText: this.filterText,
            onFilterTextChange: this.onFilterTextChanged.bind(this),
            splitWidgetSettingKey: this.splitWidgetSettingKey,
            dataGridDisplayName: this.dataGridDisplayName,
            columns: this.getColumns(),
            headerTemplate: this.headerTemplate,
            rows,
            onSelect: (e) => {
                const target = e.target;
                const index = target?.dataset.index;
                if (index !== undefined) {
                    const row = rows[Number(index)];
                    if (row) {
                        void this.onChunkSelected(row.chunk, row.item);
                    }
                }
            },
            onDeselect: this.onChunkDeselected.bind(this),
            onContextMenu: (item, menu) => {
                this.onRowContextMenu(menu, item);
            },
            sidebarWidget: this.sidebarWidget,
        };
        this.#view(input, undefined, this.contentElement);
    }
    getSplitWidgetForTest() {
        return this.sidebarWidget;
    }
}
const FILTER_TYPES = [
    { name: 'all', label: i18nLazyString(UIStrings.all), jslogContext: 'all' },
    { name: 'send', label: i18nLazyString(UIStrings.send), jslogContext: 'send' },
    { name: 'receive', label: i18nLazyString(UIStrings.receive), jslogContext: 'receive' },
];
export class DataGridItem {
}
const clearChunkOffsets = new WeakMap();
//# sourceMappingURL=ResourceChunkView.js.map