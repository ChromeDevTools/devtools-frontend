// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Accessibility.AccessibilityNode = class extends SDK.SDKObject {
  /**
   * @param {!Accessibility.AccessibilityModel} accessibilityModel
   * @param {!Protocol.Accessibility.AXNode} payload
   */
  constructor(accessibilityModel, payload) {
    super(accessibilityModel.target());
    this._accessibilityModel = accessibilityModel;
    this._agent = accessibilityModel._agent;

    this._id = payload.nodeId;
    accessibilityModel._setAXNodeForAXId(this._id, this);
    if (payload.backendDOMNodeId) {
      accessibilityModel._setAXNodeForBackendDOMNodeId(payload.backendDOMNodeId, this);
      this._backendDOMNodeId = payload.backendDOMNodeId;
      this._deferredDOMNode = new SDK.DeferredDOMNode(this.target(), payload.backendDOMNodeId);
    } else {
      this._backendDOMNodeId = null;
      this._deferredDOMNode = null;
    }
    this._ignored = payload.ignored;
    if (this._ignored && 'ignoredReasons' in payload)
      this._ignoredReasons = payload.ignoredReasons;

    this._role = payload.role || null;
    this._name = payload.name || null;
    this._description = payload.description || null;
    this._value = payload.value || null;
    this._properties = payload.properties || null;
    this._childIds = payload.childIds || null;
    this._parentNode = null;
  }

  /**
   * @return {boolean}
   */
  ignored() {
    return this._ignored;
  }

  /**
   * @return {?Array<!Protocol.Accessibility.AXProperty>}
   */
  ignoredReasons() {
    return this._ignoredReasons || null;
  }

  /**
   * @return {?Protocol.Accessibility.AXValue}
   */
  role() {
    return this._role || null;
  }

  /**
   * @return {!Array<!Protocol.Accessibility.AXProperty>}
   */
  coreProperties() {
    var properties = [];

    if (this._name)
      properties.push(/** @type {!Protocol.Accessibility.AXProperty} */ ({name: 'name', value: this._name}));
    if (this._description) {
      properties.push(
          /** @type {!Protocol.Accessibility.AXProperty} */ ({name: 'description', value: this._description}));
    }
    if (this._value)
      properties.push(/** @type {!Protocol.Accessibility.AXProperty} */ ({name: 'value', value: this._value}));

    return properties;
  }

  /**
   * @return {?Protocol.Accessibility.AXValue}
   */
  name() {
    return this._name || null;
  }

  /**
   * @return {?Protocol.Accessibility.AXValue}
   */
  description() {
    return this._description || null;
  }

  /**
   * @return {?Protocol.Accessibility.AXValue}
   */
  value() {
    return this._value || null;
  }

  /**
   * @return {?Array<!Protocol.Accessibility.AXProperty>}
   */
  properties() {
    return this._properties || null;
  }

  /**
   * @return {?Accessibility.AccessibilityNode}
   */
  parentNode() {
    return this._parentNode;
  }

  /**
   * @param {?Accessibility.AccessibilityNode} parentNode
   */
  _setParentNode(parentNode) {
    this._parentNode = parentNode;
  }

  /**
   * @return {boolean}
   */
  isDOMNode() {
    return !!this._backendDOMNodeId;
  }

  /**
   * @return {?number}
   */
  backendDOMNodeId() {
    return this._backendDOMNodeId;
  }

  /**
   * @return {?SDK.DeferredDOMNode}
   */
  deferredDOMNode() {
    return this._deferredDOMNode;
  }

  highlightDOMNode() {
    if (!this.isDOMNode())
      return;
    this.deferredDOMNode().resolvePromise().then(node => {
      SDK.DOMModel.fromTarget(this.target()).nodeHighlightRequested(node.id);
    });
  }

  /**
   * @return {!Array<!Accessibility.AccessibilityNode>}
   */
  children() {
    var children = [];
    if (!this._childIds)
      return children;

    for (var childId of this._childIds) {
      var child = this._accessibilityModel.axNodeForId(childId);
      if (child)
        children.push(child);
    }

    return children;
  }

  /**
   * @return {number}
   */
  numChildren() {
    if (!this._childIds)
      return 0;
    return this._childIds.length;
  }

  /**
   * @return {boolean}
   */
  hasOnlyUnloadedChildren() {
    if (!this._childIds || !this._childIds.length)
      return false;

    return !this._childIds.some(id => this._accessibilityModel.axNodeForId(id) !== undefined);
  }

  /**
   * TODO(aboxhall): Remove once protocol is stable.
   * @param {!Accessibility.AccessibilityNode} inspectedNode
   * @param {string=} leadingSpace
   * @return {string}
   */
  printSelfAndChildren(inspectedNode, leadingSpace) {
    var string = leadingSpace || '';
    if (this._role)
      string += this._role.value;
    else
      string += '<no role>';
    string += (this._name ? ' ' + this._name.value : '');
    string += ' ' + this._id;
    if (this._domNode)
      string += ' (' + this._domNode.nodeName() + ')';
    if (this === inspectedNode)
      string += ' *';
    for (var child of this.children())
      string += '\n' + child.printSelfAndChildren(inspectedNode, (leadingSpace || '') + '  ');
    return string;
  }
};

