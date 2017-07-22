// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ToolbarItem.Provider}
 * @unrestricted
 */
ConsoleCounters.WarningErrorCounter = class {
  constructor() {
    ConsoleCounters.WarningErrorCounter._instanceForTest = this;

    this._counter = createElement('div');
    this._counter.addEventListener('click', Common.console.show.bind(Common.console), false);
    this._toolbarItem = new UI.ToolbarItem(this._counter);
    var shadowRoot = UI.createShadowRootWithCoreStyles(this._counter, 'console_counters/errorWarningCounter.css');

    this._errors = this._createItem(shadowRoot, 'smallicon-error');
    this._warnings = this._createItem(shadowRoot, 'smallicon-warning');
    this._titles = [];

    ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.ConsoleCleared, this._update, this);
    ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.MessageAdded, this._update, this);
    ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.MessageUpdated, this._update, this);
    this._update();
  }

  /**
   * @param {!Node} shadowRoot
   * @param {string} iconType
   * @return {!{item: !Element, text: !Element}}
   */
  _createItem(shadowRoot, iconType) {
    var item = createElementWithClass('span', 'counter-item');
    var icon = item.createChild('label', '', 'dt-icon-label');
    icon.type = iconType;
    var text = icon.createChild('span');
    shadowRoot.appendChild(item);
    return {item: item, text: text};
  }

  /**
   * @param {!{item: !Element, text: !Element}} item
   * @param {number} count
   * @param {boolean} first
   * @param {string} title
   */
  _updateItem(item, count, first, title) {
    item.item.classList.toggle('hidden', !count);
    item.item.classList.toggle('counter-item-first', first);
    item.text.textContent = count;
    if (count)
      this._titles.push(title);
  }

  _update() {
    var errors = ConsoleModel.consoleModel.errors();
    var warnings = ConsoleModel.consoleModel.warnings();

    this._titles = [];
    this._toolbarItem.setVisible(!!(errors || warnings));
    this._updateItem(this._errors, errors, false, Common.UIString(errors === 1 ? '%d error' : '%d errors', errors));
    this._updateItem(
        this._warnings, warnings, !errors, Common.UIString(warnings === 1 ? '%d warning' : '%d warnings', warnings));
    this._counter.title = this._titles.join(', ');
    UI.inspectorView.toolbarItemResized();
  }

  /**
   * @override
   * @return {?UI.ToolbarItem}
   */
  item() {
    return this._toolbarItem;
  }
};