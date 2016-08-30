/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.BreakpointsSidebarPaneBase}
 * @implements {WebInspector.ContextFlavorListener}
 */
WebInspector.DOMBreakpointsSidebarPane = function()
{
    WebInspector.BreakpointsSidebarPaneBase.call(this);
    this._domBreakpointsSetting = WebInspector.settings.createLocalSetting("domBreakpoints", []);
    this.listElement.classList.add("dom-breakpoints-list");

    /** @type {!Map<string, !Element>} */
    this._breakpointElements = new Map();

    this._breakpointTypes = {
        SubtreeModified: "subtree-modified",
        AttributeModified: "attribute-modified",
        NodeRemoved: "node-removed"
    };
    this._breakpointTypeLabels = {};
    this._breakpointTypeLabels[this._breakpointTypes.SubtreeModified] = WebInspector.UIString("Subtree Modified");
    this._breakpointTypeLabels[this._breakpointTypes.AttributeModified] = WebInspector.UIString("Attribute Modified");
    this._breakpointTypeLabels[this._breakpointTypes.NodeRemoved] = WebInspector.UIString("Node Removed");

    this._contextMenuLabels = {};
    this._contextMenuLabels[this._breakpointTypes.SubtreeModified] = WebInspector.UIString.capitalize("Subtree ^modifications");
    this._contextMenuLabels[this._breakpointTypes.AttributeModified] = WebInspector.UIString.capitalize("Attributes ^modifications");
    this._contextMenuLabels[this._breakpointTypes.NodeRemoved] = WebInspector.UIString.capitalize("Node ^removal");

    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
    this._update();
}

WebInspector.DOMBreakpointsSidebarPane.Marker = "breakpoint-marker";

