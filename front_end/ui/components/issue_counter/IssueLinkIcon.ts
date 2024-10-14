// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import {getIssueKindIconData} from './IssueCounter.js';
import IssueLinkIconStyles from './issueLinkIcon.css.js';

const {html} = LitHtml;

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
  revealOverride?: (revealable: unknown, omitFocus?: boolean) => Promise<void>;
}

export const extractShortPath = (path: string): string => {
  // 1st regex matches everything after last '/'
  // if path ends with '/', 2nd regex returns everything between the last two '/'
  return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [''])[0];
};

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export class IssueLinkIcon extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  // The value `null` indicates that the issue is not available,
  // `undefined` that it is still being resolved.
  #issue?: IssuesManager.Issue.Issue|null;
  #issueTitle: string|null = null;
  #issueId?: Protocol.Audits.IssueId;
  #issueResolver?: IssuesManager.IssueResolver.IssueResolver;
  #additionalOnClickAction?: () => void;
  #reveal = Common.Revealer.reveal;

  set data(data: IssueLinkIconData) {
    this.#issue = data.issue;
    this.#issueId = data.issueId;
    this.#issueResolver = data.issueResolver;
    if (!this.#issue) {
      if (!this.#issueId) {
        throw new Error('Either `issue` or `issueId` must be provided');
      } else if (!this.#issueResolver) {
        throw new Error('An `IssueResolver` must be provided if an `issueId` is provided.');
      }
    }
    this.#additionalOnClickAction = data.additionalOnClickAction;
    if (data.revealOverride) {
      this.#reveal = data.revealOverride;
    }
    void this.#fetchIssueData();
    void this.#render();
  }

  async #fetchIssueData(): Promise<void> {
    if (!this.#issue && this.#issueId) {
      try {
        this.#issue = await this.#issueResolver?.waitFor(this.#issueId);
      } catch {
        this.#issue = null;
      }
    }
    const description = this.#issue?.getDescription();
    if (description) {
      const title = await IssuesManager.MarkdownIssueDescription.getIssueTitleFromMarkdownDescription(description);
      if (title) {
        this.#issueTitle = title;
      }
    }
    await this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [IssueLinkIconStyles];
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

  handleClick(event: MouseEvent): void {
    if (event.button !== 0) {
      return;  // Only handle left-click for now.
    }
    if (this.#issue) {
      void this.#reveal(this.#issue);
    }
    this.#additionalOnClickAction?.();
    event.consume();
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

  #getIconName(): string {
    if (!this.#issue) {
      return 'issue-questionmark-filled';
    }
    const {iconName} = getIssueKindIconData(this.#issue.getKind());
    return iconName;
  }

  #render(): Promise<void> {
    return coordinator.write(() => {
      // clang-format off
      LitHtml.render(html`
      <button class=${LitHtml.Directives.classMap({link: Boolean(this.#issue)})}
              title=${this.#getTooltip()}
              jslog=${VisualLogging.link('issue').track({click: true})}
              @click=${this.handleClick}>
        <devtools-icon name=${this.#getIconName()}></devtools-icon>
      </button>`,
      this.#shadow, {host: this});
      // clang-format on
    });
  }
}

customElements.define('devtools-issue-link-icon', IssueLinkIcon);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-issue-link-icon': IssueLinkIcon;
  }
}
