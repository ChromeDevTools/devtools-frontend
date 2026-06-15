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
import type * as Bindings from '../../models/bindings/bindings.js';
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
import * as Console from '../console/console.js';
import symbolizedErrorWidgetStyles from '../console/symbolizedErrorWidget.css.js';
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
   * @description Context menu action to cancel an in-progress tool call
   */
  cancelCall: 'Cancel',
  /**
   * @description Text for the header of the tool run section
   */
  runTool: 'Run Tool',
  /**
   * @description Context menu action to reveal the tool in the tool list
   */
  revealTool: 'Reveal tool',
  /**
   * @description Context menu action to edit and run the tool
   */
  editAndRun: 'Edit and run',
  /**
   * @description Tooltip for the paste button
   */
  paste: 'Paste',
  /**
   * @description Notice to display when a tool has been unregistered
   */
  toolUnregisteredNotice: 'This tool has been unregistered',
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
    canceled?: boolean,
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
export const enum TabId {
  DETAILS = 'webmcp.tool-details',
  INPUT = 'webmcp.call-inputs',
  OUTPUT = 'webmcp.call-outputs',
}
export interface SelectedTool {
  tool: WebMCP.WebMCPModel.Tool;
  parameters?: Record<string, unknown>;
}
export interface ViewInput {
  tools: WebMCP.WebMCPModel.Tool[];
  selectedTool: SelectedTool|null;
  onToolSelect: (tool: WebMCP.WebMCPModel.Tool|null) => void;
  onRevealTool: (tool: WebMCP.WebMCPModel.Tool, parameters?: Record<string, unknown>) => void;
  selectedCall: WebMCP.WebMCPModel.Call|null;
  selectedTab?: TabId;
  onCallSelect: (call: WebMCP.WebMCPModel.Call|null, tabId?: TabId) => void;
  filters: FilterState;
  filterButtons: FilterMenuButtons;
  onClearLogClick: () => void;
  onFilterChange: (filters: FilterState) => void;
  toolCalls: WebMCP.WebMCPModel.Call[];
  onRunTool: (event: Common.EventTarget.EventTargetEvent<ProtocolMonitor.JSONEditor.Command>) => void;
  onPaste: () => void;
}

