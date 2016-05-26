// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.ThrottledWidget}
 */
WebInspector.AccessibilitySidebarView = function()
{
    WebInspector.ThrottledWidget.call(this);
    this._axNodeSubPane = null;
    this._node = null;
    this._sidebarPaneStack = null;
    WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode, this._pullNode, this);
    this._pullNode();
}

WebInspector.AccessibilitySidebarView.prototype = {
    /**
     * @return {?WebInspector.DOMNode}
     */
    node: function()
    {
        return this._node;
    },

    /**
     * @override
     * @protected
     * @return {!Promise.<?>}
     */
    doUpdate: function()
    {
        /**
         * @param {?AccessibilityAgent.AXNode} accessibilityNode
         * @this {WebInspector.AccessibilitySidebarView}
         */
        function accessibilityNodeCallback(accessibilityNode)
        {
            if (this._axNodeSubPane)
                this._axNodeSubPane.setAXNode(accessibilityNode);
        }
        var node = this.node();
        return WebInspector.AccessibilityModel.fromTarget(node.target()).getAXNode(node.id)
            .then(accessibilityNodeCallback.bind(this))
    },

    /**
     * @override
     */
    wasShown: function()
    {
        WebInspector.ThrottledWidget.prototype.wasShown.call(this);

        if (!this._sidebarPaneStack) {
            this._axNodeSubPane = new WebInspector.AXNodeSubPane();
            this._axNodeSubPane.setNode(this.node());
            this._axNodeSubPane.show(this.element);
            this._axNodeSubPane.expand();

            this._sidebarPaneStack = new WebInspector.SidebarPaneStack();
            this._sidebarPaneStack.element.classList.add("flex-auto");
            this._sidebarPaneStack.show(this.element);
            this._sidebarPaneStack.addPane(this._axNodeSubPane);
        }

        WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrModified, this._onAttrChange, this);
        WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrRemoved, this._onAttrChange, this);
        WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
        WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
    },

    /**
     * @override
     */
    willHide: function()
    {
        WebInspector.targetManager.removeModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrModified, this._onAttrChange, this);
        WebInspector.targetManager.removeModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrRemoved, this._onAttrChange, this);
        WebInspector.targetManager.removeModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
        WebInspector.targetManager.removeModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
    },

    _pullNode: function()
    {
        this._node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (this._axNodeSubPane)
            this._axNodeSubPane.setNode(this._node);
        this.update();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onAttrChange: function(event)
    {
        if (!this.node())
            return;
        var node = event.data.node;
        if (this.node() !== node)
            return;
        this.update();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onNodeChange: function(event)
    {
        if (!this.node())
            return;
        var node = event.data;
        if (this.node() !== node)
            return;
        this.update();
    },


    __proto__: WebInspector.ThrottledWidget.prototype
};

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 * @param {string} name
 */
WebInspector.AccessibilitySubPane = function(name)
{
    WebInspector.SidebarPane.call(this, name);

    this._axNode = null;
    this.registerRequiredCSS("accessibility/accessibilityNode.css");
}

WebInspector.AccessibilitySubPane.prototype = {
    /**
     * @param {?AccessibilityAgent.AXNode} axNode
     * @protected
     */
    setAXNode: function(axNode)
    {
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    node: function()
    {
        return this._node;
    },

    /**
     * @param {?WebInspector.DOMNode} node
     */
    setNode: function(node)
    {
        this._node = node;
    },

    /**
     * @param {string} textContent
     * @param {string=} className
     * @return {!Element}
     */
    createInfo: function(textContent, className)
    {
        var classNameOrDefault = className || "info";
        var info = this.element.createChild("div", classNameOrDefault);
        info.textContent = textContent;
        return info;
    },

    /**
     * @return {!TreeOutline}
     */
    createTreeOutline: function()
    {
        var treeOutline = new TreeOutlineInShadow();
        treeOutline.registerRequiredCSS("accessibility/accessibilityNode.css");
        treeOutline.registerRequiredCSS("components/objectValue.css");

        treeOutline.element.classList.add("hidden");
        this.element.appendChild(treeOutline.element);
        return treeOutline;
    },

    __proto__: WebInspector.SidebarPane.prototype
}
