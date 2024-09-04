// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {HiddenIssuesRow} from './HiddenIssuesRow.js';
import {
  type AggregatedIssue,
  type AggregationKey,
  Events as IssueAggregatorEvents,
  IssueAggregator,
} from './IssueAggregator.js';
import {getGroupIssuesByKindSetting, IssueKindView, issueKindViewSortPriority} from './IssueKindView.js';
import issuesPaneStyles from './issuesPane.css.js';
import issuesTreeStyles from './issuesTree.css.js';
import {IssueView} from './IssueView.js';

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
  onlyThirdpartyCookieIssues: 'Only third-party cookie issues detected so far',
  /**
   * @description Label in the issues panel
   */
  noIssuesDetectedSoFar: 'No issues detected so far',
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
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/IssuesPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class IssueCategoryView extends UI.TreeOutline.TreeElement {
  #category: IssuesManager.Issue.IssueCategory;

  constructor(category: IssuesManager.Issue.IssueCategory) {
    super();
    this.#category = category;

    this.toggleOnClick = true;
    this.listItemElement.classList.add('issue-category');
    this.childrenListElement.classList.add('issue-category-body');
  }

  getCategoryName(): string {
    switch (this.#category) {
      case IssuesManager.Issue.IssueCategory.CROSS_ORIGIN_EMBEDDER_POLICY:
        return i18nString(UIStrings.crossOriginEmbedderPolicy);
      case IssuesManager.Issue.IssueCategory.MIXED_CONTENT:
        return i18nString(UIStrings.mixedContent);
      case IssuesManager.Issue.IssueCategory.COOKIE:
        return i18nString(UIStrings.samesiteCookie);
      case IssuesManager.Issue.IssueCategory.HEAVY_AD:
        return i18nString(UIStrings.heavyAds);
      case IssuesManager.Issue.IssueCategory.CONTENT_SECURITY_POLICY:
        return i18nString(UIStrings.contentSecurityPolicy);
      case IssuesManager.Issue.IssueCategory.LOW_TEXT_CONTRAST:
        return i18nString(UIStrings.lowTextContrast);
      case IssuesManager.Issue.IssueCategory.CORS:
        return i18nString(UIStrings.cors);
      case IssuesManager.Issue.IssueCategory.ATTRIBUTION_REPORTING:
        return i18nString(UIStrings.attributionReporting);
      case IssuesManager.Issue.IssueCategory.QUIRKS_MODE:
        return i18nString(UIStrings.quirksMode);
      case IssuesManager.Issue.IssueCategory.GENERIC:
        return i18nString(UIStrings.generic);
      case IssuesManager.Issue.IssueCategory.OTHER:
        return i18nString(UIStrings.other);
    }
  }

  override onattach(): void {
    this.#appendHeader();
  }

  #appendHeader(): void {
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
  return Common.Settings.Settings.instance().createSetting('group-issues-by-category', false);
}

export class IssuesPane extends UI.Widget.VBox {
  #categoryViews: Map<IssuesManager.Issue.IssueCategory, IssueCategoryView>;
  #issueViews: Map<AggregationKey, IssueView>;
  #kindViews: Map<IssuesManager.Issue.IssueKind, IssueKindView>;
  #showThirdPartyCheckbox: UI.Toolbar.ToolbarSettingCheckbox|null;
  #issuesTree: UI.TreeOutline.TreeOutlineInShadow;
  #hiddenIssuesRow: HiddenIssuesRow;
  #noIssuesMessageDiv: HTMLDivElement;
  #issuesManager: IssuesManager.IssuesManager.IssuesManager;
  #aggregator: IssueAggregator;
  #issueViewUpdatePromise: Promise<void> = Promise.resolve();

