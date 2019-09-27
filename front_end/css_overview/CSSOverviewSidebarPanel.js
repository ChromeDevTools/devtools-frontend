// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

CssOverview.CSSOverviewSidebarPanel = class extends UI.VBox {
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
    const clearResultsButton = new UI.ToolbarButton(ls`Clear overview`, 'largeicon-clear');
    clearResultsButton.addEventListener(UI.ToolbarButton.Events.Click, this._reset, this);

    // Toolbar.
    const toolbarElement = this.contentElement.createChild('div', 'overview-toolbar');
    const toolbar = new UI.Toolbar('', toolbarElement);
    toolbar.appendToolbarItem(clearResultsButton);
  }

  addItem(name, id) {
    const item = this.contentElement.createChild('div', CssOverview.CSSOverviewSidebarPanel.ITEM_CLASS_NAME);
    item.textContent = name;
    item.dataset.id = id;
  }

  _reset() {
    this.dispatchEventToListeners(CssOverview.SidebarEvents.Reset);
  }

  _deselectAllItems() {
    const items = this.contentElement.querySelectorAll(`.${CssOverview.CSSOverviewSidebarPanel.ITEM_CLASS_NAME}`);
    for (const item of items)
      item.classList.remove(CssOverview.CSSOverviewSidebarPanel.SELECTED);
  }

  _onItemClick(event) {
    const target = event.path[0];
    if (!target.classList.contains(CssOverview.CSSOverviewSidebarPanel.ITEM_CLASS_NAME))
      return;

    const {id} = target.dataset;
    this.select(id);
    this.dispatchEventToListeners(CssOverview.SidebarEvents.ItemSelected, id);
  }

  select(id) {
    const target = this.contentElement.querySelector(`[data-id=${CSS.escape(id)}]`);
    if (!target)
      return;

    if (target.classList.contains(CssOverview.CSSOverviewSidebarPanel.SELECTED))
      return;

    this._deselectAllItems();
    target.classList.add(CssOverview.CSSOverviewSidebarPanel.SELECTED);
  }
};

CssOverview.SidebarEvents = {
  ItemSelected: Symbol('ItemSelected'),
  Reset: Symbol('Reset')
};
