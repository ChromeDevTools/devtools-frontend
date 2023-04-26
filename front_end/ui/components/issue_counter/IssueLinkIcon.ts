// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Common from '../../../core/common/common.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import IssueLinkIconStyles from './issueLinkIcon.css.js';

import {getIssueKindIconData} from './IssueCounter.js';

const UIStrings = {
  /**
   * @description Title for a link to show an issue in the issues tab
   */
  clickToShowIssue: 'Click to show issue in the issues tab',
  /**
   * @description Title for a link to show an issue in the issues tab
   * @example {A title of an Issue} title
   */
  clickToShowIssueWithTitle: 'Click to open the issue tab and show issue: {title}',
  /**
   *@description Title for an link to show an issue that is unavailable because the issue couldn't be resolved
   */
  issueUnavailable: 'Issue unavailable at this time',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/issue_counter/IssueLinkIcon.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface IssueLinkIconData {
  issue?: IssuesManager.Issue.Issue|null;
  issueId?: Protocol.Audits.IssueId;
  issueResolver?: IssuesManager.IssueResolver.IssueResolver;
  additionalOnClickAction?: () => void;
  revealOverride?: (revealable: Object|null, omitFocus?: boolean|undefined) => Promise<void>;
}

export const extractShortPath = (path: string): string => {
  // 1st regex matches everything after last '/'
  // if path ends with '/', 2nd regex returns everything between the last two '/'
  return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [''])[0];
};

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export class IssueLinkIcon extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-issue-link-icon`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  // The value `null` indicates that the issue is not available,
  // `undefined` that it is still being resolved.
  #issue?: IssuesManager.Issue.Issue|null;
  #issueTitle: string|null = null;
  #issueTitlePromise = Promise.resolve<void>(undefined);
  #issueId?: Protocol.Audits.IssueId;
  #issueResolver?: IssuesManager.IssueResolver.IssueResolver;
  #additionalOnClickAction?: () => void;
  #reveal = Common.Revealer.reveal;
  #issueResolvedPromise = Promise.resolve<void>(undefined);

  set data(data: IssueLinkIconData) {
    this.#issue = data.issue;
    this.#issueId = data.issueId;
    if (!this.#issue && !this.#issueId) {
      throw new Error('Either `issue` or `issueId` must be provided');
    }
    this.#issueResolver = data.issueResolver;
    this.#additionalOnClickAction = data.additionalOnClickAction;
    if (data.revealOverride) {
      this.#reveal = data.revealOverride;
    }
    if (!this.#issue && this.#issueId) {
      this.#issueResolvedPromise = this.#resolveIssue(this.#issueId);
      this.#issueTitlePromise = this.#issueResolvedPromise.then(() => this.#fetchIssueTitle());
    } else {
      this.#issueTitlePromise = this.#fetchIssueTitle();
    }
    void this.#render();
  }

  async #fetchIssueTitle(): Promise<void> {
    const description = this.#issue?.getDescription();
    if (!description) {
      return;
    }
    const title = await IssuesManager.MarkdownIssueDescription.getIssueTitleFromMarkdownDescription(description);
    if (title) {
      this.#issueTitle = title;
    }
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [IssueLinkIconStyles];
  }

  #resolveIssue(issueId: Protocol.Audits.IssueId): Promise<void> {
    if (!this.#issueResolver) {
      throw new Error('An `IssueResolver` must be provided if an `issueId` is provided.');
    }
    return this.#issueResolver.waitFor(issueId)
        .then(issue => {
          this.#issue = issue;
        })
        .catch(() => {
          this.#issue = null;
        });
  }

  get data(): IssueLinkIconData {
    return {
      issue: this.#issue,
      issueId: this.#issueId,
      issueResolver: this.#issueResolver,
      additionalOnClickAction: this.#additionalOnClickAction,
      revealOverride: this.#reveal !== Common.Revealer.reveal ? this.#reveal : undefined,
    };
  }

  iconData(): IconButton.Icon.IconData {
    if (this.#issue) {
      return {
        ...getIssueKindIconData(this.#issue.getKind()),
        width: '16px',
        height: '16px',
      };
    }
    return {iconName: 'issue-questionmark-filled', color: 'var(--icon-default)', width: '16px', height: '16px'};
  }

  handleClick(event: MouseEvent): void {
    if (event.button !== 0) {
      return;  // Only handle left-click for now.
    }
    if (this.#issue) {
      void this.#reveal(this.#issue);
    }
    this.#additionalOnClickAction?.();
  }

  #getTooltip(): Platform.UIString.LocalizedString {
    if (this.#issueTitle) {
      return i18nString(UIStrings.clickToShowIssueWithTitle, {title: this.#issueTitle});
    }
    if (this.#issue) {
      return i18nString(UIStrings.clickToShowIssue);
    }
    return i18nString(UIStrings.issueUnavailable);
  }

  #render(): Promise<void> {
    return coordinator.write(() => {
      // clang-format off
      LitHtml.render(LitHtml.html`
        ${LitHtml.Directives.until(this.#issueTitlePromise.then(() => this.#renderComponent()), this.#issueResolvedPromise.then(() => this.#renderComponent()), this.#renderComponent())}
      `,
      this.#shadow, {host: this});
      // clang-format on
    });
  }

  #renderComponent(): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <span class=${LitHtml.Directives.classMap({'link': Boolean(this.#issue)})}
            tabindex="0"
            @click=${this.handleClick}>
        <${IconButton.Icon.Icon.litTagName} .data=${this.iconData() as IconButton.Icon.IconData}
          title=${this.#getTooltip()}></${IconButton.Icon.Icon.litTagName}>
      </span>`;
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-issue-link-icon', IssueLinkIcon);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-issue-link-icon': IssueLinkIcon;
  }
}
