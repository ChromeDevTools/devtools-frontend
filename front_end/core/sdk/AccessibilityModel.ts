// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import type {DOMNode} from './DOMModel.js';
import {DeferredDOMNode} from './DOMModel.js';
import type {Target} from './Target.js';
import {Capability} from './Target.js';
import {SDKModel} from './SDKModel.js';

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
  private readonly accessibilityModelInternal: AccessibilityModel;
  private readonly agent: ProtocolProxyApi.AccessibilityApi;
  private readonly idInternal: Protocol.Accessibility.AXNodeId;
  private readonly backendDOMNodeIdInternal: number|null;
  private readonly deferredDOMNodeInternal: DeferredDOMNode|null;
  private readonly ignoredInternal: boolean;
  private readonly ignoredReasonsInternal: Protocol.Accessibility.AXProperty[]|undefined;
  private readonly roleInternal: Protocol.Accessibility.AXValue|null;
  private readonly nameInternal: Protocol.Accessibility.AXValue|null;
  private readonly descriptionInternal: Protocol.Accessibility.AXValue|null;
  private readonly valueInternal: Protocol.Accessibility.AXValue|null;
  private readonly propertiesInternal: Protocol.Accessibility.AXProperty[]|null;
  private childIds: string[]|null;
  private parentNodeInternal: AccessibilityNode|null;

  constructor(accessibilityModel: AccessibilityModel, payload: Protocol.Accessibility.AXNode) {
    this.accessibilityModelInternal = accessibilityModel;
    this.agent = accessibilityModel.getAgent();

    this.idInternal = payload.nodeId;
    accessibilityModel.setAXNodeForAXId(this.idInternal, this);
    if (payload.backendDOMNodeId) {
      accessibilityModel.setAXNodeForBackendDOMNodeId(payload.backendDOMNodeId, this);
      this.backendDOMNodeIdInternal = payload.backendDOMNodeId;
      this.deferredDOMNodeInternal = new DeferredDOMNode(accessibilityModel.target(), payload.backendDOMNodeId);
    } else {
      this.backendDOMNodeIdInternal = null;
      this.deferredDOMNodeInternal = null;
    }
    this.ignoredInternal = payload.ignored;
    if (this.ignoredInternal && 'ignoredReasons' in payload) {
      this.ignoredReasonsInternal = payload.ignoredReasons;
    }

    this.roleInternal = payload.role || null;
    this.nameInternal = payload.name || null;
    this.descriptionInternal = payload.description || null;
    this.valueInternal = payload.value || null;
    this.propertiesInternal = payload.properties || null;
    this.childIds = payload.childIds || null;
    this.parentNodeInternal = null;
  }

  id(): Protocol.Accessibility.AXNodeId {
    return this.idInternal;
  }

  accessibilityModel(): AccessibilityModel {
    return this.accessibilityModelInternal;
  }

  ignored(): boolean {
    return this.ignoredInternal;
  }

  ignoredReasons(): Protocol.Accessibility.AXProperty[]|null {
    return this.ignoredReasonsInternal || null;
  }

  role(): Protocol.Accessibility.AXValue|null {
    return this.roleInternal || null;
  }

  coreProperties(): CoreOrProtocolAxProperty[] {
    const properties: CoreOrProtocolAxProperty[] = [];

    if (this.nameInternal) {
      properties.push({name: CoreAxPropertyName.Name, value: this.nameInternal});
    }
    if (this.descriptionInternal) {
      properties.push({name: CoreAxPropertyName.Description, value: this.descriptionInternal});
    }
    if (this.valueInternal) {
      properties.push({name: CoreAxPropertyName.Value, value: this.valueInternal});
    }

    return properties;
  }

  name(): Protocol.Accessibility.AXValue|null {
    return this.nameInternal || null;
  }

  description(): Protocol.Accessibility.AXValue|null {
    return this.descriptionInternal || null;
  }

  value(): Protocol.Accessibility.AXValue|null {
    return this.valueInternal || null;
  }

  properties(): Protocol.Accessibility.AXProperty[]|null {
    return this.propertiesInternal || null;
  }

  parentNode(): AccessibilityNode|null {
    return this.parentNodeInternal;
  }

  setParentNode(parentNode: AccessibilityNode|null): void {
    this.parentNodeInternal = parentNode;
  }

  isDOMNode(): boolean {
    return Boolean(this.backendDOMNodeIdInternal);
  }

  backendDOMNodeId(): number|null {
    return this.backendDOMNodeIdInternal;
  }

  deferredDOMNode(): DeferredDOMNode|null {
    return this.deferredDOMNodeInternal;
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
    if (!this.childIds) {
      return [];
    }

    const children = [];
    for (const childId of this.childIds) {
      const child = this.accessibilityModelInternal.axNodeForId(childId);
      if (child) {
        children.push(child);
      }
    }

    return children;
  }

  numChildren(): number {
    if (!this.childIds) {
      return 0;
    }
    return this.childIds.length;
  }

  hasOnlyUnloadedChildren(): boolean {
    if (!this.childIds || !this.childIds.length) {
      return false;
    }

    return this.childIds.every(id => this.accessibilityModelInternal.axNodeForId(id) === null);
  }
}

