// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2009, 2010 Google Inc. All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the #name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {CSSModel} from './CSSModel.js';
import {FrameManager} from './FrameManager.js';
import {OverlayModel} from './OverlayModel.js';
import {RemoteObject} from './RemoteObject.js';
import {ResourceTreeModel} from './ResourceTreeModel.js';
import {RuntimeModel} from './RuntimeModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {TargetManager} from './TargetManager.js';

export class DOMNode {
  #domModelInternal: DOMModel;
  #agent: ProtocolProxyApi.DOMApi;
  ownerDocument!: DOMDocument|null;
  #isInShadowTreeInternal!: boolean;
  id!: Protocol.DOM.NodeId;
  index: number|undefined;
  #backendNodeIdInternal!: Protocol.DOM.BackendNodeId;
  #nodeTypeInternal!: number;
  #nodeNameInternal!: string;
  #localNameInternal!: string;
  nodeValueInternal!: string;
  #pseudoTypeInternal!: Protocol.DOM.PseudoType|undefined;
  #pseudoIdentifier?: string;
  #shadowRootTypeInternal!: Protocol.DOM.ShadowRootType|undefined;
  #frameOwnerFrameIdInternal!: Protocol.Page.FrameId|null;
  #xmlVersion!: string|undefined;
  #isSVGNodeInternal!: boolean;
  #isScrollableInternal!: boolean;
  #creationStackTraceInternal: Promise<Protocol.Runtime.StackTrace|null>|null;
  #pseudoElements: Map<string, DOMNode[]>;
  #distributedNodesInternal: DOMNodeShortcut[];
  assignedSlot: DOMNodeShortcut|null;
  readonly shadowRootsInternal: DOMNode[];
  #attributesInternal: Map<string, Attribute>;
  #markers: Map<string, unknown>;
  #subtreeMarkerCount: number;
  childNodeCountInternal!: number;
  childrenInternal: DOMNode[]|null;
  nextSibling: DOMNode|null;
  previousSibling: DOMNode|null;
  firstChild: DOMNode|null;
  lastChild: DOMNode|null;
  parentNode: DOMNode|null;
  templateContentInternal?: DOMNode;
  contentDocumentInternal?: DOMDocument;
  childDocumentPromiseForTesting?: Promise<DOMDocument|null>;
  #importedDocumentInternal?: DOMNode;
  publicId?: string;
  systemId?: string;
  internalSubset?: string;
  name?: string;
  value?: string;

  constructor(domModel: DOMModel) {
    this.#domModelInternal = domModel;
    this.#agent = this.#domModelInternal.getAgent();
    this.index = undefined;
    this.#creationStackTraceInternal = null;
    this.#pseudoElements = new Map();
    this.#distributedNodesInternal = [];
    this.assignedSlot = null;
    this.shadowRootsInternal = [];
    this.#attributesInternal = new Map();
    this.#markers = new Map();
    this.#subtreeMarkerCount = 0;
    this.childrenInternal = null;
    this.nextSibling = null;
    this.previousSibling = null;
    this.firstChild = null;
    this.lastChild = null;
    this.parentNode = null;
  }

  static create(domModel: DOMModel, doc: DOMDocument|null, isInShadowTree: boolean, payload: Protocol.DOM.Node):
      DOMNode {
    const node = new DOMNode(domModel);
    node.init(doc, isInShadowTree, payload);
    return node;
  }

