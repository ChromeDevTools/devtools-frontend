// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import { CSSModel } from './CSSModel.js';
import { FrameManager } from './FrameManager.js';
import { OverlayModel } from './OverlayModel.js';
import { RemoteObject } from './RemoteObject.js';
import { ResourceTreeModel } from './ResourceTreeModel.js';
import { RuntimeModel } from './RuntimeModel.js';
import { SDKModel } from './SDKModel.js';
import { TargetManager } from './TargetManager.js';
/** Keep this list in sync with https://w3c.github.io/aria/#state_prop_def **/
export const ARIA_ATTRIBUTES = new Set([
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
export class DOMNode {
    #domModel;
    #agent;
    ownerDocument;
    #isInShadowTree;
    id;
    index = undefined;
    #backendNodeId;
    #nodeType;
    #nodeName;
    #localName;
    nodeValueInternal;
    #pseudoType;
    #pseudoIdentifier;
    #shadowRootType;
    #frameOwnerFrameId;
    #xmlVersion;
    #isSVGNode;
    #isScrollable;
    #affectedByStartingStyles;
    #creationStackTrace = null;
    #pseudoElements = new Map();
    #distributedNodes = [];
    assignedSlot = null;
    shadowRootsInternal = [];
    #attributes = new Map();
    #markers = new Map();
    #subtreeMarkerCount = 0;
    childNodeCountInternal;
    childrenInternal = null;
    nextSibling = null;
    previousSibling = null;
    firstChild = null;
    lastChild = null;
    parentNode = null;
    templateContentInternal;
    contentDocumentInternal;
    childDocumentPromiseForTesting;
    #importedDocument;
    publicId;
    systemId;
    internalSubset;
    name;
    value;
    /**
     * Set when a DOMNode is retained in a detached sub-tree.
     */
    retained = false;
    /**
     * Set if a DOMNode is a root of a detached sub-tree.
     */
    detached = false;
    #retainedNodes;
    constructor(domModel) {
        this.#domModel = domModel;
        this.#agent = this.#domModel.getAgent();
    }
    static create(domModel, doc, isInShadowTree, payload, retainedNodes) {
        const node = new DOMNode(domModel);
        node.init(doc, isInShadowTree, payload, retainedNodes);
        return node;
    }
    init(doc, isInShadowTree, payload, retainedNodes) {
        this.#agent = this.#domModel.getAgent();
        this.ownerDocument = doc;
        this.#isInShadowTree = isInShadowTree;
        this.id = payload.nodeId;
        this.#backendNodeId = payload.backendNodeId;
        this.#domModel.registerNode(this);
        this.#nodeType = payload.nodeType;
        this.#nodeName = payload.nodeName;
        this.#localName = payload.localName;
        this.nodeValueInternal = payload.nodeValue;
        this.#pseudoType = payload.pseudoType;
        this.#pseudoIdentifier = payload.pseudoIdentifier;
        this.#shadowRootType = payload.shadowRootType;
        this.#frameOwnerFrameId = payload.frameId || null;
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
        }
        else if (payload.frameId && frameOwnerTags.has(payload.nodeName)) {
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
        }
        else if (this.#nodeType === Node.DOCUMENT_TYPE_NODE) {
            this.publicId = payload.publicId;
            this.systemId = payload.systemId;
            this.internalSubset = payload.internalSubset;
        }
        else if (this.#nodeType === Node.ATTRIBUTE_NODE) {
            this.name = payload.name;
            this.value = payload.value;
        }
    }
    async requestChildDocument(frameId, notInTarget) {
        const frame = await FrameManager.instance().getOrWaitForFrame(frameId, notInTarget);
        const childModel = frame.resourceTreeModel()?.target().model(DOMModel);
        return await (childModel?.requestDocument() || null);
    }
    isAdFrameNode() {
        if (this.isIframe() && this.#frameOwnerFrameId) {
            const frame = FrameManager.instance().getFrame(this.#frameOwnerFrameId);
            if (!frame) {
                return false;
            }
            return frame.adFrameType() !== "none" /* Protocol.Page.AdFrameType.None */;
        }
        return false;
    }
    isSVGNode() {
        return this.#isSVGNode;
    }
    isScrollable() {
        return this.#isScrollable;
    }
    affectedByStartingStyles() {
        return this.#affectedByStartingStyles;
    }
    isMediaNode() {
        return this.#nodeName === 'AUDIO' || this.#nodeName === 'VIDEO';
    }
    isViewTransitionPseudoNode() {
        if (!this.#pseudoType) {
            return false;
        }
        return [
            "view-transition" /* Protocol.DOM.PseudoType.ViewTransition */,
            "view-transition-group" /* Protocol.DOM.PseudoType.ViewTransitionGroup */,
            "view-transition-group-children" /* Protocol.DOM.PseudoType.ViewTransitionGroupChildren */,
            "view-transition-image-pair" /* Protocol.DOM.PseudoType.ViewTransitionImagePair */,
            "view-transition-old" /* Protocol.DOM.PseudoType.ViewTransitionOld */,
            "view-transition-new" /* Protocol.DOM.PseudoType.ViewTransitionNew */,
        ].includes(this.#pseudoType);
    }
    creationStackTrace() {
        if (this.#creationStackTrace) {
            return this.#creationStackTrace;
        }
        const stackTracesPromise = this.#agent.invoke_getNodeStackTraces({ nodeId: this.id });
        this.#creationStackTrace = stackTracesPromise.then(res => res.creation || null);
        return this.#creationStackTrace;
    }
    get subtreeMarkerCount() {
        return this.#subtreeMarkerCount;
    }
    domModel() {
        return this.#domModel;
    }
    backendNodeId() {
        return this.#backendNodeId;
    }
    children() {
        return this.childrenInternal ? this.childrenInternal.slice() : null;
    }
    setChildren(children) {
        this.childrenInternal = children;
    }
    setIsScrollable(isScrollable) {
        this.#isScrollable = isScrollable;
    }
    setAffectedByStartingStyles(affectedByStartingStyles) {
        this.#affectedByStartingStyles = affectedByStartingStyles;
    }
    hasAttributes() {
        return this.#attributes.size > 0;
    }
    childNodeCount() {
        return this.childNodeCountInternal;
    }
    setChildNodeCount(childNodeCount) {
        this.childNodeCountInternal = childNodeCount;
    }
    shadowRoots() {
        return this.shadowRootsInternal.slice();
    }
    templateContent() {
        return this.templateContentInternal || null;
    }
    contentDocument() {
        return this.contentDocumentInternal || null;
    }
    setContentDocument(node) {
        this.contentDocumentInternal = node;
    }
    isIframe() {
        return this.#nodeName === 'IFRAME';
    }
    importedDocument() {
        return this.#importedDocument || null;
    }
    nodeType() {
        return this.#nodeType;
    }
    nodeName() {
        return this.#nodeName;
    }
    pseudoType() {
        return this.#pseudoType;
    }
    pseudoIdentifier() {
        return this.#pseudoIdentifier;
    }
    hasPseudoElements() {
        return this.#pseudoElements.size > 0;
    }
    pseudoElements() {
        return this.#pseudoElements;
    }
    checkmarkPseudoElement() {
        return this.#pseudoElements.get("checkmark" /* Protocol.DOM.PseudoType.Checkmark */)?.at(-1);
    }
    beforePseudoElement() {
        return this.#pseudoElements.get("before" /* Protocol.DOM.PseudoType.Before */)?.at(-1);
    }
    afterPseudoElement() {
        return this.#pseudoElements.get("after" /* Protocol.DOM.PseudoType.After */)?.at(-1);
    }
    pickerIconPseudoElement() {
        return this.#pseudoElements.get("picker-icon" /* Protocol.DOM.PseudoType.PickerIcon */)?.at(-1);
    }
    markerPseudoElement() {
        return this.#pseudoElements.get("marker" /* Protocol.DOM.PseudoType.Marker */)?.at(-1);
    }
    backdropPseudoElement() {
        return this.#pseudoElements.get("backdrop" /* Protocol.DOM.PseudoType.Backdrop */)?.at(-1);
    }
    viewTransitionPseudoElements() {
        return [
            ...this.#pseudoElements.get("view-transition" /* Protocol.DOM.PseudoType.ViewTransition */) || [],
            ...this.#pseudoElements.get("view-transition-group" /* Protocol.DOM.PseudoType.ViewTransitionGroup */) || [],
            ...this.#pseudoElements.get("view-transition-group-children" /* Protocol.DOM.PseudoType.ViewTransitionGroupChildren */) || [],
            ...this.#pseudoElements.get("view-transition-image-pair" /* Protocol.DOM.PseudoType.ViewTransitionImagePair */) || [],
            ...this.#pseudoElements.get("view-transition-old" /* Protocol.DOM.PseudoType.ViewTransitionOld */) || [],
            ...this.#pseudoElements.get("view-transition-new" /* Protocol.DOM.PseudoType.ViewTransitionNew */) || [],
        ];
    }
    carouselPseudoElements() {
        return [
            ...this.#pseudoElements.get("scroll-button" /* Protocol.DOM.PseudoType.ScrollButton */) || [],
            ...this.#pseudoElements.get("column" /* Protocol.DOM.PseudoType.Column */) || [],
            ...this.#pseudoElements.get("scroll-marker" /* Protocol.DOM.PseudoType.ScrollMarker */) || [],
            ...this.#pseudoElements.get("scroll-marker-group" /* Protocol.DOM.PseudoType.ScrollMarkerGroup */) || [],
        ];
    }
    hasAssignedSlot() {
        return this.assignedSlot !== null;
    }
    isInsertionPoint() {
        return !this.isXMLNode() &&
            (this.#nodeName === 'SHADOW' || this.#nodeName === 'CONTENT' || this.#nodeName === 'SLOT');
    }
    distributedNodes() {
        return this.#distributedNodes;
    }
    isInShadowTree() {
        return this.#isInShadowTree;
    }
    getTreeRoot() {
        return this.isShadowRoot() ? this : (this.ancestorShadowRoot() ?? this.ownerDocument ?? this);
    }
    ancestorShadowHost() {
        const ancestorShadowRoot = this.ancestorShadowRoot();
        return ancestorShadowRoot ? ancestorShadowRoot.parentNode : null;
    }
    ancestorShadowRoot() {
        if (!this.#isInShadowTree) {
            return null;
        }
        let current = this;
        while (current && !current.isShadowRoot()) {
            current = current.parentNode;
        }
        return current;
    }
    ancestorUserAgentShadowRoot() {
        const ancestorShadowRoot = this.ancestorShadowRoot();
        if (!ancestorShadowRoot) {
            return null;
        }
        return ancestorShadowRoot.shadowRootType() === DOMNode.ShadowRootTypes.UserAgent ? ancestorShadowRoot : null;
    }
    isShadowRoot() {
        return Boolean(this.#shadowRootType);
    }
    shadowRootType() {
        return this.#shadowRootType || null;
    }
    nodeNameInCorrectCase() {
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
    setNodeName(name, callback) {
        void this.#agent.invoke_setNodeName({ nodeId: this.id, name }).then(response => {
            if (!response.getError()) {
                this.#domModel.markUndoableState();
            }
            if (callback) {
                callback(response.getError() || null, this.#domModel.nodeForId(response.nodeId));
            }
        });
    }
    localName() {
        return this.#localName;
    }
    nodeValue() {
        return this.nodeValueInternal;
    }
    setNodeValueInternal(nodeValue) {
        this.nodeValueInternal = nodeValue;
    }
    setNodeValue(value, callback) {
        void this.#agent.invoke_setNodeValue({ nodeId: this.id, value }).then(response => {
            if (!response.getError()) {
                this.#domModel.markUndoableState();
            }
            if (callback) {
                callback(response.getError() || null);
            }
        });
    }
    getAttribute(name) {
        const attr = this.#attributes.get(name);
        return attr ? attr.value : undefined;
    }
    setAttribute(name, text, callback) {
        void this.#agent.invoke_setAttributesAsText({ nodeId: this.id, text, name }).then(response => {
            if (!response.getError()) {
                this.#domModel.markUndoableState();
            }
            if (callback) {
                callback(response.getError() || null);
            }
        });
    }
    setAttributeValue(name, value, callback) {
        void this.#agent.invoke_setAttributeValue({ nodeId: this.id, name, value }).then(response => {
            if (!response.getError()) {
                this.#domModel.markUndoableState();
            }
            if (callback) {
                callback(response.getError() || null);
            }
        });
    }
    setAttributeValuePromise(name, value) {
        return new Promise(fulfill => this.setAttributeValue(name, value, fulfill));
    }
    attributes() {
        return [...this.#attributes.values()];
    }
    async removeAttribute(name) {
        const response = await this.#agent.invoke_removeAttribute({ nodeId: this.id, name });
        if (response.getError()) {
            return;
        }
        this.#attributes.delete(name);
        this.#domModel.markUndoableState();
    }
    getChildNodesPromise() {
        return new Promise(resolve => {
            return this.getChildNodes(childNodes => resolve(childNodes));
        });
    }
    getChildNodes(callback) {
        if (this.childrenInternal) {
            callback(this.children());
            return;
        }
        void this.#agent.invoke_requestChildNodes({ nodeId: this.id }).then(response => {
            callback(response.getError() ? null : this.children());
        });
    }
    async getSubtree(depth, pierce) {
        console.assert(depth > 0, 'Do not fetch an infinite subtree to avoid crashing the renderer for large documents');
        const response = await this.#agent.invoke_requestChildNodes({ nodeId: this.id, depth, pierce });
        return response.getError() ? null : this.childrenInternal;
    }
    async getOuterHTML(includeShadowDOM = false) {
        const { outerHTML } = await this.#agent.invoke_getOuterHTML({ nodeId: this.id, includeShadowDOM });
        return outerHTML;
    }
    setOuterHTML(html, callback) {
        void this.#agent.invoke_setOuterHTML({ nodeId: this.id, outerHTML: html }).then(response => {
            if (!response.getError()) {
                this.#domModel.markUndoableState();
            }
            if (callback) {
                callback(response.getError() || null);
            }
        });
    }
    removeNode(callback) {
        return this.#agent.invoke_removeNode({ nodeId: this.id }).then(response => {
            if (!response.getError()) {
                this.#domModel.markUndoableState();
            }
            if (callback) {
                callback(response.getError() || null);
            }
        });
    }
    path() {
        function getNodeKey(node) {
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
        let node = this;
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
    isAncestor(node) {
        if (!node) {
            return false;
        }
        let currentNode = node.parentNode;
        while (currentNode) {
            if (this === currentNode) {
                return true;
            }
            currentNode = currentNode.parentNode;
        }
        return false;
    }
    isDescendant(descendant) {
        return descendant.isAncestor(this);
    }
    frameOwnerFrameId() {
        return this.#frameOwnerFrameId;
    }
    frameId() {
        let node = this.parentNode || this;
        while (!node.#frameOwnerFrameId && node.parentNode) {
            node = node.parentNode;
        }
        return node.#frameOwnerFrameId;
    }
    setAttributesPayload(attrs) {
        let attributesChanged = !this.#attributes || attrs.length !== this.#attributes.size * 2;
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
            if (!oldAttribute || oldAttribute.value !== value) {
                attributesChanged = true;
            }
        }
        return attributesChanged;
    }
    insertChild(prev, payload) {
        if (!this.childrenInternal) {
            throw new Error('DOMNode._children is expected to not be null.');
        }
        const node = DOMNode.create(this.#domModel, this.ownerDocument, this.#isInShadowTree, payload, this.#retainedNodes);
        this.childrenInternal.splice(prev ? this.childrenInternal.indexOf(prev) + 1 : 0, 0, node);
        this.renumber();
        return node;
    }
    removeChild(node) {
        const pseudoType = node.pseudoType();
        if (pseudoType) {
            const updatedPseudoElements = this.#pseudoElements.get(pseudoType)?.filter(element => element !== node);
            if (updatedPseudoElements && updatedPseudoElements.length > 0) {
                this.#pseudoElements.set(pseudoType, updatedPseudoElements);
            }
            else {
                this.#pseudoElements.delete(pseudoType);
            }
        }
        else {
            const shadowRootIndex = this.shadowRootsInternal.indexOf(node);
            if (shadowRootIndex !== -1) {
                this.shadowRootsInternal.splice(shadowRootIndex, 1);
            }
            else {
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
    setChildrenPayload(payloads) {
        this.childrenInternal = [];
        for (let i = 0; i < payloads.length; ++i) {
            const payload = payloads[i];
            const node = DOMNode.create(this.#domModel, this.ownerDocument, this.#isInShadowTree, payload, this.#retainedNodes);
            this.childrenInternal.push(node);
        }
        this.renumber();
    }
    setPseudoElements(payloads) {
        if (!payloads) {
            return;
        }
        for (let i = 0; i < payloads.length; ++i) {
            const node = DOMNode.create(this.#domModel, this.ownerDocument, this.#isInShadowTree, payloads[i], this.#retainedNodes);
            node.parentNode = this;
            const pseudoType = node.pseudoType();
            if (!pseudoType) {
                throw new Error('DOMNode.pseudoType() is expected to be defined.');
            }
            const currentPseudoElements = this.#pseudoElements.get(pseudoType);
            if (currentPseudoElements) {
                currentPseudoElements.push(node);
            }
            else {
                this.#pseudoElements.set(pseudoType, [node]);
            }
        }
    }
    setDistributedNodePayloads(payloads) {
        this.#distributedNodes = [];
        for (const payload of payloads) {
            this.#distributedNodes.push(new DOMNodeShortcut(this.#domModel.target(), payload.backendNodeId, payload.nodeType, payload.nodeName));
        }
    }
    setAssignedSlot(payload) {
        this.assignedSlot =
            new DOMNodeShortcut(this.#domModel.target(), payload.backendNodeId, payload.nodeType, payload.nodeName);
    }
    renumber() {
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
    addAttribute(name, value) {
        const attr = { name, value, _node: this };
        this.#attributes.set(name, attr);
    }
    setAttributeInternal(name, value) {
        const attr = this.#attributes.get(name);
        if (attr) {
            attr.value = value;
        }
        else {
            this.addAttribute(name, value);
        }
    }
    removeAttributeInternal(name) {
        this.#attributes.delete(name);
    }
    copyTo(targetNode, anchorNode, callback) {
        void this.#agent
            .invoke_copyTo({ nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined })
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
    moveTo(targetNode, anchorNode, callback) {
        void this.#agent
            .invoke_moveTo({ nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined })
            .then(response => {
            if (!response.getError()) {
                this.#domModel.markUndoableState();
            }
            if (callback) {
                callback(response.getError() || null, this.#domModel.nodeForId(response.nodeId));
            }
        });
    }
    isXMLNode() {
        return Boolean(this.#xmlVersion);
    }
    setMarker(name, value) {
        if (value === null) {
            if (!this.#markers.has(name)) {
                return;
            }
            this.#markers.delete(name);
            for (let node = this; node; node = node.parentNode) {
                --node.#subtreeMarkerCount;
            }
            for (let node = this; node; node = node.parentNode) {
                this.#domModel.dispatchEventToListeners(Events.MarkersChanged, node);
            }
            return;
        }
        if (this.parentNode && !this.#markers.has(name)) {
            for (let node = this; node; node = node.parentNode) {
                ++node.#subtreeMarkerCount;
            }
        }
        this.#markers.set(name, value);
        for (let node = this; node; node = node.parentNode) {
            this.#domModel.dispatchEventToListeners(Events.MarkersChanged, node);
        }
    }
    marker(name) {
        return this.#markers.get(name) || null;
    }
    getMarkerKeysForTest() {
        return [...this.#markers.keys()];
    }
    traverseMarkers(visitor) {
        function traverse(node) {
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
    resolveURL(url) {
        if (!url) {
            return url;
        }
        for (let frameOwnerCandidate = this; frameOwnerCandidate; frameOwnerCandidate = frameOwnerCandidate.parentNode) {
            if (frameOwnerCandidate instanceof DOMDocument && frameOwnerCandidate.baseURL) {
                return Common.ParsedURL.ParsedURL.completeURL(frameOwnerCandidate.baseURL, url);
            }
        }
        return null;
    }
    highlight(mode) {
        this.#domModel.overlayModel().highlightInOverlay({ node: this, selectorList: undefined }, mode);
    }
    highlightForTwoSeconds() {
        this.#domModel.overlayModel().highlightInOverlayForTwoSeconds({ node: this, selectorList: undefined });
    }
    async resolveToObject(objectGroup, executionContextId) {
        const { object } = await this.#agent.invoke_resolveNode({ nodeId: this.id, backendNodeId: undefined, executionContextId, objectGroup });
        return object && this.#domModel.runtimeModelInternal.createRemoteObject(object) || null;
    }
    async boxModel() {
        const { model } = await this.#agent.invoke_getBoxModel({ nodeId: this.id });
        return model;
    }
    async setAsInspectedNode() {
        let node = this;
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
        await this.#agent.invoke_setInspectedNode({ nodeId: node.id });
    }
    enclosingElementOrSelf() {
        let node = this;
        if (node && node.nodeType() === Node.TEXT_NODE && node.parentNode) {
            node = node.parentNode;
        }
        if (node && node.nodeType() !== Node.ELEMENT_NODE) {
            node = null;
        }
        return node;
    }
    async callFunction(fn, args = []) {
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
            value: result.object.value,
        };
    }
    async scrollIntoView() {
        const node = this.enclosingElementOrSelf();
        if (!node) {
            return;
        }
        const result = await node.callFunction(scrollIntoViewInPage);
        if (!result) {
            return;
        }
        node.highlightForTwoSeconds();
        function scrollIntoViewInPage() {
            this.scrollIntoViewIfNeeded(true);
        }
    }
    async focus() {
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
        function focusInPage() {
            this.focus();
        }
    }
    simpleSelector() {
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
    async getAnchorBySpecifier(specifier) {
        const response = await this.#agent.invoke_getAnchorElement({
            nodeId: this.id,
            anchorSpecifier: specifier,
        });
        if (response.getError()) {
            return null;
        }
        return this.domModel().nodeForId(response.nodeId);
    }
    classNames() {
        const classes = this.getAttribute('class');
        return classes ? classes.split(/\s+/) : [];
    }
}
(function (DOMNode) {
    let ShadowRootTypes;
    (function (ShadowRootTypes) {
        /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
        ShadowRootTypes["UserAgent"] = "user-agent";
        ShadowRootTypes["Open"] = "open";
        ShadowRootTypes["Closed"] = "closed";
        /* eslint-enable @typescript-eslint/naming-convention */
    })(ShadowRootTypes = DOMNode.ShadowRootTypes || (DOMNode.ShadowRootTypes = {}));
})(DOMNode || (DOMNode = {}));
export class DeferredDOMNode {
    #domModelInternal;
    #backendNodeIdInternal;
    constructor(target, backendNodeId) {
        this.#domModelInternal = target.model(DOMModel);
        this.#backendNodeIdInternal = backendNodeId;
    }
    resolve(callback) {
        void this.resolvePromise().then(callback);
    }
    async resolvePromise() {
        const nodeIds = await this.#domModelInternal.pushNodesByBackendIdsToFrontend(new Set([this.#backendNodeIdInternal]));
        return nodeIds?.get(this.#backendNodeIdInternal) || null;
    }
    backendNodeId() {
        return this.#backendNodeIdInternal;
    }
    domModel() {
        return this.#domModelInternal;
    }
    highlight() {
        this.#domModelInternal.overlayModel().highlightInOverlay({ deferredNode: this, selectorList: undefined });
    }
}
export class DOMNodeShortcut {
    nodeType;
    nodeName;
    deferredNode;
    constructor(target, backendNodeId, nodeType, nodeName) {
        this.nodeType = nodeType;
        this.nodeName = nodeName;
        this.deferredNode = new DeferredDOMNode(target, backendNodeId);
    }
}
export class DOMDocument extends DOMNode {
    body;
    documentElement;
    documentURL;
    baseURL;
    constructor(domModel, payload) {
        super(domModel);
        this.body = null;
        this.documentElement = null;
        this.init(this, false, payload);
        this.documentURL = (payload.documentURL || '');
        this.baseURL = (payload.baseURL || '');
    }
}
export class DOMModel extends SDKModel {
    agent;
    idToDOMNode = new Map();
    #document = null;
    #attributeLoadNodeIds = new Set();
    runtimeModelInternal;
    #lastMutationId;
    #pendingDocumentRequestPromise = null;
    #frameOwnerNode;
    #loadNodeAttributesTimeout;
    #searchId;
    constructor(target) {
        super(target);
        this.agent = target.domAgent();
        target.registerDOMDispatcher(new DOMDispatcher(this));
        this.runtimeModelInternal = target.model(RuntimeModel);
        if (!target.suspended()) {
            void this.agent.invoke_enable({});
        }
        if (Root.Runtime.experiments.isEnabled('capture-node-creation-stacks')) {
            void this.agent.invoke_setNodeStackTracesEnabled({ enable: true });
        }
    }
    runtimeModel() {
        return this.runtimeModelInternal;
    }
    cssModel() {
        return this.target().model(CSSModel);
    }
    overlayModel() {
        return this.target().model(OverlayModel);
    }
    static cancelSearch() {
        for (const domModel of TargetManager.instance().models(DOMModel)) {
            domModel.cancelSearch();
        }
    }
    scheduleMutationEvent(node) {
        if (!this.hasEventListeners(Events.DOMMutated)) {
            return;
        }
        this.#lastMutationId = (this.#lastMutationId || 0) + 1;
        void Promise.resolve().then(callObserve.bind(this, node, this.#lastMutationId));
        function callObserve(node, mutationId) {
            if (!this.hasEventListeners(Events.DOMMutated) || this.#lastMutationId !== mutationId) {
                return;
            }
            this.dispatchEventToListeners(Events.DOMMutated, node);
        }
    }
    requestDocument() {
        if (this.#document) {
            return Promise.resolve(this.#document);
        }
        if (!this.#pendingDocumentRequestPromise) {
            this.#pendingDocumentRequestPromise = this.requestDocumentInternal();
        }
        return this.#pendingDocumentRequestPromise;
    }
    async getOwnerNodeForFrame(frameId) {
        // Returns an error if the frameId does not belong to the current target.
        const response = await this.agent.invoke_getFrameOwner({ frameId });
        if (response.getError()) {
            return null;
        }
        return new DeferredDOMNode(this.target(), response.backendNodeId);
    }
    async requestDocumentInternal() {
        const response = await this.agent.invoke_getDocument({});
        if (response.getError()) {
            return null;
        }
        const { root: documentPayload } = response;
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
                const response = await parentModel.agent.invoke_getFrameOwner({ frameId: mainFrame.id });
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
            }
            else if (oldDocument) {
                this.dispatchEventToListeners(Events.NodeRemoved, { node: oldDocument, parent: this.#frameOwnerNode });
            }
        }
        return this.#document;
    }
    existingDocument() {
        return this.#document;
    }
    async pushNodeToFrontend(objectId) {
        await this.requestDocument();
        const { nodeId } = await this.agent.invoke_requestNode({ objectId });
        return this.nodeForId(nodeId);
    }
    pushNodeByPathToFrontend(path) {
        return this.requestDocument()
            .then(() => this.agent.invoke_pushNodeByPathToFrontend({ path }))
            .then(({ nodeId }) => nodeId);
    }
    async pushNodesByBackendIdsToFrontend(backendNodeIds) {
        await this.requestDocument();
        const backendNodeIdsArray = [...backendNodeIds];
        const { nodeIds } = await this.agent.invoke_pushNodesByBackendIdsToFrontend({ backendNodeIds: backendNodeIdsArray });
        if (!nodeIds) {
            return null;
        }
        const map = new Map();
        for (let i = 0; i < nodeIds.length; ++i) {
            if (nodeIds[i]) {
                map.set(backendNodeIdsArray[i], this.nodeForId(nodeIds[i]));
            }
        }
        return map;
    }
    attributeModified(nodeId, name, value) {
        const node = this.idToDOMNode.get(nodeId);
        if (!node) {
            return;
        }
        node.setAttributeInternal(name, value);
        this.dispatchEventToListeners(Events.AttrModified, { node, name });
        this.scheduleMutationEvent(node);
    }
    attributeRemoved(nodeId, name) {
        const node = this.idToDOMNode.get(nodeId);
        if (!node) {
            return;
        }
        node.removeAttributeInternal(name);
        this.dispatchEventToListeners(Events.AttrRemoved, { node, name });
        this.scheduleMutationEvent(node);
    }
    inlineStyleInvalidated(nodeIds) {
        nodeIds.forEach(nodeId => this.#attributeLoadNodeIds.add(nodeId));
        if (!this.#loadNodeAttributesTimeout) {
            this.#loadNodeAttributesTimeout = window.setTimeout(this.loadNodeAttributes.bind(this), 20);
        }
    }
    loadNodeAttributes() {
        this.#loadNodeAttributesTimeout = undefined;
        for (const nodeId of this.#attributeLoadNodeIds) {
            void this.agent.invoke_getAttributes({ nodeId }).then(({ attributes }) => {
                if (!attributes) {
                    // We are calling loadNodeAttributes asynchronously, it is ok if node is not found.
                    return;
                }
                const node = this.idToDOMNode.get(nodeId);
                if (!node) {
                    return;
                }
                if (node.setAttributesPayload(attributes)) {
                    this.dispatchEventToListeners(Events.AttrModified, { node, name: 'style' });
                    this.scheduleMutationEvent(node);
                }
            });
        }
        this.#attributeLoadNodeIds.clear();
    }
    characterDataModified(nodeId, newValue) {
        const node = this.idToDOMNode.get(nodeId);
        if (!node) {
            console.error('nodeId could not be resolved to a node');
            return;
        }
        node.setNodeValueInternal(newValue);
        this.dispatchEventToListeners(Events.CharacterDataModified, node);
        this.scheduleMutationEvent(node);
    }
    nodeForId(nodeId) {
        return nodeId ? this.idToDOMNode.get(nodeId) || null : null;
    }
    documentUpdated() {
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
    setDocument(payload) {
        this.idToDOMNode = new Map();
        if (payload && 'nodeId' in payload) {
            this.#document = new DOMDocument(this, payload);
        }
        else {
            this.#document = null;
        }
        DOMModelUndoStack.instance().dispose(this);
        if (!this.parentModel()) {
            this.dispatchEventToListeners(Events.DocumentUpdated, this);
        }
    }
    setDocumentForTest(document) {
        this.setDocument(document);
    }
    setDetachedRoot(payload) {
        if (payload.nodeName === '#document') {
            new DOMDocument(this, payload);
        }
        else {
            DOMNode.create(this, null, false, payload);
        }
    }
    setChildNodes(parentId, payloads) {
        if (!parentId && payloads.length) {
            this.setDetachedRoot(payloads[0]);
            return;
        }
        const parent = this.idToDOMNode.get(parentId);
        parent?.setChildrenPayload(payloads);
    }
    childNodeCountUpdated(nodeId, newValue) {
        const node = this.idToDOMNode.get(nodeId);
        if (!node) {
            console.error('nodeId could not be resolved to a node');
            return;
        }
        node.setChildNodeCount(newValue);
        this.dispatchEventToListeners(Events.ChildNodeCountUpdated, node);
        this.scheduleMutationEvent(node);
    }
    childNodeInserted(parentId, prevId, payload) {
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
    childNodeRemoved(parentId, nodeId) {
        const parent = this.idToDOMNode.get(parentId);
        const node = this.idToDOMNode.get(nodeId);
        if (!parent || !node) {
            console.error('parentId or nodeId could not be resolved to a node');
            return;
        }
        parent.removeChild(node);
        this.unbind(node);
        this.dispatchEventToListeners(Events.NodeRemoved, { node, parent });
        this.scheduleMutationEvent(node);
    }
    shadowRootPushed(hostId, root) {
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
    shadowRootPopped(hostId, rootId) {
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
        this.dispatchEventToListeners(Events.NodeRemoved, { node: root, parent: host });
        this.scheduleMutationEvent(root);
    }
    pseudoElementAdded(parentId, pseudoElement) {
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
                throw new Error('DOMModel.pseudoElementAdded expects parent to not already have this pseudo type added; only view-transition* and scrolling pseudo elements can coexist under the same parent.' +
                    ` ${currentPseudoElements.length} elements of type ${pseudoType} already exist on parent.`);
            }
            currentPseudoElements.push(node);
        }
        else {
            parent.pseudoElements().set(pseudoType, [node]);
        }
        this.dispatchEventToListeners(Events.NodeInserted, node);
        this.scheduleMutationEvent(node);
    }
    scrollableFlagUpdated(nodeId, isScrollable) {
        const node = this.nodeForId(nodeId);
        if (!node || node.isScrollable() === isScrollable) {
            return;
        }
        node.setIsScrollable(isScrollable);
        this.dispatchEventToListeners(Events.ScrollableFlagUpdated, { node });
    }
    affectedByStartingStylesFlagUpdated(nodeId, affectedByStartingStyles) {
        const node = this.nodeForId(nodeId);
        if (!node || node.affectedByStartingStyles() === affectedByStartingStyles) {
            return;
        }
        node.setAffectedByStartingStyles(affectedByStartingStyles);
        this.dispatchEventToListeners(Events.AffectedByStartingStylesFlagUpdated, { node });
    }
    topLayerElementsUpdated() {
        this.dispatchEventToListeners(Events.TopLayerElementsChanged);
    }
    pseudoElementRemoved(parentId, pseudoElementId) {
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
        this.dispatchEventToListeners(Events.NodeRemoved, { node: pseudoElement, parent });
        this.scheduleMutationEvent(pseudoElement);
    }
    distributedNodesUpdated(insertionPointId, distributedNodes) {
        const insertionPoint = this.idToDOMNode.get(insertionPointId);
        if (!insertionPoint) {
            return;
        }
        insertionPoint.setDistributedNodePayloads(distributedNodes);
        this.dispatchEventToListeners(Events.DistributedNodesChanged, insertionPoint);
        this.scheduleMutationEvent(insertionPoint);
    }
    unbind(node) {
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
    async getNodesByStyle(computedStyles, pierce = false) {
        await this.requestDocument();
        if (!this.#document) {
            throw new Error('DOMModel.getNodesByStyle expects to have a document.');
        }
        const response = await this.agent.invoke_getNodesForSubtreeByStyle({ nodeId: this.#document.id, computedStyles, pierce });
        if (response.getError()) {
            throw new Error(response.getError());
        }
        return response.nodeIds;
    }
    async performSearch(query, includeUserAgentShadowDOM) {
        const response = await this.agent.invoke_performSearch({ query, includeUserAgentShadowDOM });
        if (!response.getError()) {
            this.#searchId = response.searchId;
        }
        return response.getError() ? 0 : response.resultCount;
    }
    async searchResult(index) {
        if (!this.#searchId) {
            return null;
        }
        const { nodeIds } = await this.agent.invoke_getSearchResults({ searchId: this.#searchId, fromIndex: index, toIndex: index + 1 });
        return nodeIds && nodeIds.length === 1 ? this.nodeForId(nodeIds[0]) : null;
    }
    cancelSearch() {
        if (!this.#searchId) {
            return;
        }
        void this.agent.invoke_discardSearchResults({ searchId: this.#searchId });
        this.#searchId = undefined;
    }
    classNamesPromise(nodeId) {
        return this.agent.invoke_collectClassNamesFromSubtree({ nodeId }).then(({ classNames }) => classNames || []);
    }
    querySelector(nodeId, selector) {
        return this.agent.invoke_querySelector({ nodeId, selector }).then(({ nodeId }) => nodeId);
    }
    querySelectorAll(nodeId, selector) {
        return this.agent.invoke_querySelectorAll({ nodeId, selector }).then(({ nodeIds }) => nodeIds);
    }
    getTopLayerElements() {
        return this.agent.invoke_getTopLayerElements().then(({ nodeIds }) => nodeIds);
    }
    getDetachedDOMNodes() {
        return this.agent.invoke_getDetachedDomNodes().then(({ detachedNodes }) => detachedNodes);
    }
    getElementByRelation(nodeId, relation) {
        return this.agent.invoke_getElementByRelation({ nodeId, relation }).then(({ nodeId }) => nodeId);
    }
    markUndoableState(minorChange) {
        void DOMModelUndoStack.instance().markUndoableState(this, minorChange || false);
    }
    async nodeForLocation(x, y, includeUserAgentShadowDOM) {
        const response = await this.agent.invoke_getNodeForLocation({ x, y, includeUserAgentShadowDOM });
        if (response.getError() || !response.nodeId) {
            return null;
        }
        return this.nodeForId(response.nodeId);
    }
    async getContainerForNode(nodeId, containerName, physicalAxes, logicalAxes, queriesScrollState, queriesAnchored) {
        const { nodeId: containerNodeId } = await this.agent.invoke_getContainerForNode({ nodeId, containerName, physicalAxes, logicalAxes, queriesScrollState, queriesAnchored });
        if (!containerNodeId) {
            return null;
        }
        return this.nodeForId(containerNodeId);
    }
    pushObjectAsNodeToFrontend(object) {
        return object.isNode() && object.objectId ? this.pushNodeToFrontend(object.objectId) : Promise.resolve(null);
    }
    suspendModel() {
        return this.agent.invoke_disable().then(() => this.setDocument(null));
    }
    async resumeModel() {
        await this.agent.invoke_enable({});
    }
    dispose() {
        DOMModelUndoStack.instance().dispose(this);
    }
    parentModel() {
        const parentTarget = this.target().parentTarget();
        return parentTarget ? parentTarget.model(DOMModel) : null;
    }
    getAgent() {
        return this.agent;
    }
    registerNode(node) {
        this.idToDOMNode.set(node.id, node);
    }
}
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["AttrModified"] = "AttrModified";
    Events["AttrRemoved"] = "AttrRemoved";
    Events["CharacterDataModified"] = "CharacterDataModified";
    Events["DOMMutated"] = "DOMMutated";
    Events["NodeInserted"] = "NodeInserted";
    Events["NodeRemoved"] = "NodeRemoved";
    Events["DocumentUpdated"] = "DocumentUpdated";
    Events["ChildNodeCountUpdated"] = "ChildNodeCountUpdated";
    Events["DistributedNodesChanged"] = "DistributedNodesChanged";
    Events["MarkersChanged"] = "MarkersChanged";
    Events["TopLayerElementsChanged"] = "TopLayerElementsChanged";
    Events["ScrollableFlagUpdated"] = "ScrollableFlagUpdated";
    Events["AffectedByStartingStylesFlagUpdated"] = "AffectedByStartingStylesFlagUpdated";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
class DOMDispatcher {
    #domModel;
    constructor(domModel) {
        this.#domModel = domModel;
    }
    documentUpdated() {
        this.#domModel.documentUpdated();
    }
    attributeModified({ nodeId, name, value }) {
        this.#domModel.attributeModified(nodeId, name, value);
    }
    attributeRemoved({ nodeId, name }) {
        this.#domModel.attributeRemoved(nodeId, name);
    }
    inlineStyleInvalidated({ nodeIds }) {
        this.#domModel.inlineStyleInvalidated(nodeIds);
    }
    characterDataModified({ nodeId, characterData }) {
        this.#domModel.characterDataModified(nodeId, characterData);
    }
    setChildNodes({ parentId, nodes }) {
        this.#domModel.setChildNodes(parentId, nodes);
    }
    childNodeCountUpdated({ nodeId, childNodeCount }) {
        this.#domModel.childNodeCountUpdated(nodeId, childNodeCount);
    }
    childNodeInserted({ parentNodeId, previousNodeId, node }) {
        this.#domModel.childNodeInserted(parentNodeId, previousNodeId, node);
    }
    childNodeRemoved({ parentNodeId, nodeId }) {
        this.#domModel.childNodeRemoved(parentNodeId, nodeId);
    }
    shadowRootPushed({ hostId, root }) {
        this.#domModel.shadowRootPushed(hostId, root);
    }
    shadowRootPopped({ hostId, rootId }) {
        this.#domModel.shadowRootPopped(hostId, rootId);
    }
    pseudoElementAdded({ parentId, pseudoElement }) {
        this.#domModel.pseudoElementAdded(parentId, pseudoElement);
    }
    pseudoElementRemoved({ parentId, pseudoElementId }) {
        this.#domModel.pseudoElementRemoved(parentId, pseudoElementId);
    }
    distributedNodesUpdated({ insertionPointId, distributedNodes }) {
        this.#domModel.distributedNodesUpdated(insertionPointId, distributedNodes);
    }
    topLayerElementsUpdated() {
        this.#domModel.topLayerElementsUpdated();
    }
    scrollableFlagUpdated({ nodeId, isScrollable }) {
        this.#domModel.scrollableFlagUpdated(nodeId, isScrollable);
    }
    affectedByStartingStylesFlagUpdated({ nodeId, affectedByStartingStyles }) {
        this.#domModel.affectedByStartingStylesFlagUpdated(nodeId, affectedByStartingStyles);
    }
}
let domModelUndoStackInstance = null;
export class DOMModelUndoStack {
    #stack;
    #index;
    #lastModelWithMinorChange;
    constructor() {
        this.#stack = [];
        this.#index = 0;
        this.#lastModelWithMinorChange = null;
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!domModelUndoStackInstance || forceNew) {
            domModelUndoStackInstance = new DOMModelUndoStack();
        }
        return domModelUndoStackInstance;
    }
    async markUndoableState(model, minorChange) {
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
        }
        else {
            await model.getAgent().invoke_markUndoableState();
            this.#lastModelWithMinorChange = null;
        }
    }
    async undo() {
        if (this.#index === 0) {
            return await Promise.resolve();
        }
        --this.#index;
        this.#lastModelWithMinorChange = null;
        await this.#stack[this.#index].getAgent().invoke_undo();
    }
    async redo() {
        if (this.#index >= this.#stack.length) {
            return await Promise.resolve();
        }
        ++this.#index;
        this.#lastModelWithMinorChange = null;
        await this.#stack[this.#index - 1].getAgent().invoke_redo();
    }
    dispose(model) {
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
SDKModel.register(DOMModel, { capabilities: 2 /* Capability.DOM */, autostart: true });
//# sourceMappingURL=DOMModel.js.map