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
 * @extends {TreeOutline}
 * @param {!WebInspector.Target} target
 * @param {boolean=} omitRootDOMNode
 * @param {boolean=} selectEnabled
 * @param {function(!WebInspector.DOMNode, string, boolean)=} setPseudoClassCallback
 */
WebInspector.ElementsTreeOutline = function(target, omitRootDOMNode, selectEnabled, setPseudoClassCallback)
{
    this._target = target;
    this._domModel = target.domModel;
    var element = createElement("div");

    this._shadowRoot = element.createShadowRoot();
    this._shadowRoot.appendChild(WebInspector.View.createStyleElement("elements/elementsTreeOutline.css"));
    var outlineDisclosureElement = this._shadowRoot.createChild("div", "elements-disclosure");
    WebInspector.installComponentRootStyles(outlineDisclosureElement);

    TreeOutline.call(this);
    this._element = this.element;
    this._element.classList.add("elements-tree-outline", "source-code");
    this._element.addEventListener("mousedown", this._onmousedown.bind(this), false);
    this._element.addEventListener("mousemove", this._onmousemove.bind(this), false);
    this._element.addEventListener("mouseleave", this._onmouseleave.bind(this), false);
    this._element.addEventListener("dragstart", this._ondragstart.bind(this), false);
    this._element.addEventListener("dragover", this._ondragover.bind(this), false);
    this._element.addEventListener("dragleave", this._ondragleave.bind(this), false);
    this._element.addEventListener("drop", this._ondrop.bind(this), false);
    this._element.addEventListener("dragend", this._ondragend.bind(this), false);
    this._element.addEventListener("keydown", this._onkeydown.bind(this), false);
    this._element.addEventListener("webkitAnimationEnd", this._onAnimationEnd.bind(this), false);
    this._element.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), false);

    outlineDisclosureElement.appendChild(this._element);
    this.element = element;

    this._includeRootDOMNode = !omitRootDOMNode;
    this._selectEnabled = selectEnabled;
    /** @type {?WebInspector.DOMNode} */
    this._rootDOMNode = null;
    /** @type {?WebInspector.DOMNode} */
    this._selectedDOMNode = null;

    this._visible = false;
    this._pickNodeMode = false;

    this.setPseudoClassCallback = setPseudoClassCallback;
    this._createNodeDecorators();

    this._popoverHelper = new WebInspector.PopoverHelper(this._element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
    this._popoverHelper.setTimeout(0);

    /** @type {!WeakMap<!WebInspector.DOMNode, !WebInspector.ElementsTreeOutline.ShadowHostDisplayMode>} */
    this._shadowHostDisplayModes = new WeakMap();

    /** @type {!Set<!WebInspector.DOMNode>} */
    this._recentlyModifiedNodes = new Set();
    /** @type {!Set<!WebInspector.DOMNode>} */
    this._recentlyModifiedParentNodes = new Set();
    /** @type {!Map<!WebInspector.DOMNode, !WebInspector.ElementsTreeOutline.UpdateInfo>} */
    this._updateInfos = new Map();
    /** @type {!Set<!WebInspector.ElementsTreeElement>} */
    this._treeElementsBeingUpdated = new Set();
}

/** @typedef {{node: !WebInspector.DOMNode, isCut: boolean}} */
WebInspector.ElementsTreeOutline.ClipboardData;

/**
 * @enum {string}
 */
WebInspector.ElementsTreeOutline.Events = {
    NodePicked: "NodePicked",
    SelectedNodeChanged: "SelectedNodeChanged",
    ElementsTreeUpdated: "ElementsTreeUpdated"
}

/**
 * @const
 * @type {!Object.<string, string>}
 */
WebInspector.ElementsTreeOutline.MappedCharToEntity = {
    "\u00a0": "nbsp",
    "\u0093": "#147", // <control>
    "\u00ad": "shy",
    "\u2002": "ensp",
    "\u2003": "emsp",
    "\u2009": "thinsp",
    "\u200a": "#8202", // Hairspace
    "\u200b": "#8203", // ZWSP
    "\u200c": "zwnj",
    "\u200d": "zwj",
    "\u200e": "lrm",
    "\u200f": "rlm",
    "\u202a": "#8234", // LRE
    "\u202b": "#8235", // RLE
    "\u202c": "#8236", // PDF
    "\u202d": "#8237", // LRO
    "\u202e": "#8238" // RLO
}

/**
 * @enum {string}
 */
WebInspector.ElementsTreeOutline.ShadowHostDisplayMode = {
    Composed: "Composed",
    Flattened: "Flattened",
}

