// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/lists/lists.js';
import '../../ui/components/node_text/node_text.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as WebMCP from '../../models/web_mcp/web_mcp.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render, } from '../../ui/lit/lit.js';
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
     * @description Text for the header of the tool details section
     */
    toolDetails: 'Details',
    /**
     * @description Text for the link to reveal the tool's DOM node in the Elements panel
     */
    viewInElementsPanel: 'View in Elements panel',
    /**
     * @description Text for the frame of a tool
     */
    frame: 'Frame',
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
     * @description Text to close something
     */
    close: 'Close',
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
    /**
     * @description Text for the total number of tool calls
     * @example {2} PH1
     */
    totalCalls: '{PH1} Total calls',
    /**
     * @description Text for the number of failed tool calls
     * @example {1} PH1
     */
    failed: '{PH1} Failed',
    /**
     * @description Text for the number of canceled tool calls
     * @example {1} PH1
     */
    canceledCount: '{PH1} Canceled',
    /**
     * @description Text for the number of in progress tool calls
     * @example {1} PH1
     */
    inProgressCount: '{PH1} In Progress',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/WebMCPView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { widget } = UI.Widget;
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
            if (imperative && !call.tool.isDeclarative) {
                return true;
            }
            if (declarative && call.tool.isDeclarative) {
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
function calculateToolStats(calls) {
    let total = 0, success = 0, failed = 0, canceled = 0, inProgress = 0;
    for (const call of calls) {
        total++;
        if (call.result?.status === "Error" /* Protocol.WebMCP.InvocationStatus.Error */) {
            failed++;
        }
        else if (call.result?.status === "Canceled" /* Protocol.WebMCP.InvocationStatus.Canceled */) {
            canceled++;
        }
        else if (call.result?.status === "Success" /* Protocol.WebMCP.InvocationStatus.Success */) {
            success++;
        }
        else if (call.result === undefined) {
            inProgress++;
        }
    }
    return { total, success, failed, canceled, inProgress };
}
function getIconGroupsFromStats(toolStats) {
    const groups = [];
    if (toolStats.success > 0) {
        groups.push({
            iconName: 'check-circle',
            iconColor: 'var(--sys-color-green)',
            iconWidth: '16px',
            iconHeight: '16px',
            text: String(toolStats.success),
        });
    }
    if (toolStats.failed > 0) {
        groups.push({
            iconName: 'cross-circle-filled',
            iconColor: 'var(--sys-color-error)',
            iconWidth: '16px',
            iconHeight: '16px',
            text: String(toolStats.failed),
        });
    }
    if (toolStats.canceled > 0) {
        groups.push({
            iconName: 'record-stop',
            iconColor: 'var(--sys-color-on-surface-light)',
            iconWidth: '16px',
            iconHeight: '16px',
            text: String(toolStats.canceled),
        });
    }
    if (toolStats.inProgress > 0) {
        groups.push({
            iconName: 'dots-circle',
            iconWidth: '16px',
            iconHeight: '16px',
            text: String(toolStats.inProgress),
        });
    }
    return groups;
}
export const DEFAULT_VIEW = (input, output, target) => {
    const tools = input.tools;
    const stats = calculateToolStats(input.toolCalls);
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
          <devtools-split-view name="webmcp-call-split-view"
                               direction="column"
                               sidebar-position="second"
                               sidebar-visibility=${input.selectedCall ? 'show' : 'hidden'}>
            <div slot="main" style="display: flex; flex-direction: column; overflow: hidden; height: 100%;">
              <devtools-data-grid striped .template=${html `
                <table>
                  <style>${webMCPViewStyles}</style>
                  <tr>
                    <th id="name" weight="20">
                      ${i18nString(UIStrings.name)}
                    </th>
                    <th id="status" weight="20">${i18nString(UIStrings.status)}</th>
                            ${!input.selectedCall ? html `
                    <th id="input" weight="30">${i18nString(UIStrings.input)}</th>
                    <th id="output" weight="30">${i18nString(UIStrings.output)}</th>
                            ` : nothing}
                  </tr>
                      ${Directives.repeat(input.toolCalls, call => call.invocationId + '-' + (call.result?.status ?? ''), call => html `
                    <tr class=${Directives.classMap({
        'status-error': call.result?.status === "Error" /* Protocol.WebMCP.InvocationStatus.Error */,
        'status-cancelled': call.result?.status === "Canceled" /* Protocol.WebMCP.InvocationStatus.Canceled */,
        selected: call === input.selectedCall,
    })} @click=${() => input.onCallSelect(call)}>
                      <td>${call.tool.name}</td>
                      <td>
                        <div class="status-cell">
                          ${iconName(call) ? html `<devtools-icon class="small" name=${iconName(call)}></devtools-icon>`
        : ''}
                          <span>${statusString(call)}</span>
                        </div>
                      </td>
                          ${!input.selectedCall ? html `
                      <td>${call.input}</td>
                          <td>${call.result?.output ? JSON.stringify(call.result.output)
        : call.result?.errorText ?? ''}</td>
                          ` : nothing}
                    </tr>
                  `)}
                  </table>`}>
              </devtools-data-grid>
            </div>
            <div slot="sidebar" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
              <devtools-tabbed-pane class="call-details-tabbed-pane">
                <devtools-button
                  slot="left"
                  .iconName=${'cross'}
                  .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
                  .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                  title=${i18nString(UIStrings.close)}
                  @click=${() => input.onCallSelect(null)}
                ></devtools-button>
                <devtools-widget
                  id="details"
                  title=${i18nString(UIStrings.toolDetails)}
                  ${widget(ToolDetailsWidget, { tool: input.selectedCall?.tool })}>
                </devtools-widget>
              </devtools-tabbed-pane>
            </div>
          </devtools-split-view>
          <div class="webmcp-toolbar-container" role="toolbar">
            <devtools-toolbar class="webmcp-toolbar" role="presentation" wrappable>
              <span class="toolbar-text">${i18nString(UIStrings.totalCalls, { PH1: stats.total })}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text status-error-text">${i18nString(UIStrings.failed, { PH1: stats.failed })}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text status-cancelled-text">${i18nString(UIStrings.canceledCount, { PH1: stats.canceled })}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text">${i18nString(UIStrings.inProgressCount, { PH1: stats.inProgress })}</span>
            </devtools-toolbar>
          </div>
        ` : html `
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, { header: i18nString(UIStrings.noCallsPlaceholderTitle),
        text: i18nString(UIStrings.noCallsPlaceholder) })}
        `}
      </div>
      <devtools-split-view slot="sidebar"
                           direction="column"
                           sidebar-position="second"
                           name="webmcp-details-split-view"
                           sidebar-visibility=${input.selectedTool ? 'show' : 'hidden'}>
        <div slot="main" class="tool-list">
          <div class="section-title">${i18nString(UIStrings.toolRegistry)}</div>
          ${tools.length === 0 ? html `
          ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, { header: i18nString(UIStrings.noToolsPlaceholderTitle),
        text: i18nString(UIStrings.noToolsPlaceholder) })}
          ` : html `
            <devtools-list>
              ${tools.map(tool => {
        const toolStats = calculateToolStats(input.toolCalls.filter(c => c.tool === tool));
        const groups = getIconGroupsFromStats(toolStats);
        return html `
                    <div class=${Directives.classMap({ 'tool-item': true, selected: tool === input.selectedTool })}
                         @click=${() => input.onToolSelect(tool)}>
                    <div class="tool-name-container">
                      <div class="tool-name source-code">${tool.name}</div>
                      ${groups.length > 0 ? html `<icon-button .data=${{ groups, compact: false }}></icon-button>` : ''}
                    </div>
                    <div class="tool-description">${tool.description}</div>
                  </div>
                `;
    })}
            </devtools-list>
          `}
        </div>
        <div slot="sidebar" class="tool-details">
          <div class="section-title">
            <devtools-button
              .iconName=${'cross'}
              .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
              .variant=${"icon" /* Buttons.Button.Variant.ICON */}
              title=${i18nString(UIStrings.close)}
              @click=${() => input.onToolSelect(null)}
            ></devtools-button>
            <span>${i18nString(UIStrings.toolDetails)}</span>
          </div>
          ${widget(ToolDetailsWidget, { tool: input.selectedTool })}
        </div>
      </devtools-split-view>
    </devtools-split-view>
  `, target);
    // clang-format on
};
export class WebMCPView extends UI.Widget.VBox {
    #view;
    #selectedTool = null;
    #selectedCall = null;
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
        SDK.TargetManager.TargetManager.instance().observeModels(WebMCP.WebMCPModel.WebMCPModel, {
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
        model.addEventListener("ToolsAdded" /* WebMCP.WebMCPModel.Events.TOOLS_ADDED */, this.requestUpdate, this);
        model.addEventListener("ToolsRemoved" /* WebMCP.WebMCPModel.Events.TOOLS_REMOVED */, this.requestUpdate, this);
        model.addEventListener("ToolInvoked" /* WebMCP.WebMCPModel.Events.TOOL_INVOKED */, this.requestUpdate, this);
        model.addEventListener("ToolResponded" /* WebMCP.WebMCPModel.Events.TOOL_RESPONDED */, this.requestUpdate, this);
    }
    #webMCPModelRemoved(model) {
        model.removeEventListener("ToolsAdded" /* WebMCP.WebMCPModel.Events.TOOLS_ADDED */, this.requestUpdate, this);
        model.removeEventListener("ToolsRemoved" /* WebMCP.WebMCPModel.Events.TOOLS_REMOVED */, this.requestUpdate, this);
        model.removeEventListener("ToolInvoked" /* WebMCP.WebMCPModel.Events.TOOL_INVOKED */, this.requestUpdate, this);
        model.removeEventListener("ToolResponded" /* WebMCP.WebMCPModel.Events.TOOL_RESPONDED */, this.requestUpdate, this);
    }
    #handleClearLogClick = () => {
        const models = SDK.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
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
        const models = SDK.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
        const tools = models.flatMap(model => model.tools.toArray());
        return tools.sort((a, b) => a.name.localeCompare(b.name));
    }
    performUpdate() {
        const models = SDK.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
        const toolCalls = models.flatMap(model => model.toolCalls);
        const filteredCalls = filterToolCalls(toolCalls, this.#filterState);
        const input = {
            tools: this.#getTools(),
            selectedTool: this.#selectedTool,
            onToolSelect: tool => {
                this.#selectedTool = tool;
                this.requestUpdate();
            },
            selectedCall: this.#selectedCall,
            onCallSelect: call => {
                this.#selectedCall = call;
                this.requestUpdate();
            },
            toolCalls: filteredCalls,
            filters: this.#filterState,
            filterButtons: this.#filterButtons,
            onClearLogClick: this.#handleClearLogClick,
            onFilterChange: this.#handleFilterChange,
        };
        this.#view(input, {}, this.contentElement);
    }
}
// clang-format off
const TOOL_DETAILS_VIEW = (input, output, target) => {
    if (!input.tool) {
        render(nothing, target);
        return;
    }
    const tool = input.tool;
    const origin = input.origin;
    render(html `
    <style>${webMCPViewStyles}</style>
    <div class="tool-details-grid">
      <div class="label">Name</div>
      <div class="value source-code">${tool.name}</div>
      <div class="label">Description</div>
      <div class="value">${tool.description}</div>
      ${tool.frame ? html `
      <div class="label">${i18nString(UIStrings.frame)}</div>
      <div class="value">${Components.Linkifier.Linkifier.linkifyRevealable(tool.frame, tool.frame.displayName())}</div>
      ` : nothing}
      ${origin instanceof SDK.DOMModel.DOMNode ? html `
      <div class="label">Origin</div>
      <div class="value tool-origin-container">
        <span
            class="node-text-container source-code tool-origin-node"
            data-label="true"
            @mouseenter=${() => input.highlightNode(origin)}
            @mouseleave=${input.clearHighlight}>
          <devtools-node-text .data=${{
        nodeId: origin.getAttribute('id') || undefined,
        nodeTitle: origin.nodeNameInCorrectCase(),
        nodeClasses: origin.getAttribute('class')?.split(/\s+/).filter(s => Boolean(s))
    }}>
          </devtools-node-text>
        </span>
        <devtools-button class="show-element"
           .title=${i18nString(UIStrings.viewInElementsPanel)}
           aria-label=${i18nString(UIStrings.viewInElementsPanel)}
           .iconName=${'select-element'}
           .jslogContext=${'elements.select-element'}
           .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
           .variant=${"icon" /* Buttons.Button.Variant.ICON */}
           @click=${() => input.revealNode(origin)}
           ></devtools-button>
      </div>` : origin ? html `
      <div class="label">Origin</div>
      <div class="value">
        ${widget(Components.JSPresentationUtils.StackTracePreviewContent, { stackTrace: origin, options: { expandable: true } })}
      </div>` : nothing}
    </div>
  `, target);
};
// clang-format on
export class ToolDetailsWidget extends UI.Widget.Widget {
    #tool = null;
    #origin;
    #view;
    constructor(element, view = TOOL_DETAILS_VIEW) {
        super(element);
        this.#view = view;
    }
    set tool(tool) {
        if (this.#tool === tool) {
            return;
        }
        this.#tool = tool;
        this.#origin = undefined;
        if (this.#tool) {
            void this.#setToolOrigin(this.#tool);
        }
        this.requestUpdate();
    }
    async #setToolOrigin(tool) {
        const origin = await (tool.node ? tool.node.resolvePromise() : tool.stackTrace);
        if (this.#tool === tool && origin) {
            this.#origin = origin;
            this.requestUpdate();
        }
    }
    get tool() {
        return this.#tool;
    }
    #highlightNode = (node) => {
        node.highlight();
    };
    #clearHighlight = () => {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    };
    #revealNode = (node) => {
        void Common.Revealer.reveal(node);
        void node.scrollIntoView();
    };
    performUpdate() {
        const viewInput = {
            tool: this.#tool,
            origin: this.#origin,
            highlightNode: this.#highlightNode,
            clearHighlight: this.#clearHighlight,
            revealNode: this.#revealNode,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
}
//# sourceMappingURL=WebMCPView.js.map