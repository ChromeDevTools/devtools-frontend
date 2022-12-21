// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import type * as IconButton from '../icon_button/icon_button.js';
import issueCounterStyles from './issueCounter.css.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('ui/components/issue_counter/IssueCounter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function getIssueKindIconData(issueKind: IssuesManager.Issue.IssueKind): IconButton.Icon.IconWithName {
  switch (issueKind) {
    case IssuesManager.Issue.IssueKind.PageError:
      return {iconName: 'issue-cross-icon', color: 'var(--issue-color-red)', width: '16px', height: '16px'};
    case IssuesManager.Issue.IssueKind.BreakingChange:
      return {iconName: 'issue-exclamation-icon', color: 'var(--issue-color-yellow)', width: '16px', height: '16px'};
    case IssuesManager.Issue.IssueKind.Improvement:
      return {iconName: 'issue-text-icon', color: 'var(--issue-color-blue)', width: '16px', height: '16px'};
  }
}

function toIconGroup({iconName, color, width, height}: IconButton.Icon.IconWithName, sizeOverride?: string):
    IconButton.IconButton.IconWithTextData {
  if (sizeOverride) {
    return {iconName, iconColor: color, iconWidth: sizeOverride, iconHeight: sizeOverride};
  }
  return {iconName, iconColor: color, iconWidth: width, iconHeight: height};
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
  issuesManager: IssuesManager.IssuesManager.IssuesManager;
  throttlerTimeout?: number;
  accessibleName?: string;
  compact?: boolean;
}

// @ts-ignore Remove this comment once Intl.ListFormat is in type defs.
const listFormat = new Intl.ListFormat(navigator.language, {type: 'unit', style: 'short'});

export function getIssueCountsEnumeration(
    issuesManager: IssuesManager.IssuesManager.IssuesManager, omitEmpty: boolean = true): string {
  const counts: [number, number, number] = [
    issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.PageError),
    issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.BreakingChange),
    issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.Improvement),
  ];
  const phrases = [
    i18nString(UIStrings.pageErrors, {issueCount: counts[0]}),
    i18nString(UIStrings.breakingChanges, {issueCount: counts[1]}),
    i18nString(UIStrings.possibleImprovements, {issueCount: counts[2]}),
  ];
  return listFormat.format(phrases.filter((_, i) => omitEmpty ? counts[i] > 0 : true));
}

export class IssueCounter extends HTMLElement {
  static readonly litTagName = LitHtml.literal`issue-counter`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #clickHandler: undefined|(() => void) = undefined;
  #tooltipCallback: undefined|(() => void) = undefined;
  #leadingText: string = '';
  #throttler: undefined|Common.Throttler.Throttler;
  #counts: [number, number, number] = [0, 0, 0];
  #displayMode: DisplayMode = DisplayMode.OmitEmpty;
  #issuesManager: IssuesManager.IssuesManager.IssuesManager|undefined = undefined;
  #accessibleName: string|undefined = undefined;
  #throttlerTimeout: number|undefined;
  #compact = false;

  scheduleUpdate(): void {
    if (this.#throttler) {
      void this.#throttler.schedule(async () => this.#render());
    } else {
      this.#render();
    }
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [issueCounterStyles];
  }

  set data(data: IssueCounterData) {
    this.#clickHandler = data.clickHandler;
    this.#leadingText = data.leadingText ?? '';
    this.#tooltipCallback = data.tooltipCallback;
    this.#displayMode = data.displayMode ?? DisplayMode.OmitEmpty;
    this.#accessibleName = data.accessibleName;
    this.#throttlerTimeout = data.throttlerTimeout;
    this.#compact = Boolean(data.compact);
    if (this.#issuesManager !== data.issuesManager) {
      this.#issuesManager?.removeEventListener(
          IssuesManager.IssuesManager.Events.IssuesCountUpdated, this.scheduleUpdate, this);
      this.#issuesManager = data.issuesManager;
      this.#issuesManager.addEventListener(
          IssuesManager.IssuesManager.Events.IssuesCountUpdated, this.scheduleUpdate, this);
    }
    if (data.throttlerTimeout !== 0) {
      this.#throttler = new Common.Throttler.Throttler(data.throttlerTimeout ?? 100);
    } else {
      this.#throttler = undefined;
    }
    this.scheduleUpdate();
  }

  get data(): IssueCounterData {
    return {
      clickHandler: this.#clickHandler,
      leadingText: this.#leadingText,
      tooltipCallback: this.#tooltipCallback,
      displayMode: this.#displayMode,
      accessibleName: this.#accessibleName,
      throttlerTimeout: this.#throttlerTimeout,
      compact: this.#compact,
      issuesManager: this.#issuesManager as IssuesManager.IssuesManager.IssuesManager,
    };
  }

  #render(): void {
    if (!this.#issuesManager) {
      return;
    }
    this.#counts = [
      this.#issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.PageError),
      this.#issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.BreakingChange),
      this.#issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.Improvement),
    ];
    const importance = [
      IssuesManager.Issue.IssueKind.PageError,
      IssuesManager.Issue.IssueKind.BreakingChange,
      IssuesManager.Issue.IssueKind.Improvement,
    ];
    const mostImportant = importance[this.#counts.findIndex(x => x > 0) ?? 2];

    const countToString = (kind: IssuesManager.Issue.IssueKind, count: number): string|undefined => {
      switch (this.#displayMode) {
        case DisplayMode.OmitEmpty:
          return count > 0 ? `${count}` : undefined;
        case DisplayMode.ShowAlways:
          return `${count}`;
        case DisplayMode.OnlyMostImportant:
          return kind === mostImportant ? `${count}` : undefined;
      }
    };
    const iconSize = '2ex';
    const data: IconButton.IconButton.IconButtonData = {
      groups: [
        {
          ...toIconGroup(getIssueKindIconData(IssuesManager.Issue.IssueKind.PageError), iconSize),
          text: countToString(IssuesManager.Issue.IssueKind.PageError, this.#counts[0]),
        },
        {
          ...toIconGroup(getIssueKindIconData(IssuesManager.Issue.IssueKind.BreakingChange), iconSize),
          text: countToString(IssuesManager.Issue.IssueKind.BreakingChange, this.#counts[1]),
        },
        {
          ...toIconGroup(getIssueKindIconData(IssuesManager.Issue.IssueKind.Improvement), iconSize),
          text: countToString(IssuesManager.Issue.IssueKind.Improvement, this.#counts[2]),
        },
      ],
      clickHandler: this.#clickHandler,
      leadingText: this.#leadingText,
      accessibleName: this.#accessibleName,
      compact: this.#compact,
    };
    LitHtml.render(
        LitHtml.html`
        <icon-button .data=${data as IconButton.IconButton.IconButtonData} .accessibleName=${
            this.#accessibleName}></icon-button>
        `,
        this.#shadow, {host: this});
    this.#tooltipCallback?.();
  }
}

ComponentHelpers.CustomElements.defineComponent('issue-counter', IssueCounter);

declare global {
  interface HTMLElementTagNameMap {
    'issue-counter': IssueCounter;
  }
}
