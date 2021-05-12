// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Protocol from '../../generated/protocol.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import type {DOMNode} from './DOMModel.js';
import {DeferredDOMNode} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import type {Target} from './SDKModel.js';
import {Capability, SDKModel} from './SDKModel.js';  // eslint-disable-line no-unused-vars

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum CoreAxPropertyName {
  Name = 'name',
  Description = 'description',
  Value = 'value',
  Role = 'role',
}

export interface CoreOrProtocolAxProperty {
  name: CoreAxPropertyName|Protocol.Accessibility.AXPropertyName;
  value: Protocol.Accessibility.AXValue;
}

export class AccessibilityNode {
  _accessibilityModel: AccessibilityModel;
  _agent: ProtocolProxyApi.AccessibilityApi;
  _id: string;
  _backendDOMNodeId: number|null;
  _deferredDOMNode: DeferredDOMNode|null;
  _ignored: boolean;
  _ignoredReasons: Protocol.Accessibility.AXProperty[]|undefined;
  _role: Protocol.Accessibility.AXValue|null;
  _name: Protocol.Accessibility.AXValue|null;
  _description: Protocol.Accessibility.AXValue|null;
  _value: Protocol.Accessibility.AXValue|null;
  _properties: Protocol.Accessibility.AXProperty[]|null;
  _childIds: string[]|null;
  _parentNode: AccessibilityNode|null;

