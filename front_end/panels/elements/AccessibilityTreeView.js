// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as SDK from '../../core/sdk/sdk.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as AccessibilityTreeUtils from './AccessibilityTreeUtils.js';
import accessibilityTreeViewStyles from './accessibilityTreeView.css.js';
import { ElementsPanel } from './ElementsPanel.js';
export class AccessibilityTreeView extends UI.Widget.VBox {
    accessibilityTreeComponent;
    toggleButton;
    inspectedDOMNode = null;
    root = null;
    constructor(toggleButton, accessibilityTreeComponent) {
        super();
        this.registerRequiredCSS(accessibilityTreeViewStyles);
        // toggleButton is bound to a click handler on ElementsPanel to switch between the DOM tree
        // and accessibility tree views.
        this.toggleButton = toggleButton;
        this.accessibilityTreeComponent = accessibilityTreeComponent;
        const container = this.contentElement.createChild('div');
        container.classList.add('accessibility-tree-view-container');
        container.setAttribute('jslog', `${VisualLogging.tree('full-accessibility')}`);
        container.appendChild(this.toggleButton);
        container.appendChild(this.accessibilityTreeComponent);
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.AccessibilityModel.AccessibilityModel, this, { scoped: true });
        // The DOM tree and accessibility are kept in sync as much as possible, so
        // on node selection, update the currently inspected node and reveal in the
        // DOM tree.
        this.accessibilityTreeComponent.addEventListener('itemselected', (event) => {
            const evt = event;
            const axNode = evt.data.node.treeNodeData;
            if (!axNode.isDOMNode()) {
                return;
            }
            const deferredNode = axNode.deferredDOMNode();
            if (deferredNode) {
                deferredNode.resolve(domNode => {
                    if (domNode) {
                        this.inspectedDOMNode = domNode;
                        void ElementsPanel.instance().revealAndSelectNode(domNode, { showPanel: true, focusNode: true, highlightInOverlay: true });
                    }
                });
            }
        });
        this.accessibilityTreeComponent.addEventListener('itemmouseover', (event) => {
            const evt = event;
            evt.data.node.treeNodeData.highlightDOMNode();
        });
        this.accessibilityTreeComponent.addEventListener('itemmouseout', () => {
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        });
    }
    async wasShown() {
        super.wasShown();
        await this.refreshAccessibilityTree();
        if (this.inspectedDOMNode) {
            await this.loadSubTreeIntoAccessibilityModel(this.inspectedDOMNode);
        }
    }
    async refreshAccessibilityTree() {
        if (!this.root) {
            const frameId = SDK.FrameManager.FrameManager.instance().getOutermostFrame()?.id;
            if (!frameId) {
                throw new Error('No top frame');
            }
            this.root = await AccessibilityTreeUtils.getRootNode(frameId);
            if (!this.root) {
                throw new Error('No root');
            }
        }
        await this.renderTree();
        await this.accessibilityTreeComponent.expandRecursively(1);
    }
    async renderTree() {
        if (!this.root) {
            return;
        }
        const treeData = await AccessibilityTreeUtils.sdkNodeToAXTreeNodes(this.root);
        this.accessibilityTreeComponent.data = {
            defaultRenderer: AccessibilityTreeUtils.accessibilityNodeRenderer,
            tree: treeData,
            filter: node => {
                return node.ignored() || (node.role()?.value === 'generic' && !node.name()?.value) ?
                    "FLATTEN" /* TreeOutline.TreeOutline.FilterOption.FLATTEN */ :
                    "SHOW" /* TreeOutline.TreeOutline.FilterOption.SHOW */;
            },
        };
    }
    // Given a selected DOM node, asks the model to load the missing subtree from the root to the
    // selected node and then re-renders the tree.
    async loadSubTreeIntoAccessibilityModel(selectedNode) {
        const ancestors = await AccessibilityTreeUtils.getNodeAndAncestorsFromDOMNode(selectedNode);
        const inspectedAXNode = ancestors.find(node => node.backendDOMNodeId() === selectedNode.backendNodeId());
        if (!inspectedAXNode) {
            return;
        }
        await this.accessibilityTreeComponent.expandNodeIds(ancestors.map(node => node.getFrameId() + '#' + node.id()));
        await this.accessibilityTreeComponent.focusNodeId(AccessibilityTreeUtils.getNodeId(inspectedAXNode));
    }
    // A node was revealed through the elements picker.
    async revealAndSelectNode(inspectedNode) {
        if (inspectedNode === this.inspectedDOMNode) {
            return;
        }
        this.inspectedDOMNode = inspectedNode;
        // We only want to load nodes into the model when the AccessibilityTree is visible.
        if (this.isShowing()) {
            await this.loadSubTreeIntoAccessibilityModel(inspectedNode);
        }
    }
    // Selected node in the DOM tree has changed.
    async selectedNodeChanged(inspectedNode) {
        if (this.isShowing() || (inspectedNode === this.inspectedDOMNode)) {
            return;
        }
        if (inspectedNode.ownerDocument && (inspectedNode.nodeName() === 'HTML' || inspectedNode.nodeName() === 'BODY')) {
            this.inspectedDOMNode = inspectedNode.ownerDocument;
        }
        else {
            this.inspectedDOMNode = inspectedNode;
        }
    }
    treeUpdated({ data }) {
        if (!this.isShowing()) {
            return;
        }
        if (!data.root) {
            void this.renderTree();
            return;
        }
        const outermostFrameId = SDK.FrameManager.FrameManager.instance().getOutermostFrame()?.id;
        if (data.root?.getFrameId() !== outermostFrameId) {
            void this.renderTree();
            return;
        }
        this.root = data.root;
        void this.accessibilityTreeComponent.collapseAllNodes();
        void this.refreshAccessibilityTree();
    }
    modelAdded(model) {
        model.addEventListener("TreeUpdated" /* SDK.AccessibilityModel.Events.TREE_UPDATED */, this.treeUpdated, this);
    }
    modelRemoved(model) {
        model.removeEventListener("TreeUpdated" /* SDK.AccessibilityModel.Events.TREE_UPDATED */, this.treeUpdated, this);
    }
}
//# sourceMappingURL=AccessibilityTreeView.js.map