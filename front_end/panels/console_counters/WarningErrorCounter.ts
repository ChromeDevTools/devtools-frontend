// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

const UIStrings = {
  /**
   * @description The console error count in the Warning Error Counter shown in the main toolbar (top-left in DevTools). The error count refers to the number of errors currently present in the JavaScript console.
   */
  sErrors: '{n, plural, =1 {# error} other {# errors}}',
  /**
   * @description The console warning count in the Warning Error Counter shown in the main toolbar (top-left in DevTools). The warning count refers to the number of warnings currently present in the JavaScript console.
   */
  sWarnings: '{n, plural, =1 {# warning} other {# warnings}}',
  /**
   * @description Tooltip shown for a main toolbar button that opens the Console panel
   * @example {2 errors, 1 warning} PH1
   */
  openConsoleToViewS: 'Open Console to view {PH1}',
  /**
   * @description Title for the issues count in the Issues Error Counter shown in the main toolbar (top-left in DevTools). The issues count refers to the number of issues in the issues tab.
   */
  openIssuesToView: '{n, plural, =1 {Open Issues to view # issue:} other {Open Issues to view # issues:}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/console_counters/WarningErrorCounter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  compact?: boolean;
  errors: number;
  warnings: number;
  issues: number;
  showIssuesHandler: () => void;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();

  const countToText = (c: number): string|undefined => c === 0 ? undefined : `${c}`;
  const {errors, warnings, issues, compact} = input;

  /* Update consoleCounter items. */
  const errorCountTitle = i18nString(UIStrings.sErrors, {n: errors});
  const warningCountTitle = i18nString(UIStrings.sWarnings, {n: warnings});
  let consoleSummary = '';
  if (errors && warnings) {
    consoleSummary = `${errorCountTitle}, ${warningCountTitle}`;
  } else if (errors) {
    consoleSummary = errorCountTitle;
  } else if (warnings) {
    consoleSummary = warningCountTitle;
  }
  const consoleTitle = i18nString(UIStrings.openConsoleToViewS, {PH1: consoleSummary});
  const iconData: IconButton.IconButton.IconButtonData = {
    clickHandler: Common.Console.Console.instance().show.bind(Common.Console.Console.instance()),
    accessibleName: consoleTitle,
    compact,
    groups: [
      {
        iconName: 'cross-circle-filled',
        text: countToText(errors)
      },
      {
        iconName: 'warning-filled',
        text: countToText(warnings)
      },
    ],
  };

  /* Update issuesCounter items. */
  const issueEnumeration = IssueCounter.IssueCounter.getIssueCountsEnumeration(issuesManager);
  const issuesTitleLead = i18nString(UIStrings.openIssuesToView, {n: issues});
  const issuesTitle = `${issuesTitleLead} ${issueEnumeration}`;
  const issueCounterData: IssueCounter.IssueCounter.IssueCounterData = {
    clickHandler: input.showIssuesHandler,
    issuesManager,
    compact,
    accessibleName: issuesTitle,
    displayMode: IssueCounter.IssueCounter.DisplayMode.ONLY_MOST_IMPORTANT,
  };

  render(
      html`<div class="status-buttons"
         ><icon-button
            .data=${iconData}
            title=${consoleTitle}
            class=${'small' + warnings || errors ? nothing as unknown as string : 'hidden'}
            jslog=${VisualLogging.counter('console').track({
        click: true
      })}
         ></icon-button><devtools-issue-counter
            class=${'main-toolbar' + (issues ? '' : ' hidden')}
            title=${issuesTitle}
            .data=${issueCounterData}
            jslog=${VisualLogging.counter('issue').track({
        click: true
      })}
         ></devtools-issue-counter></div>`,
      target);
};

export class WarningErrorCounterWidget extends UI.Widget.Widget {
  private readonly throttler: Common.Throttler.Throttler;
  updatingForTest?: boolean;
  private compact?: boolean;
  static instanceForTest: WarningErrorCounterWidget|null = null;

  constructor(
      element: HTMLElement, private readonly setVisibility: (visible: boolean) => void,
      private readonly view: View = DEFAULT_VIEW) {
    super(element);
    this.throttler = new Common.Throttler.Throttler(100);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.ConsoleCleared, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.MessageAdded, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.MessageUpdated, this.update, this);

    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    issuesManager.addEventListener(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED, this.update, this);

    this.update();
    WarningErrorCounterWidget.instanceForTest = this;
  }

  onSetCompactLayout(event: Common.EventTarget.EventTargetEvent<boolean>): void {
    this.setCompactLayout(event.data);
  }

  setCompactLayout(enable: boolean): void {
    this.compact = enable;
    void this.performUpdate();
  }

  private updatedForTest(): void {
    // Sniffed in tests.
  }

  private update(): void {
    this.updatingForTest = true;
    void this.throttler.schedule(this.performUpdate.bind(this));
  }

  get titlesForTesting(): string|null {
    const button = this.contentElement.querySelector('icon-button')?.shadowRoot?.querySelector('button');
    return button ? button.getAttribute('aria-label') : null;
  }

  private showIssues(): void {
    Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.STATUS_BAR_ISSUES_COUNTER);
    void UI.ViewManager.ViewManager.instance().showView('issues-pane');
  }

  override async performUpdate(): Promise<void> {
    const errors = SDK.ConsoleModel.ConsoleModel.allErrors();
    const warnings = SDK.ConsoleModel.ConsoleModel.allWarnings();
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    const issues = issuesManager.numberOfIssues();

    this.view(
        {compact: this.compact, errors, warnings, issues, showIssuesHandler: this.showIssues.bind(this)}, {},
        this.contentElement);

    this.setVisibility(Boolean(errors || warnings || issues));
    UI.InspectorView.InspectorView.instance().toolbarItemResized();

    this.updatingForTest = false;
    this.updatedForTest();
    return;
  }
}

let warningErrorCounterInstance: WarningErrorCounter;
export class WarningErrorCounter implements UI.Toolbar.Provider {
  private readonly toolbarItem: UI.Toolbar.ToolbarItemWithCompactLayout;

  private constructor() {
    const widgetElement =
        document.createElement('devtools-widget') as UI.Widget.WidgetElement<WarningErrorCounterWidget>;
    const toolbarItem = new UI.Toolbar.ToolbarItemWithCompactLayout(widgetElement);
    toolbarItem.setVisible(false);
    widgetElement.widgetConfig = UI.Widget.widgetConfig(e => {
      const widget = new WarningErrorCounterWidget(e, toolbarItem.setVisible.bind(toolbarItem));
      toolbarItem.addEventListener(
          UI.Toolbar.ToolbarItemWithCompactLayoutEvents.COMPACT_LAYOUT_UPDATED, widget.onSetCompactLayout, widget);
      return widget;
    });
    this.toolbarItem = toolbarItem;
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.toolbarItem;
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): WarningErrorCounter {
    const {forceNew} = opts;
    if (!warningErrorCounterInstance || forceNew) {
      warningErrorCounterInstance = new WarningErrorCounter();
    }

    return warningErrorCounterInstance;
  }
}
