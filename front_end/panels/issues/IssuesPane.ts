// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {HiddenIssuesRow} from './HiddenIssuesRow.js';
import {getGroupIssuesByKindSetting, IssueKindView, issueKindViewSortPriority} from './IssueKindView.js';
import issuesPaneStyles from './issuesPane.css.js';
import issuesTreeStyles from './issuesTree.css.js';
import {IssueView} from './IssueView.js';

const UIStrings = {
  /**
   * @description Category title in the Issues panel for a group of Cross-Origin Embedder Policy (COEP) issues.
   */
  crossOriginEmbedderPolicy: 'Cross-Origin Embedder Policy',
  /**
   * @description Category title in the Issues panel for a group of mixed content issues.
   */
  mixedContent: 'Mixed content',
  /**
   * @description Category title in the Issues panel for a group of SameSite cookie issues.
   */
  samesiteCookie: 'SameSite cookie',
  /**
   * @description Category title in the Issues panel for a group of heavy ads issues.
   */
  heavyAds: 'Heavy ads',
  /**
   * @description Category title in the Issues panel for a group of Content Security Policy (CSP) issues.
   */
  contentSecurityPolicy: 'Content Security Policy',
  /**
   * @description Category title in the Issues panel for other types of issues.
   */
  other: 'Other',
  /**
   * @description Category title in the Issues panel for a group of low text contrast issues.
   */
  lowTextContrast: 'Low text contrast',
  /**
   * @description Category title in the Issues panel for a group of Cross-Origin Resource Sharing (CORS) issues.
   */
  cors: 'Cross-Origin Resource Sharing',
  /**
   * @description Tooltip in the Issues panel for the checkbox to group issues by category.
   */
  groupDisplayedIssuesUnder: 'Group displayed issues under associated categories',
  /**
   * @description Label in the Issues panel for the checkbox to group issues by category.
   */
  groupByCategory: 'Group by category',
  /**
   * @description Tooltip in the Issues panel for the checkbox to group issues by kind.
   */
  groupDisplayedIssuesUnderKind: 'Group displayed issues as page errors, breaking changes, and improvements',
  /**
   * @description Label in the Issues panel for the checkbox to group issues by kind.
   */
  groupByKind: 'Group by kind',
  /**
   * @description Tooltip in the Issues panel for the checkbox to include cookie issues caused by third-party sites.
   */
  includeCookieIssuesCausedBy: 'Include cookie issues caused by third-party sites',
  /**
   * @description Label in the Issues panel for the checkbox to include cookie issues caused by third-party sites.
   */
  includeThirdpartyCookieIssues: 'Include third-party cookie issues',
  /**
   * @description Message in the Issues panel displayed when only third-party cookie issues are detected.
   */
  onlyThirdpartyCookieIssues: 'Only third-party cookie issues detected',
  /**
   * @description Message in the Issues panel displayed when no issues are detected.
   */
  noIssues: 'No issues detected',
  /**
   * @description Explanation text in the Issues panel shown when no issues are detected.
   */
  issuesPanelDescription: 'On this page you can find warnings from the browser.',
  /**
   * @description Category title in the Issues panel for a group of quirks mode issues.
   */
  quirksMode: 'Quirks mode',
  /**
   * @description Category title in the Issues panel for a group of generic issues.
   */
  generic: 'Generic',
  /**
   * @description Category title in the Issues panel for a group of permission element issues.
   */
  permissionElement: 'Permission element',
  /**
   * @description Category title in the Issues panel for a group of selective permissions intervention issues.
   */
  selectivePermissionsIntervention: 'Selective permissions intervention',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/IssuesPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const ISSUES_PANEL_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/issues' as Platform.DevToolsPath.UrlString;

class IssueCategoryView extends UI.TreeOutline.TreeElement {
  #category: IssuesManager.Issue.IssueCategory;

  constructor(category: IssuesManager.Issue.IssueCategory) {
    super(undefined, undefined, Platform.StringUtilities.toKebabCase(category));
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
      case IssuesManager.Issue.IssueCategory.QUIRKS_MODE:
        return i18nString(UIStrings.quirksMode);
      case IssuesManager.Issue.IssueCategory.GENERIC:
        return i18nString(UIStrings.generic);
      case IssuesManager.Issue.IssueCategory.PERMISSION_ELEMENT:
        return i18nString(UIStrings.permissionElement);
      case IssuesManager.Issue.IssueCategory.SELECTIVE_PERMISSIONS_INTERVENTION:
        return i18nString(UIStrings.selectivePermissionsIntervention);
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
  #issueViews: Map<IssuesManager.IssueAggregator.AggregationKey, IssueView>;
  #kindViews: Map<IssuesManager.Issue.IssueKind, IssueKindView>;
  #showThirdPartyCheckbox: UI.Toolbar.ToolbarSettingCheckbox|null;
  #issuesTree: UI.TreeOutline.TreeOutlineInShadow;
  #hiddenIssuesRow: HiddenIssuesRow;
  #noIssuesMessageDiv: UI.EmptyWidget.EmptyWidget;
  #issuesManager: IssuesManager.IssuesManager.IssuesManager;
  #aggregator: IssuesManager.IssueAggregator.IssueAggregator;
  #issueViewUpdatePromise: Promise<void> = Promise.resolve();

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
    this.#aggregator.addEventListener(
        IssuesManager.IssueAggregator.Events.AGGREGATED_ISSUE_UPDATED, this.#issueUpdated, this);
    this.#aggregator.addEventListener(
        IssuesManager.IssueAggregator.Events.FULL_UPDATE_REQUIRED, this.#onFullUpdate, this);
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
    toolbarContainer.role = 'toolbar';
    const leftToolbar = toolbarContainer.createChild('devtools-toolbar', 'issues-toolbar-left');
    leftToolbar.role = 'presentation';
    const rightToolbar = toolbarContainer.createChild('devtools-toolbar', 'issues-toolbar-right');
    rightToolbar.role = 'presentation';

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

    const thirdPartySetting = IssuesManager.Issue.getShowThirdPartyIssuesSetting(Common.Settings.Settings.instance());
    this.#showThirdPartyCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        thirdPartySetting, i18nString(UIStrings.includeCookieIssuesCausedBy),
        i18nString(UIStrings.includeThirdpartyCookieIssues));
    rightToolbar.appendToolbarItem(this.#showThirdPartyCheckbox);

    rightToolbar.appendSeparator();
    const issueCounter = new IssueCounter.IssueCounter.IssueCounter();
    issueCounter.data = {
      clickHandler: () => {
        const summary = IssueCounter.IssueCounter.getIssueCountsEnumeration(
            IssuesManager.IssuesManager.IssuesManager.instance(), false);
        UI.ARIAUtils.LiveAnnouncer.alert(summary);
      },
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

  #issueUpdated(event: Common.EventTarget.EventTargetEvent<IssuesManager.IssueAggregator.AggregatedIssue>): void {
    this.#scheduleIssueViewUpdate(event.data);
  }

  #scheduleIssueViewUpdate(issue: IssuesManager.IssueAggregator.AggregatedIssue): void {
    this.#issueViewUpdatePromise = this.#issueViewUpdatePromise.then(() => this.#updateIssueView(issue));
  }

  /** Don't call directly. Use `scheduleIssueViewUpdate` instead. */
  async #updateIssueView(issue: IssuesManager.IssueAggregator.AggregatedIssue): Promise<void> {
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

  #getIssueViewParent(issue: IssuesManager.IssueAggregator.AggregatedIssue): UI.TreeOutline.TreeOutline
      |UI.TreeOutline.TreeElement {
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
      view.parent?.removeChild(view);
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
      this.#noIssuesMessageDiv.hideWidget();
      const firstChild = this.#issuesTree.firstChild();
      if (firstChild) {
        firstChild.select(/* omitFocus= */ true);
        this.setDefaultFocusedElement(firstChild.listItemElement);
      }
    } else {
      this.#issuesTree.element.hidden = true;
      // We alreay know that issesCount is zero here.
      const hasOnlyThirdPartyIssues =
          this.#issuesManager.numberOfAllStoredIssues() - this.#issuesManager.numberOfThirdPartyCookiePhaseoutIssues() >
          0;
      this.#noIssuesMessageDiv.header =
          hasOnlyThirdPartyIssues ? i18nString(UIStrings.onlyThirdpartyCookieIssues) : i18nString(UIStrings.noIssues);
      this.#noIssuesMessageDiv.showWidget();
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
}
