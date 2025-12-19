// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import { Icon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Components from './components/components.js';
const UIStrings = {
    /**
     * @description Menu entry for hiding all current Page Errors.
     */
    hideAllCurrentPageErrors: 'Hide all current Page Errors',
    /**
     * @description Menu entry for hiding all current Breaking Changes.
     */
    hideAllCurrentBreakingChanges: 'Hide all current Breaking Changes',
    /**
     * @description Menu entry for hiding all current Page Errors.
     */
    hideAllCurrentImprovements: 'Hide all current Improvements',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/IssueKindView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function getGroupIssuesByKindSetting() {
    return Common.Settings.Settings.instance().createSetting('group-issues-by-kind', false);
}
export function issueKindViewSortPriority(a, b) {
    if (a.getKind() === b.getKind()) {
        return 0;
    }
    if (a.getKind() === "PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */) {
        return -1;
    }
    if (a.getKind() === "BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */ &&
        b.getKind() === "Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */) {
        return -1;
    }
    return 1;
}
export function getClassNameFromKind(kind) {
    switch (kind) {
        case "BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */:
            return 'breaking-changes';
        case "Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */:
            return 'improvements';
        case "PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */:
            return 'page-errors';
    }
}
export class IssueKindView extends UI.TreeOutline.TreeElement {
    #kind;
    #issueCount;
    constructor(kind) {
        super(undefined, true);
        this.#kind = kind;
        this.#issueCount = document.createElement('span');
        this.toggleOnClick = true;
        this.listItemElement.classList.add('issue-kind');
        this.listItemElement.classList.add(getClassNameFromKind(kind));
        this.childrenListElement.classList.add('issue-kind-body');
    }
    getKind() {
        return this.#kind;
    }
    getHideAllCurrentKindString() {
        switch (this.#kind) {
            case "PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */:
                return i18nString(UIStrings.hideAllCurrentPageErrors);
            case "Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */:
                return i18nString(UIStrings.hideAllCurrentImprovements);
            case "BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */:
                return i18nString(UIStrings.hideAllCurrentBreakingChanges);
        }
    }
    #appendHeader() {
        const header = document.createElement('div');
        header.classList.add('header');
        const issueKindIcon = new Icon();
        issueKindIcon.name = IssueCounter.IssueCounter.getIssueKindIconName(this.#kind);
        issueKindIcon.classList.add('leading-issue-icon', 'extra-large');
        const countAdorner = new Adorners.Adorner.Adorner();
        countAdorner.name = 'countWrapper';
        countAdorner.append(this.#issueCount);
        countAdorner.classList.add('aggregated-issues-count');
        this.#issueCount.textContent = '0';
        const title = document.createElement('div');
        title.classList.add('title');
        title.textContent = IssuesManager.Issue.getIssueKindName(this.#kind);
        const hideAvailableIssuesBtn = new Components.HideIssuesMenu.HideIssuesMenu();
        hideAvailableIssuesBtn.classList.add('hide-available-issues');
        hideAvailableIssuesBtn.data = {
            menuItemLabel: this.getHideAllCurrentKindString(),
            menuItemAction: () => {
                const setting = IssuesManager.IssuesManager.getHideIssueByCodeSetting();
                const values = setting.get();
                for (const issue of IssuesManager.IssuesManager.IssuesManager.instance().issues()) {
                    if (issue.getKind() === this.#kind) {
                        values[issue.code()] = "Hidden" /* IssuesManager.IssuesManager.IssueStatus.HIDDEN */;
                    }
                }
                setting.set(values);
            },
        };
        header.appendChild(issueKindIcon);
        header.appendChild(countAdorner);
        header.appendChild(title);
        header.appendChild(hideAvailableIssuesBtn);
        this.listItemElement.appendChild(header);
    }
    onattach() {
        this.#appendHeader();
        this.expand();
    }
    update(count) {
        this.#issueCount.textContent = `${count}`;
    }
}
//# sourceMappingURL=IssueKindView.js.map