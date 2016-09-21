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
 * @constructor
 * @implements {WebInspector.Searchable}
 * @implements {WebInspector.TargetManager.Observer}
 * @implements {WebInspector.ViewLocationResolver}
 * @extends {WebInspector.Panel}
 */
WebInspector.ElementsPanel = function()
{
    WebInspector.Panel.call(this, "elements");
    this.registerRequiredCSS("elements/elementsPanel.css");

    this._splitWidget = new WebInspector.SplitWidget(true, true, "elementsPanelSplitViewState", 325, 325);
    this._splitWidget.addEventListener(WebInspector.SplitWidget.Events.SidebarSizeChanged, this._updateTreeOutlineVisibleWidth.bind(this));
    this._splitWidget.show(this.element);

    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.setMinimumSize(25, 28);
    this._searchableView.setPlaceholder(WebInspector.UIString("Find by string, selector, or XPath"));
    var stackElement = this._searchableView.element;

    this._contentElement = createElement("div");
    var crumbsContainer = createElement("div");
    stackElement.appendChild(this._contentElement);
    stackElement.appendChild(crumbsContainer);

    this._splitWidget.setMainWidget(this._searchableView);

    this._contentElement.id = "elements-content";
    // FIXME: crbug.com/425984
    if (WebInspector.moduleSetting("domWordWrap").get())
        this._contentElement.classList.add("elements-wrap");
    WebInspector.moduleSetting("domWordWrap").addChangeListener(this._domWordWrapSettingChanged.bind(this));

    crumbsContainer.id = "elements-crumbs";
    this._breadcrumbs = new WebInspector.ElementsBreadcrumbs();
    this._breadcrumbs.show(crumbsContainer);
    this._breadcrumbs.addEventListener(WebInspector.ElementsBreadcrumbs.Events.NodeSelected, this._crumbNodeSelected, this);

    this._currentToolbarPane = null;

    this._stylesWidget = new WebInspector.StylesSidebarPane();
    this._computedStyleWidget = new WebInspector.ComputedStyleWidget();
    this._metricsWidget = new WebInspector.MetricsSidebarPane();

    this._stylesSidebarToolbar = this._createStylesSidebarToolbar();

    WebInspector.moduleSetting("sidebarPosition").addChangeListener(this._updateSidebarPosition.bind(this));
    this._updateSidebarPosition();

    /** @type {!Array.<!WebInspector.ElementsTreeOutline>} */
    this._treeOutlines = [];
    WebInspector.targetManager.observeTargets(this);
    WebInspector.moduleSetting("showUAShadowDOM").addChangeListener(this._showUAShadowDOMChanged.bind(this));
    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.DocumentUpdated, this._documentUpdatedEvent, this);
    WebInspector.extensionServer.addEventListener(WebInspector.ExtensionServer.Events.SidebarPaneAdded, this._extensionSidebarPaneAdded, this);
}

WebInspector.ElementsPanel._elementsSidebarViewTitleSymbol = Symbol("title");