export function filterToolCalls(
    toolCalls: WebMCP.WebMCPModel.Call[], filterState: FilterState): WebMCP.WebMCPModel.Call[] {
  let filtered = [...toolCalls];

  const statusTypes = filterState.statusTypes;
  if (statusTypes) {
    filtered = filtered.filter(call => {
      const {completed, error, pending, canceled} = statusTypes;
      if (completed && call.result?.status === Protocol.WebMCP.InvocationStatus.Completed) {
        return true;
      }
      if (error && call.result?.status === Protocol.WebMCP.InvocationStatus.Error) {
        return true;
      }
      if (canceled && call.result?.status === Protocol.WebMCP.InvocationStatus.Canceled) {
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

type ToolStats = Map<Protocol.WebMCP.InvocationStatus|undefined, number>;

function calculateToolStats(calls: WebMCP.WebMCPModel.Call[]):
    {stats: Map<WebMCP.WebMCPModel.Tool, ToolStats>, totals: ToolStats} {
  const stats = new Map<WebMCP.WebMCPModel.Tool, ToolStats>();
  const totals: ToolStats = new Map();

  for (const call of calls) {
    let toolStats = stats.get(call.tool);
    if (!toolStats) {
      toolStats = new Map();
      stats.set(call.tool, toolStats);
    }
    toolStats.set(call.result?.status, (toolStats.get(call.result?.status) ?? 0) + 1);
    totals.set(call.result?.status, (totals.get(call.result?.status) ?? 0) + 1);
  }
  return {totals, stats};
}

function toolStatsIcon(status: Protocol.WebMCP.InvocationStatus|undefined): {iconName: string, iconColor?: string} {
  switch (status) {
    case Protocol.WebMCP.InvocationStatus.Completed:
      return {iconName: 'check-circle', iconColor: 'var(--sys-color-green)'};
    case Protocol.WebMCP.InvocationStatus.Error:
      return {iconName: 'cross-circle-filled', iconColor: 'var(--sys-color-error)'};
    case Protocol.WebMCP.InvocationStatus.Canceled:
      return {iconName: 'record-stop', iconColor: 'var(--sys-color-on-surface-light)'};
    case undefined:
      return {iconName: 'watch'};
  }
}

function getIconGroupsFromStats(toolStats?: ToolStats):
    Array<IconButton.IconButton.IconWithTextData&{status: Protocol.WebMCP.InvocationStatus | undefined}> {
  const status = [
    Protocol.WebMCP.InvocationStatus.Completed, Protocol.WebMCP.InvocationStatus.Error,
    Protocol.WebMCP.InvocationStatus.Canceled, undefined
  ];
  return status
      .map(status => ({
             ...toolStatsIcon(status),
             iconWidth: 'var(--sys-size-8)',
             iconHeight: 'var(--sys-size-8)',
             text: String(toolStats?.get(status) ?? 0),
             status,
           }))
      .filter(({text}) => text !== '0');
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
  let editorWidget: ProtocolMonitor.JSONEditor.JSONEditor|null = null;
  const toolStats = calculateToolStats(input.toolCalls);
  const isFilterActive =
      Boolean(input.filters.text) || Boolean(input.filters.toolTypes) || Boolean(input.filters.statusTypes);
  const iconName = (call: WebMCP.WebMCPModel.Call): string => {
    switch (call.result?.status) {
      case Protocol.WebMCP.InvocationStatus.Error:
        return 'cross-circle-filled';
      case Protocol.WebMCP.InvocationStatus.Canceled:
        return 'record-stop';
      case undefined:
        return 'watch';
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
  const onIconClick = (toolName: string, status: Protocol.WebMCP.InvocationStatus|undefined): void => {
    let statusTypes: FilterState['statusTypes'] = undefined;
    if (status === Protocol.WebMCP.InvocationStatus.Completed) {
      statusTypes = {completed: true};
    } else if (status === Protocol.WebMCP.InvocationStatus.Error) {
      statusTypes = {error: true};
    } else if (status === Protocol.WebMCP.InvocationStatus.Canceled) {
      statusTypes = {canceled: true};
    } else if (status === undefined) {
      statusTypes = {pending: true};
    }
    input.onFilterChange({
      ...input.filters,
      text: toolName,
      statusTypes,
    });
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
                                    @change=${(e: CustomEvent<string>) =>
                                      input.onFilterChange({...input.filters, text: e.detail})}
                                    .value=${input.filters.text}>
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
                    })} @click=${() => input.onCallSelect(call)}
                        @contextmenu=${(e: CustomEvent<UI.ContextMenu.ContextMenu>) => {
                          const contextMenu = e.detail;
                          const isUnregistered = !input.tools.includes(call.tool);
                          contextMenu.defaultSection().appendItem(i18nString(UIStrings.revealTool), () => {
                            input.onRevealTool(call.tool);
                          }, {jslogContext: 'webmcp.reveal-tool', disabled: isUnregistered});
                          contextMenu.defaultSection().appendItem(i18nString(UIStrings.editAndRun), () => {
                            const payload = parsePayload(call.input);
                            input.onRevealTool(call.tool, payload.valueObject as Record<string, unknown> | undefined);
                          }, {jslogContext: 'webmcp.edit-and-run', disabled: isUnregistered});
                          if (call.result === undefined) {
                            contextMenu.defaultSection().appendItem(i18nString(UIStrings.cancelCall), () => {
                              call.cancel();
                            }, {jslogContext: 'webmcp.cancel-call'});
                          }
                        }}>
                      <td @click=${(e: Event) => {
                        e.stopPropagation();
                        input.onCallSelect(call, TabId.DETAILS);
                      }}>
                        <div class="name-cell">
                          <span>${call.tool.name}</span>
                          <button class="run-tool-action-button"
                                  title=${i18nString(UIStrings.editAndRun)}
                                  aria-label=${i18nString(UIStrings.editAndRun)}
                                  @click=${(e: Event) => {
                                    e.stopPropagation();
                                    const payload = parsePayload(call.input);
                                    input.onRevealTool(call.tool,
                                                       payload.valueObject as Record<string, unknown> | undefined);
                                  }}>
                            <devtools-icon name="goto-filled"></devtools-icon>
                          </button>
                        </div>
                      </td>
                      <td @click=${(e: Event) => {
                        e.stopPropagation();
                        input.onCallSelect(call, TabId.OUTPUT);
                      }}>
                        <div class="status-cell">
                          ${iconName(call) ? html`<devtools-icon class="small" name=${iconName(call)}></devtools-icon>`
                                           : ''}
                          <span>${statusString(call)}</span>
                        </div>
                      </td>
                      ${!input.selectedCall ? html`
                        <td @click=${(e: Event) => {
                          e.stopPropagation();
                          input.onCallSelect(call, TabId.INPUT);
                        }}>${call.input}</td>
                        <td @click=${(e: Event) => {
                          e.stopPropagation();
                          input.onCallSelect(call, TabId.OUTPUT);
                        }}>${call.result?.output ? JSON.stringify(call.result.output)
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
                  id=${TabId.DETAILS}
                  ?selected=${input.selectedTab === TabId.DETAILS}
                  title=${i18nString(UIStrings.toolDetails)}
                  ${widget(ToolDetailsWidget, {tool: input.selectedCall?.tool, isUnregistered: input.selectedCall ? !input.tools.includes(input.selectedCall.tool) : false})}>
                </devtools-widget>
                <devtools-widget
                  id=${TabId.INPUT}
                  ?selected=${input.selectedTab === TabId.INPUT}
                  title=${i18nString(UIStrings.input)}
                  ${widget(PayloadWidget, parsePayload(input.selectedCall?.input))}>
                </devtools-widget>
                <devtools-widget
                  id=${TabId.OUTPUT}
                  ?selected=${input.selectedTab === TabId.OUTPUT}
                  title=${i18nString(UIStrings.output)}
                  ${widget(PayloadWidget, {
                          valueObject: input.selectedCall?.result?.output,
                          errorText: input.selectedCall?.result?.errorText,
                          symbolizedError: input.selectedCall?.result?.symbolizedError,
                  })}>
                </devtools-widget>
              </devtools-tabbed-pane>
            </div>
          </devtools-split-view>
          <div class="webmcp-toolbar-container" role="toolbar">
            <devtools-toolbar class="webmcp-toolbar" role="presentation" wrappable>
              <span class="toolbar-text">${i18nString(UIStrings.totalCalls, {PH1: input.toolCalls.length})}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text status-error-text">${
                i18nString(UIStrings.failed,
                           {PH1: toolStats.totals.get(Protocol.WebMCP.InvocationStatus.Error) ?? 0})}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text status-cancelled-text">${
                  i18nString(UIStrings.canceledCount,
                             {PH1: toolStats.totals.get(Protocol.WebMCP.InvocationStatus.Canceled) ?? 0})}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text">${i18nString(UIStrings.inProgressCount,
                                                      {PH1: toolStats.totals.get(undefined) ?? 0})}</span>
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
            <devtools-list class="square-corners">
              ${tools.map(tool => html`
                    <div class=${Directives.classMap({'tool-item': true, selected: tool === input.selectedTool?.tool})}
                         @click=${() => input.onToolSelect(tool)}
                         @contextmenu=${(e: Event) => onToolContextMenu(e, tool)}>
                    <div class="tool-name-container">
                      <div class="tool-name source-code">${tool.name}</div>
                    <div class="tool-icons">
                      ${getIconGroupsFromStats(toolStats.stats.get(tool)).map(group => html`
                        <icon-button
                          .data=${{
                            groups: [group],
                            compact: false,
                            clickHandler: () => onIconClick(tool.name, group.status),
                          } as IconButton.IconButton.IconButtonData}
                          @click=${(e: Event) => e.stopPropagation()}></icon-button>`)}
                    </div>
                    </div>
                    <div class="tool-description">${tool.description}</div>
                </div>`)}
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
              ${widget(ToolDetailsWidget, {tool: input.selectedTool.tool})}
            </div>
            <div class="section-title">
              <span>${i18nString(UIStrings.runTool)}</span>
              <div style="flex: auto;"></div>
              <devtools-button
                .iconName=${'import'}
                .size=${Buttons.Button.Size.SMALL}
                .variant=${Buttons.Button.Variant.TEXT}
                title=${i18nString(UIStrings.paste)}
                @click=${input.onPaste}
              >${i18nString(UIStrings.paste)}</devtools-button>
            </div>
            <devtools-widget
              class="json-editor-widget"
              ${widget(ProtocolMonitor.JSONEditor.JSONEditor, {
                displayTargetSelector: false,
                displayCommandInput: false,
                displayToolbar: false,
                ...getJSONEditorParameters(input.selectedTool.tool),
                commandToDisplay: {
                  command: input.selectedTool.tool.name,
                  parameters: input.selectedTool.parameters || {}
                },
                })}
              ${UI.Widget.widgetRef(ProtocolMonitor.JSONEditor.JSONEditor, e => { editorWidget = e; })}
              @submiteditor=${(e: CustomEvent<ProtocolMonitor.JSONEditor.Command>) => input.onRunTool({data: e.detail})}
            ></devtools-widget>
            <devtools-button
              class="webmcp-run-tool-button"
              .variant=${Buttons.Button.Variant.OUTLINED}
              .size=${Buttons.Button.Size.SMALL}
              jslogContext="webmcp.run-tool"
              @click=${() => {
                if (editorWidget && input.selectedTool) {
                  const params = editorWidget.getParameters();
                  input.onRunTool({
                    data: {
                      command: input.selectedTool.tool.name,
                      parameters: params,
                    } as ProtocolMonitor.JSONEditor.Command
                  });
                }
              }}>Run tool</devtools-button>
          ` : nothing}
        </div>
      </devtools-split-view>
    </devtools-split-view>
  `, target);
  // clang-format on
};

export class WebMCPView extends UI.Widget.VBox {
  readonly #view: View;
  #selectedTool: SelectedTool|null = null;
  #selectedCall: WebMCP.WebMCPModel.Call|null = null;
  #selectedTab: TabId|undefined = undefined;
  #lastDevToolsInvocationId: string|null = null;

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
    const toggle = (key: 'completed'|'error'|'pending'|'canceled'): void => {
      const current = this.#filterState.statusTypes ?? {};
      const next = {...current, [key]: !current[key]};
      let statusTypesToPass: FilterState['statusTypes'] = next;
      if (!next.completed && !next.error && !next.pending && !next.canceled) {
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
        i18nString(UIStrings.canceled), () => toggle('canceled'),
        {checked: this.#filterState.statusTypes?.['canceled'] ?? false, jslogContext: 'webmcp.canceled'});
    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.pending), () => toggle('pending'),
        {checked: this.#filterState.statusTypes?.['pending'] ?? false, jslogContext: 'webmcp.pending'});
  }
  #webMCPModelAdded(model: WebMCP.WebMCPModel.WebMCPModel): void {
    model.addEventListener(WebMCP.WebMCPModel.Events.TOOLS_ADDED, this.requestUpdate, this);
    model.addEventListener(WebMCP.WebMCPModel.Events.TOOLS_REMOVED, this.#toolsRemoved, this);
    model.addEventListener(WebMCP.WebMCPModel.Events.TOOL_INVOKED, this.#toolInvoked, this);
    model.addEventListener(WebMCP.WebMCPModel.Events.TOOL_RESPONDED, this.requestUpdate, this);
  }

  #webMCPModelRemoved(model: WebMCP.WebMCPModel.WebMCPModel): void {
    model.removeEventListener(WebMCP.WebMCPModel.Events.TOOLS_ADDED, this.requestUpdate, this);
    model.removeEventListener(WebMCP.WebMCPModel.Events.TOOLS_REMOVED, this.#toolsRemoved, this);
    model.removeEventListener(WebMCP.WebMCPModel.Events.TOOL_INVOKED, this.#toolInvoked, this);
    model.removeEventListener(WebMCP.WebMCPModel.Events.TOOL_RESPONDED, this.requestUpdate, this);
  }

  #toolInvoked(event: Common.EventTarget.EventTargetEvent<WebMCP.WebMCPModel.Call>): void {
    const call = event.data;
    if (call.invocationId === this.#lastDevToolsInvocationId) {
      this.#selectedCall = call;
      this.#lastDevToolsInvocationId = null;
    }
    this.requestUpdate();
  }

  #toolsRemoved(event: Common.EventTarget.EventTargetEvent<readonly WebMCP.WebMCPModel.Tool[]>): void {
    if (this.#selectedTool && event.data.includes(this.#selectedTool.tool)) {
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
        this.#selectedTool = tool ? {tool} : null;
        this.requestUpdate();
      },
      onRevealTool: (tool, parameters) => {
        this.#selectedTool = {tool, parameters};
        this.requestUpdate();
      },
      selectedCall: this.#selectedCall,
      selectedTab: this.#selectedTab,
      onCallSelect: (call, tabId) => {
        if (call === null) {
          this.#selectedCall = null;
        } else if (this.#selectedCall === null) {
          this.#selectedCall = call;
          this.#selectedTab = tabId;
        } else {
          this.#selectedCall = call;
        }
        this.requestUpdate();
      },
      toolCalls: filteredCalls,
      filters: this.#filterState,
      filterButtons: this.#filterButtons,
      onClearLogClick: this.#handleClearLogClick,
      onFilterChange: this.#handleFilterChange,
      onRunTool: async event => {
        if (this.#selectedTool) {
          this.#selectedTool.parameters = event.data.parameters || {};
          this.#lastDevToolsInvocationId = await this.#selectedTool.tool.invoke(this.#selectedTool.parameters) ?? null;
          if (this.#lastDevToolsInvocationId) {
            const models = SDK.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
            const call =
                models.flatMap(model => model.toolCalls).find(c => c.invocationId === this.#lastDevToolsInvocationId);
            if (call) {
              this.#selectedCall = call;
              this.#lastDevToolsInvocationId = null;
            }
          }
          this.requestUpdate();
        }
      },
      onPaste: async () => {
        try {
          const text = await navigator.clipboard.readText();
          const json = JSON.parse(text);
          if (typeof json !== 'object' || json === null || Array.isArray(json)) {
            throw new Error('Pasted JSON must be an object');
          }
          if (this.#selectedTool) {
            this.#selectedTool.parameters = json as Record<string, unknown>;
            this.requestUpdate();
          }
        } catch {
        }
      },
    };
    this.#view(input, {}, this.contentElement);
    this.#selectedTab = undefined;
  }
}
export interface PayloadViewInput {
  valueObject?: unknown;
  valueString?: string;
  errorText?: string;
  symbolizedError?: Bindings.SymbolizedError.SymbolizedError|null;
}

export const PAYLOAD_DEFAULT_VIEW = (input: PayloadViewInput, output: object, target: HTMLElement): void => {
  if (!input.valueObject && !input.valueString && !input.errorText && !input.symbolizedError) {
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
      error: Bindings.SymbolizedError.SymbolizedError|null,
      ): TemplateResult|typeof nothing => {
    if (!error) {
      return nothing;
    }
    return html`
      <div class="payload-value source-code error-text">
        <devtools-widget
          ${UI.Widget.widget(Console.SymbolizedErrorWidget.SymbolizedErrorWidget, {error})}
        ></devtools-widget>
      </div>
    `;
  };

  render(html`
    <style>${webMCPViewStyles}</style>
    <style>${symbolizedErrorWidgetStyles}</style>
    <div class="call-payload-view">
      <div class="call-payload-content">
            ${
             isParsable ?
                 createPayload(input.valueObject) :
                 (input.valueString !== undefined ?
                      createSourceText(input.valueString) :
                      (input.symbolizedError ? createException(input.symbolizedError) :
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
  #symbolizedErrorPromise?: Promise<Bindings.SymbolizedError.SymbolizedError|null>;
  #symbolizedError?: Bindings.SymbolizedError.SymbolizedError|null;
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

  async #updateSymbolizedError(symbolizedErrorPromise: Promise<Bindings.SymbolizedError.SymbolizedError|null>|
                               undefined): Promise<void> {
    if (this.#symbolizedErrorPromise === symbolizedErrorPromise) {
      return;
    }
    this.#symbolizedErrorPromise = symbolizedErrorPromise;
    this.#symbolizedError = undefined;
    this.requestUpdate();
    const symbolizedError = await symbolizedErrorPromise;
    if (this.#symbolizedErrorPromise === symbolizedErrorPromise) {
      this.#symbolizedError = symbolizedError || null;
      this.requestUpdate();
    }
  }

  set symbolizedError(symbolizedErrorPromise: Promise<Bindings.SymbolizedError.SymbolizedError|null>|undefined) {
    void this.#updateSymbolizedError(symbolizedErrorPromise);
  }

  get symbolizedError(): Promise<Bindings.SymbolizedError.SymbolizedError|null>|undefined {
    return this.#symbolizedErrorPromise;
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
      symbolizedError: this.#symbolizedError,
    };
    this.#view(input, {}, this.contentElement);
  }
}

export interface ToolDetailsViewInput {
  tool: WebMCP.WebMCPModel.Tool|null|undefined;
  isUnregistered?: boolean;
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
      <div class="value stack-trace">
        ${widget(Components.JSPresentationUtils.StackTracePreviewContent,
                 {stackTrace: origin, options: { expandable: true}})}
      </div>` : nothing}
    </div>
    ${input.isUnregistered ? html`
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation">
            <devtools-icon class="inline-icon medium" name="warning-filled"></devtools-icon>
            ${i18nString(UIStrings.toolUnregisteredNotice)}
          </div>
        </div>
      </div>
    ` : nothing}
  `, target);
};
// clang-format on

export class ToolDetailsWidget extends UI.Widget.Widget {
  #tool: WebMCP.WebMCPModel.Tool|null|undefined = null;
  #origin: SDK.DOMModel.DOMNode|StackTrace.StackTrace.StackTrace|undefined;
  #isUnregistered = false;

  #view: typeof TOOL_DETAILS_VIEW;

  constructor(element?: HTMLElement, view: typeof TOOL_DETAILS_VIEW = TOOL_DETAILS_VIEW) {
    super(element);
    this.#view = view;
  }

  set isUnregistered(isUnregistered: boolean) {
    if (this.#isUnregistered === isUnregistered) {
      return;
    }
    this.#isUnregistered = isUnregistered;
    this.requestUpdate();
  }

  get isUnregistered(): boolean {
    return this.#isUnregistered;
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
      isUnregistered: this.#isUnregistered,
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
