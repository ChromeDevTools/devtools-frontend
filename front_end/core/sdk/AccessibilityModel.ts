// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {DeferredDOMNode, type DOMNode} from './DOMModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

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
  readonly #accessibilityModel: AccessibilityModel;
  readonly #id: Protocol.Accessibility.AXNodeId;
  readonly #backendDOMNodeId: Protocol.DOM.BackendNodeId|null;
  readonly #deferredDOMNode: DeferredDOMNode|null;
  readonly #ignored: boolean;
  readonly #ignoredReasons: Protocol.Accessibility.AXProperty[]|undefined;
  readonly #role: Protocol.Accessibility.AXValue|null;
  readonly #name: Protocol.Accessibility.AXValue|null;
  readonly #description: Protocol.Accessibility.AXValue|null;
  readonly #value: Protocol.Accessibility.AXValue|null;
  readonly #properties: Protocol.Accessibility.AXProperty[]|null;
  readonly #parentId: Protocol.Accessibility.AXNodeId|null;
  readonly #frameId: Protocol.Page.FrameId|null;
  readonly #childIds: Protocol.Accessibility.AXNodeId[]|null;

  constructor(accessibilityModel: AccessibilityModel, payload: Protocol.Accessibility.AXNode) {
    this.#accessibilityModel = accessibilityModel;

    this.#id = payload.nodeId;
    accessibilityModel.setAXNodeForAXId(this.#id, this);
    if (payload.backendDOMNodeId) {
      accessibilityModel.setAXNodeForBackendDOMNodeId(payload.backendDOMNodeId, this);
      this.#backendDOMNodeId = payload.backendDOMNodeId;
      this.#deferredDOMNode = new DeferredDOMNode(accessibilityModel.target(), payload.backendDOMNodeId);
    } else {
      this.#backendDOMNodeId = null;
      this.#deferredDOMNode = null;
    }
    this.#ignored = payload.ignored;
    if (this.#ignored && 'ignoredReasons' in payload) {
      this.#ignoredReasons = payload.ignoredReasons;
    }

    this.#role = payload.role || null;
    this.#name = payload.name || null;
    this.#description = payload.description || null;
    this.#value = payload.value || null;
    this.#properties = payload.properties || null;
    this.#childIds = [...new Set(payload.childIds)];
    this.#parentId = payload.parentId || null;
    if (payload.frameId && !payload.parentId) {
      this.#frameId = payload.frameId;
      accessibilityModel.setRootAXNodeForFrameId(payload.frameId, this);
    } else {
      this.#frameId = null;
    }
  }

  id(): Protocol.Accessibility.AXNodeId {
    return this.#id;
  }

  accessibilityModel(): AccessibilityModel {
    return this.#accessibilityModel;
  }

  ignored(): boolean {
    return this.#ignored;
  }

  ignoredReasons(): Protocol.Accessibility.AXProperty[]|null {
    return this.#ignoredReasons || null;
  }

  role(): Protocol.Accessibility.AXValue|null {
    return this.#role || null;
  }

  coreProperties(): CoreOrProtocolAxProperty[] {
    const properties: CoreOrProtocolAxProperty[] = [];

    if (this.#name) {
      properties.push({name: CoreAxPropertyName.NAME, value: this.#name});
    }
    if (this.#description) {
      properties.push({name: CoreAxPropertyName.DESCRIPTION, value: this.#description});
    }
    if (this.#value) {
      properties.push({name: CoreAxPropertyName.VALUE, value: this.#value});
    }

    return properties;
  }

  name(): Protocol.Accessibility.AXValue|null {
    return this.#name || null;
  }

  description(): Protocol.Accessibility.AXValue|null {
    return this.#description || null;
  }

  value(): Protocol.Accessibility.AXValue|null {
    return this.#value || null;
  }

  properties(): Protocol.Accessibility.AXProperty[]|null {
    return this.#properties || null;
  }

  parentNode(): AccessibilityNode|null {
    if (this.#parentId) {
      return this.#accessibilityModel.axNodeForId(this.#parentId);
    }
    return null;
  }

  isDOMNode(): boolean {
    return Boolean(this.#backendDOMNodeId);
  }

  backendDOMNodeId(): Protocol.DOM.BackendNodeId|null {
    return this.#backendDOMNodeId;
  }

  deferredDOMNode(): DeferredDOMNode|null {
    return this.#deferredDOMNode;
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
      const child = this.#accessibilityModel.axNodeForId(childId);
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
    return this.#childIds.every(id => this.#accessibilityModel.axNodeForId(id) === null);
  }

  hasUnloadedChildren(): boolean {
    if (!this.#childIds || !this.#childIds.length) {
      return false;
    }
    return this.#childIds.some(id => this.#accessibilityModel.axNodeForId(id) === null);
  }
  // Only the root node gets a frameId, so nodes have to walk up the tree to find their frameId.
  getFrameId(): Protocol.Page.FrameId|null {
    return this.#frameId || this.parentNode()?.getFrameId() || null;
  }
}

export const enum Events {
  TREE_UPDATED = 'TreeUpdated',
}

export interface EventTypes {
  [Events.TREE_UPDATED]: {root?: AccessibilityNode};
}

export class AccessibilityModel extends SDKModel<EventTypes> implements ProtocolProxyApi.AccessibilityDispatcher {
  agent: ProtocolProxyApi.AccessibilityApi;
  #axIdToAXNode = new Map<string, AccessibilityNode>();
  #backendDOMNodeIdToAXNode = new Map<Protocol.DOM.BackendNodeId, AccessibilityNode>();
  #frameIdToAXNode = new Map<Protocol.Page.FrameId, AccessibilityNode>();
  #pendingChildRequests = new Map<string, Promise<Protocol.Accessibility.GetChildAXNodesResponse>>();
  #root: AccessibilityNode|null = null;

  constructor(target: Target) {
    super(target);
    target.registerAccessibilityDispatcher(this);
    this.agent = target.accessibilityAgent();
    void this.resumeModel();
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
      throw new Error('Cannot request children before parent');
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
