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

/**
 * @implements {UI.Searchable}
 * @implements {SDK.SDKModelObserver<!SDK.DOMModel>}
 * @implements {UI.ViewLocationResolver}
 * @unrestricted
 */
Elements.ElementsPanel = class extends UI.Panel {
  constructor() {
    super('elements');
    this.registerRequiredCSS('elements/elementsPanel.css');

    this._splitWidget = new UI.SplitWidget(true, true, 'elementsPanelSplitViewState', 325, 325);
    this._splitWidget.addEventListener(
        UI.SplitWidget.Events.SidebarSizeChanged, this._updateTreeOutlineVisibleWidth.bind(this));
    this._splitWidget.show(this.element);

    this._searchableView = new UI.SearchableView(this);
    this._searchableView.setMinimumSize(25, 28);
    this._searchableView.setPlaceholder(Common.UIString('Find by string, selector, or XPath'));
    var stackElement = this._searchableView.element;

    this._contentElement = createElement('div');
    var crumbsContainer = createElement('div');
    stackElement.appendChild(this._contentElement);
    stackElement.appendChild(crumbsContainer);

    this._splitWidget.setMainWidget(this._searchableView);
    /** @type {?Elements.ElementsPanel._splitMode} */
    this._splitMode = null;

    this._contentElement.id = 'elements-content';
    // FIXME: crbug.com/425984
    if (Common.moduleSetting('domWordWrap').get())
      this._contentElement.classList.add('elements-wrap');
    Common.moduleSetting('domWordWrap').addChangeListener(this._domWordWrapSettingChanged.bind(this));

    crumbsContainer.id = 'elements-crumbs';
    this._breadcrumbs = new Elements.ElementsBreadcrumbs();
    this._breadcrumbs.show(crumbsContainer);
    this._breadcrumbs.addEventListener(Elements.ElementsBreadcrumbs.Events.NodeSelected, this._crumbNodeSelected, this);

    this._stylesWidget = new Elements.StylesSidebarPane();
    this._computedStyleWidget = new Elements.ComputedStyleWidget();
    this._metricsWidget = new Elements.MetricsSidebarPane();

    Common.moduleSetting('sidebarPosition').addChangeListener(this._updateSidebarPosition.bind(this));
    this._updateSidebarPosition();

    /** @type {!Array.<!Elements.ElementsTreeOutline>} */
    this._treeOutlines = [];
    /** @type {!Map<!Elements.ElementsTreeOutline, !Element>} */
    this._treeOutlineHeaders = new Map();
    SDK.targetManager.observeModels(SDK.DOMModel, this);
    SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.NameChanged,
        event => this._targetNameChanged(/** @type {!SDK.Target} */ (event.data)));
    Common.moduleSetting('showUAShadowDOM').addChangeListener(this._showUAShadowDOMChanged.bind(this));
    SDK.targetManager.addModelListener(
        SDK.DOMModel, SDK.DOMModel.Events.DocumentUpdated, this._documentUpdatedEvent, this);
    Extensions.extensionServer.addEventListener(
        Extensions.ExtensionServer.Events.SidebarPaneAdded, this._extensionSidebarPaneAdded, this);
  }

  /**
   * @return {!Elements.ElementsPanel}
   */
  static instance() {
    return /** @type {!Elements.ElementsPanel} */ (self.runtime.sharedInstance(Elements.ElementsPanel));
  }

  /**
   * @param {!SDK.CSSProperty} cssProperty
   */
  _revealProperty(cssProperty) {
    return this.sidebarPaneView.showView(this._stylesViewToReveal).then(() => {
      this._stylesWidget.revealProperty(/** @type {!SDK.CSSProperty} */ (cssProperty));
    });
  }

  /**
   * @override
   * @param {string} locationName
   * @return {?UI.ViewLocation}
   */
  resolveLocation(locationName) {
    return this.sidebarPaneView;
  }

  /**
   * @param {?UI.Widget} widget
   * @param {?UI.ToolbarToggle} toggle
   */
  showToolbarPane(widget, toggle) {
    // TODO(luoe): remove this function once its providers have an alternative way to reveal their views.
    this._stylesWidget.showToolbarPane(widget, toggle);
  }

  /**
   * @override
   * @param {!SDK.DOMModel} domModel
   */
  modelAdded(domModel) {
    var treeOutline = new Elements.ElementsTreeOutline(domModel, true, true);
    treeOutline.setWordWrap(Common.moduleSetting('domWordWrap').get());
    treeOutline.wireToDOMModel();
    treeOutline.addEventListener(
        Elements.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);
    treeOutline.addEventListener(
        Elements.ElementsTreeOutline.Events.ElementsTreeUpdated, this._updateBreadcrumbIfNeeded, this);
    new Elements.ElementsTreeElementHighlighter(treeOutline);
    this._treeOutlines.push(treeOutline);
    if (domModel.target().parentTarget()) {
      this._treeOutlineHeaders.set(treeOutline, createElementWithClass('div', 'elements-tree-header'));
      this._targetNameChanged(domModel.target());
    }

    // Perform attach if necessary.
    if (this.isShowing())
      this.wasShown();
  }

  /**
   * @override
   * @param {!SDK.DOMModel} domModel
   */
  modelRemoved(domModel) {
    var treeOutline = Elements.ElementsTreeOutline.forDOMModel(domModel);
    treeOutline.unwireFromDOMModel();
    this._treeOutlines.remove(treeOutline);
    var header = this._treeOutlineHeaders.get(treeOutline);
    if (header)
      header.remove();
    this._treeOutlineHeaders.delete(treeOutline);
    treeOutline.element.remove();
  }

  /**
   * @param {!SDK.Target} target
   */
  _targetNameChanged(target) {
    var domModel = target.model(SDK.DOMModel);
    if (!domModel)
      return;
    var treeOutline = Elements.ElementsTreeOutline.forDOMModel(domModel);
    if (!treeOutline)
      return;
    var header = this._treeOutlineHeaders.get(treeOutline);
    if (!header)
      return;
    header.removeChildren();
    header.createChild('div', 'elements-tree-header-frame').textContent = Common.UIString('Frame');
    header.appendChild(Components.Linkifier.linkifyURL(target.inspectedURL(), {text: target.name()}));
  }

  _updateTreeOutlineVisibleWidth() {
    if (!this._treeOutlines.length)
      return;

    var width = this._splitWidget.element.offsetWidth;
    if (this._splitWidget.isVertical())
      width -= this._splitWidget.sidebarSize();
    for (var i = 0; i < this._treeOutlines.length; ++i)
      this._treeOutlines[i].setVisibleWidth(width);

    this._breadcrumbs.updateSizes();
  }

  /**
   * @override
   */
  focus() {
    if (this._treeOutlines.length)
      this._treeOutlines[0].focus();
  }

  /**
   * @override
   * @return {!UI.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  /**
   * @override
   */
  wasShown() {
    UI.context.setFlavor(Elements.ElementsPanel, this);

    for (var i = 0; i < this._treeOutlines.length; ++i) {
      var treeOutline = this._treeOutlines[i];
      // Attach heavy component lazily
      if (treeOutline.element.parentElement !== this._contentElement) {
        var header = this._treeOutlineHeaders.get(treeOutline);
        if (header)
          this._contentElement.appendChild(header);
        this._contentElement.appendChild(treeOutline.element);
      }
    }
    super.wasShown();
    this._breadcrumbs.update();

    for (var i = 0; i < this._treeOutlines.length; ++i) {
      var treeOutline = this._treeOutlines[i];
      treeOutline.setVisible(true);

      if (!treeOutline.rootDOMNode) {
        if (treeOutline.domModel().existingDocument())
          this._documentUpdated(treeOutline.domModel(), treeOutline.domModel().existingDocument());
        else
          treeOutline.domModel().requestDocumentPromise();
      }
    }
  }

  /**
   * @override
   */
  willHide() {
    UI.context.setFlavor(Elements.ElementsPanel, null);

    SDK.OverlayModel.hideDOMNodeHighlight();
    for (var i = 0; i < this._treeOutlines.length; ++i) {
      var treeOutline = this._treeOutlines[i];
      treeOutline.setVisible(false);
      // Detach heavy component on hide
      this._contentElement.removeChild(treeOutline.element);
      var header = this._treeOutlineHeaders.get(treeOutline);
      if (header)
        this._contentElement.removeChild(header);
    }
    if (this._popoverHelper)
      this._popoverHelper.hidePopover();
    super.willHide();
  }

  /**
   * @override
   */
  onResize() {
    this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));  // Do not force layout.
    this._updateTreeOutlineVisibleWidth();
  }

  /**
   * @param {!Common.Event} event
   */
  _selectedNodeChanged(event) {
    var selectedNode = /** @type {?SDK.DOMNode} */ (event.data.node);
    var focus = /** @type {boolean} */ (event.data.focus);
    for (var i = 0; i < this._treeOutlines.length; ++i) {
      if (!selectedNode || selectedNode.domModel() !== this._treeOutlines[i].domModel())
        this._treeOutlines[i].selectDOMNode(null);
    }

    this._breadcrumbs.setSelectedNode(selectedNode);

    UI.context.setFlavor(SDK.DOMNode, selectedNode);

    if (!selectedNode)
      return;
    selectedNode.setAsInspectedNode();
    if (focus) {
      this._selectedNodeOnReset = selectedNode;
      this._hasNonDefaultSelectedNode = true;
    }

    var executionContexts = selectedNode.domModel().runtimeModel().executionContexts();
    var nodeFrameId = selectedNode.frameId();
    for (var context of executionContexts) {
      if (context.frameId === nodeFrameId) {
        UI.context.setFlavor(SDK.ExecutionContext, context);
        break;
      }
    }
  }

  _reset() {
    delete this.currentQuery;
  }

  /**
   * @param {!Common.Event} event
   */
  _documentUpdatedEvent(event) {
    var domModel = /** @type {!SDK.DOMModel} */ (event.data);
    this._documentUpdated(domModel, domModel.existingDocument());
  }

  /**
   * @param {!SDK.DOMModel} domModel
   * @param {?SDK.DOMDocument} inspectedRootDocument
   */
  _documentUpdated(domModel, inspectedRootDocument) {
    this._reset();
    this.searchCanceled();

    var treeOutline = Elements.ElementsTreeOutline.forDOMModel(domModel);
    treeOutline.rootDOMNode = inspectedRootDocument;

    if (!inspectedRootDocument) {
      if (this.isShowing())
        domModel.requestDocumentPromise();
      return;
    }

    this._hasNonDefaultSelectedNode = false;

    if (this._omitDefaultSelection)
      return;

    var savedSelectedNodeOnReset = this._selectedNodeOnReset;
    restoreNode.call(this, domModel, this._selectedNodeOnReset);

    /**
     * @param {!SDK.DOMModel} domModel
     * @param {?SDK.DOMNode} staleNode
     * @this {Elements.ElementsPanel}
     */
    async function restoreNode(domModel, staleNode) {
      var nodePath = staleNode ? staleNode.path() : null;

      var restoredNodeId = nodePath ? await domModel.pushNodeByPathToFrontend(nodePath) : null;

      if (savedSelectedNodeOnReset !== this._selectedNodeOnReset)
        return;
      var node = restoredNodeId ? domModel.nodeForId(restoredNodeId) : null;
      if (!node) {
        var inspectedDocument = domModel.existingDocument();
        node = inspectedDocument ? inspectedDocument.body || inspectedDocument.documentElement : null;
      }
      this._setDefaultSelectedNode(node);
      this._lastSelectedNodeSelectedForTest();
    }
  }

  _lastSelectedNodeSelectedForTest() {
  }

  /**
   * @param {?SDK.DOMNode} node
   */
  _setDefaultSelectedNode(node) {
    if (!node || this._hasNonDefaultSelectedNode || this._pendingNodeReveal)
      return;
    var treeOutline = Elements.ElementsTreeOutline.forDOMModel(node.domModel());
    if (!treeOutline)
      return;
    this.selectDOMNode(node);
    if (treeOutline.selectedTreeElement)
      treeOutline.selectedTreeElement.expand();
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

    SDK.DOMModel.cancelSearch();
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    var query = searchConfig.query;

    const whitespaceTrimmedQuery = query.trim();
    if (!whitespaceTrimmedQuery.length)
      return;

    if (!this._searchConfig || this._searchConfig.query !== query)
      this.searchCanceled();
    else
      this._hideSearchHighlights();

    this._searchConfig = searchConfig;

    var showUAShadowDOM = Common.moduleSetting('showUAShadowDOM').get();
    var domModels = SDK.targetManager.models(SDK.DOMModel);
    var promises = domModels.map(domModel => domModel.performSearch(whitespaceTrimmedQuery, showUAShadowDOM));
    Promise.all(promises).then(resultCountCallback.bind(this));

    /**
     * @param {!Array.<number>} resultCounts
     * @this {Elements.ElementsPanel}
     */
    function resultCountCallback(resultCounts) {
      /**
       * @type {!Array.<{domModel: !SDK.DOMModel, index: number, node: (?SDK.DOMNode|undefined)}>}
       */
      this._searchResults = [];
      for (var i = 0; i < resultCounts.length; ++i) {
        var resultCount = resultCounts[i];
        for (var j = 0; j < resultCount; ++j)
          this._searchResults.push({domModel: domModels[i], index: j, node: undefined});
      }
      this._searchableView.updateSearchMatchesCount(this._searchResults.length);
      if (!this._searchResults.length)
        return;
      if (this._currentSearchResultIndex >= this._searchResults.length)
        this._currentSearchResultIndex = undefined;

      var index = this._currentSearchResultIndex;

      if (shouldJump) {
        if (this._currentSearchResultIndex === undefined)
          index = jumpBackwards ? -1 : 0;
        else
          index = jumpBackwards ? index - 1 : index + 1;
        this._jumpToSearchResult(index);
      }
    }
  }

  _domWordWrapSettingChanged(event) {
    // FIXME: crbug.com/425984
    this._contentElement.classList.toggle('elements-wrap', event.data);
    for (var i = 0; i < this._treeOutlines.length; ++i)
      this._treeOutlines[i].setWordWrap(/** @type {boolean} */ (event.data));
  }

  switchToAndFocus(node) {
    // Reset search restore.
    this._searchableView.cancelSearch();
    UI.viewManager.showView('elements').then(() => this.selectDOMNode(node, true));
  }

  /**
   * @param {!Event} event
   * @return {?UI.PopoverRequest}
   */
  _getPopoverRequest(event) {
    var link = event.target;
    while (link && !link[Elements.ElementsTreeElement.HrefSymbol])
      link = link.parentElementOrShadowHost();
    if (!link)
      return null;

    return {
      box: link.boxInWindow(),
      show: async popover => {
        var node = this.selectedDOMNode();
        if (!node)
          return false;
        var preview = await Components.DOMPresentationUtils.buildImagePreviewContents(
            node.domModel().target(), link[Elements.ElementsTreeElement.HrefSymbol], true);
        if (preview)
          popover.contentElement.appendChild(preview);
        return !!preview;
      }
    };
  }

  _jumpToSearchResult(index) {
    this._currentSearchResultIndex = (index + this._searchResults.length) % this._searchResults.length;
    this._highlightCurrentSearchResult();
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchResults)
      return;
    this.performSearch(this._searchConfig, true);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults)
      return;
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
    var index = this._currentSearchResultIndex;
    var searchResults = this._searchResults;
    var searchResult = searchResults[index];

    this._searchableView.updateCurrentMatchIndex(index);
    if (searchResult.node === null)
      return;

    if (typeof searchResult.node === 'undefined') {
      // No data for slot, request it.
      searchResult.domModel.searchResult(searchResult.index).then(node => {
        searchResult.node = node;
        this._highlightCurrentSearchResult();
      });
      return;
    }

    var treeElement = this._treeElementForNode(searchResult.node);
    searchResult.node.scrollIntoView();
    if (treeElement) {
      treeElement.highlightSearchResults(this._searchConfig.query);
      treeElement.reveal();
      var matches = treeElement.listItemElement.getElementsByClassName(UI.highlightedSearchResultClassName);
      if (matches.length)
        matches[0].scrollIntoViewIfNeeded(false);
    }
  }

  _hideSearchHighlights() {
    if (!this._searchResults || !this._searchResults.length || this._currentSearchResultIndex === undefined)
      return;
    var searchResult = this._searchResults[this._currentSearchResultIndex];
    if (!searchResult.node)
      return;
    var treeOutline = Elements.ElementsTreeOutline.forDOMModel(searchResult.node.domModel());
    var treeElement = treeOutline.findTreeElement(searchResult.node);
    if (treeElement)
      treeElement.hideSearchHighlights();
  }

  /**
   * @return {?SDK.DOMNode}
   */
  selectedDOMNode() {
    for (var i = 0; i < this._treeOutlines.length; ++i) {
      var treeOutline = this._treeOutlines[i];
      if (treeOutline.selectedDOMNode())
        return treeOutline.selectedDOMNode();
    }
    return null;
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {boolean=} focus
   */
  selectDOMNode(node, focus) {
    for (var i = 0; i < this._treeOutlines.length; ++i) {
      var treeOutline = this._treeOutlines[i];
      if (treeOutline.domModel() === node.domModel())
        treeOutline.selectDOMNode(node, focus);
      else
        treeOutline.selectDOMNode(null);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _updateBreadcrumbIfNeeded(event) {
    var nodes = /** @type {!Array.<!SDK.DOMNode>} */ (event.data);
    this._breadcrumbs.updateNodes(nodes);
  }

  /**
   * @param {!Common.Event} event
   */
  _crumbNodeSelected(event) {
    var node = /** @type {!SDK.DOMNode} */ (event.data);
    this.selectDOMNode(node, true);
  }

  /**
   * @override
   * @param {!KeyboardEvent} event
   */
  handleShortcut(event) {
    /**
     * @param {!Elements.ElementsTreeOutline} treeOutline
     */
    function handleUndoRedo(treeOutline) {
      if (UI.KeyboardShortcut.eventHasCtrlOrMeta(event) && !event.shiftKey &&
          (event.key === 'Z' || event.key === 'z')) {  // Z key
        treeOutline.domModel().undo();
        event.handled = true;
        return;
      }

      var isRedoKey = Host.isMac() ?
          event.metaKey && event.shiftKey && (event.key === 'Z' || event.key === 'z') :  // Z key
          event.ctrlKey && (event.key === 'Y' || event.key === 'y');                     // Y key
      if (isRedoKey) {
        treeOutline.domModel().redo();
        event.handled = true;
      }
    }

    if (UI.isEditing() && event.keyCode !== UI.KeyboardShortcut.Keys.F2.code)
      return;

    var treeOutline = null;
    for (var i = 0; i < this._treeOutlines.length; ++i) {
      if (this._treeOutlines[i].selectedDOMNode())
        treeOutline = this._treeOutlines[i];
    }
    if (!treeOutline)
      return;

    if (!treeOutline.editing()) {
      handleUndoRedo.call(null, treeOutline);
      if (event.handled) {
        this._stylesWidget.forceUpdate();
        return;
      }
    }

    treeOutline.handleShortcut(event);
    if (event.handled)
      return;

    super.handleShortcut(event);
  }

  /**
   * @param {?SDK.DOMNode} node
   * @return {?Elements.ElementsTreeOutline}
   */
  _treeOutlineForNode(node) {
    if (!node)
      return null;
    return Elements.ElementsTreeOutline.forDOMModel(node.domModel());
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {?Elements.ElementsTreeElement}
   */
  _treeElementForNode(node) {
    var treeOutline = this._treeOutlineForNode(node);
    return /** @type {?Elements.ElementsTreeElement} */ (treeOutline.findTreeElement(node));
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {!SDK.DOMNode}
   */
  _leaveUserAgentShadowDOM(node) {
    var userAgentShadowRoot;
    while ((userAgentShadowRoot = node.ancestorUserAgentShadowRoot()) && userAgentShadowRoot.parentNode)
      node = userAgentShadowRoot.parentNode;
    return node;
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {boolean} focus
   * @return {!Promise}
   */
  revealAndSelectNode(node, focus) {
    if (Elements.inspectElementModeController && Elements.inspectElementModeController.isInInspectElementMode())
      Elements.inspectElementModeController.stopInspection();

    this._omitDefaultSelection = true;

    node = Common.moduleSetting('showUAShadowDOM').get() ? node : this._leaveUserAgentShadowDOM(node);
    node.highlightForTwoSeconds();

    return UI.viewManager.showView('elements', false, !focus).then(() => {
      this.selectDOMNode(node, focus);
      delete this._omitDefaultSelection;

      if (!this._notFirstInspectElement)
        InspectorFrontendHost.inspectElementCompleted();
      this._notFirstInspectElement = true;
    });
  }

  _showUAShadowDOMChanged() {
    for (var i = 0; i < this._treeOutlines.length; ++i)
      this._treeOutlines[i].update();
  }

  _updateSidebarPosition() {
    if (this.sidebarPaneView && this.sidebarPaneView.tabbedPane().shouldHideOnDetach())
      return;  // We can't reparent extension iframes.

    var splitMode;
    var position = Common.moduleSetting('sidebarPosition').get();
    if (position === 'right' || (position === 'auto' && UI.inspectorView.element.offsetWidth > 680))
      splitMode = Elements.ElementsPanel._splitMode.Vertical;
    else if (UI.inspectorView.element.offsetWidth > 415)
      splitMode = Elements.ElementsPanel._splitMode.Horizontal;
    else
      splitMode = Elements.ElementsPanel._splitMode.Slim;

    if (this.sidebarPaneView && splitMode === this._splitMode)
      return;
    this._splitMode = splitMode;

    var extensionSidebarPanes = Extensions.extensionServer.sidebarPanes();
    var lastSelectedTabId = null;
    if (this.sidebarPaneView) {
      lastSelectedTabId = this.sidebarPaneView.tabbedPane().selectedTabId;
      this.sidebarPaneView.tabbedPane().detach();
      this._splitWidget.uninstallResizer(this.sidebarPaneView.tabbedPane().headerElement());
    }

    this._splitWidget.setVertical(this._splitMode === Elements.ElementsPanel._splitMode.Vertical);
    this.showToolbarPane(null /* widget */, null /* toggle */);

    var matchedStylePanesWrapper = new UI.VBox();
    matchedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    this._stylesWidget.show(matchedStylePanesWrapper.element);

    var computedStylePanesWrapper = new UI.VBox();
    computedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    this._computedStyleWidget.show(computedStylePanesWrapper.element);

    /**
     * @param {boolean} inComputedStyle
     * @this {Elements.ElementsPanel}
     */
    function showMetrics(inComputedStyle) {
      if (inComputedStyle)
        this._metricsWidget.show(computedStylePanesWrapper.element, this._computedStyleWidget.element);
      else
        this._metricsWidget.show(matchedStylePanesWrapper.element);
    }

    /**
     * @param {!Common.Event} event
     * @this {Elements.ElementsPanel}
     */
    function tabSelected(event) {
      var tabId = /** @type {string} */ (event.data.tabId);
      if (tabId === Common.UIString('Computed'))
        showMetrics.call(this, true);
      else if (tabId === Common.UIString('Styles'))
        showMetrics.call(this, false);
    }

    this.sidebarPaneView = UI.viewManager.createTabbedLocation(() => UI.viewManager.showView('elements'));
    var tabbedPane = this.sidebarPaneView.tabbedPane();
    if (this._popoverHelper)
      this._popoverHelper.hidePopover();
    this._popoverHelper = new UI.PopoverHelper(tabbedPane.element, this._getPopoverRequest.bind(this));
    this._popoverHelper.setHasPadding(true);
    this._popoverHelper.setTimeout(0);

    if (this._splitMode !== Elements.ElementsPanel._splitMode.Vertical)
      this._splitWidget.installResizer(tabbedPane.headerElement());

    var stylesView = new UI.SimpleView(Common.UIString('Styles'));
    this.sidebarPaneView.appendView(stylesView);
    if (splitMode === Elements.ElementsPanel._splitMode.Horizontal) {
      // Styles and computed are merged into a single tab.
      stylesView.element.classList.add('flex-auto');

      var splitWidget = new UI.SplitWidget(true, true, 'stylesPaneSplitViewState', 215);
      splitWidget.show(stylesView.element);
      splitWidget.setMainWidget(matchedStylePanesWrapper);
      splitWidget.setSidebarWidget(computedStylePanesWrapper);
    } else {
      // Styles and computed are in separate tabs.
      stylesView.element.classList.add('flex-auto');
      matchedStylePanesWrapper.show(stylesView.element);

      var computedView = new UI.SimpleView(Common.UIString('Computed'));
      computedView.element.classList.add('composite', 'fill');
      computedStylePanesWrapper.show(computedView.element);

      tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, tabSelected, this);
      this.sidebarPaneView.appendView(computedView);
    }
    this._stylesViewToReveal = stylesView;

    showMetrics.call(this, this._splitMode === Elements.ElementsPanel._splitMode.Horizontal);

    this.sidebarPaneView.appendApplicableItems('elements-sidebar');
    for (var i = 0; i < extensionSidebarPanes.length; ++i)
      this._addExtensionSidebarPane(extensionSidebarPanes[i]);

    if (lastSelectedTabId)
      this.sidebarPaneView.tabbedPane().selectTab(lastSelectedTabId);

    this._splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());
  }

  /**
   * @param {!Common.Event} event
   */
  _extensionSidebarPaneAdded(event) {
    var pane = /** @type {!Extensions.ExtensionSidebarPane} */ (event.data);
    this._addExtensionSidebarPane(pane);
  }

  /**
   * @param {!Extensions.ExtensionSidebarPane} pane
   */
  _addExtensionSidebarPane(pane) {
    if (pane.panelName() === this.name)
      this.sidebarPaneView.appendView(pane);
  }
};

Elements.ElementsPanel._elementsSidebarViewTitleSymbol = Symbol('title');

/** @enum {symbol} */
Elements.ElementsPanel._splitMode = {
  Vertical: Symbol('Vertical'),
  Horizontal: Symbol('Horizontal'),
  Slim: Symbol('Slim'),
};

/**
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
Elements.ElementsPanel.ContextMenuProvider = class {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} object
   */
  appendApplicableItems(event, contextMenu, object) {
    if (!(object instanceof SDK.RemoteObject && (/** @type {!SDK.RemoteObject} */ (object)).isNode()) &&
        !(object instanceof SDK.DOMNode) && !(object instanceof SDK.DeferredDOMNode))
      return;

    // Skip adding "Reveal..." menu item for our own tree outline.
    if (Elements.ElementsPanel.instance().element.isAncestor(/** @type {!Node} */ (event.target)))
      return;
    var commandCallback = Common.Revealer.reveal.bind(Common.Revealer, object);
    contextMenu.appendItem(Common.UIString('Reveal in Elements panel'), commandCallback);
  }
};

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
Elements.ElementsPanel.DOMNodeRevealer = class {
  /**
   * @override
   * @param {!Object} node
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  reveal(node, omitFocus) {
    var panel = Elements.ElementsPanel.instance();
    panel._pendingNodeReveal = true;

    return new Promise(revealPromise);

    /**
     * @param {function(undefined)} resolve
     * @param {function(!Error)} reject
     */
    function revealPromise(resolve, reject) {
      if (node instanceof SDK.DOMNode) {
        onNodeResolved(/** @type {!SDK.DOMNode} */ (node));
      } else if (node instanceof SDK.DeferredDOMNode) {
        (/** @type {!SDK.DeferredDOMNode} */ (node)).resolve(onNodeResolved);
      } else if (node instanceof SDK.RemoteObject) {
        var domModel = /** @type {!SDK.RemoteObject} */ (node).runtimeModel().target().model(SDK.DOMModel);
        if (domModel)
          domModel.pushObjectAsNodeToFrontend(node).then(onNodeResolved);
        else
          reject(new Error('Could not resolve a node to reveal.'));
      } else {
        reject(new Error('Can\'t reveal a non-node.'));
        panel._pendingNodeReveal = false;
      }

      /**
       * @param {?SDK.DOMNode} resolvedNode
       */
      function onNodeResolved(resolvedNode) {
        panel._pendingNodeReveal = false;

        if (resolvedNode) {
          panel.revealAndSelectNode(resolvedNode, !omitFocus).then(resolve);
          return;
        }
        reject(new Error('Could not resolve node to reveal.'));
      }
    }
  }
};

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
Elements.ElementsPanel.CSSPropertyRevealer = class {
  /**
   * @override
   * @param {!Object} property
   * @return {!Promise}
   */
  reveal(property) {
    var panel = Elements.ElementsPanel.instance();
    return panel._revealProperty(/** @type {!SDK.CSSProperty} */ (property));
  }
};


/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Elements.ElementsActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var node = UI.context.flavor(SDK.DOMNode);
    if (!node)
      return true;
    var treeOutline = Elements.ElementsTreeOutline.forDOMModel(node.domModel());
    if (!treeOutline)
      return true;

    switch (actionId) {
      case 'elements.hide-element':
        treeOutline.toggleHideElement(node);
        return true;
      case 'elements.edit-as-html':
        treeOutline.toggleEditAsHTML(node);
        return true;
    }
    return false;
  }
};

/**
 * @implements {Components.DOMPresentationUtils.MarkerDecorator}
 * @unrestricted
 */
Elements.ElementsPanel.PseudoStateMarkerDecorator = class {
  /**
   * @override
   * @param {!SDK.DOMNode} node
   * @return {?{title: string, color: string}}
   */
  decorate(node) {
    return {
      color: 'orange',
      title: Common.UIString('Element state: %s', ':' + node.domModel().cssModel().pseudoState(node).join(', :'))
    };
  }
};
