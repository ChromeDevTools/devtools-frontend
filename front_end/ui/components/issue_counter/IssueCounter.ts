// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../icon_button/icon_button.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import type * as IconButton from '../icon_button/icon_button.js';

import issueCounterStyles from './issueCounter.css.js';

const {html} = LitHtml;

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
    case IssuesManager.Issue.IssueKind.PAGE_ERROR:
      return {iconName: 'issue-cross-filled', color: 'var(--icon-error)', width: '20px', height: '20px'};
    case IssuesManager.Issue.IssueKind.BREAKING_CHANGE:
      return {iconName: 'issue-exclamation-filled', color: 'var(--icon-warning)', width: '20px', height: '20px'};
    case IssuesManager.Issue.IssueKind.IMPROVEMENT:
      return {iconName: 'issue-text-filled', color: 'var(--icon-info)', width: '20px', height: '20px'};
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
  OMIT_EMPTY = 'OmitEmpty',
  SHOW_ALWAYS = 'ShowAlways',
  ONLY_MOST_IMPORTANT = 'OnlyMostImportant',
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

// Lazily instantiate the formatter as the constructor takes 50ms+
const listFormatter = (function defineFormatter() {
  let intlListFormat: Intl.ListFormat;
  return {
    format(...args: Parameters<Intl.ListFormat['format']>): ReturnType<Intl.ListFormat['format']> {
      if (!intlListFormat) {
        const opts: Intl.ListFormatOptions = {type: 'unit', style: 'short'};
        intlListFormat = new Intl.ListFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, opts);
      }
      return intlListFormat.format(...args);
    },
  };
})();

export function getIssueCountsEnumeration(
    issuesManager: IssuesManager.IssuesManager.IssuesManager, omitEmpty: boolean = true): string {
  const counts: [number, number, number] = [
    issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.PAGE_ERROR),
    issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.BREAKING_CHANGE),
    issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.IMPROVEMENT),
  ];
  const phrases = [
    i18nString(UIStrings.pageErrors, {issueCount: counts[0]}),
    i18nString(UIStrings.breakingChanges, {issueCount: counts[1]}),
    i18nString(UIStrings.possibleImprovements, {issueCount: counts[2]}),
  ];
  return listFormatter.format(phrases.filter((_, i) => omitEmpty ? counts[i] > 0 : true));
}

export class IssueCounter extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #clickHandler: undefined|(() => void) = undefined;
  #tooltipCallback: undefined|(() => void) = undefined;
  #leadingText: string = '';
  #throttler: undefined|Common.Throttler.Throttler;
  #counts: [number, number, number] = [0, 0, 0];
  #displayMode: DisplayMode = DisplayMode.OMIT_EMPTY;
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
    this.#displayMode = data.displayMode ?? DisplayMode.OMIT_EMPTY;
    this.#accessibleName = data.accessibleName;
    this.#throttlerTimeout = data.throttlerTimeout;
    this.#compact = Boolean(data.compact);
    if (this.#issuesManager !== data.issuesManager) {
      this.#issuesManager?.removeEventListener(
          IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED, this.scheduleUpdate, this);
      this.#issuesManager = data.issuesManager;
      this.#issuesManager.addEventListener(
          IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED, this.scheduleUpdate, this);
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
      this.#issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.PAGE_ERROR),
      this.#issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.BREAKING_CHANGE),
      this.#issuesManager.numberOfIssues(IssuesManager.Issue.IssueKind.IMPROVEMENT),
    ];
    const importance = [
      IssuesManager.Issue.IssueKind.PAGE_ERROR,
      IssuesManager.Issue.IssueKind.BREAKING_CHANGE,
      IssuesManager.Issue.IssueKind.IMPROVEMENT,
    ];
    const mostImportant = importance[this.#counts.findIndex(x => x > 0) ?? 2];

    const countToString = (kind: IssuesManager.Issue.IssueKind, count: number): string|undefined => {
      switch (this.#displayMode) {
        case DisplayMode.OMIT_EMPTY:
          return count > 0 ? `${count}` : undefined;
        case DisplayMode.SHOW_ALWAYS:
          return `${count}`;
        case DisplayMode.ONLY_MOST_IMPORTANT:
          return kind === mostImportant ? `${count}` : undefined;
      }
    };
    const iconSize = '2ex';
    const data: IconButton.IconButton.IconButtonData = {
      groups: [
        {
          ...toIconGroup(getIssueKindIconData(IssuesManager.Issue.IssueKind.PAGE_ERROR), iconSize),
          text: countToString(IssuesManager.Issue.IssueKind.PAGE_ERROR, this.#counts[0]),
        },
        {
          ...toIconGroup(getIssueKindIconData(IssuesManager.Issue.IssueKind.BREAKING_CHANGE), iconSize),
          text: countToString(IssuesManager.Issue.IssueKind.BREAKING_CHANGE, this.#counts[1]),
        },
        {
          ...toIconGroup(getIssueKindIconData(IssuesManager.Issue.IssueKind.IMPROVEMENT), iconSize),
          text: countToString(IssuesManager.Issue.IssueKind.IMPROVEMENT, this.#counts[2]),
        },
      ],
      clickHandler: this.#clickHandler,
      leadingText: this.#leadingText,
      accessibleName: this.#accessibleName,
      compact: this.#compact,
    };
    LitHtml.render(
        html`
        <icon-button .data=${data} .accessibleName=${this.#accessibleName}></icon-button>
        `,
        this.#shadow, {host: this});
    this.#tooltipCallback?.();
  }
}

customElements.define('devtools-issue-counter', IssueCounter);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-issue-counter': IssueCounter;
  }
}
