// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import {DeferredDOMNode, type DOMNode} from './DOMModel.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

export const enum CoreAxPropertyName {
  NAME = 'name',
  DESCRIPTION = 'description',
  VALUE = 'value',
  ROLE = 'role',
}

export interface CoreOrProtocolAxProperty {
  name: CoreAxPropertyName|Protocol.Accessibility.AXPropertyName;
  value: Protocol.Accessibility.AXValue;
}

export class AccessibilityNode {
  readonly #accessibilityModelInternal: AccessibilityModel;
  readonly #idInternal: Protocol.Accessibility.AXNodeId;
  readonly #backendDOMNodeIdInternal: Protocol.DOM.BackendNodeId|null;
  readonly #deferredDOMNodeInternal: DeferredDOMNode|null;
  readonly #ignoredInternal: boolean;
  readonly #ignoredReasonsInternal: Protocol.Accessibility.AXProperty[]|undefined;
  readonly #roleInternal: Protocol.Accessibility.AXValue|null;
  readonly #nameInternal: Protocol.Accessibility.AXValue|null;
  readonly #descriptionInternal: Protocol.Accessibility.AXValue|null;
  readonly #valueInternal: Protocol.Accessibility.AXValue|null;
  readonly #propertiesInternal: Protocol.Accessibility.AXProperty[]|null;
  readonly #parentId: Protocol.Accessibility.AXNodeId|null;
  readonly #frameId: Protocol.Page.FrameId|null;
  readonly #childIds: Protocol.Accessibility.AXNodeId[]|null;

