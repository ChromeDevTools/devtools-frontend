// Copyright 2021 The Chromium Authors
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
/* eslint-disable @devtools/no-adopted-style-sheets */

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {CSSModel} from './CSSModel.js';
import {FrameManager} from './FrameManager.js';
import {OverlayModel} from './OverlayModel.js';
import {RemoteObject} from './RemoteObject.js';
import {Events as ResourceTreeModelEvents, type ResourceTreeFrame, ResourceTreeModel} from './ResourceTreeModel.js';
import {RuntimeModel} from './RuntimeModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {TargetManager} from './TargetManager.js';

/** Keep this list in sync with https://w3c.github.io/aria/#state_prop_def **/
export const ARIA_ATTRIBUTES = new Set<string>([
  'role',
  'aria-activedescendant',
  'aria-atomic',
  'aria-autocomplete',
  'aria-braillelabel',
  'aria-brailleroledescription',
  'aria-busy',
  'aria-checked',
  'aria-colcount',
  'aria-colindex',
  'aria-colindextext',
  'aria-colspan',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-description',
  'aria-details',
  'aria-disabled',
  'aria-dropeffect',
  'aria-errormessage',
  'aria-expanded',
  'aria-flowto',
  'aria-grabbed',
  'aria-haspopup',
  'aria-hidden',
  'aria-invalid',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-level',
  'aria-live',
  'aria-modal',
  'aria-multiline',
  'aria-multiselectable',
  'aria-orientation',
  'aria-owns',
  'aria-placeholder',
  'aria-posinset',
  'aria-pressed',
  'aria-readonly',
  'aria-relevant',
  'aria-required',
  'aria-roledescription',
  'aria-rowcount',
  'aria-rowindex',
  'aria-rowindextext',
  'aria-rowspan',
  'aria-selected',
  'aria-setsize',
  'aria-sort',
  'aria-valuemax',
  'aria-valuemin',
  'aria-valuenow',
  'aria-valuetext',
]);

export enum DOMNodeEvents {
  TOP_LAYER_INDEX_CHANGED = 'TopLayerIndexChanged',
  SCROLLABLE_FLAG_UPDATED = 'ScrollableFlagUpdated',
  GRID_OVERLAY_STATE_CHANGED = 'GridOverlayStateChanged',
  FLEX_CONTAINER_OVERLAY_STATE_CHANGED = 'FlexContainerOverlayStateChanged',
  SCROLL_SNAP_OVERLAY_STATE_CHANGED = 'ScrollSnapOverlayStateChanged',
  CONTAINER_QUERY_OVERLAY_STATE_CHANGED = 'ContainerQueryOverlayStateChanged',
}

export interface DOMNodeEventTypes {
  [DOMNodeEvents.TOP_LAYER_INDEX_CHANGED]: void;
  [DOMNodeEvents.SCROLLABLE_FLAG_UPDATED]: void;
  [DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED]: {enabled: boolean};
  [DOMNodeEvents.FLEX_CONTAINER_OVERLAY_STATE_CHANGED]: {enabled: boolean};
  [DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED]: {enabled: boolean};
  [DOMNodeEvents.CONTAINER_QUERY_OVERLAY_STATE_CHANGED]: {enabled: boolean};
}

export class DOMNode extends Common.ObjectWrapper.ObjectWrapper<DOMNodeEventTypes> {
  #domModel: DOMModel;
  #agent: ProtocolProxyApi.DOMApi;
  ownerDocument!: DOMDocument|null;
  #isInShadowTree!: boolean;
  id!: Protocol.DOM.NodeId;
  index: number|undefined = undefined;
  #backendNodeId!: Protocol.DOM.BackendNodeId;
  #nodeType!: number;
  #nodeName!: string;
  #localName!: string;
  nodeValueInternal!: string;
  #pseudoType!: Protocol.DOM.PseudoType|undefined;
  #pseudoIdentifier?: string;
  #shadowRootType!: Protocol.DOM.ShadowRootType|undefined;
  #frameOwnerFrameId!: Protocol.Page.FrameId|null;
  #xmlVersion!: string|undefined;
  #isSVGNode!: boolean;
  #isScrollable!: boolean;
  #affectedByStartingStyles!: boolean;
  #creationStackTrace: Promise<Protocol.Runtime.StackTrace|null>|null = null;
  #pseudoElements = new Map<string, DOMNode[]>();
  #distributedNodes: DOMNodeShortcut[] = [];
  assignedSlot: DOMNodeShortcut|null = null;
  readonly shadowRootsInternal: DOMNode[] = [];
  #attributes = new Map<string, Attribute>();
  #markers = new Map<string, unknown>();
  #subtreeMarkerCount = 0;
  childNodeCountInternal!: number;
  childrenInternal: DOMNode[]|null = null;
  nextSibling: DOMNode|null = null;
  previousSibling: DOMNode|null = null;
  firstChild: DOMNode|null = null;
  lastChild: DOMNode|null = null;
  parentNode: DOMNode|null = null;
  templateContentInternal?: DOMNode;
  contentDocumentInternal?: DOMDocument;
  childDocumentPromiseForTesting?: Promise<DOMDocument|null>;
  #importedDocument?: DOMNode;
  publicId?: string;
  systemId?: string;
  internalSubset?: string;
  name?: string;
  value?: string;
  /**
   * Set when a DOMNode is retained in a detached sub-tree.
   */
  retained = false;
  /**
   * Set if a DOMNode is a root of a detached sub-tree.
   */
  detached = false;
  #retainedNodes?: Set<Protocol.DOM.BackendNodeId>;
  #adoptedStyleSheets: AdoptedStyleSheet[] = [];
  /**
   * 1-based index of the node in the top layer. Only set
   * for non-backdrop nodes.
   */
  #topLayerIndex = -1;

