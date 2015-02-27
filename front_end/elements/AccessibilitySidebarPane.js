// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.ElementsSidebarPane}
 */
WebInspector.AccessibilitySidebarPane = function()
{
    WebInspector.ElementsSidebarPane.call(this, WebInspector.UIString("Accessibility"));
}

WebInspector.AccessibilitySidebarPane.prototype = {
    /**
     * @override
     * @param {!WebInspector.Throttler.FinishCallback} finishCallback
     * @protected
     */
    doUpdate: function(finishCallback)
    {
        /**
         * @param {?AccessibilityAgent.AXNode} accessibilityNode
         * @this {WebInspector.AccessibilitySidebarPane}
         */
        function accessibilityNodeCallback(accessibilityNode)
        {
            this._setNode(accessibilityNode);
            finishCallback();
        }
        this.node().target().accessibilityModel.getAXNode(this.node().id, accessibilityNodeCallback.bind(this));
    },

    /**
     * @override
     */
    wasShown: function()
    {
        WebInspector.ElementsSidebarPane.prototype.wasShown.call(this);
        if (this._treeOutline)
            return;

        this._treeOutline = new TreeOutlineInShadow();
        this._rootElement = new TreeElement("Accessibility Node", true);
        this._rootElement.selectable = false;
        this._treeOutline.appendChild(this._rootElement);
        this.bodyElement.appendChild(this._treeOutline.element);
        this._rootElement.expand();

        WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrModified, this._onNodeChange, this);
        WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrRemoved, this._onNodeChange, this);
        WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
        WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
    },

    /**
     * @override
     */
    willHide: function()
    {
        WebInspector.targetManager.removeModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrModified, this._onNodeChange, this);
        WebInspector.targetManager.removeModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrRemoved, this._onNodeChange, this);
        WebInspector.targetManager.removeModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
        WebInspector.targetManager.removeModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
    },

    /**
     * @param {?AccessibilityAgent.AXNode} node
     */
    _setNode: function(node)
    {
        if (this._axNode === node)
            return;
        this._axNode = node;

        /**
         * @param {string} propName
         * @param {*} propValue
         * @return {!WebInspector.RemoteObjectProperty}
         */
        function buildProperty(propName, propValue)
        {
            var propValueObject = WebInspector.RemoteObject.fromLocalObject(propValue);
            return new WebInspector.RemoteObjectProperty(propName, propValueObject);
        }

        var nodeProperties = /** @type {!Array.<!WebInspector.RemoteObjectProperty>} */ ([]);
        if (node) {
            nodeProperties.push(buildProperty("role", node.role || WebInspector.UIString("<No matching ARIA role>")));
            if ("name" in node)
                nodeProperties.push(buildProperty("name", node.name));
            if ("description" in node)
                nodeProperties.push(buildProperty("description", node.description));
            if ("help" in node)
                nodeProperties.push(buildProperty("help", node.help));
            if ("value" in node)
                nodeProperties.push(buildProperty("value", node.value));
            if ("widgetProperties" in node) {
                for (var p in node.widgetProperties)
                    nodeProperties.push(buildProperty(p, node.widgetProperties[p]));
            }
            if ("widgetStates" in node) {
                for (var p in node.widgetStates)
                    nodeProperties.push(buildProperty(p, node.widgetStates[p]));
            }
            if ("globalStates" in node) {
                for (var s in node.globalStates)
                    nodeProperties.push(buildProperty(s, node.globalStates[s]));
            }
            if ("liveRegionProperties" in node) {
                for (var p in node.liveRegionProperties)
                    nodeProperties.push(buildProperty(p,  node.liveRegionProperties[p]));
            }
            // FIXME: relationships, parent, children
        }

        // FIXME: do not use object property section.
        this._rootElement.removeChildren();
        WebInspector.ObjectPropertyTreeElement.populateWithProperties(
            this._rootElement,
            nodeProperties,
            null,
            true /* doSkipProto */,
            null);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onNodeChange: function(event)
    {
        var node = this._axNode;
        this._axNode = null;
        this._setNode(node);
    },

    __proto__: WebInspector.ElementsSidebarPane.prototype
};
