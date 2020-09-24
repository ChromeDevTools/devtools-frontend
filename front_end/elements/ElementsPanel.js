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

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Extensions from '../extensions/extensions.js';
import * as Host from '../host/host.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ComputedStyleWidget} from './ComputedStyleWidget.js';
import {createElementsBreadcrumbs, DOMNode} from './ElementsBreadcrumbs_bridge.js';  // eslint-disable-line no-unused-vars
import {ElementsTreeElement} from './ElementsTreeElement.js';  // eslint-disable-line no-unused-vars
import {ElementsTreeElementHighlighter} from './ElementsTreeElementHighlighter.js';
import {ElementsTreeOutline} from './ElementsTreeOutline.js';
import {MarkerDecorator} from './MarkerDecorator.js';  // eslint-disable-line no-unused-vars
import {MetricsSidebarPane} from './MetricsSidebarPane.js';
import {Events as StylesSidebarPaneEvents, StylesSidebarPane} from './StylesSidebarPane.js';

/**
 *
 * @param {!SDK.DOMModel.DOMNode} node
 * @return {!DOMNode}
 */
const legacyNodeToNewBreadcrumbsNode = node => {
  return {
    parentNode: node.parentNode,
    id: /** @type {number} */ (node.id),
    nodeType: node.nodeType(),
    pseudoType: node.pseudoType(),
    shadowRootType: node.shadowRootType(),
    nodeName: node.nodeName(),
    nodeNameNicelyCased: node.nodeNameInCorrectCase(),
    legacyDomNode: node,
    highlightNode: () => node.highlight(),
    clearHighlight: () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(),
    getAttribute: node.getAttribute.bind(node),
  };
};

/** @type {!ElementsPanel} */
let elementsPanelInstance;

/**
 * @implements {UI.SearchableView.Searchable}
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.DOMModel.DOMModel>}
 * @implements {UI.View.ViewLocationResolver}
 * @unrestricted
 */
