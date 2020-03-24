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
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ComputedStyleWidget} from './ComputedStyleWidget.js';
import {ElementsBreadcrumbs, Events} from './ElementsBreadcrumbs.js';
import {ElementsTreeElement, HrefSymbol} from './ElementsTreeElement.js';  // eslint-disable-line no-unused-vars
import {ElementsTreeElementHighlighter} from './ElementsTreeElementHighlighter.js';
import {ElementsTreeOutline} from './ElementsTreeOutline.js';
import {MarkerDecorator} from './MarkerDecorator.js';  // eslint-disable-line no-unused-vars
import {MetricsSidebarPane} from './MetricsSidebarPane.js';
import {StylesSidebarPane} from './StylesSidebarPane.js';

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

    this._contentElement = createElement('div');
    const crumbsContainer = createElement('div');
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
    this._breadcrumbs = new ElementsBreadcrumbs();
    this._breadcrumbs.show(crumbsContainer);
    this._breadcrumbs.addEventListener(Events.NodeSelected, this._crumbNodeSelected, this);

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
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.DOMModel.DOMModel, this);
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.NameChanged,
        event => this._targetNameChanged(/** @type {!SDK.SDKModel.Target} */ (event.data)));
    Common.Settings.Settings.instance()
        .moduleSetting('showUAShadowDOM')
        .addChangeListener(this._showUAShadowDOMChanged.bind(this));
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DocumentUpdated, this._documentUpdatedEvent, this);
    self.Extensions.extensionServer.addEventListener(
        Extensions.ExtensionServer.Events.SidebarPaneAdded, this._extensionSidebarPaneAdded, this);

    /**
     * @type {!Array.<{domModel: !SDK.DOMModel.DOMModel, index: number, node: (?SDK.DOMModel.DOMNode|undefined)}>|undefined}
     */
    this._searchResults;
  }

  /**
   * @return {!ElementsPanel}
   */
  static instance() {
    return /** @type {!ElementsPanel} */ (self.runtime.sharedInstance(ElementsPanel));
  }

  /**
   * @param {!SDK.CSSProperty.CSSProperty} cssProperty
   */
  _revealProperty(cssProperty) {
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
    return this.sidebarPaneView;
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
        this._treeOutlineHeaders.set(treeOutline, createElementWithClass('div', 'elements-tree-header'));
        this._targetNameChanged(domModel.target());
      }
    }
    treeOutline.wireToDOMModel(domModel);

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
    header.appendChild(Components.Linkifier.Linkifier.linkifyURL(target.inspectedURL(), {text: target.name()}));
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

    this._breadcrumbs.updateSizes();
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
    self.UI.context.setFlavor(ElementsPanel, this);

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
    this._breadcrumbs.update();

    const domModels = SDK.SDKModel.TargetManager.instance().models(SDK.DOMModel.DOMModel);
    for (const domModel of domModels) {
      if (domModel.parentModel()) {
        continue;
      }
      const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
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
    if (this._popoverHelper) {
      this._popoverHelper.hidePopover();
    }
    super.willHide();
    self.UI.context.setFlavor(ElementsPanel, null);
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
    const selectedNode = /** @type {?SDK.DOMModel.DOMNode} */ (event.data.node);
    const focus = /** @type {boolean} */ (event.data.focus);
    for (const treeOutline of this._treeOutlines) {
      if (!selectedNode || ElementsTreeOutline.forDOMModel(selectedNode.domModel()) !== treeOutline) {
        treeOutline.selectDOMNode(null);
      }
    }

    this._breadcrumbs.setSelectedNode(selectedNode);

    self.UI.context.setFlavor(SDK.DOMModel.DOMNode, selectedNode);

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
        self.UI.context.setFlavor(SDK.RuntimeModel.ExecutionContext, context);
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
    restoreNode.call(this, domModel, this._selectedNodeOnReset);

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
    delete this._searchConfig;
    this._hideSearchHighlights();

    this._searchableView.updateSearchMatchesCount(0);

    delete this._currentSearchResultIndex;
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
    Promise.all(promises).then(resultCountCallback.bind(this));

    /**
     * @param {!Array.<number>} resultCounts
     * @this {ElementsPanel}
     */
    function resultCountCallback(resultCounts) {
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
        this._currentSearchResultIndex = undefined;
      }

      let index = this._currentSearchResultIndex;

      if (shouldJump) {
        if (this._currentSearchResultIndex === undefined) {
          index = jumpBackwards ? -1 : 0;
        } else {
          index = jumpBackwards ? index - 1 : index + 1;
        }
        this._jumpToSearchResult(index);
      }
    }
  }

  _domWordWrapSettingChanged(event) {
    // FIXME: crbug.com/425984
    this._contentElement.classList.toggle('elements-wrap', event.data);
    for (const treeOutline of this._treeOutlines) {
      treeOutline.setWordWrap(/** @type {boolean} */ (event.data));
    }
  }

  switchToAndFocus(node) {
    // Reset search restore.
    this._searchableView.cancelSearch();
    UI.ViewManager.ViewManager.instance().showView('elements').then(() => this.selectDOMNode(node, true));
  }

  /**
   * @param {!Event} event
   * @return {?UI.PopoverRequest}
   */
  _getPopoverRequest(event) {
    let link = event.target;
    while (link && !link[HrefSymbol]) {
      link = link.parentElementOrShadowHost();
    }
    if (!link) {
      return null;
    }

    return {
      box: link.boxInWindow(),
      show: async popover => {
        const node = this.selectedDOMNode();
        if (!node) {
          return false;
        }
        const preview =
            await Components.ImagePreview.ImagePreview.build(node.domModel().target(), link[HrefSymbol], true);
        if (preview) {
          popover.contentElement.appendChild(preview);
        }
        return !!preview;
      }
    };
  }

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
    if (!this._searchResults) {
      return;
    }
    this.performSearch(this._searchConfig, true);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults) {
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
        this._highlightCurrentSearchResult();
      });
      return;
    }

    const treeElement = this._treeElementForNode(searchResult.node);
    searchResult.node.scrollIntoView();
    if (treeElement) {
      treeElement.highlightSearchResults(this._searchConfig.query);
      treeElement.reveal();
      const matches = treeElement.listItemElement.getElementsByClassName(UI.UIUtils.highlightedSearchResultClassName);
      if (matches.length) {
        matches[0].scrollIntoViewIfNeeded(false);
      }
    }
  }

  _hideSearchHighlights() {
    if (!this._searchResults || !this._searchResults.length || this._currentSearchResultIndex === undefined) {
      return;
    }
    const searchResult = this._searchResults[this._currentSearchResultIndex];
    if (!searchResult.node) {
      return;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(searchResult.node.domModel());
    const treeElement = treeOutline.findTreeElement(searchResult.node);
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
    this._breadcrumbs.updateNodes(nodes);
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
   * @return {!Promise}
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
   * @param {!Element} stylePaneWrapperElement
   */
  _setupTextSelectionHack(stylePaneWrapperElement) {
    // We "extend" the sidebar area when dragging, in order to keep smooth text
    // selection. It should be replaced by 'user-select: contain' in the future.
    const uninstallHackBound = uninstallHack.bind(this);

    // Fallback to cover unforeseen cases where text selection has ended.
    const uninstallHackOnMousemove = event => {
      if (event.buttons === 0) {
        uninstallHack.call(this);
      }
    };

    stylePaneWrapperElement.addEventListener('mousedown', event => {
      if (event.which !== 1) {
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

  _updateSidebarPosition() {
    if (this.sidebarPaneView && this.sidebarPaneView.tabbedPane().shouldHideOnDetach()) {
      return;
    }  // We can't reparent extension iframes.

    let splitMode;
    const position = Common.Settings.Settings.instance().moduleSetting('sidebarPosition').get();
    if (position === 'right' || (position === 'auto' && self.UI.inspectorView.element.offsetWidth > 680)) {
      splitMode = _splitMode.Vertical;
    } else if (self.UI.inspectorView.element.offsetWidth > 415) {
      splitMode = _splitMode.Horizontal;
    } else {
      splitMode = _splitMode.Slim;
    }

    if (this.sidebarPaneView && splitMode === this._splitMode) {
      return;
    }
    this._splitMode = splitMode;

    const extensionSidebarPanes = self.Extensions.extensionServer.sidebarPanes();
    let lastSelectedTabId = null;
    if (this.sidebarPaneView) {
      lastSelectedTabId = this.sidebarPaneView.tabbedPane().selectedTabId;
      this.sidebarPaneView.tabbedPane().detach();
      this._splitWidget.uninstallResizer(this.sidebarPaneView.tabbedPane().headerElement());
    }

    this._splitWidget.setVertical(this._splitMode === _splitMode.Vertical);
    this.showToolbarPane(null /* widget */, null /* toggle */);

    const matchedStylePanesWrapper = new UI.Widget.VBox();
    matchedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    this._stylesWidget.show(matchedStylePanesWrapper.element);
    this._setupTextSelectionHack(matchedStylePanesWrapper.element);

    const computedStylePanesWrapper = new UI.Widget.VBox();
    computedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    this._computedStyleWidget.show(computedStylePanesWrapper.element);

    /**
     * @param {boolean} inComputedStyle
     * @this {ElementsPanel}
     */
    function showMetrics(inComputedStyle) {
      if (inComputedStyle) {
        this._metricsWidget.show(computedStylePanesWrapper.element, this._computedStyleWidget.element);
      } else {
        this._metricsWidget.show(matchedStylePanesWrapper.element);
      }
    }

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     * @this {ElementsPanel}
     */
    function tabSelected(event) {
      const tabId = /** @type {string} */ (event.data.tabId);
      if (tabId === Common.UIString.UIString('Computed')) {
        showMetrics.call(this, true);
      } else if (tabId === Common.UIString.UIString('Styles')) {
        showMetrics.call(this, false);
      }
    }

    this.sidebarPaneView = UI.ViewManager.ViewManager.instance().createTabbedLocation(
        () => UI.ViewManager.ViewManager.instance().showView('elements'));
    const tabbedPane = this.sidebarPaneView.tabbedPane();
    if (this._popoverHelper) {
      this._popoverHelper.hidePopover();
    }
    this._popoverHelper = new UI.PopoverHelper.PopoverHelper(tabbedPane.element, this._getPopoverRequest.bind(this));
    this._popoverHelper.setHasPadding(true);
    this._popoverHelper.setTimeout(0);

    if (this._splitMode !== _splitMode.Vertical) {
      this._splitWidget.installResizer(tabbedPane.headerElement());
    }

    const stylesView = new UI.View.SimpleView(Common.UIString.UIString('Styles'));
    this.sidebarPaneView.appendView(stylesView);
    if (splitMode === _splitMode.Horizontal) {
      // Styles and computed are merged into a single tab.
      stylesView.element.classList.add('flex-auto');

      const splitWidget = new UI.SplitWidget.SplitWidget(true, true, 'stylesPaneSplitViewState', 215);
      splitWidget.show(stylesView.element);
      splitWidget.setMainWidget(matchedStylePanesWrapper);
      splitWidget.setSidebarWidget(computedStylePanesWrapper);
    } else {
      // Styles and computed are in separate tabs.
      stylesView.element.classList.add('flex-auto');
      matchedStylePanesWrapper.show(stylesView.element);

      const computedView = new UI.View.SimpleView(Common.UIString.UIString('Computed'));
      computedView.element.classList.add('composite', 'fill');
      computedStylePanesWrapper.show(computedView.element);

      tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, tabSelected, this);
      this.sidebarPaneView.appendView(computedView);
    }
    this._stylesViewToReveal = stylesView;

    showMetrics.call(this, this._splitMode === _splitMode.Horizontal);

    this.sidebarPaneView.appendApplicableItems('elements-sidebar');
    for (let i = 0; i < extensionSidebarPanes.length; ++i) {
      this._addExtensionSidebarPane(extensionSidebarPanes[i]);
    }

    if (lastSelectedTabId) {
      this.sidebarPaneView.tabbedPane().selectTab(lastSelectedTabId);
    }

    this._splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());
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
    if (pane.panelName() === this.name) {
      this.sidebarPaneView.appendView(pane);
    }
  }
}

ElementsPanel._firstInspectElementCompletedForTest = function() {};

/** @enum {symbol} */
export const _splitMode = {
  Vertical: Symbol('Vertical'),
  Horizontal: Symbol('Horizontal'),
  Slim: Symbol('Slim'),
};

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
   * @return {!Promise}
   */
  reveal(node, omitFocus) {
    const panel = ElementsPanel.instance();
    panel._pendingNodeReveal = true;

    return new Promise(revealPromise);

    /**
     * @param {function(undefined)} resolve
     * @param {function(!Error)} reject
     */
    function revealPromise(resolve, reject) {
      if (node instanceof SDK.DOMModel.DOMNode) {
        onNodeResolved(/** @type {!SDK.DOMModel.DOMNode} */ (node));
      } else if (node instanceof SDK.DOMModel.DeferredDOMNode) {
        (/** @type {!SDK.DOMModel.DeferredDOMNode} */ (node)).resolve(onNodeResolved);
      } else if (node instanceof SDK.RemoteObject.RemoteObject) {
        const domModel =
            /** @type {!SDK.RemoteObject.RemoteObject} */ (node).runtimeModel().target().model(SDK.DOMModel.DOMModel);
        if (domModel) {
          domModel.pushObjectAsNodeToFrontend(node).then(onNodeResolved);
        } else {
          reject(new Error('Could not resolve a node to reveal.'));
        }
      } else {
        reject(new Error('Can\'t reveal a non-node.'));
        panel._pendingNodeReveal = false;
      }

      /**
       * @param {?SDK.DOMModel.DOMNode} resolvedNode
       */
      function onNodeResolved(resolvedNode) {
        panel._pendingNodeReveal = false;

        // A detached node could still have a parent and ownerDocument
        // properties, which means stepping up through the hierarchy to ensure
        // that the root node is the document itself. Any break implies
        // detachment.
        let currentNode = resolvedNode;
        if (currentNode) {
          while (currentNode.parentNode) {
            currentNode = currentNode.parentNode;
          }
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
   * @return {!Promise}
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
    const node = self.UI.context.flavor(SDK.DOMModel.DOMNode);
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
        self.SDK.domModelUndoStack.undo();
        ElementsPanel.instance()._stylesWidget.forceUpdate();
        return true;
      case 'elements.redo':
        self.SDK.domModelUndoStack.redo();
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
    return {
      color: 'orange',
      title:
          Common.UIString.UIString('Element state: %s', ':' + node.domModel().cssModel().pseudoState(node).join(', :'))
    };
  }
}
