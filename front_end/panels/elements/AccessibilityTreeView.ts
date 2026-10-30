// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as AccessibilityTreeUtils from './AccessibilityTreeUtils.js';
import accessibilityTreeViewStyles from './accessibilityTreeView.css.js';
import {ElementsPanel} from './ElementsPanel.js';

const {html, render, Directives: {ref}} = Lit;
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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/AccessibilityTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  nodes: AccessibilityTreeUtils.AXTreeNode[];
  onNodeSelected: (node: SDK.AccessibilityModel.AccessibilityNode) => void;
  onNodeHighlight: (node: SDK.AccessibilityModel.AccessibilityNode) => void;
  onNodeClearHighlight: () => void;
  onCopy: (node: SDK.AccessibilityModel.AccessibilityNode) => void;
  onScrollIntoView: (node: SDK.AccessibilityModel.AccessibilityNode) => void;
  onSwitchToDomTree: () => void;
}

export interface ViewOutput {
  expandRoots?(): Promise<void>;
  revealNode?(ancestors: string[], nodeId: string): Promise<void>;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const treeData: TreeOutline.TreeOutline.TreeOutlineData<AccessibilityTreeUtils.AXTreeNodeData> = {
    defaultRenderer: AccessibilityTreeUtils.accessibilityNodeRenderer,
    tree: input.nodes,
    filter: node => {
      return node.ignored() || (node.role()?.value === 'generic' && !node.name()?.value) ?
          TreeOutline.TreeOutline.FilterOption.FLATTEN :
          TreeOutline.TreeOutline.FilterOption.SHOW;
    },
  };

  const onTreeOutlineRef = (el?: Element): void => {
    const treeOutline = el as TreeOutline.TreeOutline.TreeOutline<AccessibilityTreeUtils.AXTreeNodeData>| undefined;
    if (treeOutline) {
      output.expandRoots = () => treeOutline.expandRecursively(1);
      output.revealNode = (ancestors: string[], nodeId: string) =>
          treeOutline.expandNodeIds(ancestors).then(() => treeOutline.focusNodeId(nodeId));
    } else {
      output.expandRoots = undefined;
      output.revealNode = undefined;
    }
  };

  let selectedAXNode: SDK.AccessibilityModel.AccessibilityNode|null = null;

