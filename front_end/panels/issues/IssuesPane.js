// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { HiddenIssuesRow } from './HiddenIssuesRow.js';
import { getGroupIssuesByKindSetting, IssueKindView, issueKindViewSortPriority } from './IssueKindView.js';
import issuesPaneStyles from './issuesPane.css.js';
import issuesTreeStyles from './issuesTree.css.js';
import { IssueView } from './IssueView.js';
const UIStrings = {
    /**
     * @description Category title for a group of cross origin embedder policy (COEP) issues
     */
    crossOriginEmbedderPolicy: 'Cross Origin Embedder Policy',
    /**
     * @description Category title for a group of mixed content issues
     */
    mixedContent: 'Mixed Content',
    /**
     * @description Category title for a group of SameSite cookie issues
     */
    samesiteCookie: 'SameSite Cookie',
    /**
     * @description Category title for a group of heavy ads issues
     */
    heavyAds: 'Heavy Ads',
    /**
     * @description Category title for a group of content security policy (CSP) issues
     */
    contentSecurityPolicy: 'Content Security Policy',
    /**
     * @description Text for other types of items
     */
    other: 'Other',
    /**
     * @description Category title for the different 'low text contrast' issues. Low text contrast refers
     *              to the difference between the color of a text and the background color where that text
     *              appears.
     */
    lowTextContrast: 'Low Text Contrast',
    /**
     * @description Category title for the different 'Cross-Origin Resource Sharing' (CORS) issues. CORS
     *              refers to one origin (e.g 'a.com') loading resources from another origin (e.g. 'b.com').
     */
    cors: 'Cross Origin Resource Sharing',
    /**
     * @description Title for a checkbox which toggles grouping by category in the issues tab
     */
    groupDisplayedIssuesUnder: 'Group displayed issues under associated categories',
    /**
     * @description Label for a checkbox which toggles grouping by category in the issues tab
     */
    groupByCategory: 'Group by category',
    /**
     * @description Title for a checkbox which toggles grouping by kind in the issues tab
     */
    groupDisplayedIssuesUnderKind: 'Group displayed issues as Page errors, Breaking changes and Improvements',
    /**
     * @description Label for a checkbox which toggles grouping by kind in the issues tab
     */
    groupByKind: 'Group by kind',
    /**
     * @description Title for a checkbox. Whether the issues tab should include third-party issues or not.
     */
    includeCookieIssuesCausedBy: 'Include cookie Issues caused by third-party sites',
    /**
     * @description Label for a checkbox. Whether the issues tab should include third-party issues or not.
     */
    includeThirdpartyCookieIssues: 'Include third-party cookie issues',
    /**
     * @description Label on the issues tab
     */
    onlyThirdpartyCookieIssues: 'Only third-party cookie issues detected',
    /**
     * @description Label in the issues panel
     */
    noIssues: 'No issues detected',
    /**
     * @description Text that explains the issues panel that is shown if no issues are shown.
     */
    issuesPanelDescription: 'On this page you can find warnings from the browser.',
    /**
     * @description Category title for the different 'Attribution Reporting API' issues. The
     * Attribution Reporting API is a newly proposed web API (see https://github.com/WICG/conversion-measurement-api).
     */
    attributionReporting: 'Attribution Reporting `API`',
    /**
     * @description Category title for the different 'Quirks Mode' issues. Quirks Mode refers
     *              to the legacy browser modes that displays web content according to outdated
     *              browser behaviors.
     */
    quirksMode: 'Quirks Mode',
    /**
     * @description Category title for the different 'Generic' issues.
     */
    generic: 'Generic',
    /**
     * @description Category title for a group of permission element issues
     */
    permissionElement: 'PEPC Element',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/IssuesPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const ISSUES_PANEL_EXPLANATION_URL = 'https://developer.chrome.com/docs/devtools/issues';
class IssueCategoryView extends UI.TreeOutline.TreeElement {
    #category;
    constructor(category) {
        super();
        this.#category = category;
        this.toggleOnClick = true;
        this.listItemElement.classList.add('issue-category');
        this.childrenListElement.classList.add('issue-category-body');
    }
    getCategoryName() {
        switch (this.#category) {
            case "CrossOriginEmbedderPolicy" /* IssuesManager.Issue.IssueCategory.CROSS_ORIGIN_EMBEDDER_POLICY */:
                return i18nString(UIStrings.crossOriginEmbedderPolicy);
            case "MixedContent" /* IssuesManager.Issue.IssueCategory.MIXED_CONTENT */:
                return i18nString(UIStrings.mixedContent);
            case "Cookie" /* IssuesManager.Issue.IssueCategory.COOKIE */:
                return i18nString(UIStrings.samesiteCookie);
            case "HeavyAd" /* IssuesManager.Issue.IssueCategory.HEAVY_AD */:
                return i18nString(UIStrings.heavyAds);
            case "ContentSecurityPolicy" /* IssuesManager.Issue.IssueCategory.CONTENT_SECURITY_POLICY */:
                return i18nString(UIStrings.contentSecurityPolicy);
            case "LowTextContrast" /* IssuesManager.Issue.IssueCategory.LOW_TEXT_CONTRAST */:
                return i18nString(UIStrings.lowTextContrast);
            case "Cors" /* IssuesManager.Issue.IssueCategory.CORS */:
                return i18nString(UIStrings.cors);
            case "AttributionReporting" /* IssuesManager.Issue.IssueCategory.ATTRIBUTION_REPORTING */:
                return i18nString(UIStrings.attributionReporting);
            case "QuirksMode" /* IssuesManager.Issue.IssueCategory.QUIRKS_MODE */:
                return i18nString(UIStrings.quirksMode);
            case "Generic" /* IssuesManager.Issue.IssueCategory.GENERIC */:
                return i18nString(UIStrings.generic);
            case "PermissionElement" /* IssuesManager.Issue.IssueCategory.PERMISSION_ELEMENT */:
                return i18nString(UIStrings.permissionElement);
            case "Other" /* IssuesManager.Issue.IssueCategory.OTHER */:
                return i18nString(UIStrings.other);
        }
    }
    onattach() {
        this.#appendHeader();
    }
    #appendHeader() {
        const header = document.createElement('div');
        header.classList.add('header');
        const title = document.createElement('div');
        title.classList.add('title');
        title.textContent = this.getCategoryName();
        header.appendChild(title);
        this.listItemElement.appendChild(header);
    }
}
export function getGroupIssuesByCategorySetting() {
    return Common.Settings.Settings.instance().createSetting('group-issues-by-category', false);
}
export class IssuesPane extends UI.Widget.VBox {
    #categoryViews;
    #issueViews;
    #kindViews;
    #showThirdPartyCheckbox;
    #issuesTree;
    #hiddenIssuesRow;
    #noIssuesMessageDiv;
    #issuesManager;
    #aggregator;
    #issueViewUpdatePromise = Promise.resolve();
    constructor() {
        super({
            jslog: `${VisualLogging.panel('issues')}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(issuesPaneStyles);
        this.contentElement.classList.add('issues-pane');
        this.#categoryViews = new Map();
        this.#kindViews = new Map();
        this.#issueViews = new Map();
        this.#showThirdPartyCheckbox = null;
        this.#createToolbars();
        this.#issuesTree = new UI.TreeOutline.TreeOutlineInShadow();
        this.#issuesTree.setShowSelectionOnKeyboardFocus(true);
        this.#issuesTree.contentElement.classList.add('issues');
        this.#issuesTree.registerRequiredCSS(issuesTreeStyles);
        this.contentElement.appendChild(this.#issuesTree.element);
        this.#hiddenIssuesRow = new HiddenIssuesRow();
        this.#issuesTree.appendChild(this.#hiddenIssuesRow);
        this.#noIssuesMessageDiv = new UI.EmptyWidget.EmptyWidget('', i18nString(UIStrings.issuesPanelDescription));
        this.#noIssuesMessageDiv.link = ISSUES_PANEL_EXPLANATION_URL;
        this.#noIssuesMessageDiv.show(this.contentElement);
        this.#issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
        this.#aggregator = new IssuesManager.IssueAggregator.IssueAggregator(this.#issuesManager);
        this.#aggregator.addEventListener("AggregatedIssueUpdated" /* IssuesManager.IssueAggregator.Events.AGGREGATED_ISSUE_UPDATED */, this.#issueUpdated, this);
        this.#aggregator.addEventListener("FullUpdateRequired" /* IssuesManager.IssueAggregator.Events.FULL_UPDATE_REQUIRED */, this.#onFullUpdate, this);
        this.#hiddenIssuesRow.hidden = this.#issuesManager.numberOfHiddenIssues() === 0;
        this.#onFullUpdate();
        this.#issuesManager.addEventListener("IssuesCountUpdated" /* IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED */, this.#updateCounts, this);
    }
    elementsToRestoreScrollPositionsFor() {
        return [this.#issuesTree.element];
    }
    #createToolbars() {
        const toolbarContainer = this.contentElement.createChild('div', 'issues-toolbar-container');
        toolbarContainer.setAttribute('jslog', `${VisualLogging.toolbar()}`);
        toolbarContainer.role = 'toolbar';
        const leftToolbar = toolbarContainer.createChild('devtools-toolbar', 'issues-toolbar-left');
        leftToolbar.role = 'presentation';
        const rightToolbar = toolbarContainer.createChild('devtools-toolbar', 'issues-toolbar-right');
        rightToolbar.role = 'presentation';
        const groupByCategorySetting = getGroupIssuesByCategorySetting();
        const groupByCategoryCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(groupByCategorySetting, i18nString(UIStrings.groupDisplayedIssuesUnder), i18nString(UIStrings.groupByCategory));
        // Hide the option to toggle category grouping for now.
        groupByCategoryCheckbox.setVisible(false);
        rightToolbar.appendToolbarItem(groupByCategoryCheckbox);
        groupByCategorySetting.addChangeListener(() => {
            this.#fullUpdate(true);
        });
        const groupByKindSetting = getGroupIssuesByKindSetting();
        const groupByKindSettingCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(groupByKindSetting, i18nString(UIStrings.groupDisplayedIssuesUnderKind), i18nString(UIStrings.groupByKind));
        rightToolbar.appendToolbarItem(groupByKindSettingCheckbox);
        groupByKindSetting.addChangeListener(() => {
            this.#fullUpdate(true);
        });
        groupByKindSettingCheckbox.setVisible(true);
        const thirdPartySetting = IssuesManager.Issue.getShowThirdPartyIssuesSetting();
        this.#showThirdPartyCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(thirdPartySetting, i18nString(UIStrings.includeCookieIssuesCausedBy), i18nString(UIStrings.includeThirdpartyCookieIssues));
        rightToolbar.appendToolbarItem(this.#showThirdPartyCheckbox);
        this.setDefaultFocusedElement(this.#showThirdPartyCheckbox.element);
        rightToolbar.appendSeparator();
        const issueCounter = new IssueCounter.IssueCounter.IssueCounter();
        issueCounter.data = {
            clickHandler: () => {
                this.focus();
            },
            tooltipCallback: () => {
                const issueEnumeration = IssueCounter.IssueCounter.getIssueCountsEnumeration(IssuesManager.IssuesManager.IssuesManager.instance(), false);
                issueCounter.title = issueEnumeration;
            },
            displayMode: "ShowAlways" /* IssueCounter.IssueCounter.DisplayMode.SHOW_ALWAYS */,
            issuesManager: IssuesManager.IssuesManager.IssuesManager.instance(),
        };
        issueCounter.id = 'console-issues-counter';
        issueCounter.setAttribute('jslog', `${VisualLogging.counter('issues')}`);
        const issuesToolbarItem = new UI.Toolbar.ToolbarItem(issueCounter);
        rightToolbar.appendToolbarItem(issuesToolbarItem);
        return { toolbarContainer };
    }
    #issueUpdated(event) {
        this.#scheduleIssueViewUpdate(event.data);
    }
    #scheduleIssueViewUpdate(issue) {
        this.#issueViewUpdatePromise = this.#issueViewUpdatePromise.then(() => this.#updateIssueView(issue));
    }
    /** Don't call directly. Use `scheduleIssueViewUpdate` instead. */
    async #updateIssueView(issue) {
        let issueView = this.#issueViews.get(issue.aggregationKey());
        if (!issueView) {
            const description = issue.getDescription();
            if (!description) {
                console.warn('Could not find description for issue code:', issue.code());
                return;
            }
            const markdownDescription = await IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromMarkdown(description);
            issueView = new IssueView(issue, markdownDescription);
            this.#issueViews.set(issue.aggregationKey(), issueView);
            const parent = this.#getIssueViewParent(issue);
            this.appendIssueViewToParent(issueView, parent);
        }
        else {
            issueView.setIssue(issue);
            const newParent = this.#getIssueViewParent(issue);
            if (issueView.parent !== newParent &&
                !(newParent instanceof UI.TreeOutline.TreeOutline && issueView.parent === newParent.rootElement())) {
                issueView.parent?.removeChild(issueView);
                this.appendIssueViewToParent(issueView, newParent);
            }
        }
        issueView.update();
        this.#updateCounts();
    }
    appendIssueViewToParent(issueView, parent) {
        parent.appendChild(issueView, (a, b) => {
            if (a instanceof HiddenIssuesRow) {
                return 1;
            }
            if (b instanceof HiddenIssuesRow) {
                return -1;
            }
            if (a instanceof IssueView && b instanceof IssueView) {
                return a.getIssueTitle().localeCompare(b.getIssueTitle());
            }
            console.error('The issues tree should only contain IssueView objects as direct children');
            return 0;
        });
        if (parent instanceof UI.TreeOutline.TreeElement) {
            // This is an aggregated view, so we need to update the label for position and size of the treeItem.
            this.#updateItemPositionAndSize(parent);
        }
    }
    #updateItemPositionAndSize(parent) {
        const childNodes = parent.childrenListNode.children;
        let treeItemCount = 0;
        for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];
            if (node.classList.contains('issue')) {
                UI.ARIAUtils.setPositionInSet(node, ++treeItemCount);
                UI.ARIAUtils.setSetSize(node, childNodes.length / 2); // Each issue has 2 nodes (issue + description).
            }
        }
    }
    #getIssueViewParent(issue) {
        if (issue.isHidden()) {
            return this.#hiddenIssuesRow;
        }
        if (getGroupIssuesByKindSetting().get()) {
            const kind = issue.getKind();
            const view = this.#kindViews.get(kind);
            if (view) {
                return view;
            }
            const newView = new IssueKindView(kind);
            this.#issuesTree.appendChild(newView, (a, b) => {
                if (a instanceof IssueKindView && b instanceof IssueKindView) {
                    return issueKindViewSortPriority(a, b);
                }
                return 0;
            });
            this.#kindViews.set(kind, newView);
            return newView;
        }
        if (getGroupIssuesByCategorySetting().get()) {
            const category = issue.getCategory();
            const view = this.#categoryViews.get(category);
            if (view) {
                return view;
            }
            const newView = new IssueCategoryView(category);
            this.#issuesTree.appendChild(newView, (a, b) => {
                if (a instanceof IssueCategoryView && b instanceof IssueCategoryView) {
                    return a.getCategoryName().localeCompare(b.getCategoryName());
                }
                return 0;
            });
            this.#categoryViews.set(category, newView);
            return newView;
        }
        return this.#issuesTree;
    }
    #clearViews(views, preservedSet) {
        for (const [key, view] of Array.from(views.entries())) {
            if (preservedSet?.has(key)) {
                continue;
            }
            view.parent?.removeChild(view);
            views.delete(key);
        }
    }
    #onFullUpdate() {
        this.#fullUpdate(false);
    }
    #fullUpdate(force) {
        this.#clearViews(this.#categoryViews, force ? undefined : this.#aggregator.aggregatedIssueCategories());
        this.#clearViews(this.#kindViews, force ? undefined : this.#aggregator.aggregatedIssueKinds());
        this.#clearViews(this.#issueViews, force ? undefined : this.#aggregator.aggregatedIssueCodes());
        if (this.#aggregator) {
            for (const issue of this.#aggregator.aggregatedIssues()) {
                this.#scheduleIssueViewUpdate(issue);
            }
        }
        this.#updateCounts();
    }
    #updateIssueKindViewsCount() {
        for (const view of this.#kindViews.values()) {
            const count = this.#issuesManager.numberOfIssues(view.getKind());
            view.update(count);
        }
    }
    #updateCounts() {
        this.#showIssuesTreeOrNoIssuesDetectedMessage(this.#issuesManager.numberOfIssues(), this.#issuesManager.numberOfHiddenIssues());
        if (getGroupIssuesByKindSetting().get()) {
            this.#updateIssueKindViewsCount();
        }
    }
    #showIssuesTreeOrNoIssuesDetectedMessage(issuesCount, hiddenIssueCount) {
        if (issuesCount > 0 || hiddenIssueCount > 0) {
            this.#hiddenIssuesRow.hidden = hiddenIssueCount === 0;
            this.#hiddenIssuesRow.update(hiddenIssueCount);
            this.#issuesTree.element.hidden = false;
            this.#noIssuesMessageDiv.hideWidget();
            const firstChild = this.#issuesTree.firstChild();
            if (firstChild) {
                firstChild.select(/* omitFocus= */ true);
                this.setDefaultFocusedElement(firstChild.listItemElement);
            }
        }
        else {
            this.#issuesTree.element.hidden = true;
            if (this.#showThirdPartyCheckbox) {
                this.setDefaultFocusedElement(this.#showThirdPartyCheckbox.element);
            }
            // We alreay know that issesCount is zero here.
            const hasOnlyThirdPartyIssues = this.#issuesManager.numberOfAllStoredIssues() - this.#issuesManager.numberOfThirdPartyCookiePhaseoutIssues() >
                0;
            this.#noIssuesMessageDiv.header =
                hasOnlyThirdPartyIssues ? i18nString(UIStrings.onlyThirdpartyCookieIssues) : i18nString(UIStrings.noIssues);
            this.#noIssuesMessageDiv.showWidget();
        }
    }
    async reveal(issue) {
        await this.#issueViewUpdatePromise;
        const key = this.#aggregator.keyForIssue(issue);
        const issueView = this.#issueViews.get(key);
        if (issueView) {
            if (issueView.isForHiddenIssue()) {
                this.#hiddenIssuesRow.expand();
                this.#hiddenIssuesRow.reveal();
            }
            if (getGroupIssuesByKindSetting().get() && !issueView.isForHiddenIssue()) {
                const kindView = this.#kindViews.get(issueView.getIssueKind());
                kindView?.expand();
                kindView?.reveal();
            }
            issueView.expand();
            issueView.reveal();
            issueView.select(false, true);
        }
    }
}
//# sourceMappingURL=IssuesPane.js.map