export class AccessibilityModel extends SDKModel<void> {
  agent: ProtocolProxyApi.AccessibilityApi;
  private axIdToAXNode: Map<string, AccessibilityNode>;
  private readonly backendDOMNodeIdToAXNode: Map<Protocol.DOM.BackendNodeId, AccessibilityNode>;

  constructor(target: Target) {
    super(target);
    this.agent = target.accessibilityAgent();
    this.resumeModel();

    this.axIdToAXNode = new Map();
    this.backendDOMNodeIdToAXNode = new Map();
  }

  clear(): void {
    this.axIdToAXNode.clear();
  }

  async resumeModel(): Promise<void> {
    await this.agent.invoke_enable();
  }

  async suspendModel(): Promise<void> {
    await this.agent.invoke_disable();
  }

  async requestPartialAXTree(node: DOMNode): Promise<void> {
    const {nodes} = await this.agent.invoke_getPartialAXTree(
        {nodeId: node.id, backendNodeId: undefined, objectId: undefined, fetchRelatives: true});
    if (!nodes) {
      return;
    }

    for (const payload of nodes) {
      new AccessibilityNode(this, payload);
    }

    for (const axNode of this.axIdToAXNode.values()) {
      for (const axChild of axNode.children()) {
        axChild.setParentNode(axNode);
      }
    }
  }

  async requestRootNode(depth: number = 2): Promise<AccessibilityNode|undefined> {
    const {nodes} = await this.agent.invoke_getFullAXTree({max_depth: depth});
    if (!nodes) {
      return;
    }

    const axNodes = nodes.map(node => new AccessibilityNode(this, node));

    for (const axNode of this.axIdToAXNode.values()) {
      for (const axChild of axNode.children()) {
        axChild.setParentNode(axNode);
      }
    }

    return axNodes[0];
  }

  async requestAXChildren(nodeId: Protocol.Accessibility.AXNodeId): Promise<AccessibilityNode[]> {
    const {nodes} = await this.agent.invoke_getChildAXNodes({id: nodeId});
    if (!nodes) {
      return [];
    }

    const axNodes = [];
    for (const payload of nodes) {
      if (!this.axIdToAXNode.has(payload.nodeId)) {
        axNodes.push(new AccessibilityNode(this, payload));
      }
    }

    for (const axNode of this.axIdToAXNode.values()) {
      for (const axChild of axNode.children()) {
        axChild.setParentNode(axNode);
      }
    }

    return axNodes;
  }

  async requestAndLoadSubTreeToNode(node: DOMNode): Promise<AccessibilityNode|null> {
    // Node may have already been loaded, so don't bother requesting it again.
    const loadedAXNode = this.axNodeForDOMNode(node);
    if (loadedAXNode) {
      return loadedAXNode;
    }

    const {nodes} = await this.agent.invoke_getPartialAXTree(
        {nodeId: node.id, backendNodeId: undefined, objectId: undefined, fetchRelatives: true});
    if (!nodes) {
      return null;
    }

    const ancestors = [];
    for (const payload of nodes) {
      if (!this.axIdToAXNode.has(payload.nodeId)) {
        ancestors.push(new AccessibilityNode(this, payload));
      }
    }

    for (const axNode of this.axIdToAXNode.values()) {
      for (const axChild of axNode.children()) {
        axChild.setParentNode(axNode);
      }
    }

    // Request top level children nodes.
    for (const node of ancestors) {
      await this.requestAXChildren(node.id());
    }

    return this.axNodeForDOMNode(node);
  }

  axNodeForId(axId: string): AccessibilityNode|null {
    return this.axIdToAXNode.get(axId) || null;
  }

  setAXNodeForAXId(axId: string, axNode: AccessibilityNode): void {
    this.axIdToAXNode.set(axId, axNode);
  }

  axNodeForDOMNode(domNode: DOMNode|null): AccessibilityNode|null {
    if (!domNode) {
      return null;
    }
    return this.backendDOMNodeIdToAXNode.get(domNode.backendNodeId()) ?? null;
  }

  setAXNodeForBackendDOMNodeId(backendDOMNodeId: Protocol.DOM.BackendNodeId, axNode: AccessibilityNode): void {
    this.backendDOMNodeIdToAXNode.set(backendDOMNodeId, axNode);
  }

  getAgent(): ProtocolProxyApi.AccessibilityApi {
    return this.agent;
  }
}

SDKModel.register(AccessibilityModel, {capabilities: Capability.DOM, autostart: false});
