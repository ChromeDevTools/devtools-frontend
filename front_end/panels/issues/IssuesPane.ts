// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
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
  issuesPanelDescription: 'On this page you can find warnings from the browser',
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

const {repeat} = Directives;
const {widget} = UI.Widget;
const {bindToSetting, clonedRef} = UI.UIUtils;

const rootBySentinel = new WeakMap<Element, WeakRef<UI.TreeOutline.TreeElement>>();
const managedRootElements = new WeakMap<UI.TreeOutline.TreeElement, Set<UI.TreeOutline.TreeElement>>();
const desiredRootElements = new WeakMap<UI.TreeOutline.TreeElement, readonly UI.TreeOutline.TreeElement[]>();

function applyRootTreeElements(root: UI.TreeOutline.TreeElement): void {
  const treeElements = desiredRootElements.get(root) ?? [];
  let managed = managedRootElements.get(root);
  if (!managed) {
    managed = new Set();
    managedRootElements.set(root, managed);
  }
  const nextSet = new Set(treeElements);
  for (const existing of [...managed]) {
    if (!nextSet.has(existing)) {
      if (existing.parent === root) {
        root.removeChild(existing);
      }
      managed.delete(existing);
    }
  }
  let insertIndex = 0;
  for (const child of [...root.children()]) {
    if (nextSet.has(child)) {
      continue;
    }
    if (root.childAt(insertIndex) !== child) {
      root.removeChild(child);
      root.insertChild(child, insertIndex);
    }
    insertIndex++;
  }
  for (let i = 0; i < treeElements.length; ++i) {
    const child = treeElements[i];
    managed.add(child);
    const targetIndex = insertIndex + i;
    if (root.childAt(targetIndex) !== child) {
      child.parent?.removeChild(child);
      root.insertChild(child, targetIndex);
    }
  }
  const treeOutline = root.treeOutline;
  if (treeOutline && !treeOutline.selectedTreeElement) {
    const firstChild = treeOutline.firstChild();
    if (firstChild && !firstChild.hidden) {
      firstChild.select(/* omitFocus= */ true);
    }
  }
}

function syncCategoryChildren(listItem: Element|undefined, issues: readonly IssueView[]): void {
  if (!listItem) {
    return;
  }
  const categoryTreeElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
  if (!categoryTreeElement) {
    return;
  }
  categoryTreeElement.childrenListElement.classList.add('issue-category-body');
  const nextSet = new Set<UI.TreeOutline.TreeElement>(issues);
  for (const existing of [...categoryTreeElement.children()]) {
    if (!nextSet.has(existing)) {
      categoryTreeElement.removeChild(existing);
    }
  }
  for (let i = 0; i < issues.length; ++i) {
    const child = issues[i];
    if (categoryTreeElement.childAt(i) !== child) {
      child.parent?.removeChild(child);
      categoryTreeElement.insertChild(child, i);
    }
  }
  if (categoryTreeElement.parent) {
    applyRootTreeElements(categoryTreeElement.parent);
  }
}

function syncRootTreeElements(
    listItem: Element|undefined,
    treeElements: readonly UI.TreeOutline.TreeElement[],
    ): void {
  if (!listItem) {
    return;
  }
  let root = rootBySentinel.get(listItem)?.deref();
  if (!root) {
    const sentinel = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
    if (!sentinel?.parent) {
      return;
    }
    root = sentinel.parent;
    rootBySentinel.set(listItem, new WeakRef(root));
    root.removeChild(sentinel);
    if (root.treeOutline instanceof UI.TreeOutline.TreeOutlineInShadow) {
      // Keep `listItem` rooted in an inert `DocumentFragment` so `clonedRef` continues resolving on re-renders.
      const inertHolder = document.createElement('template');
      inertHolder.content.appendChild(listItem);
      root.treeOutline.shadowRoot.appendChild(inertHolder);
    }
  }
  desiredRootElements.set(root, treeElements);
  applyRootTreeElements(root);
}

