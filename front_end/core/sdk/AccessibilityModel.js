// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { DeferredDOMNode } from './DOMModel.js';
import { SDKModel } from './SDKModel.js';
export class AccessibilityNode {
    #accessibilityModel;
    #id;
    #backendDOMNodeId;
    #deferredDOMNode;
    #ignored;
    #ignoredReasons;
    #role;
    #name;
    #description;
    #value;
    #properties;
    #parentId;
    #frameId;
    #childIds;
    constructor(accessibilityModel, payload) {
        this.#accessibilityModel = accessibilityModel;
        this.#id = payload.nodeId;
        accessibilityModel.setAXNodeForAXId(this.#id, this);
        if (payload.backendDOMNodeId) {
            accessibilityModel.setAXNodeForBackendDOMNodeId(payload.backendDOMNodeId, this);
            this.#backendDOMNodeId = payload.backendDOMNodeId;
            this.#deferredDOMNode = new DeferredDOMNode(accessibilityModel.target(), payload.backendDOMNodeId);
        }
        else {
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
        }
        else {
            this.#frameId = null;
        }
    }
    id() {
        return this.#id;
    }
    accessibilityModel() {
        return this.#accessibilityModel;
    }
    ignored() {
        return this.#ignored;
    }
    ignoredReasons() {
        return this.#ignoredReasons || null;
    }
    role() {
        return this.#role || null;
    }
    coreProperties() {
        const properties = [];
        if (this.#name) {
            properties.push({ name: "name" /* CoreAxPropertyName.NAME */, value: this.#name });
        }
        if (this.#description) {
            properties.push({ name: "description" /* CoreAxPropertyName.DESCRIPTION */, value: this.#description });
        }
        if (this.#value) {
            properties.push({ name: "value" /* CoreAxPropertyName.VALUE */, value: this.#value });
        }
        return properties;
    }
    name() {
        return this.#name || null;
    }
    description() {
        return this.#description || null;
    }
    value() {
        return this.#value || null;
    }
    properties() {
        return this.#properties || null;
    }
    parentNode() {
        if (this.#parentId) {
            return this.#accessibilityModel.axNodeForId(this.#parentId);
        }
        return null;
    }
    isDOMNode() {
        return Boolean(this.#backendDOMNodeId);
    }
    backendDOMNodeId() {
        return this.#backendDOMNodeId;
    }
    deferredDOMNode() {
        return this.#deferredDOMNode;
    }
    highlightDOMNode() {
        const deferredNode = this.deferredDOMNode();
        if (!deferredNode) {
            return;
        }
        // Highlight node in page.
        deferredNode.highlight();
    }
    children() {
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
    numChildren() {
        if (!this.#childIds) {
            return 0;
        }
        return this.#childIds.length;
    }
    hasOnlyUnloadedChildren() {
        if (!this.#childIds || !this.#childIds.length) {
            return false;
        }
        return this.#childIds.every(id => this.#accessibilityModel.axNodeForId(id) === null);
    }
    hasUnloadedChildren() {
        if (!this.#childIds || !this.#childIds.length) {
            return false;
        }
        return this.#childIds.some(id => this.#accessibilityModel.axNodeForId(id) === null);
    }
    // Only the root node gets a frameId, so nodes have to walk up the tree to find their frameId.
    getFrameId() {
        return this.#frameId || this.parentNode()?.getFrameId() || null;
    }
}
export class AccessibilityModel extends SDKModel {
    agent;
    #axIdToAXNode = new Map();
    #backendDOMNodeIdToAXNode = new Map();
    #frameIdToAXNode = new Map();
    #pendingChildRequests = new Map();
    #root = null;
    constructor(target) {
        super(target);
        target.registerAccessibilityDispatcher(this);
        this.agent = target.accessibilityAgent();
        void this.resumeModel();
    }
    clear() {
        this.#root = null;
        this.#axIdToAXNode.clear();
        this.#backendDOMNodeIdToAXNode.clear();
        this.#frameIdToAXNode.clear();
    }
    async resumeModel() {
        await this.agent.invoke_enable();
    }
    async suspendModel() {
        await this.agent.invoke_disable();
    }
    async requestPartialAXTree(node) {
        const { nodes } = await this.agent.invoke_getPartialAXTree({ nodeId: node.id, fetchRelatives: true });
        if (!nodes) {
            return;
        }
        const axNodes = [];
        for (const payload of nodes) {
            axNodes.push(new AccessibilityNode(this, payload));
        }
    }
    loadComplete({ root }) {
        this.clear();
        this.#root = new AccessibilityNode(this, root);
        this.dispatchEventToListeners("TreeUpdated" /* Events.TREE_UPDATED */, { root: this.#root });
    }
    nodesUpdated({ nodes }) {
        this.createNodesFromPayload(nodes);
        this.dispatchEventToListeners("TreeUpdated" /* Events.TREE_UPDATED */, {});
        return;
    }
    createNodesFromPayload(payloadNodes) {
        const accessibilityNodes = payloadNodes.map(node => {
            const sdkNode = new AccessibilityNode(this, node);
            return sdkNode;
        });
        return accessibilityNodes;
    }
    async requestRootNode(frameId) {
        if (frameId && this.#frameIdToAXNode.has(frameId)) {
            return this.#frameIdToAXNode.get(frameId);
        }
        if (!frameId && this.#root) {
            return this.#root;
        }
        const { node } = await this.agent.invoke_getRootAXNode({ frameId });
        if (!node) {
            return;
        }
        return this.createNodesFromPayload([node])[0];
    }
    async requestAXChildren(nodeId, frameId) {
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
        }
        else {
            const request = this.agent.invoke_getChildAXNodes({ id: nodeId, frameId });
            this.#pendingChildRequests.set(nodeId, request);
            const result = await request;
            if (!result.getError()) {
                this.createNodesFromPayload(result.nodes);
                this.#pendingChildRequests.delete(nodeId);
            }
        }
        return parent.children();
    }
    async requestAndLoadSubTreeToNode(node) {
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
        const { nodes } = await this.agent.invoke_getAXNodeAndAncestors({ backendNodeId: node.backendNodeId() });
        if (!nodes) {
            return null;
        }
        const ancestors = this.createNodesFromPayload(nodes);
        return ancestors;
    }
    axNodeForId(axId) {
        return this.#axIdToAXNode.get(axId) || null;
    }
    setRootAXNodeForFrameId(frameId, axNode) {
        this.#frameIdToAXNode.set(frameId, axNode);
    }
    setAXNodeForAXId(axId, axNode) {
        this.#axIdToAXNode.set(axId, axNode);
    }
    axNodeForDOMNode(domNode) {
        if (!domNode) {
            return null;
        }
        return this.#backendDOMNodeIdToAXNode.get(domNode.backendNodeId()) ?? null;
    }
    setAXNodeForBackendDOMNodeId(backendDOMNodeId, axNode) {
        this.#backendDOMNodeIdToAXNode.set(backendDOMNodeId, axNode);
    }
    getAgent() {
        return this.agent;
    }
}
SDKModel.register(AccessibilityModel, { capabilities: 2 /* Capability.DOM */, autostart: false });
//# sourceMappingURL=AccessibilityModel.js.map