  constructor(accessibilityModel: AccessibilityModel, payload: Protocol.Accessibility.AXNode) {
    this._accessibilityModel = accessibilityModel;
    this._agent = accessibilityModel._agent;

    this._id = payload.nodeId;
    accessibilityModel._setAXNodeForAXId(this._id, this);
    if (payload.backendDOMNodeId) {
      accessibilityModel._setAXNodeForBackendDOMNodeId(payload.backendDOMNodeId, this);
      this._backendDOMNodeId = payload.backendDOMNodeId;
      this._deferredDOMNode = new DeferredDOMNode(accessibilityModel.target(), payload.backendDOMNodeId);
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

  id(): string {
    return this._id;
  }

  accessibilityModel(): AccessibilityModel {
    return this._accessibilityModel;
  }

  ignored(): boolean {
    return this._ignored;
  }

  ignoredReasons(): Protocol.Accessibility.AXProperty[]|null {
    return this._ignoredReasons || null;
  }

  role(): Protocol.Accessibility.AXValue|null {
    return this._role || null;
  }

  coreProperties(): CoreOrProtocolAxProperty[] {
    const properties: CoreOrProtocolAxProperty[] = [];

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

  name(): Protocol.Accessibility.AXValue|null {
    return this._name || null;
  }

  description(): Protocol.Accessibility.AXValue|null {
    return this._description || null;
  }

  value(): Protocol.Accessibility.AXValue|null {
    return this._value || null;
  }

  properties(): Protocol.Accessibility.AXProperty[]|null {
    return this._properties || null;
  }

  parentNode(): AccessibilityNode|null {
    return this._parentNode;
  }

  _setParentNode(parentNode: AccessibilityNode|null): void {
    this._parentNode = parentNode;
  }

  isDOMNode(): boolean {
    return Boolean(this._backendDOMNodeId);
  }

  backendDOMNodeId(): number|null {
    return this._backendDOMNodeId;
  }

  deferredDOMNode(): DeferredDOMNode|null {
    return this._deferredDOMNode;
  }

  highlightDOMNode(): void {
    const deferredNode = this.deferredDOMNode();
    if (!deferredNode) {
      return;
    }
    // Highlight node in page.
    deferredNode.highlight();
  }

  children(): AccessibilityNode[] {
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

  numChildren(): number {
    if (!this._childIds) {
      return 0;
    }
    return this._childIds.length;
  }

  hasOnlyUnloadedChildren(): boolean {
    if (!this._childIds || !this._childIds.length) {
      return false;
    }

    return !this._childIds.some(id => this._accessibilityModel.axNodeForId(id) !== null);
  }
}

export class AccessibilityModel extends SDKModel {
  _agent: ProtocolProxyApi.AccessibilityApi;
  _axIdToAXNode: Map<string, AccessibilityNode>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _backendDOMNodeIdToAXNode: Map<any, any>;
  constructor(target: Target) {
    super(target);
    this._agent = target.accessibilityAgent();
    this.resumeModel();

    this._axIdToAXNode = new Map();
    this._backendDOMNodeIdToAXNode = new Map();
  }

  clear(): void {
    this._axIdToAXNode.clear();
  }

  async resumeModel(): Promise<void> {
    await this._agent.invoke_enable();
  }

  async suspendModel(): Promise<void> {
    await this._agent.invoke_disable();
  }

  async requestPartialAXTree(node: DOMNode): Promise<void> {
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

  async requestRootNode(depth: number = 2): Promise<AccessibilityNode|undefined> {
    const {nodes} = await this._agent.invoke_getFullAXTree({max_depth: depth});
    if (!nodes) {
      return;
    }

    const axNodes = nodes.map(node => new AccessibilityNode(this, node));

    for (const axNode of this._axIdToAXNode.values()) {
      for (const axChild of axNode.children()) {
        axChild._setParentNode(axNode);
      }
    }

    return axNodes[0];
  }

  async requestAXChildren(nodeId: string): Promise<AccessibilityNode[]> {
    const {nodes} = await this._agent.invoke_getChildAXNodes({id: nodeId});
    if (!nodes) {
      return [];
    }

    const axNodes = [];
    for (const payload of nodes) {
      if (!this._axIdToAXNode.has(payload.nodeId)) {
        axNodes.push(new AccessibilityNode(this, payload));
      }
    }

    for (const axNode of this._axIdToAXNode.values()) {
      for (const axChild of axNode.children()) {
        axChild._setParentNode(axNode);
      }
    }

    return axNodes;
  }

  /**
   *
   * @param {!DOMNode} node
   * @return ?{!Promise<!AccessibilityNode[]>}
   */

  async requestAndLoadSubTreeToNode(node: DOMNode): Promise<AccessibilityNode|null> {
    // Node may have already been loaded, so don't bother requesting it again.
    const loadedAXNode = this.axNodeForDOMNode(node);
    if (loadedAXNode) {
      return loadedAXNode;
    }

    const {nodes} = await this._agent.invoke_getPartialAXTree(
        {nodeId: node.id, backendNodeId: undefined, objectId: undefined, fetchRelatives: true});
    if (!nodes) {
      return null;
    }

    const ancestors = [];
    for (const payload of nodes) {
      if (!this._axIdToAXNode.has(payload.nodeId)) {
        ancestors.push(new AccessibilityNode(this, payload));
      }
    }

    for (const axNode of this._axIdToAXNode.values()) {
      for (const axChild of axNode.children()) {
        axChild._setParentNode(axNode);
      }
    }

    // Request top level children nodes.
    for (const node of ancestors) {
      await this.requestAXChildren(node.id());
    }

    return this.axNodeForDOMNode(node);
  }

  /**
   * @param {string} axId
   * @return {?AccessibilityNode}
   */
  axNodeForId(axId: string): AccessibilityNode|null {
    return this._axIdToAXNode.get(axId) || null;
  }

  _setAXNodeForAXId(axId: string, axNode: AccessibilityNode): void {
    this._axIdToAXNode.set(axId, axNode);
  }

  axNodeForDOMNode(domNode: DOMNode|null): AccessibilityNode|null {
    if (!domNode) {
      return null;
    }
    return this._backendDOMNodeIdToAXNode.get(domNode.backendNodeId());
  }

  _setAXNodeForBackendDOMNodeId(backendDOMNodeId: number, axNode: AccessibilityNode): void {
    this._backendDOMNodeIdToAXNode.set(backendDOMNodeId, axNode);
  }
}

SDKModel.register(AccessibilityModel, {capabilities: Capability.DOM, autostart: false});