function getCategoryTitle(category: IssuesManager.Issue.IssueCategory): string {
  switch (category) {
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
    default:
      Platform.assertNever(category, `Unhandled issue category: ${category}`);
  }
}

export function getGroupIssuesByCategorySetting(): Common.Settings.Setting<boolean> {
  return Common.Settings.Settings.instance().createSetting('group-issues-by-category', false);
}

export interface IssueCategoryItem {
  category: IssuesManager.Issue.IssueCategory;
  title: string;
  issues: IssueView[];
}

export interface ViewInput {
  groupByCategorySetting: Common.Settings.Setting<boolean>;
  groupByKindSetting: Common.Settings.Setting<boolean>;
  showThirdPartyIssuesSetting: Common.Settings.Setting<boolean>;
  issueCounterData: IssueCounter.IssueCounter.IssueCounterData;
  issueCounterTitle: string;
  showTree: boolean;
  categories: IssueCategoryItem[];
  treeElements: UI.TreeOutline.TreeElement[];
  noIssuesHeader: string;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement|DocumentFragment) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${issuesPaneStyles}</style>
    <div class="issues-toolbar-container" role="toolbar" jslog=${VisualLogging.toolbar()}>
      <devtools-toolbar class="issues-toolbar-left" role="presentation"></devtools-toolbar>
      <devtools-toolbar class="issues-toolbar-right" role="presentation">
        <!-- The option to toggle category grouping is hidden for now. -->
        <devtools-checkbox hidden title=${i18nString(UIStrings.groupDisplayedIssuesUnder)}
            ${bindToSetting(input.groupByCategorySetting)}>${i18nString(UIStrings.groupByCategory)}</devtools-checkbox>
        <devtools-checkbox title=${i18nString(UIStrings.groupDisplayedIssuesUnderKind)}
            ${bindToSetting(input.groupByKindSetting)}>${i18nString(UIStrings.groupByKind)}</devtools-checkbox>
        <devtools-checkbox title=${i18nString(UIStrings.includeCookieIssuesCausedBy)}
            ${bindToSetting(input.showThirdPartyIssuesSetting)}>${
              i18nString(UIStrings.includeThirdpartyCookieIssues)}</devtools-checkbox>
        <div class="toolbar-divider"></div>
        <devtools-issue-counter id="console-issues-counter" title=${input.issueCounterTitle}
            .data=${input.issueCounterData} jslog=${VisualLogging.counter('issues')}></devtools-issue-counter>
      </devtools-toolbar>
    </div>
    <devtools-tree ?autofocus=${input.showTree} show-selection-on-keyboard-focus ?hidden=${!input.showTree} .template=${html`
      <style>${issuesTreeStyles}</style>
      <ul role="tree" class="issues">
        <li role="treeitem" hidden ${clonedRef(el => syncRootTreeElements(el, input.treeElements))}></li>
        ${repeat(input.categories, category => category.category, category => html`
          <li role="treeitem"
              class="issue-category"
              jslog-context=${Platform.StringUtilities.toKebabCase(category.category)}
              toggle-on-click
              ${clonedRef(el => syncCategoryChildren(el, category.issues))}>
            <div class="header">
              <div class="title">${category.title}</div>
            </div>
            <ul role="group" class="issue-category-body"></ul>
          </li>`)}
      </ul>`}>
    </devtools-tree>
    ${input.showTree ? nothing : widget(UI.EmptyWidget.EmptyWidget, {
      header: input.noIssuesHeader,
      text: i18nString(UIStrings.issuesPanelDescription),
      link: ISSUES_PANEL_EXPLANATION_URL,
    })}`, target, {container: {classes: ['issues-pane'], attributes: {jslog: `${VisualLogging.panel('issues')}`}}});
  // clang-format on
};

export class IssuesPane extends UI.Widget.VBox<ShadowRoot> {
  #issueViews: Map<IssuesManager.IssueAggregator.AggregationKey, IssueView>;
  #issueCategories = new Map<IssueView, IssuesManager.Issue.IssueCategory>();
  #kindViews: Map<IssuesManager.Issue.IssueKind, IssueKindView>;
  #hiddenIssuesRow: HiddenIssuesRow;
  #issuesManager: IssuesManager.IssuesManager.IssuesManager;
  #aggregator: IssuesManager.IssueAggregator.IssueAggregator;
  #dirtyIssues = new Set<IssuesManager.IssueAggregator.AggregatedIssue>();
  readonly #groupByCategorySetting = getGroupIssuesByCategorySetting();
  readonly #groupByKindSetting = getGroupIssuesByKindSetting();
  readonly #showThirdPartyIssuesSetting =
      IssuesManager.Issue.getShowThirdPartyIssuesSetting(Common.Settings.Settings.instance());
  readonly #issueCounterData: IssueCounter.IssueCounter.IssueCounterData;
  #issueCounterTitle = '';
  #showTree = false;
  #noIssuesHeader = '';
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: 'pure'});
    this.#view = view;

    this.#kindViews = new Map();
    this.#issueViews = new Map();

    this.#groupByCategorySetting.addChangeListener(() => {
      this.#fullUpdate(true);
    });
    this.#groupByKindSetting.addChangeListener(() => {
      this.#fullUpdate(true);
    });

    this.#hiddenIssuesRow = new HiddenIssuesRow();

    this.#issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    this.#issueCounterData = {
      clickHandler: () => {
        const summary = IssueCounter.IssueCounter.getIssueCountsEnumeration(this.#issuesManager, false);
        UI.ARIAUtils.LiveAnnouncer.alert(summary);
      },
      displayMode: IssueCounter.IssueCounter.DisplayMode.SHOW_ALWAYS,
      issuesManager: this.#issuesManager,
    };
    this.#aggregator = new IssuesManager.IssueAggregator.IssueAggregator(this.#issuesManager);
    this.#aggregator.addEventListener(IssuesManager.IssueAggregator.Events.AGGREGATED_ISSUE_UPDATED, event => {
      this.#dirtyIssues.add(event.data);
      this.requestUpdate();
    });
    this.#aggregator.addEventListener(
        IssuesManager.IssueAggregator.Events.FULL_UPDATE_REQUIRED, this.#onFullUpdate, this);
    this.#hiddenIssuesRow.hidden = this.#issuesManager.numberOfHiddenIssues() === 0;
    this.#onFullUpdate();
    this.#issuesManager.addEventListener(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED, this.requestUpdate,
                                         this);
  }

  override elementsToRestoreScrollPositionsFor(): Element[] {
    const issuesTree = this.contentElement.querySelector('devtools-tree');
    return issuesTree ? [issuesTree] : [];
  }

  override async performUpdate(): Promise<void> {
    // Snapshot and clear so new arrivals during `await` schedule a fresh update
    const issuesToUpdate = [...this.#dirtyIssues];
    this.#dirtyIssues.clear();
    await Promise.allSettled(issuesToUpdate.map(issue => this.#updateIssueView(issue)));
    this.#updateCounts();

    const {categories, treeElements} = this.#buildTreeData();
    const input: ViewInput = {
      groupByCategorySetting: this.#groupByCategorySetting,
      groupByKindSetting: this.#groupByKindSetting,
      showThirdPartyIssuesSetting: this.#showThirdPartyIssuesSetting,
      issueCounterData: this.#issueCounterData,
      issueCounterTitle: this.#issueCounterTitle,
      showTree: this.#showTree,
      categories,
      treeElements,
      noIssuesHeader: this.#noIssuesHeader,
    };
    this.#view(input, undefined, this.contentElement);

    if (this.#showTree) {
      // `<devtools-tree>` attaches newly rendered rows from a mutation observer callback, which runs before this
      // `await` resumes.
      await Promise.resolve();
    }
  }

  /** Don't call directly. Use `requestUpdate` instead. */
  async #updateIssueView(issue: IssuesManager.IssueAggregator.AggregatedIssue): Promise<void> {
    let issueView = this.#issueViews.get(issue.aggregationKey());
    if (!issueView) {
      const description = issue.getDescription();
      if (!description) {
        console.warn('Could not find description for issue code:', issue.code());
        return;
      }
      try {
        const markdownDescription =
            await IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromMarkdown(description);
        issueView = new IssueView(issue, markdownDescription);
        this.#issueCategories.set(issueView, issue.getCategory());
        // `IssueView.createContent()` renders `MarkdownView` tokens and can throw if an unsupported token or missing
        // link key is encountered. Top-level issue views are only attached to the tree by `<devtools-tree>` after the
        // next render, so create the content eagerly to handle such errors here.
        issueView.createContent();
        this.appendIssueViewToParent(issueView, this.#getIssueViewParent(issue));
        this.#issueViews.set(issue.aggregationKey(), issueView);
      } catch (err) {
        console.error(err);
        if (issueView) {
          this.#issueCategories.delete(issueView);
          issueView.parent?.removeChild(issueView);
        }
        return;
      }
    } else {
      issueView.setIssue(issue);
      this.#issueCategories.set(issueView, issue.getCategory());
      const newParent = this.#getIssueViewParent(issue);
      const isManagedByView = Boolean(issueView.parent && !(issueView.parent instanceof IssueKindView) &&
                                      !(issueView.parent instanceof HiddenIssuesRow));
      const currentParent = isManagedByView ? null : issueView.parent;
      if (currentParent !== newParent) {
        if (!newParent) {
          // The view attaches top-level and category-grouped issue views after the next render.
          currentParent?.removeChild(issueView);
        } else {
          issueView.parent?.removeChild(issueView);
          this.appendIssueViewToParent(issueView, newParent);
        }
      }
    }
    issueView.update();
  }

  /**
   * Appends `issueView` to `parent`. Views with `parent === null` are attached to the tree by `DEFAULT_VIEW`.
   */
  appendIssueViewToParent(issueView: IssueView, parent: UI.TreeOutline.TreeElement|null): void {
    if (!parent) {
      return;
    }
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
    // This is an aggregated view, so we need to update the label for position and size of the treeItem.
    this.#updateItemPositionAndSize(parent);
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

  /**
   * Returns the tree element that `issue` is shown under, or `null` if it is rendered declaratively by the view.
   */
  #getIssueViewParent(issue: IssuesManager.IssueAggregator.AggregatedIssue): UI.TreeOutline.TreeElement|null {
    if (issue.isHidden()) {
      return this.#hiddenIssuesRow;
    }
    if (this.#groupByKindSetting.get()) {
      const kind = issue.getKind();
      const view = this.#kindViews.get(kind);
      if (view) {
        return view;
      }

      const newView = new IssueKindView(kind);
      this.#kindViews.set(kind, newView);
      return newView;
    }
    return null;
  }

  #buildTreeData(): {categories: IssueCategoryItem[], treeElements: UI.TreeOutline.TreeElement[]} {
    const categories: IssueCategoryItem[] = [];
    let treeElements: UI.TreeOutline.TreeElement[] = [];
    if (this.#groupByKindSetting.get()) {
      treeElements = [...this.#kindViews.values()].sort(issueKindViewSortPriority);
    } else if (this.#groupByCategorySetting.get()) {
      const byCategory = new Map<IssuesManager.Issue.IssueCategory, IssueView[]>();
      for (const issueView of this.#issueViews.values()) {
        if (issueView.isForHiddenIssue()) {
          continue;
        }
        const category = this.#issueCategories.get(issueView) ?? IssuesManager.Issue.IssueCategory.OTHER;
        let list = byCategory.get(category);
        if (!list) {
          list = [];
          byCategory.set(category, list);
        }
        list.push(issueView);
      }
      for (const [category, issues] of byCategory) {
        issues.sort((a, b) => a.getIssueTitle().localeCompare(b.getIssueTitle()));
        for (let i = 0; i < issues.length; i++) {
          UI.ARIAUtils.setPositionInSet(issues[i].listItemElement, i + 1);
          UI.ARIAUtils.setSetSize(issues[i].listItemElement, issues.length);
        }
        categories.push({
          category,
          title: getCategoryTitle(category),
          issues,
        });
      }
      categories.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      treeElements = [...this.#issueViews.values()]
                         .filter(issueView => !issueView.isForHiddenIssue())
                         .sort((a, b) => a.getIssueTitle().localeCompare(b.getIssueTitle()));
    }
    treeElements.push(this.#hiddenIssuesRow);
    return {categories, treeElements};
  }

  #clearViews<T>(views: Map<T, UI.TreeOutline.TreeElement>, preservedSet?: Set<T>): void {
    for (const [key, view] of Array.from(views.entries())) {
      if (preservedSet?.has(key)) {
        continue;
      }
      // The view detaches top-level tree elements once they are no longer rendered.
      if (view.parent instanceof IssueKindView || view.parent instanceof HiddenIssuesRow) {
        view.parent.removeChild(view);
      }
      if (view instanceof IssueView) {
        this.#issueCategories.delete(view);
      }
      views.delete(key);
    }
  }

  #onFullUpdate(): void {
    this.#fullUpdate(false);
  }

  #fullUpdate(force: boolean): void {
    this.#dirtyIssues.clear();
    this.#clearViews(this.#kindViews, force ? undefined : this.#aggregator.aggregatedIssueKinds());
    this.#clearViews(this.#issueViews, force ? undefined : this.#aggregator.aggregatedIssueCodes());
    if (this.#aggregator) {
      for (const issue of this.#aggregator.aggregatedIssues()) {
        this.#dirtyIssues.add(issue);
      }
    }
    this.requestUpdate();
  }

  #updateIssueKindViewsCount(): void {
    for (const view of this.#kindViews.values()) {
      const count = this.#issuesManager.numberOfIssues(view.getKind());
      view.update(count);
    }
  }

  #updateCounts(): void {
    this.#issueCounterTitle = IssueCounter.IssueCounter.getIssueCountsEnumeration(this.#issuesManager, false);
    this.#showIssuesTreeOrNoIssuesDetectedMessage(
        this.#issuesManager.numberOfIssues(), this.#issuesManager.numberOfHiddenIssues());
    if (this.#groupByKindSetting.get()) {
      this.#updateIssueKindViewsCount();
    }
  }

  #showIssuesTreeOrNoIssuesDetectedMessage(issuesCount: number, hiddenIssueCount: number): void {
    if (issuesCount > 0 || hiddenIssueCount > 0) {
      this.#hiddenIssuesRow.hidden = hiddenIssueCount === 0;
      this.#hiddenIssuesRow.update(hiddenIssueCount);
      this.#showTree = true;
    } else {
      this.#showTree = false;
      // We alreay know that issesCount is zero here.
      const hasOnlyThirdPartyIssues =
          this.#issuesManager.numberOfAllStoredIssues() - this.#issuesManager.numberOfThirdPartyCookiePhaseoutIssues() >
          0;
      this.#noIssuesHeader =
          hasOnlyThirdPartyIssues ? i18nString(UIStrings.onlyThirdpartyCookieIssues) : i18nString(UIStrings.noIssues);
    }
  }

  async reveal(issue: IssuesManager.Issue.Issue): Promise<void> {
    await this.updateComplete;
    const key = this.#aggregator.keyForIssue(issue);
    const issueView = this.#issueViews.get(key);
    if (issueView) {
      if (issueView.isForHiddenIssue()) {
        this.#hiddenIssuesRow.expand();
        this.#hiddenIssuesRow.reveal();
      }
      if (this.#groupByKindSetting.get() && !issueView.isForHiddenIssue()) {
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