WebInspector.ElementsTreeOutline.prototype = {
    focus: function()
    {
        this._element.focus();
    },

    /**
     * @param {boolean} wrap
     */
    setWordWrap: function(wrap)
    {
        this._element.classList.toggle("elements-tree-nowrap", !wrap);
    },

    /**
     * @param {!Event} event
     */
    _onAnimationEnd: function(event)
    {
        event.target.classList.remove("elements-tree-element-pick-node-1");
        event.target.classList.remove("elements-tree-element-pick-node-2");
    },

    /**
     * @return {boolean}
     */
    pickNodeMode: function()
    {
        return this._pickNodeMode;
    },

    /**
     * @param {boolean} value
     */
    setPickNodeMode: function(value)
    {
        this._pickNodeMode = value;
        this._element.classList.toggle("pick-node-mode", value);
    },

    /**
     * @param {!Element} element
     * @param {?WebInspector.DOMNode} node
     * @return {boolean}
     */
    handlePickNode: function(element, node)
    {
        if (!this._pickNodeMode)
            return false;

        this.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.NodePicked, node);
        var hasRunningAnimation = element.classList.contains("elements-tree-element-pick-node-1") || element.classList.contains("elements-tree-element-pick-node-2");
        element.classList.toggle("elements-tree-element-pick-node-1");
        if (hasRunningAnimation)
            element.classList.toggle("elements-tree-element-pick-node-2");
        return true;
    },

    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    /**
     * @return {!WebInspector.DOMModel}
     */
    domModel: function()
    {
        return this._domModel;
    },

    /**
     * @param {?WebInspector.InplaceEditor.Controller} multilineEditing
     */
    setMultilineEditing: function(multilineEditing)
    {
        this._multilineEditing = multilineEditing;
    },

    /**
     * @return {number}
     */
    visibleWidth: function()
    {
        return this._visibleWidth;
    },

    /**
     * @param {number} width
     */
    setVisibleWidth: function(width)
    {
        this._visibleWidth = width;
        if (this._multilineEditing)
            this._multilineEditing.setWidth(this._visibleWidth);
    },

    /**
     * @return {!Array<!WebInspector.ElementsTreeOutline.ElementDecorator>}
     */
    nodeDecorators: function()
    {
        return this._nodeDecorators;
    },

    _createNodeDecorators: function()
    {
        this._nodeDecorators = [];
        this._nodeDecorators.push(new WebInspector.ElementsTreeOutline.PseudoStateDecorator());
    },

    /**
     * @param {?WebInspector.ElementsTreeOutline.ClipboardData} data
     */
    _setClipboardData: function(data)
    {
        if (this._clipboardNodeData) {
            var treeElement = this.findTreeElement(this._clipboardNodeData.node);
            if (treeElement)
                treeElement.setInClipboard(false);
            delete this._clipboardNodeData;
        }

        if (data) {
            var treeElement = this.findTreeElement(data.node);
            if (treeElement)
                treeElement.setInClipboard(true);
            this._clipboardNodeData = data;
        }
    },

    /**
     * @param {!WebInspector.DOMNode} removedNode
     */
    resetClipboardIfNeeded: function(removedNode)
    {
        if (this._clipboardNodeData && this._clipboardNodeData.node === removedNode)
            this._setClipboardData(null);
    },

    /**
     * @param {boolean} isCut
     * @param {!Event} event
     */
    handleCopyOrCutKeyboardEvent: function(isCut, event)
    {
        this._setClipboardData(null);

        // Don't prevent the normal copy if the user has a selection.
        if (!event.target.isComponentSelectionCollapsed())
            return;

        // Do not interfere with text editing.
        if (WebInspector.isEditing())
            return;

        var targetNode = this.selectedDOMNode();
        if (!targetNode)
            return;

        event.clipboardData.clearData();
        event.preventDefault();

        this.performCopyOrCut(isCut, targetNode);
    },

    /**
     * @param {boolean} isCut
     * @param {?WebInspector.DOMNode} node
     */
    performCopyOrCut: function(isCut, node)
    {
        if (isCut && (node.isShadowRoot() || node.ancestorClosedShadowRoot()))
            return;

        node.copyNode();
        this._setClipboardData({ node: node, isCut: isCut });
    },

    /**
     * @param {!WebInspector.DOMNode} targetNode
     * @return {boolean}
     */
    canPaste: function(targetNode)
    {
        if (targetNode.isShadowRoot() || targetNode.ancestorClosedShadowRoot())
            return false;

        if (!this._clipboardNodeData)
            return false;

        var node = this._clipboardNodeData.node;
        if (this._clipboardNodeData.isCut && (node === targetNode || node.isAncestor(targetNode)))
            return false;

        if (targetNode.target() !== node.target())
            return false;
        return true;
    },

    /**
     * @param {!WebInspector.DOMNode} targetNode
     */
    pasteNode: function(targetNode)
    {
        if (this.canPaste(targetNode))
            this._performPaste(targetNode);
    },

    /**
     * @param {!Event} event
     */
    handlePasteKeyboardEvent: function(event)
    {
        // Do not interfere with text editing.
        if (WebInspector.isEditing())
            return;

        var targetNode = this.selectedDOMNode();
        if (!targetNode || !this.canPaste(targetNode))
            return;

        event.preventDefault();
        this._performPaste(targetNode);
    },

    /**
     * @param {!WebInspector.DOMNode} targetNode
     */
    _performPaste: function(targetNode)
    {
        if (this._clipboardNodeData.isCut) {
            this._clipboardNodeData.node.moveTo(targetNode, null, expandCallback.bind(this));
            this._setClipboardData(null);
        } else {
            this._clipboardNodeData.node.copyTo(targetNode, null, expandCallback.bind(this));
        }

        /**
         * @param {?Protocol.Error} error
         * @param {!DOMAgent.NodeId} nodeId
         * @this {WebInspector.ElementsTreeOutline}
         */
        function expandCallback(error, nodeId)
        {
            if (error)
                return;
            var pastedNode = this._domModel.nodeForId(nodeId);
            if (!pastedNode)
                return;
            this.selectDOMNode(pastedNode);
        }
    },

    /**
     * @param {boolean} visible
     */
    setVisible: function(visible)
    {
        this._visible = visible;
        if (!this._visible) {
            this._popoverHelper.hidePopover();
            return;
        }

        this.runPendingUpdates();
        if (this._selectedDOMNode)
            this._revealAndSelectNode(this._selectedDOMNode, false);
    },

    get rootDOMNode()
    {
        return this._rootDOMNode;
    },

    set rootDOMNode(x)
    {
        if (this._rootDOMNode === x)
            return;

        this._rootDOMNode = x;

        this._isXMLMimeType = x && x.isXMLNode();

        this.update();
    },

    get isXMLMimeType()
    {
        return this._isXMLMimeType;
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    selectedDOMNode: function()
    {
        return this._selectedDOMNode;
    },

    /**
     * @param {?WebInspector.DOMNode} node
     * @param {boolean=} focus
     */
    selectDOMNode: function(node, focus)
    {
        if (this._selectedDOMNode === node) {
            this._revealAndSelectNode(node, !focus);
            return;
        }

        this._selectedDOMNode = node;
        this._revealAndSelectNode(node, !focus);

        // The _revealAndSelectNode() method might find a different element if there is inlined text,
        // and the select() call would change the selectedDOMNode and reenter this setter. So to
        // avoid calling _selectedNodeChanged() twice, first check if _selectedDOMNode is the same
        // node as the one passed in.
        if (this._selectedDOMNode === node)
            this._selectedNodeChanged();
    },

    /**
     * @return {boolean}
     */
    editing: function()
    {
        var node = this.selectedDOMNode();
        if (!node)
            return false;
        var treeElement = this.findTreeElement(node);
        if (!treeElement)
            return false;
        return treeElement.isEditing() || false;
    },

    update: function()
    {
        var selectedTreeElement = this.selectedTreeElement;
        var selectedNode = selectedTreeElement ? selectedTreeElement.node() : null;

        this.removeChildren();

        if (!this.rootDOMNode)
            return;

        var treeElement;
        if (this._includeRootDOMNode) {
            treeElement = this._createElementTreeElement(this.rootDOMNode);
            this.appendChild(treeElement);
        } else {
            // FIXME: this could use findTreeElement to reuse a tree element if it already exists
            var node = this.rootDOMNode.firstChild;
            while (node) {
                treeElement = this._createElementTreeElement(node);
                this.appendChild(treeElement);
                node = node.nextSibling;
            }
        }

        if (selectedNode)
            this._revealAndSelectNode(selectedNode, true);
    },

    updateSelection: function()
    {
        if (!this.selectedTreeElement)
            return;
        var element = this.selectedTreeElement;
        element.updateSelection();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    updateOpenCloseTags: function(node)
    {
        var treeElement = this.findTreeElement(node);
        if (treeElement)
            treeElement.updateTitle();
        var closingTagElement = treeElement.lastChild();
        if (closingTagElement && closingTagElement.isClosingTag())
            closingTagElement.updateTitle();
    },

    _selectedNodeChanged: function()
    {
        this.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedDOMNode);
    },

    /**
     * @param {!Array.<!WebInspector.DOMNode>} nodes
     */
    _fireElementsTreeUpdated: function(nodes)
    {
        this.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.ElementsTreeUpdated, nodes);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?WebInspector.ElementsTreeElement}
     */
    findTreeElement: function(node)
    {
        var treeElement = this._lookUpTreeElement(node);
        if (!treeElement && node.nodeType() === Node.TEXT_NODE) {
            // The text node might have been inlined if it was short, so try to find the parent element.
            treeElement = this._lookUpTreeElement(node.parentNode);
        }

        return /** @type {?WebInspector.ElementsTreeElement} */ (treeElement);
    },

    /**
     * @param {?WebInspector.DOMNode} node
     * @return {?TreeElement}
     */
    _lookUpTreeElement: function(node)
    {
        if (!node)
            return null;

        var cachedElement = node[WebInspector.ElementsTreeElement.symbol];
        if (cachedElement)
            return cachedElement;

        // Walk up the parent pointers from the desired node
        var ancestors = [];
        for (var currentNode = node.parentNode; currentNode; currentNode = currentNode.parentNode) {
            ancestors.push(currentNode);
            if (currentNode[WebInspector.ElementsTreeElement.symbol])  // stop climbing as soon as we hit
                break;
        }

        if (!currentNode)
            return null;

        // Walk down to populate each ancestor's children, to fill in the tree and the cache.
        for (var i = ancestors.length - 1; i >= 0; --i) {
            var treeElement = ancestors[i][WebInspector.ElementsTreeElement.symbol];
            if (treeElement)
                treeElement.onpopulate();  // fill the cache with the children of treeElement
        }

        return node[WebInspector.ElementsTreeElement.symbol];
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?WebInspector.ElementsTreeElement}
     */
    createTreeElementFor: function(node)
    {
        var treeElement = this.findTreeElement(node);
        if (treeElement)
            return treeElement;
        if (!node.parentNode)
            return null;

        treeElement = this.createTreeElementFor(node.parentNode);
        return treeElement ? this._showChild(treeElement, node) : null;
    },

    set suppressRevealAndSelect(x)
    {
        if (this._suppressRevealAndSelect === x)
            return;
        this._suppressRevealAndSelect = x;
    },

    /**
     * @param {?WebInspector.DOMNode} node
     * @param {boolean} omitFocus
     */
    _revealAndSelectNode: function(node, omitFocus)
    {
        if (this._suppressRevealAndSelect)
            return;

        if (!this._includeRootDOMNode && node === this.rootDOMNode && this.rootDOMNode)
            node = this.rootDOMNode.firstChild;
        if (!node)
            return;
        var treeElement = this.createTreeElementFor(node);
        if (!treeElement)
            return;

        treeElement.revealAndSelect(omitFocus);
    },

    /**
     * @return {?TreeElement}
     */
    _treeElementFromEvent: function(event)
    {
        var scrollContainer = this.element.parentElement;

        // We choose this X coordinate based on the knowledge that our list
        // items extend at least to the right edge of the outer <ol> container.
        // In the no-word-wrap mode the outer <ol> may be wider than the tree container
        // (and partially hidden), in which case we are left to use only its right boundary.
        var x = scrollContainer.totalOffsetLeft() + scrollContainer.offsetWidth - 36;

        var y = event.pageY;

        // Our list items have 1-pixel cracks between them vertically. We avoid
        // the cracks by checking slightly above and slightly below the mouse
        // and seeing if we hit the same element each time.
        var elementUnderMouse = this.treeElementFromPoint(x, y);
        var elementAboveMouse = this.treeElementFromPoint(x, y - 2);
        var element;
        if (elementUnderMouse === elementAboveMouse)
            element = elementUnderMouse;
        else
            element = this.treeElementFromPoint(x, y + 2);

        return element;
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
     * @param {!WebInspector.DOMNode} node
     * @param {function()} callback
     */
    _loadDimensionsForNode: function(node, callback)
    {
        if (!node.nodeName() || node.nodeName().toLowerCase() !== "img") {
            callback();
            return;
        }

        node.resolveToObject("", resolvedNode);

        function resolvedNode(object)
        {
            if (!object) {
                callback();
                return;
            }

            object.callFunctionJSON(features, undefined, callback);
            object.release();

            /**
             * @return {!{offsetWidth: number, offsetHeight: number, naturalWidth: number, naturalHeight: number, currentSrc: (string|undefined)}}
             * @suppressReceiverCheck
             * @this {!Element}
             */
            function features()
            {
                return { offsetWidth: this.offsetWidth, offsetHeight: this.offsetHeight, naturalWidth: this.naturalWidth, naturalHeight: this.naturalHeight, currentSrc: this.currentSrc };
            }
        }
    },

    /**
     * @param {!Element} anchor
     * @param {!WebInspector.Popover} popover
     */
    _showPopover: function(anchor, popover)
    {
        var listItem = anchor.enclosingNodeOrSelfWithNodeName("li");
        var node = /** @type {!WebInspector.ElementsTreeElement} */ (listItem.treeElement).node();
        this._loadDimensionsForNode(node, WebInspector.DOMPresentationUtils.buildImagePreviewContents.bind(WebInspector.DOMPresentationUtils, node.target(), anchor.href, true, showPopover));

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

    _onmousedown: function(event)
    {
        var element = this._treeElementFromEvent(event);

        if (!element || element.isEventWithinDisclosureTriangle(event))
            return;

        element.select();
    },

    _onmousemove: function(event)
    {
        var element = this._treeElementFromEvent(event);
        if (element && this._previousHoveredElement === element)
            return;

        if (this._previousHoveredElement) {
            this._previousHoveredElement.hovered = false;
            delete this._previousHoveredElement;
        }

        if (element) {
            element.hovered = true;
            this._previousHoveredElement = element;
        }

        if (!(element instanceof WebInspector.ElementsTreeElement))
            return;

        if (element && element.node())
            this._domModel.highlightDOMNodeWithConfig(element.node().id, { mode: "all", showInfo: !WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) });
        else
            this._domModel.hideDOMNodeHighlight();
    },

    _onmouseleave: function(event)
    {
        if (this._previousHoveredElement) {
            this._previousHoveredElement.hovered = false;
            delete this._previousHoveredElement;
        }

        this._domModel.hideDOMNodeHighlight();
    },

    _ondragstart: function(event)
    {
        if (!event.target.isComponentSelectionCollapsed())
            return false;
        if (event.target.nodeName === "A")
            return false;

        var treeElement = this._treeElementFromEvent(event);
        if (!this._isValidDragSourceOrTarget(treeElement))
            return false;

        if (treeElement.node().nodeName() === "BODY" || treeElement.node().nodeName() === "HEAD")
            return false;

        event.dataTransfer.setData("text/plain", treeElement.listItemElement.textContent.replace(/\u200b/g, ""));
        event.dataTransfer.effectAllowed = "copyMove";
        this._treeElementBeingDragged = treeElement;

        this._domModel.hideDOMNodeHighlight();

        return true;
    },

    _ondragover: function(event)
    {
        if (!this._treeElementBeingDragged)
            return false;

        var treeElement = this._treeElementFromEvent(event);
        if (!this._isValidDragSourceOrTarget(treeElement))
            return false;

        var node = treeElement.node();
        while (node) {
            if (node === this._treeElementBeingDragged._node)
                return false;
            node = node.parentNode;
        }

        treeElement.updateSelection();
        treeElement.listItemElement.classList.add("elements-drag-over");
        this._dragOverTreeElement = treeElement;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        return false;
    },

    _ondragleave: function(event)
    {
        this._clearDragOverTreeElementMarker();
        event.preventDefault();
        return false;
    },

    /**
     * @param {?TreeElement} treeElement
     * @return {boolean}
     */
    _isValidDragSourceOrTarget: function(treeElement)
    {
        if (!treeElement)
            return false;

        if (!(treeElement instanceof WebInspector.ElementsTreeElement))
            return false;
        var elementsTreeElement = /** @type {!WebInspector.ElementsTreeElement} */ (treeElement);

        var node = elementsTreeElement.node();
        if (!node.parentNode || node.parentNode.nodeType() !== Node.ELEMENT_NODE)
            return false;

        return true;
    },

    _ondrop: function(event)
    {
        event.preventDefault();
        var treeElement = this._treeElementFromEvent(event);
        if (treeElement)
            this._doMove(treeElement);
    },

    /**
     * @param {!TreeElement} treeElement
     */
    _doMove: function(treeElement)
    {
        if (!this._treeElementBeingDragged)
            return;

        var parentNode;
        var anchorNode;

        if (treeElement.isClosingTag()) {
            // Drop onto closing tag -> insert as last child.
            parentNode = treeElement.node();
        } else {
            var dragTargetNode = treeElement.node();
            parentNode = dragTargetNode.parentNode;
            anchorNode = dragTargetNode;
        }

        var wasExpanded = this._treeElementBeingDragged.expanded;
        this._treeElementBeingDragged._node.moveTo(parentNode, anchorNode, this.selectNodeAfterEdit.bind(this, wasExpanded));

        delete this._treeElementBeingDragged;
    },

    _ondragend: function(event)
    {
        event.preventDefault();
        this._clearDragOverTreeElementMarker();
        delete this._treeElementBeingDragged;
    },

    _clearDragOverTreeElementMarker: function()
    {
        if (this._dragOverTreeElement) {
            this._dragOverTreeElement.updateSelection();
            this._dragOverTreeElement.listItemElement.classList.remove("elements-drag-over");
            delete this._dragOverTreeElement;
        }
    },

    /**
     * @param {!Event} event
     */
    _onkeydown: function(event)
    {
        var keyboardEvent = /** @type {!KeyboardEvent} */ (event);
        var node = /** @type {!WebInspector.DOMNode} */ (this.selectedDOMNode());
        console.assert(node);
        var treeElement = node[WebInspector.ElementsTreeElement.symbol];
        if (!treeElement)
            return;

        if (!treeElement.isEditing() && WebInspector.KeyboardShortcut.hasNoModifiers(keyboardEvent) && keyboardEvent.keyCode === WebInspector.KeyboardShortcut.Keys.H.code) {
            this._toggleHideShortcut(node);
            event.consume(true);
            return;
        }
    },

    _contextMenuEventFired: function(event)
    {
        var treeElement = this._treeElementFromEvent(event);
        if (!treeElement || WebInspector.isEditing())
            return;

        var contextMenu = new WebInspector.ContextMenu(event);
        var isPseudoElement = !!treeElement.node().pseudoType();
        var isTag = treeElement.node().nodeType() === Node.ELEMENT_NODE && !isPseudoElement;
        var textNode = event.target.enclosingNodeOrSelfWithClass("webkit-html-text-node");
        if (textNode && textNode.classList.contains("bogus"))
            textNode = null;
        var commentNode = event.target.enclosingNodeOrSelfWithClass("webkit-html-comment");
        contextMenu.appendApplicableItems(event.target);
        if (textNode) {
            contextMenu.appendSeparator();
            treeElement.populateTextContextMenu(contextMenu, textNode);
        } else if (isTag) {
            contextMenu.appendSeparator();
            treeElement.populateTagContextMenu(contextMenu, event);
        } else if (commentNode) {
            contextMenu.appendSeparator();
            treeElement.populateNodeContextMenu(contextMenu);
        } else if (isPseudoElement) {
            treeElement.populateScrollIntoView(contextMenu);
        }

        contextMenu.appendApplicableItems(treeElement.node());
        contextMenu.show();
    },

    runPendingUpdates: function()
    {
        this._updateModifiedNodes();
    },

    handleShortcut: function(event)
    {
        var node = this.selectedDOMNode();
        if (!node)
            return;
        var treeElement = node[WebInspector.ElementsTreeElement.symbol];
        if (!treeElement)
            return;

        if (event.keyIdentifier === "F2" && treeElement.hasEditableNode()) {
            this._toggleEditAsHTML(node);
            event.handled = true;
            return;
        }

        if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && node.parentNode) {
            if (event.keyIdentifier === "Up" && node.previousSibling) {
                node.moveTo(node.parentNode, node.previousSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
                event.handled = true;
                return;
            }
            if (event.keyIdentifier === "Down" && node.nextSibling) {
                node.moveTo(node.parentNode, node.nextSibling.nextSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
                event.handled = true;
                return;
            }
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    _toggleEditAsHTML: function(node)
    {
        var treeElement = node[WebInspector.ElementsTreeElement.symbol];
        if (!treeElement)
            return;

        if (node.pseudoType())
            return;

        var parentNode = node.parentNode;
        var index = node.index;
        var wasExpanded = treeElement.expanded;

        treeElement.toggleEditAsHTML(editingFinished.bind(this));

        /**
         * @this {WebInspector.ElementsTreeOutline}
         * @param {boolean} success
         */
        function editingFinished(success)
        {
            if (!success)
                return;

            // Select it and expand if necessary. We force tree update so that it processes dom events and is up to date.
            this.runPendingUpdates();

            var newNode = parentNode ? parentNode.children()[index] || parentNode : null;
            if (!newNode)
                return;

            this.selectDOMNode(newNode, true);

            if (wasExpanded) {
                var newTreeItem = this.findTreeElement(newNode);
                if (newTreeItem)
                    newTreeItem.expand();
            }
        }
    },

    /**
     * @param {boolean} wasExpanded
     * @param {?Protocol.Error} error
     * @param {!DOMAgent.NodeId=} nodeId
     * @return {?WebInspector.ElementsTreeElement} nodeId
     */
    selectNodeAfterEdit: function(wasExpanded, error, nodeId)
    {
        if (error)
            return null;

        // Select it and expand if necessary. We force tree update so that it processes dom events and is up to date.
        this.runPendingUpdates();

        var newNode = nodeId ? this._domModel.nodeForId(nodeId) : null;
        if (!newNode)
            return null;

        this.selectDOMNode(newNode, true);

        var newTreeItem = this.findTreeElement(newNode);
        if (wasExpanded) {
            if (newTreeItem)
                newTreeItem.expand();
        }
        return newTreeItem;
    },

    /**
     * Runs a script on the node's remote object that toggles a class name on
     * the node and injects a stylesheet into the head of the node's document
     * containing a rule to set "visibility: hidden" on the class and all it's
     * ancestors.
     *
     * @param {!WebInspector.DOMNode} node
     * @param {function(?WebInspector.RemoteObject, boolean=)=} userCallback
     */
    _toggleHideShortcut: function(node, userCallback)
    {
        var pseudoType = node.pseudoType();
        var effectiveNode = pseudoType ? node.parentNode : node;
        if (!effectiveNode)
            return;

        function resolvedNode(object)
        {
            if (!object)
                return;

            /**
             * @param {?string} pseudoType
             * @suppressGlobalPropertiesCheck
             * @suppressReceiverCheck
             * @this {!Element}
             */
            function toggleClassAndInjectStyleRule(pseudoType)
            {
                const classNamePrefix = "__web-inspector-hide";
                const classNameSuffix = "-shortcut__";
                const styleTagId = "__web-inspector-hide-shortcut-style__";
                var selectors = [];
                selectors.push("html /deep/ .__web-inspector-hide-shortcut__");
                selectors.push("html /deep/ .__web-inspector-hide-shortcut__ /deep/ *");
                selectors.push("html /deep/ .__web-inspector-hidebefore-shortcut__::before");
                selectors.push("html /deep/ .__web-inspector-hideafter-shortcut__::after");
                var selector = selectors.join(", ");
                var ruleBody = "    visibility: hidden !important;";
                var rule = "\n" + selector + "\n{\n" + ruleBody + "\n}\n";

                var className = classNamePrefix + (pseudoType || "") + classNameSuffix;
                this.classList.toggle(className);

                var style = document.head.querySelector("style#" + styleTagId);
                if (style)
                    return;

                style = document.createElement("style");
                style.id = styleTagId;
                style.type = "text/css";
                style.textContent = rule;
                document.head.appendChild(style);
            }

            object.callFunction(toggleClassAndInjectStyleRule, [{ value: pseudoType }], userCallback);
            object.release();
        }

        effectiveNode.resolveToObject("", resolvedNode);
    },

    _reset: function()
    {
        this.rootDOMNode = null;
        this.selectDOMNode(null, false);
        this._popoverHelper.hidePopover();
        delete this._clipboardNodeData;

        this._domModel.hideDOMNodeHighlight();
        this._recentlyModifiedNodes.clear();
        this._recentlyModifiedParentNodes.clear();
        this._updateInfos.clear();
    },

    wireToDOMModel: function()
    {
        this._domModel.addEventListener(WebInspector.DOMModel.Events.NodeInserted, this._nodeInserted, this);
        this._domModel.addEventListener(WebInspector.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
        this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified, this._attributeModified, this);
        this._domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved, this._attributeRemoved, this);
        this._domModel.addEventListener(WebInspector.DOMModel.Events.CharacterDataModified, this._characterDataModified, this);
        this._domModel.addEventListener(WebInspector.DOMModel.Events.DocumentUpdated, this._documentUpdated, this);
        this._domModel.addEventListener(WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._childNodeCountUpdated, this);
        this._domModel.addEventListener(WebInspector.DOMModel.Events.DistributedNodesChanged, this._distributedNodesChanged, this);
    },

    unwireFromDOMModel: function()
    {
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.NodeInserted, this._nodeInserted, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified, this._attributeModified, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved, this._attributeRemoved, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.CharacterDataModified, this._characterDataModified, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.DocumentUpdated, this._documentUpdated, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._childNodeCountUpdated, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.DistributedNodesChanged, this._distributedNodesChanged, this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _distributedNodesChanged: function(event)
    {
        var shadowHost = /** @type {!WebInspector.DOMNode} */ (event.data);
        var shadowHostDisplayMode = this._shadowHostDisplayModes.get(shadowHost);
        if (!shadowHostDisplayMode)
            return;

        var insertionPoints = shadowHost.insertionPoints();
        var shadowRoots = shadowHost.shadowRoots();
        this._parentNodeModified(shadowHost);
        for (var shadowRoot of shadowRoots) {
            if (shadowHostDisplayMode === WebInspector.ElementsTreeOutline.ShadowHostDisplayMode.Composed)
                this._parentNodeModified(shadowRoot);
        }
        for (var insertionPoint of insertionPoints) {
            if (shadowHostDisplayMode === WebInspector.ElementsTreeOutline.ShadowHostDisplayMode.Flattened)
                this._parentNodeModified(insertionPoint.parentNode);
            else
                this._parentNodeModified(insertionPoint);
        }
        this._updateModifiedNodesSoon();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!WebInspector.ElementsTreeOutline.UpdateInfo}
     */
    _updateRecord: function(node)
    {
        if (!WebInspector.settings.highlightDOMUpdates.get() || this._domUpdateHighlightsMuted)
            return new WebInspector.ElementsTreeOutline.UpdateInfo(); // Bogus info.

        var record = this._updateInfos.get(node);
        if (!record) {
            record = new WebInspector.ElementsTreeOutline.UpdateInfo();
            this._updateInfos.set(node, record);
        }

        return record;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?WebInspector.ElementsTreeOutline.UpdateInfo}
     */
    _updateInfo: function(node)
    {
        if (!WebInspector.settings.highlightDOMUpdates.get())
            return null;
        return this._updateInfos.get(node) || null;
    },

    /**
     * @param {?WebInspector.DOMNode} parentNode
     * @return {!WebInspector.ElementsTreeOutline.UpdateInfo}
     */
    _parentNodeModified: function(parentNode)
    {
        if (!parentNode)
            return new WebInspector.ElementsTreeOutline.UpdateInfo(); // Bogus info.

        this._recentlyModifiedParentNodes.add(parentNode);

        var treeElement = this.findTreeElement(parentNode);
        if (treeElement) {
            var oldDisplayMode = treeElement.childrenDisplayMode();
            var newDisplayMode = this._calculateChildrenDisplayMode(treeElement);
            if (newDisplayMode !== oldDisplayMode)
                this._updateRecord(parentNode).childrenModified();
        }
        return this._updateRecord(parentNode);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!WebInspector.ElementsTreeOutline.UpdateInfo}
     */
    _nodeModified: function(node)
    {
        this._recentlyModifiedNodes.add(node);
        return this._updateRecord(node);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _documentUpdated: function(event)
    {
        var inspectedRootDocument = event.data;

        this._reset();

        if (!inspectedRootDocument)
            return;

        this.rootDOMNode = inspectedRootDocument;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _attributeModified: function(event)
    {
        var node = /** @type {!WebInspector.DOMNode} */ (event.data.node);
        this._nodeModified(node).attributeModified(event.data.name);
        this._updateModifiedNodesSoon();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _attributeRemoved: function(event)
    {
        var node = /** @type {!WebInspector.DOMNode} */ (event.data.node);
        this._nodeModified(node).attributeRemoved(event.data.name);
        this._updateModifiedNodesSoon();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _characterDataModified: function(event)
    {
        var node = /** @type {!WebInspector.DOMNode} */ (event.data);
        this._parentNodeModified(node.parentNode).charDataModified();
        this._nodeModified(node).charDataModified();
        this._updateModifiedNodesSoon();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _nodeInserted: function(event)
    {
        var node = /** @type {!WebInspector.DOMNode} */ (event.data);
        this._parentNodeModified(node.parentNode).nodeInserted(node);
        this._updateModifiedNodesSoon();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _nodeRemoved: function(event)
    {
        var node = /** @type {!WebInspector.DOMNode} */ (event.data.node);
        var parentNode = /** @type {!WebInspector.DOMNode} */ (event.data.parent);
        this.resetClipboardIfNeeded(node);
        this._parentNodeModified(parentNode).childrenModified();
        this._updateModifiedNodesSoon();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _childNodeCountUpdated: function(event)
    {
        var node = /** @type {!WebInspector.DOMNode} */ (event.data);
        this._parentNodeModified(node);
        this._updateModifiedNodesSoon();
    },

    _setUpdateInfos: function()
    {
        for (var node of this._updateInfos.keys()) {
            var treeElement = node[WebInspector.ElementsTreeElement.symbol];
            if (treeElement)
                treeElement.setUpdateInfo(this._updateInfo(node));
        }
    },

    _clearUpdateInfos: function()
    {
        for (var node of this._updateInfos.keys()) {
            var treeElement = node[WebInspector.ElementsTreeElement.symbol];
            if (treeElement)
                treeElement.setUpdateInfo(null);
        }
        this._updateInfos.clear();
    },

    _updateModifiedNodesSoon: function()
    {
        if (!this._recentlyModifiedNodes.size && !this._recentlyModifiedParentNodes.size)
            return;
        if (!this._visible) {
            this._updateInfos.clear();
            return;
        }

        if (this._updateModifiedNodesTimeout)
            return;
        this._updateModifiedNodesTimeout = setTimeout(this._updateModifiedNodes.bind(this), 50);
    },

    _updateModifiedNodes: function()
    {
        if (this._updateModifiedNodesTimeout) {
            clearTimeout(this._updateModifiedNodesTimeout);
            delete this._updateModifiedNodesTimeout;
        }

        this._setUpdateInfos();

        var updatedNodes = new Set();
        for (var node of this._recentlyModifiedNodes)
            updatedNodes.add(node);
        for (var node of this._recentlyModifiedParentNodes)
            updatedNodes.add(node);
        var hidePanelWhileUpdating = updatedNodes.length > 10;
        if (hidePanelWhileUpdating) {
            var treeOutlineContainerElement = this.element.parentNode;
            var originalScrollTop = treeOutlineContainerElement ? treeOutlineContainerElement.scrollTop : 0;
            this._element.classList.add("hidden");
        }

        if (this._rootDOMNode && this._recentlyModifiedParentNodes.has(this._rootDOMNode)) {
            // Document's children have changed, perform total update.
            this.update();
        } else {
            for (var node of this._recentlyModifiedNodes)
                this._updateModifiedNode(node);
            for (var node of this._recentlyModifiedParentNodes)
                this._updateModifiedParentNode(node);
        }

        if (hidePanelWhileUpdating) {
            this._element.classList.remove("hidden");
            if (originalScrollTop)
                treeOutlineContainerElement.scrollTop = originalScrollTop;
            this.updateSelection();
        }

        this._clearUpdateInfos();
        this._recentlyModifiedNodes.clear();
        this._recentlyModifiedParentNodes.clear();
        this._fireElementsTreeUpdated(updatedNodes.valuesArray());
    },

    _updateModifiedNode: function(node)
    {
        var treeElement = this.findTreeElement(node);
        if (treeElement)
            treeElement.updateTitle(false);
    },

    _updateModifiedParentNode: function(node)
    {
        var parentTreeElement = this.findTreeElement(node);
        if (parentTreeElement) {
            this._updateChildrenDisplayMode(parentTreeElement);
            parentTreeElement.updateTitle(false);
            if (parentTreeElement.populated)
                this.updateChildren(parentTreeElement);
        }
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     */
    populateTreeElement: function(treeElement)
    {
        if (treeElement.childCount() || !treeElement.isExpandable())
            return;

        this._updateModifiedParentNode(treeElement.node());
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {boolean=} closingTag
     * @return {!WebInspector.ElementsTreeElement}
     */
    _createElementTreeElement: function(node, closingTag)
    {
        var treeElement = new WebInspector.ElementsTreeElement(node, closingTag);
        treeElement.selectable = this._selectEnabled;

        if (!closingTag)
            treeElement.setUpdateInfo(this._updateInfo(node));
        this._updateChildrenDisplayMode(treeElement);
        return treeElement;
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     * @param {!WebInspector.DOMNode} child
     * @return {?WebInspector.ElementsTreeElement}
     */
    _showChild: function(treeElement, child)
    {
        if (treeElement.isClosingTag())
            return null;

        var index = this._visibleChildren(treeElement.node()).indexOf(child);
        if (index === -1)
            return null;

        if (index >= treeElement.expandedChildrenLimit())
            this.setExpandedChildrenLimit(treeElement, index + 1);
        return /** @type {!WebInspector.ElementsTreeElement} */ (treeElement.childAt(index));
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Array<!WebInspector.DOMNode>}
     */
    _visibleShadowRoots: function(node)
    {
        var roots = node.shadowRoots();
        if (roots.length && !WebInspector.settings.showUAShadowDOM.get()) {
            roots = roots.filter(function(root) {
                return root.shadowRootType() === WebInspector.DOMNode.ShadowRootTypes.Author;
            });
        }
        return roots;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {boolean}
     */
    _isShadowHostInComposedMode: function(node)
    {
        var shadowRoots = this._visibleShadowRoots(node);
        return this._shadowHostDisplayModes.has(node) && !!shadowRoots.length;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {boolean}
     */
    _isInsertionPointInComposedMode: function(node)
    {
        var ancestorShadowHost = node.ancestorShadowHost();
        var isInShadowTreeInComposedMode = !!ancestorShadowHost && this._shadowHostDisplayModes.has(ancestorShadowHost);
        return isInShadowTreeInComposedMode && node.isInsertionPoint();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {boolean}
     */
    _shouldFlatten: function(node)
    {
        var ancestorShadowHost = node.ancestorShadowHost();
        if (!ancestorShadowHost)
            return false;
        if (this._shadowHostDisplayModes.get(ancestorShadowHost) !== WebInspector.ElementsTreeOutline.ShadowHostDisplayMode.Flattened)
            return false;
        return node.isShadowRoot() || node.isInsertionPoint();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Array.<!WebInspector.DOMNode>} visibleChildren
     */
    _visibleChildren: function(node)
    {
        var result = [];
        var unflattenedChildren = this._unflattenedChildren(node);
        for (var child of unflattenedChildren) {
            if (this._shouldFlatten(child)) {
                var flattenedChildren = this._visibleChildren(child);
                result = result.concat(flattenedChildren);
            } else {
                result.push(child);
            }
        }

        return result;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Array.<!WebInspector.DOMNode>} visibleChildren
     */
    _unflattenedChildren: function(node)
    {
        if (this._isShadowHostInComposedMode(node))
            return this._visibleChildrenForShadowHostInComposedMode(node);

        if (this._isInsertionPointInComposedMode(node))
            return this._visibleChildrenForInsertionPointInComposedMode(node);

        var visibleChildren = this._visibleShadowRoots(node);

        if (node.importedDocument())
            visibleChildren.push(node.importedDocument());

        if (node.templateContent())
            visibleChildren.push(node.templateContent());

        var beforePseudoElement = node.beforePseudoElement();
        if (beforePseudoElement)
            visibleChildren.push(beforePseudoElement);

        if (node.childNodeCount())
            visibleChildren = visibleChildren.concat(node.children());

        var afterPseudoElement = node.afterPseudoElement();
        if (afterPseudoElement)
            visibleChildren.push(afterPseudoElement);

        return visibleChildren;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {boolean}
     */
    _hasVisibleChildren: function(node)
    {
        if (this._isShadowHostInComposedMode(node))
            return this._hasVisibleChildrenAsShadowHostInComposedMode(node);

        if (this._isInsertionPointInComposedMode(node))
            return this._hasVisibleChildrenAsInsertionPointInComposedMode(node);

        if (node.importedDocument())
            return true;
        if (node.templateContent())
            return true;
        if (node.childNodeCount())
            return true;
        if (this._visibleShadowRoots(node).length)
            return true;
        if (node.hasPseudoElements())
            return true;
        return false;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Array.<!WebInspector.DOMNode>} visibleChildren
     */
    _visibleChildrenForShadowHostInComposedMode: function(node)
    {
        var visibleChildren = [];

        var pseudoElements = node.pseudoElements();
        if (pseudoElements[WebInspector.DOMNode.PseudoElementNames.Before])
            visibleChildren.push(pseudoElements[WebInspector.DOMNode.PseudoElementNames.Before]);

        var shadowRoots = this._visibleShadowRoots(node);
        if (shadowRoots.length)
            visibleChildren.push(shadowRoots[0]);

        if (pseudoElements[WebInspector.DOMNode.PseudoElementNames.After])
            visibleChildren.push(pseudoElements[WebInspector.DOMNode.PseudoElementNames.After]);

        return visibleChildren;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {boolean}
     */
    _hasVisibleChildrenAsShadowHostInComposedMode: function(node)
    {
        if (this._visibleShadowRoots(node).length)
            return true;
        if (node.hasPseudoElements())
            return true;
        return false;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    _visibleChildrenForInsertionPointInComposedMode: function(node)
    {
        var visibleChildren = [];

        var pseudoElements = node.pseudoElements();
        if (pseudoElements[WebInspector.DOMNode.PseudoElementNames.Before])
            visibleChildren.push(pseudoElements[WebInspector.DOMNode.PseudoElementNames.Before]);

        var distributedShadowRoot = node.distributedShadowRoot();
        if (distributedShadowRoot) {
            visibleChildren.push(distributedShadowRoot)
        } else {
            var distributedNodes = node.distributedNodes();
            if (distributedNodes)
                visibleChildren = visibleChildren.concat(distributedNodes);
        }

        if (pseudoElements[WebInspector.DOMNode.PseudoElementNames.After])
            visibleChildren.push(pseudoElements[WebInspector.DOMNode.PseudoElementNames.After]);

        return visibleChildren;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {boolean}
     */
    _hasVisibleChildrenAsInsertionPointInComposedMode: function(node)
    {
        if (node.hasPseudoElements())
            return true;

        var distributedShadowRoot = node.distributedShadowRoot();
        if (distributedShadowRoot)
            return true;

        var distributedNodes = node.distributedNodes();
        if (distributedNodes && distributedNodes.length)
            return true;

        return false;
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     * @return {boolean}
     */
    _canShowInlineText: function(treeElement)
    {
        var node = treeElement.node();
        if (node.importedDocument() || node.templateContent() || this._visibleShadowRoots(node).length > 0 || node.hasPseudoElements())
            return false;
        if (node.nodeType() !== Node.ELEMENT_NODE)
            return false;
        if (!node.firstChild || node.firstChild !== node.lastChild || node.firstChild.nodeType() !== Node.TEXT_NODE)
            return false;
        var textChild = node.firstChild;
        var maxInlineTextChildLength = 80;
        if (textChild.nodeValue().length < maxInlineTextChildLength)
            return true;
        return false;
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     * @return {!WebInspector.ElementsTreeElement.ChildrenDisplayMode}
     */
    _calculateChildrenDisplayMode: function(treeElement)
    {
        var node = treeElement.node();
        var showInlineText = this._canShowInlineText(treeElement);
        var hasChildren = !treeElement.isClosingTag() && this._hasVisibleChildren(node);

        if (showInlineText)
            return WebInspector.ElementsTreeElement.ChildrenDisplayMode.InlineText;
        return hasChildren ? WebInspector.ElementsTreeElement.ChildrenDisplayMode.HasChildren : WebInspector.ElementsTreeElement.ChildrenDisplayMode.NoChildren;
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     */
    _updateChildrenDisplayMode: function(treeElement)
    {
        var childrenDisplayMode = this._calculateChildrenDisplayMode(treeElement);
        treeElement.setChildrenDisplayMode(childrenDisplayMode);
        treeElement.setExpandable(childrenDisplayMode === WebInspector.ElementsTreeElement.ChildrenDisplayMode.HasChildren);
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     */
    _createExpandAllButtonTreeElement: function(treeElement)
    {
        var button = createTextButton("", handleLoadAllChildren.bind(this));
        button.value = "";
        var expandAllButtonElement = new TreeElement(button);
        expandAllButtonElement.selectable = false;
        expandAllButtonElement.expandAllButton = true;
        expandAllButtonElement.button = button;
        return expandAllButtonElement;

        /**
         * @this {WebInspector.ElementsTreeOutline}
         * @param {!Event} event
         */
        function handleLoadAllChildren(event)
        {
            var visibleChildCount = this._visibleChildren(treeElement.node()).length;
            this.setExpandedChildrenLimit(treeElement, Math.max(visibleChildCount, treeElement.expandedChildrenLimit() + WebInspector.ElementsTreeElement.InitialChildrenLimit));
            event.consume();
        }
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     * @param {number} expandedChildrenLimit
     */
    setExpandedChildrenLimit: function(treeElement, expandedChildrenLimit)
    {
        if (treeElement.expandedChildrenLimit() === expandedChildrenLimit)
            return;

        treeElement.setExpandedChildrenLimit(expandedChildrenLimit);
        if (treeElement.treeOutline && !this._treeElementsBeingUpdated.has(treeElement))
            this._updateModifiedParentNode(treeElement.node());
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     */
    updateChildren: function(treeElement)
    {
        if (!treeElement.isExpandable()) {
            var selectedTreeElement = treeElement.treeOutline.selectedTreeElement;
            if (selectedTreeElement && selectedTreeElement.hasAncestor(treeElement))
                treeElement.select();
            treeElement.removeChildren();
            return;
        }
        console.assert(!treeElement.isClosingTag());

        var barrier = new CallbackBarrier();
        treeElement.node().getChildNodes(childNodesLoaded.bind(null, barrier.createCallback()));

        var ancestorShadowHost = treeElement.node().ancestorShadowHost();
        var shouldLoadDistributedNodes = ancestorShadowHost && this._shadowHostDisplayModes.has(ancestorShadowHost);
        if (shouldLoadDistributedNodes)
            treeElement.node().ensureShadowHostDistributedNodesLoaded(barrier.createCallback());

        barrier.callWhenDone(this._updateChildren.bind(this, treeElement));

        /**
         * @param {function()} callback
         * @param {?Array.<!WebInspector.DOMNode>} children
         */
        function childNodesLoaded(callback, children)
        {
            if (!children)
                return;
            callback();
        }
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     * @param {!WebInspector.DOMNode} child
     * @param {number} index
     * @param {boolean=} closingTag
     * @return {!WebInspector.ElementsTreeElement}
     */
    insertChildElement: function(treeElement, child, index, closingTag)
    {
        var newElement = this._createElementTreeElement(child, closingTag);
        treeElement.insertChild(newElement, index);
        return newElement;
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     * @param {!WebInspector.ElementsTreeElement} child
     * @param {number} targetIndex
     */
    _moveChild: function(treeElement, child, targetIndex)
    {
        if (treeElement.indexOfChild(child) === targetIndex)
            return;
        var wasSelected = child.selected;
        if (child.parent)
            child.parent.removeChild(child);
        treeElement.insertChild(child, targetIndex);
        if (wasSelected)
            child.select();
    },

    /**
     * @param {!WebInspector.ElementsTreeElement} treeElement
     */
    _updateChildren: function(treeElement)
    {
        if (this._treeElementsBeingUpdated.has(treeElement) || !this._visible)
            return;

        this._treeElementsBeingUpdated.add(treeElement);

        var node = treeElement.node();
        var visibleChildren = this._visibleChildren(node);
        var visibleChildrenSet = new Set(visibleChildren);

        // Remove any tree elements that no longer have this node as their parent and save
        // all existing elements that could be reused. This also removes closing tag element.
        var existingTreeElements = new Map();
        for (var i = treeElement.childCount() - 1; i >= 0; --i) {
            var existingTreeElement = treeElement.childAt(i);
            if (!(existingTreeElement instanceof WebInspector.ElementsTreeElement)) {
                // Remove expand all button and shadow host toolbar.
                treeElement.removeChildAtIndex(i);
                continue;
            }
            var elementsTreeElement = /** @type {!WebInspector.ElementsTreeElement} */ (existingTreeElement);
            var existingNode = elementsTreeElement.node();

            if (visibleChildrenSet.has(existingNode)) {
                existingTreeElements.set(existingNode, existingTreeElement);
                continue;
            }

            treeElement.removeChildAtIndex(i);
        }

        var displayMode = this._shadowHostDisplayModes.get(node);
        for (var i = 0; i < visibleChildren.length && i < treeElement.expandedChildrenLimit(); ++i) {
            var child = visibleChildren[i];
            var existingTreeElement = existingTreeElements.get(child) || this.findTreeElement(child);
            if (existingTreeElement && existingTreeElement !== treeElement) {
                // If an existing element was found, just move it.
                this._moveChild(treeElement, existingTreeElement, i);
            } else {
                // No existing element found, insert a new element.
                var newElement = this.insertChildElement(treeElement, child, i);
                newElement.setShadowHostToolbarMode(displayMode);
                if (this._updateInfo(node))
                    WebInspector.ElementsTreeElement.animateOnDOMUpdate(newElement);
                // If a node was inserted in the middle of existing list dynamically we might need to increase the limit.
                if (treeElement.childCount() > treeElement.expandedChildrenLimit())
                    this.setExpandedChildrenLimit(treeElement, treeElement.expandedChildrenLimit() + 1);
            }
        }

        // Update expand all button.
        var expandedChildCount = treeElement.childCount();
        if (visibleChildren.length > expandedChildCount) {
            var targetButtonIndex = expandedChildCount;
            if (!treeElement.expandAllButtonElement)
                treeElement.expandAllButtonElement = this._createExpandAllButtonTreeElement(treeElement);
            treeElement.insertChild(treeElement.expandAllButtonElement, targetButtonIndex);
            treeElement.expandAllButtonElement.button.textContent = WebInspector.UIString("Show All Nodes (%d More)", visibleChildren.length - expandedChildCount);
        } else if (treeElement.expandAllButtonElement) {
            delete treeElement.expandAllButtonElement;
        }

        // Insert close tag.
        if (node.nodeType() === Node.ELEMENT_NODE && treeElement.isExpandable())
            this.insertChildElement(treeElement, node, treeElement.childCount(), true);

        this._treeElementsBeingUpdated.delete(treeElement);
    },

    /**
     * @param {!WebInspector.DOMNode} shadowHost
     * @param {?WebInspector.ElementsTreeOutline.ShadowHostDisplayMode} newMode
     */
    setShadowHostDisplayMode: function(shadowHost, newMode)
    {
        var elementsTreeElement = this.findTreeElement(shadowHost);
        if (!elementsTreeElement)
            return;
        var node = elementsTreeElement.node();

        var oldMode = this._shadowHostDisplayModes.has(node);
        if (newMode)
            this._shadowHostDisplayModes.set(node, newMode);
        else
            this._shadowHostDisplayModes.delete(node);

        if (elementsTreeElement.populated)
            node.ensureShadowHostDistributedNodesLoaded(invalidateChildren.bind(this));
        else
            invalidateChildren.call(this);

        /**
         * @this {WebInspector.ElementsTreeOutline}
         */
        function invalidateChildren()
        {
            this._domUpdateHighlightsMuted = true;
            this._parentNodeModified(node);
            for (var shadowRoot of node.shadowRoots())
                this._parentNodeModified(shadowRoot);
            for (var insertionPoint of node.insertionPoints())
                this._parentNodeModified(insertionPoint);
            delete this._domUpdateHighlightsMuted;

            for (var shadowRoot of node.shadowRoots()) {
                var treeElement = this.findTreeElement(shadowRoot);
                if (treeElement)
                    treeElement.setShadowHostToolbarMode(newMode);
            }

            this._updateModifiedNodes();

            if (newMode === WebInspector.ElementsTreeOutline.ShadowHostDisplayMode.Composed) {
                for (var shadowRoot of node.shadowRoots()) {
                    var treeElement = this.findTreeElement(shadowRoot);
                    if (treeElement)
                        treeElement.expand();
                }
                for (var insertionPoint of node.insertionPoints()) {
                    var treeElement = this.findTreeElement(insertionPoint);
                    if (treeElement)
                        treeElement.expand();
                }
            }
        }
    },

    __proto__: TreeOutline.prototype
}

/**
 * @interface
 */
WebInspector.ElementsTreeOutline.ElementDecorator = function()
{
}

WebInspector.ElementsTreeOutline.ElementDecorator.prototype = {
    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?string}
     */
    decorate: function(node)
    {
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?string}
     */
    decorateAncestor: function(node)
    {
    }
}

/**
 * @constructor
 * @implements {WebInspector.ElementsTreeOutline.ElementDecorator}
 */
WebInspector.ElementsTreeOutline.PseudoStateDecorator = function()
{
    WebInspector.ElementsTreeOutline.ElementDecorator.call(this);
}

WebInspector.ElementsTreeOutline.PseudoStateDecorator.prototype = {
    /**
     * @override
     * @param {!WebInspector.DOMNode} node
     * @return {?string}
     */
    decorate: function(node)
    {
        if (node.nodeType() !== Node.ELEMENT_NODE)
            return null;
        var propertyValue = node.getUserProperty(WebInspector.CSSStyleModel.PseudoStatePropertyName);
        if (!propertyValue)
            return null;
        return WebInspector.UIString("Element state: %s", ":" + propertyValue.join(", :"));
    },

    /**
     * @override
     * @param {!WebInspector.DOMNode} node
     * @return {?string}
     */
    decorateAncestor: function(node)
    {
        if (node.nodeType() !== Node.ELEMENT_NODE)
            return null;

        var descendantCount = node.descendantUserPropertyCount(WebInspector.CSSStyleModel.PseudoStatePropertyName);
        if (!descendantCount)
            return null;
        if (descendantCount === 1)
            return WebInspector.UIString("%d descendant with forced state", descendantCount);
        return WebInspector.UIString("%d descendants with forced state", descendantCount);
    }
}

/**
 * @constructor
 */
WebInspector.ElementsTreeOutline.UpdateInfo = function()
{
}

WebInspector.ElementsTreeOutline.UpdateInfo.prototype = {
    /**
     * @param {string} attrName
     */
    attributeModified: function(attrName)
    {
        if (this._removedAttributes && this._removedAttributes.has(attrName))
            this._removedAttributes.delete(attrName);
        if (!this._modifiedAttributes)
            this._modifiedAttributes = /** @type {!Set.<string>} */ (new Set());
        this._modifiedAttributes.add(attrName);
    },

    /**
     * @param {string} attrName
     */
    attributeRemoved: function(attrName)
    {
        if (this._modifiedAttributes && this._modifiedAttributes.has(attrName))
            this._modifiedAttributes.delete(attrName);
        if (!this._removedAttributes)
            this._removedAttributes = /** @type {!Set.<string>} */ (new Set());
        this._removedAttributes.add(attrName);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    nodeInserted: function(node)
    {
        if (!this._insertedNodes)
            this._insertedNodes = /** @type {!Set.<!WebInspector.DOMNode>} */ (new Set());
        this._insertedNodes.add(/** @type {!WebInspector.DOMNode} */ (node));
    },

    charDataModified: function()
    {
        this._charDataModified = true;
    },

    childrenModified: function()
    {
        this._hasChangedChildren = true;
    },

    /**
     * @param {string} attributeName
     * @return {boolean}
     */
    isAttributeModified: function(attributeName)
    {
        return this._modifiedAttributes && this._modifiedAttributes.has(attributeName);
    },

    /**
     * @return {boolean}
     */
    hasRemovedAttributes: function()
    {
        return !!this._removedAttributes && !!this._removedAttributes.size;
    },

    /**
     * @return {boolean}
     */
    hasInsertedNodes: function()
    {
        return !!this._insertedNodes && !!this._insertedNodes.size;
    },

    /**
     * @return {boolean}
     */
    isCharDataModified: function()
    {
        return !!this._charDataModified;
    },

    /**
     * @return {boolean}
     */
    isNodeInserted: function(node)
    {
        return !!this._insertedNodes && this._insertedNodes.has(node);
    },

    /**
     * @return {boolean}
     */
    hasChangedChildren: function()
    {
        return !!this._hasChangedChildren;
    }
}

/**
 * @constructor
 * @implements {WebInspector.Renderer}
 */
WebInspector.ElementsTreeOutline.Renderer = function()
{
}

WebInspector.ElementsTreeOutline.Renderer.prototype = {
    /**
     * @override
     * @param {!Object} object
     * @return {!Promise.<!Element>}
     */
    render: function(object)
    {
        return new Promise(renderPromise);

        /**
         * @param {function(!Element)} resolve
         * @param {function(!Error)} reject
         */
        function renderPromise(resolve, reject)
        {
            if (object instanceof WebInspector.DOMNode)
                onNodeResolved(/** @type {!WebInspector.DOMNode} */ (object));
            else if (object instanceof WebInspector.DeferredDOMNode)
                (/** @type {!WebInspector.DeferredDOMNode} */ (object)).resolve(onNodeResolved);
            else if (object instanceof WebInspector.RemoteObject)
                (/** @type {!WebInspector.RemoteObject} */ (object)).pushNodeToFrontend(onNodeResolved);
            else
                reject(new Error("Can't reveal not a node."));

            /**
             * @param {?WebInspector.DOMNode} node
             */
            function onNodeResolved(node)
            {
                if (!node) {
                    reject(new Error("Could not resolve node."));
                    return;
                }
                var treeOutline = new WebInspector.ElementsTreeOutline(node.target(), false, false);
                treeOutline.rootDOMNode = node;
                if (!treeOutline.firstChild().isExpandable())
                    treeOutline._element.classList.add("single-node");
                treeOutline.setVisible(true);
                treeOutline.element.treeElementForTest = treeOutline.firstChild();
                resolve(treeOutline.element);
            }
        }
    }
}
