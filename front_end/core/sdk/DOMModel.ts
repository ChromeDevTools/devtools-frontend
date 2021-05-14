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
 *     * Neither the name of Google Inc. nor the names of its
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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js'; // eslint-disable-line no-unused-vars
import * as Root from '../root/root.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {CSSModel} from './CSSModel.js';
import {FrameManager} from './FrameManager.js';
import {OverlayModel} from './OverlayModel.js';
import type {RemoteObject} from './RemoteObject.js'; // eslint-disable-line no-unused-vars
import {RuntimeModel} from './RuntimeModel.js';
import type {Target} from './SDKModel.js';
import {Capability, SDKModel, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class DOMNode {
  _domModel: DOMModel;
  _agent: ProtocolProxyApi.DOMApi;
  ownerDocument!: DOMDocument|null;
  _isInShadowTree!: boolean;
  id!: number;
  index: number|undefined;
  _backendNodeId!: number;
  _nodeType!: number;
  _nodeName!: string;
  _localName!: string;
  _nodeValue!: string;
  _pseudoType!: Protocol.DOM.PseudoType|undefined;
  _shadowRootType!: Protocol.DOM.ShadowRootType|undefined;
  _frameOwnerFrameId!: string|null;
  _xmlVersion!: string|undefined;
  _isSVGNode!: boolean;
  _creationStackTrace: Promise<Protocol.Runtime.StackTrace|null>|null;
  _pseudoElements: Map<string, DOMNode>;
  _distributedNodes: DOMNodeShortcut[];
  _shadowRoots: DOMNode[];
  _attributes: Map<string, Attribute>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _markers: Map<string, any>;
  _subtreeMarkerCount: number;
  _childNodeCount!: number;
  _children: DOMNode[]|null;
  nextSibling: DOMNode|null;
  previousSibling: DOMNode|null;
  firstChild: DOMNode|null;
  lastChild: DOMNode|null;
  parentNode: DOMNode|null;
  _templateContent?: DOMNode;
  _contentDocument?: DOMDocument;
  _childDocumentPromiseForTesting?: Promise<DOMDocument|null>;
  _importedDocument?: DOMNode;
  publicId?: string;
  systemId?: string;
  internalSubset?: string;
  name?: string;
  value?: string;

  constructor(domModel: DOMModel) {
    this._domModel = domModel;
    this._agent = this._domModel._agent;
    this.index = undefined;
    this._creationStackTrace = null;
    this._pseudoElements = new Map();
    this._distributedNodes = [];
    this._shadowRoots = [];
    this._attributes = new Map();
    this._markers = new Map();
    this._subtreeMarkerCount = 0;
    this._children = null;
    this.nextSibling = null;
    this.previousSibling = null;
    this.firstChild = null;
    this.lastChild = null;
    this.parentNode = null;
  }

  static create(domModel: DOMModel, doc: DOMDocument|null, isInShadowTree: boolean, payload: Protocol.DOM.Node):
      DOMNode {
    const node = new DOMNode(domModel);
    node._init(doc, isInShadowTree, payload);
    return node;
  }

  _init(doc: DOMDocument|null, isInShadowTree: boolean, payload: Protocol.DOM.Node): void {
    this._agent = this._domModel._agent;
    this.ownerDocument = doc;
    this._isInShadowTree = isInShadowTree;

    this.id = payload.nodeId;
    this._backendNodeId = payload.backendNodeId;
    this._domModel._idToDOMNode[this.id] = this;
    this._nodeType = payload.nodeType;
    this._nodeName = payload.nodeName;
    this._localName = payload.localName;
    this._nodeValue = payload.nodeValue;
    this._pseudoType = payload.pseudoType;
    this._shadowRootType = payload.shadowRootType;
    this._frameOwnerFrameId = payload.frameId || null;
    this._xmlVersion = payload.xmlVersion;
    this._isSVGNode = Boolean(payload.isSVG);

    if (payload.attributes) {
      this._setAttributesPayload(payload.attributes);
    }

    this._childNodeCount = payload.childNodeCount || 0;
    if (payload.shadowRoots) {
      for (let i = 0; i < payload.shadowRoots.length; ++i) {
        const root = payload.shadowRoots[i];
        const node = DOMNode.create(this._domModel, this.ownerDocument, true, root);
        this._shadowRoots.push(node);
        node.parentNode = this;
      }
    }

    if (payload.templateContent) {
      this._templateContent = DOMNode.create(this._domModel, this.ownerDocument, true, payload.templateContent);
      this._templateContent.parentNode = this;
      this._children = [];
    }

    if (payload.contentDocument) {
      this._contentDocument = new DOMDocument(this._domModel, payload.contentDocument);
      this._contentDocument.parentNode = this;
      this._children = [];
    } else if ((payload.nodeName === 'IFRAME' || payload.nodeName === 'PORTAL') && payload.frameId) {
      const childTarget = TargetManager.instance().targetById(payload.frameId);
      const childModel = childTarget ? childTarget.model(DOMModel) : null;
      if (childModel) {
        this._childDocumentPromiseForTesting = childModel.requestDocument();
      }
      this._children = [];
    }

    if (payload.importedDocument) {
      this._importedDocument = DOMNode.create(this._domModel, this.ownerDocument, true, payload.importedDocument);
      this._importedDocument.parentNode = this;
      this._children = [];
    }

    if (payload.distributedNodes) {
      this._setDistributedNodePayloads(payload.distributedNodes);
    }

    if (payload.children) {
      this._setChildrenPayload(payload.children);
    }

    this._setPseudoElements(payload.pseudoElements);

    if (this._nodeType === Node.ELEMENT_NODE) {
      // HTML and BODY from internal iframes should not overwrite top-level ones.
      if (this.ownerDocument && !this.ownerDocument.documentElement && this._nodeName === 'HTML') {
        this.ownerDocument.documentElement = this;
      }
      if (this.ownerDocument && !this.ownerDocument.body && this._nodeName === 'BODY') {
        this.ownerDocument.body = this;
      }
    } else if (this._nodeType === Node.DOCUMENT_TYPE_NODE) {
      this.publicId = payload.publicId;
      this.systemId = payload.systemId;
      this.internalSubset = payload.internalSubset;
    } else if (this._nodeType === Node.ATTRIBUTE_NODE) {
      this.name = payload.name;
      this.value = payload.value;
    }
  }

  isAdFrameNode(): boolean {
    if (this.isIframe() && this._frameOwnerFrameId) {
      const frame = FrameManager.instance().getFrame(this._frameOwnerFrameId);
      if (!frame) {
        return false;
      }
      return frame.adFrameType() !== Protocol.Page.AdFrameType.None;
    }
    return false;
  }

  isSVGNode(): boolean {
    return this._isSVGNode;
  }

  creationStackTrace(): Promise<Protocol.Runtime.StackTrace|null> {
    if (this._creationStackTrace) {
      return this._creationStackTrace;
    }

    const stackTracesPromise = this._agent.invoke_getNodeStackTraces({nodeId: this.id});
    this._creationStackTrace = stackTracesPromise.then(res => res.creation || null);
    return this._creationStackTrace;
  }

  domModel(): DOMModel {
    return this._domModel;
  }

  backendNodeId(): number {
    return this._backendNodeId;
  }

  children(): DOMNode[]|null {
    return this._children ? this._children.slice() : null;
  }

  hasAttributes(): boolean {
    return this._attributes.size > 0;
  }

  childNodeCount(): number {
    return this._childNodeCount;
  }

  hasShadowRoots(): boolean {
    return Boolean(this._shadowRoots.length);
  }

  shadowRoots(): DOMNode[] {
    return this._shadowRoots.slice();
  }

  templateContent(): DOMNode|null {
    return this._templateContent || null;
  }

  contentDocument(): DOMNode|null {
    return this._contentDocument || null;
  }

  isIframe(): boolean {
    return this._nodeName === 'IFRAME';
  }

  isPortal(): boolean {
    return this._nodeName === 'PORTAL';
  }

  importedDocument(): DOMNode|null {
    return this._importedDocument || null;
  }

  nodeType(): number {
    return this._nodeType;
  }

  nodeName(): string {
    return this._nodeName;
  }

  pseudoType(): string|undefined {
    return this._pseudoType;
  }

  hasPseudoElements(): boolean {
    return this._pseudoElements.size > 0;
  }

  pseudoElements(): Map<string, DOMNode> {
    return this._pseudoElements;
  }

  beforePseudoElement(): DOMNode|null {
    if (!this._pseudoElements) {
      return null;
    }
    return this._pseudoElements.get(DOMNode.PseudoElementNames.Before) || null;
  }

  afterPseudoElement(): DOMNode|null {
    if (!this._pseudoElements) {
      return null;
    }
    return this._pseudoElements.get(DOMNode.PseudoElementNames.After) || null;
  }

  markerPseudoElement(): DOMNode|null {
    if (!this._pseudoElements) {
      return null;
    }
    return this._pseudoElements.get(DOMNode.PseudoElementNames.Marker) || null;
  }

  isInsertionPoint(): boolean {
    return !this.isXMLNode() &&
        (this._nodeName === 'SHADOW' || this._nodeName === 'CONTENT' || this._nodeName === 'SLOT');
  }

  distributedNodes(): DOMNodeShortcut[] {
    return this._distributedNodes;
  }

  isInShadowTree(): boolean {
    return this._isInShadowTree;
  }

  ancestorShadowHost(): DOMNode|null {
    const ancestorShadowRoot = this.ancestorShadowRoot();
    return ancestorShadowRoot ? ancestorShadowRoot.parentNode : null;
  }

  ancestorShadowRoot(): DOMNode|null {
    if (!this._isInShadowTree) {
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
    return Boolean(this._shadowRootType);
  }

  shadowRootType(): string|null {
    return this._shadowRootType || null;
  }

  nodeNameInCorrectCase(): string {
    const shadowRootType = this.shadowRootType();
    if (shadowRootType) {
      return '#shadow-root (' + shadowRootType + ')';
    }

    // If there is no local name, it's case sensitive
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

  setNodeName(
      name: string,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback?: ((arg0: ProtocolClient.InspectorBackend.ProtocolError|null, arg1: DOMNode|null) => any)): void {
    this._agent.invoke_setNodeName({nodeId: this.id, name}).then(response => {
      if (!response.getError()) {
        this._domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null, this._domModel.nodeForId(response.nodeId));
      }
    });
  }

  localName(): string {
    return this._localName;
  }

  nodeValue(): string {
    return this._nodeValue;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNodeValue(value: string, callback?: ((arg0: ProtocolClient.InspectorBackend.ProtocolError|null) => any)): void {
    this._agent.invoke_setNodeValue({nodeId: this.id, value}).then(response => {
      if (!response.getError()) {
        this._domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  getAttribute(name: string): string|undefined {
    const attr = this._attributes.get(name);
    return attr ? attr.value : undefined;
  }

  setAttribute(
      name: string, text: string,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback?: ((arg0: ProtocolClient.InspectorBackend.ProtocolError|null) => any)): void {
    this._agent.invoke_setAttributesAsText({nodeId: this.id, text, name}).then(response => {
      if (!response.getError()) {
        this._domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  setAttributeValue(
      name: string, value: string,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback?: ((arg0: ProtocolClient.InspectorBackend.ProtocolError|null) => any)): void {
    this._agent.invoke_setAttributeValue({nodeId: this.id, name, value}).then(response => {
      if (!response.getError()) {
        this._domModel.markUndoableState();
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
    return [...this._attributes.values()];
  }

  async removeAttribute(name: string): Promise<void> {
    const response = await this._agent.invoke_removeAttribute({nodeId: this.id, name});
    if (response.getError()) {
      return;
    }
    this._attributes.delete(name);
    this._domModel.markUndoableState();
  }

  getChildNodes(callback: (arg0: Array<DOMNode>|null) => void): void {
    if (this._children) {
      callback(this.children());
      return;
    }
    this._agent.invoke_requestChildNodes({nodeId: this.id}).then(response => {
      callback(response.getError() ? null : this.children());
    });
  }

  async getSubtree(depth: number, pierce: boolean): Promise<DOMNode[]|null> {
    const response = await this._agent.invoke_requestChildNodes({nodeId: this.id, depth: depth, pierce: pierce});
    return response.getError() ? null : this._children;
  }

  async getOuterHTML(): Promise<string|null> {
    const {outerHTML} = await this._agent.invoke_getOuterHTML({nodeId: this.id});
    return outerHTML;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOuterHTML(html: string, callback?: ((arg0: ProtocolClient.InspectorBackend.ProtocolError|null) => any)): void {
    this._agent.invoke_setOuterHTML({nodeId: this.id, outerHTML: html}).then(response => {
      if (!response.getError()) {
        this._domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  removeNode(callback?: (
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (arg0: ProtocolClient.InspectorBackend.ProtocolError|null, arg1?: Protocol.DOM.NodeId|undefined) => any)): void {
    this._agent.invoke_removeNode({nodeId: this.id}).then(response => {
      if (!response.getError()) {
        this._domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  async copyNode(): Promise<string|null> {
    const {outerHTML} = await this._agent.invoke_getOuterHTML({nodeId: this.id});
    if (outerHTML !== null) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(outerHTML);
    }
    return outerHTML;
  }

  path(): string {
    function canPush(node: DOMNode): number|false|null {
      return (node.index !== undefined || (node.isShadowRoot() && node.parentNode)) && node._nodeName.length;
    }

    const path = [];
    let node: (DOMNode|null) = (this as DOMNode | null);
    while (node && canPush(node)) {
      const index = typeof node.index === 'number' ?
          node.index :
          (node.shadowRootType() === DOMNode.ShadowRootTypes.UserAgent ? 'u' : 'a');
      path.push([index, node._nodeName]);
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

  frameOwnerFrameId(): string|null {
    return this._frameOwnerFrameId;
  }

  frameId(): string|null {
    let node: DOMNode = this.parentNode || this;
    while (!node._frameOwnerFrameId && node.parentNode) {
      node = node.parentNode;
    }
    return node._frameOwnerFrameId;
  }

  _setAttributesPayload(attrs: string[]): boolean {
    let attributesChanged: true|boolean = !this._attributes || attrs.length !== this._attributes.size * 2;
    const oldAttributesMap = this._attributes || new Map();

    this._attributes = new Map();

    for (let i = 0; i < attrs.length; i += 2) {
      const name = attrs[i];
      const value = attrs[i + 1];
      this._addAttribute(name, value);

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

  _insertChild(prev: DOMNode, payload: Protocol.DOM.Node): DOMNode {
    if (!this._children) {
      throw new Error('DOMNode._children is expected to not be null.');
    }
    const node = DOMNode.create(this._domModel, this.ownerDocument, this._isInShadowTree, payload);
    this._children.splice(this._children.indexOf(prev) + 1, 0, node);
    this._renumber();
    return node;
  }

  _removeChild(node: DOMNode): void {
    const pseudoType = node.pseudoType();
    if (pseudoType) {
      this._pseudoElements.delete(pseudoType);
    } else {
      const shadowRootIndex = this._shadowRoots.indexOf(node);
      if (shadowRootIndex !== -1) {
        this._shadowRoots.splice(shadowRootIndex, 1);
      } else {
        if (!this._children) {
          throw new Error('DOMNode._children is expected to not be null.');
        }
        if (this._children.indexOf(node) === -1) {
          throw new Error('DOMNode._children is expected to contain the node to be removed.');
        }
        this._children.splice(this._children.indexOf(node), 1);
      }
    }
    node.parentNode = null;
    this._subtreeMarkerCount -= node._subtreeMarkerCount;
    if (node._subtreeMarkerCount) {
      this._domModel.dispatchEventToListeners(Events.MarkersChanged, this);
    }
    this._renumber();
  }

  _setChildrenPayload(payloads: Protocol.DOM.Node[]): void {
    this._children = [];
    for (let i = 0; i < payloads.length; ++i) {
      const payload = payloads[i];
      const node = DOMNode.create(this._domModel, this.ownerDocument, this._isInShadowTree, payload);
      this._children.push(node);
    }
    this._renumber();
  }

  _setPseudoElements(payloads: Protocol.DOM.Node[]|undefined): void {
    if (!payloads) {
      return;
    }

    for (let i = 0; i < payloads.length; ++i) {
      const node = DOMNode.create(this._domModel, this.ownerDocument, this._isInShadowTree, payloads[i]);
      node.parentNode = this;
      const pseudoType = node.pseudoType();
      if (!pseudoType) {
        throw new Error('DOMNode.pseudoType() is expected to be defined.');
      }
      this._pseudoElements.set(pseudoType, node);
    }
  }

  _setDistributedNodePayloads(payloads: Protocol.DOM.BackendNode[]): void {
    this._distributedNodes = [];
    for (const payload of payloads) {
      this._distributedNodes.push(
          new DOMNodeShortcut(this._domModel.target(), payload.backendNodeId, payload.nodeType, payload.nodeName));
    }
  }

  _renumber(): void {
    if (!this._children) {
      throw new Error('DOMNode._children is expected to not be null.');
    }
    this._childNodeCount = this._children.length;
    if (this._childNodeCount === 0) {
      this.firstChild = null;
      this.lastChild = null;
      return;
    }
    this.firstChild = this._children[0];
    this.lastChild = this._children[this._childNodeCount - 1];
    for (let i = 0; i < this._childNodeCount; ++i) {
      const child = this._children[i];
      child.index = i;
      child.nextSibling = i + 1 < this._childNodeCount ? this._children[i + 1] : null;
      child.previousSibling = i - 1 >= 0 ? this._children[i - 1] : null;
      child.parentNode = this;
    }
  }

  _addAttribute(name: string, value: string): void {
    const attr = {name: name, value: value, _node: this};
    this._attributes.set(name, attr);
  }

  _setAttribute(name: string, value: string): void {
    const attr = this._attributes.get(name);
    if (attr) {
      attr.value = value;
    } else {
      this._addAttribute(name, value);
    }
  }

  _removeAttribute(name: string): void {
    this._attributes.delete(name);
  }

  copyTo(
      targetNode: DOMNode, anchorNode: DOMNode|null,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback?: ((arg0: ProtocolClient.InspectorBackend.ProtocolError|null, arg1: DOMNode|null) => any)): void {
    this._agent
        .invoke_copyTo(
            {nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined})
        .then(response => {
          if (!response.getError()) {
            this._domModel.markUndoableState();
          }
          if (callback) {
            callback(response.getError() || null, this._domModel.nodeForId(response.nodeId));
          }
        });
  }

  moveTo(
      targetNode: DOMNode, anchorNode: DOMNode|null,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback?: ((arg0: ProtocolClient.InspectorBackend.ProtocolError|null, arg1: DOMNode|null) => any)): void {
    this._agent
        .invoke_moveTo(
            {nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined})
        .then(response => {
          if (!response.getError()) {
            this._domModel.markUndoableState();
          }
          if (callback) {
            callback(response.getError() || null, this._domModel.nodeForId(response.nodeId));
          }
        });
  }

  isXMLNode(): boolean {
    return Boolean(this._xmlVersion);
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setMarker(name: string, value: any): void {
    if (value === null) {
      if (!this._markers.has(name)) {
        return;
      }

      this._markers.delete(name);
      for (let node: (DOMNode|null) = (this as DOMNode | null); node; node = node.parentNode) {
        --node._subtreeMarkerCount;
      }
      for (let node: (DOMNode|null) = (this as DOMNode | null); node; node = node.parentNode) {
        this._domModel.dispatchEventToListeners(Events.MarkersChanged, node);
      }
      return;
    }

    if (this.parentNode && !this._markers.has(name)) {
      for (let node: (DOMNode|null) = (this as DOMNode | null); node; node = node.parentNode) {
        ++node._subtreeMarkerCount;
      }
    }
    this._markers.set(name, value);
    for (let node: (DOMNode|null) = (this as DOMNode | null); node; node = node.parentNode) {
      this._domModel.dispatchEventToListeners(Events.MarkersChanged, node);
    }
  }

  marker<T>(name: string): T|null {
    return this._markers.get(name) || null;
  }

  traverseMarkers(visitor: (arg0: DOMNode, arg1: string) => void): void {
    function traverse(node: DOMNode): void {
      if (!node._subtreeMarkerCount) {
        return;
      }
      for (const marker of node._markers.keys()) {
        visitor(node, marker);
      }
      if (!node._children) {
        return;
      }
      for (const child of node._children) {
        traverse(child);
      }
    }
    traverse(this);
  }

  resolveURL(url: string): string|null {
    if (!url) {
      return url;
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
    this._domModel.overlayModel().highlightInOverlay({node: this, selectorList: undefined}, mode);
  }

  highlightForTwoSeconds(): void {
    this._domModel.overlayModel().highlightInOverlayForTwoSeconds({node: this, selectorList: undefined});
  }

  async resolveToObject(objectGroup?: string): Promise<RemoteObject|null> {
    const {object} = await this._agent.invoke_resolveNode({nodeId: this.id, backendNodeId: undefined, objectGroup});
    return object && this._domModel._runtimeModel.createRemoteObject(object) || null;
  }

  async boxModel(): Promise<Protocol.DOM.BoxModel|null> {
    const {model} = await this._agent.invoke_getBoxModel({nodeId: this.id});
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
      // User agent shadow root, keep climbing up.
      node = ancestor;
    }
    if (!node) {
      throw new Error('In DOMNode.setAsInspectedNode: node is expected to not be null.');
    }
    await this._agent.invoke_setInspectedNode({nodeId: node.id});
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

  async scrollIntoView(): Promise<void> {
    const node = this.enclosingElementOrSelf();
    if (!node) {
      return;
    }
    const object = await node.resolveToObject();
    if (!object) {
      return;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    object.callFunction(scrollIntoView);
    object.release();
    node.highlightForTwoSeconds();

    function scrollIntoView(this: Element): void {
      this.scrollIntoViewIfNeeded(true);
    }
  }

  async focus(): Promise<void> {
    const node = this.enclosingElementOrSelf();
    if (!node) {
      throw new Error('DOMNode.focus expects node to not be null.');
    }
    const object = await node.resolveToObject();
    if (!object) {
      return;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    await object.callFunction(focusInPage);
    object.release();
    node.highlightForTwoSeconds();
    await this._domModel.target().pageAgent().invoke_bringToFront();

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
    return lowerCaseName;
  }
}

export namespace DOMNode {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum PseudoElementNames {
    Before = 'before',
    After = 'after',
    Marker = 'marker',
  }

  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum ShadowRootTypes {
    UserAgent = 'user-agent',
    Open = 'open',
    Closed = 'closed',
  }
}

export class DeferredDOMNode {
  _domModel: DOMModel;
  _backendNodeId: number;

  constructor(target: Target, backendNodeId: number) {
    this._domModel = (target.model(DOMModel) as DOMModel);
    this._backendNodeId = backendNodeId;
  }

  resolve(callback: (arg0: DOMNode|null) => void): void {
    this.resolvePromise().then(callback);
  }

  async resolvePromise(): Promise<DOMNode|null> {
    const nodeIds = await this._domModel.pushNodesByBackendIdsToFrontend(new Set([this._backendNodeId]));
    return nodeIds && nodeIds.get(this._backendNodeId) || null;
  }

  backendNodeId(): number {
    return this._backendNodeId;
  }

  domModel(): DOMModel {
    return this._domModel;
  }

  highlight(): void {
    this._domModel.overlayModel().highlightInOverlay({deferredNode: this, selectorList: undefined});
  }
}

export class DOMNodeShortcut {
  nodeType: number;
  nodeName: string;
  deferredNode: DeferredDOMNode;
  constructor(target: Target, backendNodeId: number, nodeType: number, nodeName: string) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.deferredNode = new DeferredDOMNode(target, backendNodeId);
  }
}

export class DOMDocument extends DOMNode {
  body: DOMNode|null;
  documentElement: DOMNode|null;
  documentURL: string;
  baseURL: string;
  constructor(domModel: DOMModel, payload: Protocol.DOM.Node) {
    super(domModel);
    this.body = null;
    this.documentElement = null;
    this._init(this, false, payload);
    this.documentURL = payload.documentURL || '';
    this.baseURL = payload.baseURL || '';
  }
}

export class DOMModel extends SDKModel {
  _agent: ProtocolProxyApi.DOMApi;
  _idToDOMNode: {
    [x: number]: DOMNode,
  };
  _document: DOMDocument|null;
  _attributeLoadNodeIds: Set<number>;
  _runtimeModel: RuntimeModel;
  _lastMutationId!: number;
  _pendingDocumentRequestPromise: Promise<DOMDocument|null>|null;
  _frameOwnerNode?: DOMNode|null;
  _loadNodeAttributesTimeout?: number;
  _searchId?: string;
  constructor(target: Target) {
    super(target);

    this._agent = target.domAgent();

    this._idToDOMNode = {};
    this._document = null;
    this._attributeLoadNodeIds = new Set();
    target.registerDOMDispatcher(new DOMDispatcher(this));
    this._runtimeModel = (target.model(RuntimeModel) as RuntimeModel);

    this._pendingDocumentRequestPromise = null;

    if (!target.suspended()) {
      this._agent.invoke_enable();
    }

    if (Root.Runtime.experiments.isEnabled('captureNodeCreationStacks')) {
      this._agent.invoke_setNodeStackTracesEnabled({enable: true});
    }
  }

  runtimeModel(): RuntimeModel {
    return this._runtimeModel;
  }

  cssModel(): CSSModel {
    return /** @type {!CSSModel} */ this.target().model(CSSModel) as CSSModel;
  }

  overlayModel(): OverlayModel {
    return /** @type {!OverlayModel} */ this.target().model(OverlayModel) as OverlayModel;
  }

  static cancelSearch(): void {
    for (const domModel of TargetManager.instance().models(DOMModel)) {
      domModel._cancelSearch();
    }
  }

  _scheduleMutationEvent(node: DOMNode): void {
    if (!this.hasEventListeners(Events.DOMMutated)) {
      return;
    }

    this._lastMutationId = (this._lastMutationId || 0) + 1;
    Promise.resolve().then(callObserve.bind(this, node, this._lastMutationId));

    function callObserve(this: DOMModel, node: DOMNode, mutationId: number): void {
      if (!this.hasEventListeners(Events.DOMMutated) || this._lastMutationId !== mutationId) {
        return;
      }

      this.dispatchEventToListeners(Events.DOMMutated, node);
    }
  }

  requestDocument(): Promise<DOMDocument|null> {
    if (this._document) {
      return Promise.resolve(this._document);
    }
    if (!this._pendingDocumentRequestPromise) {
      this._pendingDocumentRequestPromise = this._requestDocument();
    }
    return this._pendingDocumentRequestPromise;
  }

  async getOwnerNodeForFrame(frameId: string): Promise<DeferredDOMNode|null> {
    // Returns an error if the frameId does not belong to the current target.
    const response = await this._agent.invoke_getFrameOwner({frameId});
    if (response.getError()) {
      return null;
    }
    return new DeferredDOMNode(this.target(), response.backendNodeId);
  }

  async _requestDocument(): Promise<DOMDocument|null> {
    const response = await this._agent.invoke_getDocument({});
    if (response.getError()) {
      console.error(response.getError());
      return null;
    }
    const {root: documentPayload} = response;
    this._pendingDocumentRequestPromise = null;

    if (documentPayload) {
      this._setDocument(documentPayload);
    }
    if (!this._document) {
      console.error('No document');
      return null;
    }

    const parentModel = this.parentModel();
    if (parentModel && !this._frameOwnerNode) {
      await parentModel.requestDocument();
      const response = await parentModel._agent.invoke_getFrameOwner({frameId: this.target().id()});
      if (!response.getError() && response.nodeId) {
        this._frameOwnerNode = parentModel.nodeForId(response.nodeId);
      }
    }

    // Document could have been cleared by now.
    if (this._frameOwnerNode) {
      const oldDocument = this._frameOwnerNode._contentDocument;
      this._frameOwnerNode._contentDocument = this._document;
      this._frameOwnerNode._children = [];
      if (this._document) {
        this._document.parentNode = this._frameOwnerNode;
        this.dispatchEventToListeners(Events.NodeInserted, this._document);
      } else if (oldDocument) {
        this.dispatchEventToListeners(Events.NodeRemoved, {node: oldDocument, parent: this._frameOwnerNode});
      }
    }
    return this._document;
  }

  existingDocument(): DOMDocument|null {
    return this._document;
  }

  async pushNodeToFrontend(objectId: string): Promise<DOMNode|null> {
    await this.requestDocument();
    const {nodeId} = await this._agent.invoke_requestNode({objectId});
    return nodeId ? this.nodeForId(nodeId) : null;
  }

  pushNodeByPathToFrontend(path: string): Promise<number|null> {
    return this.requestDocument()
        .then(() => this._agent.invoke_pushNodeByPathToFrontend({path}))
        .then(({nodeId}) => nodeId);
  }

  async pushNodesByBackendIdsToFrontend(backendNodeIds: Set<number>): Promise<Map<number, DOMNode|null>|null> {
    await this.requestDocument();
    const backendNodeIdsArray = [...backendNodeIds];
    const {nodeIds} = await this._agent.invoke_pushNodesByBackendIdsToFrontend({backendNodeIds: backendNodeIdsArray});
    if (!nodeIds) {
      return null;
    }
    const map = new Map<number, DOMNode|null>();
    for (let i = 0; i < nodeIds.length; ++i) {
      if (nodeIds[i]) {
        map.set(backendNodeIdsArray[i], this.nodeForId(nodeIds[i]));
      }
    }
    return map;
  }

  _attributeModified(nodeId: number, name: string, value: string): void {
    const node = this._idToDOMNode[nodeId];
    if (!node) {
      return;
    }

    node._setAttribute(name, value);
    this.dispatchEventToListeners(Events.AttrModified, {node: node, name: name});
    this._scheduleMutationEvent(node);
  }

  _attributeRemoved(nodeId: number, name: string): void {
    const node = this._idToDOMNode[nodeId];
    if (!node) {
      return;
    }
    node._removeAttribute(name);
    this.dispatchEventToListeners(Events.AttrRemoved, {node: node, name: name});
    this._scheduleMutationEvent(node);
  }

  _inlineStyleInvalidated(nodeIds: number[]): void {
    Platform.SetUtilities.addAll(this._attributeLoadNodeIds, nodeIds);
    if (!this._loadNodeAttributesTimeout) {
      this._loadNodeAttributesTimeout = window.setTimeout(this._loadNodeAttributes.bind(this), 20);
    }
  }

  _loadNodeAttributes(): void {
    delete this._loadNodeAttributesTimeout;
    for (const nodeId of this._attributeLoadNodeIds) {
      this._agent.invoke_getAttributes({nodeId}).then(({attributes}) => {
        if (!attributes) {
          // We are calling _loadNodeAttributes asynchronously, it is ok if node is not found.
          return;
        }
        const node = this._idToDOMNode[nodeId];
        if (!node) {
          return;
        }
        if (node._setAttributesPayload(attributes)) {
          this.dispatchEventToListeners(Events.AttrModified, {node: node, name: 'style'});
          this._scheduleMutationEvent(node);
        }
      });
    }
    this._attributeLoadNodeIds.clear();
  }

  _characterDataModified(nodeId: number, newValue: string): void {
    const node = this._idToDOMNode[nodeId];
    node._nodeValue = newValue;
    this.dispatchEventToListeners(Events.CharacterDataModified, node);
    this._scheduleMutationEvent(node);
  }

  nodeForId(nodeId: number|null): DOMNode|null {
    return nodeId ? this._idToDOMNode[nodeId] || null : null;
  }

  _documentUpdated(): void {
    // If we have this._pendingDocumentRequestPromise in flight,
    // if it hits backend post document update, it will contain most recent result.
    const documentWasRequested = this._document || this._pendingDocumentRequestPromise;
    this._setDocument(null);
    if (this.parentModel() && documentWasRequested) {
      this.requestDocument();
    }
  }

  _setDocument(payload: Protocol.DOM.Node|null): void {
    this._idToDOMNode = {};
    if (payload && 'nodeId' in payload) {
      this._document = new DOMDocument(this, payload);
    } else {
      this._document = null;
    }
    DOMModelUndoStack.instance()._dispose(this);

    if (!this.parentModel()) {
      this.dispatchEventToListeners(Events.DocumentUpdated, this);
    }
  }

  _setDetachedRoot(payload: Protocol.DOM.Node): void {
    if (payload.nodeName === '#document') {
      new DOMDocument(this, payload);
    } else {
      DOMNode.create(this, null, false, payload);
    }
  }

  _setChildNodes(parentId: number, payloads: Protocol.DOM.Node[]): void {
    if (!parentId && payloads.length) {
      this._setDetachedRoot(payloads[0]);
      return;
    }

    const parent = this._idToDOMNode[parentId];
    parent._setChildrenPayload(payloads);
  }

  _childNodeCountUpdated(nodeId: number, newValue: number): void {
    const node = this._idToDOMNode[nodeId];
    node._childNodeCount = newValue;
    this.dispatchEventToListeners(Events.ChildNodeCountUpdated, node);
    this._scheduleMutationEvent(node);
  }

  _childNodeInserted(parentId: number, prevId: number, payload: Protocol.DOM.Node): void {
    const parent = this._idToDOMNode[parentId];
    const prev = this._idToDOMNode[prevId];
    const node = parent._insertChild(prev, payload);
    this._idToDOMNode[node.id] = node;
    this.dispatchEventToListeners(Events.NodeInserted, node);
    this._scheduleMutationEvent(node);
  }

  _childNodeRemoved(parentId: number, nodeId: number): void {
    const parent = this._idToDOMNode[parentId];
    const node = this._idToDOMNode[nodeId];
    parent._removeChild(node);
    this._unbind(node);
    this.dispatchEventToListeners(Events.NodeRemoved, {node: node, parent: parent});
    this._scheduleMutationEvent(node);
  }

  _shadowRootPushed(hostId: number, root: Protocol.DOM.Node): void {
    const host = this._idToDOMNode[hostId];
    if (!host) {
      return;
    }
    const node = DOMNode.create(this, host.ownerDocument, true, root);
    node.parentNode = host;
    this._idToDOMNode[node.id] = node;
    host._shadowRoots.unshift(node);
    this.dispatchEventToListeners(Events.NodeInserted, node);
    this._scheduleMutationEvent(node);
  }

  _shadowRootPopped(hostId: number, rootId: number): void {
    const host = this._idToDOMNode[hostId];
    if (!host) {
      return;
    }
    const root = this._idToDOMNode[rootId];
    if (!root) {
      return;
    }
    host._removeChild(root);
    this._unbind(root);
    this.dispatchEventToListeners(Events.NodeRemoved, {node: root, parent: host});
    this._scheduleMutationEvent(root);
  }

  _pseudoElementAdded(parentId: number, pseudoElement: Protocol.DOM.Node): void {
    const parent = this._idToDOMNode[parentId];
    if (!parent) {
      return;
    }
    const node = DOMNode.create(this, parent.ownerDocument, false, pseudoElement);
    node.parentNode = parent;
    this._idToDOMNode[node.id] = node;
    const pseudoType = node.pseudoType();
    if (!pseudoType) {
      throw new Error('DOMModel._pseudoElementAdded expects pseudoType to be defined.');
    }
    const previousPseudoType = parent._pseudoElements.get(pseudoType);
    if (previousPseudoType) {
      throw new Error('DOMModel._pseudoElementAdded expects parent to not already have this pseudo type added.');
    }
    parent._pseudoElements.set(pseudoType, node);
    this.dispatchEventToListeners(Events.NodeInserted, node);
    this._scheduleMutationEvent(node);
  }

  _pseudoElementRemoved(parentId: number, pseudoElementId: number): void {
    const parent = this._idToDOMNode[parentId];
    if (!parent) {
      return;
    }
    const pseudoElement = this._idToDOMNode[pseudoElementId];
    if (!pseudoElement) {
      return;
    }
    parent._removeChild(pseudoElement);
    this._unbind(pseudoElement);
    this.dispatchEventToListeners(Events.NodeRemoved, {node: pseudoElement, parent: parent});
    this._scheduleMutationEvent(pseudoElement);
  }

  _distributedNodesUpdated(insertionPointId: number, distributedNodes: Protocol.DOM.BackendNode[]): void {
    const insertionPoint = this._idToDOMNode[insertionPointId];
    if (!insertionPoint) {
      return;
    }
    insertionPoint._setDistributedNodePayloads(distributedNodes);
    this.dispatchEventToListeners(Events.DistributedNodesChanged, insertionPoint);
    this._scheduleMutationEvent(insertionPoint);
  }

  _unbind(node: DOMNode): void {
    delete this._idToDOMNode[node.id];
    for (let i = 0; node._children && i < node._children.length; ++i) {
      this._unbind(node._children[i]);
    }
    for (let i = 0; i < node._shadowRoots.length; ++i) {
      this._unbind(node._shadowRoots[i]);
    }
    const pseudoElements = node.pseudoElements();
    for (const value of pseudoElements.values()) {
      this._unbind(value);
    }
    if (node._templateContent) {
      this._unbind(node._templateContent);
    }
  }

  async getNodesByStyle(
      computedStyles: {
        name: string,
        value: string,
      }[],
      pierce: boolean = false): Promise<number[]> {
    await this.requestDocument();
    if (!this._document) {
      throw new Error('DOMModel.getNodesByStyle expects to have a document.');
    }
    const response =
        await this._agent.invoke_getNodesForSubtreeByStyle({nodeId: this._document.id, computedStyles, pierce});
    if (response.getError()) {
      throw response.getError();
    }
    return response.nodeIds;
  }

  async performSearch(query: string, includeUserAgentShadowDOM: boolean): Promise<number> {
    const response = await this._agent.invoke_performSearch({query, includeUserAgentShadowDOM});
    if (!response.getError()) {
      this._searchId = response.searchId;
    }
    return response.getError() ? 0 : response.resultCount;
  }

  async searchResult(index: number): Promise<DOMNode|null> {
    if (!this._searchId) {
      return null;
    }
    const {nodeIds} =
        await this._agent.invoke_getSearchResults({searchId: this._searchId, fromIndex: index, toIndex: index + 1});
    return nodeIds && nodeIds.length === 1 ? this.nodeForId(nodeIds[0]) : null;
  }

  _cancelSearch(): void {
    if (!this._searchId) {
      return;
    }
    this._agent.invoke_discardSearchResults({searchId: this._searchId});
    delete this._searchId;
  }

  classNamesPromise(nodeId: number): Promise<string[]> {
    return this._agent.invoke_collectClassNamesFromSubtree({nodeId}).then(({classNames}) => classNames || []);
  }

  querySelector(nodeId: number, selector: string): Promise<number|null> {
    return this._agent.invoke_querySelector({nodeId, selector}).then(({nodeId}) => nodeId);
  }

  querySelectorAll(nodeId: number, selector: string): Promise<number[]|null> {
    return this._agent.invoke_querySelectorAll({nodeId, selector}).then(({nodeIds}) => nodeIds);
  }

  markUndoableState(minorChange?: boolean): void {
    DOMModelUndoStack.instance()._markUndoableState(this, minorChange || false);
  }

  async nodeForLocation(x: number, y: number, includeUserAgentShadowDOM: boolean): Promise<DOMNode|null> {
    const response = await this._agent.invoke_getNodeForLocation({x, y, includeUserAgentShadowDOM});
    if (response.getError() || !response.nodeId) {
      return null;
    }
    return this.nodeForId(response.nodeId);
  }

  pushObjectAsNodeToFrontend(object: RemoteObject): Promise<DOMNode|null> {
    return object.isNode() ? this.pushNodeToFrontend((object.objectId as string)) : Promise.resolve(null);
  }

  suspendModel(): Promise<void> {
    return this._agent.invoke_disable().then(() => this._setDocument(null));
  }

  async resumeModel(): Promise<void> {
    await this._agent.invoke_enable();
  }

  dispose(): void {
    DOMModelUndoStack.instance()._dispose(this);
  }

  parentModel(): DOMModel|null {
    const parentTarget = this.target().parentTarget();
    return parentTarget ? parentTarget.model(DOMModel) : null;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
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
}


class DOMDispatcher implements ProtocolProxyApi.DOMDispatcher {
  _domModel: DOMModel;
  constructor(domModel: DOMModel) {
    this._domModel = domModel;
  }

  documentUpdated(): void {
    this._domModel._documentUpdated();
  }

  attributeModified({nodeId, name, value}: Protocol.DOM.AttributeModifiedEvent): void {
    this._domModel._attributeModified(nodeId, name, value);
  }

  attributeRemoved({nodeId, name}: Protocol.DOM.AttributeRemovedEvent): void {
    this._domModel._attributeRemoved(nodeId, name);
  }

  inlineStyleInvalidated({nodeIds}: Protocol.DOM.InlineStyleInvalidatedEvent): void {
    this._domModel._inlineStyleInvalidated(nodeIds);
  }

  characterDataModified({nodeId, characterData}: Protocol.DOM.CharacterDataModifiedEvent): void {
    this._domModel._characterDataModified(nodeId, characterData);
  }

  setChildNodes({parentId, nodes}: Protocol.DOM.SetChildNodesEvent): void {
    this._domModel._setChildNodes(parentId, nodes);
  }

  childNodeCountUpdated({nodeId, childNodeCount}: Protocol.DOM.ChildNodeCountUpdatedEvent): void {
    this._domModel._childNodeCountUpdated(nodeId, childNodeCount);
  }

  childNodeInserted({parentNodeId, previousNodeId, node}: Protocol.DOM.ChildNodeInsertedEvent): void {
    this._domModel._childNodeInserted(parentNodeId, previousNodeId, node);
  }

  childNodeRemoved({parentNodeId, nodeId}: Protocol.DOM.ChildNodeRemovedEvent): void {
    this._domModel._childNodeRemoved(parentNodeId, nodeId);
  }

  shadowRootPushed({hostId, root}: Protocol.DOM.ShadowRootPushedEvent): void {
    this._domModel._shadowRootPushed(hostId, root);
  }

  shadowRootPopped({hostId, rootId}: Protocol.DOM.ShadowRootPoppedEvent): void {
    this._domModel._shadowRootPopped(hostId, rootId);
  }

  pseudoElementAdded({parentId, pseudoElement}: Protocol.DOM.PseudoElementAddedEvent): void {
    this._domModel._pseudoElementAdded(parentId, pseudoElement);
  }

  pseudoElementRemoved({parentId, pseudoElementId}: Protocol.DOM.PseudoElementRemovedEvent): void {
    this._domModel._pseudoElementRemoved(parentId, pseudoElementId);
  }

  distributedNodesUpdated({insertionPointId, distributedNodes}: Protocol.DOM.DistributedNodesUpdatedEvent): void {
    this._domModel._distributedNodesUpdated(insertionPointId, distributedNodes);
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let DOMModelUndoStackInstance: DOMModelUndoStack|null;

export class DOMModelUndoStack {
  _stack: DOMModel[];
  _index: number;
  _lastModelWithMinorChange: DOMModel|null;
  constructor() {
    this._stack = [];
    this._index = 0;
    this._lastModelWithMinorChange = null;
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): DOMModelUndoStack {
    const {forceNew} = opts;
    if (!DOMModelUndoStackInstance || forceNew) {
      DOMModelUndoStackInstance = new DOMModelUndoStack();
    }

    return DOMModelUndoStackInstance;
  }

  async _markUndoableState(model: DOMModel, minorChange: boolean): Promise<void> {
    // Both minor and major changes get into the stack, but minor updates are coalesced.
    // Commit major undoable state in the old model upon model switch.
    if (this._lastModelWithMinorChange && model !== this._lastModelWithMinorChange) {
      this._lastModelWithMinorChange.markUndoableState();
      this._lastModelWithMinorChange = null;
    }

    // Previous minor change is already in the stack.
    if (minorChange && this._lastModelWithMinorChange === model) {
      return;
    }

    this._stack = this._stack.slice(0, this._index);
    this._stack.push(model);
    this._index = this._stack.length;

    // Delay marking as major undoable states in case of minor operations until the
    // major or model switch.
    if (minorChange) {
      this._lastModelWithMinorChange = model;
    } else {
      await model._agent.invoke_markUndoableState();
      this._lastModelWithMinorChange = null;
    }
  }

  async undo(): Promise<void> {
    if (this._index === 0) {
      return Promise.resolve();
    }
    --this._index;
    this._lastModelWithMinorChange = null;
    await this._stack[this._index]._agent.invoke_undo();
  }

  async redo(): Promise<void> {
    if (this._index >= this._stack.length) {
      return Promise.resolve();
    }
    ++this._index;
    this._lastModelWithMinorChange = null;
    await this._stack[this._index - 1]._agent.invoke_redo();
  }

  _dispose(model: DOMModel): void {
    let shift = 0;
    for (let i = 0; i < this._index; ++i) {
      if (this._stack[i] === model) {
        ++shift;
      }
    }
    Platform.ArrayUtilities.removeElement(this._stack, model);
    this._index -= shift;
    if (this._lastModelWithMinorChange === model) {
      this._lastModelWithMinorChange = null;
    }
  }
}

SDKModel.register(DOMModel, {capabilities: Capability.DOM, autostart: true});
export interface Attribute {
  name: string;
  value: string;
  _node: DOMNode;
}