  constructor() {
    super(true);

    this.element.setAttribute('jslog', `${VisualLogging.panel('issues')}`);

    this.contentElement.classList.add('issues-pane');

    this.#categoryViews = new Map();
    this.#kindViews = new Map();
    this.#issueViews = new Map();
    this.#showThirdPartyCheckbox = null;

    this.#createToolbars();

    this.#issuesTree = new UI.TreeOutline.TreeOutlineInShadow();

    this.#issuesTree.setShowSelectionOnKeyboardFocus(true);
    this.#issuesTree.contentElement.classList.add('issues');
    this.contentElement.appendChild(this.#issuesTree.element);

    this.#hiddenIssuesRow = new HiddenIssuesRow();
    this.#issuesTree.appendChild(this.#hiddenIssuesRow);

    this.#noIssuesMessageDiv = document.createElement('div');
    this.#noIssuesMessageDiv.classList.add('issues-pane-no-issues');
    this.contentElement.appendChild(this.#noIssuesMessageDiv);

    this.#issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    this.#aggregator = new IssueAggregator(this.#issuesManager);
    this.#aggregator.addEventListener(IssueAggregatorEvents.AGGREGATED_ISSUE_UPDATED, this.#issueUpdated, this);
    this.#aggregator.addEventListener(IssueAggregatorEvents.FULL_UPDATE_REQUIRED, this.#onFullUpdate, this);
    this.#hiddenIssuesRow.hidden = this.#issuesManager.numberOfHiddenIssues() === 0;
    this.#onFullUpdate();
    this.#issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED, this.#updateCounts, this);
  }

  override elementsToRestoreScrollPositionsFor(): Element[] {
    return [this.#issuesTree.element];
  }

  #createToolbars(): {toolbarContainer: Element} {
    const toolbarContainer = this.contentElement.createChild('div', 'issues-toolbar-container');
    toolbarContainer.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    new UI.Toolbar.Toolbar('issues-toolbar-left', toolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('issues-toolbar-right', toolbarContainer);

    const groupByCategorySetting = getGroupIssuesByCategorySetting();
    const groupByCategoryCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        groupByCategorySetting, i18nString(UIStrings.groupDisplayedIssuesUnder), i18nString(UIStrings.groupByCategory));
    // Hide the option to toggle category grouping for now.
    groupByCategoryCheckbox.setVisible(false);
    rightToolbar.appendToolbarItem(groupByCategoryCheckbox);
    groupByCategorySetting.addChangeListener(() => {
      this.#fullUpdate(true);
    });

    const groupByKindSetting = getGroupIssuesByKindSetting();
    const groupByKindSettingCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        groupByKindSetting, i18nString(UIStrings.groupDisplayedIssuesUnderKind), i18nString(UIStrings.groupByKind));
    rightToolbar.appendToolbarItem(groupByKindSettingCheckbox);
    groupByKindSetting.addChangeListener(() => {
      this.#fullUpdate(true);
    });
    groupByKindSettingCheckbox.setVisible(true);

    const thirdPartySetting = IssuesManager.Issue.getShowThirdPartyIssuesSetting();
    this.#showThirdPartyCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        thirdPartySetting, i18nString(UIStrings.includeCookieIssuesCausedBy),
        i18nString(UIStrings.includeThirdpartyCookieIssues));
    rightToolbar.appendToolbarItem(this.#showThirdPartyCheckbox);
    this.setDefaultFocusedElement(this.#showThirdPartyCheckbox.inputElement);

    rightToolbar.appendSeparator();
    const issueCounter = new IssueCounter.IssueCounter.IssueCounter();
    issueCounter.data = {
      tooltipCallback: () => {
        const issueEnumeration = IssueCounter.IssueCounter.getIssueCountsEnumeration(
            IssuesManager.IssuesManager.IssuesManager.instance(), false);
        issueCounter.title = issueEnumeration;
      },
      displayMode: IssueCounter.IssueCounter.DisplayMode.SHOW_ALWAYS,
      issuesManager: IssuesManager.IssuesManager.IssuesManager.instance(),
    };
    issueCounter.id = 'console-issues-counter';
    issueCounter.setAttribute('jslog', `${VisualLogging.counter('issues')}`);
    const issuesToolbarItem = new UI.Toolbar.ToolbarItem(issueCounter);
    rightToolbar.appendToolbarItem(issuesToolbarItem);

    return {toolbarContainer};
  }

  #issueUpdated(event: Common.EventTarget.EventTargetEvent<AggregatedIssue>): void {
    this.#scheduleIssueViewUpdate(event.data);
  }

  #scheduleIssueViewUpdate(issue: AggregatedIssue): void {
    this.#issueViewUpdatePromise = this.#issueViewUpdatePromise.then(() => this.#updateIssueView(issue));
  }

