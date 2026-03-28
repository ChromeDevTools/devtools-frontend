// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/lists/lists.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render, } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import webMCPViewStyles from './webMCPView.css.js';
const UIStrings = {
    /**
     * @description Text for the header of the tool registry section
     */
    toolRegistry: 'Available Tools',
    /**
     * @description Title of text to display when no tools are registered
     */
    noToolsPlaceholderTitle: 'Available `WebMCP` Tools',
    /**
     * @description Text to display when no tools are registered
     */
    noToolsPlaceholder: 'Registered `WebMCP` tools for this page will appear here. No tools have been registered or detected yet.',
    /**
     * @description Title of text to display when no calls have been made
     */
    noCallsPlaceholderTitle: 'Tool Activity',
    /**
     * @description Text to display when no calls have been made
     */
    noCallsPlaceholder: 'Start interacting with your `WebMCP` agent to see real-time tool calls and executions here.',
    /**
     * @description Text for the name of a tool call
     */
    name: 'Name',
    /**
     * @description Text for the status of a tool call
     */
    status: 'Status',
    /**
     * @description Text for the input of a tool call
     */
    input: 'Input',
    /**
     * @description Text for the output of a tool call
     */
    output: 'Output',
    /**
     * @description Text for the status of a tool call that is in progress
     */
    inProgress: 'In Progress',
    /**
     * @description Tooltip for the clear log button
     */
    clearLog: 'Clear log',
    /**
     * @description Placeholder for the filter input
     */
    filter: 'Filter',
    /**
     * @description Tooltip for the tool types dropdown
     */
    toolTypes: 'Tool types',
    /**
     * @description Tooltip for the status types dropdown
     */
    statusTypes: 'Status types',
    /**
     * @description Tooltip for the clear filters button
     */
    clearFilters: 'Clear filters',
    /**
     * @description Filter option for imperative tools
     */
    imperative: 'Imperative',
    /**
     * @description Filter option for declarative tools
     */
    declarative: 'Declarative',
    /**
     * @description Text for the status of a tool call that has failed
     */
    error: 'Error',
    /**
     * @description Text for the status of a tool call that was canceled
     */
    canceled: 'Canceled',
    /**
     * @description Text for the status of a tool call that succeeded
     */
    success: 'Success',
    /**
     * @description Text for the status of a tool call that has failed
     */
    pending: 'In Progress',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/WebMCPView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function filterToolCalls(toolCalls, filterState) {
    let filtered = [...toolCalls];
    const statusTypes = filterState.statusTypes;
    if (statusTypes) {
        filtered = filtered.filter(call => {
            const { success, error, pending } = statusTypes;
            if (success && call.result?.status === "Success" /* Protocol.WebMCP.InvocationStatus.Success */) {
                return true;
            }
            if (error && call.result?.status === "Error" /* Protocol.WebMCP.InvocationStatus.Error */) {
                return true;
            }
            if (pending && call.result === undefined) {
                return true;
            }
            return false;
        });
    }
    const toolTypes = filterState.toolTypes;
    if (toolTypes) {
        filtered = filtered.filter(call => {
            const { imperative, declarative } = toolTypes;
            const isDeclarative = call.tool?.backendNodeId !== undefined;
            if (imperative && !isDeclarative) {
                return true;
            }
            if (declarative && isDeclarative) {
                return true;
            }
            return false;
        });
    }
    if (filterState.text) {
        const regex = Platform.StringUtilities.createPlainTextSearchRegex(filterState.text, 'i');
        filtered = filtered.filter(call => {
            return regex.test(call.tool.name) || regex.test(call.input) ||
                (call.result?.output && regex.test(JSON.stringify(call.result.output))) ||
                (call.result?.errorText && regex.test(call.result.errorText));
        });
    }
    return filtered;
}
export const DEFAULT_VIEW = (input, output, target) => {
    const tools = input.tools;
    const isFilterActive = Boolean(input.filters.text) || Boolean(input.filters.toolTypes) || Boolean(input.filters.statusTypes);
    const iconName = (call) => {
        switch (call.result?.status) {
            case "Error" /* Protocol.WebMCP.InvocationStatus.Error */:
                return 'cross-circle-filled';
            case "Canceled" /* Protocol.WebMCP.InvocationStatus.Canceled */:
                return 'record-stop';
            case undefined:
                return 'dots-circle';
            default:
                return '';
        }
    };
    const statusString = (call) => {
        switch (call.result?.status) {
            case "Error" /* Protocol.WebMCP.InvocationStatus.Error */:
                return i18nString(UIStrings.error);
            case "Canceled" /* Protocol.WebMCP.InvocationStatus.Canceled */:
                return i18nString(UIStrings.canceled);
            case "Success" /* Protocol.WebMCP.InvocationStatus.Success */:
                return i18nString(UIStrings.success);
            default:
                return i18nString(UIStrings.inProgress);
        }
    };
    // clang-format off
    render(html `
    <style>${webMCPViewStyles}</style>
    <style>${UI.FilterBar.filterStyles}</style>
    <devtools-split-view class="webmcp-view" direction="row" sidebar-position="second" name="webmcp-split-view">
      <div slot="main" class="call-log">
        <div class="webmcp-toolbar-container" role="toolbar" jslog=${VisualLogging.toolbar()}>
          <devtools-toolbar class="webmcp-toolbar" role="presentation" wrappable>
            <devtools-button title=${i18nString(UIStrings.clearLog)}
                             .iconName=${'clear'}
                             .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
                             @click=${input.onClearLogClick}></devtools-button>
            <div class="toolbar-divider"></div>
            <devtools-toolbar-input type="filter"
                                    placeholder=${i18nString(UIStrings.filter)}
                                    .value=${input.filters.text}
                                    @change=${(e) => input.onFilterChange({ ...input.filters, text: e.detail })}>
            </devtools-toolbar-input>
            <div class="toolbar-divider"></div>
            ${input.filterButtons.toolTypes.button.element}
            <div class="toolbar-divider"></div>
            ${input.filterButtons.statusTypes.button.element}
            <div class="toolbar-spacer"></div>
            <devtools-button title=${i18nString(UIStrings.clearFilters)}
                             .iconName=${'filter-clear'}
                             .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
                             @click=${() => input.onFilterChange({ text: '' })}
                             ?hidden=${!isFilterActive}></devtools-button>
          </devtools-toolbar>
        </div>
        ${input.toolCalls.length > 0 ? html `
          <devtools-data-grid striped>
            <table>
              <tr>
                <th id="name" weight="20">
                  ${i18nString(UIStrings.name)}
                </th>
                <th id="status" weight="20">${i18nString(UIStrings.status)}</th>
                <th id="input" weight="30">${i18nString(UIStrings.input)}</th>
                <th id="output" weight="30">${i18nString(UIStrings.output)}</th>
              </tr>
              ${Directives.repeat(input.toolCalls, call => call.invocationId + '-' + (call.result?.status ?? ''), call => html `
                <tr class=${call.result?.status === "Error" /* Protocol.WebMCP.InvocationStatus.Error */ ? 'status-error' :
        call.result?.status === "Canceled" /* Protocol.WebMCP.InvocationStatus.Canceled */ ? 'status-cancelled' : ''}>
                  <style>${webMCPViewStyles}</style>
                  <td>${call.tool.name}</td>
                  <td>
                    <div class="status-cell">
                      ${iconName(call) ? html `<devtools-icon class="small" name=${iconName(call)}></devtools-icon>`
        : ''}
                      <span>${statusString(call)}</span>
                    </div>
                  </td>
                  <td>${call.input}</td>
                  <td>${call.result?.output ? JSON.stringify(call.result.output) : call.result?.errorText ?? ''}</td>
                </tr>
              `)}
              </table>
          </devtools-data-grid>
        ` : html `
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, { header: i18nString(UIStrings.noCallsPlaceholderTitle),
        text: i18nString(UIStrings.noCallsPlaceholder) })}
        `}
      </div>
      <div slot="sidebar" class="tool-list">
        <div class="section-title">${i18nString(UIStrings.toolRegistry)}</div>
        ${tools.length === 0 ? html `
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, { header: i18nString(UIStrings.noToolsPlaceholderTitle),
        text: i18nString(UIStrings.noToolsPlaceholder) })}
        ` : html `
          <devtools-list>
            ${tools.map(tool => html `
                <div class="tool-item">
                  <div class="tool-name-container">
                    <div class="tool-name source-code">${tool.name}</div>
                  </div>
                  <div class="tool-description">${tool.description}</div>
                </div>
              `)}
          </devtools-list>
        `}
      </div>
    </devtools-split-view>
  `, target);
    // clang-format on
};
export class WebMCPView extends UI.Widget.VBox {
    #view;
    #filterState = {
        text: '',
    };
    #filterButtons;
    static createFilterButtons(onToolTypesClick, onStatusTypesClick) {
        const createButton = (label, onContextMenu, jsLogContext) => {
            const button = new UI.Toolbar.ToolbarMenuButton(onContextMenu, 
            /* isIconDropdown=*/ false, /* useSoftMenu=*/ true, jsLogContext, 
            /* iconName=*/ undefined, 
            /* keepOpen=*/ true);
            button.setText(label);
            /* eslint-disable-next-line @devtools/no-imperative-dom-api */
            const adorner = new Adorners.Adorner.Adorner();
            adorner.name = 'countWrapper';
            const countElement = document.createElement('span');
            adorner.append(countElement);
            adorner.classList.add('active-filters-count');
            adorner.classList.add('hidden');
            button.setAdorner(adorner);
            const setCount = (count) => {
                countElement.textContent = `${count}`;
                count === 0 ? adorner.hide() : adorner.show();
            };
            return { button, setCount };
        };
        return {
            toolTypes: createButton(i18nString(UIStrings.toolTypes), onToolTypesClick, 'webmcp.tool-types'),
            statusTypes: createButton(i18nString(UIStrings.statusTypes), onStatusTypesClick, 'webmcp.status-types'),
        };
    }
    constructor(target, view = DEFAULT_VIEW) {
        super(target);
        this.#view = view;
        this.#filterButtons = WebMCPView.createFilterButtons(this.#showToolTypesContextMenu.bind(this), this.#showStatusTypesContextMenu.bind(this));
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.WebMCPModel.WebMCPModel, {
            modelAdded: (model) => this.#webMCPModelAdded(model),
            modelRemoved: (model) => this.#webMCPModelRemoved(model),
        });
        this.requestUpdate();
    }
    #showToolTypesContextMenu(contextMenu) {
        const toggle = (key) => {
            const current = this.#filterState.toolTypes ?? {};
            const next = { ...current, [key]: !current[key] };
            let toolTypesToPass = next;
            if (!next.imperative && !next.declarative) {
                toolTypesToPass = undefined;
            }
            this.#handleFilterChange({ ...this.#filterState, toolTypes: toolTypesToPass });
        };
        contextMenu.defaultSection().appendCheckboxItem(i18nString(UIStrings.imperative), () => toggle('imperative'), { checked: this.#filterState.toolTypes?.imperative ?? false, jslogContext: 'webmcp.imperative' });
        contextMenu.defaultSection().appendCheckboxItem(i18nString(UIStrings.declarative), () => toggle('declarative'), { checked: this.#filterState.toolTypes?.declarative ?? false, jslogContext: 'webmcp.declarative' });
    }
    #showStatusTypesContextMenu(contextMenu) {
        const toggle = (key) => {
            const current = this.#filterState.statusTypes ?? {};
            const next = { ...current, [key]: !current[key] };
            let statusTypesToPass = next;
            if (!next.success && !next.error && !next.pending) {
                statusTypesToPass = undefined;
            }
            this.#handleFilterChange({ ...this.#filterState, statusTypes: statusTypesToPass });
        };
        contextMenu.defaultSection().appendCheckboxItem(i18nString(UIStrings.success), () => toggle('success'), { checked: this.#filterState.statusTypes?.['success'] ?? false, jslogContext: 'webmcp.success' });
        contextMenu.defaultSection().appendCheckboxItem(i18nString(UIStrings.error), () => toggle('error'), { checked: this.#filterState.statusTypes?.['error'] ?? false, jslogContext: 'webmcp.error' });
        contextMenu.defaultSection().appendCheckboxItem(i18nString(UIStrings.pending), () => toggle('pending'), { checked: this.#filterState.statusTypes?.['pending'] ?? false, jslogContext: 'webmcp.pending' });
    }
    #webMCPModelAdded(model) {
        model.addEventListener("ToolsAdded" /* SDK.WebMCPModel.Events.TOOLS_ADDED */, this.requestUpdate, this);
        model.addEventListener("ToolsRemoved" /* SDK.WebMCPModel.Events.TOOLS_REMOVED */, this.requestUpdate, this);
        model.addEventListener("ToolInvoked" /* SDK.WebMCPModel.Events.TOOL_INVOKED */, this.requestUpdate, this);
        model.addEventListener("ToolResponded" /* SDK.WebMCPModel.Events.TOOL_RESPONDED */, this.requestUpdate, this);
    }
    #webMCPModelRemoved(model) {
        model.removeEventListener("ToolsAdded" /* SDK.WebMCPModel.Events.TOOLS_ADDED */, this.requestUpdate, this);
        model.removeEventListener("ToolsRemoved" /* SDK.WebMCPModel.Events.TOOLS_REMOVED */, this.requestUpdate, this);
        model.removeEventListener("ToolInvoked" /* SDK.WebMCPModel.Events.TOOL_INVOKED */, this.requestUpdate, this);
        model.removeEventListener("ToolResponded" /* SDK.WebMCPModel.Events.TOOL_RESPONDED */, this.requestUpdate, this);
    }
    #handleClearLogClick = () => {
        const models = SDK.TargetManager.TargetManager.instance().models(SDK.WebMCPModel.WebMCPModel);
        for (const model of models) {
            model.clearCalls();
        }
        this.requestUpdate();
    };
    #handleFilterChange = (filters) => {
        this.#filterState = filters;
        const toolTypesCount = this.#filterState.toolTypes ? Object.values(this.#filterState.toolTypes).filter(Boolean).length : 0;
        this.#filterButtons.toolTypes.setCount(toolTypesCount);
        const statusTypesCount = this.#filterState.statusTypes ? Object.values(this.#filterState.statusTypes).filter(Boolean).length : 0;
        this.#filterButtons.statusTypes.setCount(statusTypesCount);
        this.requestUpdate();
    };
    #getTools() {
        const models = SDK.TargetManager.TargetManager.instance().models(SDK.WebMCPModel.WebMCPModel);
        const tools = models.flatMap(model => model.tools.toArray());
        return tools.sort((a, b) => a.name.localeCompare(b.name));
    }
    performUpdate() {
        const models = SDK.TargetManager.TargetManager.instance().models(SDK.WebMCPModel.WebMCPModel);
        const toolCalls = models.flatMap(model => model.toolCalls);
        const filteredCalls = filterToolCalls(toolCalls, this.#filterState);
        const input = {
            tools: this.#getTools(),
            toolCalls: filteredCalls,
            filters: this.#filterState,
            filterButtons: this.#filterButtons,
            onClearLogClick: this.#handleClearLogClick,
            onFilterChange: this.#handleFilterChange,
        };
        this.#view(input, {}, this.contentElement);
    }
}
//# sourceMappingURL=WebMCPView.js.map