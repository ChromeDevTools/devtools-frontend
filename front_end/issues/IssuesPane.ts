// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as WebComponents from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

import type {AggregatedIssue} from './IssueAggregator.js';
import {Events as IssueAggregatorEvents, IssueAggregator} from './IssueAggregator.js';
import {IssueView} from './IssueView.js';
import {createIssueDescriptionFromMarkdown} from './MarkdownIssueDescription.js';

export const UIStrings = {
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
   * @description Category title for a group of trusted web activity issues
   */
  trustedWebActivity: 'Trusted Web Activity',
  /**
   * @description Text for other types of items
   */
  other: 'Other',
  /**
   * @description Title for a checkbox which toggles grouping by category in the issues tab
   */
  groupDisplayedIssuesUnder: 'Group displayed issues under associated categories',
  /**
   * @description Label for a checkbox which toggles grouping by category in the issues tab
   */
  groupByCategory: 'Group by category',
  /**
   * @description Title for a checkbox. Whether the issues tab should include third-party issues or not.
   */
  includeCookieIssuesCausedBy: 'Include cookie Issues caused by third-party sites',
  /**
   * @description Label for a checkbox. Whether the issues tab should include third-party issues or not.
   */
  includeThirdpartyCookieIssues: 'Include third-party cookie issues',
  /**
   * @description Tooltip shown for the issues count in several places of the UI
   * @example {1} PH1
   */
  issuesPertainingToSOperation: 'Issues pertaining to {PH1} operation detected.',
  /**
   * @description Tooltip shown for the issues count in several places of the UI
   * @example {13} PH1
   */
  issuesPertainingToSOperations: 'Issues pertaining to {PH1} operations detected.',
  /**
   * @description Label on the issues tab
   */
  onlyThirdpartyCookieIssues: 'Only third-party cookie issues detected so far',
  /**
   * @description Label in the issues panel
   */
  noIssuesDetectedSoFar: 'No issues detected so far',
};
const str_ = i18n.i18n.registerUIStrings('issues/IssuesPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/* * @type {!Map<!SDK.Issue.IssueCategory, string>}  */
export const IssueCategoryNames = new Map([
  [SDK.Issue.IssueCategory.CrossOriginEmbedderPolicy, i18nString(UIStrings.crossOriginEmbedderPolicy)],
  [SDK.Issue.IssueCategory.MixedContent, i18nString(UIStrings.mixedContent)],
  [SDK.Issue.IssueCategory.SameSiteCookie, i18nString(UIStrings.samesiteCookie)],
  [SDK.Issue.IssueCategory.HeavyAd, i18nString(UIStrings.heavyAds)],
  [SDK.Issue.IssueCategory.ContentSecurityPolicy, i18nString(UIStrings.contentSecurityPolicy)],
  [SDK.Issue.IssueCategory.TrustedWebActivity, i18nString(UIStrings.trustedWebActivity)],
  [SDK.Issue.IssueCategory.Other, i18nString(UIStrings.other)],
]);

class IssueCategoryView extends UI.TreeOutline.TreeElement {
  private category: SDK.Issue.IssueCategory;
  private issues: AggregatedIssue[];

  constructor(category: SDK.Issue.IssueCategory) {
    super();
    this.category = category;
    this.issues = [];

    this.toggleOnClick = true;
    this.listItemElement.classList.add('issue-category');
  }

  getCategoryName(): string {
    return IssueCategoryNames.get(this.category) || i18nString(UIStrings.other);
  }

  onattach(): void {
    this.appendHeader();
  }

  private appendHeader(): void {
    const header = document.createElement('div');
    header.classList.add('header');

    const title = document.createElement('div');
    title.classList.add('title');
    title.textContent = this.getCategoryName();
    header.appendChild(title);

    this.listItemElement.appendChild(header);
  }
}

export function getGroupIssuesByCategorySetting(): Common.Settings.Setting<boolean> {
  return Common.Settings.Settings.instance().createSetting('groupIssuesByCategory', false);
}

let issuesPaneInstance: IssuesPane;

export class IssuesPane extends UI.Widget.VBox {
  private categoryViews: Map<SDK.Issue.IssueCategory, IssueCategoryView>;
  private issueViews: Map<string, IssueView>;
  private showThirdPartyCheckbox: UI.Toolbar.ToolbarSettingCheckbox|null;
  private updateToolbarIssuesCount: (count: number) => void;
  private issuesTree: UI.TreeOutline.TreeOutlineInShadow;
  private noIssuesMessageDiv: HTMLDivElement;
  private issuesManager: BrowserSDK.IssuesManager.IssuesManager;
  private aggregator: IssueAggregator;

  private constructor() {
    super(true);
    this.registerRequiredCSS('issues/issuesPane.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('issues-pane');

    this.categoryViews = new Map();
    this.issueViews = new Map();
    this.showThirdPartyCheckbox = null;

    const {updateToolbarIssuesCount} = this.createToolbars();
    this.updateToolbarIssuesCount = updateToolbarIssuesCount;

    this.issuesTree = new UI.TreeOutline.TreeOutlineInShadow();
    this.issuesTree.registerRequiredCSS('issues/issuesTree.css', {enableLegacyPatching: true});
    this.issuesTree.setShowSelectionOnKeyboardFocus(true);
    this.issuesTree.contentElement.classList.add('issues');
    this.contentElement.appendChild(this.issuesTree.element);

    this.noIssuesMessageDiv = document.createElement('div');
    this.noIssuesMessageDiv.classList.add('issues-pane-no-issues');
    this.contentElement.appendChild(this.noIssuesMessageDiv);

    this.issuesManager = BrowserSDK.IssuesManager.IssuesManager.instance();
    this.aggregator = new IssueAggregator(this.issuesManager);
    this.aggregator.addEventListener(IssueAggregatorEvents.AggregatedIssueUpdated, this.issueUpdated, this);
    this.aggregator.addEventListener(IssueAggregatorEvents.FullUpdateRequired, this.fullUpdate, this);
    for (const issue of this.aggregator.aggregatedIssues()) {
      this.updateIssueView(issue);
    }
    this.issuesManager.addEventListener(BrowserSDK.IssuesManager.Events.IssuesCountUpdated, this.updateCounts, this);
    this.updateCounts();
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): IssuesPane {
    const {forceNew} = opts;
    if (!issuesPaneInstance || forceNew) {
      issuesPaneInstance = new IssuesPane();
    }

    return issuesPaneInstance;
  }

  elementsToRestoreScrollPositionsFor(): Element[] {
    return [this.issuesTree.element];
  }

  private createToolbars(): {toolbarContainer: Element, updateToolbarIssuesCount: (issueCount: number) => void} {
    const toolbarContainer = this.contentElement.createChild('div', 'issues-toolbar-container');
    new UI.Toolbar.Toolbar('issues-toolbar-left', toolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('issues-toolbar-right', toolbarContainer);

    const groupByCategorySetting = getGroupIssuesByCategorySetting();
    const groupByCategoryCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        groupByCategorySetting, i18nString(UIStrings.groupDisplayedIssuesUnder), i18nString(UIStrings.groupByCategory));
    // Hide the option to toggle category grouping for now.
    groupByCategoryCheckbox.setVisible(false);
    rightToolbar.appendToolbarItem(groupByCategoryCheckbox);
    groupByCategorySetting.addChangeListener(() => {
      this.fullUpdate();
    });

    const thirdPartySetting = SDK.Issue.getShowThirdPartyIssuesSetting();
    this.showThirdPartyCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        thirdPartySetting, i18nString(UIStrings.includeCookieIssuesCausedBy),
        i18nString(UIStrings.includeThirdpartyCookieIssues));
    rightToolbar.appendToolbarItem(this.showThirdPartyCheckbox);
    this.setDefaultFocusedElement(this.showThirdPartyCheckbox.inputElement);

    rightToolbar.appendSeparator();
    const toolbarWarnings = document.createElement('div');
    toolbarWarnings.classList.add('toolbar-warnings');
    const breakingChangeIcon = new WebComponents.Icon.Icon();
    breakingChangeIcon.data = {iconName: 'breaking_change_icon', color: '', width: '16px', height: '16px'};
    breakingChangeIcon.classList.add('breaking-change');
    toolbarWarnings.appendChild(breakingChangeIcon);
    const toolbarIssuesCount = toolbarWarnings.createChild('span', 'warnings-count-label');
    const toolbarIssuesItem = new UI.Toolbar.ToolbarItem(toolbarWarnings);
    rightToolbar.appendToolbarItem(toolbarIssuesItem);
    const updateToolbarIssuesCount = (count: number): void => {
      toolbarIssuesCount.textContent = `${count}`;
      if (count === 1) {
        toolbarIssuesItem.setTitle(i18nString(UIStrings.issuesPertainingToSOperation, {PH1: count}));
      } else {
        toolbarIssuesItem.setTitle(i18nString(UIStrings.issuesPertainingToSOperations, {PH1: count}));
      }
    };
    return {toolbarContainer, updateToolbarIssuesCount};
  }

  private issueUpdated(event: Common.EventTarget.EventTargetEvent): void {
    const issue = event.data as AggregatedIssue;
    this.updateIssueView(issue);
  }

  private updateIssueView(issue: AggregatedIssue): void {
    let issueView = this.issueViews.get(issue.code());
    if (!issueView) {
      const description = issue.getDescription();
      if (!description) {
        console.warn('Could not find description for issue code:', issue.code());
        return;
      }
      const markdownDescription = createIssueDescriptionFromMarkdown(description);
      issueView = new IssueView(this, issue, markdownDescription);
      this.issueViews.set(issue.code(), issueView);
      const parent = this.getIssueViewParent(issue);
      parent.appendChild(issueView, (a, b) => {
        if (a instanceof IssueView && b instanceof IssueView) {
          return a.getIssueTitle().localeCompare(b.getIssueTitle());
        }
        console.error('The issues tree should only contain IssueView objects as direct children');
        return 0;
      });
    }
    issueView.update();
    this.updateCounts();
  }

  private getIssueViewParent(issue: AggregatedIssue): UI.TreeOutline.TreeOutline|UI.TreeOutline.TreeElement {
    if (!getGroupIssuesByCategorySetting().get()) {
      return this.issuesTree;
    }

    const category = issue.getCategory();
    const view = this.categoryViews.get(category);
    if (view) {
      return view;
    }

    const newView = new IssueCategoryView(category);
    this.issuesTree.appendChild(newView, (a, b) => {
      if (a instanceof IssueCategoryView && b instanceof IssueCategoryView) {
        return a.getCategoryName().localeCompare(b.getCategoryName());
      }
      return 0;
    });
    this.categoryViews.set(category, newView);
    return newView;
  }

  private clearViews(views: Map<unknown, UI.TreeOutline.TreeElement>): void {
    for (const view of views.values()) {
      view.parent && view.parent.removeChild(view);
    }
    views.clear();
  }

  private fullUpdate(): void {
    this.clearViews(this.categoryViews);
    this.clearViews(this.issueViews);
    if (this.aggregator) {
      for (const issue of this.aggregator.aggregatedIssues()) {
        this.updateIssueView(issue);
      }
    }
    this.updateCounts();
  }

  private updateCounts(): void {
    const count = this.issuesManager.numberOfIssues();
    this.updateToolbarIssuesCount(count);
    this.showIssuesTreeOrNoIssuesDetectedMessage(count);
  }

  private showIssuesTreeOrNoIssuesDetectedMessage(issuesCount: number): void {
    if (issuesCount > 0) {
      this.issuesTree.element.hidden = false;
      this.noIssuesMessageDiv.style.display = 'none';
      const firstChild = this.issuesTree.firstChild();
      if (firstChild) {
        firstChild.select(/* omitFocus= */ true);
        this.setDefaultFocusedElement(firstChild.listItemElement);
      }
    } else {
      this.issuesTree.element.hidden = true;
      if (this.showThirdPartyCheckbox) {
        this.setDefaultFocusedElement(this.showThirdPartyCheckbox.inputElement);
      }
      // We alreay know that issesCount is zero here.
      const hasOnlyThirdPartyIssues = this.issuesManager.numberOfAllStoredIssues() > 0;
      this.noIssuesMessageDiv.textContent = hasOnlyThirdPartyIssues ? i18nString(UIStrings.onlyThirdpartyCookieIssues) :
                                                                      i18nString(UIStrings.noIssuesDetectedSoFar);
      this.noIssuesMessageDiv.style.display = 'flex';
    }
  }

  revealByCode(code: string): void {
    const issueView = this.issueViews.get(code);
    if (issueView) {
      issueView.expand();
      issueView.reveal();
    }
  }
}
