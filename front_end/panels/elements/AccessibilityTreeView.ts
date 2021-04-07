// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import * as Components from '../../ui/components/components.js';
import * as UI from '../../ui/legacy/legacy.js';

import {accessibilityNodeRenderer, AXTreeNode, sdkNodeToAXTreeNode} from './AccessibilityTreeUtils.js';

export class AccessibilityTreeView extends UI.Widget.VBox {
  private readonly accessibilityTreeComponent =
      new Components.TreeOutline.TreeOutline<SDK.AccessibilityModel.AccessibilityNode>();
  private treeData: AXTreeNode[] = [];
  private readonly toggleButton: HTMLButtonElement;
  private accessibilityModel: SDK.AccessibilityModel.AccessibilityModel|null = null;

  constructor(toggleButton: HTMLButtonElement) {
    super();
    // toggleButton is bound to a click handler on ElementsPanel to switch between the DOM tree
    // and accessibility tree views.
    this.toggleButton = toggleButton;
    this.contentElement.appendChild(this.toggleButton);
    this.contentElement.appendChild(this.accessibilityTreeComponent);

    // The DOM tree and accessibility are kept in sync as much as possible, so
    // on node selection, update the currently inspected node and reveal in the
    // DOM tree.
    this.accessibilityTreeComponent.addEventListener('itemselected', (event: Event) => {
      const evt = event as Components.TreeOutline.ItemSelectedEvent<SDK.AccessibilityModel.AccessibilityNode>;
      const axNode = evt.data.node.treeNodeData;
      if (!axNode.isDOMNode()) {
        return;
      }
      const deferredNode = axNode.deferredDOMNode();
      if (deferredNode) {
        deferredNode.resolve(domNode => {
          Common.Revealer.reveal(domNode, true /* omitFocus */);
        });
      }

      // Highlight the node as well, for keyboard navigation.
      evt.data.node.treeNodeData.highlightDOMNode();
    });

    this.accessibilityTreeComponent.addEventListener('itemmouseover', (event: Event) => {
      const evt = event as Components.TreeOutline.ItemMouseOverEvent<SDK.AccessibilityModel.AccessibilityNode>;
      evt.data.node.treeNodeData.highlightDOMNode();
    });

    this.accessibilityTreeComponent.addEventListener('itemmouseout', () => {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    });
  }

  setAccessibilityModel(model: SDK.AccessibilityModel.AccessibilityModel|null): void {
    this.accessibilityModel = model;
    this.refreshAccessibilityTree();
  }

  async refreshAccessibilityTree(): Promise<void> {
    if (!this.accessibilityModel) {
      return;
    }

    const root = await this.accessibilityModel.requestRootNode();

    if (!root) {
      return;
    }

    this.treeData = [sdkNodeToAXTreeNode(root)];

    this.accessibilityTreeComponent.data = {
      defaultRenderer: (node): LitHtml.TemplateResult => accessibilityNodeRenderer(node),
      tree: this.treeData,
    };
    this.accessibilityTreeComponent.expandRecursively(2);
  }
}
