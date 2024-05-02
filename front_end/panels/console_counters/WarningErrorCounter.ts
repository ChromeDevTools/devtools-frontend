// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

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
   *@description Title for the issues count in the Issues Error Counter shown in the main toolbar (top-left in DevTools). The issues count refers to the number of issues in the issues tab.
   */
  openIssuesToView: '{n, plural, =1 {Open Issues to view # issue:} other {Open Issues to view # issues:}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/console_counters/WarningErrorCounter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let warningErrorCounterInstance: WarningErrorCounter;
export class WarningErrorCounter implements UI.Toolbar.Provider {
  private readonly toolbarItem: UI.Toolbar.ToolbarItemWithCompactLayout;
  private consoleCounter: IconButton.IconButton.IconButton;
  private issueCounter: IssueCounter.IssueCounter.IssueCounter;
  private readonly throttler: Common.Throttler.Throttler;
  updatingForTest?: boolean;

  private constructor() {
    WarningErrorCounter.instanceForTest = this;

    const countersWrapper = document.createElement('div');
    this.toolbarItem = new UI.Toolbar.ToolbarItemWithCompactLayout(countersWrapper);
    this.toolbarItem.setVisible(false);
    this.toolbarItem.addEventListener(
        UI.Toolbar.ToolbarItemWithCompactLayoutEvents.CompactLayoutUpdated, this.onSetCompactLayout, this);

    this.consoleCounter = new IconButton.IconButton.IconButton();
    this.consoleCounter.setAttribute('jslog', `${VisualLogging.counter('console').track({click: true})}`);
    countersWrapper.appendChild(this.consoleCounter);
    this.consoleCounter.data = {
      clickHandler: Common.Console.Console.instance().show.bind(Common.Console.Console.instance()),
      groups: [
        {iconName: 'cross-circle-filled', iconColor: 'var(--icon-error)', iconHeight: '14px', iconWidth: '14px'},
        {iconName: 'warning-filled', iconColor: 'var(--icon-warning)', iconHeight: '14px', iconWidth: '14px'},
      ],
    };

    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    this.issueCounter = new IssueCounter.IssueCounter.IssueCounter();
    this.issueCounter.classList.add('main-toolbar');
    this.issueCounter.setAttribute('jslog', `${VisualLogging.counter('issue').track({click: true})}`);
    countersWrapper.appendChild(this.issueCounter);
    this.issueCounter.data = {
      clickHandler: () => {
        Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.StatusBarIssuesCounter);
        void UI.ViewManager.ViewManager.instance().showView('issues-pane');
      },
      issuesManager,
      displayMode: IssueCounter.IssueCounter.DisplayMode.OnlyMostImportant,
    };

    this.throttler = new Common.Throttler.Throttler(100);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.ConsoleCleared, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.MessageAdded, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.MessageUpdated, this.update, this);

    issuesManager.addEventListener(IssuesManager.IssuesManager.Events.IssuesCountUpdated, this.update, this);

    this.update();
  }

  onSetCompactLayout(event: Common.EventTarget.EventTargetEvent<boolean>): void {
    this.setCompactLayout(event.data);
  }

  setCompactLayout(enable: boolean): void {
    this.consoleCounter.data = {...this.consoleCounter.data, compact: enable};
    this.issueCounter.data = {...this.issueCounter.data, compact: enable};
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): WarningErrorCounter {
    const {forceNew} = opts;
    if (!warningErrorCounterInstance || forceNew) {
      warningErrorCounterInstance = new WarningErrorCounter();
    }

    return warningErrorCounterInstance;
  }

  private updatedForTest(): void {
    // Sniffed in tests.
  }

  private update(): void {
    this.updatingForTest = true;
    void this.throttler.schedule(this.updateThrottled.bind(this));
  }

  get titlesForTesting(): string|null {
    const button = this.consoleCounter.shadowRoot?.querySelector('button');
    return button ? button.getAttribute('aria-label') : null;
  }

  private async updateThrottled(): Promise<void> {
    const errors = SDK.ConsoleModel.ConsoleModel.allErrors();
    const warnings = SDK.ConsoleModel.ConsoleModel.allWarnings();
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    const issues = issuesManager.numberOfIssues();

    const countToText = (c: number): string|undefined => c === 0 ? undefined : `${c}`;

    /* Update consoleCounter items. */
    const errorCountTitle = i18nString(UIStrings.sErrors, {n: errors});
    const warningCountTitle = i18nString(UIStrings.sWarnings, {n: warnings});
    const newConsoleTexts = [countToText(errors), countToText(warnings)];
    let consoleSummary = '';
    if (errors && warnings) {
      consoleSummary = `${errorCountTitle}, ${warningCountTitle}`;
    } else if (errors) {
      consoleSummary = errorCountTitle;
    } else if (warnings) {
      consoleSummary = warningCountTitle;
    }
    const consoleTitle = i18nString(UIStrings.openConsoleToViewS, {PH1: consoleSummary});
    const previousData = this.consoleCounter.data;

    this.consoleCounter.data = {
      ...previousData,
      groups: previousData.groups.map((g, i) => ({...g, text: newConsoleTexts[i]})),
      accessibleName: consoleTitle,
    };
    // TODO(chromium:1167711): Let the component handle the title and ARIA label.
    UI.Tooltip.Tooltip.install(this.consoleCounter, consoleTitle);
    this.consoleCounter.classList.toggle('hidden', !(errors || warnings));

    /* Update issuesCounter items. */
    const issueEnumeration = IssueCounter.IssueCounter.getIssueCountsEnumeration(issuesManager);
    const issuesTitleLead = i18nString(UIStrings.openIssuesToView, {n: issues});
    const issuesTitle = `${issuesTitleLead} ${issueEnumeration}`;
    // TODO(chromium:1167711): Let the component handle the title and ARIA label.
    UI.Tooltip.Tooltip.install(this.issueCounter, issuesTitle);
    this.issueCounter.data = {
      ...this.issueCounter.data,
      accessibleName: issuesTitle,
    };
    this.issueCounter.classList.toggle('hidden', !issues);

    this.toolbarItem.setVisible(Boolean(errors || warnings || issues));

    UI.InspectorView.InspectorView.instance().toolbarItemResized();
    this.updatingForTest = false;
    this.updatedForTest();
    return;
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.toolbarItem;
  }

  static instanceForTest: WarningErrorCounter|null = null;
}
