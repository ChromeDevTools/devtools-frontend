// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/icon_button/icon_button.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { getIssueKindIconName } from './IssueCounter.js';
import IssueLinkIconStyles from './issueLinkIcon.css.js';
const { html } = Lit;
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
     * @description Title for an link to show an issue that is unavailable because the issue couldn't be resolved
     */
    issueUnavailable: 'Issue unavailable at this time',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/issue_counter/IssueLinkIcon.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const extractShortPath = (path) => {
    // 1st regex matches everything after last '/'
    // if path ends with '/', 2nd regex returns everything between the last two '/'
    return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [''])[0];
};
export class IssueLinkIcon extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    // The value `null` indicates that the issue is not available,
    // `undefined` that it is still being resolved.
    #issue;
    #issueTitle = null;
    #issueId;
    #issueResolver;
    #additionalOnClickAction;
    #reveal = Common.Revealer.reveal;
    set data(data) {
        this.#issue = data.issue;
        this.#issueId = data.issueId;
        this.#issueResolver = data.issueResolver;
        if (!this.#issue) {
            if (!this.#issueId) {
                throw new Error('Either `issue` or `issueId` must be provided');
            }
            else if (!this.#issueResolver) {
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
    async #fetchIssueData() {
        if (!this.#issue && this.#issueId) {
            try {
                this.#issue = await this.#issueResolver?.waitFor(this.#issueId);
            }
            catch {
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
    get data() {
        return {
            issue: this.#issue,
            issueId: this.#issueId,
            issueResolver: this.#issueResolver,
            additionalOnClickAction: this.#additionalOnClickAction,
            revealOverride: this.#reveal !== Common.Revealer.reveal ? this.#reveal : undefined,
        };
    }
    handleClick(event) {
        if (event.button !== 0) {
            return; // Only handle left-click for now.
        }
        if (this.#issue) {
            void this.#reveal(this.#issue);
        }
        this.#additionalOnClickAction?.();
        event.consume();
    }
    #getTooltip() {
        if (this.#issueTitle) {
            return i18nString(UIStrings.clickToShowIssueWithTitle, { title: this.#issueTitle });
        }
        if (this.#issue) {
            return i18nString(UIStrings.clickToShowIssue);
        }
        return i18nString(UIStrings.issueUnavailable);
    }
    #getIconName() {
        if (!this.#issue) {
            return 'issue-questionmark-filled';
        }
        const iconName = getIssueKindIconName(this.#issue.getKind());
        return iconName;
    }
    #render() {
        return RenderCoordinator.write(() => {
            // clang-format off
            Lit.render(html `
      <style>${IssueLinkIconStyles}</style>
      <button class=${Lit.Directives.classMap({ link: Boolean(this.#issue) })}
              title=${this.#getTooltip()}
              jslog=${VisualLogging.link('issue').track({ click: true })}
              @click=${this.handleClick}>
        <devtools-icon name=${this.#getIconName()}></devtools-icon>
      </button>`, this.#shadow, { host: this });
            // clang-format on
        });
    }
}
customElements.define('devtools-issue-link-icon', IssueLinkIcon);
//# sourceMappingURL=IssueLinkIcon.js.map