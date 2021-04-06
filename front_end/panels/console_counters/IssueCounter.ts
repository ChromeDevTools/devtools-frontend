// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../../browser_sdk/browser_sdk.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import * as UIComponents from '../../ui/components/components.js';

const UIStrings = {
  /**
   *@description A description for a kind of issue we display in the issues tab.
   */
  pageErrorIssue: 'A page error issue: the page is not working correctly',
  /**
   *@description A description for a kind of issue we display in the issues tab.
   */
  breakingChangeIssue: 'A breaking change issue: the page may stop working in an upcoming version of Chrome',
  /**
   *@description A description for a kind of issue we display in the issues tab.
   */
  improvementIssue: 'An improvement issue: there is an opportunity to improve the page',
  /**
  *@description Label for link to Issues tab, specifying how many issues there are.
  */
  pageErrors: '{issueCount, plural, =1 {# page error} other {# page errors}}',
  /**
 *@description Label for link to Issues tab, specifying how many issues there are.
 */
  breakingChanges: '{issueCount, plural, =1 {# breaking change} other {# breaking changes}}',
  /**
 *@description Label for link to Issues tab, specifying how many issues there are.
 */
  possibleImprovements: '{issueCount, plural, =1 {# possible improvement} other {# possible improvements}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/console_counters/IssueCounter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function getIssueKindIconData(issueKind: SDK.Issue.IssueKind): UIComponents.Icon.IconWithName {
  switch (issueKind) {
    case SDK.Issue.IssueKind.PageError:
      return {iconName: 'issue-cross-icon', color: 'var(--issue-color-red)', width: '16px', height: '16px'};
    case SDK.Issue.IssueKind.BreakingChange:
      return {iconName: 'issue-exclamation-icon', color: 'var(--issue-color-yellow)', width: '16px', height: '16px'};
    case SDK.Issue.IssueKind.Improvement:
      return {iconName: 'issue-text-icon', color: 'var(--issue-color-blue)', width: '16px', height: '16px'};
  }
}

function toIconGroup({iconName, color, width, height}: UIComponents.Icon.IconWithName, sizeOverride?: string):
    UIComponents.IconButton.IconWithTextData {
  if (sizeOverride) {
    return {iconName, iconColor: color, iconWidth: sizeOverride, iconHeight: sizeOverride};
  }
  return {iconName, iconColor: color, iconWidth: width, iconHeight: height};
}

export function getIssueKindDescription(issueKind: SDK.Issue.IssueKind): Common.UIString.LocalizedString {
  switch (issueKind) {
    case SDK.Issue.IssueKind.PageError:
      return i18nString(UIStrings.pageErrorIssue);
    case SDK.Issue.IssueKind.BreakingChange:
      return i18nString(UIStrings.breakingChangeIssue);
    case SDK.Issue.IssueKind.Improvement:
      return i18nString(UIStrings.improvementIssue);
  }
}

export const enum DisplayMode {
  OmitEmpty = 'OmitEmpty',
  ShowAlways = 'ShowAlways',
  OnlyMostImportant = 'OnlyMostImportant',
}

export interface IssueCounterData {
  clickHandler?: () => void;
  tooltipCallback?: () => void;
  leadingText?: string;
  displayMode?: DisplayMode;
  issuesManager: BrowserSDK.IssuesManager.IssuesManager;
  throttlerTimeout?: number;
  accessibleName?: string;
}

// @ts-ignore Remove this comment once Intl.ListFormat is in type defs.
const listFormat = new Intl.ListFormat(navigator.language, {type: 'unit', style: 'short'});

export function getIssueCountsEnumeration(
    issuesManager: BrowserSDK.IssuesManager.IssuesManager, omitEmpty: boolean = true): string {
  const counts: [number, number, number] = [
    issuesManager.numberOfIssues(SDK.Issue.IssueKind.PageError),
    issuesManager.numberOfIssues(SDK.Issue.IssueKind.BreakingChange),
    issuesManager.numberOfIssues(SDK.Issue.IssueKind.Improvement),
  ];
  const phrases = [
    i18nString(UIStrings.pageErrors, {issueCount: counts[0]}),
    i18nString(UIStrings.breakingChanges, {issueCount: counts[1]}),
    i18nString(UIStrings.possibleImprovements, {issueCount: counts[2]}),
  ];
  return listFormat.format(phrases.filter((_, i) => omitEmpty ? counts[i] > 0 : true));
}

