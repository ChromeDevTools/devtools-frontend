// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.AccessibilityModel} accessibilityModel
 * @param {!AccessibilityAgent.AXNode} payload
 */
WebInspector.AccessibilityNode = function(accessibilityModel, payload)
{
    WebInspector.SDKObject.call(this, accessibilityModel.target());
    this._accessibilityModel = accessibilityModel;
    this._agent = accessibilityModel._agent;

    this._id = payload.nodeId;
    accessibilityModel._setAXNodeForAXId(this._id, this);

    this._ignored = payload.ignored;
    if (this._ignored && "ignoredReasons" in payload)
        this._ignoredReasons = payload.ignoredReasons;

    this._role = payload.role || null;
    this._name = payload.name || null;
    this._description = payload.description || null;
    this._value = payload.value || null;
    this._properties = payload.properties || null;
    this._parentId = payload.parentId || null;
    this._childIds = payload.childIds || null;
    this._domNodeId = payload.domNodeId || null;
};

WebInspector.AccessibilityNode.prototype = {
    /**
     * @return {boolean}
     */
    ignored: function()
    {
        return this._ignored;
    },

    /**
     * @return {?Array<!AccessibilityAgent.AXProperty>}
     */
    ignoredReasons: function()
    {
        return this._ignoredReasons || null;
    },

    /**
     * @return {?AccessibilityAgent.AXValue}
     */
    role: function()
    {
        return this._role || null;
    },

    /**
     * @return {!Array<!AccessibilityAgent.AXProperty>}
     */
    coreProperties: function()
    {
        var properties = [];

        if (this._name)
            properties.push(/** @type {!AccessibilityAgent.AXProperty} */ ({name: "name", value: this._name}));
        if (this._description)
            properties.push(/** @type {!AccessibilityAgent.AXProperty} */ ({name: "description", value: this._description}));
        if (this._value)
            properties.push(/** @type {!AccessibilityAgent.AXProperty} */ ({name: "value", value: this._value}));

        return properties;
    },

    /**
     * @return {?AccessibilityAgent.AXValue}
     */
    name: function()
    {
        return this._name || null;
    },

    /**
     * @return {?AccessibilityAgent.AXValue}
     */
    description: function()
    {
        return this._description || null;
    },

    /**
     * @return {?AccessibilityAgent.AXValue}
     */
    value: function()
    {
        return this._value || null;
    },

    /**
     * @return {?Array<!AccessibilityAgent.AXProperty>}
     */
    properties: function()
    {
        return this._properties || null;
    },

    /**
     * @return {?WebInspector.AccessibilityNode}
     */
    parentNode: function()
    {
        if (!this._parentId)
            return null;
        return this._accessibilityModel.axNodeForId(this._parentId);
    },

    __proto__: WebInspector.SDKObject.prototype
};

/**
 * @constructor
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 */
WebInspector.AccessibilityModel = function(target)
{
    WebInspector.SDKModel.call(this, WebInspector.AccessibilityModel, target);
    this._agent = target.accessibilityAgent();

    /** @type {!Map<string, !WebInspector.AccessibilityNode>} */
    this._axIdToAXNode = new Map();
};

WebInspector.AccessibilityModel.prototype = {

    /**
     * @param {string} axId
     * @return {?WebInspector.AccessibilityNode}
     */
    axNodeForId: function(axId)
    {
        return this._axIdToAXNode.get(axId);
    },

    /**
     * @param {string} axId
     * @param {!WebInspector.AccessibilityNode} axNode
     */
    _setAXNodeForAXId: function(axId, axNode)
    {
        this._axIdToAXNode.set(axId, axNode);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Promise<?Array<!WebInspector.AccessibilityNode>>}
     */
    getAXNodeChain: function(node)
    {
        this._axIdToAXNode.clear();

        /**
         * @this {WebInspector.AccessibilityModel}
         * @param {?string} error
         * @param {!Array<!AccessibilityAgent.AXNode>=} payloads
         * @return {?Array<!WebInspector.AccessibilityNode>}
         */
        function parsePayload(error, payloads)
        {
            if (error) {
                console.error("AccessibilityAgent.getAXNodeChain(): " + error);
                return null;
            }

            if (!payloads)
                return null;

            var nodes = [];
            for (var payload of payloads)
                nodes.push(new WebInspector.AccessibilityNode(this, payload));

            return nodes;
        }
        return this._agent.getAXNodeChain(node.id, true, parsePayload.bind(this));
    },

    __proto__: WebInspector.SDKModel.prototype
};

WebInspector.AccessibilityModel._symbol = Symbol("AccessibilityModel");
/**
 * @param {!WebInspector.Target} target
 * @return {!WebInspector.AccessibilityModel}
 */
WebInspector.AccessibilityModel.fromTarget = function(target)
{
    if (!target[WebInspector.AccessibilityModel._symbol])
        target[WebInspector.AccessibilityModel._symbol] = new WebInspector.AccessibilityModel(target);

    return target[WebInspector.AccessibilityModel._symbol];
}
