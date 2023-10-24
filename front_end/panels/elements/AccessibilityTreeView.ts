// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as AccessibilityTreeUtils from './AccessibilityTreeUtils.js';
import accessibilityTreeViewStyles from './accessibilityTreeView.css.js';
import {ElementsPanel} from './ElementsPanel.js';

export class AccessibilityTreeView extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.AccessibilityModel.AccessibilityModel> {
  private accessibilityTreeComponent: TreeOutline.TreeOutline.TreeOutline<AccessibilityTreeUtils.AXTreeNodeData>;
  private readonly toggleButton: HTMLElement;
  private inspectedDOMNode: SDK.DOMModel.DOMNode|null = null;
  private root: SDK.AccessibilityModel.AccessibilityNode|null = null;

  constructor(
      toggleButton: HTMLElement,
      accessibilityTreeComponent: TreeOutline.TreeOutline.TreeOutline<AccessibilityTreeUtils.AXTreeNodeData>) {
    super();
    // toggleButton is bound to a click handler on ElementsPanel to switch between the DOM tree
    // and accessibility tree views.
    this.toggleButton = toggleButton;
    this.accessibilityTreeComponent = accessibilityTreeComponent;

    const container = this.contentElement.createChild('div');

    container.classList.add('accessibility-tree-view-container');
    container.setAttribute('jslog', `${VisualLogging.fullAccessibilityTree()}`);
    container.appendChild(this.toggleButton);
    container.appendChild(this.accessibilityTreeComponent);

    SDK.TargetManager.TargetManager.instance().observeModels(
        SDK.AccessibilityModel.AccessibilityModel, this, {scoped: true});

    // The DOM tree and accessibility are kept in sync as much as possible, so
    // on node selection, update the currently inspected node and reveal in the
    // DOM tree.
    this.accessibilityTreeComponent.addEventListener('itemselected', (event: Event) => {
      const evt = event as TreeOutline.TreeOutline.ItemSelectedEvent<AccessibilityTreeUtils.AXTreeNodeData>;
      const axNode = evt.data.node.treeNodeData;
      if (!axNode.isDOMNode()) {
        return;
      }
      const deferredNode = axNode.deferredDOMNode();
      if (deferredNode) {
        deferredNode.resolve(domNode => {
          if (domNode) {
            this.inspectedDOMNode = domNode;
            void ElementsPanel.instance().revealAndSelectNode(domNode, true, false);
          }
        });
      }
    });

    this.accessibilityTreeComponent.addEventListener('itemmouseover', (event: Event) => {
      const evt = event as TreeOutline.TreeOutline.ItemMouseOverEvent<AccessibilityTreeUtils.AXTreeNodeData>;
      evt.data.node.treeNodeData.highlightDOMNode();
    });

    this.accessibilityTreeComponent.addEventListener('itemmouseout', () => {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    });
  }

  override async wasShown(): Promise<void> {
    await this.refreshAccessibilityTree();
    if (this.inspectedDOMNode) {
      await this.loadSubTreeIntoAccessibilityModel(this.inspectedDOMNode);
    }
    this.registerCSSFiles([accessibilityTreeViewStyles]);
  }

  async refreshAccessibilityTree(): Promise<void> {
    if (!this.root) {
      const frameId = SDK.FrameManager.FrameManager.instance().getOutermostFrame()?.id;
      if (!frameId) {
        throw Error('No top frame');
      }
      this.root = await AccessibilityTreeUtils.getRootNode(frameId);
      if (!this.root) {
        throw Error('No root');
      }
    }
    await this.renderTree();
    await this.accessibilityTreeComponent.expandRecursively(1);
  }

  async renderTree(): Promise<void> {
    if (!this.root) {
      return;
    }
    const treeData = await AccessibilityTreeUtils.sdkNodeToAXTreeNodes(this.root);
    this.accessibilityTreeComponent.data = {
      defaultRenderer: AccessibilityTreeUtils.accessibilityNodeRenderer,
      tree: treeData,
      filter: (node): TreeOutline.TreeOutline.FilterOption => {
        return node.ignored() || (node.role()?.value === 'generic' && !node.name()?.value) ?
            TreeOutline.TreeOutline.FilterOption.FLATTEN :
            TreeOutline.TreeOutline.FilterOption.SHOW;
      },
    };
  }

  // Given a selected DOM node, asks the model to load the missing subtree from the root to the
  // selected node and then re-renders the tree.
  async loadSubTreeIntoAccessibilityModel(selectedNode: SDK.DOMModel.DOMNode): Promise<void> {
    const ancestors = await AccessibilityTreeUtils.getNodeAndAncestorsFromDOMNode(selectedNode);
    const inspectedAXNode = ancestors.find(node => node.backendDOMNodeId() === selectedNode.backendNodeId());
    if (!inspectedAXNode) {
      return;
    }
    await this.accessibilityTreeComponent.expandNodeIds(ancestors.map(node => node.getFrameId() + '#' + node.id()));
    await this.accessibilityTreeComponent.focusNodeId(AccessibilityTreeUtils.getNodeId(inspectedAXNode));
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
                  .EventTargetEvent<SDK.AccessibilityModel.EventTypes[SDK.AccessibilityModel.Events.TreeUpdated]>):
      void {
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

  modelAdded(model: SDK.AccessibilityModel.AccessibilityModel): void {
    model.addEventListener(SDK.AccessibilityModel.Events.TreeUpdated, this.treeUpdated, this);
  }

  modelRemoved(model: SDK.AccessibilityModel.AccessibilityModel): void {
    model.removeEventListener(SDK.AccessibilityModel.Events.TreeUpdated, this.treeUpdated, this);
  }
}
