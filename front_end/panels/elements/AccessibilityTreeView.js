// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as AccessibilityTreeUtils from './AccessibilityTreeUtils.js';
import accessibilityTreeViewStyles from './accessibilityTreeView.css.js';
import { ElementsPanel } from './ElementsPanel.js';
const { html, render, Directives: { ref } } = Lit;
const UIStrings = {
    /**
     * @description Text for copying, copy should be used as a verb
     */
    copy: 'Copy',
    /**
     * @description Text to scroll the displayed content into view
     */
    scrollIntoView: 'Scroll into view',
    /**
     * @description A context menu item in the Accessibility Tree View to switch to DOM tree
     */
    switchToDomTree: 'Switch to DOM tree',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/AccessibilityTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, output, target) => {
    const treeData = {
        defaultRenderer: AccessibilityTreeUtils.accessibilityNodeRenderer,
        tree: input.nodes,
        filter: node => {
            return node.ignored() || (node.role()?.value === 'generic' && !node.name()?.value) ?
                "FLATTEN" /* TreeOutline.TreeOutline.FilterOption.FLATTEN */ :
                "SHOW" /* TreeOutline.TreeOutline.FilterOption.SHOW */;
        },
    };
    const onTreeOutlineRef = (el) => {
        const treeOutline = el;
        if (treeOutline) {
            output.expandRoots = () => treeOutline.expandRecursively(1);
            output.revealNode = (ancestors, nodeId) => treeOutline.expandNodeIds(ancestors).then(() => treeOutline.focusNodeId(nodeId));
        }
        else {
            output.expandRoots = undefined;
            output.revealNode = undefined;
        }
    };
    let selectedAXNode = null;
    const onItemSelected = (event) => {
        selectedAXNode = event.data.node.treeNodeData;
        input.onNodeSelected(selectedAXNode);
    };
    const onItemMouseOver = (event) => {
        input.onNodeHighlight(event.data.node.treeNodeData);
    };
    const onItemMouseOut = () => {
        input.onNodeClearHighlight();
    };
    const onItemContextMenu = (event) => {
        const contextMenu = event.createContextMenu();
        const axNode = event.data.node.treeNodeData;
        contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copy), () => input.onCopy(axNode), { jslogContext: 'copy' });
        if (axNode.isDOMNode()) {
            contextMenu.viewSection().appendItem(i18nString(UIStrings.scrollIntoView), () => input.onScrollIntoView(axNode), { jslogContext: 'scroll-into-view' });
        }
        contextMenu.viewSection().appendItem(i18nString(UIStrings.switchToDomTree), () => input.onSwitchToDomTree(), { jslogContext: 'switch-to-dom-tree' });
        void contextMenu.show();
    };
    const onCopy = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (selectedAXNode) {
            input.onCopy(selectedAXNode);
        }
    };
    // clang-format off
    render(html `
    <div class="accessibility-tree-view-container" jslog=${VisualLogging.tree('full-accessibility')} @copy=${onCopy}>
      <devtools-tree-outline .data=${treeData}
                             @itemselected=${onItemSelected}
                             @itemmouseover=${onItemMouseOver}
                             @itemmouseout=${onItemMouseOut}
                             @itemcontextmenu=${onItemContextMenu}
                             ${ref(onTreeOutlineRef)}></devtools-tree-outline>
    </div>
  `, target);
    // clang-format on
};
export class AccessibilityTreeView extends UI.Widget.VBox {
    inspectedDOMNode = null;
    root = null;
    #view;
    #frameManager;
    #treeOperations = {};
    constructor(view = DEFAULT_VIEW, frameManager = SDK.FrameManager.FrameManager.instance()) {
        super();
        this.#view = view;
        this.registerRequiredCSS(accessibilityTreeViewStyles);
        this.#frameManager = frameManager;
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.AccessibilityModel.AccessibilityModel, this, { scoped: true });
    }
    #onNodeSelected = (axNode) => {
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
    };
    #onNodeHighlight = (axNode) => {
        axNode.highlightDOMNode();
    };
    #onNodeClearHighlight = () => {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
    };
    #onCopy = async (axNode) => {
        const text = await axNode.axNodeToText();
        UI.UIUtils.copyTextToClipboard(text);
    };
    #onScrollIntoView = (axNode) => {
        const deferredNode = axNode.deferredDOMNode();
        if (deferredNode) {
            deferredNode.resolve(domNode => {
                if (domNode) {
                    void domNode.scrollIntoView();
                }
            });
        }
    };
    #onSwitchToDomTree = async () => {
        ElementsPanel.instance().toggleAccessibilityTree();
    };
    async wasShown() {
        super.wasShown();
        this.requestUpdate();
        await this.refreshAccessibilityTree();
        if (this.inspectedDOMNode) {
            await this.loadSubTreeIntoAccessibilityModel(this.inspectedDOMNode);
        }
    }
    async performUpdate() {
        let nodes = [];
        if (!this.root) {
            const frameId = this.#frameManager.getOutermostFrame()?.id;
            if (frameId) {
                this.root = await SDK.AccessibilityModel.getRootNode(frameId, this.#frameManager);
            }
        }
        if (this.root) {
            nodes = await AccessibilityTreeUtils.sdkNodeToAXTreeNodes(this.root);
        }
        const input = {
            nodes,
            onNodeSelected: this.#onNodeSelected,
            onNodeHighlight: this.#onNodeHighlight,
            onNodeClearHighlight: this.#onNodeClearHighlight,
            onCopy: this.#onCopy,
            onScrollIntoView: this.#onScrollIntoView,
            onSwitchToDomTree: this.#onSwitchToDomTree,
        };
        this.#view(input, this.#treeOperations, this.contentElement);
    }
    async refreshAccessibilityTree() {
        if (!this.root) {
            const frameId = this.#frameManager.getOutermostFrame()?.id;
            if (!frameId) {
                throw new Error('No top frame');
            }
            this.root = await SDK.AccessibilityModel.getRootNode(frameId, this.#frameManager);
            if (!this.root) {
                throw new Error('No root');
            }
        }
        this.requestUpdate();
        await this.updateComplete;
        await this.#treeOperations.expandRoots?.();
    }
    // Given a selected DOM node, asks the model to load the missing subtree from the root to the
    // selected node and then re-renders the tree.
    async loadSubTreeIntoAccessibilityModel(selectedNode) {
        const ancestors = await SDK.AccessibilityModel.getNodeAndAncestorsFromDOMNode(selectedNode);
        const inspectedAXNode = ancestors.find(node => node.backendDOMNodeId() === selectedNode.backendNodeId());
        if (!inspectedAXNode) {
            return;
        }
        this.requestUpdate();
        await this.updateComplete;
        await this.#treeOperations.revealNode?.(ancestors.map(node => node.getFrameId() + '#' + node.id()), inspectedAXNode.getNodeId());
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
        if (data.root) {
            this.root = data.root;
        }
        if (!this.isShowing()) {
            return;
        }
        if (!data.root) {
            this.root = null;
            this.requestUpdate();
            return;
        }
        const outermostFrameId = this.#frameManager.getOutermostFrame()?.id;
        if (data.root?.getFrameId() !== outermostFrameId) {
            this.requestUpdate();
            return;
        }
        this.root = data.root;
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