export class ElementsPanel extends UI.Panel.Panel {
  constructor() {
    super('elements');
    this.registerRequiredCSS('elements/elementsPanel.css');
    this._splitWidget = new UI.SplitWidget.SplitWidget(true, true, 'elementsPanelSplitViewState', 325, 325);
    this._splitWidget.addEventListener(
        UI.SplitWidget.Events.SidebarSizeChanged, this._updateTreeOutlineVisibleWidth.bind(this));
    this._splitWidget.show(this.element);

    this._searchableView = new UI.SearchableView.SearchableView(this);
    this._searchableView.setMinimumSize(25, 28);
    this._searchableView.setPlaceholder(Common.UIString.UIString('Find by string, selector, or XPath'));
    const stackElement = this._searchableView.element;

    this._contentElement = document.createElement('div');
    const crumbsContainer = document.createElement('div');
    stackElement.appendChild(this._contentElement);
    stackElement.appendChild(crumbsContainer);

    this._splitWidget.setMainWidget(this._searchableView);
    /** @type {?_splitMode} */
    this._splitMode = null;

    this._contentElement.id = 'elements-content';
    // FIXME: crbug.com/425984
    if (Common.Settings.Settings.instance().moduleSetting('domWordWrap').get()) {
      this._contentElement.classList.add('elements-wrap');
    }
    Common.Settings.Settings.instance()
        .moduleSetting('domWordWrap')
        .addChangeListener(this._domWordWrapSettingChanged.bind(this));

    crumbsContainer.id = 'elements-crumbs';

    this._breadcrumbs = createElementsBreadcrumbs();
    this._breadcrumbs.addEventListener('node-selected', /** @param {!Event} event */ event => {
      this._crumbNodeSelected(/** @type {?} */ (event));
    });

    crumbsContainer.appendChild(this._breadcrumbs);

    this._stylesWidget = new StylesSidebarPane();
    this._computedStyleWidget = new ComputedStyleWidget();
    this._metricsWidget = new MetricsSidebarPane();

    Common.Settings.Settings.instance()
        .moduleSetting('sidebarPosition')
        .addChangeListener(this._updateSidebarPosition.bind(this));
    this._updateSidebarPosition();

    /** @type {!Set.<!ElementsTreeOutline>} */
    this._treeOutlines = new Set();
    /** @type {!Map<!ElementsTreeOutline, !Element>} */
    this._treeOutlineHeaders = new Map();
    /** @type {!Map<!SDK.CSSModel.CSSModel, !SDK.CSSModel.CSSPropertyTracker>} */
    this._gridStyleTrackerByCSSModel = new Map();
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.DOMModel.DOMModel, this);
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.NameChanged,
        event => this._targetNameChanged(/** @type {!SDK.SDKModel.Target} */ (event.data)));
    Common.Settings.Settings.instance()
        .moduleSetting('showUAShadowDOM')
        .addChangeListener(this._showUAShadowDOMChanged.bind(this));
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DocumentUpdated, this._documentUpdatedEvent, this);
    Extensions.ExtensionServer.ExtensionServer.instance().addEventListener(
        Extensions.ExtensionServer.Events.SidebarPaneAdded, this._extensionSidebarPaneAdded, this);

    /**
     * @type {!Array.<{domModel: !SDK.DOMModel.DOMModel, index: number, node: (?SDK.DOMModel.DOMNode|undefined)}>|undefined}
     */
    this._searchResults;
    this._currentSearchResultIndex = -1;  // -1 represents the initial invalid state

    this._pendingNodeReveal = false;
  }

  /**
   * @param {{forceNew: ?boolean}=} opts
   * @return {!ElementsPanel}
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!elementsPanelInstance || forceNew) {
      elementsPanelInstance = new ElementsPanel();
    }

    return elementsPanelInstance;
  }

  /**
   * @param {!SDK.CSSProperty.CSSProperty} cssProperty
   */
  _revealProperty(cssProperty) {
    if (!this.sidebarPaneView || !this._stylesViewToReveal) {
      return Promise.resolve();
    }

    return this.sidebarPaneView.showView(this._stylesViewToReveal).then(() => {
      this._stylesWidget.revealProperty(/** @type {!SDK.CSSProperty.CSSProperty} */ (cssProperty));
    });
  }

  /**
   * @override
   * @param {string} locationName
   * @return {?UI.View.ViewLocation}
   */
  resolveLocation(locationName) {
    return this.sidebarPaneView || null;
  }

  /**
   * @param {?UI.Widget.Widget} widget
   * @param {?UI.Toolbar.ToolbarToggle} toggle
   */
  showToolbarPane(widget, toggle) {
    // TODO(luoe): remove this function once its providers have an alternative way to reveal their views.
    this._stylesWidget.showToolbarPane(widget, toggle);
  }

  /**
   * @override
   * @param {!SDK.DOMModel.DOMModel} domModel
   */
  modelAdded(domModel) {
    const parentModel = domModel.parentModel();
    let treeOutline = parentModel ? ElementsTreeOutline.forDOMModel(parentModel) : null;
    if (!treeOutline) {
      treeOutline = new ElementsTreeOutline(true, true);
      treeOutline.setWordWrap(Common.Settings.Settings.instance().moduleSetting('domWordWrap').get());
      treeOutline.addEventListener(ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);
      treeOutline.addEventListener(
          ElementsTreeOutline.Events.ElementsTreeUpdated, this._updateBreadcrumbIfNeeded, this);
      new ElementsTreeElementHighlighter(treeOutline);
      this._treeOutlines.add(treeOutline);
      if (domModel.target().parentTarget()) {
        const element = document.createElement('div');
        element.classList.add('elements-tree-header');
        this._treeOutlineHeaders.set(treeOutline, element);
        this._targetNameChanged(domModel.target());
      }
    }
    treeOutline.wireToDOMModel(domModel);

    this._setupStyleTracking(domModel.cssModel());

    // Perform attach if necessary.
    if (this.isShowing()) {
      this.wasShown();
    }
  }

  /**
   * @override
   * @param {!SDK.DOMModel.DOMModel} domModel
   */
  modelRemoved(domModel) {
    const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
    if (!treeOutline) {
      return;
    }

    treeOutline.unwireFromDOMModel(domModel);
    if (domModel.parentModel()) {
      return;
    }
    this._treeOutlines.delete(treeOutline);
    const header = this._treeOutlineHeaders.get(treeOutline);
    if (header) {
      header.remove();
    }
    this._treeOutlineHeaders.delete(treeOutline);
    treeOutline.element.remove();

    this._removeStyleTracking(domModel.cssModel());
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   */
  _targetNameChanged(target) {
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
    if (!treeOutline) {
      return;
    }
    const header = this._treeOutlineHeaders.get(treeOutline);
    if (!header) {
      return;
    }
    header.removeChildren();
    header.createChild('div', 'elements-tree-header-frame').textContent = Common.UIString.UIString('Frame');
    header.appendChild(Components.Linkifier.Linkifier.linkifyURL(
        target.inspectedURL(), /** @type {!Components.Linkifier.LinkifyURLOptions} */ ({text: target.name()})));
  }

  _updateTreeOutlineVisibleWidth() {
    if (!this._treeOutlines.size) {
      return;
    }

    let width = this._splitWidget.element.offsetWidth;
    if (this._splitWidget.isVertical()) {
      width -= this._splitWidget.sidebarSize();
    }
    for (const treeOutline of this._treeOutlines) {
      treeOutline.setVisibleWidth(width);
    }
  }

  /**
   * @override
   */
  focus() {
    if (this._treeOutlines.size) {
      this._treeOutlines.values().next().value.focus();
    }
  }

  /**
   * @override
   * @return {!UI.SearchableView.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  /**
   * @override
   */
  wasShown() {
    UI.Context.Context.instance().setFlavor(ElementsPanel, this);

    for (const treeOutline of this._treeOutlines) {
      // Attach heavy component lazily
      if (treeOutline.element.parentElement !== this._contentElement) {
        const header = this._treeOutlineHeaders.get(treeOutline);
        if (header) {
          this._contentElement.appendChild(header);
        }
        this._contentElement.appendChild(treeOutline.element);
      }
    }
    super.wasShown();

    const domModels = SDK.SDKModel.TargetManager.instance().models(SDK.DOMModel.DOMModel);
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
          this._documentUpdated(domModel);
        } else {
          domModel.requestDocument();
        }
      }
    }
  }

  /**
   * @override
   */
  willHide() {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    for (const treeOutline of this._treeOutlines) {
      treeOutline.setVisible(false);
      // Detach heavy component on hide
      this._contentElement.removeChild(treeOutline.element);
      const header = this._treeOutlineHeaders.get(treeOutline);
      if (header) {
        this._contentElement.removeChild(header);
      }
    }
    super.willHide();
    UI.Context.Context.instance().setFlavor(ElementsPanel, null);
  }

  /**
   * @override
   */
  onResize() {
    this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));  // Do not force layout.
    this._updateTreeOutlineVisibleWidth();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _selectedNodeChanged(event) {
    let selectedNode = /** @type {?SDK.DOMModel.DOMNode} */ (event.data.node);

    // If the selectedNode is a pseudoNode, we want to ensure that it has a valid parentNode
    if (selectedNode && (selectedNode.pseudoType() && !selectedNode.parentNode)) {
      selectedNode = null;
    }
    const focus = /** @type {boolean} */ (event.data.focus);
    for (const treeOutline of this._treeOutlines) {
      if (!selectedNode || ElementsTreeOutline.forDOMModel(selectedNode.domModel()) !== treeOutline) {
        treeOutline.selectDOMNode(null);
      }
    }

    if (selectedNode) {
      const activeNode = legacyNodeToNewBreadcrumbsNode(selectedNode);
      const crumbs = [activeNode];

      for (let current = selectedNode.parentNode; current; current = current.parentNode) {
        crumbs.push(legacyNodeToNewBreadcrumbsNode(current));
      }

      this._breadcrumbs.data = {
        crumbs,
        selectedNode: legacyNodeToNewBreadcrumbsNode(selectedNode),
      };
    } else {
      this._breadcrumbs.data = {crumbs: [], selectedNode: null};
    }

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, selectedNode);

    if (!selectedNode) {
      return;
    }
    selectedNode.setAsInspectedNode();
    if (focus) {
      this._selectedNodeOnReset = selectedNode;
      this._hasNonDefaultSelectedNode = true;
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _documentUpdatedEvent(event) {
    const domModel = /** @type {!SDK.DOMModel.DOMModel} */ (event.data);
    this._documentUpdated(domModel);
    this._removeStyleTracking(domModel.cssModel());
    this._setupStyleTracking(domModel.cssModel());
  }

  /**
   * @param {!SDK.DOMModel.DOMModel} domModel
   */
  _documentUpdated(domModel) {
    this._searchableView.resetSearch();

    if (!domModel.existingDocument()) {
      if (this.isShowing()) {
        domModel.requestDocument();
      }
      return;
    }

    this._hasNonDefaultSelectedNode = false;

    if (this._omitDefaultSelection) {
      return;
    }

    const savedSelectedNodeOnReset = this._selectedNodeOnReset;
    restoreNode.call(this, domModel, this._selectedNodeOnReset || null);

    /**
     * @param {!SDK.DOMModel.DOMModel} domModel
     * @param {?SDK.DOMModel.DOMNode} staleNode
     * @this {ElementsPanel}
     */
    async function restoreNode(domModel, staleNode) {
      const nodePath = staleNode ? staleNode.path() : null;
      const restoredNodeId = nodePath ? await domModel.pushNodeByPathToFrontend(nodePath) : null;

      if (savedSelectedNodeOnReset !== this._selectedNodeOnReset) {
        return;
      }
      let node = restoredNodeId ? domModel.nodeForId(restoredNodeId) : null;
      if (!node) {
        const inspectedDocument = domModel.existingDocument();
        node = inspectedDocument ? inspectedDocument.body || inspectedDocument.documentElement : null;
      }
      // If `node` is null here, the document hasn't been transmitted from the backend yet
      // and isn't in a valid state to have a default-selected node. Another document update
      // should be forthcoming. In the meantime, don't set the default-selected node or notify
      // the test that it's ready, because it isn't.
      if (node) {
        this._setDefaultSelectedNode(node);
        this._lastSelectedNodeSelectedForTest();
      }
    }
  }

  _lastSelectedNodeSelectedForTest() {
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   */
  _setDefaultSelectedNode(node) {
    if (!node || this._hasNonDefaultSelectedNode || this._pendingNodeReveal) {
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

  /**
   * @override
   */
  searchCanceled() {
    this._searchConfig = undefined;
    this._hideSearchHighlights();

    this._searchableView.updateSearchMatchesCount(0);

    this._currentSearchResultIndex = -1;
    delete this._searchResults;

    SDK.DOMModel.DOMModel.cancelSearch();
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    const query = searchConfig.query;

    const whitespaceTrimmedQuery = query.trim();
    if (!whitespaceTrimmedQuery.length) {
      return;
    }

    if (!this._searchConfig || this._searchConfig.query !== query) {
      this.searchCanceled();
    } else {
      this._hideSearchHighlights();
    }

    this._searchConfig = searchConfig;

    const showUAShadowDOM = Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM').get();
    const domModels = SDK.SDKModel.TargetManager.instance().models(SDK.DOMModel.DOMModel);
    const promises = domModels.map(domModel => domModel.performSearch(whitespaceTrimmedQuery, showUAShadowDOM));
    Promise.all(promises).then(resultCounts => {
      this._searchResults = [];
      for (let i = 0; i < resultCounts.length; ++i) {
        const resultCount = resultCounts[i];
        for (let j = 0; j < resultCount; ++j) {
          this._searchResults.push({domModel: domModels[i], index: j, node: undefined});
        }
      }
      this._searchableView.updateSearchMatchesCount(this._searchResults.length);
      if (!this._searchResults.length) {
        return;
      }
      if (this._currentSearchResultIndex >= this._searchResults.length) {
        this._currentSearchResultIndex = -1;
      }

      let index = this._currentSearchResultIndex;

      if (shouldJump) {
        if (this._currentSearchResultIndex === -1) {
          index = jumpBackwards ? -1 : 0;
        } else {
          index = jumpBackwards ? index - 1 : index + 1;
        }
        this._jumpToSearchResult(index);
      }
    });
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _domWordWrapSettingChanged(event) {
    this._contentElement.classList.toggle('elements-wrap', /** @type {boolean} */ (event.data));
    for (const treeOutline of this._treeOutlines) {
      treeOutline.setWordWrap(/** @type {boolean} */ (event.data));
    }
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   */
  switchToAndFocus(node) {
    // Reset search restore.
    this._searchableView.cancelSearch();
    UI.ViewManager.ViewManager.instance().showView('elements').then(() => this.selectDOMNode(node, true));
  }

  /**
   * @param {number} index
   */
  _jumpToSearchResult(index) {
    if (!this._searchResults) {
      return;
    }

    this._currentSearchResultIndex = (index + this._searchResults.length) % this._searchResults.length;
    this._highlightCurrentSearchResult();
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchResults || !this._searchConfig) {
      return;
    }
    this.performSearch(this._searchConfig, true);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults || !this._searchConfig) {
      return;
    }
    this.performSearch(this._searchConfig, true, true);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return false;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return false;
  }

  _highlightCurrentSearchResult() {
    const index = this._currentSearchResultIndex;
    const searchResults = this._searchResults;
    if (!searchResults) {
      return;
    }
    const searchResult = searchResults[index];

    this._searchableView.updateCurrentMatchIndex(index);
    if (searchResult.node === null) {
      return;
    }

    if (typeof searchResult.node === 'undefined') {
      // No data for slot, request it.
      searchResult.domModel.searchResult(searchResult.index).then(node => {
        searchResult.node = node;

        // If any of these properties are undefined or reset to an invalid value,
        // this means the search/highlight request is outdated.
        const highlightRequestValid =
            this._searchConfig && this._searchResults && (this._currentSearchResultIndex !== -1);
        if (highlightRequestValid) {
          this._highlightCurrentSearchResult();
        }
      });
      return;
    }

    const treeElement = this._treeElementForNode(searchResult.node);
    searchResult.node.scrollIntoView();
    if (treeElement) {
      this._searchConfig && treeElement.highlightSearchResults(this._searchConfig.query);
      treeElement.reveal();
      const matches = treeElement.listItemElement.getElementsByClassName(UI.UIUtils.highlightedSearchResultClassName);
      if (matches.length) {
        matches[0].scrollIntoViewIfNeeded(false);
      }
    }
  }

  _hideSearchHighlights() {
    if (!this._searchResults || !this._searchResults.length || this._currentSearchResultIndex === -1) {
      return;
    }
    const searchResult = this._searchResults[this._currentSearchResultIndex];
    if (!searchResult.node) {
      return;
    }
    const treeElement = this._treeElementForNode(searchResult.node);
    if (treeElement) {
      treeElement.hideSearchHighlights();
    }
  }

  /**
   * @return {?SDK.DOMModel.DOMNode}
   */
  selectedDOMNode() {
    for (const treeOutline of this._treeOutlines) {
      if (treeOutline.selectedDOMNode()) {
        return treeOutline.selectedDOMNode();
      }
    }
    return null;
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {boolean=} focus
   */
  selectDOMNode(node, focus) {
    for (const treeOutline of this._treeOutlines) {
      const outline = ElementsTreeOutline.forDOMModel(node.domModel());
      if (outline === treeOutline) {
        treeOutline.selectDOMNode(node, focus);
      } else {
        treeOutline.selectDOMNode(null);
      }
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _updateBreadcrumbIfNeeded(event) {
    const nodes = /** @type {!Array.<!SDK.DOMModel.DOMNode>} */ (event.data);
    /* If we don't have a selected node then we can tell the breadcrumbs that & bail. */
    const selectedNode = this.selectedDOMNode();
    if (!selectedNode) {
      this._breadcrumbs.data = {
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
    const activeNode = legacyNodeToNewBreadcrumbsNode(selectedNode);
    const existingCrumbs = [activeNode];
    for (let current = selectedNode.parentNode; current; current = current.parentNode) {
      existingCrumbs.push(legacyNodeToNewBreadcrumbsNode(current));
    }

    /* Get the change nodes from the event & convert them to breadcrumb nodes */
    const newNodes = nodes.map(legacyNodeToNewBreadcrumbsNode);
    const nodesThatHaveChangedMap = new Map();
    newNodes.forEach(crumb => nodesThatHaveChangedMap.set(crumb.id, crumb));

    /* Loop over our existing crumbs, and if any have an ID that matches an ID from the new nodes
     * that we have, use the new node, rather than the one we had, because it's changed.
     */
    const newSetOfCrumbs = existingCrumbs.map(crumb => {
      const replacement = nodesThatHaveChangedMap.get(crumb.id);
      return replacement || crumb;
    });

    this._breadcrumbs.data = {
      crumbs: newSetOfCrumbs,
      selectedNode: activeNode,
    };
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _crumbNodeSelected(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);
    this.selectDOMNode(node, true);
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   * @return {?ElementsTreeOutline}
   */
  _treeOutlineForNode(node) {
    if (!node) {
      return null;
    }
    return ElementsTreeOutline.forDOMModel(node.domModel());
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {?ElementsTreeElement}
   */
  _treeElementForNode(node) {
    const treeOutline = this._treeOutlineForNode(node);
    if (!treeOutline) {
      return null;
    }
    return /** @type {?ElementsTreeElement} */ (treeOutline.findTreeElement(node));
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!SDK.DOMModel.DOMNode}
   */
  _leaveUserAgentShadowDOM(node) {
    let userAgentShadowRoot;
    while ((userAgentShadowRoot = node.ancestorUserAgentShadowRoot()) && userAgentShadowRoot.parentNode) {
      node = userAgentShadowRoot.parentNode;
    }
    return node;
  }

  /**
   * @suppress {accessControls}
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {boolean} focus
   * @param {boolean=} omitHighlight
   * @return {!Promise<void>}
   */
  revealAndSelectNode(node, focus, omitHighlight) {
    this._omitDefaultSelection = true;

    node = Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM').get() ?
        node :
        this._leaveUserAgentShadowDOM(node);
    if (!omitHighlight) {
      node.highlightForTwoSeconds();
    }

    return UI.ViewManager.ViewManager.instance().showView('elements', false, !focus).then(() => {
      this.selectDOMNode(node, focus);
      delete this._omitDefaultSelection;

      if (!this._notFirstInspectElement) {
        ElementsPanel._firstInspectElementNodeNameForTest = node.nodeName();
        ElementsPanel._firstInspectElementCompletedForTest();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectElementCompleted();
      }
      this._notFirstInspectElement = true;
    });
  }

  _showUAShadowDOMChanged() {
    for (const treeOutline of this._treeOutlines) {
      treeOutline.update();
    }
  }

  /**
   * @param {!HTMLElement} stylePaneWrapperElement
   */
  _setupTextSelectionHack(stylePaneWrapperElement) {
    // We "extend" the sidebar area when dragging, in order to keep smooth text
    // selection. It should be replaced by 'user-select: contain' in the future.
    const uninstallHackBound = uninstallHack.bind(this);

    // Fallback to cover unforeseen cases where text selection has ended.
    const uninstallHackOnMousemove = /** @param {!Event} event */ event => {
      if (/** @type {!MouseEvent} */ (event).buttons === 0) {
        uninstallHack.call(this);
      }
    };

    stylePaneWrapperElement.addEventListener('mousedown', /** @param {!Event} event */ event => {
      if (/** @type {!MouseEvent} */ (event).button !== 0 /* left or main button */) {
        return;
      }
      this._splitWidget.element.classList.add('disable-resizer-for-elements-hack');
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

    /**
     * @this {!ElementsPanel}
     */
    function uninstallHack() {
      this._splitWidget.element.classList.remove('disable-resizer-for-elements-hack');
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

  /**
   * @param {!_splitMode} splitMode
   */
  _initializeSidebarPanes(splitMode) {
    this._splitWidget.setVertical(splitMode === _splitMode.Vertical);
    this.showToolbarPane(null /* widget */, null /* toggle */);

    const matchedStylePanesWrapper = new UI.Widget.VBox();
    matchedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    this._stylesWidget.show(matchedStylePanesWrapper.element);
    this._setupTextSelectionHack(matchedStylePanesWrapper.element);

    const computedStylePanesWrapper = new UI.Widget.VBox();
    computedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    this._computedStyleWidget.show(computedStylePanesWrapper.element);

    const stylesSplitWidget = new UI.SplitWidget.SplitWidget(
        true /* isVertical */, true /* secondIsSidebar */, 'elements.styles.sidebar.width', 100);
    stylesSplitWidget.setMainWidget(matchedStylePanesWrapper);
    stylesSplitWidget.hideSidebar();
    stylesSplitWidget.enableShowModeSaving();
    stylesSplitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, () => {
      showMetricsWidgetInStylesPane();
    });
    this._stylesWidget.addEventListener(StylesSidebarPaneEvents.InitialUpdateCompleted, () => {
      this._stylesWidget.appendToolbarItem(stylesSplitWidget.createShowHideSidebarButton(ls`Computed Styles sidebar`));
    });

    const showMetricsWidgetInStylesPane = () => {
      const showMergedComputedPane = stylesSplitWidget.showMode() === UI.SplitWidget.ShowMode.Both;
      if (showMergedComputedPane) {
        this._metricsWidget.show(computedStylePanesWrapper.element, this._computedStyleWidget.element);
      } else {
        this._metricsWidget.show(matchedStylePanesWrapper.element);
      }
    };

    let skippedInitialTabSelectedEvent = false;

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     */
    const tabSelected = event => {
      const tabId = /** @type {string} */ (event.data.tabId);
      if (tabId === Common.UIString.UIString('Computed')) {
        computedStylePanesWrapper.show(computedView.element);
        this._metricsWidget.show(computedStylePanesWrapper.element, this._computedStyleWidget.element);
      } else if (tabId === Common.UIString.UIString('Styles')) {
        stylesSplitWidget.setSidebarWidget(computedStylePanesWrapper);
        if (this._stylesWidget.initialUpdateCompleted()) {
          showMetricsWidgetInStylesPane();
        } else {
          this._stylesWidget.addEventListener(StylesSidebarPaneEvents.InitialUpdateCompleted, () => {
            showMetricsWidgetInStylesPane();
          });
        }
      }

      if (skippedInitialTabSelectedEvent) {
        // We don't log the initially selected sidebar pane to UMA because
        // it will skew the histogram heavily toward the Styles pane
        Host.userMetrics.sidebarPaneShown(tabId);
      } else {
        skippedInitialTabSelectedEvent = true;
      }
    };

    this.sidebarPaneView = UI.ViewManager.ViewManager.instance().createTabbedLocation(
        () => UI.ViewManager.ViewManager.instance().showView('elements'));
    const tabbedPane = this.sidebarPaneView.tabbedPane();
    if (this._splitMode !== _splitMode.Vertical) {
      this._splitWidget.installResizer(tabbedPane.headerElement());
    }

    const stylesView = new UI.View.SimpleView(Common.UIString.UIString('Styles'));
    this.sidebarPaneView.appendView(stylesView);
    stylesView.element.classList.add('flex-auto');
    stylesSplitWidget.show(stylesView.element);

    const computedView = new UI.View.SimpleView(Common.UIString.UIString('Computed'));
    computedView.element.classList.add('composite', 'fill');

    tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, tabSelected, this);
    this.sidebarPaneView.appendView(computedView);
    this._stylesViewToReveal = stylesView;

    this.sidebarPaneView.appendApplicableItems('elements-sidebar');
    const extensionSidebarPanes = Extensions.ExtensionServer.ExtensionServer.instance().sidebarPanes();
    for (let i = 0; i < extensionSidebarPanes.length; ++i) {
      this._addExtensionSidebarPane(extensionSidebarPanes[i]);
    }

    this._splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());
  }

  _updateSidebarPosition() {
    if (this.sidebarPaneView && this.sidebarPaneView.tabbedPane().shouldHideOnDetach()) {
      return;
    }  // We can't reparent extension iframes.

    const position = Common.Settings.Settings.instance().moduleSetting('sidebarPosition').get();
    let splitMode = _splitMode.Horizontal;
    if (position === 'right' ||
        (position === 'auto' && UI.InspectorView.InspectorView.instance().element.offsetWidth > 680)) {
      splitMode = _splitMode.Vertical;
    }
    if (!this.sidebarPaneView) {
      this._initializeSidebarPanes(splitMode);
      return;
    }
    if (splitMode === this._splitMode) {
      return;
    }
    this._splitMode = splitMode;

    const tabbedPane = this.sidebarPaneView.tabbedPane();
    this._splitWidget.uninstallResizer(tabbedPane.headerElement());

    this._splitWidget.setVertical(this._splitMode === _splitMode.Vertical);
    this.showToolbarPane(null /* widget */, null /* toggle */);

    if (this._splitMode !== _splitMode.Vertical) {
      this._splitWidget.installResizer(tabbedPane.headerElement());
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _extensionSidebarPaneAdded(event) {
    const pane = /** @type {!Extensions.ExtensionPanel.ExtensionSidebarPane} */ (event.data);
    this._addExtensionSidebarPane(pane);
  }

  /**
   * @param {!Extensions.ExtensionPanel.ExtensionSidebarPane} pane
   */
  _addExtensionSidebarPane(pane) {
    if (this.sidebarPaneView && pane.panelName() === this.name) {
      this.sidebarPaneView.appendView(pane);
    }
  }

  /**
   * @param {!SDK.CSSModel.CSSModel} cssModel
   */
  _setupStyleTracking(cssModel) {
    if (Root.Runtime.experiments.isEnabled('cssGridFeatures')) {
      // Style tracking is conditional on enabling experimental Grid features
      // because it's the only use case for now.
      const gridStyleTracker = cssModel.createCSSPropertyTracker(TrackedCSSGridProperties);
      gridStyleTracker.start();
      this._gridStyleTrackerByCSSModel.set(cssModel, gridStyleTracker);
      gridStyleTracker.addEventListener(
          SDK.CSSModel.CSSPropertyTrackerEvents.TrackedCSSPropertiesUpdated, this._trackedCSSPropertiesUpdated, this);
    }
  }

  /**
   * @param {!SDK.CSSModel.CSSModel} cssModel
   */
  _removeStyleTracking(cssModel) {
    const gridStyleTracker = this._gridStyleTrackerByCSSModel.get(cssModel);
    if (!gridStyleTracker) {
      return;
    }

    gridStyleTracker.stop();
    this._gridStyleTrackerByCSSModel.delete(cssModel);
    gridStyleTracker.removeEventListener(
        SDK.CSSModel.CSSPropertyTrackerEvents.TrackedCSSPropertiesUpdated, this._trackedCSSPropertiesUpdated, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _trackedCSSPropertiesUpdated(event) {
    const domNodes = /** @type {!Array<?SDK.DOMModel.DOMNode>} */ (event.data.domNodes);

    for (const domNode of domNodes) {
      if (!domNode) {
        continue;
      }
      const treeElement = this._treeElementForNode(domNode);
      if (treeElement) {
        treeElement.updateStyleAdorners();
      }
    }
  }
}

ElementsPanel._firstInspectElementCompletedForTest = function() {};
ElementsPanel._firstInspectElementNodeNameForTest = '';

/** @enum {symbol} */
export const _splitMode = {
  Vertical: Symbol('Vertical'),
  Horizontal: Symbol('Horizontal'),
};

const TrackedCSSGridProperties = [
  {
    name: 'display',
    value: 'grid',
  },
  {
    name: 'display',
    value: 'inline-grid',
  },
];

/**
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
export class ContextMenuProvider {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} object
   */
  appendApplicableItems(event, contextMenu, object) {
    if (!(object instanceof SDK.RemoteObject.RemoteObject &&
          (/** @type {!SDK.RemoteObject.RemoteObject} */ (object)).isNode()) &&
        !(object instanceof SDK.DOMModel.DOMNode) && !(object instanceof SDK.DOMModel.DeferredDOMNode)) {
      return;
    }

    // Skip adding "Reveal..." menu item for our own tree outline.
    if (ElementsPanel.instance().element.isAncestor(/** @type {!Node} */ (event.target))) {
      return;
    }
    /** @type {function(?):*} */
    const commandCallback = Common.Revealer.reveal.bind(Common.Revealer.Revealer, object);
    contextMenu.revealSection().appendItem(Common.UIString.UIString('Reveal in Elements panel'), commandCallback);
  }
}

/**
 * @implements {Common.Revealer.Revealer}
 * @unrestricted
 */
export class DOMNodeRevealer {
  /**
   * @override
   * @param {!Object} node
   * @param {boolean=} omitFocus
   * @return {!Promise<void>}
   */
  reveal(node, omitFocus) {
    const panel = ElementsPanel.instance();
    panel._pendingNodeReveal = true;

    return new Promise(revealPromise);

    /**
     * @param {function():void} resolve
     * @param {function(!Error):void} reject
     */
    function revealPromise(resolve, reject) {
      if (node instanceof SDK.DOMModel.DOMNode) {
        onNodeResolved(/** @type {!SDK.DOMModel.DOMNode} */ (node));
      } else if (node instanceof SDK.DOMModel.DeferredDOMNode) {
        (/** @type {!SDK.DOMModel.DeferredDOMNode} */ (node)).resolve(checkDeferredDOMNodeThenReveal);
      } else if (node instanceof SDK.RemoteObject.RemoteObject) {
        const domModel =
            /** @type {!SDK.RemoteObject.RemoteObject} */ (node).runtimeModel().target().model(SDK.DOMModel.DOMModel);
        if (domModel) {
          domModel.pushObjectAsNodeToFrontend(node).then(checkRemoteObjectThenReveal);
        } else {
          reject(new Error('Could not resolve a node to reveal.'));
        }
      } else {
        reject(new Error('Can\'t reveal a non-node.'));
        panel._pendingNodeReveal = false;
      }

      /**
       * @param {!SDK.DOMModel.DOMNode} resolvedNode
       */
      function onNodeResolved(resolvedNode) {
        panel._pendingNodeReveal = false;

        // A detached node could still have a parent and ownerDocument
        // properties, which means stepping up through the hierarchy to ensure
        // that the root node is the document itself. Any break implies
        // detachment.
        let currentNode = resolvedNode;
        while (currentNode.parentNode) {
          currentNode = currentNode.parentNode;
        }
        const isDetached = !(currentNode instanceof SDK.DOMModel.DOMDocument);

        const isDocument = node instanceof SDK.DOMModel.DOMDocument;
        if (!isDocument && isDetached) {
          const msg = ls`Node cannot be found in the current page.`;
          Common.Console.Console.instance().warn(msg);
          reject(new Error(msg));
          return;
        }

        if (resolvedNode) {
          panel.revealAndSelectNode(resolvedNode, !omitFocus).then(resolve);
          return;
        }
        reject(new Error('Could not resolve node to reveal.'));
      }

      /**
       * @param {?SDK.DOMModel.DOMNode} resolvedNode
       */
      function checkRemoteObjectThenReveal(resolvedNode) {
        if (!resolvedNode) {
          const msg = ls`The remote object could not be resolved into a valid node.`;
          Common.Console.Console.instance().warn(msg);
          reject(new Error(msg));
          return;
        }
        onNodeResolved(resolvedNode);
      }

      /**
       * @param {?SDK.DOMModel.DOMNode} resolvedNode
       */
      function checkDeferredDOMNodeThenReveal(resolvedNode) {
        if (!resolvedNode) {
          const msg = ls`The deferred DOM Node could not be resolved into a valid node.`;
          Common.Console.Console.instance().warn(msg);
          reject(new Error(msg));
          return;
        }
        onNodeResolved(resolvedNode);
      }
    }
  }
}

/**
 * @implements {Common.Revealer.Revealer}
 * @unrestricted
 */
export class CSSPropertyRevealer {
  /**
   * @override
   * @param {!Object} property
   * @return {!Promise<void>}
   */
  reveal(property) {
    const panel = ElementsPanel.instance();
    return panel._revealProperty(/** @type {!SDK.CSSProperty.CSSProperty} */ (property));
  }
}


/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ElementsActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return true;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(node.domModel());
    if (!treeOutline) {
      return true;
    }

    switch (actionId) {
      case 'elements.hide-element':
        treeOutline.toggleHideElement(node);
        return true;
      case 'elements.edit-as-html':
        treeOutline.toggleEditAsHTML(node);
        return true;
      case 'elements.undo':
        SDK.DOMModel.DOMModelUndoStack.instance().undo();
        ElementsPanel.instance()._stylesWidget.forceUpdate();
        return true;
      case 'elements.redo':
        SDK.DOMModel.DOMModelUndoStack.instance().redo();
        ElementsPanel.instance()._stylesWidget.forceUpdate();
        return true;
    }
    return false;
  }
}

/**
 * @implements {MarkerDecorator}
 * @unrestricted
 */
export class PseudoStateMarkerDecorator {
  /**
   * @override
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {?{title: string, color: string}}
   */
  decorate(node) {
    const pseudoState = node.domModel().cssModel().pseudoState(node);
    if (!pseudoState) {
      return null;
    }

    return {color: 'orange', title: Common.UIString.UIString('Element state: %s', ':' + pseudoState.join(', :'))};
  }
}
