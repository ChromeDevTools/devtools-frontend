// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/lists/lists.js';
import '../../ui/components/node_text/node_text.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/legacy/legacy.js';

import type {JSONSchema7, JSONSchema7Definition} from 'json-schema';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as WebMCP from '../../models/web_mcp/web_mcp.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as IconButton from '../../ui/components/icon_button/icon_button.js';
import type * as NodeText from '../../ui/components/node_text/node_text.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {
  Directives,
  html,
  nothing,
  render,
  type TemplateResult,
} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ProtocolMonitor from '../protocol_monitor/protocol_monitor.js';

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
  noToolsPlaceholder:
      'Registered `WebMCP` tools for this page will appear here. No tools have been registered or detected yet.',
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
  completed: 'Completed',
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
  /**
   * @description Context menu action to copy the name of a tool
   */
  copyName: 'Copy name',
  /**
   * @description Context menu action to copy the description of a tool
   */
  copyDescription: 'Copy description',
  /**
   * @description Text for the header of the tool run section
   */
  runTool: 'Run Tool',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/WebMCPView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {widget} = UI.Widget;

export interface FilterState {
  text: string;
  toolTypes?: {
    imperative?: boolean,
    declarative?: boolean,
  };
  statusTypes?: {
    completed?: boolean,
    error?: boolean,
    pending?: boolean,
  };
}

export interface FilterMenuButton {
  button: UI.Toolbar.ToolbarMenuButton;
  setCount: (count: number) => void;
}

export interface FilterMenuButtons {
  toolTypes: FilterMenuButton;
  statusTypes: FilterMenuButton;
}
export interface ViewInput {
  tools: WebMCP.WebMCPModel.Tool[];
  selectedTool: WebMCP.WebMCPModel.Tool|null;
  onToolSelect: (tool: WebMCP.WebMCPModel.Tool|null) => void;
  selectedCall: WebMCP.WebMCPModel.Call|null;
  onCallSelect: (call: WebMCP.WebMCPModel.Call|null) => void;
  filters: FilterState;
  filterButtons: FilterMenuButtons;
  onClearLogClick: () => void;
  onFilterChange: (filters: FilterState) => void;
  toolCalls: WebMCP.WebMCPModel.Call[];
  onRunTool: (event: Common.EventTarget.EventTargetEvent<ProtocolMonitor.JSONEditor.Command>) => void;
}

