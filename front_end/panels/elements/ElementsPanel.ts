// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import type * as Adorners from '../../ui/components/adorners/adorners.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type {AXTreeNodeData} from './AccessibilityTreeUtils.js';
import {AccessibilityTreeView} from './AccessibilityTreeView.js';
import {ColorSwatchPopoverIcon} from './ColorSwatchPopoverIcon.js';
import * as ElementsComponents from './components/components.js';
import {ComputedStyleWidget} from './ComputedStyleWidget.js';
import elementsPanelStyles from './elementsPanel.css.js';
import type {ElementsTreeElement} from './ElementsTreeElement.js';
import {ElementsTreeElementHighlighter} from './ElementsTreeElementHighlighter.js';
import {ElementsTreeOutline} from './ElementsTreeOutline.js';
import type {MarkerDecorator} from './MarkerDecorator.js';
import {MetricsSidebarPane} from './MetricsSidebarPane.js';
import {
  Events as StylesSidebarPaneEvents,
  StylesSidebarPane,
  type StylesUpdateCompletedEvent,
} from './StylesSidebarPane.js';

const UIStrings = {
  /**
   * @description Placeholder text for the search box the Elements Panel. Selector refers to CSS
   * selectors.
   */
  findByStringSelectorOrXpath: 'Find by string, selector, or `XPath`',
  /**
   * @description Button text for a button that takes the user to the Accessibility Tree View from the
   * DOM tree view, in the Elements panel.
   */
  switchToAccessibilityTreeView: 'Switch to Accessibility Tree view',
  /**
   * @description Button text for a button that takes the user to the DOM tree view from the
   * Accessibility Tree View, in the Elements panel.
   */
  switchToDomTreeView: 'Switch to DOM Tree view',
  /**
   * @description Tooltip for the the Computed Styles sidebar toggle in the Styles pane. Command to
   * open/show the sidebar.
   */
  showComputedStylesSidebar: 'Show Computed Styles sidebar',
  /**
   * @description Tooltip for the the Computed Styles sidebar toggle in the Styles pane. Command to
   * close/hide the sidebar.
   */
  hideComputedStylesSidebar: 'Hide Computed Styles sidebar',
  /**
   * @description Screen reader announcement when the computed styles sidebar is shown in the Elements panel.
   */
  computedStylesShown: 'Computed Styles sidebar shown',
  /**
   * @description Screen reader announcement when the computed styles sidebar is hidden in the Elements panel.
   */
  computedStylesHidden: 'Computed Styles sidebar hidden',
  /**
   * @description Title of a pane in the Elements panel that shows computed styles for the selected
   * HTML element. Computed styles are the final, actual styles of the element, including all
   * implicit and specified styles.
   */
  computed: 'Computed',
  /**
   * @description Title of a pane in the Elements panel that shows the CSS styles for the selected
   * HTML element.
   */
  styles: 'Styles',
  /**
   * @description A context menu item to reveal a node in the DOM tree of the Elements Panel
   */
  openInElementsPanel: 'Open in Elements panel',
  /**
   * @description Warning/error text displayed when a node cannot be found in the current page.
   */
  nodeCannotBeFoundInTheCurrent: 'Node cannot be found in the current page.',
  /**
   * @description Console warning when a user tries to reveal a non-node type Remote Object. A remote
   * object is a JavaScript object that is not stored in DevTools, that DevTools has a connection to.
   * It should correspond to a local node.
   */
  theRemoteObjectCouldNotBe: 'The remote object could not be resolved to a valid node.',
  /**
   * @description Console warning when the user tries to reveal a deferred DOM Node that resolves as
   * null. A deferred DOM node is a node we know about but have not yet fetched from the backend (we
   * defer the work until later).
   */
  theDeferredDomNodeCouldNotBe: 'The deferred `DOM` Node could not be resolved to a valid node.',
  /**
   * @description Text in Elements Panel of the Elements panel. Shows the current CSS Pseudo-classes
   * applicable to the selected HTML element.
   * @example {::after, ::before} PH1
   */
  elementStateS: 'Element state: {PH1}',
  /**
   * @description Accessible name for side panel toolbar.
   */
  sidePanelToolbar: 'Side panel toolbar',
  /**
   * @description Accessible name for side panel contents.
   */
  sidePanelContent: 'Side panel content',
  /**
   * @description Accessible name for the DOM tree explorer view.
   */
  domTreeExplorer: 'DOM tree explorer',
};

const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementsPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * These strings need to match the `SidebarPaneCodes` in UserMetrics.ts. DevTools
 * collects usage metrics for the different sidebar tabs.
 */
export const enum SidebarPaneTabId {
  COMPUTED = 'computed',
  STYLES = 'styles',
}

const createAccessibilityTreeToggleButton = (isActive: boolean): HTMLElement => {
  const button = new Buttons.Button.Button();
  const title =
      isActive ? i18nString(UIStrings.switchToDomTreeView) : i18nString(UIStrings.switchToAccessibilityTreeView);
  button.data = {
    active: isActive,
    variant: Buttons.Button.Variant.TOOLBAR,
    iconUrl: new URL('../../Images/person.svg', import.meta.url).toString(),
    title,
    jslogContext: 'toggle-accessibility-tree',
  };
  button.tabIndex = 0;
  button.classList.add('axtree-button');
  if (isActive) {
    button.classList.add('active');
  }
  return button;
};

let elementsPanelInstance: ElementsPanel;