  constructor(domModel: DOMModel) {
    super();
    this.#domModel = domModel;
    this.#agent = this.#domModel.getAgent();
  }

  static create(
      domModel: DOMModel, doc: DOMDocument|null, isInShadowTree: boolean, payload: Protocol.DOM.Node,
      retainedNodes?: Set<Protocol.DOM.BackendNodeId>): DOMNode {
    const node = new DOMNode(domModel);
    node.init(doc, isInShadowTree, payload, retainedNodes);
    return node;
  }

  init(
      doc: DOMDocument|null, isInShadowTree: boolean, payload: Protocol.DOM.Node,
      retainedNodes?: Set<Protocol.DOM.BackendNodeId>): void {
    this.#agent = this.#domModel.getAgent();
    this.ownerDocument = doc;
    this.#isInShadowTree = isInShadowTree;

    this.id = payload.nodeId;
    this.#backendNodeId = payload.backendNodeId;
    this.#frameOwnerFrameId = payload.frameId || null;
    this.#domModel.registerNode(this);
    this.#nodeType = payload.nodeType;
    this.#nodeName = payload.nodeName;
    this.#localName = payload.localName;
    this.nodeValueInternal = payload.nodeValue;
    this.#pseudoType = payload.pseudoType;
    this.#pseudoIdentifier = payload.pseudoIdentifier;
    this.#shadowRootType = payload.shadowRootType;
    this.#xmlVersion = payload.xmlVersion;
    this.#isSVGNode = Boolean(payload.isSVG);
    this.#isScrollable = Boolean(payload.isScrollable);
    this.#affectedByStartingStyles = Boolean(payload.affectedByStartingStyles);
    this.#retainedNodes = retainedNodes;

    if (this.#retainedNodes?.has(this.backendNodeId())) {
      this.retained = true;
    }

    if (payload.attributes) {
      this.setAttributesPayload(payload.attributes);
    }

    if (payload.adoptedStyleSheets) {
      this.#adoptedStyleSheets = this.toAdoptedStyleSheets(payload.adoptedStyleSheets);
    }

    this.childNodeCountInternal = payload.childNodeCount || 0;
    if (payload.shadowRoots) {
      for (let i = 0; i < payload.shadowRoots.length; ++i) {
        const root = payload.shadowRoots[i];
        const node = DOMNode.create(this.#domModel, this.ownerDocument, true, root, retainedNodes);
        this.shadowRootsInternal.push(node);
        node.parentNode = this;
      }
    }

    if (payload.templateContent) {
      this.templateContentInternal =
          DOMNode.create(this.#domModel, this.ownerDocument, true, payload.templateContent, retainedNodes);
      this.templateContentInternal.parentNode = this;
      this.childrenInternal = [];
    }

    const frameOwnerTags = new Set(['EMBED', 'IFRAME', 'OBJECT', 'FENCEDFRAME']);
    if (payload.contentDocument) {
      this.contentDocumentInternal = new DOMDocument(this.#domModel, payload.contentDocument);
      this.contentDocumentInternal.parentNode = this;
      this.childrenInternal = [];
    } else if (payload.frameId && frameOwnerTags.has(payload.nodeName)) {
      // At this point we know we are in an OOPIF, otherwise `payload.contentDocument` would have been set.
      this.childDocumentPromiseForTesting = this.requestChildDocument(payload.frameId, this.#domModel.target());
      this.childrenInternal = [];
    }

    if (payload.importedDocument) {
      this.#importedDocument =
          DOMNode.create(this.#domModel, this.ownerDocument, true, payload.importedDocument, retainedNodes);
      this.#importedDocument.parentNode = this;
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

    if (this.#nodeType === Node.ELEMENT_NODE) {
      // HTML and BODY from internal iframes should not overwrite top-level ones.
      if (this.ownerDocument && !this.ownerDocument.documentElement && this.#nodeName === 'HTML') {
        this.ownerDocument.documentElement = this;
      }
      if (this.ownerDocument && !this.ownerDocument.body && this.#nodeName === 'BODY') {
        this.ownerDocument.body = this;
      }
    } else if (this.#nodeType === Node.DOCUMENT_TYPE_NODE) {
      this.publicId = payload.publicId;
      this.systemId = payload.systemId;
      this.internalSubset = payload.internalSubset;
    } else if (this.#nodeType === Node.ATTRIBUTE_NODE) {
      this.name = payload.name;
      this.value = payload.value;
    }
  }

  private async requestChildDocument(frameId: Protocol.Page.FrameId, notInTarget: Target): Promise<DOMDocument|null> {
    const frame = await FrameManager.instance().getOrWaitForFrame(frameId, notInTarget);
    const childModel = frame.resourceTreeModel()?.target().model(DOMModel);
    return await (childModel?.requestDocument() || null);
  }

  setTopLayerIndex(idx: number): void {
    const oldIndex = this.#topLayerIndex;
    this.#topLayerIndex = idx;
    if (oldIndex !== idx) {
      this.dispatchEventToListeners(DOMNodeEvents.TOP_LAYER_INDEX_CHANGED);
    }
  }

  topLayerIndex(): number {
    return this.#topLayerIndex;
  }

  isAdFrameNode(): boolean {
    if (this.isIframe() && this.#frameOwnerFrameId) {
      const frame = FrameManager.instance().getFrame(this.#frameOwnerFrameId);
      if (!frame) {
        return false;
      }
      return frame.adFrameType() !== Protocol.Page.AdFrameType.None;
    }
    return false;
  }

  isRootNode(): boolean {
    if (this.nodeType() === Node.ELEMENT_NODE && this.nodeName() === 'HTML') {
      return true;
    }
    return false;
  }

  isSVGNode(): boolean {
    return this.#isSVGNode;
  }

  isScrollable(): boolean {
    return this.#isScrollable;
  }

  affectedByStartingStyles(): boolean {
    return this.#affectedByStartingStyles;
  }

  isMediaNode(): boolean {
    return this.#nodeName === 'AUDIO' || this.#nodeName === 'VIDEO';
  }

  isViewTransitionPseudoNode(): boolean {
    if (!this.#pseudoType) {
      return false;
    }

    return [
      Protocol.DOM.PseudoType.ViewTransition,
      Protocol.DOM.PseudoType.ViewTransitionGroup,
      Protocol.DOM.PseudoType.ViewTransitionGroupChildren,
      Protocol.DOM.PseudoType.ViewTransitionImagePair,
      Protocol.DOM.PseudoType.ViewTransitionOld,
      Protocol.DOM.PseudoType.ViewTransitionNew,
    ].includes(this.#pseudoType);
  }

  creationStackTrace(): Promise<Protocol.Runtime.StackTrace|null> {
    if (this.#creationStackTrace) {
      return this.#creationStackTrace;
    }

    const stackTracesPromise = this.#agent.invoke_getNodeStackTraces({nodeId: this.id});
    this.#creationStackTrace = stackTracesPromise.then(res => res.creation || null);
    return this.#creationStackTrace;
  }

  get subtreeMarkerCount(): number {
    return this.#subtreeMarkerCount;
  }

  domModel(): DOMModel {
    return this.#domModel;
  }

  backendNodeId(): Protocol.DOM.BackendNodeId {
    return this.#backendNodeId;
  }

  children(): DOMNode[]|null {
    return this.childrenInternal ? this.childrenInternal.slice() : null;
  }

  setChildren(children: DOMNode[]): void {
    this.childrenInternal = children;
  }

  setIsScrollable(isScrollable: boolean): void {
    this.#isScrollable = isScrollable;
    this.dispatchEventToListeners(DOMNodeEvents.SCROLLABLE_FLAG_UPDATED);
    if (this.nodeName() === '#document') {
      // We show the scroll badge of the document on the <html> element.
      this.ownerDocument?.documentElement?.setIsScrollable(isScrollable);
    }
  }

  setAffectedByStartingStyles(affectedByStartingStyles: boolean): void {
    this.#affectedByStartingStyles = affectedByStartingStyles;
  }

  hasAttributes(): boolean {
    return this.#attributes.size > 0;
  }

  childNodeCount(): number {
    return this.childNodeCountInternal;
  }

  setChildNodeCount(childNodeCount: number): void {
    this.childNodeCountInternal = childNodeCount;
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
    return this.#nodeName === 'IFRAME';
  }

  importedDocument(): DOMNode|null {
    return this.#importedDocument || null;
  }

  nodeType(): number {
    return this.#nodeType;
  }

  nodeName(): string {
    return this.#nodeName;
  }

  pseudoType(): string|undefined {
    return this.#pseudoType;
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

  checkmarkPseudoElement(): DOMNode|undefined {
    return this.#pseudoElements.get(Protocol.DOM.PseudoType.Checkmark)?.at(-1);
  }

  beforePseudoElement(): DOMNode|undefined {
    return this.#pseudoElements.get(Protocol.DOM.PseudoType.Before)?.at(-1);
  }

  afterPseudoElement(): DOMNode|undefined {
    return this.#pseudoElements.get(Protocol.DOM.PseudoType.After)?.at(-1);
  }

  pickerIconPseudoElement(): DOMNode|undefined {
    return this.#pseudoElements.get(Protocol.DOM.PseudoType.PickerIcon)?.at(-1);
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
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransitionGroupChildren) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransitionImagePair) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransitionOld) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ViewTransitionNew) || [],
    ];
  }

  carouselPseudoElements(): DOMNode[] {
    return [
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ScrollButton) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.Column) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ScrollMarker) || [],
      ...this.#pseudoElements.get(Protocol.DOM.PseudoType.ScrollMarkerGroup) || [],
    ];
  }

  hasAssignedSlot(): boolean {
    return this.assignedSlot !== null;
  }

  isInsertionPoint(): boolean {
    return !this.isXMLNode() &&
        (this.#nodeName === 'SHADOW' || this.#nodeName === 'CONTENT' || this.#nodeName === 'SLOT');
  }

  distributedNodes(): DOMNodeShortcut[] {
    return this.#distributedNodes;
  }

  isInShadowTree(): boolean {
    return this.#isInShadowTree;
  }

  getTreeRoot(): DOMNode {
    return this.isShadowRoot() ? this : (this.ancestorShadowRoot() ?? this.ownerDocument ?? this);
  }

  ancestorShadowHost(): DOMNode|null {
    const ancestorShadowRoot = this.ancestorShadowRoot();
    return ancestorShadowRoot ? ancestorShadowRoot.parentNode : null;
  }

  ancestorShadowRoot(): DOMNode|null {
    if (!this.#isInShadowTree) {
      return null;
    }

    let current: DOMNode|null = this;
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
    return Boolean(this.#shadowRootType);
  }

  shadowRootType(): string|null {
    return this.#shadowRootType || null;
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
        this.#domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null, this.#domModel.nodeForId(response.nodeId));
      }
    });
  }