WebInspector.ElementsPanel.prototype = {
    /**
     * @param {!WebInspector.CSSProperty} cssProperty
     */
    _revealProperty: function(cssProperty)
    {
        return this.sidebarPaneView.showView(this._stylesViewToReveal).then(() => {
            this._stylesWidget.revealProperty(/** @type {!WebInspector.CSSProperty} */(cssProperty));
        });
    },

    /**
     * @return {!Element}
     */
    _createStylesSidebarToolbar: function()
    {
        var container = createElementWithClass("div", "styles-sidebar-pane-toolbar-container");
        var hbox = container.createChild("div", "hbox styles-sidebar-pane-toolbar");
        var filterContainerElement = hbox.createChild("div", "styles-sidebar-pane-filter-box");
        var filterInput = WebInspector.StylesSidebarPane.createPropertyFilterElement(WebInspector.UIString("Filter"), hbox, this._stylesWidget.onFilterChanged.bind(this._stylesWidget));
        filterContainerElement.appendChild(filterInput);
        var toolbar = new WebInspector.Toolbar("styles-pane-toolbar", hbox);
        toolbar.makeToggledGray();
        toolbar.appendLocationItems("styles-sidebarpane-toolbar");
        var toolbarPaneContainer = container.createChild("div", "styles-sidebar-toolbar-pane-container");
        this._toolbarPaneElement = createElementWithClass("div", "styles-sidebar-toolbar-pane");
        toolbarPaneContainer.appendChild(this._toolbarPaneElement);
        return container;
    },

    /**
     * @override
     * @param {string} locationName
     * @return {?WebInspector.ViewLocation}
     */
    resolveLocation: function(locationName)
    {
        return this.sidebarPaneView;
    },

    /**
     * @param {?WebInspector.Widget} widget
     * @param {!WebInspector.ToolbarToggle=} toggle
     */
    showToolbarPane: function(widget, toggle)
    {
        if (this._pendingWidgetToggle)
            this._pendingWidgetToggle.setToggled(false);
        this._pendingWidgetToggle = toggle;

        if (this._animatedToolbarPane !== undefined)
            this._pendingWidget = widget;
        else
            this._startToolbarPaneAnimation(widget);

        if (widget && toggle)
            toggle.setToggled(true);
    },

    /**
     * @param {?WebInspector.Widget} widget
     */
    _startToolbarPaneAnimation: function(widget)
    {
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
            this._toolbarPaneElement.style.animationName = "styles-element-state-pane-slideout";
        else if (widget)
            this._toolbarPaneElement.style.animationName = "styles-element-state-pane-slidein";

        if (widget)
            widget.show(this._toolbarPaneElement);

        var listener = onAnimationEnd.bind(this);
        this._toolbarPaneElement.addEventListener("animationend", listener, false);

        /**
         * @this {WebInspector.ElementsPanel}
         */
        function onAnimationEnd()
        {
            this._toolbarPaneElement.style.removeProperty("animation-name");
            this._toolbarPaneElement.removeEventListener("animationend", listener, false);

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
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var domModel = WebInspector.DOMModel.fromTarget(target);
        if (!domModel)
            return;
        var treeOutline = new WebInspector.ElementsTreeOutline(domModel, true, true);
        treeOutline.setWordWrap(WebInspector.moduleSetting("domWordWrap").get());
        treeOutline.wireToDOMModel();
        treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);
        treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.ElementsTreeUpdated, this._updateBreadcrumbIfNeeded, this);
        new WebInspector.ElementsTreeElementHighlighter(treeOutline);
        this._treeOutlines.push(treeOutline);

        // Perform attach if necessary.
        if (this.isShowing())
            this.wasShown();

    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var domModel = WebInspector.DOMModel.fromTarget(target);
        if (!domModel)
            return;
        var treeOutline = WebInspector.ElementsTreeOutline.forDOMModel(domModel);
        treeOutline.unwireFromDOMModel();
        this._treeOutlines.remove(treeOutline);
        treeOutline.element.remove();
    },

    _updateTreeOutlineVisibleWidth: function()
    {
        if (!this._treeOutlines.length)
            return;

        var width = this._splitWidget.element.offsetWidth;
        if (this._splitWidget.isVertical())
            width -= this._splitWidget.sidebarSize();
        for (var i = 0; i < this._treeOutlines.length; ++i) {
            this._treeOutlines[i].setVisibleWidth(width);
        }
        this._breadcrumbs.updateSizes();
    },

    /**
     * @override
     */
    focus: function()
    {
        if (this._treeOutlines.length)
            this._treeOutlines[0].focus();
    },

    /**
     * @override
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

    wasShown: function()
    {
        WebInspector.context.setFlavor(WebInspector.ElementsPanel, this);

        for (var i = 0; i < this._treeOutlines.length; ++i) {
            var treeOutline = this._treeOutlines[i];
            // Attach heavy component lazily
            if (treeOutline.element.parentElement !== this._contentElement)
                this._contentElement.appendChild(treeOutline.element);
        }
        WebInspector.Panel.prototype.wasShown.call(this);
        this._breadcrumbs.update();

        for (var i = 0; i < this._treeOutlines.length; ++i) {
            var treeOutline = this._treeOutlines[i];
            treeOutline.setVisible(true);

            if (!treeOutline.rootDOMNode)
                if (treeOutline.domModel().existingDocument())
                    this._documentUpdated(treeOutline.domModel(), treeOutline.domModel().existingDocument());
                else
                    treeOutline.domModel().requestDocument();
        }
        this.focus();
    },

    willHide: function()
    {
        WebInspector.context.setFlavor(WebInspector.ElementsPanel, null);

        WebInspector.DOMModel.hideDOMNodeHighlight();
        for (var i = 0; i < this._treeOutlines.length; ++i) {
            var treeOutline = this._treeOutlines[i];
            treeOutline.setVisible(false);
            // Detach heavy component on hide
            this._contentElement.removeChild(treeOutline.element);
        }
        if (this._popoverHelper)
            this._popoverHelper.hidePopover();
        WebInspector.Panel.prototype.willHide.call(this);
    },

    onResize: function()
    {
        if (WebInspector.moduleSetting("sidebarPosition").get() === "auto")
            this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));  // Do not force layout.
        this._updateTreeOutlineVisibleWidth();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _selectedNodeChanged: function(event)
    {
        var selectedNode = /** @type {?WebInspector.DOMNode} */ (event.data);
        for (var i = 0; i < this._treeOutlines.length; ++i) {
            if (!selectedNode || selectedNode.domModel() !== this._treeOutlines[i].domModel())
                this._treeOutlines[i].selectDOMNode(null);
        }

        if (!selectedNode && this._lastValidSelectedNode)
            this._selectedPathOnReset = this._lastValidSelectedNode.path();

        this._breadcrumbs.setSelectedNode(selectedNode);

        WebInspector.context.setFlavor(WebInspector.DOMNode, selectedNode);

        if (!selectedNode)
            return;
        selectedNode.setAsInspectedNode();
        this._lastValidSelectedNode = selectedNode;

        var executionContexts = selectedNode.target().runtimeModel.executionContexts();
        var nodeFrameId = selectedNode.frameId();
        for (var context of executionContexts) {
            if (context.frameId === nodeFrameId) {
                WebInspector.context.setFlavor(WebInspector.ExecutionContext, context);
                break;
            }
        }
    },

    _reset: function()
    {
        delete this.currentQuery;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _documentUpdatedEvent: function(event)
    {
        this._documentUpdated(/** @type {!WebInspector.DOMModel} */ (event.target), /** @type {?WebInspector.DOMDocument} */ (event.data));
    },

    /**
     * @param {!WebInspector.DOMModel} domModel
     * @param {?WebInspector.DOMDocument} inspectedRootDocument
     */
    _documentUpdated: function(domModel, inspectedRootDocument)
    {
        this._reset();
        this.searchCanceled();

        var treeOutline = WebInspector.ElementsTreeOutline.forDOMModel(domModel);
        treeOutline.rootDOMNode = inspectedRootDocument;

        if (!inspectedRootDocument) {
            if (this.isShowing())
                domModel.requestDocument();
            return;
        }

        WebInspector.domBreakpointsSidebarPane.restoreBreakpoints(inspectedRootDocument);

        /**
         * @this {WebInspector.ElementsPanel}
         * @param {?WebInspector.DOMNode} candidateFocusNode
         */
        function selectNode(candidateFocusNode)
        {
            if (!candidateFocusNode)
                candidateFocusNode = inspectedRootDocument.body || inspectedRootDocument.documentElement;

            if (!candidateFocusNode)
                return;

            if (!this._pendingNodeReveal) {
                this.selectDOMNode(candidateFocusNode);
                if (treeOutline.selectedTreeElement)
                    treeOutline.selectedTreeElement.expand();
            }
        }

        /**
         * @param {?DOMAgent.NodeId} nodeId
         * @this {WebInspector.ElementsPanel}
         */
        function selectLastSelectedNode(nodeId)
        {
            if (this.selectedDOMNode()) {
                // Focused node has been explicitly set while reaching out for the last selected node.
                return;
            }
            var node = nodeId ? domModel.nodeForId(nodeId) : null;
            selectNode.call(this, node);
            this._lastSelectedNodeSelectedForTest();
        }

        if (this._omitDefaultSelection)
            return;

        if (this._selectedPathOnReset)
            domModel.pushNodeByPathToFrontend(this._selectedPathOnReset, selectLastSelectedNode.bind(this));
        else
            selectNode.call(this, null);
        delete this._selectedPathOnReset;
    },

    _lastSelectedNodeSelectedForTest: function() { },

    /**
     * @override
     */
    searchCanceled: function()
    {
        delete this._searchQuery;
        this._hideSearchHighlights();

        this._searchableView.updateSearchMatchesCount(0);

        delete this._currentSearchResultIndex;
        delete this._searchResults;

        WebInspector.DOMModel.cancelSearch();
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(searchConfig, shouldJump, jumpBackwards)
    {
        var query = searchConfig.query;
        // Call searchCanceled since it will reset everything we need before doing a new search.
        this.searchCanceled();

        const whitespaceTrimmedQuery = query.trim();
        if (!whitespaceTrimmedQuery.length)
            return;

        this._searchQuery = query;

        var promises = [];
        var domModels = WebInspector.DOMModel.instances();
        for (var domModel of domModels)
            promises.push(domModel.performSearchPromise(whitespaceTrimmedQuery, WebInspector.moduleSetting("showUAShadowDOM").get()));
        Promise.all(promises).then(resultCountCallback.bind(this));

        /**
         * @param {!Array.<number>} resultCounts
         * @this {WebInspector.ElementsPanel}
         */
        function resultCountCallback(resultCounts)
        {
            /**
             * @type {!Array.<{domModel: !WebInspector.DOMModel, index: number, node: (?WebInspector.DOMNode|undefined)}>}
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
    },

    _domWordWrapSettingChanged: function(event)
    {
        // FIXME: crbug.com/425984
        this._contentElement.classList.toggle("elements-wrap", event.data);
        for (var i = 0; i < this._treeOutlines.length; ++i)
            this._treeOutlines[i].setWordWrap(/** @type {boolean} */ (event.data));
    },

    switchToAndFocus: function(node)
    {
        // Reset search restore.
        this._searchableView.cancelSearch();
        WebInspector.inspectorView.setCurrentPanel(this);
        this.selectDOMNode(node, true);
    },

    /**
     * @param {!Element} element
     * @param {!Event} event
     * @return {!Element|!AnchorBox|undefined}
     */
    _getPopoverAnchor: function(element, event)
    {
        var anchor = element.enclosingNodeOrSelfWithClass("webkit-html-resource-link");
        if (!anchor || !anchor.href)
            return;

        return anchor;
    },

    /**
     * @param {!Element} anchor
     * @param {!WebInspector.Popover} popover
     */
    _showPopover: function(anchor, popover)
    {
        var node = this.selectedDOMNode();
        if (node)
            WebInspector.DOMPresentationUtils.buildImagePreviewContents(node.target(), anchor.href, true, showPopover);

        /**
         * @param {!Element=} contents
         */
        function showPopover(contents)
        {
            if (!contents)
                return;
            popover.setCanShrink(false);
            popover.showForAnchor(contents, anchor);
        }
    },

    _jumpToSearchResult: function(index)
    {
        this._hideSearchHighlights();
        this._currentSearchResultIndex = (index + this._searchResults.length) % this._searchResults.length;
        this._highlightCurrentSearchResult();
    },

    /**
     * @override
     */
    jumpToNextSearchResult: function()
    {
        if (!this._searchResults)
            return;
        this._jumpToSearchResult(this._currentSearchResultIndex + 1);
    },

    /**
     * @override
     */
    jumpToPreviousSearchResult: function()
    {
        if (!this._searchResults)
            return;
        this._jumpToSearchResult(this._currentSearchResultIndex - 1);
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsCaseSensitiveSearch: function()
    {
        return false;
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsRegexSearch: function()
    {
        return false;
    },

    _highlightCurrentSearchResult: function()
    {
        var index = this._currentSearchResultIndex;
        var searchResults = this._searchResults;
        var searchResult = searchResults[index];

        if (searchResult.node === null) {
            this._searchableView.updateCurrentMatchIndex(index);
            return;
        }

        /**
         * @param {?WebInspector.DOMNode} node
         * @this {WebInspector.ElementsPanel}
         */
        function searchCallback(node)
        {
            searchResult.node = node;
            this._highlightCurrentSearchResult();
        }

        if (typeof searchResult.node === "undefined") {
            // No data for slot, request it.
            searchResult.domModel.searchResult(searchResult.index, searchCallback.bind(this));
            return;
        }

        this._searchableView.updateCurrentMatchIndex(index);

        var treeElement = this._treeElementForNode(searchResult.node);
        if (treeElement) {
            treeElement.highlightSearchResults(this._searchQuery);
            treeElement.reveal();
            var matches = treeElement.listItemElement.getElementsByClassName(WebInspector.highlightedSearchResultClassName);
            if (matches.length)
                matches[0].scrollIntoViewIfNeeded(false);
        }
    },

    _hideSearchHighlights: function()
    {
        if (!this._searchResults || !this._searchResults.length || this._currentSearchResultIndex < 0)
            return;
        var searchResult = this._searchResults[this._currentSearchResultIndex];
        if (!searchResult.node)
            return;
        var treeOutline = WebInspector.ElementsTreeOutline.forDOMModel(searchResult.node.domModel());
        var treeElement = treeOutline.findTreeElement(searchResult.node);
        if (treeElement)
            treeElement.hideSearchHighlights();
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    selectedDOMNode: function()
    {
        for (var i = 0; i < this._treeOutlines.length; ++i) {
            var treeOutline = this._treeOutlines[i];
            if (treeOutline.selectedDOMNode())
                return treeOutline.selectedDOMNode();
        }
        return null;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {boolean=} focus
     */
    selectDOMNode: function(node, focus)
    {
        for (var i = 0; i < this._treeOutlines.length; ++i) {
            var treeOutline = this._treeOutlines[i];
            if (treeOutline.domModel() === node.domModel())
                treeOutline.selectDOMNode(node, focus);
            else
                treeOutline.selectDOMNode(null);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _updateBreadcrumbIfNeeded: function(event)
    {
        var nodes = /** @type {!Array.<!WebInspector.DOMNode>} */ (event.data);
        this._breadcrumbs.updateNodes(nodes);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _crumbNodeSelected: function(event)
    {
        var node = /** @type {!WebInspector.DOMNode} */ (event.data);
        this.selectDOMNode(node, true);
    },

    /**
     * @override
     * @param {!KeyboardEvent} event
     */
    handleShortcut: function(event)
    {
        /**
         * @param {!WebInspector.ElementsTreeOutline} treeOutline
         */
        function handleUndoRedo(treeOutline)
        {
            if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && !event.shiftKey && (event.key === "Z" || event.key === "z")) { // Z key
                treeOutline.domModel().undo();
                event.handled = true;
                return;
            }

            var isRedoKey = WebInspector.isMac() ? event.metaKey && event.shiftKey && (event.key === "Z" || event.key === "z") : // Z key
                                                   event.ctrlKey && (event.key === "Y" || event.key === "y"); // Y key
            if (isRedoKey) {
                treeOutline.domModel().redo();
                event.handled = true;
            }
        }

        if (WebInspector.isEditing() && event.keyCode !== WebInspector.KeyboardShortcut.Keys.F2.code)
            return;

        var treeOutline = null;
        for (var i = 0; i < this._treeOutlines.length; ++i) {
            if (this._treeOutlines[i].selectedDOMNode() === this._lastValidSelectedNode)
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

        WebInspector.Panel.prototype.handleShortcut.call(this, event);
    },

    /**
     * @param {?WebInspector.DOMNode} node
     * @return {?WebInspector.ElementsTreeOutline}
     */
    _treeOutlineForNode: function(node)
    {
        if (!node)
            return null;
        return WebInspector.ElementsTreeOutline.forDOMModel(node.domModel());
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?WebInspector.ElementsTreeElement}
     */
    _treeElementForNode: function(node)
    {
        var treeOutline = this._treeOutlineForNode(node);
        return /** @type {?WebInspector.ElementsTreeElement} */ (treeOutline.findTreeElement(node));
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!WebInspector.DOMNode}
     */
    _leaveUserAgentShadowDOM: function(node)
    {
        var userAgentShadowRoot;
        while ((userAgentShadowRoot = node.ancestorUserAgentShadowRoot()) && userAgentShadowRoot.parentNode)
            node = userAgentShadowRoot.parentNode;
        return node;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    revealAndSelectNode: function(node)
    {
        if (WebInspector.inspectElementModeController && WebInspector.inspectElementModeController.isInInspectElementMode())
            WebInspector.inspectElementModeController.stopInspection();

        this._omitDefaultSelection = true;

        var showLayoutEditor = !!WebInspector.inspectElementModeController && WebInspector.inspectElementModeController.isInLayoutEditorMode();
        WebInspector.inspectorView.setCurrentPanel(this, showLayoutEditor);
        node = WebInspector.moduleSetting("showUAShadowDOM").get() ? node : this._leaveUserAgentShadowDOM(node);
        if (!showLayoutEditor)
            node.highlightForTwoSeconds();

        this.selectDOMNode(node, true);
        delete this._omitDefaultSelection;

        if (!this._notFirstInspectElement)
            InspectorFrontendHost.inspectElementCompleted();
        this._notFirstInspectElement = true;
    },

    _sidebarContextMenuEventFired: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendApplicableItems(/** @type {!Object} */ (event.deepElementFromPoint()));
        contextMenu.show();
    },

    _showUAShadowDOMChanged: function()
    {
        for (var i = 0; i < this._treeOutlines.length; ++i)
            this._treeOutlines[i].update();
    },

    _updateSidebarPosition: function()
    {
        var horizontally;
        var position = WebInspector.moduleSetting("sidebarPosition").get();
        if (position === "right")
            horizontally = false;
        else if (position === "bottom")
            horizontally = true;
        else
            horizontally = WebInspector.inspectorView.element.offsetWidth < 680;

        if (this.sidebarPaneView && horizontally === !this._splitWidget.isVertical())
            return;

        if (this.sidebarPaneView && this.sidebarPaneView.tabbedPane().shouldHideOnDetach())
            return; // We can't reparent extension iframes.

        var extensionSidebarPanes = WebInspector.extensionServer.sidebarPanes();
        if (this.sidebarPaneView) {
            this.sidebarPaneView.tabbedPane().detach();
            this._splitWidget.uninstallResizer(this.sidebarPaneView.tabbedPane().headerElement());
        }

        this._splitWidget.setVertical(!horizontally);
        this.showToolbarPane(null);

        var matchedStylesContainer = new WebInspector.VBox();
        matchedStylesContainer.element.appendChild(this._stylesSidebarToolbar);
        var matchedStylePanesWrapper = new WebInspector.VBox();
        matchedStylePanesWrapper.element.classList.add("style-panes-wrapper");
        matchedStylePanesWrapper.show(matchedStylesContainer.element);
        this._stylesWidget.show(matchedStylePanesWrapper.element);

        var computedStylePanesWrapper = new WebInspector.VBox();
        computedStylePanesWrapper.element.classList.add("style-panes-wrapper");
        this._computedStyleWidget.show(computedStylePanesWrapper.element);

        /**
         * @param {boolean} inComputedStyle
         * @this {WebInspector.ElementsPanel}
         */
        function showMetrics(inComputedStyle)
        {
            if (inComputedStyle)
                this._metricsWidget.show(computedStylePanesWrapper.element, this._computedStyleWidget.element);
            else
                this._metricsWidget.show(matchedStylePanesWrapper.element);
        }

        /**
         * @param {!WebInspector.Event} event
         * @this {WebInspector.ElementsPanel}
         */
        function tabSelected(event)
        {
            var tabId = /** @type {string} */ (event.data.tabId);
            if (tabId === WebInspector.UIString("Computed"))
                showMetrics.call(this, true);
            else if (tabId === WebInspector.UIString("Styles"))
                showMetrics.call(this, false);
        }

        this.sidebarPaneView = WebInspector.viewManager.createTabbedLocation(() => WebInspector.inspectorView.setCurrentPanel(this));
        var tabbedPane = this.sidebarPaneView.tabbedPane();
        tabbedPane.element.addEventListener("contextmenu", this._sidebarContextMenuEventFired.bind(this), false);
        if (this._popoverHelper)
            this._popoverHelper.hidePopover();
        this._popoverHelper = new WebInspector.PopoverHelper(tabbedPane.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
        this._popoverHelper.setTimeout(0);

        if (horizontally) {
            // Styles and computed are merged into a single tab.
            this._splitWidget.installResizer(tabbedPane.headerElement());

            var stylesView = new WebInspector.SimpleView(WebInspector.UIString("Styles"));
            stylesView.element.classList.add("flex-auto");

            var splitWidget = new WebInspector.SplitWidget(true, true, "stylesPaneSplitViewState", 215);
            splitWidget.show(stylesView.element);

            splitWidget.setMainWidget(matchedStylesContainer);
            splitWidget.setSidebarWidget(computedStylePanesWrapper);

            this.sidebarPaneView.appendView(stylesView);
            this._stylesViewToReveal = stylesView;
        } else {
            // Styles and computed are in separate tabs.
            var stylesView = new WebInspector.SimpleView(WebInspector.UIString("Styles"));
            stylesView.element.classList.add("flex-auto", "metrics-and-styles");
            matchedStylesContainer.show(stylesView.element);

            var computedView = new WebInspector.SimpleView(WebInspector.UIString("Computed"));
            computedView.element.classList.add("composite", "fill", "metrics-and-computed");
            computedStylePanesWrapper.show(computedView.element);

            tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabSelected, tabSelected, this);
            this.sidebarPaneView.appendView(stylesView);
            this.sidebarPaneView.appendView(computedView);
            this._stylesViewToReveal = stylesView;
        }

        showMetrics.call(this, horizontally);

        this.sidebarPaneView.appendApplicableItems("elements-sidebar");
        for (var i = 0; i < extensionSidebarPanes.length; ++i)
            this._addExtensionSidebarPane(extensionSidebarPanes[i]);

        this._splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _extensionSidebarPaneAdded: function(event)
    {
        var pane = /** @type {!WebInspector.ExtensionSidebarPane} */ (event.data);
        this._addExtensionSidebarPane(pane);
    },

    /**
     * @param {!WebInspector.ExtensionSidebarPane} pane
     */
    _addExtensionSidebarPane: function(pane)
    {
        if (pane.panelName() === this.name)
            this.sidebarPaneView.appendView(pane);
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ContextMenu.Provider}
 */
WebInspector.ElementsPanel.ContextMenuProvider = function()
{
}

WebInspector.ElementsPanel.ContextMenuProvider.prototype = {
    /**
     * @override
     * @param {!Event} event
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} object
     */
    appendApplicableItems: function(event, contextMenu, object)
    {
        if (!(object instanceof WebInspector.RemoteObject && (/** @type {!WebInspector.RemoteObject} */ (object)).isNode())
            && !(object instanceof WebInspector.DOMNode)
            && !(object instanceof WebInspector.DeferredDOMNode)) {
            return;
        }

        // Add debbuging-related actions
        if (object instanceof WebInspector.DOMNode) {
            contextMenu.appendSeparator();
            WebInspector.domBreakpointsSidebarPane.populateNodeContextMenu(object, contextMenu, true);
        }

        // Skip adding "Reveal..." menu item for our own tree outline.
        if (WebInspector.ElementsPanel.instance().element.isAncestor(/** @type {!Node} */ (event.target)))
            return;
        var commandCallback = WebInspector.Revealer.reveal.bind(WebInspector.Revealer, object);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Reveal in Elements ^panel"), commandCallback);
    }
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.ElementsPanel.DOMNodeRevealer = function() { }

WebInspector.ElementsPanel.DOMNodeRevealer.prototype = {
    /**
     * @override
     * @param {!Object} node
     * @return {!Promise}
     */
    reveal: function(node)
    {
        var panel = WebInspector.ElementsPanel.instance();
        panel._pendingNodeReveal = true;

        return new Promise(revealPromise);

        /**
         * @param {function(undefined)} resolve
         * @param {function(!Error)} reject
         */
        function revealPromise(resolve, reject)
        {
            if (node instanceof WebInspector.DOMNode) {
                onNodeResolved(/** @type {!WebInspector.DOMNode} */ (node));
            } else if (node instanceof WebInspector.DeferredDOMNode) {
                (/** @type {!WebInspector.DeferredDOMNode} */ (node)).resolve(onNodeResolved);
            } else if (node instanceof WebInspector.RemoteObject) {
                var domModel = WebInspector.DOMModel.fromTarget(/** @type {!WebInspector.RemoteObject} */ (node).target());
                if (domModel)
                    domModel.pushObjectAsNodeToFrontend(node, onNodeResolved);
                else
                    reject(new Error("Could not resolve a node to reveal."));
            } else {
                reject(new Error("Can't reveal a non-node."));
                panel._pendingNodeReveal = false;
            }

            /**
             * @param {?WebInspector.DOMNode} resolvedNode
             */
            function onNodeResolved(resolvedNode)
            {
                panel._pendingNodeReveal = false;

                if (resolvedNode) {
                    panel.revealAndSelectNode(resolvedNode);
                    resolve(undefined);
                    return;
                }
                reject(new Error("Could not resolve node to reveal."));
            }
        }
    }
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.ElementsPanel.CSSPropertyRevealer = function() { }

WebInspector.ElementsPanel.CSSPropertyRevealer.prototype = {
    /**
     * @override
     * @param {!Object} property
     * @return {!Promise}
     */
    reveal: function(property)
    {
        var panel = WebInspector.ElementsPanel.instance();
        return panel._revealProperty(/** @type {!WebInspector.CSSProperty} */ (property));
    }
}

WebInspector.ElementsPanel.show = function()
{
    WebInspector.inspectorView.setCurrentPanel(WebInspector.ElementsPanel.instance());
}

/**
 * @return {!WebInspector.ElementsPanel}
 */
WebInspector.ElementsPanel.instance = function()
{
    return /** @type {!WebInspector.ElementsPanel} */ (self.runtime.sharedInstance(WebInspector.ElementsPanel));
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.ElementsActionDelegate = function() { }

WebInspector.ElementsActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!node)
            return true;
        var treeOutline = WebInspector.ElementsTreeOutline.forDOMModel(node.domModel());
        if (!treeOutline)
            return true;

        switch (actionId) {
        case "elements.hide-element":
            treeOutline.toggleHideElement(node);
            return true;
        case "elements.edit-as-html":
            treeOutline.toggleEditAsHTML(node);
            return true;
        }
        return false;
    }
}

/**
 * @constructor
 * @implements {WebInspector.DOMPresentationUtils.MarkerDecorator}
 */
WebInspector.ElementsPanel.PseudoStateMarkerDecorator = function()
{
}

WebInspector.ElementsPanel.PseudoStateMarkerDecorator.prototype = {
    /**
     * @override
     * @param {!WebInspector.DOMNode} node
     * @return {?{title: string, color: string}}
     */
    decorate: function(node)
    {
        return { color: "orange", title: WebInspector.UIString("Element state: %s", ":" + WebInspector.CSSModel.fromNode(node).pseudoState(node).join(", :")) };
    }
}
