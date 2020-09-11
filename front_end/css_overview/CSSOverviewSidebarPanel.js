// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';

export class CSSOverviewSidebarPanel extends UI.Widget.VBox {
  static get ITEM_CLASS_NAME() {
    return 'overview-sidebar-panel-item';
  }

  static get SELECTED() {
    return 'selected';
  }

  constructor() {
    super(true);

    this.registerRequiredCSS('css_overview/cssOverviewSidebarPanel.css');
    this.contentElement.classList.add('overview-sidebar-panel');
    this.contentElement.addEventListener('click', this._onItemClick.bind(this));

    // Clear overview.
    const clearResultsButton = new UI.Toolbar.ToolbarButton(ls`Clear overview`, 'largeicon-clear');
    clearResultsButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._reset, this);

    // Toolbar.
    const toolbarElement = this.contentElement.createChild('div', 'overview-toolbar');
    const toolbar = new UI.Toolbar.Toolbar('', toolbarElement);
    toolbar.appendToolbarItem(clearResultsButton);
  }


  /**
   * @param {string} name
   * @param {string} id
   */
  addItem(name, id) {
    const item = this.contentElement.createChild('div', CSSOverviewSidebarPanel.ITEM_CLASS_NAME);
    item.textContent = name;
    item.dataset.id = id;
  }

  _reset() {
    this.dispatchEventToListeners(SidebarEvents.Reset);
  }

  _deselectAllItems() {
    const items = this.contentElement.querySelectorAll(`.${CSSOverviewSidebarPanel.ITEM_CLASS_NAME}`);
    items.forEach(item => {
      item.classList.remove(CSSOverviewSidebarPanel.SELECTED);
    });
  }

  /** @param {!Event} event */
  _onItemClick(event) {
    const target = /** @type {!HTMLElement} */ (event.composedPath()[0]);
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

  /**
   * @param {string} id
   */
  select(id) {
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

export const SidebarEvents = {
  ItemSelected: Symbol('ItemSelected'),
  Reset: Symbol('Reset')
};
