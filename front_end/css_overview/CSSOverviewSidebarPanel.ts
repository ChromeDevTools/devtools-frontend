// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Label for the 'Clear overview' button in the CSS Overview report
  */
  clearOverview: 'Clear overview',
};
const str_ = i18n.i18n.registerUIStrings('css_overview/CSSOverviewSidebarPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CSSOverviewSidebarPanel extends UI.Widget.VBox {
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

    this.registerRequiredCSS('css_overview/cssOverviewSidebarPanel.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('overview-sidebar-panel');
    this.contentElement.addEventListener('click', this._onItemClick.bind(this));

    // Clear overview.
    const clearResultsButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearOverview), 'largeicon-clear');
    clearResultsButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._reset, this);

    // Toolbar.
    const toolbarElement = this.contentElement.createChild('div', 'overview-toolbar');
    const toolbar = new UI.Toolbar.Toolbar('', toolbarElement);
    toolbar.appendToolbarItem(clearResultsButton);
  }

  addItem(name: string, id: string): void {
    const item = this.contentElement.createChild('div', CSSOverviewSidebarPanel.ITEM_CLASS_NAME);
    item.textContent = name;
    item.dataset.id = id;
  }

  _reset(): void {
    this.dispatchEventToListeners(SidebarEvents.Reset);
  }

  _deselectAllItems(): void {
    const items = this.contentElement.querySelectorAll(`.${CSSOverviewSidebarPanel.ITEM_CLASS_NAME}`);
    items.forEach(item => {
      item.classList.remove(CSSOverviewSidebarPanel.SELECTED);
    });
  }

  _onItemClick(event: Event): void {
    const target = (event.composedPath()[0] as HTMLElement);
    if (!target.classList.contains(CSSOverviewSidebarPanel.ITEM_CLASS_NAME)) {
      return;
    }

    const {id} = target.dataset;
    if (!id) {
      return;
    }
    this.select(id);
    this.dispatchEventToListeners(SidebarEvents.ItemSelected, id);
  }

  select(id: string): void {
    const target = this.contentElement.querySelector(`[data-id=${CSS.escape(id)}]`);
    if (!target) {
      return;
    }

    if (target.classList.contains(CSSOverviewSidebarPanel.SELECTED)) {
      return;
    }

    this._deselectAllItems();
    target.classList.add(CSSOverviewSidebarPanel.SELECTED);
  }
}

export const enum SidebarEvents {
  ItemSelected = 'ItemSelected',
  Reset = 'Reset',
}