  /** Don't call directly. Use `scheduleIssueViewUpdate` instead. */
  async #updateIssueView(issue: AggregatedIssue): Promise<void> {
    let issueView = this.#issueViews.get(issue.aggregationKey());
    if (!issueView) {
      const description = issue.getDescription();
      if (!description) {
        console.warn('Could not find description for issue code:', issue.code());
        return;
      }
      const markdownDescription =
          await IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromMarkdown(description);
      issueView = new IssueView(issue, markdownDescription);
      this.#issueViews.set(issue.aggregationKey(), issueView);
      const parent = this.#getIssueViewParent(issue);
      this.appendIssueViewToParent(issueView, parent);
    } else {
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

  appendIssueViewToParent(issueView: IssueView, parent: UI.TreeOutline.TreeOutline|UI.TreeOutline.TreeElement): void {
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

  #updateItemPositionAndSize(parent: UI.TreeOutline.TreeElement): void {
    const childNodes = parent.childrenListNode.children;
    let treeItemCount = 0;

    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      if (node.classList.contains('issue')) {
        UI.ARIAUtils.setPositionInSet(node, ++treeItemCount);
        UI.ARIAUtils.setSetSize(node, childNodes.length / 2);  // Each issue has 2 nodes (issue + description).
      }
    }
  }

  #getIssueViewParent(issue: AggregatedIssue): UI.TreeOutline.TreeOutline|UI.TreeOutline.TreeElement {
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

  #clearViews<T>(views: Map<T, UI.TreeOutline.TreeElement>, preservedSet?: Set<T>): void {
    for (const [key, view] of Array.from(views.entries())) {
      if (preservedSet?.has(key)) {
        continue;
      }
      view.parent && view.parent.removeChild(view);
      views.delete(key);
    }
  }

  #onFullUpdate(): void {
    this.#fullUpdate(false);
  }

  #fullUpdate(force: boolean): void {
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

  #updateIssueKindViewsCount(): void {
    for (const view of this.#kindViews.values()) {
      const count = this.#issuesManager.numberOfIssues(view.getKind());
      view.update(count);
    }
  }

  #updateCounts(): void {
    this.#showIssuesTreeOrNoIssuesDetectedMessage(
        this.#issuesManager.numberOfIssues(), this.#issuesManager.numberOfHiddenIssues());
    if (getGroupIssuesByKindSetting().get()) {
      this.#updateIssueKindViewsCount();
    }
  }

  #showIssuesTreeOrNoIssuesDetectedMessage(issuesCount: number, hiddenIssueCount: number): void {
    if (issuesCount > 0 || hiddenIssueCount > 0) {
      this.#hiddenIssuesRow.hidden = hiddenIssueCount === 0;
      this.#hiddenIssuesRow.update(hiddenIssueCount);
      this.#issuesTree.element.hidden = false;
      this.#noIssuesMessageDiv.style.display = 'none';
      const firstChild = this.#issuesTree.firstChild();
      if (firstChild) {
        firstChild.select(/* omitFocus= */ true);
        this.setDefaultFocusedElement(firstChild.listItemElement);
      }
    } else {
      this.#issuesTree.element.hidden = true;
      if (this.#showThirdPartyCheckbox) {
        this.setDefaultFocusedElement(this.#showThirdPartyCheckbox.inputElement);
      }
      // We alreay know that issesCount is zero here.
      const hasOnlyThirdPartyIssues = this.#issuesManager.numberOfAllStoredIssues() > 0;
      this.#noIssuesMessageDiv.textContent = hasOnlyThirdPartyIssues ?
          i18nString(UIStrings.onlyThirdpartyCookieIssues) :
          i18nString(UIStrings.noIssuesDetectedSoFar);
      this.#noIssuesMessageDiv.style.display = 'flex';
    }
  }

  async reveal(issue: IssuesManager.Issue.Issue): Promise<void> {
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

  override wasShown(): void {
    super.wasShown();
    this.#issuesTree.registerCSSFiles([issuesTreeStyles]);
    this.registerCSSFiles([issuesPaneStyles]);
  }
}
