// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

/** @enum {string} */
export const CoreAxPropertyName = {
  Name: 'name',
  Description: 'description',
  Value: 'value',
  Role: 'role',
};

/** @typedef {{
 *   name: (CoreAxPropertyName | Protocol.Accessibility.AXPropertyName),
 *   value: Protocol.Accessibility.AXValue
 * }}
 */
// @ts-ignore typedef
export let CoreOrProtocolAxProperty;

/**
 * @unrestricted
 */
export class AccessibilityNode {
  /**
   * @param {!AccessibilityModel} accessibilityModel
   * @param {!Protocol.Accessibility.AXNode} payload
   */
  constructor(accessibilityModel, payload) {
    this._accessibilityModel = accessibilityModel;
    this._agent = accessibilityModel._agent;

    this._id = payload.nodeId;
    accessibilityModel._setAXNodeForAXId(this._id, this);
    if (payload.backendDOMNodeId) {
      accessibilityModel._setAXNodeForBackendDOMNodeId(payload.backendDOMNodeId, this);
      this._backendDOMNodeId = payload.backendDOMNodeId;
      this._deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(accessibilityModel.target(), payload.backendDOMNodeId);
    } else {
      this._backendDOMNodeId = null;
      this._deferredDOMNode = null;
    }
    this._ignored = payload.ignored;
    if (this._ignored && 'ignoredReasons' in payload) {
      this._ignoredReasons = payload.ignoredReasons;
    }

    this._role = payload.role || null;
    this._name = payload.name || null;
    this._description = payload.description || null;
    this._value = payload.value || null;
    this._properties = payload.properties || null;
    this._childIds = payload.childIds || null;
    this._parentNode = null;
  }

  /**
   * @return {!AccessibilityModel}
   */
  accessibilityModel() {
    return this._accessibilityModel;
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
   * @return {!Array<!CoreOrProtocolAxProperty>}
   */
  coreProperties() {
    /** @type {!Array<!CoreOrProtocolAxProperty>} */
    const properties = [];

    if (this._name) {
      properties.push({name: CoreAxPropertyName.Name, value: this._name});
    }
    if (this._description) {
      properties.push({name: CoreAxPropertyName.Description, value: this._description});
    }
    if (this._value) {
      properties.push({name: CoreAxPropertyName.Value, value: this._value});
    }

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
   * @return {?AccessibilityNode}
   */
  parentNode() {
    return this._parentNode;
  }

  /**
   * @param {?AccessibilityNode} parentNode
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
   * @return {?SDK.DOMModel.DeferredDOMNode}
   */
  deferredDOMNode() {
    return this._deferredDOMNode;
  }

  highlightDOMNode() {
    const deferredNode = this.deferredDOMNode();
    if (!deferredNode) {
      return;
    }
    // Highlight node in page.
    deferredNode.highlight();
  }

  /**
   * @return {!Array<!AccessibilityNode>}
   */
  children() {
    if (!this._childIds) {
      return [];
    }

    const children = [];
    for (const childId of this._childIds) {
      const child = this._accessibilityModel.axNodeForId(childId);
      if (child) {
        children.push(child);
      }
    }

    return children;
  }

  /**
   * @return {number}
   */
  numChildren() {
    if (!this._childIds) {
      return 0;
    }
    return this._childIds.length;
  }

  /**
   * @return {boolean}
   */
  hasOnlyUnloadedChildren() {
    if (!this._childIds || !this._childIds.length) {
      return false;
    }

    return !this._childIds.some(id => this._accessibilityModel.axNodeForId(id) !== undefined);
  }
}

/**
 * @unrestricted
 */
export class AccessibilityModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.accessibilityAgent();

    /** @type {!Map<string, !AccessibilityNode>} */
    this._axIdToAXNode = new Map();
    this._backendDOMNodeIdToAXNode = new Map();
  }

  clear() {
    this._axIdToAXNode.clear();
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!Promise<void>}
   */
  async requestPartialAXTree(node) {
    const {nodes} = await this._agent.invoke_getPartialAXTree(
        {nodeId: node.id, backendNodeId: undefined, objectId: undefined, fetchRelatives: true});
    if (!nodes) {
      return;
    }

    for (const payload of nodes) {
      new AccessibilityNode(this, payload);
    }

    for (const axNode of this._axIdToAXNode.values()) {
      for (const axChild of axNode.children()) {
        axChild._setParentNode(axNode);
      }
    }
  }

  /**
   * @param {string} axId
   * @return {?AccessibilityNode}
   */
  axNodeForId(axId) {
    return this._axIdToAXNode.get(axId) || null;
  }

  /**
   * @param {string} axId
   * @param {!AccessibilityNode} axNode
   */
  _setAXNodeForAXId(axId, axNode) {
    this._axIdToAXNode.set(axId, axNode);
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} domNode
   * @return {?AccessibilityNode}
   */
  axNodeForDOMNode(domNode) {
    if (!domNode) {
      return null;
    }
    return this._backendDOMNodeIdToAXNode.get(domNode.backendNodeId());
  }

  /**
   * @param {number} backendDOMNodeId
   * @param {!AccessibilityNode} axNode
   */
  _setAXNodeForBackendDOMNodeId(backendDOMNodeId, axNode) {
    this._backendDOMNodeIdToAXNode.set(backendDOMNodeId, axNode);
  }
}

SDK.SDKModel.SDKModel.register(AccessibilityModel, SDK.SDKModel.Capability.DOM, false);