  const onItemSelected =
      (event: TreeOutline.TreeOutline.ItemSelectedEvent<AccessibilityTreeUtils.AXTreeNodeData>): void => {
        selectedAXNode = event.data.node.treeNodeData;
        input.onNodeSelected(selectedAXNode);
      };
  const onItemMouseOver =
      (event: TreeOutline.TreeOutline.ItemMouseOverEvent<AccessibilityTreeUtils.AXTreeNodeData>): void => {
        input.onNodeHighlight(event.data.node.treeNodeData);
      };
  const onItemMouseOut = (): void => {
    input.onNodeClearHighlight();
  };
  const onItemContextMenu =
      (event: TreeOutline.TreeOutline.ItemContextMenuEvent<AccessibilityTreeUtils.AXTreeNodeData>): void => {
        const contextMenu = event.createContextMenu();
        const axNode = event.data.node.treeNodeData;
        contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copy), () => input.onCopy(axNode),
                                                  {jslogContext: 'copy'});

        if (axNode.isDOMNode()) {
          contextMenu.viewSection().appendItem(i18nString(UIStrings.scrollIntoView),
                                               () => input.onScrollIntoView(axNode),
                                               {jslogContext: 'scroll-into-view'});
        }

        contextMenu.viewSection().appendItem(i18nString(UIStrings.switchToDomTree), () => input.onSwitchToDomTree(),
                                             {jslogContext: 'switch-to-dom-tree'});

        void contextMenu.show();
      };

  const onCopy = (event: ClipboardEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (selectedAXNode) {
      input.onCopy(selectedAXNode);
    }
  };

  // clang-format off
  render(html`
    <style>${accessibilityTreeViewStyles}</style>
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
export class AccessibilityTreeView extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.AccessibilityModel.AccessibilityModel> {
  private inspectedDOMNode: SDK.DOMModel.DOMNode|null = null;
  private root: SDK.AccessibilityModel.AccessibilityNode|null = null;

  readonly #view: View;
  readonly #frameManager: SDK.FrameManager.FrameManager;
  readonly #treeOperations: ViewOutput = {};

  constructor(view: View = DEFAULT_VIEW,
              frameManager: SDK.FrameManager.FrameManager = SDK.FrameManager.FrameManager.instance()) {
    super();
    this.#view = view;
    this.#frameManager = frameManager;

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.AccessibilityModel.AccessibilityModel, this,
                                                             {scoped: true});
  }

  #onNodeSelected = (axNode: SDK.AccessibilityModel.AccessibilityNode): void => {
    if (!axNode.isDOMNode()) {
      return;
    }
    const deferredNode = axNode.deferredDOMNode();
    if (deferredNode) {
      deferredNode.resolve(domNode => {
        if (domNode) {
          this.inspectedDOMNode = domNode;
          void ElementsPanel.instance().revealAndSelectNode(
              domNode, {showPanel: true, focusNode: true, highlightInOverlay: true});
        }
      });
    }
  };

  #onNodeHighlight = (axNode: SDK.AccessibilityModel.AccessibilityNode): void => {
    axNode.highlightDOMNode();
  };

  #onNodeClearHighlight = (): void => {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
  };

  #onCopy = async(axNode: SDK.AccessibilityModel.AccessibilityNode): Promise<void> => {
    const text = await axNode.axNodeToText();
    UI.UIUtils.copyTextToClipboard(text);
  };

  #onScrollIntoView = (axNode: SDK.AccessibilityModel.AccessibilityNode): void => {
    const deferredNode = axNode.deferredDOMNode();
    if (deferredNode) {
      deferredNode.resolve(domNode => {
        if (domNode) {
          void domNode.scrollIntoView();
        }
      });
    }
  };

  #onSwitchToDomTree = async(): Promise<void> => {
    ElementsPanel.instance().toggleAccessibilityTree();
  };

  override async wasShown(): Promise<void> {
    super.wasShown();
    this.requestUpdate();
    await this.refreshAccessibilityTree();
    if (this.inspectedDOMNode) {
      await this.loadSubTreeIntoAccessibilityModel(this.inspectedDOMNode);
    }
  }

  override async performUpdate(): Promise<void> {
    let nodes: AccessibilityTreeUtils.AXTreeNode[] = [];
    if (!this.root) {
      const frameId = this.#frameManager.getOutermostFrame()?.id;
      if (frameId) {
        this.root = await SDK.AccessibilityModel.getRootNode(frameId, this.#frameManager);
      }
    }
    if (this.root) {
      nodes = await AccessibilityTreeUtils.sdkNodeToAXTreeNodes(this.root);
    }
    const input: ViewInput = {
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

  async refreshAccessibilityTree(): Promise<void> {
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
  async loadSubTreeIntoAccessibilityModel(selectedNode: SDK.DOMModel.DOMNode): Promise<void> {
    const ancestors = await SDK.AccessibilityModel.getNodeAndAncestorsFromDOMNode(selectedNode);
    const inspectedAXNode = ancestors.find(node => node.backendDOMNodeId() === selectedNode.backendNodeId());
    if (!inspectedAXNode) {
      return;
    }
    this.requestUpdate();
    await this.updateComplete;
    await this.#treeOperations.revealNode?.(
        ancestors.map(node => node.getFrameId() + '#' + node.id()),
        inspectedAXNode.getNodeId(),
    );
  }

  // A node was revealed through the elements picker.
  async revealAndSelectNode(inspectedNode: SDK.DOMModel.DOMNode): Promise<void> {
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
  async selectedNodeChanged(inspectedNode: SDK.DOMModel.DOMNode): Promise<void> {
    if (this.isShowing() || (inspectedNode === this.inspectedDOMNode)) {
      return;
    }
    if (inspectedNode.ownerDocument && (inspectedNode.nodeName() === 'HTML' || inspectedNode.nodeName() === 'BODY')) {
      this.inspectedDOMNode = inspectedNode.ownerDocument;
    } else {
      this.inspectedDOMNode = inspectedNode;
    }
  }

  treeUpdated({data}: Common.EventTarget
                  .EventTargetEvent<SDK.AccessibilityModel.EventTypes[SDK.AccessibilityModel.Events.TREE_UPDATED]>):
      void {
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

  modelAdded(model: SDK.AccessibilityModel.AccessibilityModel): void {
    model.addEventListener(SDK.AccessibilityModel.Events.TREE_UPDATED, this.treeUpdated, this);
  }

  modelRemoved(model: SDK.AccessibilityModel.AccessibilityModel): void {
    model.removeEventListener(SDK.AccessibilityModel.Events.TREE_UPDATED, this.treeUpdated, this);
  }
}
