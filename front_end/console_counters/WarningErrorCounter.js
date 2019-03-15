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

    const countersWrapper = createElement('div');
    this._toolbarItem = new UI.ToolbarItem(countersWrapper);

    this._counter = createElement('div');
    this._counter.addEventListener('click', Common.console.show.bind(Common.console), false);
    const shadowRoot = UI.createShadowRootWithCoreStyles(this._counter, 'console_counters/errorWarningCounter.css');
    countersWrapper.appendChild(this._counter);

    this._violationCounter = createElement('div');
    this._violationCounter.addEventListener('click', () => {
      UI.viewManager.showView('audits2');
    });
    const violationShadowRoot =
        UI.createShadowRootWithCoreStyles(this._violationCounter, 'console_counters/errorWarningCounter.css');
    if (Runtime.experiments.isEnabled('spotlight'))
      countersWrapper.appendChild(this._violationCounter);


    this._errors = this._createItem(shadowRoot, 'smallicon-error');
    this._warnings = this._createItem(shadowRoot, 'smallicon-warning');
    if (Runtime.experiments.isEnabled('spotlight'))
      this._violations = this._createItem(violationShadowRoot, 'smallicon-info');
    this._titles = [];
    this._errorCount = -1;
    this._warningCount = -1;
    this._violationCount = -1;
    this._throttler = new Common.Throttler(100);

    SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.ConsoleCleared, this._update, this);
    SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.MessageAdded, this._update, this);
    SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.MessageUpdated, this._update, this);
    this._update();
  }

  _updatedForTest() {
    // Sniffed in tests.
  }

  /**
   * @param {!Node} shadowRoot
   * @param {string} iconType
   * @return {!{item: !Element, text: !Element}}
   */
  _createItem(shadowRoot, iconType) {
    const item = createElementWithClass('span', 'counter-item');
    const icon = item.createChild('span', '', 'dt-icon-label');
    icon.type = iconType;
    const text = icon.createChild('span');
    shadowRoot.appendChild(item);
    return {item: item, text: text};
  }

  /**
   * @param {!{item: !Element, text: !Element}} item
   * @param {number} count
   * @param {boolean} first
   */
  _updateItem(item, count, first) {
    item.item.classList.toggle('hidden', !count);
    item.item.classList.toggle('counter-item-first', first);
    item.text.textContent = count;
  }

  _update() {
    this._updatingForTest = true;
    this._throttler.schedule(this._updateThrottled.bind(this));
  }

  /**
   * @return {!Promise}
   */
  _updateThrottled() {
    const errors = SDK.consoleModel.errors();
    const warnings = SDK.consoleModel.warnings();
    const violations = SDK.consoleModel.violations();
    if (errors === this._errorCount && warnings === this._warningCount && violations === this._violationCount)
      return Promise.resolve();
    this._errorCount = errors;
    this._warningCount = warnings;
    this._violationCount = violations;

    this._titles = [];
    this._counter.classList.toggle('hidden', !(errors || warnings));
    this._violationCounter.classList.toggle('hidden', !violations);
    this._toolbarItem.setVisible(!!(errors || warnings || violations));

    let errorCountTitle = '';
    if (errors === 1)
      errorCountTitle = ls`${errors} error`;
    else
      errorCountTitle = ls`${errors} errors`;
    this._updateItem(this._errors, errors, false);
    if (errors)
      this._titles.push(errorCountTitle);

    let warningCountTitle = '';
    if (warnings === 1)
      warningCountTitle = ls`${warnings} warning`;
    else
      warningCountTitle = ls`${warnings} warnings`;
    this._updateItem(this._warnings, warnings, !errors);
    if (warnings)
      this._titles.push(warningCountTitle);

    if (Runtime.experiments.isEnabled('spotlight')) {
      let violationCountTitle = '';
      if (violations === 1)
        violationCountTitle = ls`${violations} violation`;
      else
        violationCountTitle = ls`${violations} violations`;
      this._updateItem(this._violations, violations, true);
      this._violationCounter.title = violationCountTitle;
    }

    this._counter.title = this._titles.join(', ');
    UI.inspectorView.toolbarItemResized();
    this._updatingForTest = false;
    this._updatedForTest();
    return Promise.resolve();
  }

  /**
   * @override
   * @return {?UI.ToolbarItem}
   */
  item() {
    return this._toolbarItem;
  }
};