  init(doc: DOMDocument|null, isInShadowTree: boolean, payload: Protocol.DOM.Node): void {
    this.#agent = this.#domModelInternal.getAgent();
    this.ownerDocument = doc;
    this.#isInShadowTreeInternal = isInShadowTree;

    this.id = payload.nodeId;
    this.#backendNodeIdInternal = payload.backendNodeId;
    this.#domModelInternal.registerNode(this);
    this.#nodeTypeInternal = payload.nodeType;
    this.#nodeNameInternal = payload.nodeName;
    this.#localNameInternal = payload.localName;
    this.nodeValueInternal = payload.nodeValue;
    this.#pseudoTypeInternal = payload.pseudoType;
    this.#pseudoIdentifier = payload.pseudoIdentifier;
    this.#shadowRootTypeInternal = payload.shadowRootType;
    this.#frameOwnerFrameIdInternal = payload.frameId || null;
    this.#xmlVersion = payload.xmlVersion;
    this.#isSVGNodeInternal = Boolean(payload.isSVG);
    this.#isScrollableInternal = Boolean(payload.isScrollable);

    if (payload.attributes) {
      this.setAttributesPayload(payload.attributes);
    }

    this.childNodeCountInternal = payload.childNodeCount || 0;
    if (payload.shadowRoots) {
      for (let i = 0; i < payload.shadowRoots.length; ++i) {
        const root = payload.shadowRoots[i];
        const node = DOMNode.create(this.#domModelInternal, this.ownerDocument, true, root);
        this.shadowRootsInternal.push(node);
        node.parentNode = this;
      }
    }

    if (payload.templateContent) {
      this.templateContentInternal =
          DOMNode.create(this.#domModelInternal, this.ownerDocument, true, payload.templateContent);
      this.templateContentInternal.parentNode = this;
      this.childrenInternal = [];
    }

    const frameOwnerTags = new Set(['EMBED', 'IFRAME', 'OBJECT', 'FENCEDFRAME']);
    if (payload.contentDocument) {
      this.contentDocumentInternal = new DOMDocument(this.#domModelInternal, payload.contentDocument);
      this.contentDocumentInternal.parentNode = this;
      this.childrenInternal = [];
    } else if (payload.frameId && frameOwnerTags.has(payload.nodeName)) {
      // At this point we know we are in an OOPIF, otherwise `payload.contentDocument` would have been set.
      this.childDocumentPromiseForTesting = this.requestChildDocument(payload.frameId, this.#domModelInternal.target());
      this.childrenInternal = [];
    }

    if (payload.importedDocument) {
      this.#importedDocumentInternal =
          DOMNode.create(this.#domModelInternal, this.ownerDocument, true, payload.importedDocument);
      this.#importedDocumentInternal.parentNode = this;
      this.childrenInternal = [];
    }

    if (payload.distributedNodes) {
      this.setDistributedNodePayloads(payload.distributedNodes);
    }

    if (payload.assignedSlot) {
      this.setAssignedSlot(payload.assignedSlot);
    }

    if (payload.children) {
      this.setChildrenPayload(payload.children);
    }

    this.setPseudoElements(payload.pseudoElements);

    if (this.#nodeTypeInternal === Node.ELEMENT_NODE) {
      // HTML and BODY from internal iframes should not overwrite top-level ones.
      if (this.ownerDocument && !this.ownerDocument.documentElement && this.#nodeNameInternal === 'HTML') {
        this.ownerDocument.documentElement = this;
      }
      if (this.ownerDocument && !this.ownerDocument.body && this.#nodeNameInternal === 'BODY') {
        this.ownerDocument.body = this;
      }
    } else if (this.#nodeTypeInternal === Node.DOCUMENT_TYPE_NODE) {
      this.publicId = payload.publicId;
      this.systemId = payload.systemId;
      this.internalSubset = payload.internalSubset;
    } else if (this.#nodeTypeInternal === Node.ATTRIBUTE_NODE) {
      this.name = payload.name;
      this.value = payload.value;
    }
  }

  private async requestChildDocument(frameId: Protocol.Page.FrameId, notInTarget: Target): Promise<DOMDocument|null> {
    const frame = await FrameManager.instance().getOrWaitForFrame(frameId, notInTarget);
    const childModel = frame.resourceTreeModel()?.target().model(DOMModel);
    return childModel?.requestDocument() || null;
  }

  isAdFrameNode(): boolean {
    if (this.isIframe() && this.#frameOwnerFrameIdInternal) {
      const frame = FrameManager.instance().getFrame(this.#frameOwnerFrameIdInternal);
      if (!frame) {
        return false;
      }
      return frame.adFrameType() !== Protocol.Page.AdFrameType.None;
    }
    return false;
  }

  isSVGNode(): boolean {
    return this.#isSVGNodeInternal;
  }

  isScrollable(): boolean {
    return this.#isScrollableInternal;
  }

  isMediaNode(): boolean {
    return this.#nodeNameInternal === 'AUDIO' || this.#nodeNameInternal === 'VIDEO';
  }

  isViewTransitionPseudoNode(): boolean {
    if (!this.#pseudoTypeInternal) {
      return false;
    }

    return [
      Protocol.DOM.PseudoType.ViewTransition,
      Protocol.DOM.PseudoType.ViewTransitionGroup,
      Protocol.DOM.PseudoType.ViewTransitionImagePair,
      Protocol.DOM.PseudoType.ViewTransitionOld,
      Protocol.DOM.PseudoType.ViewTransitionNew,
    ].includes(this.#pseudoTypeInternal);
  }

  creationStackTrace(): Promise<Protocol.Runtime.StackTrace|null> {
    if (this.#creationStackTraceInternal) {
      return this.#creationStackTraceInternal;
    }

    const stackTracesPromise = this.#agent.invoke_getNodeStackTraces({nodeId: this.id});
    this.#creationStackTraceInternal = stackTracesPromise.then(res => res.creation || null);
    return this.#creationStackTraceInternal;
  }

  get subtreeMarkerCount(): number {
    return this.#subtreeMarkerCount;
  }

  domModel(): DOMModel {
    return this.#domModelInternal;
  }

  backendNodeId(): Protocol.DOM.BackendNodeId {
    return this.#backendNodeIdInternal;
  }

  children(): DOMNode[]|null {
    return this.childrenInternal ? this.childrenInternal.slice() : null;
  }

  setChildren(children: DOMNode[]): void {
    this.childrenInternal = children;
  }

  setIsScrollable(isScrollable: boolean): void {
    this.#isScrollableInternal = isScrollable;
  }

  hasAttributes(): boolean {
    return this.#attributesInternal.size > 0;
  }

  childNodeCount(): number {
    return this.childNodeCountInternal;
  }

  setChildNodeCount(childNodeCount: number): void {
    this.childNodeCountInternal = childNodeCount;
  }

  hasShadowRoots(): boolean {
    return Boolean(this.shadowRootsInternal.length);
  }

  shadowRoots(): DOMNode[] {
    return this.shadowRootsInternal.slice();
  }

  templateContent(): DOMNode|null {
    return this.templateContentInternal || null;
  }

  contentDocument(): DOMDocument|null {
    return this.contentDocumentInternal || null;
  }

  setContentDocument(node: DOMDocument): void {
    this.contentDocumentInternal = node;
  }

  isIframe(): boolean {
    return this.#nodeNameInternal === 'IFRAME';
  }

  importedDocument(): DOMNode|null {
    return this.#importedDocumentInternal || null;
  }

  nodeType(): number {
    return this.#nodeTypeInternal;
  }

  nodeName(): string {
    return this.#nodeNameInternal;
  }

  pseudoType(): string|undefined {
    return this.#pseudoTypeInternal;
  }

  pseudoIdentifier(): string|undefined {
    return this.#pseudoIdentifier;
  }

  hasPseudoElements(): boolean {
    return this.#pseudoElements.size > 0;
  }

  pseudoElements(): Map<string, DOMNode[]> {
    return this.#pseudoElements;
  }

  beforePseudoElement(): DOMNode|undefined {
    return this.#pseudoElements.get(Protocol.DOM.PseudoType.Before)?.at(-1);
  }

  afterPseudoElement(): DOMNode|undefined {
    return this.#pseudoElements.get(Protocol.DOM.PseudoType.After)?.at(-1);
  }

  markerPseudoElement(): DOMNode|undefined {
    return this.#pseudoElements.get(Protocol.DOM.PseudoType.Marker)?.at(-1);
  }

  backdropPseudoElement(): DOMNode|undefined {
    return this.#pseudoElements.get(Protocol.DOM.PseudoType.Backdrop)?.at(-1);
  }

  viewTransitionPseudoElements(): DOMNode[] {
    return [
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransition) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransitionGroup) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransitionImagePair) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransitionOld) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransitionNew) || [],
    ];
  }

  hasAssignedSlot(): boolean {
    return this.assignedSlot !== null;
  }

  isInsertionPoint(): boolean {
    return !this.isXMLNode() &&
        (this.#nodeNameInternal === 'SHADOW' || this.#nodeNameInternal === 'CONTENT' ||
         this.#nodeNameInternal === 'SLOT');
  }

  distributedNodes(): DOMNodeShortcut[] {
    return this.#distributedNodesInternal;
  }

  isInShadowTree(): boolean {
    return this.#isInShadowTreeInternal;
  }

  ancestorShadowHost(): DOMNode|null {
    const ancestorShadowRoot = this.ancestorShadowRoot();
    return ancestorShadowRoot ? ancestorShadowRoot.parentNode : null;
  }

  ancestorShadowRoot(): DOMNode|null {
    if (!this.#isInShadowTreeInternal) {
      return null;
    }

    let current: (DOMNode|null) = (this as DOMNode | null);
    while (current && !current.isShadowRoot()) {
      current = current.parentNode;
    }
    return current;
  }

  ancestorUserAgentShadowRoot(): DOMNode|null {
    const ancestorShadowRoot = this.ancestorShadowRoot();
    if (!ancestorShadowRoot) {
      return null;
    }
    return ancestorShadowRoot.shadowRootType() === DOMNode.ShadowRootTypes.UserAgent ? ancestorShadowRoot : null;
  }

  isShadowRoot(): boolean {
    return Boolean(this.#shadowRootTypeInternal);
  }

  shadowRootType(): string|null {
    return this.#shadowRootTypeInternal || null;
  }

  nodeNameInCorrectCase(): string {
    const shadowRootType = this.shadowRootType();
    if (shadowRootType) {
      return '#shadow-root (' + shadowRootType + ')';
    }

    // If there is no local #name, it's case sensitive
    if (!this.localName()) {
      return this.nodeName();
    }

    // If the names are different lengths, there is a prefix and it's case sensitive
    if (this.localName().length !== this.nodeName().length) {
      return this.nodeName();
    }

    // Return the localname, which will be case insensitive if its an html node
    return this.localName();
  }

  setNodeName(name: string, callback?: ((arg0: string|null, arg1: DOMNode|null) => void)): void {
    void this.#agent.invoke_setNodeName({nodeId: this.id, name}).then(response => {
      if (!response.getError()) {
        this.#domModelInternal.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null, this.#domModelInternal.nodeForId(response.nodeId));
      }
    });
  }

  localName(): string {
    return this.#localNameInternal;
  }

  nodeValue(): string {
    return this.nodeValueInternal;
  }

  setNodeValueInternal(nodeValue: string): void {
    this.nodeValueInternal = nodeValue;
  }

  setNodeValue(value: string, callback?: ((arg0: string|null) => void)): void {
    void this.#agent.invoke_setNodeValue({nodeId: this.id, value}).then(response => {
      if (!response.getError()) {
        this.#domModelInternal.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  getAttribute(name: string): string|undefined {
    const attr = this.#attributesInternal.get(name);
    return attr ? attr.value : undefined;
  }

  setAttribute(name: string, text: string, callback?: ((arg0: string|null) => void)): void {
    void this.#agent.invoke_setAttributesAsText({nodeId: this.id, text, name}).then(response => {
      if (!response.getError()) {
        this.#domModelInternal.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  setAttributeValue(name: string, value: string, callback?: ((arg0: string|null) => void)): void {
    void this.#agent.invoke_setAttributeValue({nodeId: this.id, name, value}).then(response => {
      if (!response.getError()) {
        this.#domModelInternal.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  setAttributeValuePromise(name: string, value: string): Promise<string|null> {
    return new Promise(fulfill => this.setAttributeValue(name, value, fulfill));
  }

  attributes(): Attribute[] {
    return [...this.#attributesInternal.values()];
  }

  async removeAttribute(name: string): Promise<void> {
    const response = await this.#agent.invoke_removeAttribute({nodeId: this.id, name});
    if (response.getError()) {
      return;
    }
    this.#attributesInternal.delete(name);
    this.#domModelInternal.markUndoableState();
  }

  getChildNodesPromise(): Promise<DOMNode[]|null> {
    return new Promise(resolve => {
      return this.getChildNodes(childNodes => resolve(childNodes));
    });
  }

  getChildNodes(callback: (arg0: Array<DOMNode>|null) => void): void {
    if (this.childrenInternal) {
      callback(this.children());
      return;
    }
    void this.#agent.invoke_requestChildNodes({nodeId: this.id}).then(response => {
      callback(response.getError() ? null : this.children());
    });
  }

  async getSubtree(depth: number, pierce: boolean): Promise<DOMNode[]|null> {
    const response = await this.#agent.invoke_requestChildNodes({nodeId: this.id, depth, pierce});
    return response.getError() ? null : this.childrenInternal;
  }

  async getOuterHTML(): Promise<string|null> {
    const {outerHTML} = await this.#agent.invoke_getOuterHTML({nodeId: this.id});
    return outerHTML;
  }

  setOuterHTML(html: string, callback?: ((arg0: string|null) => void)): void {
    void this.#agent.invoke_setOuterHTML({nodeId: this.id, outerHTML: html}).then(response => {
      if (!response.getError()) {
        this.#domModelInternal.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  removeNode(callback?: ((arg0: string|null, arg1?: Protocol.DOM.NodeId|undefined) => void)): Promise<void> {
    return this.#agent.invoke_removeNode({nodeId: this.id}).then(response => {
      if (!response.getError()) {
        this.#domModelInternal.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  async copyNode(): Promise<string|null> {
    const {outerHTML} = await this.#agent.invoke_getOuterHTML({nodeId: this.id});
    if (outerHTML !== null) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(outerHTML);
    }
    return outerHTML;
  }

  path(): string {
    function getNodeKey(node: DOMNode): number|'u'|'a'|'d'|null {
      if (!node.#nodeNameInternal.length) {
        return null;
      }
      if (node.index !== undefined) {
        return node.index;
      }
      if (!node.parentNode) {
        return null;
      }
      if (node.isShadowRoot()) {
        return node.shadowRootType() === DOMNode.ShadowRootTypes.UserAgent ? 'u' : 'a';
      }
      if (node.nodeType() === Node.DOCUMENT_NODE) {
        return 'd';
      }
      return null;
    }

    const path = [];
    let node: (DOMNode|null) = (this as DOMNode | null);
    while (node) {
      const key = getNodeKey(node);
      if (key === null) {
        break;
      }

      path.push([key, node.#nodeNameInternal]);
      node = node.parentNode;
    }
    path.reverse();
    return path.join(',');
  }

  isAncestor(node: DOMNode): boolean {
    if (!node) {
      return false;
    }

    let currentNode: (DOMNode|null) = node.parentNode;
    while (currentNode) {
      if (this === currentNode) {
        return true;
      }
      currentNode = currentNode.parentNode;
    }
    return false;
  }

  isDescendant(descendant: DOMNode): boolean {
    return descendant !== null && descendant.isAncestor(this);
  }

  frameOwnerFrameId(): Protocol.Page.FrameId|null {
    return this.#frameOwnerFrameIdInternal;
  }

  frameId(): Protocol.Page.FrameId|null {
    let node: DOMNode = this.parentNode || this;
    while (!node.#frameOwnerFrameIdInternal && node.parentNode) {
      node = node.parentNode;
    }
    return node.#frameOwnerFrameIdInternal;
  }

  setAttributesPayload(attrs: string[]): boolean {
    let attributesChanged: true|boolean =
        !this.#attributesInternal || attrs.length !== this.#attributesInternal.size * 2;
    const oldAttributesMap = this.#attributesInternal || new Map();

    this.#attributesInternal = new Map();

    for (let i = 0; i < attrs.length; i += 2) {
      const name = attrs[i];
      const value = attrs[i + 1];
      this.addAttribute(name, value);

      if (attributesChanged) {
        continue;
      }

      const oldAttribute = oldAttributesMap.get(name);
      if (!oldAttribute || oldAttribute.value !== value) {
        attributesChanged = true;
      }
    }
    return attributesChanged;
  }

  insertChild(prev: DOMNode|undefined, payload: Protocol.DOM.Node): DOMNode {
    if (!this.childrenInternal) {
      throw new Error('DOMNode._children is expected to not be null.');
    }
    const node = DOMNode.create(this.#domModelInternal, this.ownerDocument, this.#isInShadowTreeInternal, payload);
    this.childrenInternal.splice(prev ? this.childrenInternal.indexOf(prev) + 1 : 0, 0, node);
    this.renumber();
    return node;
  }

  removeChild(node: DOMNode): void {
    const pseudoType = node.pseudoType();
    if (pseudoType) {
      const updatedPseudoElements = this.#pseudoElements.get(pseudoType)?.filter(element => element !== node);
      if (updatedPseudoElements && updatedPseudoElements.length > 0) {
        this.#pseudoElements.set(pseudoType, updatedPseudoElements);
      } else {
        this.#pseudoElements.delete(pseudoType);
      }
    } else {
      const shadowRootIndex = this.shadowRootsInternal.indexOf(node);
      if (shadowRootIndex !== -1) {
        this.shadowRootsInternal.splice(shadowRootIndex, 1);
      } else {
        if (!this.childrenInternal) {
          throw new Error('DOMNode._children is expected to not be null.');
        }
        if (this.childrenInternal.indexOf(node) === -1) {
          throw new Error('DOMNode._children is expected to contain the node to be removed.');
        }
        this.childrenInternal.splice(this.childrenInternal.indexOf(node), 1);
      }
    }
    node.parentNode = null;
    this.#subtreeMarkerCount -= node.#subtreeMarkerCount;
    if (node.#subtreeMarkerCount) {
      this.#domModelInternal.dispatchEventToListeners(Events.MarkersChanged, this);
    }
    this.renumber();
  }

  setChildrenPayload(payloads: Protocol.DOM.Node[]): void {
    this.childrenInternal = [];
    for (let i = 0; i < payloads.length; ++i) {
      const payload = payloads[i];
      const node = DOMNode.create(this.#domModelInternal, this.ownerDocument, this.#isInShadowTreeInternal, payload);
      this.childrenInternal.push(node);
    }
    this.renumber();
  }

  private setPseudoElements(payloads: Protocol.DOM.Node[]|undefined): void {
    if (!payloads) {
      return;
    }

    for (let i = 0; i < payloads.length; ++i) {
      const node =
          DOMNode.create(this.#domModelInternal, this.ownerDocument, this.#isInShadowTreeInternal, payloads[i]);
      node.parentNode = this;
      const pseudoType = node.pseudoType();
      if (!pseudoType) {
        throw new Error('DOMNode.pseudoType() is expected to be defined.');
      }
      const currentPseudoElements = this.#pseudoElements.get(pseudoType);
      if (currentPseudoElements) {
        currentPseudoElements.push(node);
      } else {
        this.#pseudoElements.set(pseudoType, [node]);
      }
    }
  }

  setDistributedNodePayloads(payloads: Protocol.DOM.BackendNode[]): void {
    this.#distributedNodesInternal = [];
    for (const payload of payloads) {
      this.#distributedNodesInternal.push(new DOMNodeShortcut(
          this.#domModelInternal.target(), payload.backendNodeId, payload.nodeType, payload.nodeName));
    }
  }

  setAssignedSlot(payload: Protocol.DOM.BackendNode): void {
    this.assignedSlot =
        new DOMNodeShortcut(this.#domModelInternal.target(), payload.backendNodeId, payload.nodeType, payload.nodeName);
  }

  private renumber(): void {
    if (!this.childrenInternal) {
      throw new Error('DOMNode._children is expected to not be null.');
    }
    this.childNodeCountInternal = this.childrenInternal.length;
    if (this.childNodeCountInternal === 0) {
      this.firstChild = null;
      this.lastChild = null;
      return;
    }
    this.firstChild = this.childrenInternal[0];
    this.lastChild = this.childrenInternal[this.childNodeCountInternal - 1];
    for (let i = 0; i < this.childNodeCountInternal; ++i) {
      const child = this.childrenInternal[i];
      child.index = i;
      child.nextSibling = i + 1 < this.childNodeCountInternal ? this.childrenInternal[i + 1] : null;
      child.previousSibling = i - 1 >= 0 ? this.childrenInternal[i - 1] : null;
      child.parentNode = this;
    }
  }

  private addAttribute(name: string, value: string): void {
    const attr = {name, value, _node: this};
    this.#attributesInternal.set(name, attr);
  }

  setAttributeInternal(name: string, value: string): void {
    const attr = this.#attributesInternal.get(name);
    if (attr) {
      attr.value = value;
    } else {
      this.addAttribute(name, value);
    }
  }

  removeAttributeInternal(name: string): void {
    this.#attributesInternal.delete(name);
  }

  copyTo(targetNode: DOMNode, anchorNode: DOMNode|null, callback?: ((arg0: string|null, arg1: DOMNode|null) => void)):
      void {
    void this.#agent
        .invoke_copyTo(
            {nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined})
        .then(response => {
          if (!response.getError()) {
            this.#domModelInternal.markUndoableState();
          }
          if (callback) {
            callback(response.getError() || null, this.#domModelInternal.nodeForId(response.nodeId));
          }
        });
  }

  moveTo(targetNode: DOMNode, anchorNode: DOMNode|null, callback?: ((arg0: string|null, arg1: DOMNode|null) => void)):
      void {
    void this.#agent
        .invoke_moveTo(
            {nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined})
        .then(response => {
          if (!response.getError()) {
            this.#domModelInternal.markUndoableState();
          }
          if (callback) {
            callback(response.getError() || null, this.#domModelInternal.nodeForId(response.nodeId));
          }
        });
  }

  isXMLNode(): boolean {
    return Boolean(this.#xmlVersion);
  }

  setMarker(name: string, value: unknown): void {
    if (value === null) {
      if (!this.#markers.has(name)) {
        return;
      }

      this.#markers.delete(name);
      for (let node: (DOMNode|null) = (this as DOMNode | null); node; node = node.parentNode) {
        --node.#subtreeMarkerCount;
      }
      for (let node: (DOMNode|null) = (this as DOMNode | null); node; node = node.parentNode) {
        this.#domModelInternal.dispatchEventToListeners(Events.MarkersChanged, node);
      }
      return;
    }

    if (this.parentNode && !this.#markers.has(name)) {
      for (let node: (DOMNode|null) = (this as DOMNode | null); node; node = node.parentNode) {
        ++node.#subtreeMarkerCount;
      }
    }
    this.#markers.set(name, value);
    for (let node: (DOMNode|null) = (this as DOMNode | null); node; node = node.parentNode) {
      this.#domModelInternal.dispatchEventToListeners(Events.MarkersChanged, node);
    }
  }

  marker<T>(name: string): T|null {
    return this.#markers.get(name) as T || null;
  }

  getMarkerKeysForTest(): string[] {
    return [...this.#markers.keys()];
  }

  traverseMarkers(visitor: (arg0: DOMNode, arg1: string) => void): void {
    function traverse(node: DOMNode): void {
      if (!node.#subtreeMarkerCount) {
        return;
      }
      for (const marker of node.#markers.keys()) {
        visitor(node, marker);
      }
      if (!node.childrenInternal) {
        return;
      }
      for (const child of node.childrenInternal) {
        traverse(child);
      }
    }
    traverse(this);
  }

  resolveURL(url: string): Platform.DevToolsPath.UrlString|null {
    if (!url) {
      return url as Platform.DevToolsPath.UrlString;
    }
    for (let frameOwnerCandidate: (DOMNode|null) = (this as DOMNode | null); frameOwnerCandidate;
         frameOwnerCandidate = frameOwnerCandidate.parentNode) {
      if (frameOwnerCandidate instanceof DOMDocument && frameOwnerCandidate.baseURL) {
        return Common.ParsedURL.ParsedURL.completeURL(frameOwnerCandidate.baseURL, url);
      }
    }
    return null;
  }

  highlight(mode?: string): void {
    this.#domModelInternal.overlayModel().highlightInOverlay({node: this, selectorList: undefined}, mode);
  }

  highlightForTwoSeconds(): void {
    this.#domModelInternal.overlayModel().highlightInOverlayForTwoSeconds({node: this, selectorList: undefined});
  }

  async resolveToObject(objectGroup?: string, executionContextId?: Protocol.Runtime.ExecutionContextId):
      Promise<RemoteObject|null> {
    const {object} = await this.#agent.invoke_resolveNode(
        {nodeId: this.id, backendNodeId: undefined, executionContextId, objectGroup});
    return object && this.#domModelInternal.runtimeModelInternal.createRemoteObject(object) || null;
  }

  async boxModel(): Promise<Protocol.DOM.BoxModel|null> {
    const {model} = await this.#agent.invoke_getBoxModel({nodeId: this.id});
    return model;
  }

  async setAsInspectedNode(): Promise<void> {
    let node: (DOMNode|null)|DOMNode = (this as DOMNode | null);
    if (node && node.pseudoType()) {
      node = node.parentNode;
    }
    while (node) {
      let ancestor = node.ancestorUserAgentShadowRoot();
      if (!ancestor) {
        break;
      }
      ancestor = node.ancestorShadowHost();
      if (!ancestor) {
        break;
      }
      // User #agent shadow root, keep climbing up.
      node = ancestor;
    }
    if (!node) {
      throw new Error('In DOMNode.setAsInspectedNode: node is expected to not be null.');
    }
    await this.#agent.invoke_setInspectedNode({nodeId: node.id});
  }

  enclosingElementOrSelf(): DOMNode|null {
    let node: DOMNode|null|(DOMNode | null) = (this as DOMNode | null);
    if (node && node.nodeType() === Node.TEXT_NODE && node.parentNode) {
      node = node.parentNode;
    }

    if (node && node.nodeType() !== Node.ELEMENT_NODE) {
      node = null;
    }
    return node;
  }

  async callFunction<T, U extends string|number>(fn: (this: HTMLElement, ...args: U[]) => T, args: U[] = []):
      Promise<{value: T}|null> {
    const object = await this.resolveToObject();
    if (!object) {
      return null;
    }

    const result = await object.callFunction(fn, args.map(arg => RemoteObject.toCallArgument(arg)));
    object.release();
    if (result.wasThrown || !result.object) {
      return null;
    }
    return {
      value: result.object.value as T,
    };
  }

  async scrollIntoView(): Promise<void> {
    const node = this.enclosingElementOrSelf();
    if (!node) {
      return;
    }

    const result = await node.callFunction(scrollIntoViewInPage);
    if (!result) {
      return;
    }

    node.highlightForTwoSeconds();

    function scrollIntoViewInPage(this: Element): void {
      this.scrollIntoViewIfNeeded(true);
    }
  }

  async focus(): Promise<void> {
    const node = this.enclosingElementOrSelf();
    if (!node) {
      throw new Error('DOMNode.focus expects node to not be null.');
    }
    const result = await node.callFunction(focusInPage);
    if (!result) {
      return;
    }

    node.highlightForTwoSeconds();
    await this.#domModelInternal.target().pageAgent().invoke_bringToFront();

    function focusInPage(this: HTMLElement): void {
      this.focus();
    }
  }

  simpleSelector(): string {
    const lowerCaseName = this.localName() || this.nodeName().toLowerCase();
    if (this.nodeType() !== Node.ELEMENT_NODE) {
      return lowerCaseName;
    }
    const type = this.getAttribute('type');
    const id = this.getAttribute('id');
    const classes = this.getAttribute('class');

    if (lowerCaseName === 'input' && type && !id && !classes) {
      return lowerCaseName + '[type="' + CSS.escape(type) + '"]';
    }
    if (id) {
      return lowerCaseName + '#' + CSS.escape(id);
    }
    if (classes) {
      const classList = classes.trim().split(/\s+/g);
      return (lowerCaseName === 'div' ? '' : lowerCaseName) + '.' + classList.map(cls => CSS.escape(cls)).join('.');
    }
    if (this.pseudoIdentifier()) {
      return `${lowerCaseName}(${this.pseudoIdentifier()})`;
    }
    return lowerCaseName;
  }

  async getAnchorBySpecifier(specifier?: string): Promise<DOMNode|null> {
    const response = await this.#agent.invoke_getAnchorElement({
      nodeId: this.id,
      anchorSpecifier: specifier,
    });

    if (response.getError()) {
      return null;
    }

    return this.domModel().nodeForId(response.nodeId);
  }
}

export namespace DOMNode {
  export enum ShadowRootTypes {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    UserAgent = 'user-agent',
    Open = 'open',
    Closed = 'closed',
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}

export class DeferredDOMNode {
  readonly #domModelInternal: DOMModel;
  readonly #backendNodeIdInternal: Protocol.DOM.BackendNodeId;

  constructor(target: Target, backendNodeId: Protocol.DOM.BackendNodeId) {
    this.#domModelInternal = (target.model(DOMModel) as DOMModel);
    this.#backendNodeIdInternal = backendNodeId;
  }

  resolve(callback: (arg0: DOMNode|null) => void): void {
    void this.resolvePromise().then(callback);
  }

  async resolvePromise(): Promise<DOMNode|null> {
    const nodeIds =
        await this.#domModelInternal.pushNodesByBackendIdsToFrontend(new Set([this.#backendNodeIdInternal]));
    return nodeIds && nodeIds.get(this.#backendNodeIdInternal) || null;
  }

  backendNodeId(): Protocol.DOM.BackendNodeId {
    return this.#backendNodeIdInternal;
  }

  domModel(): DOMModel {
    return this.#domModelInternal;
  }

  highlight(): void {
    this.#domModelInternal.overlayModel().highlightInOverlay({deferredNode: this, selectorList: undefined});
  }
}

export class DOMNodeShortcut {
  nodeType: number;
  nodeName: string;
  deferredNode: DeferredDOMNode;
  constructor(target: Target, backendNodeId: Protocol.DOM.BackendNodeId, nodeType: number, nodeName: string) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.deferredNode = new DeferredDOMNode(target, backendNodeId);
  }
}

export class DOMDocument extends DOMNode {
  body: DOMNode|null;
  documentElement: DOMNode|null;
  documentURL: Platform.DevToolsPath.UrlString;
  baseURL: Platform.DevToolsPath.UrlString;
  constructor(domModel: DOMModel, payload: Protocol.DOM.Node) {
    super(domModel);
    this.body = null;
    this.documentElement = null;
    this.init(this, false, payload);
    this.documentURL = (payload.documentURL || '') as Platform.DevToolsPath.UrlString;
    this.baseURL = (payload.baseURL || '') as Platform.DevToolsPath.UrlString;
  }
}

export class DOMModel extends SDKModel<EventTypes> {
  agent: ProtocolProxyApi.DOMApi;
  idToDOMNode: Map<Protocol.DOM.NodeId, DOMNode> = new Map();
  #document: DOMDocument|null;
  readonly #attributeLoadNodeIds: Set<Protocol.DOM.NodeId>;
  readonly runtimeModelInternal: RuntimeModel;
  #lastMutationId!: number;
  #pendingDocumentRequestPromise: Promise<DOMDocument|null>|null;
  #frameOwnerNode?: DOMNode|null;
  #loadNodeAttributesTimeout?: number;
  #searchId?: string;
  constructor(target: Target) {
    super(target);

    this.agent = target.domAgent();

    this.#document = null;
    this.#attributeLoadNodeIds = new Set();
    target.registerDOMDispatcher(new DOMDispatcher(this));
    this.runtimeModelInternal = (target.model(RuntimeModel) as RuntimeModel);

    this.#pendingDocumentRequestPromise = null;

    if (!target.suspended()) {
      void this.agent.invoke_enable({});
    }

    if (Root.Runtime.experiments.isEnabled('capture-node-creation-stacks')) {
      void this.agent.invoke_setNodeStackTracesEnabled({enable: true});
    }
  }

  runtimeModel(): RuntimeModel {
    return this.runtimeModelInternal;
  }

  cssModel(): CSSModel {
    return this.target().model(CSSModel) as CSSModel;
  }

  overlayModel(): OverlayModel {
    return this.target().model(OverlayModel) as OverlayModel;
  }

  static cancelSearch(): void {
    for (const domModel of TargetManager.instance().models(DOMModel)) {
      domModel.cancelSearch();
    }
  }

  private scheduleMutationEvent(node: DOMNode): void {
    if (!this.hasEventListeners(Events.DOMMutated)) {
      return;
    }

    this.#lastMutationId = (this.#lastMutationId || 0) + 1;
    void Promise.resolve().then(callObserve.bind(this, node, this.#lastMutationId));

    function callObserve(this: DOMModel, node: DOMNode, mutationId: number): void {
      if (!this.hasEventListeners(Events.DOMMutated) || this.#lastMutationId !== mutationId) {
        return;
      }

      this.dispatchEventToListeners(Events.DOMMutated, node);
    }
  }

  requestDocument(): Promise<DOMDocument|null> {
    if (this.#document) {
      return Promise.resolve(this.#document);
    }
    if (!this.#pendingDocumentRequestPromise) {
      this.#pendingDocumentRequestPromise = this.requestDocumentInternal();
    }
    return this.#pendingDocumentRequestPromise;
  }

  async getOwnerNodeForFrame(frameId: Protocol.Page.FrameId): Promise<DeferredDOMNode|null> {
    // Returns an error if the frameId does not belong to the current target.
    const response = await this.agent.invoke_getFrameOwner({frameId});
    if (response.getError()) {
      return null;
    }
    return new DeferredDOMNode(this.target(), response.backendNodeId);
  }

  private async requestDocumentInternal(): Promise<DOMDocument|null> {
    const response = await this.agent.invoke_getDocument({});
    if (response.getError()) {
      return null;
    }
    const {root: documentPayload} = response;
    this.#pendingDocumentRequestPromise = null;

    if (documentPayload) {
      this.setDocument(documentPayload);
    }
    if (!this.#document) {
      console.error('No document');
      return null;
    }

    const parentModel = this.parentModel();
    if (parentModel && !this.#frameOwnerNode) {
      await parentModel.requestDocument();
      const mainFrame = this.target().model(ResourceTreeModel)?.mainFrame;
      if (mainFrame) {
        const response = await parentModel.agent.invoke_getFrameOwner({frameId: mainFrame.id});
        if (!response.getError() && response.nodeId) {
          this.#frameOwnerNode = parentModel.nodeForId(response.nodeId);
        }
      }
    }

    // Document could have been cleared by now.
    if (this.#frameOwnerNode) {
      const oldDocument = this.#frameOwnerNode.contentDocument();
      this.#frameOwnerNode.setContentDocument(this.#document);
      this.#frameOwnerNode.setChildren([]);
      if (this.#document) {
        this.#document.parentNode = this.#frameOwnerNode;
        this.dispatchEventToListeners(Events.NodeInserted, this.#document);
      } else if (oldDocument) {
        this.dispatchEventToListeners(Events.NodeRemoved, {node: oldDocument, parent: this.#frameOwnerNode});
      }
    }
    return this.#document;
  }

  existingDocument(): DOMDocument|null {
    return this.#document;
  }

  async pushNodeToFrontend(objectId: Protocol.Runtime.RemoteObjectId): Promise<DOMNode|null> {
    await this.requestDocument();
    const {nodeId} = await this.agent.invoke_requestNode({objectId});
    return nodeId ? this.nodeForId(nodeId) : null;
  }

  pushNodeByPathToFrontend(path: string): Promise<Protocol.DOM.NodeId|null> {
    return this.requestDocument()
        .then(() => this.agent.invoke_pushNodeByPathToFrontend({path}))
        .then(({nodeId}) => nodeId);
  }

  async pushNodesByBackendIdsToFrontend(backendNodeIds: Set<Protocol.DOM.BackendNodeId>):
      Promise<Map<Protocol.DOM.BackendNodeId, DOMNode|null>|null> {
    await this.requestDocument();
    const backendNodeIdsArray = [...backendNodeIds];
    const {nodeIds} = await this.agent.invoke_pushNodesByBackendIdsToFrontend({backendNodeIds: backendNodeIdsArray});
    if (!nodeIds) {
      return null;
    }
    const map = new Map<Protocol.DOM.BackendNodeId, DOMNode|null>();
    for (let i = 0; i < nodeIds.length; ++i) {
      if (nodeIds[i]) {
        map.set(backendNodeIdsArray[i], this.nodeForId(nodeIds[i]));
      }
    }
    return map;
  }

  attributeModified(nodeId: Protocol.DOM.NodeId, name: string, value: string): void {
    const node = this.idToDOMNode.get(nodeId);
    if (!node) {
      return;
    }

    node.setAttributeInternal(name, value);
    this.dispatchEventToListeners(Events.AttrModified, {node, name});
    this.scheduleMutationEvent(node);
  }

  attributeRemoved(nodeId: Protocol.DOM.NodeId, name: string): void {
    const node = this.idToDOMNode.get(nodeId);
    if (!node) {
      return;
    }
    node.removeAttributeInternal(name);
    this.dispatchEventToListeners(Events.AttrRemoved, {node, name});
    this.scheduleMutationEvent(node);
  }

  inlineStyleInvalidated(nodeIds: Protocol.DOM.NodeId[]): void {
    nodeIds.forEach(nodeId => this.#attributeLoadNodeIds.add(nodeId));
    if (!this.#loadNodeAttributesTimeout) {
      this.#loadNodeAttributesTimeout = window.setTimeout(this.loadNodeAttributes.bind(this), 20);
    }
  }

  private loadNodeAttributes(): void {
    this.#loadNodeAttributesTimeout = undefined;
    for (const nodeId of this.#attributeLoadNodeIds) {
      void this.agent.invoke_getAttributes({nodeId}).then(({attributes}) => {
        if (!attributes) {
          // We are calling loadNodeAttributes asynchronously, it is ok if node is not found.
          return;
        }
        const node = this.idToDOMNode.get(nodeId);
        if (!node) {
          return;
        }
        if (node.setAttributesPayload(attributes)) {
          this.dispatchEventToListeners(Events.AttrModified, {node, name: 'style'});
          this.scheduleMutationEvent(node);
        }
      });
    }
    this.#attributeLoadNodeIds.clear();
  }

  characterDataModified(nodeId: Protocol.DOM.NodeId, newValue: string): void {
    const node = this.idToDOMNode.get(nodeId);
    if (!node) {
      console.error('nodeId could not be resolved to a node');
      return;
    }
    node.setNodeValueInternal(newValue);
    this.dispatchEventToListeners(Events.CharacterDataModified, node);
    this.scheduleMutationEvent(node);
  }

  nodeForId(nodeId: Protocol.DOM.NodeId|null): DOMNode|null {
    return nodeId ? this.idToDOMNode.get(nodeId) || null : null;
  }

  documentUpdated(): void {
    // If this frame doesn't have a document now,
    // it means that its document is not requested yet and
    // it will be requested when needed. (ex: setChildNodes event is received for the frame owner node)
    // So, we don't need to request the document if we don't
    // already have a document.
    const alreadyHasDocument = Boolean(this.#document);
    this.setDocument(null);
    // If we have this.#pendingDocumentRequestPromise in flight,
    // it will contain most recent result.
    if (this.parentModel() && alreadyHasDocument && !this.#pendingDocumentRequestPromise) {
      void this.requestDocument();
    }
  }

  private setDocument(payload: Protocol.DOM.Node|null): void {
    this.idToDOMNode = new Map();
    if (payload && 'nodeId' in payload) {
      this.#document = new DOMDocument(this, payload);
    } else {
      this.#document = null;
    }
    DOMModelUndoStack.instance().dispose(this);

    if (!this.parentModel()) {
      this.dispatchEventToListeners(Events.DocumentUpdated, this);
    }
  }

  setDocumentForTest(document: Protocol.DOM.Node|null): void {
    this.setDocument(document);
  }

  private setDetachedRoot(payload: Protocol.DOM.Node): void {
    if (payload.nodeName === '#document') {
      new DOMDocument(this, payload);
    } else {
      DOMNode.create(this, null, false, payload);
    }
  }

  setChildNodes(parentId: Protocol.DOM.NodeId, payloads: Protocol.DOM.Node[]): void {
    if (!parentId && payloads.length) {
      this.setDetachedRoot(payloads[0]);
      return;
    }

    const parent = this.idToDOMNode.get(parentId);
    parent?.setChildrenPayload(payloads);
  }

  childNodeCountUpdated(nodeId: Protocol.DOM.NodeId, newValue: number): void {
    const node = this.idToDOMNode.get(nodeId);
    if (!node) {
      console.error('nodeId could not be resolved to a node');
      return;
    }
    node.setChildNodeCount(newValue);
    this.dispatchEventToListeners(Events.ChildNodeCountUpdated, node);
    this.scheduleMutationEvent(node);
  }

  childNodeInserted(parentId: Protocol.DOM.NodeId, prevId: Protocol.DOM.NodeId, payload: Protocol.DOM.Node): void {
    const parent = this.idToDOMNode.get(parentId);
    const prev = this.idToDOMNode.get(prevId);
    if (!parent) {
      console.error('parentId could not be resolved to a node');
      return;
    }
    const node = parent.insertChild(prev, payload);
    this.idToDOMNode.set(node.id, node);
    this.dispatchEventToListeners(Events.NodeInserted, node);
    this.scheduleMutationEvent(node);
  }

  childNodeRemoved(parentId: Protocol.DOM.NodeId, nodeId: Protocol.DOM.NodeId): void {
    const parent = this.idToDOMNode.get(parentId);
    const node = this.idToDOMNode.get(nodeId);
    if (!parent || !node) {
      console.error('parentId or nodeId could not be resolved to a node');
      return;
    }
    parent.removeChild(node);
    this.unbind(node);
    this.dispatchEventToListeners(Events.NodeRemoved, {node, parent});
    this.scheduleMutationEvent(node);
  }

  shadowRootPushed(hostId: Protocol.DOM.NodeId, root: Protocol.DOM.Node): void {
    const host = this.idToDOMNode.get(hostId);
    if (!host) {
      return;
    }
    const node = DOMNode.create(this, host.ownerDocument, true, root);
    node.parentNode = host;
    this.idToDOMNode.set(node.id, node);
    host.shadowRootsInternal.unshift(node);
    this.dispatchEventToListeners(Events.NodeInserted, node);
    this.scheduleMutationEvent(node);
  }

  shadowRootPopped(hostId: Protocol.DOM.NodeId, rootId: Protocol.DOM.NodeId): void {
    const host = this.idToDOMNode.get(hostId);
    if (!host) {
      return;
    }
    const root = this.idToDOMNode.get(rootId);
    if (!root) {
      return;
    }
    host.removeChild(root);
    this.unbind(root);
    this.dispatchEventToListeners(Events.NodeRemoved, {node: root, parent: host});
    this.scheduleMutationEvent(root);
  }

  pseudoElementAdded(parentId: Protocol.DOM.NodeId, pseudoElement: Protocol.DOM.Node): void {
    const parent = this.idToDOMNode.get(parentId);
    if (!parent) {
      return;
    }
    const node = DOMNode.create(this, parent.ownerDocument, false, pseudoElement);
    node.parentNode = parent;
    this.idToDOMNode.set(node.id, node);
    const pseudoType = node.pseudoType();
    if (!pseudoType) {
      throw new Error('DOMModel._pseudoElementAdded expects pseudoType to be defined.');
    }
    const currentPseudoElements = parent.pseudoElements().get(pseudoType);
    if (currentPseudoElements) {
      if (!pseudoType.startsWith('view-transition')) {
        throw new Error(
            'DOMModel.pseudoElementAdded expects parent to not already have this pseudo type added; only view-transition* pseudo elements can coexist under the same parent.');
      }
      currentPseudoElements.push(node);
    } else {
      parent.pseudoElements().set(pseudoType, [node]);
    }
    this.dispatchEventToListeners(Events.NodeInserted, node);
    this.scheduleMutationEvent(node);
  }

  scrollableFlagUpdated(nodeId: Protocol.DOM.NodeId, isScrollable: boolean): void {
    const node = this.nodeForId(nodeId);
    if (!node || node.isScrollable() === isScrollable) {
      return;
    }
    node.setIsScrollable(isScrollable);
    this.dispatchEventToListeners(Events.ScrollableFlagUpdated, {node});
  }

  topLayerElementsUpdated(): void {
    this.dispatchEventToListeners(Events.TopLayerElementsChanged);
  }

  pseudoElementRemoved(parentId: Protocol.DOM.NodeId, pseudoElementId: Protocol.DOM.NodeId): void {
    const parent = this.idToDOMNode.get(parentId);
    if (!parent) {
      return;
    }
    const pseudoElement = this.idToDOMNode.get(pseudoElementId);
    if (!pseudoElement) {
      return;
    }
    parent.removeChild(pseudoElement);
    this.unbind(pseudoElement);
    this.dispatchEventToListeners(Events.NodeRemoved, {node: pseudoElement, parent});
    this.scheduleMutationEvent(pseudoElement);
  }

  distributedNodesUpdated(insertionPointId: Protocol.DOM.NodeId, distributedNodes: Protocol.DOM.BackendNode[]): void {
    const insertionPoint = this.idToDOMNode.get(insertionPointId);
    if (!insertionPoint) {
      return;
    }
    insertionPoint.setDistributedNodePayloads(distributedNodes);
    this.dispatchEventToListeners(Events.DistributedNodesChanged, insertionPoint);
    this.scheduleMutationEvent(insertionPoint);
  }

  private unbind(node: DOMNode): void {
    this.idToDOMNode.delete(node.id);
    const children = node.children();
    for (let i = 0; children && i < children.length; ++i) {
      this.unbind(children[i]);
    }
    for (let i = 0; i < node.shadowRootsInternal.length; ++i) {
      this.unbind(node.shadowRootsInternal[i]);
    }
    const pseudoElements = node.pseudoElements();
    for (const value of pseudoElements.values()) {
      for (const pseudoElement of value) {
        this.unbind(pseudoElement);
      }
    }
    const templateContent = node.templateContent();
    if (templateContent) {
      this.unbind(templateContent);
    }
  }

  async getNodesByStyle(
      computedStyles: {
        name: string,
        value: string,
      }[],
      pierce: boolean = false): Promise<Protocol.DOM.NodeId[]> {
    await this.requestDocument();
    if (!this.#document) {
      throw new Error('DOMModel.getNodesByStyle expects to have a document.');
    }
    const response =
        await this.agent.invoke_getNodesForSubtreeByStyle({nodeId: this.#document.id, computedStyles, pierce});
    if (response.getError()) {
      throw response.getError();
    }
    return response.nodeIds;
  }

  async performSearch(query: string, includeUserAgentShadowDOM: boolean): Promise<number> {
    const response = await this.agent.invoke_performSearch({query, includeUserAgentShadowDOM});
    if (!response.getError()) {
      this.#searchId = response.searchId;
    }
    return response.getError() ? 0 : response.resultCount;
  }

  async searchResult(index: number): Promise<DOMNode|null> {
    if (!this.#searchId) {
      return null;
    }
    const {nodeIds} =
        await this.agent.invoke_getSearchResults({searchId: this.#searchId, fromIndex: index, toIndex: index + 1});
    return nodeIds && nodeIds.length === 1 ? this.nodeForId(nodeIds[0]) : null;
  }

  private cancelSearch(): void {
    if (!this.#searchId) {
      return;
    }
    void this.agent.invoke_discardSearchResults({searchId: this.#searchId});
    this.#searchId = undefined;
  }

  classNamesPromise(nodeId: Protocol.DOM.NodeId): Promise<string[]> {
    return this.agent.invoke_collectClassNamesFromSubtree({nodeId}).then(({classNames}) => classNames || []);
  }

  querySelector(nodeId: Protocol.DOM.NodeId, selector: string): Promise<Protocol.DOM.NodeId|null> {
    return this.agent.invoke_querySelector({nodeId, selector}).then(({nodeId}) => nodeId);
  }

  querySelectorAll(nodeId: Protocol.DOM.NodeId, selector: string): Promise<Protocol.DOM.NodeId[]|null> {
    return this.agent.invoke_querySelectorAll({nodeId, selector}).then(({nodeIds}) => nodeIds);
  }

  getTopLayerElements(): Promise<Protocol.DOM.NodeId[]|null> {
    return this.agent.invoke_getTopLayerElements().then(({nodeIds}) => nodeIds);
  }

  getDetachedDOMNodes(): Promise<Protocol.DOM.DetachedElementInfo[]|null> {
    return this.agent.invoke_getDetachedDomNodes().then(({detachedNodes}) => detachedNodes);
  }

  getElementByRelation(nodeId: Protocol.DOM.NodeId, relation: Protocol.DOM.GetElementByRelationRequestRelation):
      Promise<Protocol.DOM.NodeId|null> {
    return this.agent.invoke_getElementByRelation({nodeId, relation}).then(({nodeId}) => nodeId);
  }

  markUndoableState(minorChange?: boolean): void {
    void DOMModelUndoStack.instance().markUndoableState(this, minorChange || false);
  }

  async nodeForLocation(x: number, y: number, includeUserAgentShadowDOM: boolean): Promise<DOMNode|null> {
    const response = await this.agent.invoke_getNodeForLocation({x, y, includeUserAgentShadowDOM});
    if (response.getError() || !response.nodeId) {
      return null;
    }
    return this.nodeForId(response.nodeId);
  }

  async getContainerForNode(
      nodeId: Protocol.DOM.NodeId, containerName?: string, physicalAxes?: Protocol.DOM.PhysicalAxes,
      logicalAxes?: Protocol.DOM.LogicalAxes, queriesScrollState?: boolean): Promise<DOMNode|null> {
    const {nodeId: containerNodeId} = await this.agent.invoke_getContainerForNode(
        {nodeId, containerName, physicalAxes, logicalAxes, queriesScrollState});
    if (!containerNodeId) {
      return null;
    }
    return this.nodeForId(containerNodeId);
  }

  pushObjectAsNodeToFrontend(object: RemoteObject): Promise<DOMNode|null> {
    return object.isNode() && object.objectId ? this.pushNodeToFrontend(object.objectId) : Promise.resolve(null);
  }

  override suspendModel(): Promise<void> {
    return this.agent.invoke_disable().then(() => this.setDocument(null));
  }

  override async resumeModel(): Promise<void> {
    await this.agent.invoke_enable({});
  }

  override dispose(): void {
    DOMModelUndoStack.instance().dispose(this);
  }

  parentModel(): DOMModel|null {
    const parentTarget = this.target().parentTarget();
    return parentTarget ? parentTarget.model(DOMModel) : null;
  }

  getAgent(): ProtocolProxyApi.DOMApi {
    return this.agent;
  }

  registerNode(node: DOMNode): void {
    this.idToDOMNode.set(node.id, node);
  }
}

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  AttrModified = 'AttrModified',
  AttrRemoved = 'AttrRemoved',
  CharacterDataModified = 'CharacterDataModified',
  DOMMutated = 'DOMMutated',
  NodeInserted = 'NodeInserted',
  NodeRemoved = 'NodeRemoved',
  DocumentUpdated = 'DocumentUpdated',
  ChildNodeCountUpdated = 'ChildNodeCountUpdated',
  DistributedNodesChanged = 'DistributedNodesChanged',
  MarkersChanged = 'MarkersChanged',
  TopLayerElementsChanged = 'TopLayerElementsChanged',
  ScrollableFlagUpdated = 'ScrollableFlagUpdated',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type EventTypes = {
  [Events.AttrModified]: {node: DOMNode, name: string},
  [Events.AttrRemoved]: {node: DOMNode, name: string},
  [Events.CharacterDataModified]: DOMNode,
  [Events.DOMMutated]: DOMNode,
  [Events.NodeInserted]: DOMNode,
  [Events.NodeRemoved]: {node: DOMNode, parent: DOMNode},
  [Events.DocumentUpdated]: DOMModel,
  [Events.ChildNodeCountUpdated]: DOMNode,
  [Events.DistributedNodesChanged]: DOMNode,
  [Events.MarkersChanged]: DOMNode,
  [Events.TopLayerElementsChanged]: void,
  [Events.ScrollableFlagUpdated]: {node: DOMNode},
};

class DOMDispatcher implements ProtocolProxyApi.DOMDispatcher {
  readonly #domModel: DOMModel;
  constructor(domModel: DOMModel) {
    this.#domModel = domModel;
  }

  documentUpdated(): void {
    this.#domModel.documentUpdated();
  }

  attributeModified({nodeId, name, value}: Protocol.DOM.AttributeModifiedEvent): void {
    this.#domModel.attributeModified(nodeId, name, value);
  }

  attributeRemoved({nodeId, name}: Protocol.DOM.AttributeRemovedEvent): void {
    this.#domModel.attributeRemoved(nodeId, name);
  }

  inlineStyleInvalidated({nodeIds}: Protocol.DOM.InlineStyleInvalidatedEvent): void {
    this.#domModel.inlineStyleInvalidated(nodeIds);
  }

  characterDataModified({nodeId, characterData}: Protocol.DOM.CharacterDataModifiedEvent): void {
    this.#domModel.characterDataModified(nodeId, characterData);
  }

  setChildNodes({parentId, nodes}: Protocol.DOM.SetChildNodesEvent): void {
    this.#domModel.setChildNodes(parentId, nodes);
  }

  childNodeCountUpdated({nodeId, childNodeCount}: Protocol.DOM.ChildNodeCountUpdatedEvent): void {
    this.#domModel.childNodeCountUpdated(nodeId, childNodeCount);
  }

  childNodeInserted({parentNodeId, previousNodeId, node}: Protocol.DOM.ChildNodeInsertedEvent): void {
    this.#domModel.childNodeInserted(parentNodeId, previousNodeId, node);
  }

  childNodeRemoved({parentNodeId, nodeId}: Protocol.DOM.ChildNodeRemovedEvent): void {
    this.#domModel.childNodeRemoved(parentNodeId, nodeId);
  }

  shadowRootPushed({hostId, root}: Protocol.DOM.ShadowRootPushedEvent): void {
    this.#domModel.shadowRootPushed(hostId, root);
  }

  shadowRootPopped({hostId, rootId}: Protocol.DOM.ShadowRootPoppedEvent): void {
    this.#domModel.shadowRootPopped(hostId, rootId);
  }

  pseudoElementAdded({parentId, pseudoElement}: Protocol.DOM.PseudoElementAddedEvent): void {
    this.#domModel.pseudoElementAdded(parentId, pseudoElement);
  }

  pseudoElementRemoved({parentId, pseudoElementId}: Protocol.DOM.PseudoElementRemovedEvent): void {
    this.#domModel.pseudoElementRemoved(parentId, pseudoElementId);
  }

  distributedNodesUpdated({insertionPointId, distributedNodes}: Protocol.DOM.DistributedNodesUpdatedEvent): void {
    this.#domModel.distributedNodesUpdated(insertionPointId, distributedNodes);
  }

  topLayerElementsUpdated(): void {
    this.#domModel.topLayerElementsUpdated();
  }

  scrollableFlagUpdated({nodeId, isScrollable}: Protocol.DOM.ScrollableFlagUpdatedEvent): void {
    this.#domModel.scrollableFlagUpdated(nodeId, isScrollable);
  }
}

let domModelUndoStackInstance: DOMModelUndoStack|null = null;

export class DOMModelUndoStack {
  #stack: DOMModel[];
  #index: number;
  #lastModelWithMinorChange: DOMModel|null;
  constructor() {
    this.#stack = [];
    this.#index = 0;
    this.#lastModelWithMinorChange = null;
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): DOMModelUndoStack {
    const {forceNew} = opts;
    if (!domModelUndoStackInstance || forceNew) {
      domModelUndoStackInstance = new DOMModelUndoStack();
    }

    return domModelUndoStackInstance;
  }

  async markUndoableState(model: DOMModel, minorChange: boolean): Promise<void> {
    // Both minor and major changes get into the #stack, but minor updates are coalesced.
    // Commit major undoable state in the old model upon model switch.
    if (this.#lastModelWithMinorChange && model !== this.#lastModelWithMinorChange) {
      this.#lastModelWithMinorChange.markUndoableState();
      this.#lastModelWithMinorChange = null;
    }

    // Previous minor change is already in the #stack.
    if (minorChange && this.#lastModelWithMinorChange === model) {
      return;
    }

    this.#stack = this.#stack.slice(0, this.#index);
    this.#stack.push(model);
    this.#index = this.#stack.length;

    // Delay marking as major undoable states in case of minor operations until the
    // major or model switch.
    if (minorChange) {
      this.#lastModelWithMinorChange = model;
    } else {
      await model.getAgent().invoke_markUndoableState();
      this.#lastModelWithMinorChange = null;
    }
  }

  async undo(): Promise<void> {
    if (this.#index === 0) {
      return Promise.resolve();
    }
    --this.#index;
    this.#lastModelWithMinorChange = null;
    await this.#stack[this.#index].getAgent().invoke_undo();
  }

  async redo(): Promise<void> {
    if (this.#index >= this.#stack.length) {
      return Promise.resolve();
    }
    ++this.#index;
    this.#lastModelWithMinorChange = null;
    await this.#stack[this.#index - 1].getAgent().invoke_redo();
  }

  dispose(model: DOMModel): void {
    let shift = 0;
    for (let i = 0; i < this.#index; ++i) {
      if (this.#stack[i] === model) {
        ++shift;
      }
    }
    Platform.ArrayUtilities.removeElement(this.#stack, model);
    this.#index -= shift;
    if (this.#lastModelWithMinorChange === model) {
      this.#lastModelWithMinorChange = null;
    }
  }
}

SDKModel.register(DOMModel, {capabilities: Capability.DOM, autostart: true});
export interface Attribute {
  name: string;
  value: string;
  _node: DOMNode;
}
