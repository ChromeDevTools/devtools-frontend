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
    this._node = null;
    this._sidebarPaneStack = WebInspector.viewManager.createStackLocation();
    this._treeSubPane = new WebInspector.AXTreePane();
    this._sidebarPaneStack.showView(this._treeSubPane);
    this._ariaSubPane = new WebInspector.ARIAAttributesPane();
    this._sidebarPaneStack.showView(this._ariaSubPane);
    this._axNodeSubPane = new WebInspector.AXNodeSubPane();
    this._sidebarPaneStack.showView(this._axNodeSubPane);
    this._sidebarPaneStack.widget().show(this.element);
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
     * @param {?Array<!AccessibilityAgent.AXNode>} nodes
     */
    accessibilityNodeCallback: function(nodes)
    {
        if (!nodes)
            return;

        var currentAXNode = nodes[0];
        if (currentAXNode.ignored)
            this._sidebarPaneStack.removeView(this._ariaSubPane);
        else
            this._sidebarPaneStack.showView(this._ariaSubPane, this._axNodeSubPane);

        if (this._axNodeSubPane)
            this._axNodeSubPane.setAXNode(currentAXNode);
        if (this._treeSubPane)
            this._treeSubPane.setAXNodeAndAncestors(nodes);
    },

    /**
     * @override
     * @protected
     * @return {!Promise.<?>}
     */
    doUpdate: function()
    {
        var node = this.node();
        this._treeSubPane.setNode(node);
        this._axNodeSubPane.setNode(node);
        this._ariaSubPane.setNode(node);
        return WebInspector.AccessibilityModel.fromTarget(node.target()).getAXNodeChain(node.id)
            .then((nodes) => { this.accessibilityNodeCallback(nodes); });
    },

    /**
     * @override
     */
    wasShown: function()
    {
        WebInspector.ThrottledWidget.prototype.wasShown.call(this);

        this._treeSubPane.setNode(this.node());
        this._axNodeSubPane.setNode(this.node());
        this._ariaSubPane.setNode(this.node());

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
        this._ariaSubPane.setNode(this._node);
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
 * @extends {WebInspector.SimpleView}
 * @param {string} name
 */
WebInspector.AccessibilitySubPane = function(name)
{
    WebInspector.SimpleView.call(this, name);

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
        var classNameOrDefault = className || "gray-info-message";
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

    __proto__: WebInspector.SimpleView.prototype
}