  localName(): string {
    return this.#localName;
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
        this.#domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  getAttribute(name: string): string|undefined {
    const attr = this.#attributes.get(name);
    return attr ? attr.value : undefined;
  }

  setAttribute(name: string, text: string, callback?: ((arg0: string|null) => void)): void {
    void this.#agent.invoke_setAttributesAsText({nodeId: this.id, text, name}).then(response => {
      if (!response.getError()) {
        this.#domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  setAttributeValue(name: string, value: string, callback?: ((arg0: string|null) => void)): void {
    void this.#agent.invoke_setAttributeValue({nodeId: this.id, name, value}).then(response => {
      if (!response.getError()) {
        this.#domModel.markUndoableState();
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
    return [...this.#attributes.values()];
  }

  async removeAttribute(name: string): Promise<void> {
    const response = await this.#agent.invoke_removeAttribute({nodeId: this.id, name});
    if (response.getError()) {
      return;
    }
    this.#attributes.delete(name);
    this.#domModel.markUndoableState();
  }

  getChildNodesPromise(): Promise<DOMNode[]|null> {
    return new Promise(resolve => {
      return this.getChildNodes(childNodes => resolve(childNodes));
    });
  }

  getChildNodes(callback: (arg0: DOMNode[]|null) => void): void {
    if (this.childrenInternal) {
      callback(this.children());
      return;
    }
    void this.#agent.invoke_requestChildNodes({nodeId: this.id}).then(response => {
      callback(response.getError() ? null : this.children());
    });
  }

  async getSubtree(depth: number, pierce: boolean): Promise<DOMNode[]|null> {
    console.assert(depth > 0, 'Do not fetch an infinite subtree to avoid crashing the renderer for large documents');
    const response = await this.#agent.invoke_requestChildNodes({nodeId: this.id, depth, pierce});
    return response.getError() ? null : this.childrenInternal;
  }

  async getOuterHTML(includeShadowDOM = false): Promise<string|null> {
    const {outerHTML} = await this.#agent.invoke_getOuterHTML({nodeId: this.id, includeShadowDOM});
    return outerHTML;
  }

  setOuterHTML(html: string, callback?: ((arg0: string|null) => void)): void {
    void this.#agent.invoke_setOuterHTML({nodeId: this.id, outerHTML: html}).then(response => {
      if (!response.getError()) {
        this.#domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  removeNode(callback?: ((arg0: string|null, arg1?: Protocol.DOM.NodeId|undefined) => void)): Promise<void> {
    return this.#agent.invoke_removeNode({nodeId: this.id}).then(response => {
      if (!response.getError()) {
        this.#domModel.markUndoableState();
      }
      if (callback) {
        callback(response.getError() || null);
      }
    });
  }