/**
 * @unrestricted
 */
Accessibility.AccessibilityModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.accessibilityAgent();

    /** @type {!Map<string, !Accessibility.AccessibilityNode>} */
    this._axIdToAXNode = new Map();
    this._backendDOMNodeIdToAXNode = new Map();
  }

  /**
   * @param {!SDK.Target} target
   * @return {?Accessibility.AccessibilityModel}
   */
  static fromTarget(target) {
    return target.model(Accessibility.AccessibilityModel);
  }

  clear() {
    this._axIdToAXNode.clear();
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {!Promise}
   */
  requestPartialAXTree(node) {
    /**
     * @this {Accessibility.AccessibilityModel}
     * @param {?string} error
     * @param {!Array<!Protocol.Accessibility.AXNode>=} payloads
     */
    function parsePayload(error, payloads) {
      if (error) {
        console.error('AccessibilityAgent.getAXNodeChain(): ' + error);
        return null;
      }

      if (!payloads)
        return;

      for (var payload of payloads)
        new Accessibility.AccessibilityNode(this, payload);

      for (var axNode of this._axIdToAXNode.values()) {
        for (var axChild of axNode.children())
          axChild._setParentNode(axNode);
      }
    }
    return this._agent.getPartialAXTree(node.id, true, parsePayload.bind(this));
  }

  /**
   * @param {string} axId
   * @return {?Accessibility.AccessibilityNode}
   */
  axNodeForId(axId) {
    return this._axIdToAXNode.get(axId);
  }

  /**
   * @param {string} axId
   * @param {!Accessibility.AccessibilityNode} axNode
   */
  _setAXNodeForAXId(axId, axNode) {
    this._axIdToAXNode.set(axId, axNode);
  }

  /**
   * @param {?SDK.DOMNode} domNode
   * @return {?Accessibility.AccessibilityNode}
   */
  axNodeForDOMNode(domNode) {
    if (!domNode)
      return null;
    return this._backendDOMNodeIdToAXNode.get(domNode.backendNodeId());
  }

  /**
   * @param {number} backendDOMNodeId
   * @param {!Accessibility.AccessibilityNode} axNode
   */
  _setAXNodeForBackendDOMNodeId(backendDOMNodeId, axNode) {
    this._backendDOMNodeIdToAXNode.set(backendDOMNodeId, axNode);
  }

  // TODO(aboxhall): Remove once protocol is stable.
  /**
   * @param {!SDK.DOMNode} inspectedNode
   */
  logTree(inspectedNode) {
    var rootNode = inspectedNode;
    while (rootNode.parentNode())
      rootNode = rootNode.parentNode();
    console.log(rootNode.printSelfAndChildren(inspectedNode));  // eslint-disable-line no-console
  }
};

SDK.SDKModel.register(Accessibility.AccessibilityModel, SDK.Target.Capability.DOM);