WebInspector.DOMBreakpointsSidebarPane.prototype = {
    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {boolean} createSubMenu
     */
    populateNodeContextMenu: function(node, contextMenu, createSubMenu)
    {
        if (node.pseudoType())
            return;

        var nodeBreakpoints = this._nodeBreakpoints(node);

        /**
         * @param {!DOMDebuggerAgent.DOMBreakpointType} type
         * @this {WebInspector.DOMBreakpointsSidebarPane}
         */
        function toggleBreakpoint(type)
        {
            if (!nodeBreakpoints.has(type))
                this._setBreakpoint(node, type, true);
            else
                this._removeBreakpoint(node, type);
            this._saveBreakpoints();
        }

        var breakpointsMenu = createSubMenu ? contextMenu.appendSubMenuItem(WebInspector.UIString("Break on...")) : contextMenu;
        for (var key in this._breakpointTypes) {
            var type = this._breakpointTypes[key];
            var label = this._contextMenuLabels[type];
            breakpointsMenu.appendCheckboxItem(label, toggleBreakpoint.bind(this, type), nodeBreakpoints.has(type));
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Set<!DOMDebuggerAgent.DOMBreakpointType>}
     */
    _nodeBreakpoints: function(node)
    {
        /** @type {!Set<!DOMDebuggerAgent.DOMBreakpointType>} */
        var nodeBreakpoints = new Set();
        for (var element of this._breakpointElements.values()) {
            if (element._node === node && element._checkboxElement.checked)
                nodeBreakpoints.add(element._type);
        }
        return nodeBreakpoints;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {boolean}
     */
    hasBreakpoints: function(node)
    {
        for (var element of this._breakpointElements.values()) {
            if (element._node === node && element._checkboxElement.checked)
                return true;
        }
        return false;
    },

    /**
     * @param {!WebInspector.DebuggerPausedDetails} details
     * @return {!Element}
     */
    createBreakpointHitStatusMessage: function(details)
    {
        var auxData = /** @type {!Object} */ (details.auxData);
        var message = "Paused on a \"%s\" breakpoint.";
        var substitutions = [];
        substitutions.push(this._breakpointTypeLabels[auxData["type"]]);

        var domModel = WebInspector.DOMModel.fromTarget(details.target());
        if (!domModel)
            return WebInspector.formatLocalized(message, substitutions);

        var node = domModel.nodeForId(auxData["nodeId"]);
        var linkifiedNode = WebInspector.DOMPresentationUtils.linkifyNodeReference(node);
        substitutions.push(linkifiedNode);

        var targetNode = auxData["targetNodeId"] ? domModel.nodeForId(auxData["targetNodeId"]) : null;
        var targetNodeLink = targetNode ? WebInspector.DOMPresentationUtils.linkifyNodeReference(targetNode) : "";

        if (auxData.type === this._breakpointTypes.SubtreeModified) {
            if (auxData["insertion"]) {
                if (targetNode !== node) {
                    message = "Paused on a \"%s\" breakpoint set on %s, because a new child was added to its descendant %s.";
                    substitutions.push(targetNodeLink);
                } else
                    message = "Paused on a \"%s\" breakpoint set on %s, because a new child was added to that node.";
            } else {
                message = "Paused on a \"%s\" breakpoint set on %s, because its descendant %s was removed.";
                substitutions.push(targetNodeLink);
            }
        } else {
            message = "Paused on a \"%s\" breakpoint set on %s.";
        }

        return WebInspector.formatLocalized(message, substitutions);
    },

    _nodeRemoved: function(event)
    {
        var node = event.data.node;
        this._removeBreakpointsForNode(event.data.node);
        var children = node.children();
        if (!children)
            return;
        for (var i = 0; i < children.length; ++i)
            this._removeBreakpointsForNode(children[i]);
        this._saveBreakpoints();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    _removeBreakpointsForNode: function(node)
    {
        for (var element of this._breakpointElements.values()) {
            if (element._node === node)
                this._removeBreakpoint(element._node, element._type);
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!DOMDebuggerAgent.DOMBreakpointType} type
     * @param {boolean} enabled
     */
    _setBreakpoint: function(node, type, enabled)
    {
        var breakpointId = this._createBreakpointId(node.id, type);
        var breakpointElement = this._breakpointElements.get(breakpointId);
        if (!breakpointElement) {
            breakpointElement = this._createBreakpointElement(node, type, enabled);
            this._breakpointElements.set(breakpointId, breakpointElement);
        } else {
            breakpointElement._checkboxElement.checked = enabled;
        }
        if (enabled)
            node.target().domdebuggerAgent().setDOMBreakpoint(node.id, type);
        node.setMarker(WebInspector.DOMBreakpointsSidebarPane.Marker, true);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!DOMDebuggerAgent.DOMBreakpointType} type
     * @param {boolean} enabled
     */
    _createBreakpointElement: function(node, type, enabled)
    {
        var element = createElement("li");
        element._node = node;
        element._type = type;
        element.addEventListener("contextmenu", this._contextMenu.bind(this, node, type), true);

        var checkboxLabel = createCheckboxLabel("", enabled);
        var checkboxElement = checkboxLabel.checkboxElement;
        checkboxElement.addEventListener("click", this._checkboxClicked.bind(this, node, type), false);
        element._checkboxElement = checkboxElement;
        element.appendChild(checkboxLabel);

        var labelElement = createElementWithClass("div", "dom-breakpoint");
        element.appendChild(labelElement);

        var linkifiedNode = WebInspector.DOMPresentationUtils.linkifyNodeReference(node);
        linkifiedNode.classList.add("monospace");
        linkifiedNode.style.display = "block";
        labelElement.appendChild(linkifiedNode);

        var description = createElement("div");
        description.textContent = this._breakpointTypeLabels[type];
        labelElement.appendChild(description);

        var currentElement = this.listElement.firstChild;
        while (currentElement) {
            if (currentElement._type && currentElement._type < element._type)
                break;
            currentElement = currentElement.nextSibling;
        }
        this.addListElement(element, currentElement);
        return element;
    },

    _removeAllBreakpoints: function()
    {
        for (var element of this._breakpointElements.values())
            this._removeBreakpoint(element._node, element._type);
        this._saveBreakpoints();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!DOMDebuggerAgent.DOMBreakpointType} type
     */
    _removeBreakpoint: function(node, type)
    {
        var breakpointId = this._createBreakpointId(node.id, type);
        var element = this._breakpointElements.get(breakpointId);
        if (!element)
            return;

        this.removeListElement(element);
        this._breakpointElements.delete(breakpointId);
        if (element._checkboxElement.checked)
            node.target().domdebuggerAgent().removeDOMBreakpoint(node.id, type);
        node.setMarker(WebInspector.DOMBreakpointsSidebarPane.Marker, this.hasBreakpoints(node) ? true : null);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!DOMDebuggerAgent.DOMBreakpointType} type
     * @param {!Event} event
     */
    _contextMenu: function(node, type, event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);

        /**
         * @this {WebInspector.DOMBreakpointsSidebarPane}
         */
        function removeBreakpoint()
        {
            this._removeBreakpoint(node, type);
            this._saveBreakpoints();
        }
        contextMenu.appendItem(WebInspector.UIString.capitalize("Remove ^breakpoint"), removeBreakpoint.bind(this));
        contextMenu.appendItem(WebInspector.UIString.capitalize("Remove ^all DOM breakpoints"), this._removeAllBreakpoints.bind(this));
        contextMenu.show();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!DOMDebuggerAgent.DOMBreakpointType} type
     * @param {!Event} event
     */
    _checkboxClicked: function(node, type, event)
    {
        if (event.target.checked)
            node.target().domdebuggerAgent().setDOMBreakpoint(node.id, type);
        else
            node.target().domdebuggerAgent().removeDOMBreakpoint(node.id, type);
        this._saveBreakpoints();
    },

    /**
     * @override
     * @param {?Object} object
     */
    flavorChanged: function(object)
    {
        this._update();
    },

    _update: function()
    {
        var details = WebInspector.context.flavor(WebInspector.DebuggerPausedDetails);
        if (!details || details.reason !== WebInspector.DebuggerModel.BreakReason.DOM) {
            if (this._highlightedElement) {
                this._highlightedElement.classList.remove("breakpoint-hit");
                delete this._highlightedElement;
            }
            return;
        }
        var auxData = details.auxData;
        var breakpointId = this._createBreakpointId(auxData.nodeId, auxData.type);
        var element = this._breakpointElements.get(breakpointId);
        if (!element)
            return;
        WebInspector.viewManager.showView("sources.domBreakpoints");
        element.classList.add("breakpoint-hit");
        this._highlightedElement = element;
    },

    /**
     * @param {number} nodeId
     * @param {!DOMDebuggerAgent.DOMBreakpointType} type
     */
    _createBreakpointId: function(nodeId, type)
    {
        return nodeId + ":" + type;
    },

    _saveBreakpoints: function()
    {
        var breakpoints = [];
        var storedBreakpoints = this._domBreakpointsSetting.get();
        for (var i = 0; i < storedBreakpoints.length; ++i) {
            var breakpoint = storedBreakpoints[i];
            if (breakpoint.url !== this._inspectedURL)
                breakpoints.push(breakpoint);
        }
        for (var element of this._breakpointElements.values())
            breakpoints.push({ url: this._inspectedURL, path: element._node.path(), type: element._type, enabled: element._checkboxElement.checked });
        this._domBreakpointsSetting.set(breakpoints);
    },

    /**
     * @param {!WebInspector.DOMDocument} domDocument
     */
    restoreBreakpoints: function(domDocument)
    {
        this._breakpointElements.clear();
        this.reset();
        this._inspectedURL = domDocument.documentURL;
        var domModel = domDocument.domModel();
        /** @type {!Map<string, !Array<!Object>>} */
        var pathToBreakpoints = new Map();

        /**
         * @param {string} path
         * @param {?DOMAgent.NodeId} nodeId
         * @this {WebInspector.DOMBreakpointsSidebarPane}
         */
        function didPushNodeByPathToFrontend(path, nodeId)
        {
            var node = nodeId ? domModel.nodeForId(nodeId) : null;
            if (!node)
                return;

            var breakpoints = pathToBreakpoints.get(path);
            for (var i = 0; i < breakpoints.length; ++i)
                this._setBreakpoint(node, breakpoints[i].type, breakpoints[i].enabled);
        }

        var breakpoints = this._domBreakpointsSetting.get();
        for (var i = 0; i < breakpoints.length; ++i) {
            var breakpoint = breakpoints[i];
            if (breakpoint.url !== this._inspectedURL)
                continue;
            var path = breakpoint.path;
            if (!pathToBreakpoints.has(path)) {
                pathToBreakpoints.set(path, []);
                domModel.pushNodeByPathToFrontend(path, didPushNodeByPathToFrontend.bind(this, path));
            }
            pathToBreakpoints.get(path).push(breakpoint);
        }
    },

    __proto__: WebInspector.BreakpointsSidebarPaneBase.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.DOMBreakpointsSidebarPane.Proxy = function()
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("components/breakpointsList.css");
}

WebInspector.DOMBreakpointsSidebarPane.Proxy.prototype = {
    wasShown: function()
    {
        WebInspector.SimpleView.prototype.wasShown.call(this);
        var pane = WebInspector.domBreakpointsSidebarPane;
        if (pane.element.parentNode !== this.element)
            pane.show(this.element);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @type {!WebInspector.DOMBreakpointsSidebarPane}
 */
WebInspector.domBreakpointsSidebarPane;
