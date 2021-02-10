// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as Components from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Error count title in Warning Error Counter of the Console panel
  *@example {1} PH1
  */
  sError: '{PH1} error',
  /**
  *@description Error count title in Warning Error Counter of the Console panel
  *@example {3} PH1
  */
  sErrors: '{PH1} errors',
  /**
  *@description Warning count title in Warning Error Counter of the Console panel
  *@example {1} PH1
  */
  sWarning: '{PH1} warning',
  /**
  *@description Warning count title in Warning Error Counter of the Console panel
  *@example {3} PH1
  */
  sWarnings: '{PH1} warnings',
  /**
  *@description Tooltip shown for a main toolbar button that opens the Console panel
  *@example {2 errors, 1 warning} PH1
  */
  openConsoleToViewS: 'Open Console to view {PH1}',
  /**
  *@description Violation count title in Warning Error Counter of the Console panel
  *@example {1} PH1
  */
  sViolation: '{PH1} violation',
  /**
  *@description Violation count title in Warning Error Counter of the Console panel
  *@example {3} PH1
  */
  sViolations: '{PH1} violations',
  /**
  *@description Tooltip shown for a main toolbar button that opens the Lighthouse panel
  *@example {1 violation} PH1
  */
  openLighthouseToViewS: 'Open Lighthouse to view {PH1}',
  /**
  *@description Issues count title in the Issues Error Counter shown in the main toolbar
  *@example {1} PH1
  */
  sIssue: '{PH1} issue',
  /**
  *@description Issues count title in the Issues Error Counter shown in the main toolbar
  *@example {3} PH1
  */
  sIssues: '{PH1} issues',
  /**
  *@description Tooltip shown for a main toolbar button that opens the Issues panel
  *@example {1 issue} PH1
  */
  openIssuesToViewS: 'Open Issues to view {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('console_counters/WarningErrorCounter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let warningErrorCounterInstance: WarningErrorCounter;
export class WarningErrorCounter implements UI.Toolbar.Provider {
  _toolbarItem: UI.Toolbar.ToolbarItem;
  _consoleCounter: Components.IconButton.IconButton;
  _violationCounter: Components.IconButton.IconButton|null;
  _issuesCounter: Components.IconButton.IconButton;
  _throttler: Common.Throttler.Throttler;
  _updatingForTest?: boolean;

  private constructor() {
    WarningErrorCounter._instanceForTest = this;

    const countersWrapper = document.createElement('div');
    this._toolbarItem = new UI.Toolbar.ToolbarItem(countersWrapper);
    this._toolbarItem.setVisible(false);

    this._consoleCounter = new Components.IconButton.IconButton();
    countersWrapper.appendChild(this._consoleCounter);
    this._consoleCounter.data = {
      clickHandler: Common.Console.Console.instance().show.bind(Common.Console.Console.instance()),
      groups: [{iconName: 'error_icon'}, {iconName: 'warning_icon'}],
    };

    this._violationCounter = null;
    if (Root.Runtime.experiments.isEnabled('spotlight')) {
      this._violationCounter = new Components.IconButton.IconButton();
      countersWrapper.appendChild(this._violationCounter);
      this._violationCounter.data = {
        clickHandler: (): Promise<void> => UI.ViewManager.ViewManager.instance().showView('lighthouse'),
        groups: [{iconName: 'ic_info_black_18dp', iconColor: '#2a53cd'}],
      };
    }

    this._issuesCounter = new Components.IconButton.IconButton();
    countersWrapper.appendChild(this._issuesCounter);
    this._issuesCounter.data = {
      clickHandler: (): void => {
        Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.StatusBarIssuesCounter);
        UI.ViewManager.ViewManager.instance().showView('issues-pane');
      },
      groups: [{iconName: 'issue-text-icon', iconColor: '#1a73e8'}],
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

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): WarningErrorCounter {
    const {forceNew} = opts;
    if (!warningErrorCounterInstance || forceNew) {
      warningErrorCounterInstance = new WarningErrorCounter();
    }

    return warningErrorCounterInstance;
  }

  _updatedForTest(): void {
    // Sniffed in tests.
  }

  _update(): void {
    this._updatingForTest = true;
    this._throttler.schedule(this._updateThrottled.bind(this));
  }

  get titlesForTesting(): string|null {
    return this._consoleCounter.getAttribute('aria-label');
  }

  async _updateThrottled(): Promise<void> {
    const errors = SDK.ConsoleModel.ConsoleModel.instance().errors();
    const warnings = SDK.ConsoleModel.ConsoleModel.instance().warnings();
    const violations = this._violationCounter ? SDK.ConsoleModel.ConsoleModel.instance().violations() : 0;
    const issues = BrowserSDK.IssuesManager.IssuesManager.instance().numberOfIssues();

    const countToText = (c: number): string|undefined => c === 0 ? undefined : `${c}`;

    /* Update consoleCounter items. */
    let errorCountTitle = '';
    if (errors === 1) {
      errorCountTitle = i18nString(UIStrings.sError, {PH1: errors});
    } else {
      errorCountTitle = i18nString(UIStrings.sErrors, {PH1: errors});
    }
    let warningCountTitle = '';
    if (warnings === 1) {
      warningCountTitle = i18nString(UIStrings.sWarning, {PH1: warnings});
    } else {
      warningCountTitle = i18nString(UIStrings.sWarnings, {PH1: warnings});
    }
    this._consoleCounter.setTexts([countToText(errors), countToText(warnings)]);
    let consoleSummary = '';
    if (errors && warnings) {
      consoleSummary = `${errorCountTitle}, ${warningCountTitle}`;
    } else if (errors) {
      consoleSummary = errorCountTitle;
    } else if (warnings) {
      consoleSummary = warningCountTitle;
    }
    const consoleTitle = i18nString(UIStrings.openConsoleToViewS, {PH1: consoleSummary});
    // TODO(chromium:1167711): Let the component handle the title and ARIA label.
    UI.Tooltip.Tooltip.install(this._consoleCounter, consoleTitle);
    UI.ARIAUtils.setAccessibleName(this._consoleCounter, consoleTitle);
    this._consoleCounter.classList.toggle('hidden', !(errors || warnings));

    /* Update violationCounter items. */
    if (this._violationCounter) {
      this._violationCounter.setTexts([countToText(violations)]);
      let violationSummary = '';
      if (violations === 1) {
        violationSummary = i18nString(UIStrings.sViolation, {PH1: violations});
      } else {
        violationSummary = i18nString(UIStrings.sViolations, {PH1: violations});
      }
      const violationTitle = i18nString(UIStrings.openLighthouseToViewS, {PH1: violationSummary});
      // TODO(chromium:1167711): Let the component handle the title and ARIA label.
      UI.Tooltip.Tooltip.install(this._violationCounter, violationTitle);
      UI.ARIAUtils.setAccessibleName(this._violationCounter, violationTitle);
      this._violationCounter.classList.toggle('hidden', !violations);
    }

    /* Update issuesCounter items. */
    this._issuesCounter.setTexts([countToText(issues)]);
    let issuesSummary = '';
    if (issues === 1) {
      issuesSummary = i18nString(UIStrings.sIssue, {PH1: issues});
    } else {
      issuesSummary = i18nString(UIStrings.sIssues, {PH1: issues});
    }
    const issuesTitle = i18nString(UIStrings.openIssuesToViewS, {PH1: issuesSummary});
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

  item(): UI.Toolbar.ToolbarItem|null {
    return this._toolbarItem;
  }

  static _instanceForTest: WarningErrorCounter|null = null;
}