  constructor(accessibilityModel: AccessibilityModel, payload: Protocol.Accessibility.AXNode) {
    this.#accessibilityModelInternal = accessibilityModel;

    this.#idInternal = payload.nodeId;
    accessibilityModel.setAXNodeForAXId(this.#idInternal, this);
    if (payload.backendDOMNodeId) {
      accessibilityModel.setAXNodeForBackendDOMNodeId(payload.backendDOMNodeId, this);
      this.#backendDOMNodeIdInternal = payload.backendDOMNodeId;
      this.#deferredDOMNodeInternal = new DeferredDOMNode(accessibilityModel.target(), payload.backendDOMNodeId);
    } else {
      this.#backendDOMNodeIdInternal = null;
      this.#deferredDOMNodeInternal = null;
    }
    this.#ignoredInternal = payload.ignored;
    if (this.#ignoredInternal && 'ignoredReasons' in payload) {
      this.#ignoredReasonsInternal = payload.ignoredReasons;
    }

    this.#roleInternal = payload.role || null;
    this.#nameInternal = payload.name || null;
    this.#descriptionInternal = payload.description || null;
    this.#valueInternal = payload.value || null;
    this.#propertiesInternal = payload.properties || null;
    this.#childIds = [...new Set(payload.childIds)] || null;
    this.#parentId = payload.parentId || null;
    if (payload.frameId && !payload.parentId) {
      this.#frameId = payload.frameId;
      accessibilityModel.setRootAXNodeForFrameId(payload.frameId, this);
    } else {
      this.#frameId = null;
    }
  }

  id(): Protocol.Accessibility.AXNodeId {
    return this.#idInternal;
  }

  accessibilityModel(): AccessibilityModel {
    return this.#accessibilityModelInternal;
  }

  ignored(): boolean {
    return this.#ignoredInternal;
  }

  ignoredReasons(): Protocol.Accessibility.AXProperty[]|null {
    return this.#ignoredReasonsInternal || null;
  }

  role(): Protocol.Accessibility.AXValue|null {
    return this.#roleInternal || null;
  }

  coreProperties(): CoreOrProtocolAxProperty[] {
    const properties: CoreOrProtocolAxProperty[] = [];

    if (this.#nameInternal) {
      properties.push({name: CoreAxPropertyName.NAME, value: this.#nameInternal});
    }
    if (this.#descriptionInternal) {
      properties.push({name: CoreAxPropertyName.DESCRIPTION, value: this.#descriptionInternal});
    }
    if (this.#valueInternal) {
      properties.push({name: CoreAxPropertyName.VALUE, value: this.#valueInternal});
    }

    return properties;
  }

  name(): Protocol.Accessibility.AXValue|null {
    return this.#nameInternal || null;
  }

  description(): Protocol.Accessibility.AXValue|null {
    return this.#descriptionInternal || null;
  }

  value(): Protocol.Accessibility.AXValue|null {
    return this.#valueInternal || null;
  }

  properties(): Protocol.Accessibility.AXProperty[]|null {
    return this.#propertiesInternal || null;
  }

  parentNode(): AccessibilityNode|null {
    if (this.#parentId) {
      return this.#accessibilityModelInternal.axNodeForId(this.#parentId);
    }
    return null;
  }

  isDOMNode(): boolean {
    return Boolean(this.#backendDOMNodeIdInternal);
  }

  backendDOMNodeId(): Protocol.DOM.BackendNodeId|null {
    return this.#backendDOMNodeIdInternal;
  }

  deferredDOMNode(): DeferredDOMNode|null {
    return this.#deferredDOMNodeInternal;
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
    if (!this.#childIds) {
      return [];
    }

    const children = [];
    for (const childId of this.#childIds) {
      const child = this.#accessibilityModelInternal.axNodeForId(childId);
      if (child) {
        children.push(child);
      }
    }

    return children;
  }

  numChildren(): number {
    if (!this.#childIds) {
      return 0;
    }
    return this.#childIds.length;
  }

  hasOnlyUnloadedChildren(): boolean {
    if (!this.#childIds || !this.#childIds.length) {
      return false;
    }
    return this.#childIds.every(id => this.#accessibilityModelInternal.axNodeForId(id) === null);
  }

  hasUnloadedChildren(): boolean {
    if (!this.#childIds || !this.#childIds.length) {
      return false;
    }
    return this.#childIds.some(id => this.#accessibilityModelInternal.axNodeForId(id) === null);
  }
  // Only the root node gets a frameId, so nodes have to walk up the tree to find their frameId.
  getFrameId(): Protocol.Page.FrameId|null {
    return this.#frameId || this.parentNode()?.getFrameId() || null;
  }
}

export const enum Events {
  TREE_UPDATED = 'TreeUpdated',
}

export type EventTypes = {
  [Events.TREE_UPDATED]: {root?: AccessibilityNode},
};

export class AccessibilityModel extends SDKModel<EventTypes> implements ProtocolProxyApi.AccessibilityDispatcher {
  agent: ProtocolProxyApi.AccessibilityApi;
  #axIdToAXNode: Map<string, AccessibilityNode>;
  #backendDOMNodeIdToAXNode: Map<Protocol.DOM.BackendNodeId, AccessibilityNode>;
  #frameIdToAXNode: Map<Protocol.Page.FrameId, AccessibilityNode>;
  #pendingChildRequests: Map<string, Promise<Protocol.Accessibility.GetChildAXNodesResponse>>;
  #root: AccessibilityNode|null;

  constructor(target: Target) {
    super(target);
    target.registerAccessibilityDispatcher(this);
    this.agent = target.accessibilityAgent();
    void this.resumeModel();

    this.#axIdToAXNode = new Map();
    this.#backendDOMNodeIdToAXNode = new Map();
    this.#frameIdToAXNode = new Map();
    this.#pendingChildRequests = new Map();
    this.#root = null;
  }

  clear(): void {
    this.#root = null;
    this.#axIdToAXNode.clear();
    this.#backendDOMNodeIdToAXNode.clear();
    this.#frameIdToAXNode.clear();
  }

  override async resumeModel(): Promise<void> {
    await this.agent.invoke_enable();
  }

  override async suspendModel(): Promise<void> {
    await this.agent.invoke_disable();
  }

  async requestPartialAXTree(node: DOMNode): Promise<void> {
    const {nodes} = await this.agent.invoke_getPartialAXTree({nodeId: node.id, fetchRelatives: true});
    if (!nodes) {
      return;
    }
    const axNodes = [];
    for (const payload of nodes) {
      axNodes.push(new AccessibilityNode(this, payload));
    }
  }

  loadComplete({root}: Protocol.Accessibility.LoadCompleteEvent): void {
    this.clear();
    this.#root = new AccessibilityNode(this, root);
    this.dispatchEventToListeners(Events.TREE_UPDATED, {root: this.#root});
  }

  nodesUpdated({nodes}: Protocol.Accessibility.NodesUpdatedEvent): void {
    this.createNodesFromPayload(nodes);
    this.dispatchEventToListeners(Events.TREE_UPDATED, {});
    return;
  }

  private createNodesFromPayload(payloadNodes: Protocol.Accessibility.AXNode[]): AccessibilityNode[] {
    const accessibilityNodes = payloadNodes.map(node => {
      const sdkNode = new AccessibilityNode(this, node);
      return sdkNode;
    });

    return accessibilityNodes;
  }

  async requestRootNode(frameId?: Protocol.Page.FrameId): Promise<AccessibilityNode|undefined> {
    if (frameId && this.#frameIdToAXNode.has(frameId)) {
      return this.#frameIdToAXNode.get(frameId);
    }
    if (!frameId && this.#root) {
      return this.#root;
    }
    const {node} = await this.agent.invoke_getRootAXNode({frameId});
    if (!node) {
      return;
    }
    return this.createNodesFromPayload([node])[0];
  }

  async requestAXChildren(nodeId: Protocol.Accessibility.AXNodeId, frameId?: Protocol.Page.FrameId):
      Promise<AccessibilityNode[]> {
    const parent = this.#axIdToAXNode.get(nodeId);
    if (!parent) {
      throw Error('Cannot request children before parent');
    }
    if (!parent.hasUnloadedChildren()) {
      return parent.children();
    }

    const request = this.#pendingChildRequests.get(nodeId);
    if (request) {
      await request;
    } else {
      const request = this.agent.invoke_getChildAXNodes({id: nodeId, frameId});
      this.#pendingChildRequests.set(nodeId, request);
      const result = await request;
      if (!result.getError()) {
        this.createNodesFromPayload(result.nodes);
        this.#pendingChildRequests.delete(nodeId);
      }
    }
    return parent.children();
  }

  async requestAndLoadSubTreeToNode(node: DOMNode): Promise<AccessibilityNode[]|null> {
    // Node may have already been loaded, so don't bother requesting it again.
    const result = [];
    let ancestor = this.axNodeForDOMNode(node);
    while (ancestor) {
      result.push(ancestor);
      const parent = ancestor.parentNode();
      if (!parent) {
        return result;
      }
      ancestor = parent;
    }
    const {nodes} = await this.agent.invoke_getAXNodeAndAncestors({backendNodeId: node.backendNodeId()});
    if (!nodes) {
      return null;
    }
    const ancestors = this.createNodesFromPayload(nodes);

    return ancestors;
  }

  axNodeForId(axId: Protocol.Accessibility.AXNodeId): AccessibilityNode|null {
    return this.#axIdToAXNode.get(axId) || null;
  }

  setRootAXNodeForFrameId(frameId: Protocol.Page.FrameId, axNode: AccessibilityNode): void {
    this.#frameIdToAXNode.set(frameId, axNode);
  }

  axNodeForFrameId(frameId: Protocol.Page.FrameId): AccessibilityNode|null {
    return this.#frameIdToAXNode.get(frameId) ?? null;
  }

  setAXNodeForAXId(axId: string, axNode: AccessibilityNode): void {
    this.#axIdToAXNode.set(axId, axNode);
  }

  axNodeForDOMNode(domNode: DOMNode|null): AccessibilityNode|null {
    if (!domNode) {
      return null;
    }
    return this.#backendDOMNodeIdToAXNode.get(domNode.backendNodeId()) ?? null;
  }

  setAXNodeForBackendDOMNodeId(backendDOMNodeId: Protocol.DOM.BackendNodeId, axNode: AccessibilityNode): void {
    this.#backendDOMNodeIdToAXNode.set(backendDOMNodeId, axNode);
  }

  getAgent(): ProtocolProxyApi.AccessibilityApi {
    return this.agent;
  }
}

SDKModel.register(AccessibilityModel, {capabilities: Capability.DOM, autostart: false});