export class IssueCounter extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private clickHandler: undefined|(() => void) = undefined;
  private tooltipCallback: undefined|(() => void) = undefined;
  private leadingText: string = '';
  private throttler: undefined|Common.Throttler.Throttler;
  private counts: [number, number, number] = [0, 0, 0];
  private displayMode: DisplayMode = DisplayMode.OmitEmpty;
  private issuesManager: BrowserSDK.IssuesManager.IssuesManager|undefined = undefined;
  private accessibleName: string|undefined = undefined;
  private throttlerTimeout: number|undefined;

  scheduleUpdate(): void {
    if (this.throttler) {
      this.throttler.schedule(async () => this.render());
    } else {
      this.render();
    }
  }

  set data(data: IssueCounterData) {
    this.clickHandler = data.clickHandler;
    this.leadingText = data.leadingText ?? '';
    this.tooltipCallback = data.tooltipCallback;
    this.displayMode = data.displayMode ?? DisplayMode.OmitEmpty;
    this.accessibleName = data.accessibleName;
    this.throttlerTimeout = data.throttlerTimeout;
    if (this.issuesManager !== data.issuesManager) {
      this.issuesManager?.removeEventListener(
          BrowserSDK.IssuesManager.Events.IssuesCountUpdated, this.scheduleUpdate, this);
      this.issuesManager = data.issuesManager;
      this.issuesManager.addEventListener(
          BrowserSDK.IssuesManager.Events.IssuesCountUpdated, this.scheduleUpdate, this);
    }
    if (data.throttlerTimeout !== 0) {
      this.throttler = new Common.Throttler.Throttler(data.throttlerTimeout ?? 100);
    } else {
      this.throttler = undefined;
    }
    this.scheduleUpdate();
  }

  get data(): IssueCounterData {
    return {
      clickHandler: this.clickHandler,
      tooltipCallback: this.tooltipCallback,
      leadingText: this.leadingText,
      displayMode: this.displayMode,
      issuesManager: this.issuesManager as BrowserSDK.IssuesManager.IssuesManager,
      accessibleName: this.accessibleName,
      throttlerTimeout: this.throttlerTimeout,
    };
  }

  private render(): void {
    if (!this.issuesManager) {
      return;
    }
    this.counts = [
      this.issuesManager.numberOfIssues(SDK.Issue.IssueKind.PageError),
      this.issuesManager.numberOfIssues(SDK.Issue.IssueKind.BreakingChange),
      this.issuesManager.numberOfIssues(SDK.Issue.IssueKind.Improvement),
    ];
    const importance =
        [SDK.Issue.IssueKind.PageError, SDK.Issue.IssueKind.BreakingChange, SDK.Issue.IssueKind.Improvement];
    const mostImportant = importance[this.counts.findIndex(x => x > 0) ?? 2];

    const countToString = (kind: SDK.Issue.IssueKind, count: number): string|undefined => {
      switch (this.displayMode) {
        case DisplayMode.OmitEmpty:
          return count > 0 ? `${count}` : undefined;
        case DisplayMode.ShowAlways:
          return `${count}`;
        case DisplayMode.OnlyMostImportant:
          return kind === mostImportant ? `${count}` : undefined;
      }
    };
    const iconSize = '2ex';
    const data: UIComponents.IconButton.IconButtonData = {
      groups: [
        {
          ...toIconGroup(getIssueKindIconData(SDK.Issue.IssueKind.PageError), iconSize),
          text: countToString(SDK.Issue.IssueKind.PageError, this.counts[0]),
        },
        {
          ...toIconGroup(getIssueKindIconData(SDK.Issue.IssueKind.BreakingChange), iconSize),
          text: countToString(SDK.Issue.IssueKind.BreakingChange, this.counts[1]),
        },
        {
          ...toIconGroup(getIssueKindIconData(SDK.Issue.IssueKind.Improvement), iconSize),
          text: countToString(SDK.Issue.IssueKind.Improvement, this.counts[2]),
        },
      ],
      clickHandler: this.clickHandler,
      leadingText: this.leadingText,
    };
    LitHtml.render(
        LitHtml.html`
        <style>
            :host {
              white-space: normal;
              display: inline-block;
            }
        </style>
        <icon-button .data=${data as UIComponents.IconButton.IconButtonData}
          aria-label="${LitHtml.Directives.ifDefined(this.accessibleName)}"></icon-button>
        `,
        this.shadow);
    this.tooltipCallback?.();
  }
}

customElements.define('issue-counter', IssueCounter);

declare global {
  interface HTMLElementTagNameMap {
    'issue-counter': IssueCounter;
  }
}