export class ElementsPanel extends UI.Panel.Panel implements UI.SearchableView.Searchable,
                                                             SDK.TargetManager.SDKModelObserver<SDK.DOMModel.DOMModel>,
                                                             UI.View.ViewLocationResolver {
  private splitWidget: UI.SplitWidget.SplitWidget;
  private readonly searchableViewInternal: UI.SearchableView.SearchableView;
  private mainContainer: HTMLDivElement;
  private domTreeContainer: HTMLDivElement;
  private splitMode: SplitMode|null;
  private readonly accessibilityTreeView: AccessibilityTreeView|undefined;
  private breadcrumbs: ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs;
  stylesWidget: StylesSidebarPane;
  private readonly computedStyleWidget: ComputedStyleWidget;
  private readonly metricsWidget: MetricsSidebarPane;
  private treeOutlines: Set<ElementsTreeOutline> = new Set();
  private searchResults!: {
    domModel: SDK.DOMModel.DOMModel,
    index: number,
    node: ((SDK.DOMModel.DOMNode | undefined)|null),
  }[]|undefined;
  private currentSearchResultIndex: number;
  pendingNodeReveal: boolean;
  private readonly adornerManager: ElementsComponents.AdornerManager.AdornerManager;
  private adornerSettingsPane: ElementsComponents.AdornerSettingsPane.AdornerSettingsPane|null;
  private readonly adornersByName: Map<string, Set<Adorners.Adorner.Adorner>>;
  accessibilityTreeButton?: HTMLElement;
  domTreeButton?: HTMLElement;
  private selectedNodeOnReset?: SDK.DOMModel.DOMNode;
  private hasNonDefaultSelectedNode?: boolean;
  private searchConfig?: UI.SearchableView.SearchConfig;
  private omitDefaultSelection?: boolean;
  private notFirstInspectElement?: boolean;
  sidebarPaneView?: UI.View.TabbedViewLocation;
  private stylesViewToReveal?: UI.View.SimpleView;
  private nodeInsertedTaskRunner = {
    queue: Promise.resolve(),
    run(task: () => Promise<void>):
        void {
          this.queue = this.queue.then(task);
        },
  };

  private cssStyleTrackerByCSSModel: Map<SDK.CSSModel.CSSModel, SDK.CSSModel.CSSPropertyTracker>;

  constructor() {
    super('elements');

    this.splitWidget = new UI.SplitWidget.SplitWidget(true, true, 'elements-panel-split-view-state', 325, 325);
    this.splitWidget.addEventListener(
        UI.SplitWidget.Events.SIDEBAR_SIZE_CHANGED, this.updateTreeOutlineVisibleWidth.bind(this));
    this.splitWidget.show(this.element);

    this.searchableViewInternal = new UI.SearchableView.SearchableView(this, null);
    this.searchableViewInternal.setMinimalSearchQuerySize(0);
    this.searchableViewInternal.setMinimumSize(25, 28);
    this.searchableViewInternal.setPlaceholder(i18nString(UIStrings.findByStringSelectorOrXpath));
    const stackElement = this.searchableViewInternal.element;

    this.mainContainer = document.createElement('div');
    this.domTreeContainer = document.createElement('div');
    const crumbsContainer = document.createElement('div');
    if (Root.Runtime.experiments.isEnabled('full-accessibility-tree')) {
      this.initializeFullAccessibilityTreeView();
    }
    this.mainContainer.appendChild(this.domTreeContainer);
    stackElement.appendChild(this.mainContainer);
    stackElement.appendChild(crumbsContainer);

    UI.ARIAUtils.markAsMain(this.domTreeContainer);
    UI.ARIAUtils.setLabel(this.domTreeContainer, i18nString(UIStrings.domTreeExplorer));

    this.splitWidget.setMainWidget(this.searchableViewInternal);
    this.splitMode = null;

    this.mainContainer.id = 'main-content';
    this.domTreeContainer.id = 'elements-content';
    this.domTreeContainer.tabIndex = -1;
    // FIXME: crbug.com/425984
    if (Common.Settings.Settings.instance().moduleSetting('dom-word-wrap').get()) {
      this.domTreeContainer.classList.add('elements-wrap');
    }
    Common.Settings.Settings.instance()
        .moduleSetting('dom-word-wrap')
        .addChangeListener(this.domWordWrapSettingChanged.bind(this));

    crumbsContainer.id = 'elements-crumbs';
    if (this.domTreeButton) {
      this.accessibilityTreeView =
          new AccessibilityTreeView(this.domTreeButton, new TreeOutline.TreeOutline.TreeOutline<AXTreeNodeData>());
    }
    this.breadcrumbs = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
    this.breadcrumbs.addEventListener('breadcrumbsnodeselected', event => {
      this.crumbNodeSelected(event);
    });

    crumbsContainer.appendChild(this.breadcrumbs);

    this.stylesWidget = StylesSidebarPane.instance();
    this.computedStyleWidget = new ComputedStyleWidget();
    this.metricsWidget = new MetricsSidebarPane();

    Common.Settings.Settings.instance()
        .moduleSetting('sidebar-position')
        .addChangeListener(this.updateSidebarPosition.bind(this));
    this.updateSidebarPosition();

    this.cssStyleTrackerByCSSModel = new Map();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.DOMModel.DOMModel, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.NAME_CHANGED, event => this.targetNameChanged(event.data));
    Common.Settings.Settings.instance()
        .moduleSetting('show-ua-shadow-dom')
        .addChangeListener(this.showUAShadowDOMChanged.bind(this));
    Extensions.ExtensionServer.ExtensionServer.instance().addEventListener(
        Extensions.ExtensionServer.Events.SidebarPaneAdded, this.extensionSidebarPaneAdded, this);
    this.currentSearchResultIndex = -1;  // -1 represents the initial invalid state

    this.pendingNodeReveal = false;

    this.adornerManager = new ElementsComponents.AdornerManager.AdornerManager(
        Common.Settings.Settings.instance().moduleSetting('adorner-settings'));
    this.adornerSettingsPane = null;
    this.adornersByName = new Map();
  }

  private initializeFullAccessibilityTreeView(): void {
    this.accessibilityTreeButton = createAccessibilityTreeToggleButton(false);
    this.accessibilityTreeButton.addEventListener('click', this.showAccessibilityTree.bind(this));

    this.domTreeButton = createAccessibilityTreeToggleButton(true);
    this.domTreeButton.addEventListener('click', this.showDOMTree.bind(this));

    this.mainContainer.appendChild(this.accessibilityTreeButton);
  }

  private showAccessibilityTree(): void {
    if (this.accessibilityTreeView) {
      this.splitWidget.setMainWidget(this.accessibilityTreeView);
    }
  }

  private showDOMTree(): void {
    this.splitWidget.setMainWidget(this.searchableViewInternal);
    const selectedNode = this.selectedDOMNode();
    if (!selectedNode) {
      return;
    }
    const treeElement = this.treeElementForNode(selectedNode);
    if (!treeElement) {
      return;
    }
    treeElement.select();
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): ElementsPanel {
    const {forceNew} = opts;
    if (!elementsPanelInstance || forceNew) {
      elementsPanelInstance = new ElementsPanel();
    }

    return elementsPanelInstance;
  }

  revealProperty(cssProperty: SDK.CSSProperty.CSSProperty): Promise<void> {
    if (!this.sidebarPaneView || !this.stylesViewToReveal) {
      return Promise.resolve();
    }

    return this.sidebarPaneView.showView(this.stylesViewToReveal).then(() => {
      this.stylesWidget.revealProperty((cssProperty as SDK.CSSProperty.CSSProperty));
    });
  }

  resolveLocation(_locationName: string): UI.View.ViewLocation|null {
    return this.sidebarPaneView || null;
  }

  showToolbarPane(widget: UI.Widget.Widget|null, toggle: UI.Toolbar.ToolbarToggle|null): void {
    // TODO(luoe): remove this function once its providers have an alternative way to reveal their views.
    this.stylesWidget.showToolbarPane(widget, toggle);
  }

  modelAdded(domModel: SDK.DOMModel.DOMModel): void {
    const parentModel = domModel.parentModel();

    let treeOutline: ElementsTreeOutline|null = parentModel ? ElementsTreeOutline.forDOMModel(parentModel) : null;
    if (!treeOutline) {
      treeOutline = new ElementsTreeOutline(true, true);
      treeOutline.setWordWrap(Common.Settings.Settings.instance().moduleSetting('dom-word-wrap').get());
      treeOutline.addEventListener(ElementsTreeOutline.Events.SelectedNodeChanged, this.selectedNodeChanged, this);
      treeOutline.addEventListener(ElementsTreeOutline.Events.ElementsTreeUpdated, this.updateBreadcrumbIfNeeded, this);
      new ElementsTreeElementHighlighter(treeOutline, new Common.Throttler.Throttler(100));
      this.treeOutlines.add(treeOutline);
    }
    treeOutline.wireToDOMModel(domModel);

    this.setupStyleTracking(domModel.cssModel());

    // Perform attach if necessary.
    if (this.isShowing()) {
      this.wasShown();
    }
    if (this.domTreeContainer.hasFocus()) {
      treeOutline.focus();
    }
    domModel.addEventListener(SDK.DOMModel.Events.DocumentUpdated, this.documentUpdatedEvent, this);
    domModel.addEventListener(SDK.DOMModel.Events.NodeInserted, this.handleNodeInserted, this);
  }

  private handleNodeInserted(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    // Queue the task for the case when all the view transitions are added
    // around the same time. Otherwise there is a race condition on
    // accessing `cssText` of inspector stylesheet causing some rules
    // to be not added.
    this.nodeInsertedTaskRunner.run(async () => {
      const node = event.data;
      if (!node.isViewTransitionPseudoNode()) {
        return;
      }

      const cssModel = node.domModel().cssModel();
      const styleSheetHeader = await cssModel.requestViaInspectorStylesheet(node.frameId());
      if (!styleSheetHeader) {
        return;
      }

      const cssText = await cssModel.getStyleSheetText(styleSheetHeader.id);
      // Do not add a rule for the view transition pseudo if there already is a rule for it.
      if (cssText?.includes(`${node.simpleSelector()} {`)) {
        return;
      }

      await cssModel.setStyleSheetText(styleSheetHeader.id, `${cssText}\n${node.simpleSelector()} {}`, false);
    });
  }

  modelRemoved(domModel: SDK.DOMModel.DOMModel): void {
    domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated, this.documentUpdatedEvent, this);
    domModel.removeEventListener(SDK.DOMModel.Events.NodeInserted, this.handleNodeInserted, this);
    const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
    if (!treeOutline) {
      return;
    }

    treeOutline.unwireFromDOMModel(domModel);
    if (domModel.parentModel()) {
      return;
    }
    this.treeOutlines.delete(treeOutline);
    treeOutline.element.remove();

    this.removeStyleTracking(domModel.cssModel());
  }

  private targetNameChanged(target: SDK.Target.Target): void {
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
    if (!treeOutline) {
      return;
    }
  }

  private updateTreeOutlineVisibleWidth(): void {
    if (!this.treeOutlines.size) {
      return;
    }

    let width = this.splitWidget.element.offsetWidth;
    if (this.splitWidget.isVertical()) {
      width -= this.splitWidget.sidebarSize();
    }
    for (const treeOutline of this.treeOutlines) {
      treeOutline.setVisibleWidth(width);
    }
  }

  override focus(): void {
    const firstTreeOutline = this.treeOutlines.values().next();
    if (firstTreeOutline.done) {
      this.domTreeContainer.focus();
    } else {
      firstTreeOutline.value.focus();
    }
  }

  override searchableView(): UI.SearchableView.SearchableView {
    return this.searchableViewInternal;
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().setFlavor(ElementsPanel, this);
    this.registerCSSFiles([elementsPanelStyles]);

    for (const treeOutline of this.treeOutlines) {
      // Attach heavy component lazily
      if (treeOutline.element.parentElement !== this.domTreeContainer) {
        this.domTreeContainer.appendChild(treeOutline.element);
      }
    }

    const domModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMModel.DOMModel, {scoped: true});
    for (const domModel of domModels) {
      if (domModel.parentModel()) {
        continue;
      }
      const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
      if (!treeOutline) {
        continue;
      }
      treeOutline.setVisible(true);

      if (!treeOutline.rootDOMNode) {
        if (domModel.existingDocument()) {
          treeOutline.rootDOMNode = domModel.existingDocument();
          this.documentUpdated(domModel);
        } else {
          void domModel.requestDocument();
        }
      }
    }
  }

  override willHide(): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    for (const treeOutline of this.treeOutlines) {
      treeOutline.setVisible(false);
      // Detach heavy component on hide
      this.domTreeContainer.removeChild(treeOutline.element);
    }
    super.willHide();
    UI.Context.Context.instance().setFlavor(ElementsPanel, null);
  }

  override onResize(): void {
    this.element.window().requestAnimationFrame(this.updateSidebarPosition.bind(this));  // Do not force layout.
    this.updateTreeOutlineVisibleWidth();
  }

  private selectedNodeChanged(
      event: Common.EventTarget.EventTargetEvent<{node: SDK.DOMModel.DOMNode | null, focus: boolean}>): void {
    let selectedNode = event.data.node;

    // If the selectedNode is a pseudoNode, we want to ensure that it has a valid parentNode
    if (selectedNode && (selectedNode.pseudoType() && !selectedNode.parentNode)) {
      selectedNode = null;
    }
    const {focus} = event.data;
    for (const treeOutline of this.treeOutlines) {
      if (!selectedNode || ElementsTreeOutline.forDOMModel(selectedNode.domModel()) !== treeOutline) {
        treeOutline.selectDOMNode(null);
      }
    }

    if (selectedNode) {
      const activeNode = ElementsComponents.Helper.legacyNodeToElementsComponentsNode(selectedNode);
      const crumbs = [activeNode];

      for (let current: (SDK.DOMModel.DOMNode|null) = selectedNode.parentNode; current; current = current.parentNode) {
        crumbs.push(ElementsComponents.Helper.legacyNodeToElementsComponentsNode(current));
      }

      this.breadcrumbs.data = {
        crumbs,
        selectedNode: ElementsComponents.Helper.legacyNodeToElementsComponentsNode(selectedNode),
      };

      if (this.accessibilityTreeView) {
        void this.accessibilityTreeView.selectedNodeChanged(selectedNode);
      }
    } else {
      this.breadcrumbs.data = {crumbs: [], selectedNode: null};
    }

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, selectedNode);

    if (!selectedNode) {
      return;
    }
    void selectedNode.setAsInspectedNode();
    if (focus) {
      this.selectedNodeOnReset = selectedNode;
      this.hasNonDefaultSelectedNode = true;
    }

    const executionContexts = selectedNode.domModel().runtimeModel().executionContexts();
    const nodeFrameId = selectedNode.frameId();
    for (const context of executionContexts) {
      if (context.frameId === nodeFrameId) {
        UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, context);
        break;
      }
    }
  }

  private documentUpdatedEvent(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMModel>): void {
    const domModel = event.data;
    this.documentUpdated(domModel);
    this.removeStyleTracking(domModel.cssModel());
    this.setupStyleTracking(domModel.cssModel());
  }

  private documentUpdated(domModel: SDK.DOMModel.DOMModel): void {
    this.searchableViewInternal.cancelSearch();

    if (!domModel.existingDocument()) {
      if (this.isShowing()) {
        void domModel.requestDocument();
      }
      return;
    }

    this.hasNonDefaultSelectedNode = false;

    if (this.omitDefaultSelection) {
      return;
    }

    const savedSelectedNodeOnReset = this.selectedNodeOnReset;
    void restoreNode.call(this, domModel, this.selectedNodeOnReset || null);

    async function restoreNode(
        this: ElementsPanel, domModel: SDK.DOMModel.DOMModel, staleNode: SDK.DOMModel.DOMNode|null): Promise<void> {
      const nodePath = staleNode ? staleNode.path() : null;
      const restoredNodeId = nodePath ? await domModel.pushNodeByPathToFrontend(nodePath) : null;

      if (savedSelectedNodeOnReset !== this.selectedNodeOnReset) {
        return;
      }
      let node: (SDK.DOMModel.DOMNode|null) = restoredNodeId ? domModel.nodeForId(restoredNodeId) : null;
      if (!node) {
        const inspectedDocument = domModel.existingDocument();
        node = inspectedDocument ? inspectedDocument.body || inspectedDocument.documentElement : null;
      }
      // If `node` is null here, the document hasn't been transmitted from the backend yet
      // and isn't in a valid state to have a default-selected node. Another document update
      // should be forthcoming. In the meantime, don't set the default-selected node or notify
      // the test that it's ready, because it isn't.
      if (node) {
        this.setDefaultSelectedNode(node);
        this.lastSelectedNodeSelectedForTest();
      }
    }
  }

  private lastSelectedNodeSelectedForTest(): void {
  }

  private setDefaultSelectedNode(node: SDK.DOMModel.DOMNode|null): void {
    if (!node || this.hasNonDefaultSelectedNode || this.pendingNodeReveal) {
      return;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(node.domModel());
    if (!treeOutline) {
      return;
    }
    this.selectDOMNode(node);
    if (treeOutline.selectedTreeElement) {
      treeOutline.selectedTreeElement.expand();
    }
  }

  onSearchClosed(): void {
    const selectedNode = this.selectedDOMNode();
    if (!selectedNode) {
      return;
    }
    const treeElement = this.treeElementForNode(selectedNode);
    if (!treeElement) {
      return;
    }

    treeElement.select();
  }

  onSearchCanceled(): void {
    this.searchConfig = undefined;
    this.hideSearchHighlights();

    this.searchableViewInternal.updateSearchMatchesCount(0);

    this.currentSearchResultIndex = -1;
    delete this.searchResults;

    SDK.DOMModel.DOMModel.cancelSearch();
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    const query = searchConfig.query;

    const whitespaceTrimmedQuery = query.trim();
    if (!whitespaceTrimmedQuery.length) {
      return;
    }

    if (!this.searchConfig || this.searchConfig.query !== query) {
      this.onSearchCanceled();
    } else {
      this.hideSearchHighlights();
    }

    this.searchConfig = searchConfig;

    const showUAShadowDOM = Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom').get();
    const domModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMModel.DOMModel, {scoped: true});
    const promises = domModels.map(domModel => domModel.performSearch(whitespaceTrimmedQuery, showUAShadowDOM));
    void Promise.all(promises).then(resultCounts => {
      this.searchResults = [];
      for (let i = 0; i < resultCounts.length; ++i) {
        const resultCount = resultCounts[i];
        for (let j = 0; j < resultCount; ++j) {
          this.searchResults.push({domModel: domModels[i], index: j, node: undefined});
        }
      }
      this.searchableViewInternal.updateSearchMatchesCount(this.searchResults.length);
      if (!this.searchResults.length) {
        return;
      }
      if (this.currentSearchResultIndex >= this.searchResults.length) {
        this.currentSearchResultIndex = -1;
      }

      let index: (0|- 1)|number = this.currentSearchResultIndex;

      if (shouldJump) {
        if (this.currentSearchResultIndex === -1) {
          index = jumpBackwards ? -1 : 0;
        } else {
          index = jumpBackwards ? index - 1 : index + 1;
        }
        this.jumpToSearchResult(index);
      }
    });
  }

  private domWordWrapSettingChanged(event: Common.EventTarget.EventTargetEvent<boolean>): void {
    this.domTreeContainer.classList.toggle('elements-wrap', event.data);
    for (const treeOutline of this.treeOutlines) {
      treeOutline.setWordWrap(event.data);
    }
  }

  switchToAndFocus(node: SDK.DOMModel.DOMNode): void {
    // Reset search restore.
    this.searchableViewInternal.cancelSearch();
    void UI.ViewManager.ViewManager.instance().showView('elements').then(() => this.selectDOMNode(node, true));
  }

  private jumpToSearchResult(index: number): void {
    if (!this.searchResults) {
      return;
    }

    this.currentSearchResultIndex = (index + this.searchResults.length) % this.searchResults.length;
    this.highlightCurrentSearchResult();
  }

  jumpToNextSearchResult(): void {
    if (!this.searchResults || !this.searchConfig) {
      return;
    }
    this.performSearch(this.searchConfig, true);
  }

  jumpToPreviousSearchResult(): void {
    if (!this.searchResults || !this.searchConfig) {
      return;
    }
    this.performSearch(this.searchConfig, true, true);
  }

  supportsCaseSensitiveSearch(): boolean {
    return false;
  }

  supportsRegexSearch(): boolean {
    return false;
  }

  private highlightCurrentSearchResult(): void {
    const index = this.currentSearchResultIndex;
    const searchResults = this.searchResults;
    if (!searchResults) {
      return;
    }
    const searchResult = searchResults[index];

    this.searchableViewInternal.updateCurrentMatchIndex(index);
    if (searchResult.node === null) {
      return;
    }

    if (typeof searchResult.node === 'undefined') {
      // No data for slot, request it.
      void searchResult.domModel.searchResult(searchResult.index).then(node => {
        searchResult.node = node;

        // If any of these properties are undefined or reset to an invalid value,
        // this means the search/highlight request is outdated.
        const highlightRequestValid = this.searchConfig && this.searchResults && (this.currentSearchResultIndex !== -1);
        if (highlightRequestValid) {
          this.highlightCurrentSearchResult();
        }
      });
      return;
    }

    const treeElement = this.treeElementForNode(searchResult.node);
    void searchResult.node.scrollIntoView();
    if (treeElement) {
      this.searchConfig && treeElement.highlightSearchResults(this.searchConfig.query);
      treeElement.reveal();
      const matches = treeElement.listItemElement.getElementsByClassName(UI.UIUtils.highlightedSearchResultClassName);
      if (matches.length) {
        matches[0].scrollIntoViewIfNeeded(false);
      }
      treeElement.select(/* omitFocus */ true);
    }
  }

  private hideSearchHighlights(): void {
    if (!this.searchResults || !this.searchResults.length || this.currentSearchResultIndex === -1) {
      return;
    }
    const searchResult = this.searchResults[this.currentSearchResultIndex];
    if (!searchResult.node) {
      return;
    }
    const treeElement = this.treeElementForNode(searchResult.node);
    if (treeElement) {
      treeElement.hideSearchHighlights();
    }
  }

  selectedDOMNode(): SDK.DOMModel.DOMNode|null {
    for (const treeOutline of this.treeOutlines) {
      if (treeOutline.selectedDOMNode()) {
        return treeOutline.selectedDOMNode();
      }
    }
    return null;
  }

  selectDOMNode(node: SDK.DOMModel.DOMNode, focus?: boolean): void {
    for (const treeOutline of this.treeOutlines) {
      const outline = ElementsTreeOutline.forDOMModel(node.domModel());
      if (outline === treeOutline) {
        treeOutline.selectDOMNode(node, focus);
      } else {
        treeOutline.selectDOMNode(null);
      }
    }
  }

  selectAndShowSidebarTab(tabId: SidebarPaneTabId): void {
    if (!this.sidebarPaneView) {
      return;
    }

    this.sidebarPaneView.tabbedPane().selectTab(tabId);

    if (!this.isShowing()) {
      void UI.ViewManager.ViewManager.instance().showView('elements');
    }
  }

  private updateBreadcrumbIfNeeded(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode[]>): void {
    const nodes = event.data;
    /* If we don't have a selected node then we can tell the breadcrumbs that & bail. */
    const selectedNode = this.selectedDOMNode();
    if (!selectedNode) {
      this.breadcrumbs.data = {
        crumbs: [],
        selectedNode: null,
      };
      return;
    }

    /* This function gets called whenever the tree outline is updated
     * and contains any nodes that have changed.
     * What we need to do is construct the new set of breadcrumb nodes, combining the Nodes
     * that we had before with the new nodes, and pass them into the breadcrumbs component.
     */

    // Get the current set of active crumbs
    const activeNode = ElementsComponents.Helper.legacyNodeToElementsComponentsNode(selectedNode);
    const existingCrumbs = [activeNode];
    for (let current: (SDK.DOMModel.DOMNode|null) = selectedNode.parentNode; current; current = current.parentNode) {
      existingCrumbs.push(ElementsComponents.Helper.legacyNodeToElementsComponentsNode(current));
    }

    /* Get the change nodes from the event & convert them to breadcrumb nodes */
    const newNodes = nodes.map(ElementsComponents.Helper.legacyNodeToElementsComponentsNode);
    const nodesThatHaveChangedMap = new Map<number, ElementsComponents.Helper.DOMNode>();
    newNodes.forEach(crumb => nodesThatHaveChangedMap.set(crumb.id, crumb));

    /* Loop over our existing crumbs, and if any have an ID that matches an ID from the new nodes
     * that we have, use the new node, rather than the one we had, because it's changed.
     */
    const newSetOfCrumbs = existingCrumbs.map(crumb => {
      const replacement = nodesThatHaveChangedMap.get(crumb.id);
      return replacement || crumb;
    });

    this.breadcrumbs.data = {
      crumbs: newSetOfCrumbs,
      selectedNode: activeNode,
    };
  }

  private crumbNodeSelected(event: ElementsComponents.ElementsBreadcrumbs.NodeSelectedEvent): void {
    this.selectDOMNode(event.legacyDomNode, true);
  }

  private treeOutlineForNode(node: SDK.DOMModel.DOMNode|null): ElementsTreeOutline|null {
    if (!node) {
      return null;
    }
    return ElementsTreeOutline.forDOMModel(node.domModel());
  }

  private treeElementForNode(node: SDK.DOMModel.DOMNode): ElementsTreeElement|null {
    const treeOutline = this.treeOutlineForNode(node);
    if (!treeOutline) {
      return null;
    }
    return treeOutline.findTreeElement(node);
  }

  private leaveUserAgentShadowDOM(node: SDK.DOMModel.DOMNode): SDK.DOMModel.DOMNode {
    let userAgentShadowRoot;
    while ((userAgentShadowRoot = node.ancestorUserAgentShadowRoot()) && userAgentShadowRoot.parentNode) {
      node = userAgentShadowRoot.parentNode;
    }
    return node;
  }

  async revealAndSelectNode(nodeToReveal: SDK.DOMModel.DOMNode, focus: boolean, omitHighlight?: boolean):
      Promise<void> {
    this.omitDefaultSelection = true;

    const node = Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom').get() ?
        nodeToReveal :
        this.leaveUserAgentShadowDOM(nodeToReveal);
    if (!omitHighlight) {
      node.highlightForTwoSeconds();
    }

    if (this.accessibilityTreeView) {
      void this.accessibilityTreeView.revealAndSelectNode(nodeToReveal);
    }

    await UI.ViewManager.ViewManager.instance().showView('elements', false, !focus);
    this.selectDOMNode(node, focus);
    delete this.omitDefaultSelection;
    if (!this.notFirstInspectElement) {
      ElementsPanel.firstInspectElementNodeNameForTest = node.nodeName();
      ElementsPanel.firstInspectElementCompletedForTest();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectElementCompleted();
    }
    this.notFirstInspectElement = true;
  }

  private showUAShadowDOMChanged(): void {
    for (const treeOutline of this.treeOutlines) {
      treeOutline.update();
    }
  }

  private setupTextSelectionHack(stylePaneWrapperElement: HTMLElement): void {
    // We "extend" the sidebar area when dragging, in order to keep smooth text
    // selection. It should be replaced by 'user-select: contain' in the future.
    const uninstallHackBound = uninstallHack.bind(this);

    // Fallback to cover unforeseen cases where text selection has ended.
    const uninstallHackOnMousemove = (event: Event): void => {
      if ((event as MouseEvent).buttons === 0) {
        uninstallHack.call(this);
      }
    };

    stylePaneWrapperElement.addEventListener('mousedown', (event: Event) => {
      if ((event as MouseEvent).button !== 0) {
        return;
      }
      this.splitWidget.element.classList.add('disable-resizer-for-elements-hack');
      stylePaneWrapperElement.style.setProperty('height', `${stylePaneWrapperElement.offsetHeight}px`);
      const largeLength = 1000000;
      stylePaneWrapperElement.style.setProperty('left', `${- 1 * largeLength}px`);
      stylePaneWrapperElement.style.setProperty('padding-left', `${largeLength}px`);
      stylePaneWrapperElement.style.setProperty('width', `calc(100% + ${largeLength}px)`);
      stylePaneWrapperElement.style.setProperty('position', 'fixed');

      stylePaneWrapperElement.window().addEventListener('blur', uninstallHackBound);
      stylePaneWrapperElement.window().addEventListener('contextmenu', uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener('dragstart', uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener('mousemove', uninstallHackOnMousemove, true);
      stylePaneWrapperElement.window().addEventListener('mouseup', uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener('visibilitychange', uninstallHackBound);
    }, true);

    function uninstallHack(this: ElementsPanel): void {
      this.splitWidget.element.classList.remove('disable-resizer-for-elements-hack');
      stylePaneWrapperElement.style.removeProperty('left');
      stylePaneWrapperElement.style.removeProperty('padding-left');
      stylePaneWrapperElement.style.removeProperty('width');
      stylePaneWrapperElement.style.removeProperty('position');

      stylePaneWrapperElement.window().removeEventListener('blur', uninstallHackBound);
      stylePaneWrapperElement.window().removeEventListener('contextmenu', uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener('dragstart', uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener('mousemove', uninstallHackOnMousemove, true);
      stylePaneWrapperElement.window().removeEventListener('mouseup', uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener('visibilitychange', uninstallHackBound);
    }
  }

  private initializeSidebarPanes(splitMode: SplitMode): void {
    this.splitWidget.setVertical(splitMode === SplitMode.VERTICAL);
    this.showToolbarPane(null /* widget */, null /* toggle */);

    const matchedStylePanesWrapper = new UI.Widget.VBox();
    matchedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    matchedStylePanesWrapper.element.setAttribute('jslog', `${VisualLogging.pane('styles').track({resize: true})}`);
    this.stylesWidget.show(matchedStylePanesWrapper.element);
    this.setupTextSelectionHack(matchedStylePanesWrapper.element);

    const computedStylePanesWrapper = new UI.Widget.VBox();
    computedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    computedStylePanesWrapper.element.setAttribute('jslog', `${VisualLogging.pane('computed').track({resize: true})}`);
    this.computedStyleWidget.show(computedStylePanesWrapper.element);

    const stylesSplitWidget = new UI.SplitWidget.SplitWidget(
        true /* isVertical */, true /* secondIsSidebar */, 'elements.styles.sidebar.width', 100);
    stylesSplitWidget.setMainWidget(matchedStylePanesWrapper);
    stylesSplitWidget.hideSidebar();
    stylesSplitWidget.enableShowModeSaving();
    stylesSplitWidget.addEventListener(UI.SplitWidget.Events.SHOW_MODE_CHANGED, () => {
      showMetricsWidgetInStylesPane();
    });
    this.stylesWidget.addEventListener(StylesSidebarPaneEvents.INITIAL_UPDATE_COMPLETED, () => {
      this.stylesWidget.appendToolbarItem(stylesSplitWidget.createShowHideSidebarButton(
          i18nString(UIStrings.showComputedStylesSidebar), i18nString(UIStrings.hideComputedStylesSidebar),
          i18nString(UIStrings.computedStylesShown), i18nString(UIStrings.computedStylesHidden), 'computed-styles'));
    });

    const showMetricsWidgetInComputedPane = (): void => {
      this.metricsWidget.show(computedStylePanesWrapper.element, this.computedStyleWidget.element);
      this.metricsWidget.toggleVisibility(true /* visible */);
      this.stylesWidget.removeEventListener(StylesSidebarPaneEvents.STYLES_UPDATE_COMPLETED, toggleMetricsWidget);
    };

    const showMetricsWidgetInStylesPane = (): void => {
      const showMergedComputedPane = stylesSplitWidget.showMode() === UI.SplitWidget.ShowMode.BOTH;
      if (showMergedComputedPane) {
        showMetricsWidgetInComputedPane();
      } else {
        this.metricsWidget.show(matchedStylePanesWrapper.element);
        if (!this.stylesWidget.hasMatchedStyles) {
          this.metricsWidget.toggleVisibility(false /* invisible */);
        }
        this.stylesWidget.addEventListener(StylesSidebarPaneEvents.STYLES_UPDATE_COMPLETED, toggleMetricsWidget);
      }
    };

    const toggleMetricsWidget = (event: Common.EventTarget.EventTargetEvent<StylesUpdateCompletedEvent>): void => {
      this.metricsWidget.toggleVisibility(event.data.hasMatchedStyles);
    };

    const tabSelected = (event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void => {
      const {tabId} = event.data;
      if (tabId === SidebarPaneTabId.COMPUTED) {
        computedStylePanesWrapper.show(computedView.element);
        showMetricsWidgetInComputedPane();
      } else if (tabId === SidebarPaneTabId.STYLES) {
        stylesSplitWidget.setSidebarWidget(computedStylePanesWrapper);
        showMetricsWidgetInStylesPane();
      }
    };

    this.sidebarPaneView = UI.ViewManager.ViewManager.instance().createTabbedLocation(
        () => UI.ViewManager.ViewManager.instance().showView('elements'), 'styles-pane-sidebar', true, true);
    const tabbedPane = this.sidebarPaneView.tabbedPane();
    tabbedPane.headerElement().setAttribute(
        'jslog',
        `${VisualLogging.toolbar('sidebar').track({keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space'})}`);
    if (this.splitMode !== SplitMode.VERTICAL) {
      this.splitWidget.installResizer(tabbedPane.headerElement());
    }

    const headerElement = tabbedPane.headerElement();
    UI.ARIAUtils.markAsNavigation(headerElement);
    UI.ARIAUtils.setLabel(headerElement, i18nString(UIStrings.sidePanelToolbar));

    const contentElement = tabbedPane.tabbedPaneContentElement();
    UI.ARIAUtils.markAsComplementary(contentElement);
    UI.ARIAUtils.setLabel(contentElement, i18nString(UIStrings.sidePanelContent));

    const stylesView = new UI.View.SimpleView(
        i18nString(UIStrings.styles), /* useShadowDom */ undefined, SidebarPaneTabId.STYLES as Lowercase<string>);
    this.sidebarPaneView.appendView(stylesView);
    stylesView.element.classList.add('flex-auto');
    stylesSplitWidget.show(stylesView.element);

    const computedView = new UI.View.SimpleView(
        i18nString(UIStrings.computed), /* useShadowDom */ undefined, SidebarPaneTabId.COMPUTED as Lowercase<string>);
    computedView.element.classList.add('composite', 'fill');

    tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, tabSelected, this);
    this.sidebarPaneView.appendView(computedView);
    this.stylesViewToReveal = stylesView;

    this.sidebarPaneView.appendApplicableItems('elements-sidebar');
    const extensionSidebarPanes = Extensions.ExtensionServer.ExtensionServer.instance().sidebarPanes();
    for (let i = 0; i < extensionSidebarPanes.length; ++i) {
      this.addExtensionSidebarPane(extensionSidebarPanes[i]);
    }

    this.splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());
  }

  private updateSidebarPosition(): void {
    if (this.sidebarPaneView && this.sidebarPaneView.tabbedPane().shouldHideOnDetach()) {
      return;
    }  // We can't reparent extension iframes.

    const position = Common.Settings.Settings.instance().moduleSetting('sidebar-position').get();
    let splitMode = SplitMode.HORIZONTAL;
    if (position === 'right' ||
        (position === 'auto' && UI.InspectorView.InspectorView.instance().element.offsetWidth > 680)) {
      splitMode = SplitMode.VERTICAL;
    }
    if (!this.sidebarPaneView) {
      this.initializeSidebarPanes(splitMode);
      return;
    }
    if (splitMode === this.splitMode) {
      return;
    }
    this.splitMode = splitMode;

    const tabbedPane = this.sidebarPaneView.tabbedPane();
    this.splitWidget.uninstallResizer(tabbedPane.headerElement());

    this.splitWidget.setVertical(this.splitMode === SplitMode.VERTICAL);
    this.showToolbarPane(null /* widget */, null /* toggle */);

    if (this.splitMode !== SplitMode.VERTICAL) {
      this.splitWidget.installResizer(tabbedPane.headerElement());
    }
  }

  private extensionSidebarPaneAdded(
      event: Common.EventTarget.EventTargetEvent<Extensions.ExtensionPanel.ExtensionSidebarPane>): void {
    this.addExtensionSidebarPane(event.data);
  }

  private addExtensionSidebarPane(pane: Extensions.ExtensionPanel.ExtensionSidebarPane): void {
    if (this.sidebarPaneView && pane.panelName() === this.name) {
      this.sidebarPaneView.appendView(pane);
    }
  }

  getComputedStyleWidget(): ComputedStyleWidget {
    return this.computedStyleWidget;
  }

  private setupStyleTracking(cssModel: SDK.CSSModel.CSSModel): void {
    const cssPropertyTracker = cssModel.createCSSPropertyTracker(TrackedCSSProperties);
    cssPropertyTracker.start();
    this.cssStyleTrackerByCSSModel.set(cssModel, cssPropertyTracker);
    cssPropertyTracker.addEventListener(
        SDK.CSSModel.CSSPropertyTrackerEvents.TRACKED_CSS_PROPERTIES_UPDATED, this.trackedCSSPropertiesUpdated, this);
  }

  private removeStyleTracking(cssModel: SDK.CSSModel.CSSModel): void {
    const cssPropertyTracker = this.cssStyleTrackerByCSSModel.get(cssModel);
    if (!cssPropertyTracker) {
      return;
    }

    cssPropertyTracker.stop();
    this.cssStyleTrackerByCSSModel.delete(cssModel);
    cssPropertyTracker.removeEventListener(
        SDK.CSSModel.CSSPropertyTrackerEvents.TRACKED_CSS_PROPERTIES_UPDATED, this.trackedCSSPropertiesUpdated, this);
  }

  private trackedCSSPropertiesUpdated({data: domNodes}:
                                          Common.EventTarget.EventTargetEvent<(SDK.DOMModel.DOMNode | null)[]>): void {
    for (const domNode of domNodes) {
      if (!domNode) {
        continue;
      }
      const treeElement = this.treeElementForNode(domNode);
      if (treeElement) {
        void treeElement.updateStyleAdorners();
      }

      void ElementsComponents.LayoutPane.LayoutPane.instance().render();
    }
  }

  showAdornerSettingsPane(): void {
    // Delay the initialization of the pane to the first showing
    // since usually this pane won't be used.
    if (!this.adornerSettingsPane) {
      this.adornerSettingsPane = new ElementsComponents.AdornerSettingsPane.AdornerSettingsPane();
      this.adornerSettingsPane.addEventListener('adornersettingupdated', (event: Event) => {
        const {adornerName, isEnabledNow, newSettings} =
            (event as ElementsComponents.AdornerSettingsPane.AdornerSettingUpdatedEvent).data;
        const adornersToUpdate = this.adornersByName.get(adornerName);
        if (adornersToUpdate) {
          for (const adorner of adornersToUpdate) {
            isEnabledNow ? adorner.show() : adorner.hide();
          }
        }
        this.adornerManager.updateSettings(newSettings);
      });
      this.searchableViewInternal.element.prepend(this.adornerSettingsPane);
    }

    const adornerSettings = this.adornerManager.getSettings();
    this.adornerSettingsPane.data = {
      settings: adornerSettings,
    };
    this.adornerSettingsPane.show();
  }

  isAdornerEnabled(adornerText: string): boolean {
    return this.adornerManager.isAdornerEnabled(adornerText);
  }

  registerAdorner(adorner: Adorners.Adorner.Adorner): void {
    let adornerSet = this.adornersByName.get(adorner.name);
    if (!adornerSet) {
      adornerSet = new Set();
      this.adornersByName.set(adorner.name, adornerSet);
    }
    adornerSet.add(adorner);
    if (!this.isAdornerEnabled(adorner.name)) {
      adorner.hide();
    }
  }

  deregisterAdorner(adorner: Adorners.Adorner.Adorner): void {
    const adornerSet = this.adornersByName.get(adorner.name);
    if (!adornerSet) {
      return;
    }
    adornerSet.delete(adorner);
  }

  private static firstInspectElementCompletedForTest = function(): void {};
  private static firstInspectElementNodeNameForTest = '';
}

// @ts-ignore exported for Tests.js
globalThis.Elements = globalThis.Elements || {};
// @ts-ignore exported for Tests.js
globalThis.Elements.ElementsPanel = ElementsPanel;

const enum SplitMode {
  VERTICAL = 'Vertical',
  HORIZONTAL = 'Horizontal',
}

const TrackedCSSProperties = [
  {
    name: 'display',
    value: 'grid',
  },
  {
    name: 'display',
    value: 'inline-grid',
  },
  {
    name: 'display',
    value: 'flex',
  },
  {
    name: 'display',
    value: 'inline-flex',
  },
  {
    name: 'container-type',
    value: 'inline-size',
  },
  {
    name: 'container-type',
    value: 'block-size',
  },
  {
    name: 'container-type',
    value: 'size',
  },
];

export class ContextMenuProvider implements
    UI.ContextMenu.Provider<SDK.RemoteObject.RemoteObject|SDK.DOMModel.DOMNode|SDK.DOMModel.DeferredDOMNode> {
  appendApplicableItems(
      event: Event, contextMenu: UI.ContextMenu.ContextMenu,
      object: SDK.RemoteObject.RemoteObject|SDK.DOMModel.DOMNode|SDK.DOMModel.DeferredDOMNode): void {
    if (object instanceof SDK.RemoteObject.RemoteObject && !object.isNode()) {
      return;
    }
    if (ElementsPanel.instance().element.isAncestor(event.target as (Node | null))) {
      return;
    }
    contextMenu.revealSection().appendItem(
        i18nString(UIStrings.openInElementsPanel), () => Common.Revealer.reveal(object),
        {jslogContext: 'elements.reveal-node'});
  }
}

export class DOMNodeRevealer implements
    Common.Revealer.Revealer<SDK.DOMModel.DOMNode|SDK.DOMModel.DeferredDOMNode|SDK.RemoteObject.RemoteObject> {
  reveal(node: SDK.DOMModel.DOMNode|SDK.DOMModel.DeferredDOMNode|SDK.RemoteObject.RemoteObject, omitFocus?: boolean):
      Promise<void> {
    const panel = ElementsPanel.instance();
    panel.pendingNodeReveal = true;

    return (new Promise<void>(revealPromise)).catch((reason: Error) => {
      let message: string;
      if (Platform.UserVisibleError.isUserVisibleError(reason)) {
        message = reason.message;
      } else {
        message = i18nString(UIStrings.nodeCannotBeFoundInTheCurrent);
      }

      Common.Console.Console.instance().warn(message);
      // Blink tests expect an exception to be raised and unhandled here to detect that the node
      // was actually not successfully viewed.
      throw reason;
    });

    function revealPromise(
        resolve: () => void, reject: (arg0: Platform.UserVisibleError.UserVisibleError) => void): void {
      if (node instanceof SDK.DOMModel.DOMNode) {
        onNodeResolved((node as SDK.DOMModel.DOMNode));
      } else if (node instanceof SDK.DOMModel.DeferredDOMNode) {
        (node as SDK.DOMModel.DeferredDOMNode).resolve(checkDeferredDOMNodeThenReveal);
      } else {
        const domModel = node.runtimeModel().target().model(SDK.DOMModel.DOMModel);
        if (domModel) {
          void domModel.pushObjectAsNodeToFrontend(node).then(checkRemoteObjectThenReveal);
        } else {
          const msg = i18nString(UIStrings.nodeCannotBeFoundInTheCurrent);
          reject(new Platform.UserVisibleError.UserVisibleError(msg));
        }
      }

      function onNodeResolved(resolvedNode: SDK.DOMModel.DOMNode): void {
        panel.pendingNodeReveal = false;

        // A detached node could still have a parent and ownerDocument
        // properties, which means stepping up through the hierarchy to ensure
        // that the root node is the document itself. Any break implies
        // detachment.
        let currentNode: SDK.DOMModel.DOMNode = resolvedNode;
        while (currentNode.parentNode) {
          currentNode = currentNode.parentNode;
        }
        const isDetached = !(currentNode instanceof SDK.DOMModel.DOMDocument);

        const isDocument = node instanceof SDK.DOMModel.DOMDocument;
        if (!isDocument && isDetached) {
          const msg = i18nString(UIStrings.nodeCannotBeFoundInTheCurrent);
          reject(new Platform.UserVisibleError.UserVisibleError(msg));
          return;
        }

        if (resolvedNode) {
          void panel.revealAndSelectNode(resolvedNode, !omitFocus).then(resolve);
          return;
        }
        const msg = i18nString(UIStrings.nodeCannotBeFoundInTheCurrent);
        reject(new Platform.UserVisibleError.UserVisibleError(msg));
      }

      function checkRemoteObjectThenReveal(resolvedNode: SDK.DOMModel.DOMNode|null): void {
        if (!resolvedNode) {
          const msg = i18nString(UIStrings.theRemoteObjectCouldNotBe);
          reject(new Platform.UserVisibleError.UserVisibleError(msg));
          return;
        }
        onNodeResolved(resolvedNode);
      }

      function checkDeferredDOMNodeThenReveal(resolvedNode: SDK.DOMModel.DOMNode|null): void {
        if (!resolvedNode) {
          const msg = i18nString(UIStrings.theDeferredDomNodeCouldNotBe);
          reject(new Platform.UserVisibleError.UserVisibleError(msg));
          return;
        }
        onNodeResolved(resolvedNode);
      }
    }
  }
}

export class CSSPropertyRevealer implements Common.Revealer.Revealer<SDK.CSSProperty.CSSProperty> {
  reveal(property: SDK.CSSProperty.CSSProperty): Promise<void> {
    const panel = ElementsPanel.instance();
    return panel.revealProperty(property);
  }
}

export class ElementsActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const node = context.flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return true;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(node.domModel());
    if (!treeOutline) {
      return true;
    }

    switch (actionId) {
      case 'elements.hide-element':
        void treeOutline.toggleHideElement(node);
        return true;
      case 'elements.edit-as-html':
        treeOutline.toggleEditAsHTML(node);
        return true;
      case 'elements.duplicate-element':
        treeOutline.duplicateNode(node);
        return true;
      case 'elements.copy-styles':
        void treeOutline.findTreeElement(node)?.copyStyles();
        return true;
      case 'elements.undo':
        void SDK.DOMModel.DOMModelUndoStack.instance().undo();
        ElementsPanel.instance().stylesWidget.forceUpdate();
        return true;
      case 'elements.redo':
        void SDK.DOMModel.DOMModelUndoStack.instance().redo();
        ElementsPanel.instance().stylesWidget.forceUpdate();
        return true;
      case 'elements.show-styles':
        ElementsPanel.instance().selectAndShowSidebarTab(SidebarPaneTabId.STYLES);
        return true;
      case 'elements.show-computed':
        ElementsPanel.instance().selectAndShowSidebarTab(SidebarPaneTabId.COMPUTED);
        return true;
      case 'elements.toggle-eye-dropper': {
        const colorSwatchPopoverIcon = UI.Context.Context.instance().flavor(ColorSwatchPopoverIcon);
        if (!colorSwatchPopoverIcon) {
          return false;
        }

        void colorSwatchPopoverIcon.toggleEyeDropper();
      }
    }
    return false;
  }
}

let pseudoStateMarkerDecoratorInstance: PseudoStateMarkerDecorator;
export class PseudoStateMarkerDecorator implements MarkerDecorator {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): PseudoStateMarkerDecorator {
    const {forceNew} = opts;
    if (!pseudoStateMarkerDecoratorInstance || forceNew) {
      pseudoStateMarkerDecoratorInstance = new PseudoStateMarkerDecorator();
    }

    return pseudoStateMarkerDecoratorInstance;
  }

  decorate(node: SDK.DOMModel.DOMNode): {
    title: string,
    color: string,
  }|null {
    const pseudoState = node.domModel().cssModel().pseudoState(node);
    if (!pseudoState) {
      return null;
    }
    return {
      color: '--sys-color-orange-bright',
      title: i18nString(UIStrings.elementStateS, {PH1: ':' + pseudoState.join(', :')}),
    };
  }
}