export function filterToolCalls(
    toolCalls: WebMCP.WebMCPModel.Call[], filterState: FilterState): WebMCP.WebMCPModel.Call[] {
  let filtered = [...toolCalls];

  const statusTypes = filterState.statusTypes;
  if (statusTypes) {
    filtered = filtered.filter(call => {
      const {completed, error, pending} = statusTypes;
      if (completed && call.result?.status === Protocol.WebMCP.InvocationStatus.Completed) {
        return true;
      }
      if (error && call.result?.status === Protocol.WebMCP.InvocationStatus.Error) {
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
      const {imperative, declarative} = toolTypes;
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
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
function calculateToolStats(calls: WebMCP.WebMCPModel.Call[]):
    {total: number, completed: number, failed: number, canceled: number, inProgress: number} {
  let total = 0, completed = 0, failed = 0, canceled = 0, inProgress = 0;
  for (const call of calls) {
    total++;
    if (call.result?.status === Protocol.WebMCP.InvocationStatus.Error) {
      failed++;
    } else if (call.result?.status === Protocol.WebMCP.InvocationStatus.Canceled) {
      canceled++;
    } else if (call.result?.status === Protocol.WebMCP.InvocationStatus.Completed) {
      completed++;
    } else if (call.result === undefined) {
      inProgress++;
    }
  }
  return {total, completed, failed, canceled, inProgress};
}

function getIconGroupsFromStats(toolStats: ReturnType<typeof calculateToolStats>):
    IconButton.IconButton.IconWithTextData[] {
  const groups = [];
  if (toolStats.completed > 0) {
    groups.push({
      iconName: 'check-circle',
      iconColor: 'var(--sys-color-green)',
      iconWidth: '16px',
      iconHeight: '16px',
      text: String(toolStats.completed),
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

export function parsePayload(payload?: unknown): {
  valueObject: unknown,
  valueString: string|undefined,
} {
  if (payload === undefined) {
    return {valueObject: undefined, valueString: undefined};
  }
  if (typeof payload === 'string') {
    try {
      return {valueObject: JSON.parse(payload), valueString: undefined};
    } catch {
      return {valueObject: undefined, valueString: payload};
    }
  }
  return {valueObject: payload, valueString: undefined};
}

export function getJSONEditorParameters(tool: WebMCP.WebMCPModel.Tool): {
  metadataByCommand: Map<string, {
    parameters: ProtocolMonitor.JSONEditor.Parameter[],
    description: string,
    replyArgs: string[],
  }>,
  typesByName: Map<string, ProtocolMonitor.JSONEditor.Parameter[]>,
  enumsByName: Map<string, Record<string, string>>,
} {
  const parsedSchema = parseToolSchema(tool.inputSchema);
  const metadataByCommand = new Map();
  metadataByCommand.set(tool.name, {
    parameters: parsedSchema.parameters,
    description: tool.description,
    replyArgs: [],
  });
  return {
    metadataByCommand,
    typesByName: parsedSchema.typesByName,
    enumsByName: parsedSchema.enumsByName,
  };
}
export const DEFAULT_VIEW: View = (input, output, target) => {
  const tools = input.tools;
  const stats = calculateToolStats(input.toolCalls);
  const isFilterActive =
      Boolean(input.filters.text) || Boolean(input.filters.toolTypes) || Boolean(input.filters.statusTypes);
  const iconName = (call: WebMCP.WebMCPModel.Call): string => {
    switch (call.result?.status) {
      case Protocol.WebMCP.InvocationStatus.Error:
        return 'cross-circle-filled';
      case Protocol.WebMCP.InvocationStatus.Canceled:
        return 'record-stop';
      case undefined:
        return 'dots-circle';
      default:
        return '';
    }
  };
  const statusString = (call: WebMCP.WebMCPModel.Call): string => {
    switch (call.result?.status) {
      case Protocol.WebMCP.InvocationStatus.Error:
        return i18nString(UIStrings.error);
      case Protocol.WebMCP.InvocationStatus.Canceled:
        return i18nString(UIStrings.canceled);
      case Protocol.WebMCP.InvocationStatus.Completed:
        return i18nString(UIStrings.completed);
      default:
        return i18nString(UIStrings.inProgress);
    }
  };
  const onToolContextMenu = (event: Event, tool: WebMCP.WebMCPModel.Tool): void => {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.copyName), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(tool.name);
    }, {jslogContext: 'webmcp.copy-tool-name'});
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.copyDescription), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(tool.description);
    }, {jslogContext: 'webmcp.copy-tool-description'});
    void contextMenu.show();
  };
  // clang-format off
  render(html`
    <style>${webMCPViewStyles}</style>
    <style>${UI.FilterBar.filterStyles}</style>
    <devtools-split-view class="webmcp-view" direction="row" sidebar-position="second" name="webmcp-split-view">
      <div slot="main" class="call-log">
        <div class="webmcp-toolbar-container" role="toolbar" jslog=${VisualLogging.toolbar()}>
          <devtools-toolbar class="webmcp-toolbar" role="presentation" wrappable>
            <devtools-button title=${i18nString(UIStrings.clearLog)}
                             .iconName=${'clear'}
                             .variant=${Buttons.Button.Variant.TOOLBAR}
                             @click=${input.onClearLogClick}></devtools-button>
            <div class="toolbar-divider"></div>
            <devtools-toolbar-input type="filter"
                                    placeholder=${i18nString(UIStrings.filter)}
                                    .value=${input.filters.text}
                                    @change=${(e: CustomEvent<string>) =>
                                      input.onFilterChange({...input.filters, text: e.detail})}>
            </devtools-toolbar-input>
            <div class="toolbar-divider"></div>
            ${input.filterButtons.toolTypes.button.element}
            <div class="toolbar-divider"></div>
            ${input.filterButtons.statusTypes.button.element}
            <div class="toolbar-spacer"></div>
            <devtools-button title=${i18nString(UIStrings.clearFilters)}
                             .iconName=${'filter-clear'}
                             .variant=${Buttons.Button.Variant.TOOLBAR}
                             @click=${() => input.onFilterChange({text: ''})}
                             ?hidden=${!isFilterActive}></devtools-button>
          </devtools-toolbar>
        </div>
        ${input.toolCalls.length > 0 ? html`
          <devtools-split-view name="webmcp-call-split-view"
                               direction="column"
                               sidebar-position="second"
                               sidebar-visibility=${input.selectedCall ? 'show' : 'hidden'}>
            <div slot="main" style="display: flex; flex-direction: column; overflow: hidden; height: 100%;">
              <devtools-data-grid striped .template=${html`
                <table>
                  <style>${webMCPViewStyles}</style>
                  <tr>
                    <th id="name" weight="20">
                      ${i18nString(UIStrings.name)}
                    </th>
                    <th id="status" weight="20">${i18nString(UIStrings.status)}</th>
                            ${!input.selectedCall ? html`
                    <th id="input" weight="30">${i18nString(UIStrings.input)}</th>
                    <th id="output" weight="30">${i18nString(UIStrings.output)}</th>
                            ` : nothing}
                  </tr>
                      ${Directives.repeat(input.toolCalls, call => call.invocationId + '-' + (call.result?.status ?? ''),
                                          call => html`
                    <tr class=${Directives.classMap({
                      'status-error': call.result?.status === Protocol.WebMCP.InvocationStatus.Error,
                      'status-cancelled': call.result?.status === Protocol.WebMCP.InvocationStatus.Canceled,
                      selected: call === input.selectedCall,
                    })} @click=${() => input.onCallSelect(call)}>
                      <td>${call.tool.name}</td>
                      <td>
                        <div class="status-cell">
                          ${iconName(call) ? html`<devtools-icon class="small" name=${iconName(call)}></devtools-icon>`
                                           : ''}
                          <span>${statusString(call)}</span>
                        </div>
                      </td>
                      ${!input.selectedCall ? html`
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
                  .size=${Buttons.Button.Size.SMALL}
                  .variant=${Buttons.Button.Variant.ICON}
                  title=${i18nString(UIStrings.close)}
                  @click=${() => input.onCallSelect(null)}
                ></devtools-button>
                <devtools-widget
                  id="webmcp.tool-details"
                  title=${i18nString(UIStrings.toolDetails)}
                  ${widget(ToolDetailsWidget, {tool: input.selectedCall?.tool})}>
                </devtools-widget>
                <devtools-widget
                  id="webmcp.call-inputs"
                  title=${i18nString(UIStrings.input)}
                  ${widget(PayloadWidget, parsePayload(input.selectedCall?.input))}>
                </devtools-widget>
                <devtools-widget
                  id="webmcp.call-outputs"
                  title=${i18nString(UIStrings.output)}
                  ${widget(PayloadWidget, {
                          valueObject: input.selectedCall?.result?.output,
                          errorText: input.selectedCall?.result?.errorText,
                          exceptionDetails: input.selectedCall?.result?.exceptionDetails,
                  })}>
                </devtools-widget>
              </devtools-tabbed-pane>
            </div>
          </devtools-split-view>
          <div class="webmcp-toolbar-container" role="toolbar">
            <devtools-toolbar class="webmcp-toolbar" role="presentation" wrappable>
              <span class="toolbar-text">${i18nString(UIStrings.totalCalls, {PH1: stats.total})}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text status-error-text">${i18nString(UIStrings.failed, {PH1: stats.failed})}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text status-cancelled-text">${
                  i18nString(UIStrings.canceledCount, {PH1: stats.canceled})}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text">${i18nString(UIStrings.inProgressCount, {PH1: stats.inProgress})}</span>
            </devtools-toolbar>
          </div>
        ` : html`
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {header: i18nString(UIStrings.noCallsPlaceholderTitle),
                                                          text: i18nString(UIStrings.noCallsPlaceholder)})}
        `}
      </div>
      <devtools-split-view slot="sidebar"
                           direction="column"
                           sidebar-position="second"
                           name="webmcp-details-split-view"
                           sidebar-visibility=${input.selectedTool ? 'show' : 'hidden'}>
        <div slot="main" class="tool-list">
          <div class="section-title">${i18nString(UIStrings.toolRegistry)}</div>
          ${tools.length === 0 ? html`
          ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {header: i18nString(UIStrings.noToolsPlaceholderTitle),
                                                          text: i18nString(UIStrings.noToolsPlaceholder)})}
          ` : html`
            <devtools-list>
              ${tools.map(tool => {
                const toolStats = calculateToolStats(input.toolCalls.filter(c => c.tool === tool));
                const groups = getIconGroupsFromStats(toolStats);
                return html`
                    <div class=${Directives.classMap({'tool-item': true, selected: tool === input.selectedTool})}
                         @click=${() => input.onToolSelect(tool)}
                         @contextmenu=${(e: Event) => onToolContextMenu(e, tool)}>
                    <div class="tool-name-container">
                      <div class="tool-name source-code">${tool.name}</div>
                      ${groups.length > 0 ? html`<icon-button .data=${
                          {groups, compact: false} as IconButton.IconButton.IconButtonData}></icon-button>` : ''}
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
              .size=${Buttons.Button.Size.SMALL}
              .variant=${Buttons.Button.Variant.ICON}
              title=${i18nString(UIStrings.close)}
              @click=${() => input.onToolSelect(null)}
            ></devtools-button>
            <span>${i18nString(UIStrings.toolDetails)}</span>
          </div>
          ${input.selectedTool ? html`
            <div class="sidebar-tool-details">
          ${widget(ToolDetailsWidget, {tool: input.selectedTool})}
        </div>
            <div class="section-title">
              <span>${i18nString(UIStrings.runTool)}</span>
            </div>
            <devtools-widget
              class="json-editor-widget"
              ${widget(ProtocolMonitor.JSONEditor.JSONEditor, {
                displayTargetSelector: false,
                displayCommandInput: false,
                ...getJSONEditorParameters(input.selectedTool),
                commandToDisplay: input.selectedTool.name,
                onSubmit: input.onRunTool,
              })}
            ></devtools-widget>
          ` : nothing}
        </div>
      </devtools-split-view>
    </devtools-split-view>
  `, target);
  // clang-format on
};

export class WebMCPView extends UI.Widget.VBox {
  readonly #view: View;
  #selectedTool: WebMCP.WebMCPModel.Tool|null = null;
  #selectedCall: WebMCP.WebMCPModel.Call|null = null;

  #filterState: FilterState = {
    text: '',
  };

  #filterButtons: FilterMenuButtons;

  static createFilterButtons(
      onToolTypesClick: (contextMenu: UI.ContextMenu.ContextMenu) => void,
      onStatusTypesClick: (contextMenu: UI.ContextMenu.ContextMenu) => void): FilterMenuButtons {
    const createButton =
        (label: string, onContextMenu: (contextMenu: UI.ContextMenu.ContextMenu) => void, jsLogContext: string):
            FilterMenuButton => {
              const button = new UI.Toolbar.ToolbarMenuButton(
                  onContextMenu,
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

              const setCount = (count: number): void => {
                countElement.textContent = `${count}`;
                count === 0 ? adorner.hide() : adorner.show();
              };

              return {button, setCount};
            };

    return {
      toolTypes: createButton(i18nString(UIStrings.toolTypes), onToolTypesClick, 'webmcp.tool-types'),
      statusTypes: createButton(i18nString(UIStrings.statusTypes), onStatusTypesClick, 'webmcp.status-types'),
    };
  }
  constructor(target?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(target);
    this.#view = view;
    this.#filterButtons = WebMCPView.createFilterButtons(
        this.#showToolTypesContextMenu.bind(this),
        this.#showStatusTypesContextMenu.bind(this),
    );
    SDK.TargetManager.TargetManager.instance().observeModels(WebMCP.WebMCPModel.WebMCPModel, {
      modelAdded: (model: WebMCP.WebMCPModel.WebMCPModel) => this.#webMCPModelAdded(model),
      modelRemoved: (model: WebMCP.WebMCPModel.WebMCPModel) => this.#webMCPModelRemoved(model),
    });
    this.requestUpdate();
  }

  #showToolTypesContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    const toggle = (key: 'imperative'|'declarative'): void => {
      const current = this.#filterState.toolTypes ?? {};
      const next = {...current, [key]: !current[key]};
      let toolTypesToPass: FilterState['toolTypes'] = next;
      if (!next.imperative && !next.declarative) {
        toolTypesToPass = undefined;
      }
      this.#handleFilterChange({...this.#filterState, toolTypes: toolTypesToPass});
    };

    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.imperative), () => toggle('imperative'),
        {checked: this.#filterState.toolTypes?.imperative ?? false, jslogContext: 'webmcp.imperative'});
    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.declarative), () => toggle('declarative'),
        {checked: this.#filterState.toolTypes?.declarative ?? false, jslogContext: 'webmcp.declarative'});
  }

  #showStatusTypesContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    const toggle = (key: 'completed'|'error'|'pending'): void => {
      const current = this.#filterState.statusTypes ?? {};
      const next = {...current, [key]: !current[key]};
      let statusTypesToPass: FilterState['statusTypes'] = next;
      if (!next.completed && !next.error && !next.pending) {
        statusTypesToPass = undefined;
      }
      this.#handleFilterChange({...this.#filterState, statusTypes: statusTypesToPass});
    };

    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.completed), () => toggle('completed'),
        {checked: this.#filterState.statusTypes?.['completed'] ?? false, jslogContext: 'webmcp.completed'});
    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.error), () => toggle('error'),
        {checked: this.#filterState.statusTypes?.['error'] ?? false, jslogContext: 'webmcp.error'});
    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.pending), () => toggle('pending'),
        {checked: this.#filterState.statusTypes?.['pending'] ?? false, jslogContext: 'webmcp.pending'});
  }
  #webMCPModelAdded(model: WebMCP.WebMCPModel.WebMCPModel): void {
    model.addEventListener(WebMCP.WebMCPModel.Events.TOOLS_ADDED, this.requestUpdate, this);
    model.addEventListener(WebMCP.WebMCPModel.Events.TOOLS_REMOVED, this.#toolsRemoved, this);
    model.addEventListener(WebMCP.WebMCPModel.Events.TOOL_INVOKED, this.requestUpdate, this);
    model.addEventListener(WebMCP.WebMCPModel.Events.TOOL_RESPONDED, this.requestUpdate, this);
  }

  #webMCPModelRemoved(model: WebMCP.WebMCPModel.WebMCPModel): void {
    model.removeEventListener(WebMCP.WebMCPModel.Events.TOOLS_ADDED, this.requestUpdate, this);
    model.removeEventListener(WebMCP.WebMCPModel.Events.TOOLS_REMOVED, this.#toolsRemoved, this);
    model.removeEventListener(WebMCP.WebMCPModel.Events.TOOL_INVOKED, this.requestUpdate, this);
    model.removeEventListener(WebMCP.WebMCPModel.Events.TOOL_RESPONDED, this.requestUpdate, this);
  }

  #toolsRemoved(event: Common.EventTarget.EventTargetEvent<readonly WebMCP.WebMCPModel.Tool[]>): void {
    if (this.#selectedTool && event.data.includes(this.#selectedTool)) {
      this.#selectedTool = null;
    }
    this.requestUpdate();
  }

  #handleClearLogClick = (): void => {
    const models = SDK.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
    for (const model of models) {
      model.clearCalls();
    }
    this.requestUpdate();
  };

  #handleFilterChange = (filters: FilterState): void => {
    this.#filterState = filters;

    const toolTypesCount =
        this.#filterState.toolTypes ? Object.values(this.#filterState.toolTypes).filter(Boolean).length : 0;
    this.#filterButtons.toolTypes.setCount(toolTypesCount);

    const statusTypesCount =
        this.#filterState.statusTypes ? Object.values(this.#filterState.statusTypes).filter(Boolean).length : 0;
    this.#filterButtons.statusTypes.setCount(statusTypesCount);

    this.requestUpdate();
  };

  #getTools(): WebMCP.WebMCPModel.Tool[] {
    const models = SDK.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
    const tools = models.flatMap(model => model.tools.toArray());
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }
  override performUpdate(): void {
    const models = SDK.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
    const toolCalls = models.flatMap(model => model.toolCalls);
    const filteredCalls = filterToolCalls(toolCalls, this.#filterState);
    const tools = this.#getTools();
    const input: ViewInput = {
      tools,
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
      onRunTool: event => {
        if (this.#selectedTool) {
          void this.#selectedTool.invoke(event.data.parameters || {});
        }
      },
    };
    this.#view(input, {}, this.contentElement);
  }
}
export interface PayloadViewInput {
  valueObject?: unknown;
  valueString?: string;
  errorText?: string;
  exceptionDetails?: WebMCP.WebMCPModel.ExceptionDetails;
}

export const PAYLOAD_DEFAULT_VIEW = (input: PayloadViewInput, output: object, target: HTMLElement): void => {
  if (!input.valueObject && !input.valueString && !input.errorText && !input.exceptionDetails) {
    render(nothing, target);
    return;
  }
  const isParsable = input.valueObject !== undefined;

  const createPayload = (parsedInput: unknown): TemplateResult => {
    const object = new SDK.RemoteObject.LocalJSONObject(parsedInput);
    const section =
        new ObjectUI.ObjectPropertiesSection.RootElement(new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
          readOnly: true,
          propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
        }));
    section.title = document.createTextNode(object.description);
    section.listItemElement.classList.add('source-code', 'object-properties-section');
    section.childrenListElement.classList.add('source-code', 'object-properties-section');
    section.expand();
    return html`<devtools-tree .template=${html`
          <style>${ObjectUI.ObjectPropertiesSection.objectValueStyles}</style>
          <style>${ObjectUI.ObjectPropertiesSection.objectPropertiesSectionStyles}</style>
          <ul role="tree">
            <devtools-tree-wrapper .treeElement=${section}></devtools-tree-wrapper>
          </ul>
        `}></devtools-tree>`;
  };

  const createSourceText = (text: string): TemplateResult => html`<div class="payload-value source-code">${text}</div>`;
  const createErrorText = (text: string): TemplateResult =>
      html`<div class="payload-value source-code error-text">${text}</div>`;

  const createException = (
      details: WebMCP.WebMCPModel.ExceptionDetails,
      linkifier: Components.Linkifier.Linkifier = new Components.Linkifier.Linkifier(),
      ): TemplateResult => {
    const renderFrame = (
        frame: StackTrace.ErrorStackParser.ParsedErrorFrame,
        index: number,
        array: StackTrace.ErrorStackParser.ParsedErrorFrame[],
        ): TemplateResult => {
      const newline = index < array.length - 1 ? '\n' : '';
      const {line, link, isCallFrame} = frame;

      if (!isCallFrame) {
        return html`<span>${line}${newline}</span>`;
      }

      if (!link) {
        return html`<span class="formatted-builtin-stack-frame">${line}${newline}</span>`;
      }

      const scriptLocationLink = linkifier.linkifyScriptLocation(
          details.error.runtimeModel().target(),
          link.scriptId || null,
          link.url,
          link.lineNumber,
          {
            columnNumber: link.columnNumber,
            inlineFrameIndex: 0,
            showColumnNumber: true,
          },
      );
      scriptLocationLink.tabIndex = -1;

      return html`<span class="formatted-stack-frame">${link.prefix}${scriptLocationLink}${link.suffix}${
          newline}</span>`;
    };

    return html`
      <div class="payload-value source-code error-text">
        ${details.frames.length === 0 && details.description ? html`<span>${details.description}\n</span>` : nothing}
        <div>${details.frames.map(renderFrame)}</div>
        ${details.cause ? html`\nCaused by:\n${createException(details.cause, linkifier)}` : nothing}</div>`;
  };

  render(
      html`
    <style>${webMCPViewStyles}</style>
    <div class="call-payload-view">
      <div class="call-payload-content">
            ${
          isParsable ? createPayload(input.valueObject) :
                       (input.valueString !== undefined ?
                            createSourceText(input.valueString) :
                            (input.exceptionDetails ? createException(input.exceptionDetails) :
                                                      (input.errorText ? createErrorText(input.errorText) : nothing)))}
      </div>
    </div>
  `,
      target);
};

export class PayloadWidget extends UI.Widget.Widget {
  #valueObject?: unknown;
  #valueString?: string;
  #errorText?: string;
  #exceptionDetailsPromise?: Promise<WebMCP.WebMCPModel.ExceptionDetails|undefined>;
  #exceptionDetails?: WebMCP.WebMCPModel.ExceptionDetails;
  #view: typeof PAYLOAD_DEFAULT_VIEW;

  constructor(element?: HTMLElement, view = PAYLOAD_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set valueObject(valueObject: unknown) {
    this.#valueObject = valueObject;
    this.requestUpdate();
  }

  get valueObject(): unknown {
    return this.#valueObject;
  }

  set valueString(valueString: string|undefined) {
    this.#valueString = valueString;
    this.requestUpdate();
  }

  get valueString(): string|undefined {
    return this.#valueString;
  }

  set errorText(errorText: string|undefined) {
    this.#errorText = errorText;
    this.requestUpdate();
  }

  get errorText(): string|undefined {
    return this.#errorText;
  }

  async #updateExceptionDetails(
      exceptionDetailsPromise: Promise<WebMCP.WebMCPModel.ExceptionDetails|undefined>|undefined): Promise<void> {
    if (this.#exceptionDetailsPromise === exceptionDetailsPromise) {
      return;
    }
    this.#exceptionDetailsPromise = exceptionDetailsPromise;
    this.#exceptionDetails = undefined;
    this.requestUpdate();
    const exceptionDetails = await exceptionDetailsPromise;
    if (this.#exceptionDetailsPromise === exceptionDetailsPromise) {
      this.#exceptionDetails = exceptionDetails;
      this.requestUpdate();
    }
  }

  set exceptionDetails(exceptionDetailsPromise: Promise<WebMCP.WebMCPModel.ExceptionDetails|undefined>|undefined) {
    void this.#updateExceptionDetails(exceptionDetailsPromise);
  }

  get exceptionDetails(): Promise<WebMCP.WebMCPModel.ExceptionDetails|undefined>|undefined {
    return this.#exceptionDetailsPromise;
  }
  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const input: PayloadViewInput = {
      valueObject: this.#valueObject,
      valueString: this.#valueString,
      errorText: this.#errorText,
      exceptionDetails: this.#exceptionDetails,
    };
    this.#view(input, {}, this.contentElement);
  }
}

export interface ToolDetailsViewInput {
  tool: WebMCP.WebMCPModel.Tool|null|undefined;
  origin: SDK.DOMModel.DOMNode|StackTrace.StackTrace.StackTrace|undefined;
  highlightNode: (node: SDK.DOMModel.DOMNode) => void;
  clearHighlight: () => void;
  revealNode: (node: SDK.DOMModel.DOMNode) => void;
}

// clang-format off
const TOOL_DETAILS_VIEW = (input: ToolDetailsViewInput, output: undefined, target: HTMLElement): void => {
  if (!input.tool) {
    render(nothing, target);
    return;
  }
  const tool = input.tool;
  const origin = input.origin;
  render(html`
    <style>${webMCPViewStyles}</style>
    <div class="tool-details-grid">
      <div class="label">Name</div>
      <div class="value source-code">${tool.name}</div>
      <div class="label">Description</div>
      <div class="value">${tool.description}</div>
      ${tool.frame ? html`
      <div class="label">${i18nString(UIStrings.frame)}</div>
      <div class="value">${Components.Linkifier.Linkifier.linkifyRevealable(tool.frame, tool.frame.displayName())}</div>
      ` : nothing}
      ${origin instanceof SDK.DOMModel.DOMNode ? html`
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
            } as NodeText.NodeText.NodeTextData}>
          </devtools-node-text>
        </span>
        <devtools-button class="show-element"
           .title=${i18nString(UIStrings.viewInElementsPanel)}
           aria-label=${i18nString(UIStrings.viewInElementsPanel)}
           .iconName=${'select-element'}
           .jslogContext=${'elements.select-element'}
           .size=${Buttons.Button.Size.SMALL}
           .variant=${Buttons.Button.Variant.ICON}
           @click=${() => input.revealNode(origin)}
           ></devtools-button>
      </div>` : origin ? html`
      <div class="label">Origin</div>
      <div class="value">
        ${widget(Components.JSPresentationUtils.StackTracePreviewContent,
                 {stackTrace: origin, options: { expandable: true}})}
      </div>` : nothing}
    </div>
  `, target);
};
// clang-format on

export class ToolDetailsWidget extends UI.Widget.Widget {
  #tool: WebMCP.WebMCPModel.Tool|null|undefined = null;
  #origin: SDK.DOMModel.DOMNode|StackTrace.StackTrace.StackTrace|undefined;

  #view: typeof TOOL_DETAILS_VIEW;

  constructor(element?: HTMLElement, view: typeof TOOL_DETAILS_VIEW = TOOL_DETAILS_VIEW) {
    super(element);
    this.#view = view;
  }

  set tool(tool: WebMCP.WebMCPModel.Tool|null|undefined) {
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

  async #setToolOrigin(tool: WebMCP.WebMCPModel.Tool): Promise<void> {
    const origin = await (tool.node ? tool.node.resolvePromise() : tool.stackTrace);
    if (this.#tool === tool && origin) {
      this.#origin = origin;
      this.requestUpdate();
    }
  }

  get tool(): WebMCP.WebMCPModel.Tool|null|undefined {
    return this.#tool;
  }

  #highlightNode = (node: SDK.DOMModel.DOMNode): void => {
    node.highlight();
  };

  #clearHighlight = (): void => {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  };

  #revealNode = (node: SDK.DOMModel.DOMNode): void => {
    void Common.Revealer.reveal(node);
    void node.scrollIntoView();
  };

  override performUpdate(): void {
    const viewInput = {
      tool: this.#tool,
      origin: this.#origin,
      highlightNode: this.#highlightNode,
      clearHighlight: this.#clearHighlight,
      revealNode: this.#revealNode,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }
}

export interface ParsedToolSchema {
  parameters: ProtocolMonitor.JSONEditor.Parameter[];
  typesByName: Map<string, ProtocolMonitor.JSONEditor.Parameter[]>;
  enumsByName: Map<string, Record<string, string>>;
}

const parsedSchemaCache = new WeakMap<object, ParsedToolSchema>();

export function parseToolSchema(schema: JSONSchema7): ParsedToolSchema {
  if (typeof schema === 'object' && schema !== null) {
    const cached = parsedSchemaCache.get(schema);
    if (cached) {
      return cached;
    }
  }

  const typesByName = new Map<string, ProtocolMonitor.JSONEditor.Parameter[]>();
  const enumsByName = new Map<string, Record<string, string>>();
  const simpleTypesByName = new Map<string, ProtocolMonitor.JSONEditor.ParameterType>();
  let typeCount = 0;

  function createEnumRecord(values: unknown[]): Record<string, string> {
    const enumRecord: Record<string, string> = {};
    for (const val of values) {
      enumRecord[String(val)] = String(val);
    }
    return enumRecord;
  }

  function preScanDefinition(name: string, def: JSONSchema7Definition): void {
    if (typeof def === 'boolean') {
      return;
    }
    if (def.type === 'string' && def.enum) {
      enumsByName.set(name, createEnumRecord(def.enum));
    } else if (def.type && typeof def.type === 'string' && def.type !== 'object' && def.type !== 'array') {
      let paramType = ProtocolMonitor.JSONEditor.ParameterType.STRING;
      switch (def.type) {
        case 'number':
        case 'integer':
          paramType = ProtocolMonitor.JSONEditor.ParameterType.NUMBER;
          break;
        case 'boolean':
          paramType = ProtocolMonitor.JSONEditor.ParameterType.BOOLEAN;
          break;
      }
      simpleTypesByName.set(name, paramType);
    }
  }

  function parseDefinition(name: string, def: JSONSchema7Definition): void {
    if (typeof def === 'boolean') {
      return;
    }
    if (def.type === 'object' && def.properties) {
      const nestedParams: ProtocolMonitor.JSONEditor.Parameter[] = [];
      for (const [key, value] of Object.entries(def.properties)) {
        const isOpt = !(def.required || []).includes(key);
        nestedParams.push(parseProperty(key, value, isOpt));
      }
      typesByName.set(name, nestedParams);
    }
  }

  // First pass: populate enums and simple types
  if (schema.definitions) {
    for (const [name, def] of Object.entries(schema.definitions)) {
      preScanDefinition(name, def);
    }
  }
  if (schema.$defs) {
    for (const [name, def] of Object.entries(schema.$defs)) {
      preScanDefinition(name, def);
    }
  }

  // Second pass: parse objects
  if (schema.definitions) {
    for (const [name, def] of Object.entries(schema.definitions)) {
      parseDefinition(name, def);
    }
  }
  if (schema.$defs) {
    for (const [name, def] of Object.entries(schema.$defs)) {
      parseDefinition(name, def);
    }
  }

  function parseProperty(
      name: string, propDef: JSONSchema7Definition, optional: boolean): ProtocolMonitor.JSONEditor.Parameter {
    if (typeof propDef === 'boolean') {
      return {
        name,
        optional,
        description: '',
        type: ProtocolMonitor.JSONEditor.ParameterType.STRING,
        isCorrectType: true,
      };
    }
    const prop = propDef;
    if (prop.$ref) {
      const typeRef = prop.$ref.split('/').pop() || '';
      let paramType = ProtocolMonitor.JSONEditor.ParameterType.OBJECT;
      if (enumsByName.has(typeRef)) {
        paramType = ProtocolMonitor.JSONEditor.ParameterType.STRING;
      } else {
        const simpleType = simpleTypesByName.get(typeRef);
        if (simpleType !== undefined) {
          paramType = simpleType;
        }
      }
      return {
        name,
        optional,
        description: prop.description || '',
        type: paramType,
        typeRef,
        isCorrectType: true,
      };
    }

    const typeStr = Array.isArray(prop.type) ? prop.type[0] : prop.type;
    let type: string|undefined = typeStr === 'integer' ? 'number' : typeStr;
    if (!typeStr) {
      if (prop.properties) {
        type = 'object';
      } else if (prop.items) {
        type = 'array';
      } else {
        type = 'unknown';
      }
    }
    const description = prop.description || '';

    let paramType = ProtocolMonitor.JSONEditor.ParameterType.UNKNOWN;
    switch (type) {
      case 'string':
        paramType = ProtocolMonitor.JSONEditor.ParameterType.STRING;
        break;
      case 'number':
        paramType = ProtocolMonitor.JSONEditor.ParameterType.NUMBER;
        break;
      case 'boolean':
        paramType = ProtocolMonitor.JSONEditor.ParameterType.BOOLEAN;
        break;
      case 'object':
        paramType = ProtocolMonitor.JSONEditor.ParameterType.OBJECT;
        break;
      case 'array':
        paramType = ProtocolMonitor.JSONEditor.ParameterType.ARRAY;
        break;
    }

    const base: ProtocolMonitor.JSONEditor.Parameter = {
      name,
      optional,
      description,
      type: paramType,
      isCorrectType: true,
    };

    if (type === 'object') {
      if (prop.properties) {
        const typeRef = `Object_${++typeCount}`;
        const nestedParams: ProtocolMonitor.JSONEditor.Parameter[] = [];
        for (const [key, value] of Object.entries(prop.properties)) {
          const isOpt = !(prop.required || []).includes(key);
          nestedParams.push(parseProperty(key, value, isOpt));
        }
        typesByName.set(typeRef, nestedParams);
        base.typeRef = typeRef;
      } else {
        base.isKeyEditable = true;
      }
    } else if (type === 'array') {
      const items =
          prop.items && !Array.isArray(prop.items) && typeof prop.items !== 'boolean' ? prop.items : undefined;
      if (items) {
        const itemTypeStr = Array.isArray(items.type) ? items.type[0] : items.type;
        if (items.$ref) {
          base.typeRef = items.$ref.split('/').pop() || '';
        } else if (itemTypeStr === 'object' && items.properties) {
          const typeRef = `Object_${++typeCount}`;
          const nestedParams: ProtocolMonitor.JSONEditor.Parameter[] = [];
          for (const [key, value] of Object.entries(items.properties)) {
            const isOpt = !(items.required || []).includes(key);
            nestedParams.push(parseProperty(key, value, isOpt));
          }
          typesByName.set(typeRef, nestedParams);
          base.typeRef = typeRef;
        } else if (itemTypeStr) {
          const itemType = itemTypeStr === 'integer' ? 'number' : itemTypeStr;
          if (itemType === 'string' && items.enum) {
            const typeRef = `Enum_${++typeCount}`;
            enumsByName.set(typeRef, createEnumRecord(items.enum));
            base.typeRef = typeRef;
          } else {
            base.typeRef = itemType as string;
          }
        } else {
          base.typeRef = 'string';
        }
      } else {
        base.typeRef = 'string';
      }
    } else if (type === 'string' && prop.enum) {
      const typeRef = `Enum_${++typeCount}`;
      enumsByName.set(typeRef, createEnumRecord(prop.enum));
      base.typeRef = typeRef;
    }

    return base;
  }

  const parameters: ProtocolMonitor.JSONEditor.Parameter[] = [];
  if ((schema.type === 'object' || !schema.type) && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const isOpt = !(schema.required || []).includes(key);
      parameters.push(parseProperty(key, value, isOpt));
    }
  }

  const result = {parameters, typesByName, enumsByName};
  if (typeof schema === 'object' && schema !== null) {
    parsedSchemaCache.set(schema, result);
  }
  return result;
}
