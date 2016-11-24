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
 * @implements {SDK.TargetManager.Observer}
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

    this._contentElement.id = 'elements-content';
    // FIXME: crbug.com/425984
    if (Common.moduleSetting('domWordWrap').get())
      this._contentElement.classList.add('elements-wrap');
    Common.moduleSetting('domWordWrap').addChangeListener(this._domWordWrapSettingChanged.bind(this));

    crumbsContainer.id = 'elements-crumbs';
    this._breadcrumbs = new Elements.ElementsBreadcrumbs();
    this._breadcrumbs.show(crumbsContainer);
    this._breadcrumbs.addEventListener(Elements.ElementsBreadcrumbs.Events.NodeSelected, this._crumbNodeSelected, this);

    this._currentToolbarPane = null;

    this._stylesWidget = new Elements.StylesSidebarPane();
    this._computedStyleWidget = new Elements.ComputedStyleWidget();
    this._metricsWidget = new Elements.MetricsSidebarPane();

    this._stylesSidebarToolbar = this._createStylesSidebarToolbar();

    Common.moduleSetting('sidebarPosition').addChangeListener(this._updateSidebarPosition.bind(this));
    this._updateSidebarPosition();

    /** @type {!Array.<!Elements.ElementsTreeOutline>} */
    this._treeOutlines = [];
    SDK.targetManager.observeTargets(this);
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
   * @return {!Element}
   */
  _createStylesSidebarToolbar() {
    var container = createElementWithClass('div', 'styles-sidebar-pane-toolbar-container');
    var hbox = container.createChild('div', 'hbox styles-sidebar-pane-toolbar');
    var filterContainerElement = hbox.createChild('div', 'styles-sidebar-pane-filter-box');
    var filterInput = Elements.StylesSidebarPane.createPropertyFilterElement(
        Common.UIString('Filter'), hbox, this._stylesWidget.onFilterChanged.bind(this._stylesWidget));
    filterContainerElement.appendChild(filterInput);
    var toolbar = new UI.Toolbar('styles-pane-toolbar', hbox);
    toolbar.makeToggledGray();
    toolbar.appendLocationItems('styles-sidebarpane-toolbar');
    var toolbarPaneContainer = container.createChild('div', 'styles-sidebar-toolbar-pane-container');
    this._toolbarPaneElement = createElementWithClass('div', 'styles-sidebar-toolbar-pane');
    toolbarPaneContainer.appendChild(this._toolbarPaneElement);
    return container;
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
   * @param {!UI.ToolbarToggle=} toggle
   */
  showToolbarPane(widget, toggle) {
    if (this._pendingWidgetToggle)
      this._pendingWidgetToggle.setToggled(false);
    this._pendingWidgetToggle = toggle;

    if (this._animatedToolbarPane !== undefined)
      this._pendingWidget = widget;
    else
      this._startToolbarPaneAnimation(widget);

    if (widget && toggle)
      toggle.setToggled(true);
  }

  /**
   * @param {?UI.Widget} widget
   */
  _startToolbarPaneAnimation(widget) {
    if (widget === this._currentToolbarPane)
      return;

    if (widget && this._currentToolbarPane) {
      this._currentToolbarPane.detach();
      widget.show(this._toolbarPaneElement);
      this._currentToolbarPane = widget;
      this._currentToolbarPane.focus();
      return;
    }

    this._animatedToolbarPane = widget;

    if (this._currentToolbarPane)
      this._toolbarPaneElement.style.animationName = 'styles-element-state-pane-slideout';
    else if (widget)
      this._toolbarPaneElement.style.animationName = 'styles-element-state-pane-slidein';

    if (widget)
      widget.show(this._toolbarPaneElement);

    var listener = onAnimationEnd.bind(this);
    this._toolbarPaneElement.addEventListener('animationend', listener, false);

    /**
     * @this {Elements.ElementsPanel}
     */
    function onAnimationEnd() {
      this._toolbarPaneElement.style.removeProperty('animation-name');
      this._toolbarPaneElement.removeEventListener('animationend', listener, false);

      if (this._currentToolbarPane)
        this._currentToolbarPane.detach();

      this._currentToolbarPane = this._animatedToolbarPane;
      if (this._currentToolbarPane)
        this._currentToolbarPane.focus();
      delete this._animatedToolbarPane;

      if (this._pendingWidget !== undefined) {
        this._startToolbarPaneAnimation(this._pendingWidget);
        delete this._pendingWidget;
      }
    }
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    var domModel = SDK.DOMModel.fromTarget(target);
    if (!domModel)
      return;
    var treeOutline = new Elements.ElementsTreeOutline(domModel, true, true);
    treeOutline.setWordWrap(Common.moduleSetting('domWordWrap').get());
    treeOutline.wireToDOMModel();
    treeOutline.addEventListener(
        Elements.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);
    treeOutline.addEventListener(
        Elements.ElementsTreeOutline.Events.ElementsTreeUpdated, this._updateBreadcrumbIfNeeded, this);
    new Elements.ElementsTreeElementHighlighter(treeOutline);
    this._treeOutlines.push(treeOutline);

    // Perform attach if necessary.
    if (this.isShowing())
      this.wasShown();
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var domModel = SDK.DOMModel.fromTarget(target);
    if (!domModel)
      return;
    var treeOutline = Elements.ElementsTreeOutline.forDOMModel(domModel);
    treeOutline.unwireFromDOMModel();
    this._treeOutlines.remove(treeOutline);
    treeOutline.element.remove();
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
      if (treeOutline.element.parentElement !== this._contentElement)
        this._contentElement.appendChild(treeOutline.element);
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
          treeOutline.domModel().requestDocument();
      }
    }
    this.focus();
  }

  /**
   * @override
   */
  willHide() {
    UI.context.setFlavor(Elements.ElementsPanel, null);

    SDK.DOMModel.hideDOMNodeHighlight();
    for (var i = 0; i < this._treeOutlines.length; ++i) {
      var treeOutline = this._treeOutlines[i];
      treeOutline.setVisible(false);
      // Detach heavy component on hide
      this._contentElement.removeChild(treeOutline.element);
    }
    if (this._popoverHelper)
      this._popoverHelper.hidePopover();
    super.willHide();
  }

  /**
   * @override
   */
  onResize() {
    if (Common.moduleSetting('sidebarPosition').get() === 'auto')
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

    var executionContexts = selectedNode.target().runtimeModel.executionContexts();
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
    this._documentUpdated(
        /** @type {!SDK.DOMModel} */ (event.target), /** @type {?SDK.DOMDocument} */ (event.data));
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
        domModel.requestDocument();
      return;
    }

    this._hasNonDefaultSelectedNode = false;
    Components.domBreakpointsSidebarPane.restoreBreakpoints(inspectedRootDocument);

    if (this._omitDefaultSelection)
      return;

    var savedSelectedNodeOnReset = this._selectedNodeOnReset;
    restoreNode.call(this, domModel, this._selectedNodeOnReset);

    /**
     * @param {!SDK.DOMModel} domModel
     * @param {?SDK.DOMNode} staleNode
     * @this {Elements.ElementsPanel}
     */
    function restoreNode(domModel, staleNode) {
      var nodePath = staleNode ? staleNode.path() : null;
      if (!nodePath) {
        onNodeRestored.call(this, null);
        return;
      }
      domModel.pushNodeByPathToFrontend(nodePath, onNodeRestored.bind(this));
    }

    /**
     * @param {?Protocol.DOM.NodeId} restoredNodeId
     * @this {Elements.ElementsPanel}
     */
    function onNodeRestored(restoredNodeId) {
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
    delete this._searchQuery;
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
    // Call searchCanceled since it will reset everything we need before doing a new search.
    this.searchCanceled();

    const whitespaceTrimmedQuery = query.trim();
    if (!whitespaceTrimmedQuery.length)
      return;

    this._searchQuery = query;

    var promises = [];
    var domModels = SDK.DOMModel.instances();
    for (var domModel of domModels) {
      promises.push(
          domModel.performSearchPromise(whitespaceTrimmedQuery, Common.moduleSetting('showUAShadowDOM').get()));
    }
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
      this._currentSearchResultIndex = -1;

      if (shouldJump)
        this._jumpToSearchResult(jumpBackwards ? -1 : 0);
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
   * @param {!Element} element
   * @param {!Event} event
   * @return {!Element|!AnchorBox|undefined}
   */
  _getPopoverAnchor(element, event) {
    var link = element;
    while (link && !link[Elements.ElementsTreeElement.HrefSymbol])
      link = link.parentElementOrShadowHost();
    return link ? link : undefined;
  }

  /**
   * @param {!Element} link
   * @param {!UI.Popover} popover
   */
  _showPopover(link, popover) {
    var node = this.selectedDOMNode();
    if (node) {
      Components.DOMPresentationUtils.buildImagePreviewContents(
          node.target(), link[Elements.ElementsTreeElement.HrefSymbol], true, showPopover);
    }

    /**
     * @param {!Element=} contents
     */
    function showPopover(contents) {
      if (!contents)
        return;
      popover.setCanShrink(false);
      popover.showForAnchor(contents, link);
    }
  }

  _jumpToSearchResult(index) {
    this._hideSearchHighlights();
    this._currentSearchResultIndex = (index + this._searchResults.length) % this._searchResults.length;
    this._highlightCurrentSearchResult();
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchResults)
      return;
    this._jumpToSearchResult(this._currentSearchResultIndex + 1);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults)
      return;
    this._jumpToSearchResult(this._currentSearchResultIndex - 1);
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

    if (searchResult.node === null) {
      this._searchableView.updateCurrentMatchIndex(index);
      return;
    }

    /**
     * @param {?SDK.DOMNode} node
     * @this {Elements.ElementsPanel}
     */
    function searchCallback(node) {
      searchResult.node = node;
      this._highlightCurrentSearchResult();
    }

    if (typeof searchResult.node === 'undefined') {
      // No data for slot, request it.
      searchResult.domModel.searchResult(searchResult.index, searchCallback.bind(this));
      return;
    }

    this._searchableView.updateCurrentMatchIndex(index);

    var treeElement = this._treeElementForNode(searchResult.node);
    if (treeElement) {
      treeElement.highlightSearchResults(this._searchQuery);
      treeElement.reveal();
      var matches = treeElement.listItemElement.getElementsByClassName(UI.highlightedSearchResultClassName);
      if (matches.length)
        matches[0].scrollIntoViewIfNeeded(false);
    }
  }

  _hideSearchHighlights() {
    if (!this._searchResults || !this._searchResults.length || this._currentSearchResultIndex < 0)
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
   * @return {!Promise}
   */
  revealAndSelectNode(node) {
    if (Elements.inspectElementModeController && Elements.inspectElementModeController.isInInspectElementMode())
      Elements.inspectElementModeController.stopInspection();

    this._omitDefaultSelection = true;

    node = Common.moduleSetting('showUAShadowDOM').get() ? node : this._leaveUserAgentShadowDOM(node);
    node.highlightForTwoSeconds();

    return UI.viewManager.showView('elements').then(() => {
      this.selectDOMNode(node, true);
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
    var horizontally;
    var position = Common.moduleSetting('sidebarPosition').get();
    if (position === 'right')
      horizontally = false;
    else if (position === 'bottom')
      horizontally = true;
    else
      horizontally = UI.inspectorView.element.offsetWidth < 680;

    if (this.sidebarPaneView && horizontally === !this._splitWidget.isVertical())
      return;

    if (this.sidebarPaneView && this.sidebarPaneView.tabbedPane().shouldHideOnDetach())
      return;  // We can't reparent extension iframes.

    var extensionSidebarPanes = Extensions.extensionServer.sidebarPanes();
    if (this.sidebarPaneView) {
      this.sidebarPaneView.tabbedPane().detach();
      this._splitWidget.uninstallResizer(this.sidebarPaneView.tabbedPane().headerElement());
    }

    this._splitWidget.setVertical(!horizontally);
    this.showToolbarPane(null);

    var matchedStylesContainer = new UI.VBox();
    matchedStylesContainer.element.appendChild(this._stylesSidebarToolbar);
    var matchedStylePanesWrapper = new UI.VBox();
    matchedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    matchedStylePanesWrapper.show(matchedStylesContainer.element);
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
    this._popoverHelper = new UI.PopoverHelper(tabbedPane.element);
    this._popoverHelper.initializeCallbacks(this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
    this._popoverHelper.setTimeout(0);

    if (horizontally) {
      // Styles and computed are merged into a single tab.
      this._splitWidget.installResizer(tabbedPane.headerElement());

      var stylesView = new UI.SimpleView(Common.UIString('Styles'));
      stylesView.element.classList.add('flex-auto');

      var splitWidget = new UI.SplitWidget(true, true, 'stylesPaneSplitViewState', 215);
      splitWidget.show(stylesView.element);

      splitWidget.setMainWidget(matchedStylesContainer);
      splitWidget.setSidebarWidget(computedStylePanesWrapper);

      this.sidebarPaneView.appendView(stylesView);
      this._stylesViewToReveal = stylesView;
    } else {
      // Styles and computed are in separate tabs.
      var stylesView = new UI.SimpleView(Common.UIString('Styles'));
      stylesView.element.classList.add('flex-auto', 'metrics-and-styles');
      matchedStylesContainer.show(stylesView.element);

      var computedView = new UI.SimpleView(Common.UIString('Computed'));
      computedView.element.classList.add('composite', 'fill', 'metrics-and-computed');
      computedStylePanesWrapper.show(computedView.element);

      tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, tabSelected, this);
      this.sidebarPaneView.appendView(stylesView);
      this.sidebarPaneView.appendView(computedView);
      this._stylesViewToReveal = stylesView;
    }

    showMetrics.call(this, horizontally);

    this.sidebarPaneView.appendApplicableItems('elements-sidebar');
    for (var i = 0; i < extensionSidebarPanes.length; ++i)
      this._addExtensionSidebarPane(extensionSidebarPanes[i]);

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


    // Add debbuging-related actions
    if (object instanceof SDK.DOMNode) {
      contextMenu.appendSeparator();
      Components.domBreakpointsSidebarPane.populateNodeContextMenu(object, contextMenu, true);
    }

    // Skip adding "Reveal..." menu item for our own tree outline.
    if (Elements.ElementsPanel.instance().element.isAncestor(/** @type {!Node} */ (event.target)))
      return;
    var commandCallback = Common.Revealer.reveal.bind(Common.Revealer, object);
    contextMenu.appendItem(Common.UIString.capitalize('Reveal in Elements ^panel'), commandCallback);
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
   * @return {!Promise}
   */
  reveal(node) {
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
        var domModel = SDK.DOMModel.fromTarget(/** @type {!SDK.RemoteObject} */ (node).target());
        if (domModel)
          domModel.pushObjectAsNodeToFrontend(node, onNodeResolved);
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
          panel.revealAndSelectNode(resolvedNode).then(resolve);
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
      title: Common.UIString('Element state: %s', ':' + SDK.CSSModel.fromNode(node).pseudoState(node).join(', :'))
    };
  }
};
