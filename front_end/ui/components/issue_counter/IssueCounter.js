// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import '../icon_button/icon_button.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import { html, render } from '../../lit/lit.js';
import issueCounterStyles from './issueCounter.css.js';
const UIStrings = {
    /**
     * @description Label for link to Issues tab, specifying how many issues there are.
     */
    pageErrors: '{issueCount, plural, =1 {# page error} other {# page errors}}',
    /**
     * @description Label for link to Issues tab, specifying how many issues there are.
     */
    breakingChanges: '{issueCount, plural, =1 {# breaking change} other {# breaking changes}}',
    /**
     * @description Label for link to Issues tab, specifying how many issues there are.
     */
    possibleImprovements: '{issueCount, plural, =1 {# possible improvement} other {# possible improvements}}',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/issue_counter/IssueCounter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function getIssueKindIconName(issueKind) {
    switch (issueKind) {
        case "PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */:
            return 'issue-cross-filled';
        case "BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */:
            return 'issue-exclamation-filled';
        case "Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */:
            return 'issue-text-filled';
    }
}
function toIconGroup(iconName, sizeOverride) {
    if (sizeOverride) {
        return { iconName, iconWidth: sizeOverride, iconHeight: sizeOverride };
    }
    return { iconName };
}
// Lazily instantiate the formatter as the constructor takes 50ms+
// TODO: move me and others like me to i18n module
const listFormatter = (function defineFormatter() {
    let intlListFormat;
    return {
        format(...args) {
            if (!intlListFormat) {
                const opts = { type: 'unit', style: 'short' };
                intlListFormat = new Intl.ListFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, opts);
            }
            return intlListFormat.format(...args);
        },
    };
})();
export function getIssueCountsEnumeration(issuesManager, omitEmpty = true) {
    const counts = [
        issuesManager.numberOfIssues("PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */),
        issuesManager.numberOfIssues("BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */),
        issuesManager.numberOfIssues("Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */),
    ];
    const phrases = [
        i18nString(UIStrings.pageErrors, { issueCount: counts[0] }),
        i18nString(UIStrings.breakingChanges, { issueCount: counts[1] }),
        i18nString(UIStrings.possibleImprovements, { issueCount: counts[2] }),
    ];
    return listFormatter.format(phrases.filter((_, i) => omitEmpty ? counts[i] > 0 : true));
}
export class IssueCounter extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #clickHandler = undefined;
    #tooltipCallback = undefined;
    #leadingText = '';
    #throttler;
    #counts = [0, 0, 0];
    #displayMode = "OmitEmpty" /* DisplayMode.OMIT_EMPTY */;
    #issuesManager = undefined;
    #accessibleName = undefined;
    #throttlerTimeout;
    #compact = false;
    scheduleUpdate() {
        if (this.#throttler) {
            void this.#throttler.schedule(async () => this.#render());
        }
        else {
            this.#render();
        }
    }
    set data(data) {
        this.#clickHandler = data.clickHandler;
        this.#leadingText = data.leadingText ?? '';
        this.#tooltipCallback = data.tooltipCallback;
        this.#displayMode = data.displayMode ?? "OmitEmpty" /* DisplayMode.OMIT_EMPTY */;
        this.#accessibleName = data.accessibleName;
        this.#throttlerTimeout = data.throttlerTimeout;
        this.#compact = Boolean(data.compact);
        if (this.#issuesManager !== data.issuesManager) {
            this.#issuesManager?.removeEventListener("IssuesCountUpdated" /* IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED */, this.scheduleUpdate, this);
            this.#issuesManager = data.issuesManager;
            this.#issuesManager.addEventListener("IssuesCountUpdated" /* IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED */, this.scheduleUpdate, this);
        }
        if (data.throttlerTimeout !== 0) {
            this.#throttler = new Common.Throttler.Throttler(data.throttlerTimeout ?? 100);
        }
        else {
            this.#throttler = undefined;
        }
        this.scheduleUpdate();
    }
    get data() {
        return {
            clickHandler: this.#clickHandler,
            leadingText: this.#leadingText,
            tooltipCallback: this.#tooltipCallback,
            displayMode: this.#displayMode,
            accessibleName: this.#accessibleName,
            throttlerTimeout: this.#throttlerTimeout,
            compact: this.#compact,
            issuesManager: this.#issuesManager,
        };
    }
    #render() {
        if (!this.#issuesManager) {
            return;
        }
        this.#counts = [
            this.#issuesManager.numberOfIssues("PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */),
            this.#issuesManager.numberOfIssues("BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */),
            this.#issuesManager.numberOfIssues("Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */),
        ];
        const importance = [
            "PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */,
            "BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */,
            "Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */,
        ];
        const mostImportant = importance[this.#counts.findIndex(x => x > 0) ?? 2];
        const countToString = (kind, count) => {
            switch (this.#displayMode) {
                case "OmitEmpty" /* DisplayMode.OMIT_EMPTY */:
                    return count > 0 ? `${count}` : undefined;
                case "ShowAlways" /* DisplayMode.SHOW_ALWAYS */:
                    return `${count}`;
                case "OnlyMostImportant" /* DisplayMode.ONLY_MOST_IMPORTANT */:
                    return kind === mostImportant ? `${count}` : undefined;
            }
        };
        const iconSize = '2ex';
        const data = {
            groups: [
                {
                    ...toIconGroup(getIssueKindIconName("PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */), iconSize),
                    text: countToString("PageError" /* IssuesManager.Issue.IssueKind.PAGE_ERROR */, this.#counts[0]),
                },
                {
                    ...toIconGroup(getIssueKindIconName("BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */), iconSize),
                    text: countToString("BreakingChange" /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */, this.#counts[1]),
                },
                {
                    ...toIconGroup(getIssueKindIconName("Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */), iconSize),
                    text: countToString("Improvement" /* IssuesManager.Issue.IssueKind.IMPROVEMENT */, this.#counts[2]),
                },
            ],
            clickHandler: this.#clickHandler,
            leadingText: this.#leadingText,
            accessibleName: this.#accessibleName,
            compact: this.#compact,
        };
        render(html `
        <style>${issueCounterStyles}</style>
        <icon-button .data=${data} .accessibleName=${this.#accessibleName}></icon-button>
        `, this.#shadow, { host: this });
        this.#tooltipCallback?.();
    }
}
customElements.define('devtools-issue-counter', IssueCounter);
//# sourceMappingURL=IssueCounter.js.map