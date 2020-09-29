// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.Toolbar.Provider}
 * @unrestricted
 */
export class WarningErrorCounter {
  constructor() {
    WarningErrorCounter._instanceForTest = this;

    const countersWrapper = document.createElement('div');
    this._toolbarItem = new UI.Toolbar.ToolbarItem(countersWrapper);
    this._toolbarItem.setVisible(false);

    /**
     * @param {!Element} parent
     * @param {function():void} delegate
     * @return {!Element}
     */
    function createCounter(parent, delegate) {
      const container = parent.createChild('div');
      const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(container, 'console_counters/errorWarningCounter.css');
      const button = shadowRoot.createChild('button');
      button.classList.add('hidden');
      button.addEventListener('click', delegate, false);
      return button;
    }

    this._consoleCounter =
        createCounter(countersWrapper, Common.Console.Console.instance().show.bind(Common.Console.Console.instance()));

    this._violationCounter = null;
    if (Root.Runtime.experiments.isEnabled('spotlight')) {
      this._violationCounter = createCounter(countersWrapper, () => {
        UI.ViewManager.ViewManager.instance().showView('lighthouse');
      });
    }

    this._issuesCounter = createCounter(countersWrapper, () => {
      Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.StatusBarIssuesCounter);
      UI.ViewManager.ViewManager.instance().showView('issues-pane');
    });

    this._errors = this._createItem(this._consoleCounter, 'smallicon-error');
    this._warnings = this._createItem(this._consoleCounter, 'smallicon-warning');
    if (this._violationCounter) {
      this._violations = this._createItem(this._violationCounter, 'smallicon-info');
    }
    this._issues = this._createItem(this._issuesCounter, 'smallicon-issue-blue-text');
    this._titles = '';
    /** @type {number} */
    this._errorCount = -1;
    /** @type {number} */
    this._warningCount = -1;
    /** @type {number} */
    this._violationCount = -1;
    /** @type {number} */
    this._issuesCount = -1;
    this._throttler = new Common.Throttler.Throttler(100);

    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.ConsoleCleared, this._update, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(SDK.ConsoleModel.Events.MessageAdded, this._update, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.MessageUpdated, this._update, this);

    BrowserSDK.IssuesManager.IssuesManager.instance().addEventListener(
        BrowserSDK.IssuesManager.Events.IssuesCountUpdated, this._update, this);

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
    const item = document.createElement('span');
    item.classList.add('counter-item');
    UI.ARIAUtils.markAsHidden(item);
    const icon = /** @type {!UI.UIUtils.DevToolsIconLabel} */ (item.createChild('span', '', 'dt-icon-label'));
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
    item.text.textContent = String(count);
  }

  _update() {
    this._updatingForTest = true;
    this._throttler.schedule(this._updateThrottled.bind(this));
  }

  /**
   * @return {!Promise<void>}
   */
  _updateThrottled() {
    const errors = SDK.ConsoleModel.ConsoleModel.instance().errors();
    const warnings = SDK.ConsoleModel.ConsoleModel.instance().warnings();
    const violations = this._violationCounter ? SDK.ConsoleModel.ConsoleModel.instance().violations() : 0;
    const issues = BrowserSDK.IssuesManager.IssuesManager.instance().numberOfIssues();
    if (errors === this._errorCount && warnings === this._warningCount && violations === this._violationCount &&
        issues === this._issuesCount) {
      return Promise.resolve();
    }
    this._errorCount = errors;
    this._warningCount = warnings;
    this._violationCount = violations;
    this._issuesCount = issues;

    this._consoleCounter.classList.toggle('hidden', !(errors || warnings));
    if (this._violationCounter) {
      this._violationCounter.classList.toggle('hidden', !violations);
    }
    this._issuesCounter.classList.toggle('hidden', !issues);
    this._toolbarItem.setVisible(!!(errors || warnings || violations || issues));

    /* Update consoleCounter items. */
    let errorCountTitle = '';
    if (errors === 1) {
      errorCountTitle = ls`${errors} error`;
    } else {
      errorCountTitle = ls`${errors} errors`;
    }
    this._updateItem(this._errors, errors, true);

    let warningCountTitle = '';
    if (warnings === 1) {
      warningCountTitle = ls`${warnings} warning`;
    } else {
      warningCountTitle = ls`${warnings} warnings`;
    }
    this._updateItem(this._warnings, warnings, !errors);

    let consoleSummary = '';
    if (errors && warnings) {
      consoleSummary = ls`${errorCountTitle}, ${warningCountTitle}`;
    } else if (errors) {
      consoleSummary = errorCountTitle;
    } else if (warnings) {
      consoleSummary = warningCountTitle;
    }

    this._titles = ls`Open Console to view ${consoleSummary}`;
    UI.Tooltip.Tooltip.install(this._consoleCounter, this._titles);
    UI.ARIAUtils.setAccessibleName(this._consoleCounter, this._titles);

    /* Update violationCounter items. */
    if (this._violationCounter && this._violations) {
      let violationSummary = '';
      if (violations === 1) {
        violationSummary = ls`${violations} violation`;
      } else {
        violationSummary = ls`${violations} violations`;
      }

      const violationTitle = ls`Open Lighthouse to view ${violationSummary}`;
      this._updateItem(this._violations, violations, true);
      UI.Tooltip.Tooltip.install(this._violationCounter, violationTitle);
      UI.ARIAUtils.setAccessibleName(this._violationCounter, violationTitle);
    }

    /* Update issuesCounter items. */
    let issuesSummary = '';
    if (issues === 1) {
      issuesSummary = ls`${issues} issue`;
    } else {
      issuesSummary = ls`${issues} issues`;
    }

    const issuesTitle = ls`Open Issues to view ${issuesSummary}`;
    this._updateItem(this._issues, issues, true);
    UI.Tooltip.Tooltip.install(this._issuesCounter, issuesTitle);
    UI.ARIAUtils.setAccessibleName(this._issuesCounter, issuesTitle);

    UI.InspectorView.InspectorView.instance().toolbarItemResized();
    this._updatingForTest = false;
    this._updatedForTest();
    return Promise.resolve();
  }

  /**
   * @override
   * @return {?UI.Toolbar.ToolbarItem}
   */
  item() {
    return this._toolbarItem;
  }
}

/** @type {?WarningErrorCounter} */
WarningErrorCounter._instanceForTest = null;
