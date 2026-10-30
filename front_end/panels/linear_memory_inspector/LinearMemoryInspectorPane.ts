// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type {LazyUint8Array} from './LinearMemoryInspectorController.js';
import {LinearMemoryInspectorView} from './LinearMemoryInspectorView.js';

const {repeat} = Directives;
const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Label in the Memory inspector panel that serves as a placeholder if no inspections are open (i.e., nothing to see here).
   *             Inspection here refers to viewing, navigating, and understanding the memory through this panel.
   */
  noOpenInspections: 'No open inspections',
  /**
   * @description Label in the Memory inspector panel that serves as a placeholder if no inspections are open (i.e., nothing to see here).
   *             Inspection here refers to viewing, navigating, and understanding the memory through this panel.
   */
  memoryInspectorExplanation: 'On this page you can inspect binary data',
  /**
   * @description Label in the Memory inspector panel for a link.
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/LinearMemoryInspectorPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let inspectorInstance: LinearMemoryInspectorPane;

const MEMORY_INSPECTOR_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/memory-inspector' as Platform.DevToolsPath.UrlString;

export interface TabData {
  tabId: string;
  title: string;
  memoryWrapper: LazyUint8Array;
  address: number;
  refreshSequence: number;
}

export interface ViewInput {
  tabs: TabData[];
  selectedTabId?: string;
  onTabClosed: (tabId: string) => void;
  onTabSelected: (tabId: string) => void;
  onAddressChanged: (tabId: string, address: number) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function renderPlaceholder(): LitTemplate {
  // clang-format off
  return html`
    <div class="empty-state">
      <span class="empty-state-header">${i18nString(UIStrings.noOpenInspections)}</span>
      <div class="empty-state-description">
        <span>${i18nString(UIStrings.memoryInspectorExplanation)}</span>
        <devtools-link
          class="devtools-link"
          href=${MEMORY_INSPECTOR_EXPLANATION_URL}
          jslogcontext="learn-more"
        >${i18nString(UIStrings.learnMore)}</devtools-link>
      </div>
    </div>`;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <devtools-tabbed-pane
      .closeableTabs=${true}
      .allowTabReorder=${true}
      .automaticReorder=${true}
      .placeholder=${renderPlaceholder()}
      .headerJslog=${`${VisualLogging.toolbar().track({keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space'})}`}
      @close=${(event: CustomEvent<{tabId: string}>) => input.onTabClosed(event.detail.tabId)}
      @select=${(event: CustomEvent<{tabId: string}>) => input.onTabSelected(event.detail.tabId)}
    >
      ${repeat(input.tabs, tab => tab.tabId, tab => html`
        <devtools-widget
          id=${tab.tabId}
          label=${tab.title}
          ?closeable=${true}
          ?selected=${tab.tabId === input.selectedTabId}
          ${widget(LinearMemoryInspectorView, {
            tabId: tab.tabId,
            address: tab.address,
            memoryWrapper: tab.memoryWrapper,
            refreshSequence: tab.refreshSequence,
            onAddressChanged: input.onAddressChanged,
          })}
        ></devtools-widget>
      `)}
    </devtools-tabbed-pane>
  `, target, {
    container: {
      attributes: {
        jslog: `${VisualLogging.panel('linear-memory-inspector').track({resize: true})}`,
      },
    },
  });
  // clang-format on
  target.querySelector<UI.TabbedPane.TabbedPaneElement>('devtools-tabbed-pane')?.tabs;
};

const LinearMemoryInspectorPaneBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class LinearMemoryInspectorPane extends LinearMemoryInspectorPaneBase {
  readonly #view: View;
  readonly #tabs = new Map<string, TabData>();
  #selectedTabId?: string;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  static instance(): LinearMemoryInspectorPane {
    if (!inspectorInstance) {
      inspectorInstance = new LinearMemoryInspectorPane();
    }
    return inspectorInstance;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      tabs: Array.from(this.#tabs.values()),
      selectedTabId: this.#selectedTabId,
      onTabClosed: this.#onTabClosed,
      onTabSelected: this.#onTabSelected,
      onAddressChanged: this.#onAddressChanged,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  #getTab(tabId: string): TabData {
    const tab = this.#tabs.get(tabId);
    if (!tab) {
      throw new Error(`No linear memory inspector view for the given tab id: ${tabId}`);
    }
    return tab;
  }

  create(tabId: string, title: string, arrayWrapper: LazyUint8Array, address = 0): void {
    if (address < 0 || arrayWrapper.length() === 0 || address >= arrayWrapper.length()) {
      throw new Error('Requested address is out of bounds.');
    }
    this.#tabs.set(tabId, {
      tabId,
      title,
      memoryWrapper: arrayWrapper,
      address,
      refreshSequence: 0,
    });
    this.#selectedTabId = tabId;
    this.requestUpdate();
  }

  close(tabId: string): void {
    this.#onTabClosed(tabId);
  }

  reveal(tabId: string, address?: number): void {
    const tab = this.#getTab(tabId);

    if (address !== undefined) {
      if (address < 0 || address >= tab.memoryWrapper.length()) {
        throw new Error('Requested address is out of bounds.');
      }
      this.#tabs.set(tabId, {...tab, address});
    }
    this.refreshView(tabId);
    this.#selectedTabId = tabId;
    this.requestUpdate();
  }

  refreshView(tabId: string): void {
    const tab = this.#getTab(tabId);
    this.#tabs.set(tabId, {...tab, refreshSequence: tab.refreshSequence + 1});
    this.requestUpdate();
  }

  #onTabClosed = (tabId: string): void => {
    if (!this.#tabs.has(tabId)) {
      return;
    }
    this.#tabs.delete(tabId);
    if (this.#selectedTabId === tabId) {
      this.#selectedTabId = this.#tabs.keys().next().value;
    }
    this.dispatchEventToListeners(Events.VIEW_CLOSED, tabId);
    this.requestUpdate();
  };

  #onTabSelected = (tabId: string): void => {
    if (!tabId || !this.#tabs.has(tabId) || this.#selectedTabId === tabId) {
      return;
    }
    this.#selectedTabId = tabId;
    this.requestUpdate();
  };

  #onAddressChanged = (tabId: string, address: number): void => {
    const tab = this.#tabs.get(tabId);
    if (!tab || tab.address === address) {
      return;
    }
    this.#tabs.set(tabId, {...tab, address});
    this.requestUpdate();
  };
}

export const enum Events {
  VIEW_CLOSED = 'ViewClosed',
}

export interface EventTypes {
  [Events.VIEW_CLOSED]: string;
}
