// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import cssOverviewSidebarPanelStyles from './cssOverviewSidebarPanel.css.js';

const UIStrings = {
  /**
   *@description Label for the 'Clear overview' button in the CSS Overview report
   */
  clearOverview: 'Clear overview',
};
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/CSSOverviewSidebarPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CSSOverviewSidebarPanel extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  containerElement: HTMLDivElement;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static get ITEM_CLASS_NAME(): string {
    return 'overview-sidebar-panel-item';
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static get SELECTED(): string {
    return 'selected';
  }

  constructor() {
    super(true);

    this.contentElement.classList.add('overview-sidebar-panel');
    this.contentElement.addEventListener('click', this.#onItemClick.bind(this));
    this.contentElement.addEventListener('keydown', this.#onItemKeyDown.bind(this));

    // We need a container so that each item covers the full width of the
    // longest item, so that the selected item's background expands fully
    // even when the sidebar overflows.
    // Also see crbug/1408003
    this.containerElement =
        this.contentElement.createChild('div', 'overview-sidebar-panel-container') as HTMLDivElement;

    // Clear overview.
    const clearResultsButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearOverview), 'largeicon-clear');
    clearResultsButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.#reset, this);

    // Toolbar.
    const toolbarElement = this.containerElement.createChild('div', 'overview-toolbar');
    const toolbar = new UI.Toolbar.Toolbar('', toolbarElement);
    toolbar.appendToolbarItem(clearResultsButton);
  }

  addItem(name: string, id: string): void {
    const item = this.containerElement.createChild('div', CSSOverviewSidebarPanel.ITEM_CLASS_NAME);
    item.textContent = name;
    item.dataset.id = id;
    item.tabIndex = 0;
  }

  #reset(): void {
    this.dispatchEventToListeners(SidebarEvents.Reset);
  }

  #deselectAllItems(): void {
    const items = this.containerElement.querySelectorAll(`.${CSSOverviewSidebarPanel.ITEM_CLASS_NAME}`);
    items.forEach(item => {
      item.classList.remove(CSSOverviewSidebarPanel.SELECTED);
    });
  }

  #onItemClick(event: Event): void {
    const target = (event.composedPath()[0] as HTMLElement);
    if (!target.classList.contains(CSSOverviewSidebarPanel.ITEM_CLASS_NAME)) {
      return;
    }

    const {id} = target.dataset;
    if (!id) {
      return;
    }
    this.select(id);
    this.dispatchEventToListeners(SidebarEvents.ItemSelected, {id, isMouseEvent: true});
  }

  #onItemKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    const target = (event.composedPath()[0] as HTMLElement);
    if (!target.classList.contains(CSSOverviewSidebarPanel.ITEM_CLASS_NAME)) {
      return;
    }

    const {id} = target.dataset;
    if (!id) {
      return;
    }
    this.select(id);
    this.dispatchEventToListeners(SidebarEvents.ItemSelected, {id, isMouseEvent: false});
    event.consume(true);
  }

  select(id: string): void {
    const target = this.containerElement.querySelector(`[data-id=${CSS.escape(id)}]`);
    if (!target) {
      return;
    }

    if (target.classList.contains(CSSOverviewSidebarPanel.SELECTED)) {
      return;
    }

    this.#deselectAllItems();
    target.classList.add(CSSOverviewSidebarPanel.SELECTED);
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([cssOverviewSidebarPanelStyles]);
  }
}

export const enum SidebarEvents {
  ItemSelected = 'ItemSelected',
  Reset = 'Reset',
}

export interface ItemSelectedEvent {
  id: string;
  isMouseEvent: boolean;
}

export type EventTypes = {
  [SidebarEvents.ItemSelected]: ItemSelectedEvent,
  [SidebarEvents.Reset]: void,
};
