// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/lists/lists.js';
import '../../ui/legacy/legacy.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {
  html,
  render,
} from '../../ui/lit/lit.js';
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
   * @description Filter option for success status
   */
  success: 'Success',
  /**
   * @description Filter option for error status
   */
  error: 'Error',
  /**
   * @description Filter option for pending status
   */
  pending: 'Pending',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/WebMCPView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface FilterState {
  text: string;
  toolTypes?: {
    imperative?: boolean,
    declarative?: boolean,
  };
  statusTypes?: {
    success?: boolean,
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
  tools: Protocol.WebMCP.Tool[];
  filters: FilterState;
  filterButtons: FilterMenuButtons;
  onClearLogClick: () => void;
  onFilterChange: (filters: FilterState) => void;
}

export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const tools = input.tools;
  const isFilterActive =
      Boolean(input.filters.text) || Boolean(input.filters.toolTypes) || Boolean(input.filters.statusTypes);
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
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {header: i18nString(UIStrings.noCallsPlaceholderTitle),
                                                        text: i18nString(UIStrings.noCallsPlaceholder)})}
      </div>
      <div slot="sidebar" class="tool-list">
        <div class="section-title">${i18nString(UIStrings.toolRegistry)}</div>
        ${tools.length === 0 ? html`
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {header: i18nString(UIStrings.noToolsPlaceholderTitle),
                                                        text: i18nString(UIStrings.noToolsPlaceholder)})}
        ` : html`
          <devtools-list>
            ${tools.map(tool => html`
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
  readonly #view: View;

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
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.WebMCPModel.WebMCPModel, {
      modelAdded: (model: SDK.WebMCPModel.WebMCPModel) => this.#webMCPModelAdded(model),
      modelRemoved: (model: SDK.WebMCPModel.WebMCPModel) => this.#webMCPModelRemoved(model),
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
    const toggle = (key: 'success'|'error'|'pending'): void => {
      const current = this.#filterState.statusTypes ?? {};
      const next = {...current, [key]: !current[key]};
      let statusTypesToPass: FilterState['statusTypes'] = next;
      if (!next.success && !next.error && !next.pending) {
        statusTypesToPass = undefined;
      }
      this.#handleFilterChange({...this.#filterState, statusTypes: statusTypesToPass});
    };

    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.success), () => toggle('success'),
        {checked: this.#filterState.statusTypes?.['success'] ?? false, jslogContext: 'webmcp.success'});
    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.error), () => toggle('error'),
        {checked: this.#filterState.statusTypes?.['error'] ?? false, jslogContext: 'webmcp.error'});
    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.pending), () => toggle('pending'),
        {checked: this.#filterState.statusTypes?.['pending'] ?? false, jslogContext: 'webmcp.pending'});
  }

  #webMCPModelAdded(model: SDK.WebMCPModel.WebMCPModel): void {
    model.addEventListener(SDK.WebMCPModel.Events.TOOLS_ADDED, this.requestUpdate, this);
    model.addEventListener(SDK.WebMCPModel.Events.TOOLS_REMOVED, this.requestUpdate, this);
  }

  #webMCPModelRemoved(model: SDK.WebMCPModel.WebMCPModel): void {
    model.removeEventListener(SDK.WebMCPModel.Events.TOOLS_ADDED, this.requestUpdate, this);
    model.removeEventListener(SDK.WebMCPModel.Events.TOOLS_REMOVED, this.requestUpdate, this);
  }

  #handleClearLogClick = (): void => {
    // Clear log logic
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

  #getTools(): Protocol.WebMCP.Tool[] {
    const models = SDK.TargetManager.TargetManager.instance().models(SDK.WebMCPModel.WebMCPModel);
    const tools = models.flatMap(model => model.tools.toArray());
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }
  override performUpdate(): void {
    const input: ViewInput = {
      tools: this.#getTools(),
      filters: this.#filterState,
      filterButtons: this.#filterButtons,
      onClearLogClick: this.#handleClearLogClick,
      onFilterChange: this.#handleFilterChange,
    };
    this.#view(input, {}, this.contentElement);
  }
}
