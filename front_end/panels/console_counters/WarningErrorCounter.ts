// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as BrowserSDK from '../../browser_sdk/browser_sdk.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Components from '../../ui/components/components.js';
import * as UI from '../../ui/legacy/legacy.js';
import {DisplayMode, IssueCounter} from './IssueCounter.js';

import {getIssueCountsEnumeration} from './IssueCounter.js';

const UIStrings = {
  /**
  *@description The console error count in the Warning Error Counter shown in the main toolbar (top-left in DevTools). The error count refers to the number of errors currently present in the JavaScript console.
  */
  sErrors: '{n, plural, =1 {# error} other {# errors}}',
  /**
  *@description The console warning count in the Warning Error Counter shown in the main toolbar (top-left in DevTools). The warning count refers to the number of warnings currently present in the JavaScript console.
  */
  sWarnings: '{n, plural, =1 {# warning} other {# warnings}}',
  /**
  *@description Tooltip shown for a main toolbar button that opens the Console panel
  *@example {2 errors, 1 warning} PH1
  */
  openConsoleToViewS: 'Open Console to view {PH1}',
  /**
  *@description Title for the Lighthouse violations count in the Warning Error Counter shown in the main toolbar (top-left in DevTools). The violations count refers to the number of violations that were detected by Lighthouse.
  */
  openLighthouseToView:
      '{n, plural, =1 {Open Lighthouse to view # violation} other {Open Lighthouse to view # violations}}',
  /**
  *@description Title for the issues count in the Issues Error Counter shown in the main toolbar (top-left in DevTools). The issues count refers to the number of issues in the issues tab.
  */
  openIssuesToView: '{n, plural, =1 {Open Issues to view # issue:} other {Open Issues to view # issues:}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/console_counters/WarningErrorCounter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let warningErrorCounterInstance: WarningErrorCounter;
export class WarningErrorCounter implements UI.Toolbar.Provider {
  _toolbarItem: UI.Toolbar.ToolbarItem;
  _consoleCounter: Components.IconButton.IconButton;
  _violationCounter: Components.IconButton.IconButton|null;
  _issueCounter: IssueCounter;
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

    const issuesManager = BrowserSDK.IssuesManager.IssuesManager.instance();
    this._issueCounter = new IssueCounter();
    countersWrapper.appendChild(this._issueCounter);
    this._issueCounter.data = {
      clickHandler: (): void => {
        Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.StatusBarIssuesCounter);
        UI.ViewManager.ViewManager.instance().showView('issues-pane');
      },
      issuesManager,
      displayMode: DisplayMode.OnlyMostImportant,
    };

    this._throttler = new Common.Throttler.Throttler(100);

    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.ConsoleCleared, this._update, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(SDK.ConsoleModel.Events.MessageAdded, this._update, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.MessageUpdated, this._update, this);

    issuesManager.addEventListener(BrowserSDK.IssuesManager.Events.IssuesCountUpdated, this._update, this);

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
    const issuesManager = BrowserSDK.IssuesManager.IssuesManager.instance();
    const issues = issuesManager.numberOfIssues();

    const countToText = (c: number): string|undefined => c === 0 ? undefined : `${c}`;

    /* Update consoleCounter items. */
    const errorCountTitle = i18nString(UIStrings.sErrors, {n: errors});
    const warningCountTitle = i18nString(UIStrings.sWarnings, {n: warnings});
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
      const violationTitle = i18nString(UIStrings.openLighthouseToView, {n: violations});
      // TODO(chromium:1167711): Let the component handle the title and ARIA label.
      UI.Tooltip.Tooltip.install(this._violationCounter, violationTitle);
      UI.ARIAUtils.setAccessibleName(this._violationCounter, violationTitle);
      this._violationCounter.classList.toggle('hidden', !violations);
    }

    /* Update issuesCounter items. */
    const issueEnumeration = getIssueCountsEnumeration(issuesManager);
    const issuesTitleLead = i18nString(UIStrings.openIssuesToView, {n: issues});
    const issuesTitle = `${issuesTitleLead} ${issueEnumeration}`;
    // TODO(chromium:1167711): Let the component handle the title and ARIA label.
    UI.Tooltip.Tooltip.install(this._issueCounter, issuesTitle);
    UI.ARIAUtils.setAccessibleName(this._issueCounter, issuesTitle);
    this._issueCounter.classList.toggle('hidden', !issues);

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