  path(): string {
    function getNodeKey(node: DOMNode): number|'u'|'a'|'d'|null {
      if (!node.#nodeName.length) {
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
    let node: (DOMNode|null) = this;
    while (node) {
      const key = getNodeKey(node);
      if (key === null) {
        break;
      }

      path.push([key, node.#nodeName]);
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
    return descendant.isAncestor(this);
  }

  frameOwnerFrameId(): Protocol.Page.FrameId|null {
    return this.#frameOwnerFrameId;
  }

  frameId(): Protocol.Page.FrameId|null {
    let node: DOMNode = this.parentNode || this;
    while (!node.#frameOwnerFrameId && node.parentNode) {
      node = node.parentNode;
    }
    return node.#frameOwnerFrameId;
  }

  setAttributesPayload(attrs: string[]): boolean {
    let attributesChanged: true|boolean = !this.#attributes || attrs.length !== this.#attributes.size * 2;
    const oldAttributesMap = this.#attributes || new Map();

    this.#attributes = new Map();

    for (let i = 0; i < attrs.length; i += 2) {
      const name = attrs[i];
      const value = attrs[i + 1];
      this.addAttribute(name, value);

      if (attributesChanged) {
        continue;
      }

      const oldAttribute = oldAttributesMap.get(name);
      if (oldAttribute?.value !== value) {
        attributesChanged = true;
      }
    }
    return attributesChanged;
  }

  insertChild(prev: DOMNode|undefined, payload: Protocol.DOM.Node): DOMNode {
    if (!this.childrenInternal) {
      throw new Error('DOMNode._children is expected to not be null.');
    }
    const node = DOMNode.create(this.#domModel, this.ownerDocument, this.#isInShadowTree, payload, this.#retainedNodes);
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
      this.#domModel.dispatchEventToListeners(Events.MarkersChanged, this);
    }
    this.renumber();
  }

  setChildrenPayload(payloads: Protocol.DOM.Node[]): void {
    this.childrenInternal = [];
    for (let i = 0; i < payloads.length; ++i) {
      const payload = payloads[i];
      const node =
          DOMNode.create(this.#domModel, this.ownerDocument, this.#isInShadowTree, payload, this.#retainedNodes);
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
          DOMNode.create(this.#domModel, this.ownerDocument, this.#isInShadowTree, payloads[i], this.#retainedNodes);
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

  private toAdoptedStyleSheets(ids: Protocol.DOM.StyleSheetId[]): AdoptedStyleSheet[] {
    return ids.map(id => (new AdoptedStyleSheet(id, this)));
  }

  setAdoptedStyleSheets(ids: Protocol.DOM.StyleSheetId[]): void {
    this.#adoptedStyleSheets = this.toAdoptedStyleSheets(ids);
    this.#domModel.dispatchEventToListeners(Events.AdoptedStyleSheetsModified, this);
  }

  get adoptedStyleSheetsForNode(): AdoptedStyleSheet[] {
    return this.#adoptedStyleSheets;
  }

  setDistributedNodePayloads(payloads: Protocol.DOM.BackendNode[]): void {
    this.#distributedNodes = [];
    for (const payload of payloads) {
      this.#distributedNodes.push(
          new DOMNodeShortcut(this.#domModel.target(), payload.backendNodeId, payload.nodeType, payload.nodeName));
    }
  }

  setAssignedSlot(payload: Protocol.DOM.BackendNode): void {
    this.assignedSlot =
        new DOMNodeShortcut(this.#domModel.target(), payload.backendNodeId, payload.nodeType, payload.nodeName);
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
    this.#attributes.set(name, attr);
  }

  setAttributeInternal(name: string, value: string): void {
    const attr = this.#attributes.get(name);
    if (attr) {
      attr.value = value;
    } else {
      this.addAttribute(name, value);
    }
  }

  removeAttributeInternal(name: string): void {
    this.#attributes.delete(name);
  }

  copyTo(targetNode: DOMNode, anchorNode: DOMNode|null, callback?: ((arg0: string|null, arg1: DOMNode|null) => void)):
      void {
    void this.#agent
        .invoke_copyTo(
            {nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined})
        .then(response => {
          if (!response.getError()) {
            this.#domModel.markUndoableState();
          }
          const pastedNode = this.#domModel.nodeForId(response.nodeId);
          if (pastedNode) {
            // For every marker in this.#markers, set a marker in the copied node.
            for (const [name, value] of this.#markers) {
              pastedNode.setMarker(name, value);
            }
          }
          if (callback) {
            callback(response.getError() || null, pastedNode);
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
            this.#domModel.markUndoableState();
          }
          if (callback) {
            callback(response.getError() || null, this.#domModel.nodeForId(response.nodeId));
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
      for (let node: (DOMNode|null) = this; node; node = node.parentNode) {
        --node.#subtreeMarkerCount;
      }
      for (let node: (DOMNode|null) = this; node; node = node.parentNode) {
        this.#domModel.dispatchEventToListeners(Events.MarkersChanged, node);
      }
      return;
    }

    if (this.parentNode && !this.#markers.has(name)) {
      for (let node: (DOMNode|null) = this; node; node = node.parentNode) {
        ++node.#subtreeMarkerCount;
      }
    }
    this.#markers.set(name, value);
    for (let node: (DOMNode|null) = this; node; node = node.parentNode) {
      this.#domModel.dispatchEventToListeners(Events.MarkersChanged, node);
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
    for (let frameOwnerCandidate: (DOMNode|null) = this; frameOwnerCandidate;
         frameOwnerCandidate = frameOwnerCandidate.parentNode) {
      if (frameOwnerCandidate instanceof DOMDocument && frameOwnerCandidate.baseURL) {
        return Common.ParsedURL.ParsedURL.completeURL(frameOwnerCandidate.baseURL, url);
      }
    }
    return null;
  }

  highlight(mode?: string): void {
    this.#domModel.overlayModel().highlightInOverlay({node: this, selectorList: undefined}, mode);
  }

  highlightForTwoSeconds(): void {
    this.#domModel.overlayModel().highlightInOverlayForTwoSeconds({node: this, selectorList: undefined});
  }

  async resolveToObject(objectGroup?: string, executionContextId?: Protocol.Runtime.ExecutionContextId):
      Promise<RemoteObject|null> {
    const {object} = await this.#agent.invoke_resolveNode(
        {nodeId: this.id, backendNodeId: undefined, executionContextId, objectGroup});
    return object && this.#domModel.runtimeModelInternal.createRemoteObject(object) || null;
  }

  async boxModel(): Promise<Protocol.DOM.BoxModel|null> {
    const {model} = await this.#agent.invoke_getBoxModel({nodeId: this.id});
    return model;
  }

  async setAsInspectedNode(): Promise<void> {
    let node: DOMNode|null = this;
    if (node?.pseudoType()) {
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
    let node: DOMNode|null = this;
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
    await this.#domModel.target().pageAgent().invoke_bringToFront();

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

  classNames(): string[] {
    const classes = this.getAttribute('class');
    return classes ? classes.split(/\s+/) : [];
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
    return nodeIds?.get(this.#backendNodeIdInternal) || null;
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
  // Shortctus to elements that children of the element this shortcut is for.
  // Currently, use for backdrop elements in the top layer.«
  childShortcuts: DOMNodeShortcut[] = [];
  constructor(
      target: Target, backendNodeId: Protocol.DOM.BackendNodeId, nodeType: number, nodeName: string,
      childShortcuts: DOMNodeShortcut[] = []) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.deferredNode = new DeferredDOMNode(target, backendNodeId);
    this.childShortcuts = childShortcuts;
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

export class AdoptedStyleSheet {
  constructor(readonly id: Protocol.DOM.StyleSheetId, readonly parent: DOMNode) {
  }

  get cssModel(): CSSModel {
    return this.parent.domModel().cssModel();
  }
}

export class DOMModel extends SDKModel<EventTypes> {
  agent: ProtocolProxyApi.DOMApi;
  idToDOMNode = new Map<Protocol.DOM.NodeId, DOMNode>();
  frameIdToOwnerNode = new Map<Protocol.Page.FrameId, DOMNode>();
  #document: DOMDocument|null = null;
  readonly #attributeLoadNodeIds = new Set<Protocol.DOM.NodeId>();
  readonly runtimeModelInternal: RuntimeModel;
  #lastMutationId!: number;
  #pendingDocumentRequestPromise: Promise<DOMDocument|null>|null = null;
  #frameOwnerNode?: DOMNode|null;
  #loadNodeAttributesTimeout?: number;
  #searchId?: string;
  #topLayerThrottler = new Common.Throttler.Throttler(100);
  #topLayerNodes: DOMNode[] = [];
  #resourceTreeModel: ResourceTreeModel|null = null;

  constructor(target: Target) {
    super(target);

    this.agent = target.domAgent();

    target.registerDOMDispatcher(new DOMDispatcher(this));
    this.runtimeModelInternal = (target.model(RuntimeModel) as RuntimeModel);

    this.#resourceTreeModel = target.model(ResourceTreeModel);
    this.#resourceTreeModel?.addEventListener(ResourceTreeModelEvents.DocumentOpened, this.onDocumentOpened, this);

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

  private onDocumentOpened(event: Common.EventTarget.EventTargetEvent<ResourceTreeFrame>): void {
    const frame = event.data;
    const node = this.frameIdToOwnerNode.get(frame.id);
    if (node) {
      const contentDocument = node.contentDocument();
      if (contentDocument && contentDocument.documentURL !== frame.url) {
        contentDocument.documentURL = frame.url;
        contentDocument.baseURL = frame.url;
        this.dispatchEventToListeners(Events.DocumentURLChanged, contentDocument);
      }
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
    return this.nodeForId(nodeId);
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
    this.frameIdToOwnerNode = new Map();
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
    if (currentPseudoElements && currentPseudoElements.length > 0) {
      if (!(pseudoType.startsWith('view-transition') || pseudoType.startsWith('scroll-') || pseudoType === 'column')) {
        throw new Error(
            'DOMModel.pseudoElementAdded expects parent to not already have this pseudo type added; only view-transition* and scrolling pseudo elements can coexist under the same parent.' +
            ` ${currentPseudoElements.length} elements of type ${pseudoType} already exist on parent.`);
      }
      currentPseudoElements.push(node);
    } else {
      parent.pseudoElements().set(pseudoType, [node]);
    }
    this.dispatchEventToListeners(Events.NodeInserted, node);
    this.scheduleMutationEvent(node);
  }

  adoptedStyleSheetsModified(parentId: Protocol.DOM.NodeId, styleSheets: Protocol.DOM.StyleSheetId[]): void {
    const parent = this.idToDOMNode.get(parentId);
    if (!parent) {
      return;
    }
    parent.setAdoptedStyleSheets(styleSheets);
  }

  scrollableFlagUpdated(nodeId: Protocol.DOM.NodeId, isScrollable: boolean): void {
    const node = this.nodeForId(nodeId);
    if (!node || node.isScrollable() === isScrollable) {
      return;
    }
    node.setIsScrollable(isScrollable);
  }

  affectedByStartingStylesFlagUpdated(nodeId: Protocol.DOM.NodeId, affectedByStartingStyles: boolean): void {
    const node = this.nodeForId(nodeId);
    if (!node || node.affectedByStartingStyles() === affectedByStartingStyles) {
      return;
    }
    node.setAffectedByStartingStyles(affectedByStartingStyles);
    this.dispatchEventToListeners(Events.AffectedByStartingStylesFlagUpdated, {node});
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
    const frameId = node.frameOwnerFrameId();
    if (frameId) {
      this.frameIdToOwnerNode.delete(frameId);
    }
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
      computedStyles: Array<{
        name: string,
        value: string,
      }>,
      pierce = false): Promise<Protocol.DOM.NodeId[]> {
    await this.requestDocument();
    if (!this.#document) {
      throw new Error('DOMModel.getNodesByStyle expects to have a document.');
    }
    const response =
        await this.agent.invoke_getNodesForSubtreeByStyle({nodeId: this.#document.id, computedStyles, pierce});
    if (response.getError()) {
      throw new Error(response.getError());
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
    return nodeIds?.length === 1 ? this.nodeForId(nodeIds[0]) : null;
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

  topLayerElementsUpdated(): void {
    void this.#topLayerThrottler.schedule(async () => {
      // This returns top layer nodes for all local frames.
      const result = await this.agent.invoke_getTopLayerElements();
      if (result.getError()) {
        return;
      }
      // Re-set indexes as we re-create top layer nodes list.
      const previousDocs = new Set<DOMDocument>();
      for (const node of this.#topLayerNodes) {
        node.setTopLayerIndex(-1);
        if (node.ownerDocument) {
          previousDocs.add(node.ownerDocument);
        }
      }
      this.#topLayerNodes.splice(0);
      const nodes: DOMNode[] =
          result.nodeIds.map(id => this.idToDOMNode.get(id)).filter((node): node is DOMNode => Boolean(node));
      const nodesByDocument = new Map<DOMDocument, DOMNode[]>();
      for (const node of nodes) {
        const document = node.ownerDocument;
        if (!document) {
          continue;
        }
        if (!nodesByDocument.has(document)) {
          nodesByDocument.set(document, []);
        }
        nodesByDocument.get(document)?.push(node);
      }
      for (const [document, nodes] of nodesByDocument) {
        let topLayerIdx = 1;
        const documentShortcuts = [];
        for (const [idx, node] of nodes.entries()) {
          if (node.nodeName() === '::backdrop') {
            continue;
          }
          const childShortcuts = [];
          const previousNode = result.nodeIds[idx - 1] ? this.idToDOMNode.get(result.nodeIds[idx - 1]) : null;
          if (previousNode && previousNode.nodeName() === '::backdrop') {
            childShortcuts.push(
                new DOMNodeShortcut(this.target(), previousNode.backendNodeId(), 0, previousNode.nodeName()));
          }
          const shortcut = new DOMNodeShortcut(this.target(), node.backendNodeId(), 0, node.nodeName(), childShortcuts);
          node.setTopLayerIndex(topLayerIdx++);
          this.#topLayerNodes.push(node);
          documentShortcuts.push(shortcut);
          previousDocs.delete(document);
        }
        this.dispatchEventToListeners(Events.TopLayerElementsChanged, {
          document,
          documentShortcuts,
        });
      }
      // Emit empty events for documents that are no longer in the top layer.
      for (const document of previousDocs) {
        this.dispatchEventToListeners(Events.TopLayerElementsChanged, {
          document,
          documentShortcuts: [],
        });
      }
    });
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
      logicalAxes?: Protocol.DOM.LogicalAxes, queriesScrollState?: boolean,
      queriesAnchored?: boolean): Promise<DOMNode|null> {
    const {nodeId: containerNodeId} = await this.agent.invoke_getContainerForNode(
        {nodeId, containerName, physicalAxes, logicalAxes, queriesScrollState, queriesAnchored});
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
    this.#resourceTreeModel?.removeEventListener(ResourceTreeModelEvents.DocumentOpened, this.onDocumentOpened, this);
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
    const frameId = node.frameOwnerFrameId();
    if (frameId) {
      this.frameIdToOwnerNode.set(frameId, node);
    }
  }
}

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  AttrModified = 'AttrModified',
  AttrRemoved = 'AttrRemoved',
  CharacterDataModified = 'CharacterDataModified',
  DOMMutated = 'DOMMutated',
  DocumentURLChanged = 'DocumentURLChanged',
  NodeInserted = 'NodeInserted',
  NodeRemoved = 'NodeRemoved',
  DocumentUpdated = 'DocumentUpdated',
  ChildNodeCountUpdated = 'ChildNodeCountUpdated',
  DistributedNodesChanged = 'DistributedNodesChanged',
  MarkersChanged = 'MarkersChanged',
  TopLayerElementsChanged = 'TopLayerElementsChanged',
  AffectedByStartingStylesFlagUpdated = 'AffectedByStartingStylesFlagUpdated',
  AdoptedStyleSheetsModified = 'AdoptedStyleSheetsModified',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export interface EventTypes {
  [Events.AttrModified]: {node: DOMNode, name: string};
  [Events.AttrRemoved]: {node: DOMNode, name: string};
  [Events.CharacterDataModified]: DOMNode;
  [Events.DOMMutated]: DOMNode;
  [Events.DocumentURLChanged]: DOMDocument;
  [Events.NodeInserted]: DOMNode;
  [Events.NodeRemoved]: {node: DOMNode, parent: DOMNode};
  [Events.DocumentUpdated]: DOMModel;
  [Events.ChildNodeCountUpdated]: DOMNode;
  [Events.DistributedNodesChanged]: DOMNode;
  [Events.MarkersChanged]: DOMNode;
  [Events.TopLayerElementsChanged]: {document: DOMDocument, documentShortcuts: DOMNodeShortcut[]};
  [Events.AffectedByStartingStylesFlagUpdated]: {node: DOMNode};
  [Events.AdoptedStyleSheetsModified]: DOMNode;
}

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

  adoptedStyleSheetsModified({nodeId, adoptedStyleSheets}: Protocol.DOM.AdoptedStyleSheetsModifiedEvent): void {
    this.#domModel.adoptedStyleSheetsModified(nodeId, adoptedStyleSheets);
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

  affectedByStartingStylesFlagUpdated({nodeId, affectedByStartingStyles}:
                                          Protocol.DOM.AffectedByStartingStylesFlagUpdatedEvent): void {
    this.#domModel.affectedByStartingStylesFlagUpdated(nodeId, affectedByStartingStyles);
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
      return await Promise.resolve();
    }
    --this.#index;
    this.#lastModelWithMinorChange = null;
    await this.#stack[this.#index].getAgent().invoke_undo();
  }

  async redo(): Promise<void> {
    if (this.#index >= this.#stack.length) {
      return await Promise.resolve();
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
