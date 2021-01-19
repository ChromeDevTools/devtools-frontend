// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as Components from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.Toolbar.Provider}
 */
export class WarningErrorCounter {
  constructor() {
    WarningErrorCounter._instanceForTest = this;

    const countersWrapper = document.createElement('div');
    this._toolbarItem = new UI.Toolbar.ToolbarItem(countersWrapper);
    this._toolbarItem.setVisible(false);

    this._consoleCounter = new Components.CounterButton.CounterButton();
    countersWrapper.appendChild(this._consoleCounter);
    this._consoleCounter.data = {
      clickHandler: Common.Console.Console.instance().show.bind(Common.Console.Console.instance()),
      counters: [{iconName: 'error_icon'}, {iconName: 'warning_icon'}],
    };

    this._violationCounter = null;
    if (Root.Runtime.experiments.isEnabled('spotlight')) {
      this._violationCounter = new Components.CounterButton.CounterButton();
      countersWrapper.appendChild(this._violationCounter);
      this._violationCounter.data = {
        clickHandler: () => UI.ViewManager.ViewManager.instance().showView('lighthouse'),
        counters: [{iconName: 'ic_info_black_18dp', iconColor: '#2a53cd'}],
      };
    }

    this._issuesCounter = new Components.CounterButton.CounterButton();
    countersWrapper.appendChild(this._issuesCounter);
    this._issuesCounter.data = {
      clickHandler: () => {
        Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.StatusBarIssuesCounter);
        UI.ViewManager.ViewManager.instance().showView('issues-pane');
      },
      counters: [{iconName: 'issue-text-icon', iconColor: '#1a73e8'}],
    };

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

  _update() {
    this._updatingForTest = true;
    this._throttler.schedule(this._updateThrottled.bind(this));
  }

  get titlesForTesting() {
    return this._consoleCounter.getAttribute('aria-label');
  }

  /**
   * @return {!Promise<void>}
   */
  async _updateThrottled() {
    const errors = SDK.ConsoleModel.ConsoleModel.instance().errors();
    const warnings = SDK.ConsoleModel.ConsoleModel.instance().warnings();
    const violations = this._violationCounter ? SDK.ConsoleModel.ConsoleModel.instance().violations() : 0;
    const issues = BrowserSDK.IssuesManager.IssuesManager.instance().numberOfIssues();

    /* Update consoleCounter items. */
    let errorCountTitle = '';
    if (errors === 1) {
      errorCountTitle = ls`${errors} error`;
    } else {
      errorCountTitle = ls`${errors} errors`;
    }
    let warningCountTitle = '';
    if (warnings === 1) {
      warningCountTitle = ls`${warnings} warning`;
    } else {
      warningCountTitle = ls`${warnings} warnings`;
    }
    this._consoleCounter.setCounts([errors, warnings]);
    let consoleSummary = '';
    if (errors && warnings) {
      consoleSummary = ls`${errorCountTitle}, ${warningCountTitle}`;
    } else if (errors) {
      consoleSummary = errorCountTitle;
    } else if (warnings) {
      consoleSummary = warningCountTitle;
    }
    const consoleTitle = ls`Open Console to view ${consoleSummary}`;
    // TODO(chromium:1167711): Let the component handle the title and ARIA label.
    UI.Tooltip.Tooltip.install(this._consoleCounter, consoleTitle);
    UI.ARIAUtils.setAccessibleName(this._consoleCounter, consoleTitle);
    this._consoleCounter.classList.toggle('hidden', !(errors || warnings));

    /* Update violationCounter items. */
    if (this._violationCounter) {
      this._violationCounter.setCounts([violations]);
      let violationSummary = '';
      if (violations === 1) {
        violationSummary = ls`${violations} violation`;
      } else {
        violationSummary = ls`${violations} violations`;
      }
      const violationTitle = ls`Open Lighthouse to view ${violationSummary}`;
      // TODO(chromium:1167711): Let the component handle the title and ARIA label.
      UI.Tooltip.Tooltip.install(this._violationCounter, violationTitle);
      UI.ARIAUtils.setAccessibleName(this._violationCounter, violationTitle);
      this._violationCounter.classList.toggle('hidden', !violations);
    }

    /* Update issuesCounter items. */
    this._issuesCounter.setCounts([issues]);
    let issuesSummary = '';
    if (issues === 1) {
      issuesSummary = ls`${issues} issue`;
    } else {
      issuesSummary = ls`${issues} issues`;
    }
    const issuesTitle = ls`Open Issues to view ${issuesSummary}`;
    // TODO(chromium:1167711): Let the component handle the title and ARIA label.
    UI.Tooltip.Tooltip.install(this._issuesCounter, issuesTitle);
    UI.ARIAUtils.setAccessibleName(this._issuesCounter, issuesTitle);
    this._issuesCounter.classList.toggle('hidden', !issues);

    this._toolbarItem.setVisible(Boolean(errors || warnings || violations || issues));

    UI.InspectorView.InspectorView.instance().toolbarItemResized();
    this._updatingForTest = false;
    this._updatedForTest();
    return;
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
