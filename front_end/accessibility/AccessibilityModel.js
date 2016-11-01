// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.AccessibilityNode = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.AccessibilityModel} accessibilityModel
   * @param {!AccessibilityAgent.AXNode} payload
   */
  constructor(accessibilityModel, payload) {
    super(accessibilityModel.target());
    this._accessibilityModel = accessibilityModel;
    this._agent = accessibilityModel._agent;

    this._id = payload.nodeId;
    accessibilityModel._setAXNodeForAXId(this._id, this);

    this._ignored = payload.ignored;
    if (this._ignored && 'ignoredReasons' in payload)
      this._ignoredReasons = payload.ignoredReasons;

    this._role = payload.role || null;
    this._name = payload.name || null;
    this._description = payload.description || null;
    this._value = payload.value || null;
    this._properties = payload.properties || null;
    this._parentId = payload.parentId || null;
    this._childIds = payload.childIds || null;
    this._domNodeId = payload.domNodeId || null;
  }

  /**
   * @return {boolean}
   */
  ignored() {
    return this._ignored;
  }

  /**
   * @return {?Array<!AccessibilityAgent.AXProperty>}
   */
  ignoredReasons() {
    return this._ignoredReasons || null;
  }

  /**
   * @return {?AccessibilityAgent.AXValue}
   */
  role() {
    return this._role || null;
  }

  /**
   * @return {!Array<!AccessibilityAgent.AXProperty>}
   */
  coreProperties() {
    var properties = [];

    if (this._name)
      properties.push(/** @type {!AccessibilityAgent.AXProperty} */ ({name: 'name', value: this._name}));
    if (this._description)
      properties.push(/** @type {!AccessibilityAgent.AXProperty} */ ({name: 'description', value: this._description}));
    if (this._value)
      properties.push(/** @type {!AccessibilityAgent.AXProperty} */ ({name: 'value', value: this._value}));

    return properties;
  }

  /**
   * @return {?AccessibilityAgent.AXValue}
   */
  name() {
    return this._name || null;
  }

  /**
   * @return {?AccessibilityAgent.AXValue}
   */
  description() {
    return this._description || null;
  }

  /**
   * @return {?AccessibilityAgent.AXValue}
   */
  value() {
    return this._value || null;
  }

  /**
   * @return {?Array<!AccessibilityAgent.AXProperty>}
   */
  properties() {
    return this._properties || null;
  }

  /**
   * @return {?WebInspector.AccessibilityNode}
   */
  parentNode() {
    if (!this._parentId)
      return null;
    return this._accessibilityModel.axNodeForId(this._parentId);
  }
};

/**
 * @unrestricted
 */
WebInspector.AccessibilityModel = class extends WebInspector.SDKModel {
  /**
   * @param {!WebInspector.Target} target
   */
  constructor(target) {
    super(WebInspector.AccessibilityModel, target);
    this._agent = target.accessibilityAgent();

    /** @type {!Map<string, !WebInspector.AccessibilityNode>} */
    this._axIdToAXNode = new Map();
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {!WebInspector.AccessibilityModel}
   */
  static fromTarget(target) {
    if (!target[WebInspector.AccessibilityModel._symbol])
      target[WebInspector.AccessibilityModel._symbol] = new WebInspector.AccessibilityModel(target);

    return target[WebInspector.AccessibilityModel._symbol];
  }

  /**
   * @param {string} axId
   * @return {?WebInspector.AccessibilityNode}
   */
  axNodeForId(axId) {
    return this._axIdToAXNode.get(axId);
  }

  /**
   * @param {string} axId
   * @param {!WebInspector.AccessibilityNode} axNode
   */
  _setAXNodeForAXId(axId, axNode) {
    this._axIdToAXNode.set(axId, axNode);
  }

  /**
   * @param {!WebInspector.DOMNode} node
   * @return {!Promise<?Array<!WebInspector.AccessibilityNode>>}
   */
  getAXNodeChain(node) {
    this._axIdToAXNode.clear();

    /**
     * @this {WebInspector.AccessibilityModel}
     * @param {?string} error
     * @param {!Array<!AccessibilityAgent.AXNode>=} payloads
     * @return {?Array<!WebInspector.AccessibilityNode>}
     */
    function parsePayload(error, payloads) {
      if (error) {
        console.error('AccessibilityAgent.getAXNodeChain(): ' + error);
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
  }
};

WebInspector.AccessibilityModel._symbol = Symbol('AccessibilityModel');


